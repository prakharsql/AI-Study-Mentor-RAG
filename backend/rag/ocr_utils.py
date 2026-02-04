"""
Centralized OCR utility for Tesseract with Windows path configuration.
Handles image preprocessing and OCR configuration for optimal text extraction.
"""
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Tesseract configuration
TESSERACT_WINDOWS_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
TESSERACT_CONFIG = "--oem 3 --psm 6"

# Try to import OCR dependencies
try:
    import pytesseract
    from PIL import Image, ImageEnhance, ImageFilter
    HAS_OCR = True
    
    # Configure Tesseract path for Windows
    if os.name == "nt":  # Windows
        if os.path.exists(TESSERACT_WINDOWS_PATH):
            pytesseract.pytesseract.tesseract_cmd = TESSERACT_WINDOWS_PATH
            logger.info(f"Tesseract configured: {TESSERACT_WINDOWS_PATH}")
        else:
            # Try to find tesseract in PATH
            import shutil
            tesseract_path = shutil.which("tesseract")
            if tesseract_path:
                pytesseract.pytesseract.tesseract_cmd = tesseract_path
                logger.info(f"Tesseract found in PATH: {tesseract_path}")
            else:
                logger.warning(
                    f"Tesseract not found at {TESSERACT_WINDOWS_PATH} or in PATH. "
                    "OCR will not work. Install Tesseract from: "
                    "https://github.com/UB-Mannheim/tesseract/wiki"
                )
except ImportError:
    HAS_OCR = False
    logger.warning("pytesseract or Pillow not installed. OCR disabled.")


def preprocess_image(image):
    """
    Preprocess image for better OCR results:
    - Convert to grayscale
    - Resize (2x) for better recognition
    - Enhance contrast
    - Apply slight sharpening
    """
    if not HAS_OCR:
        return image
    
    try:
        # Convert to grayscale
        if image.mode != "L":
            image = image.convert("L")
        
        # Resize to 2x for better OCR (especially for low-res scans)
        width, height = image.size
        image = image.resize((width * 2, height * 2), Image.Resampling.LANCZOS)
        
        # Enhance contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)
        
        # Apply slight sharpening
        image = image.filter(ImageFilter.SHARPEN)
        
        return image
    except Exception as e:
        logger.warning(f"Image preprocessing failed: {e}. Using original image.")
        return image


def extract_text_from_image(image_path: str) -> tuple[str | None, str | None]:
    """
    Extract text from an image file using Tesseract OCR.
    
    Args:
        image_path: Path to the image file
        
    Returns:
        Tuple of (extracted_text, error_message)
        - If successful: (text, None)
        - If failed: (None, error_message)
    """
    if not HAS_OCR:
        return None, "OCR not available. Install pytesseract and Pillow, and ensure Tesseract is installed."
    
    try:
        # Open and preprocess image
        img = Image.open(image_path)
        
        # Handle different image modes
        if img.mode == "RGBA":
            # Create white background for RGBA images
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])  # Use alpha channel as mask
            img = background
        elif img.mode not in ("L", "RGB"):
            img = img.convert("RGB")
        
        # Preprocess for better OCR
        img = preprocess_image(img)
        
        # Perform OCR with configured settings
        text = pytesseract.image_to_string(img, config=TESSERACT_CONFIG)
        text = text.strip() if text else ""
        
        if not text:
            return None, "OCR extracted no text. Image may be blank or unreadable."
        
        return text, None
        
    except Exception as e:
        error_msg = f"OCR failed: {str(e)}"
        logger.exception(error_msg)
        return None, error_msg


def extract_text_from_pdf_images(pdf_path: str) -> tuple[str | None, str | None]:
    """
    Extract text from scanned PDF by converting pages to images and OCRing them.
    Requires pdf2image (poppler) for PDF to image conversion.
    
    Args:
        pdf_path: Path to the PDF file
        
    Returns:
        Tuple of (extracted_text, error_message)
    """
    try:
        from pdf2image import convert_from_path
    except ImportError:
        return None, "pdf2image not installed. Install with: pip install pdf2image. Also install Poppler: https://github.com/oschwartz10612/poppler-windows/releases"
    
    if not HAS_OCR:
        return None, "OCR not available. Install pytesseract and Pillow."
    
    try:
        full_text = []
        images = convert_from_path(pdf_path)
        
        for i, img in enumerate(images):
            # Preprocess and OCR each page
            processed_img = preprocess_image(img)
            page_text = pytesseract.image_to_string(processed_img, config=TESSERACT_CONFIG)
            if page_text.strip():
                full_text.append(f"--- Page {i + 1} ---\n{page_text.strip()}")
        
        if not full_text:
            return None, "OCR extracted no text from PDF pages."
        
        return "\n\n".join(full_text), None
        
    except Exception as e:
        error_msg = f"PDF OCR failed: {str(e)}"
        logger.exception(error_msg)
        return None, error_msg
