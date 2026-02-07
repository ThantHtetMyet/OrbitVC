import sys
import subprocess
import platform
import json

def ping(host):
    """
    Returns True if host (str) responds to a ping request.
    """
    # Windows specific ping command parameters
    # -n 1: Send 1 packet
    # -w 1000: Wait up to 1000ms (1 second) for reply
    param_count = '-n' if platform.system().lower() == 'windows' else '-c'
    param_wait = '-w' if platform.system().lower() == 'windows' else '-W'
    wait_time = '1000' if platform.system().lower() == 'windows' else '1' # specific for unix ping
    
    command = ['ping', param_count, '1', param_wait, wait_time, host]
    
    try:
        # Check output, suppress stdout/stderr
        subprocess.check_output(command, stderr=subprocess.STDOUT)
        return True
    except subprocess.CalledProcessError:
        return False
    except Exception:
        return False

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "message": "No IP addresses provided"}))
        sys.exit(1)
        
    ips = sys.argv[1:]
    
    for ip in ips:
        if ping(ip):
            print(json.dumps({"success": True, "ip": ip, "message": f"Successfully pinged {ip}"}))
            sys.exit(0)
            
    print(json.dumps({"success": False, "message": "ICMP ping failed for all provided IP addresses"}))
    sys.exit(1)

if __name__ == '__main__':
    main()
