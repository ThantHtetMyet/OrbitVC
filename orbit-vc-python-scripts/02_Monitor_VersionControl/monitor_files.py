import os
import hashlib
import pyodbc
import uuid
import logging
from datetime import datetime
import shutil

# Setup module-level logger
logger = logging.getLogger("MonitorVersionControl")

def get_db_connection(config):
    db_config = config['database']
    conn_str = (
        f"DRIVER={db_config['driver']};"
        f"SERVER={db_config['server']};"
        f"DATABASE={db_config['database']};"
        f"UID={db_config['uid']};"
        f"PWD={db_config['pwd']};"
        f"TrustServerCertificate={db_config.get('trust_server_certificate', 'yes')};"
    )
    return pyodbc.connect(conn_str)

def compute_file_hash(filepath):
    sha256_hash = hashlib.sha256()
    with open(filepath, "rb") as f:
        # Read and update hash string value in blocks of 4K
        for byte_block in iter(lambda: f.read(4096), b""):
            sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def construct_unc_path(ip, full_path_on_device):
    drive, path_tail = os.path.splitdrive(full_path_on_device)
    if drive:
        drive_letter = drive[0]
        # Construct UNC: \\IP\C$\Path\File
        unc_base = f"\\\\{ip}\\{drive_letter}${path_tail}"
        return unc_base
    elif full_path_on_device.startswith("\\\\"):
        # Already a UNC path
        return full_path_on_device
    else:
        return full_path_on_device

def run(config):
    logger.info("Starting Version Control Monitor check...")
    conn = None
    try:
        conn = get_db_connection(config)
        cursor = conn.cursor()

        # Get all monitored files with their latest version info
        # First check MonitoredFileChangeHistory, fall back to MonitoredFileVersions
        cursor.execute("""
            SELECT
                mf.ID,
                mf.DeviceID,
                v.ID AS MonitoredFileVersionID,
                COALESCE(ch.AbsoluteDirectory, v.AbsoluteDirectory) AS AbsoluteDirectory,
                COALESCE(ch.FileName, v.FileName) AS FileName,
                COALESCE(ch.FileHash, v.FileHash) AS FileHash,
                COALESCE(ch.FileSize, v.FileSize) AS FileSize,
                COALESCE(ch.ParentDirectory, v.ParentDirectory) AS ParentDirectory,
                COALESCE(ch.FileDateModified, v.FileDateModified) AS FileDateModified,
                COALESCE(ch.VersionNo, 0) AS ChangeHistoryVersionNo
            FROM MonitoredFiles mf
            LEFT JOIN MonitoredFileVersions v ON mf.ID = v.MonitoredFileID
                AND v.VersionNo = (SELECT MAX(VersionNo) FROM MonitoredFileVersions WHERE MonitoredFileID = mf.ID)
            LEFT JOIN MonitoredFileChangeHistory ch ON mf.ID = ch.MonitoredFileID
                AND ch.VersionNo = (SELECT MAX(VersionNo) FROM MonitoredFileChangeHistory WHERE MonitoredFileID = mf.ID)
            WHERE mf.IsDeleted = 0
        """)

        rows = cursor.fetchall()

        for row in rows:
            try:
                file_id = row.ID
                device_id = row.DeviceID
                monitored_file_version_id = row.MonitoredFileVersionID
                abs_directory = row.AbsoluteDirectory
                file_name = row.FileName
                old_hash = row.FileHash
                old_size = row.FileSize
                parent_dir = row.ParentDirectory
                old_file_date_mod = row.FileDateModified
                change_history_ver_no = row.ChangeHistoryVersionNo or 0

                if not abs_directory or not file_name:
                    logger.warning(f"Missing file info for MonitoredFile {file_id}, skipping")
                    continue

                if not monitored_file_version_id:
                    logger.warning(f"Missing MonitoredFileVersionID for MonitoredFile {file_id}, skipping")
                    continue

                # Get IP Address (prefer internal IPs)
                cursor.execute("""
                    SELECT ip.IPAddress
                    FROM DeviceIPAddresses ip
                    LEFT JOIN IPAddressTypes ipt ON ip.IPAddressTypeID = ipt.ID
                    WHERE ip.DeviceID = ? AND (ip.IPAddress LIKE '10.%' OR ip.IPAddress LIKE '192.%')
                """, device_id)
                ip_row = cursor.fetchone()
                if not ip_row:
                    cursor.execute("SELECT TOP 1 IPAddress FROM DeviceIPAddresses WHERE DeviceID = ?", device_id)
                    ip_row = cursor.fetchone()

                if not ip_row:
                    logger.warning(f"No IP found for device {device_id}, skipping {file_name}")
                    continue

                ip_address = ip_row[0]

                # Construct UNC path using AbsoluteDirectory
                full_path = construct_unc_path(ip_address, abs_directory)

                if not os.path.exists(full_path):
                    # File was deleted - create DELETED alert
                    logger.warning(f"File DELETED or not accessible: {full_path}")

                    # Check if there's already an uncleared DELETED alert for this file
                    cursor.execute("""
                        SELECT COUNT(*) FROM MonitoredFileAlerts
                        WHERE MonitoredFileID = ? AND AlertType = 'DELETED' AND IsCleared = 0
                    """, (file_id,))
                    existing_alert = cursor.fetchone()[0]

                    if existing_alert == 0:
                        # Create DELETED alert
                        alert_id = uuid.uuid4()
                        alert_msg = f"File '{file_name}' was deleted or is no longer accessible at path: {abs_directory}"
                        cursor.execute("""
                            INSERT INTO MonitoredFileAlerts
                            (ID, MonitoredFileID, AlertType, Message, CreatedDate, IsAcknowledged, IsCleared)
                            VALUES (?, ?, 'DELETED', ?, GETDATE(), 0, 0)
                        """, (alert_id, file_id, alert_msg))

                        # Update LastScan
                        cursor.execute("UPDATE MonitoredFiles SET LastScan = GETDATE() WHERE ID = ?", (file_id,))
                        conn.commit()
                        logger.info(f"Created DELETED alert for {file_name}")
                    else:
                        logger.info(f"DELETED alert already exists for {file_name}, skipping duplicate alert")
                    continue

                current_hash = compute_file_hash(full_path)
                file_size_bytes = os.path.getsize(full_path)
                file_size_str = str(file_size_bytes)
                mtime = os.path.getmtime(full_path)
                file_date_mod = datetime.fromtimestamp(mtime)

                # Check for modification (hash change only)
                hash_changed = old_hash != current_hash

                if hash_changed:
                    change_type = 'MODIFIED' if old_hash else 'CREATED'
                    logger.info(f"File {change_type}: {full_path} (hash_changed={hash_changed})")

                    # Create Alert with detailed message
                    alert_id = uuid.uuid4()
                    alert_msg = f"File '{file_name}' was {change_type.lower()}. Content (hash) changed."
                    cursor.execute("""
                        INSERT INTO MonitoredFileAlerts
                        (ID, MonitoredFileID, AlertType, Message, CreatedDate, IsAcknowledged, IsCleared)
                        VALUES (?, ?, ?, ?, GETDATE(), 0, 0)
                    """, (alert_id, file_id, change_type, alert_msg))

                    # Handle File Storage in MonitoredFileChangeHistory folder
                    stored_files_path = config.get('stored_files_path')
                    new_stored_path = ''
                    next_ver = change_history_ver_no + 1

                    if stored_files_path:
                        try:
                            # Store in: stored_files_path/MonitoredFileChangeHistory/FileID/ChangeHistory-X
                            change_history_base = os.path.join(stored_files_path, 'MonitoredFileChangeHistory', str(file_id))
                            if not os.path.exists(change_history_base):
                                os.makedirs(change_history_base, exist_ok=True)

                            ver_folder = os.path.join(change_history_base, f"ChangeHistory-{next_ver}")
                            os.makedirs(ver_folder, exist_ok=True)

                            dest_path = os.path.join(ver_folder, file_name)
                            shutil.copy2(full_path, dest_path)
                            new_stored_path = dest_path
                            logger.info(f"Archived change history version {next_ver} to {new_stored_path}")
                        except Exception as e:
                            logger.error(f"Failed to archive file change history: {str(e)}")

                    # Insert into MonitoredFileChangeHistory table (NOT MonitoredFileVersions)
                    new_history_id = uuid.uuid4()
                    cursor.execute("""
                        INSERT INTO MonitoredFileChangeHistory
                        (ID, MonitoredFileID, MonitoredFileVersionID, VersionNo, FileDateModified, FileSize, FileHash, DetectedDate, StoredDirectory, IsDeleted, CreatedDate)
                        VALUES
                        (?, ?, ?, ?, ?, ?, ?, GETDATE(), ?, 0, GETDATE())
                    """, (new_history_id, file_id, monitored_file_version_id, next_ver, file_date_mod, file_size_str, current_hash, new_stored_path))

                    # Update MonitoredFile LastScan
                    cursor.execute("""
                        UPDATE MonitoredFiles
                        SET LastScan = GETDATE()
                        WHERE ID = ?
                    """, (file_id,))

                    conn.commit()
                    logger.info(f"Processed changes for {file_name} (Change History Version: {next_ver})")

                else:
                    # No change - just update LastScan
                    cursor.execute("UPDATE MonitoredFiles SET LastScan = GETDATE() WHERE ID = ?", file_id)
                    conn.commit()

            except Exception as e:
                logger.error(f"Error processing file {file_name if 'file_name' in locals() else 'unknown'}: {e}")

    except Exception as e:
        logger.error(f"Database Error: {e}")
    finally:
        if conn:
            conn.close()
    logger.info("Version Control Monitor check completed.")
