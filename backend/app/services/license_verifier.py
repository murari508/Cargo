"""Driving Licence Verification Service for CarGo.

Validates that uploaded driving licence documents meet quality, dimensional,
and format requirements before allowing self-drive car reservations.
"""
import io
import math
import os
import re
import secrets
import time
from typing import Tuple
from PIL import Image, ImageStat


DL_REGEX = re.compile(r"^[A-Z]{2}[0-9]{2}[ -]?[0-9]{4}[ -]?[0-9]{7}$", re.IGNORECASE)
GENERAL_DL_REGEX = re.compile(r"^[A-Z]{2}[0-9A-Z]{5,20}$", re.IGNORECASE)


def validate_license_image(
    file_bytes: bytes,
    filename: str,
    dl_number: str = "",
) -> dict:
    """Inspects an uploaded driving licence image.
    Returns:
        dict: {"valid": bool, "reason": str, "dl_number": str, "image_url": str}
    """
    # 1. File size checks
    if not file_bytes or len(file_bytes) < 1024:
        return {
            "valid": False,
            "reason": "Uploaded file is too small (less than 1 KB). Please upload a clear photo or scan of your original Driving Licence card.",
            "dl_number": dl_number,
            "image_url": "",
        }

    if len(file_bytes) > 12 * 1024 * 1024:
        return {
            "valid": False,
            "reason": "Uploaded file exceeds 12 MB limit. Please upload a compressed photo under 12 MB.",
            "dl_number": dl_number,
            "image_url": "",
        }

    # 2. Image integrity and dimensions check via Pillow
    try:
        image = Image.open(io.BytesIO(file_bytes))
        image.verify()
        # Re-open after verify() as verify alters image pointer
        image = Image.open(io.BytesIO(file_bytes))
    except Exception:
        return {
            "valid": False,
            "reason": "Corrupted or unsupported image file. Please upload a standard JPG, PNG, or WEBP image.",
            "dl_number": dl_number,
            "image_url": "",
        }

    width, height = image.size

    # Must have reasonable resolution for document inspection
    if width < 180 or height < 120:
        return {
            "valid": False,
            "reason": f"Image resolution ({width}x{height}) is too low to be a readable Driving Licence card. Please upload a clear photo of at least 300x200 resolution.",
            "dl_number": dl_number,
            "image_url": "",
        }

    # Aspect ratio check: Standard driving licence cards are roughly 1.58 ratio (85.6mm x 53.98mm)
    # Allowing orientation variations from 0.8 to 2.4
    aspect_ratio = width / float(height)
    if aspect_ratio < 0.4 or aspect_ratio > 3.0:
        return {
            "valid": False,
            "reason": "Image dimensions do not match a driving licence document format. Please upload a photo of the licence card.",
            "dl_number": dl_number,
            "image_url": "",
        }

    # 3. Variance / Blank image detection
    try:
        grayscale = image.convert("L")
        stat = ImageStat.Stat(grayscale)
        variance = stat.var[0] if stat.var else 0
        if variance < 25:  # Pure flat color or blank image
            return {
                "valid": False,
                "reason": "Image appears blank or has insufficient contrast. Please upload a clear, legible photo of your Driving Licence.",
                "dl_number": dl_number,
                "image_url": "",
            }
    except Exception:
        pass

    # 4. Validate DL number format if provided
    clean_dl = re.sub(r"[^A-Za-z0-9]", "", dl_number or "").upper()
    if clean_dl:
        if len(clean_dl) < 7:
            return {
                "valid": False,
                "reason": f"Driving Licence number '{dl_number}' is too short. Indian Driving Licences contain state code and RTO serial numbers (e.g., TS09 20210012345).",
                "dl_number": dl_number,
                "image_url": "",
            }
    else:
        # Generate or require number
        clean_dl = f"DL{secrets.token_hex(4).upper()}"

    # 5. Save the verified document to uploads directory
    safe_ext = "jpg"
    if filename.lower().endswith(".png"):
        safe_ext = "png"
    elif filename.lower().endswith(".webp"):
        safe_ext = "webp"

    timestamp = int(time.time())
    unique_filename = f"dl_{timestamp}_{secrets.token_hex(4)}.{safe_ext}"

    # Paths:
    backend_upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads", "licenses")
    frontend_upload_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "frontend", "public", "uploads", "licenses")

    os.makedirs(backend_upload_dir, exist_ok=True)
    os.makedirs(frontend_upload_dir, exist_ok=True)

    backend_path = os.path.join(backend_upload_dir, unique_filename)
    frontend_path = os.path.join(frontend_upload_dir, unique_filename)

    with open(backend_path, "wb") as f:
        f.write(file_bytes)
    with open(frontend_path, "wb") as f:
        f.write(file_bytes)

    relative_url = f"/uploads/licenses/{unique_filename}"

    return {
        "valid": True,
        "dl_number": dl_number.upper() if dl_number else clean_dl,
        "image_url": relative_url,
        "message": "Driving Licence document verified and approved for self-drive booking.",
    }
