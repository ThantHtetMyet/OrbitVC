
import logging
import os
import sys
from datetime import datetime

def setup_logger(log_dir, level="INFO"):
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    # Use today's date for the log file
    log_filename = datetime.now().strftime("log_%Y-%m-%d.txt")
    log_path = os.path.join(log_dir, log_filename)

    logging.basicConfig(
        filename=log_path,
        level=getattr(logging, level.upper(), logging.INFO),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    logger = logging.getLogger()
    
    # Add console handler as well so we can see output
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(getattr(logging, level.upper(), logging.INFO))
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)
    
    # Remove existing handlers to avoid duplicates if re-initialized
    if logger.hasHandlers():
        logger.handlers.clear()
        
    logger.addHandler(console_handler)
    # Add file handler back since clear() removed it (basicConfig adds it to root)
    file_handler = logging.FileHandler(log_path)
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
    logger.addHandler(file_handler)

    return logger
