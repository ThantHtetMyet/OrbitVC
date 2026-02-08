
import logging
import subprocess
import platform
import os
import sys
import uuid
import json

# Setup basic logging for module level (will be overridden by main.py logger if imported)
logger = logging.getLogger(__name__)

# Helper to connect to DB
def connect_db(config):
    try:
        import pyodbc
        db_cfg = config['database']
        conn_str = f"DRIVER={db_cfg['driver']};SERVER={db_cfg['server']};DATABASE={db_cfg['database']}"
        
        if 'uid' in db_cfg and 'pwd' in db_cfg:
            conn_str += f";UID={db_cfg['uid']};PWD={db_cfg['pwd']}"
        elif 'trusted_connection' in db_cfg:
             conn_str += f";Trusted_Connection={db_cfg['trusted_connection']}"

        if 'trust_server_certificate' in db_cfg:
             conn_str += f";TrustServerCertificate={db_cfg['trust_server_certificate']}"
             
        return pyodbc.connect(conn_str)
    except ImportError:
        logger.error("pyodbc module not installed. Please install it with 'pip install pyodbc'")
        return None
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        return None

def ping(host):
    """
    Returns True if host (str) responds to a ping request.
    """
    param_count = '-n' if platform.system().lower() == 'windows' else '-c'
    param_wait = '-w' if platform.system().lower() == 'windows' else '-W'
    wait_time = '1000' if platform.system().lower() == 'windows' else '1' 
    
    command = ['ping', param_count, '1', param_wait, wait_time, host]
    
    try:
        subprocess.check_output(command, stderr=subprocess.STDOUT)
        return True
    except:
        return False

def run(config):
    # This run() function is for the scheduled DB sync mode
    logger.info("Starting Ping Check Task...")
    
    conn = connect_db(config)
    if not conn:
        return

    try:
        cursor = conn.cursor()
        
        # 1. Get Status Types Dictionary from [ConnectionStatusTypes]
        cursor.execute("SELECT ID, Name FROM [ConnectionStatusTypes] WHERE IsDeleted = 0")
        rows = cursor.fetchall()
        status_map = {row.Name: row.ID for row in rows}
        
        # Database normally uses 'UP' and 'DOWN' for status
        online_id = status_map.get('UP')
        offline_id = status_map.get('DOWN')
        
        # Fallback to Online/Offline just in case
        if not online_id:
             online_id = status_map.get('Online')
        if not offline_id:
             offline_id = status_map.get('Offline')
        
        if not online_id:
            logger.error("Required 'UP' or 'Online' status type missing in database.")
            return

        # 2. Get Device IPs
        cursor.execute("SELECT ID, IPAddress FROM DeviceIPAddresses WHERE IsDeleted = 0")
        devices = cursor.fetchall()
        
        logger.info(f"Found {len(devices)} IP addresses to check.")
        
        for dev in devices:
            ip_id = dev.ID
            ip_addr = dev.IPAddress
            
            is_up = ping(ip_addr)
            status_id = online_id if is_up else offline_id
            
            status_text = "UP" if is_up else "DOWN"
            logger.info(f"Pinging {ip_addr} ... {status_text}")
            
            # 3. Update or Insert Status
            # Check for existing record
            check_sql = "SELECT ID FROM DeviceIPAddressConnectionStatus WHERE DeviceIPAddressID = ? AND IsDeleted = 0"
            cursor.execute(check_sql, ip_id)
            existing = cursor.fetchone()
            
            if existing:
                update_sql = """
                    UPDATE DeviceIPAddressConnectionStatus 
                    SET ConnectionStatusTypeID = ?, LastCheckedDate = GETDATE()
                    WHERE ID = ?
                """
                cursor.execute(update_sql, (status_id, existing.ID))
            else:
                insert_sql = """
                    INSERT INTO DeviceIPAddressConnectionStatus 
                    (ID, DeviceIPAddressID, ConnectionStatusTypeID, IsDeleted, LastCheckedDate)
                    VALUES (?, ?, ?, 0, GETDATE())
                """
                cursor.execute(insert_sql, (uuid.uuid4(), ip_id, status_id))
        
        conn.commit()
        logger.info("Ping Check Task Completed Successfully.")
        
    except Exception as e:
        logger.error(f"Error during ping check execution: {e}")
    finally:
        conn.close()

def command_line_mode():
    # CLI mode for API calls - prints JSON to stdout
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "message": "No IP addresses provided"}))
        sys.exit(1)
        
    ips = sys.argv[1:]
    
    # API just wants us to check if they are reachable.
    # Logic: if ANY fail, we could report failure, or just report success/fail for current check.
    # The C# controller passes all IPs and expects "success" if valid.
    # Current C# logic: return (false, ...) if any fail? 
    # C# Controller calls: RunPingCheckAsync(ips)
    # The previous script implementation (Step 132/172) returned SUCCESS if ANY ping worked?
    # "for ip in ips: if ping(ip): print success; return;"
    # "print failure; return 1"
    # This means "If at least one IP is reachable, treat as success"? 
    # Or "If the *first* reachable IP is found..."
    
    # Requirement from Controller: "return BadRequest if ICMP failed: None of the provided IP addresses are reachable"
    # So if AT LEAST ONE works, we return success.
    
    for ip in ips:
        if ping(ip):
            print(json.dumps({"success": True, "ip": ip, "message": f"Successfully pinged {ip}"}))
            sys.exit(0)
            
    print(json.dumps({"success": False, "message": "ICMP ping failed for all provided IP addresses"}))
    sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Command line arguments present -> API Mode
        command_line_mode()
    else:
        # No args -> Standalone Scheduled Mode (Test Run)
        config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'config.json')
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                cfg = json.load(f)
            
            # Setup basic logging for standalone
            logging.basicConfig(level=logging.INFO)
            run(cfg)
        else:
            print("Config file not found for standalone run. Usage: python ping_check.py [ip1] [ip2] ...")
