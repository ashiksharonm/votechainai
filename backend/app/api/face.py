"""
Face Recognition API Routes

Serves reference images for face verification and handles face registration.
"""

import os
import base64
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.database import get_db
from app.utils.dependencies import get_current_user
from app.models.user import User

router = APIRouter()

# Path to images folder
# Use absolute path relative to this file location
# Path(__file__) is /app/app/api/face.py -> parent.parent is /app/app
BASE_DIR = Path(__file__).resolve().parent.parent
IMAGES_DIR = BASE_DIR / "images"

# Ensure images directory exists
IMAGES_DIR.mkdir(parents=True, exist_ok=True)


class FaceRegisterRequest(BaseModel):
    """Request body for face registration."""
    email: str
    image_data: str  # Base64 encoded image


@router.post(
    "/register",
    summary="Register face image during signup",
    description="Save a face reference image for a new user during registration."
)
async def register_face(request: FaceRegisterRequest) -> dict:
    """
    Register a face image during user registration.
    
    Accepts base64-encoded image data and saves it to the images folder.
    This endpoint is public (no auth required) since it's used during registration.
    """
    try:
        # Extract email prefix
        email_prefix = request.email.split('@')[0]
        
        # Validate email prefix
        if not email_prefix or len(email_prefix) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        # Decode base64 image
        # Handle data URL format: "data:image/jpeg;base64,..."
        image_data = request.image_data
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        try:
            image_bytes = base64.b64decode(image_data)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image data"
            )
        
        # Validate image size (max 5MB)
        if len(image_bytes) > 5 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Image too large (max 5MB)"
            )
        
        # Save image
        image_path = IMAGES_DIR / f"{email_prefix}.jpg"
        with open(image_path, 'wb') as f:
            f.write(image_bytes)
        
        return {
            "success": True,
            "message": "Face registered successfully",
            "email_prefix": email_prefix
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save face image: {str(e)}"
        )


@router.get(
    "/reference/{email_prefix}",
    summary="Get reference image for face verification",
    description="Get the stored reference image for a user by email prefix."
)
async def get_reference_image(
    email_prefix: str,
    current_user: Annotated[User, Depends(get_current_user)]
):
    """
    Get reference image for face verification.
    
    The image must match the logged-in user's email prefix.
    """
    # Verify the email prefix matches current user
    user_email_prefix = current_user.email.split('@')[0]
    if email_prefix != user_email_prefix:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your own reference image"
        )
    
    # Look for image with various extensions
    for ext in ['.jpg', '.jpeg', '.png', '.webp']:
        image_path = IMAGES_DIR / f"{email_prefix}{ext}"
        if image_path.exists():
            return FileResponse(
                path=str(image_path),
                media_type=f"image/{ext[1:]}" if ext != '.jpg' else "image/jpeg"
            )
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Reference image not found. Please contact admin to register your face."
    )


@router.get(
    "/check/{email_prefix}",
    summary="Check if reference image exists",
    description="Check if a reference image exists for the user."
)
async def check_reference_image(
    email_prefix: str,
    current_user: Annotated[User, Depends(get_current_user)]
) -> dict:
    """
    Check if a reference image exists for the user.
    """
    user_email_prefix = current_user.email.split('@')[0]
    if email_prefix != user_email_prefix:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only check your own reference image"
        )
    
    for ext in ['.jpg', '.jpeg', '.png', '.webp']:
        image_path = IMAGES_DIR / f"{email_prefix}{ext}"
        if image_path.exists():
            return {"exists": True, "email_prefix": email_prefix}
    
    return {"exists": False, "email_prefix": email_prefix}

