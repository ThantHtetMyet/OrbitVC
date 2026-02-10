
import os
import hashlib
import pyodbc
import uuid
import logging
from datetime import datetime

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

def run(config):
    logger.info("Starting Version Control Monitor check...")
    conn = None
    try:
        conn = get_db_connection(config)
        cursor = conn.cursor()
        
        # 0. Fetch Device IPs (prioritize Network-01)
        device_ips = {}
        try:
            cursor.execute("""
                SELECT ip.DeviceID, ip.IPAddress, ipt.Name
                FROM DeviceIPAddresses ip
                LEFT JOIN IPAddressTypes ipt ON ip.IPAddressTypeID = ipt.ID
            """)
            for row in cursor.fetchall():
                did, ip, typename = row.DeviceID, row.IPAddress, row.Name
                # Store first found, overwrite if Network-01 found
                if did not in device_ips:
                    device_ips[did] = ip
                elif typename == 'Network-01':
                    device_ips[did] = ip
        except Exception as e:
            logger.error(f"Error fetching IPs: {e}")

        # Get Monitored Files with Directory Info
        query = """
        SELECT 
            mf.ID, mf.FileName, mf.FileHash, mf.LastScan, mf.FileSize,
            md.DirectoryPath, md.ID as DirectoryID, md.DeviceID
        FROM MonitoredFiles mf
        JOIN MonitoredDirectories md ON mf.MonitoredDirectoryID = md.ID
        WHERE mf.IsDeleted = 0 AND md.IsDeleted = 0 AND md.IsActive = 1
        """
        cursor.execute(query)
        files = cursor.fetchall()
        
        for row in files:
            file_id = row.ID
            file_name = row.FileName
            old_hash = row.FileHash
            directory_path = row.DirectoryPath
            directory_id = row.DirectoryID
            device_id = row.DeviceID
            
            # Construct full path logic
            full_path = ""
            ip = device_ips.get(device_id)
            
            if ip:
                drive, path_tail = os.path.splitdrive(directory_path)
                if drive:
                    drive_letter = drive[0]
                    # Construc UNC: \\IP\C$\Path\File
                    unc_base = f"\\\\{ip}\\{drive_letter}${path_tail}"
                    full_path = os.path.join(unc_base, file_name)
                elif directory_path.startswith("\\\\"):
                    full_path = os.path.join(directory_path, file_name)
                else:
                    full_path = os.path.join(directory_path, file_name)
            else:
                 full_path = os.path.join(directory_path, file_name)
            
            if not os.path.exists(full_path):
                logger.warning(f"File not found: {full_path}")
                # Logic for DELETED file could go here (e.g., create alert if not already alerted)
                # detailed handling omitted to avoid spamming alerts, but could be added.
                continue

            try:
                current_hash = compute_file_hash(full_path)
                file_size_bytes = os.path.getsize(full_path)
                file_size_str = str(file_size_bytes)
                mtime = os.path.getmtime(full_path)
                file_date_mod = datetime.fromtimestamp(mtime)
                
                # Check for modification OR handling first-time scan (if old_hash is None)
                if old_hash != current_hash:
                    change_type = 'MODIFIED' if old_hash else 'CREATED'
                    logger.info(f"File {change_type}: {full_path}")
                    
                    # Create Alert
                    alert_id = uuid.uuid4()
                    alert_msg = f"File {file_name} was {change_type.lower()}."
                    cursor.execute("""
                        INSERT INTO MonitoredFileAlerts 
                        (ID, MonitoredFileID, AlertType, Message, CreatedDate, IsAcknowledged, IsCleared)
                        VALUES (?, ?, ?, ?, GETDATE(), 0, 0)
                    """, (alert_id, file_id, change_type, alert_msg))
                    
                    # Update MonitoredFile
                    cursor.execute("""
                        UPDATE MonitoredFiles 
                        SET FileHash = ?, FileSize = ?, LastScan = GETDATE(), FileDateModified = ?
                        WHERE ID = ?
                    """, (current_hash, file_size_str, file_date_mod, file_id))
                    
                    conn.commit()
                    logger.info(f"Processed changes for {file_name}")
                
                else:
                    # No change, just update LastScan time to show we checked
                    cursor.execute("UPDATE MonitoredFiles SET LastScan = GETDATE() WHERE ID = ?", file_id)
                    conn.commit()
                    
            except Exception as e:
                logger.error(f"Error processing file {full_path}: {e}")
                # Optionally log scan failure
                
    except Exception as e:
        logger.error(f"Database Error: {e}")
    finally:
        if conn:
            conn.close()
    logger.info("Version Control Monitor check completed.")
