"""Validate and shrink uploaded photos before storing them in the database."""
import base64
from io import BytesIO

from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError


def make_profile_photo(data: bytes) -> str:
    if not data or len(data) > 2 * 1024 * 1024:
        raise HTTPException(400, 'Choose a JPG, PNG, or WebP photo up to 2 MB.')
    try:
        with Image.open(BytesIO(data)) as image:
            if image.format not in {'JPEG', 'PNG', 'WEBP'}:
                raise ValueError('Unsupported image format')
            if image.width * image.height > 12_000_000:
                raise ValueError('Photo dimensions are too large')
            image = ImageOps.exif_transpose(image)
            image.thumbnail((256, 256))
            output = BytesIO()
            image.convert('RGB').save(output, format='JPEG', quality=85)
        return 'data:image/jpeg;base64,' + base64.b64encode(output.getvalue()).decode('ascii')
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError):
        raise HTTPException(400, 'Choose a valid JPG, PNG, or WebP photo under 12 megapixels.')
