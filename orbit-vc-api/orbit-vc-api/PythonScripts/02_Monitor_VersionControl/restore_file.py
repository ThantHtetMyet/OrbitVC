import sys
import os
import json
import shutil


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


def try_restore_file(ip_address, dest_path, source_path):
    """
    Try to restore a file to remote UNC path using a specific IP address.

    Arguments:
        ip_address: IP address of the target machine
        dest_path: The destination path on the remote machine (e.g., C:/Users/...)
        source_path: The local source file path to copy from

    Returns:
        JSON result with success status
    """
    unc_path = construct_unc_path(ip_address, dest_path)

    if not unc_path:
        return {"success": False, "message": "Destination path must be absolute with drive letter", "ip_used": ip_address}

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
                "ip_used": ip_address,
                "data": {
                    "destinationPath": unc_path,
                    "fileSize": str(os.path.getsize(unc_path))
                }
            }
        else:
            return {"success": False, "message": "File copy completed but verification failed", "ip_used": ip_address}

    except PermissionError as e:
        return {"success": False, "message": f"Permission denied: {str(e)}", "ip_used": ip_address}
    except Exception as e:
        return {"success": False, "message": f"Failed to restore file: {str(e)}", "ip_used": ip_address}


def restore_file(ip_addresses_str, dest_path, source_path):
    """
    Restore a file by trying multiple IP addresses in order.
    IP addresses should be comma-separated, ordered by priority (Network-01, Network-02, etc.)
    """
    # Check if source file exists first
    if not os.path.exists(source_path):
        return {"success": False, "message": f"Source file not found: {source_path}"}

    # Split comma-separated IPs and trim whitespace
    ip_list = [ip.strip() for ip in ip_addresses_str.split(',') if ip.strip()]

    if not ip_list:
        return {"success": False, "message": "No IP addresses provided"}

    errors = []

    # Try each IP in order until one succeeds
    for ip in ip_list:
        result = try_restore_file(ip, dest_path, source_path)
        if result["success"]:
            return result
        else:
            errors.append(f"{ip}: {result.get('message', 'Unknown error')}")

    # All IPs failed - return combined error message
    return {
        "success": False,
        "message": f"Failed to restore file using all available IPs. Errors: {'; '.join(errors)}",
        "ips_tried": ip_list
    }


if __name__ == "__main__":
    if len(sys.argv) < 4:
        # Expecting: script.py <ip_addresses> <dest_path> <source_path>
        # ip_addresses can be comma-separated: "10.1.1.1,192.168.1.1"
        print(json.dumps({"success": False, "message": "Usage: <ip_addresses> <dest_path> <source_path>"}))
        sys.exit(1)

    ip_addresses = sys.argv[1]
    dest = sys.argv[2]
    source = sys.argv[3]

    result = restore_file(ip_addresses, dest, source)
    print(json.dumps(result))
