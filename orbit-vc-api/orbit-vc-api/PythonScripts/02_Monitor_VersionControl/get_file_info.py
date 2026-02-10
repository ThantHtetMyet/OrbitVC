import sys
import os
import hashlib
import json
import shutil
from datetime import datetime


def get_file_info(ip_address, file_path, dest_path=None):
    # Convert local path to administrative share UNC path
    # e.g. C:\Users\... -> \\<IP>\C$\Users\...
    drive, path_tail = os.path.splitdrive(file_path)
    
    if drive:
        # drive is "C:"
        # unc = \\IP\C$\path_tail
        drive_letter = drive[0]
        unc_path = f"\\\\{ip_address}\\{drive_letter}${path_tail}"
    elif file_path.startswith("\\\\"):
        # Already UNC path
        unc_path = file_path
    else:
        return {"success": False, "message": "File path must be absolute with drive letter"}
    
    target_path = unc_path

    if not os.path.exists(unc_path):
        return {"success": False, "message": f"File not found or access denied: {unc_path}"}

    try:
        # Copy if requested
        if dest_path:
            try:
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                shutil.copy2(unc_path, dest_path)
                target_path = dest_path # Use local file for processing
            except Exception as e:
                 return {"success": False, "message": f"Failed to copy file: {str(e)}"}

        # Size
        size_bytes = os.path.getsize(target_path)
        size_str = str(size_bytes)
        
        # Modification Time
        mtime = os.path.getmtime(target_path)
        mtime_iso = datetime.fromtimestamp(mtime).isoformat()
        
        # Hash
        sha256_hash = hashlib.sha256()
        with open(target_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        file_hash = sha256_hash.hexdigest()
        
        return {
            "success": True,
            "data": {
                "fileSize": size_str,
                "fileHash": file_hash,
                "fileDateModified": mtime_iso
            }
        }
    except Exception as e:
        return {"success": False, "message": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 3:
        # Expecting: script.py <ip> <path> [dest_path]
        print(json.dumps({"success": False, "message": "Usage: <ip> <path> [dest_path]"}))
        sys.exit(1)
        
    ip = sys.argv[1]
    path = sys.argv[2]
    # Handle quoted path if it was split differently? No, relying on standard argv
    
    dest = None
    if len(sys.argv) > 3:
        dest = sys.argv[3]
    
    result = get_file_info(ip, path, dest)
    print(json.dumps(result))
