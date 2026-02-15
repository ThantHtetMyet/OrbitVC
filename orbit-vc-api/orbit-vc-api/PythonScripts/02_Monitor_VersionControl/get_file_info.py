import sys
import os
import hashlib
import json
import shutil
from datetime import datetime


def construct_unc_path(ip_address, file_path):
    """Convert local path to administrative share UNC path"""
    drive, path_tail = os.path.splitdrive(file_path)

    if drive:
        drive_letter = drive[0]
        return f"\\\\{ip_address}\\{drive_letter}${path_tail}"
    elif file_path.startswith("\\\\"):
        return file_path
    else:
        return None


def try_get_file_info(ip_address, file_path, dest_path=None):
    """Try to get file info using a specific IP address"""
    unc_path = construct_unc_path(ip_address, file_path)

    if not unc_path:
        return {"success": False, "message": "File path must be absolute with drive letter", "ip_used": ip_address}

    if not os.path.exists(unc_path):
        return {"success": False, "message": f"File not found or access denied: {unc_path}", "ip_used": ip_address}

    try:
        target_path = unc_path

        # Copy if requested
        if dest_path:
            try:
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                shutil.copy2(unc_path, dest_path)
                target_path = dest_path  # Use local file for processing
            except Exception as e:
                return {"success": False, "message": f"Failed to copy file: {str(e)}", "ip_used": ip_address}

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
            },
            "ip_used": ip_address
        }
    except Exception as e:
        return {"success": False, "message": str(e), "ip_used": ip_address}


def get_file_info(ip_addresses_str, file_path, dest_path=None):
    """
    Get file info by trying multiple IP addresses in order.
    IP addresses should be comma-separated, ordered by priority (Network-01, Network-02, etc.)
    """
    # Split comma-separated IPs and trim whitespace
    ip_list = [ip.strip() for ip in ip_addresses_str.split(',') if ip.strip()]

    if not ip_list:
        return {"success": False, "message": "No IP addresses provided"}

    errors = []

    # Try each IP in order until one succeeds
    for ip in ip_list:
        result = try_get_file_info(ip, file_path, dest_path)
        if result["success"]:
            return result
        else:
            errors.append(f"{ip}: {result.get('message', 'Unknown error')}")

    # All IPs failed - return combined error message
    return {
        "success": False,
        "message": f"Failed to access file using all available IPs. Errors: {'; '.join(errors)}",
        "ips_tried": ip_list
    }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        # Expecting: script.py <ip_addresses> <path> [dest_path]
        # ip_addresses can be comma-separated: "10.1.1.1,192.168.1.1"
        print(json.dumps({"success": False, "message": "Usage: <ip_addresses> <path> [dest_path]"}))
        sys.exit(1)

    ip_addresses = sys.argv[1]
    path = sys.argv[2]

    dest = None
    if len(sys.argv) > 3:
        dest = sys.argv[3]

    result = get_file_info(ip_addresses, path, dest)
    print(json.dumps(result))
