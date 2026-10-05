"""Root wrapper for CarGo database viewer.

Allows running `python view_db.py` directly from the project root directory.
"""
import os
import sys

# Add backend directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Import and execute the main function from backend/view_db.py
from view_db import main

if __name__ == "__main__":
    main()
