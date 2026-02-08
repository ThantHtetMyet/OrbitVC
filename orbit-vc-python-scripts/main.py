
import json
import time
import os
import sys
import importlib.util
from datetime import datetime, timedelta

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from logger_setup import setup_logger
except ImportError:
    import logging
    def setup_logger(log_dir, level):
        logging.basicConfig(level=logging.INFO)
        return logging.getLogger()

CONFIG_FILE = 'config.json'

def load_config():
    config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), CONFIG_FILE)
    if not os.path.exists(config_path):
        print("Config file not found")
        return {}
    with open(config_path, 'r') as f:
        return json.load(f)

def run_module(module_config, logger, global_config):
    name = module_config.get('name')
    path = module_config.get('module_path')
    
    logger.info(f"Checking module: {name}")
    
    try:
        # Resolve path 01_Ping... -> 01_Ping.../ping_check.py
        # If dotted notation is used
        if '.' in path and not path.endswith('.py'):
            # Convert python path to file path relative to current dir
            parts = path.split('.')
            file_path = os.path.join(*parts) + ".py"
            
            if os.path.exists(file_path):
                 spec = importlib.util.spec_from_file_location(name, file_path)
                 module = importlib.util.module_from_spec(spec)
                 spec.loader.exec_module(module)
                 if hasattr(module, 'run'):
                     logger.info(f"Running module function: {name}")
                     module.run(global_config)
                 else:
                     logger.error(f"Module {name} has no 'run' function")
            else:
                 logger.error(f"Module file not found: {file_path}")
                 
        else:
            # Direct file path
            if os.path.exists(path):
                spec = importlib.util.spec_from_file_location(name, path)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)
                if hasattr(module, 'run'):
                    module.run(global_config)
                else:
                    logger.error(f"Module {name} has no 'run' function")
            else:
                logger.error(f"Module file not found: {path}")

    except Exception as e:
        logger.error(f"Failed to run module {name}: {e}")

def main():
    config = load_config()
    if not config:
        return

    log_dir = config.get('logging', {}).get('directory', './Logs')
    log_level = config.get('logging', {}).get('level', 'INFO')
    logger = setup_logger(log_dir, log_level)
    
    logger.info("Main Service Started")
    
    modules = config.get('modules', [])
    last_runs = {}
    
    # Run immediately on start
    logger.info("Performing initial run...")
    
    while True:
        try:
            # Reload config on every loop to allow hot updates?
            # For simplicity, we just reload config object inside loop or restart script
            
            current_time = datetime.now()
            
            for mod in modules:
                if not mod.get('enabled'):
                    continue
                
                name = mod.get('name')
                interval = mod.get('interval_minutes', 60)
                last_run = last_runs.get(name)
                
                should_run = False
                if last_run is None:
                    should_run = True
                else:
                    if current_time - last_run > timedelta(minutes=interval):
                        should_run = True
                
                if should_run:
                    run_module(mod, logger, config)
                    last_runs[name] = current_time
            
            check_interval = config.get('scheduler', {}).get('check_interval_seconds', 10)
            time.sleep(check_interval)
            
        except KeyboardInterrupt:
            logger.info("Stopping...")
            break
        except Exception as e:
            logger.error(f"Main Loop Error: {e}")
            time.sleep(60)

if __name__ == "__main__":
    main()
