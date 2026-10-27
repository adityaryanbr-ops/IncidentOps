from __future__ import annotations

import io

from fastapi import HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}


async def read_and_validate_image(file: UploadFile, max_bytes: int) -> tuple[bytes, str]:
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image type '{content_type}'. Use JPEG, PNG, or WebP.",
        )

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty image upload.")
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"Image exceeds max size of {max_bytes // (1024 * 1024)} MB.",
        )

    try:
        with Image.open(io.BytesIO(data)) as img:
            img.verify()
            fmt = (img.format or "JPEG").upper()
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Could not decode image.") from exc

    mime = {
        "JPEG": "image/jpeg",
        "JPG": "image/jpeg",
        "PNG": "image/png",
        "WEBP": "image/webp",
    }.get(fmt, content_type)
    return data, mime
