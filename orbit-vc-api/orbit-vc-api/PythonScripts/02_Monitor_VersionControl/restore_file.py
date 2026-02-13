import sys
import os
import json
import shutil


def restore_file(ip_address, dest_path, source_path):
    """
    Restore a file from local storage to remote UNC path.

    Args:
        ip_address: IP address of the target machine
        dest_path: The destination path on the remote machine (e.g., C:/Users/...)
        source_path: The local source file path to copy from

    Returns:
        JSON result with success status
    """
    # Check if source file exists
    if not os.path.exists(source_path):
        return {"success": False, "message": f"Source file not found: {source_path}"}

    # Convert local path to administrative share UNC path
    # e.g. C:\Users\... -> \\<IP>\C$\Users\...
    drive, path_tail = os.path.splitdrive(dest_path)

    if drive:
        # drive is "C:"
        # unc = \\IP\C$\path_tail
        drive_letter = drive[0]
        unc_path = f"\\\\{ip_address}\\{drive_letter}${path_tail}"
    elif dest_path.startswith("\\\\"):
        # Already UNC path
        unc_path = dest_path
    else:
        return {"success": False, "message": "Destination path must be absolute with drive letter"}

    try:
        # Ensure destination directory exists
        dest_dir = os.path.dirname(unc_path)
        if not os.path.exists(dest_dir):
            os.makedirs(dest_dir, exist_ok=True)

        # Copy the file to UNC path
        shutil.copy2(source_path, unc_path)

        # Verify the copy was successful
        if os.path.exists(unc_path):
            return {
                "success": True,
                "message": f"File restored successfully to {unc_path}",
                "data": {
                    "destinationPath": unc_path,
                    "fileSize": str(os.path.getsize(unc_path))
                }
            }
        else:
            return {"success": False, "message": "File copy completed but verification failed"}

    except PermissionError as e:
        return {"success": False, "message": f"Permission denied: {str(e)}"}
    except Exception as e:
        return {"success": False, "message": f"Failed to restore file: {str(e)}"}


if __name__ == "__main__":
    if len(sys.argv) < 4:
        # Expecting: script.py <ip> <dest_path> <source_path>
        print(json.dumps({"success": False, "message": "Usage: <ip> <dest_path> <source_path>"}))
        sys.exit(1)

    ip = sys.argv[1]
    dest = sys.argv[2]
    source = sys.argv[3]

    result = restore_file(ip, dest, source)
    print(json.dumps(result))
