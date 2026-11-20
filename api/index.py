# Vercel entry point: serves the FastAPI backend (backend/main.py) as one Python function.
# vercel.json rewrites every /api/* request here; FastAPI routes on the original path.
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend"))

from main import app  # noqa: E402,F401
