from io import BytesIO
from typing import Optional
import os

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from fastapi import HTTPException

FONTS_DIR = os.path.join(os.path.dirname(__file__), "..", "fonts")

_FONT_FILES = {
    "DejaVu":        "DejaVuSans.ttf",
    "DancingScript": "DancingScript-Regular.ttf",
    "Caveat":        "Caveat-Regular.ttf",
}

# Registruj len fonty, ktorých súbor existuje
FONTS: dict[str, str] = {}
for name, file in _FONT_FILES.items():
    path = os.path.join(FONTS_DIR, file)
    if os.path.exists(path):
        pdfmetrics.registerFont(TTFont(name, path))
        FONTS[name] = file
    else:
        print(f"[visual_signature] Font '{name}' preskočený – súbor nenájdený: {path}")

if not FONTS:
    raise RuntimeError("Žiadny font sa nenašiel. Skopíruj aspoň DejaVuSans.ttf do /fonts.")

DEFAULT_FONT = next(iter(FONTS))  # prvý dostupný


def add_visual_signature(
    pdf_bytes: bytes,
    page_index: int,
    x: float, y: float, w: float, h: float,
    text: Optional[str] = None,
    image_bytes: Optional[bytes] = None,
    font_name: Optional[str] = None,
) -> bytes:
    reader = PdfReader(BytesIO(pdf_bytes), strict=False)

    if page_index < 0 or page_index >= len(reader.pages):
        raise HTTPException(status_code=400, detail="Neplatné číslo strany")

    writer = PdfWriter()
    writer.append_pages_from_reader(reader)

    page = writer.pages[page_index]
    pw, ph = float(page.mediabox.width), float(page.mediabox.height)

    x = max(0.0, min(x, pw));  w = max(1.0, min(w, pw - x))
    y = max(0.0, min(y, ph));  h = max(1.0, min(h, ph - y))

    overlay_buf = BytesIO()
    c = canvas.Canvas(overlay_buf, pagesize=(pw, ph))
    c.rect(x, y, w, h, stroke=1, fill=0)

    padding = 6.0

    if image_bytes:
        c.drawImage(ImageReader(BytesIO(image_bytes)),
                    x + padding, y + padding,
                    width=w - 2 * padding, height=h - 2 * padding,
                    preserveAspectRatio=True, mask="auto")

    if text:
        font = font_name if font_name in FONTS else DEFAULT_FONT
        fsize = max(8.0, min(h * 0.2, 14.0))
        c.setFont(font, fsize)
        c.drawCentredString(x + w / 2, y + (h - fsize) / 2, text)

    c.save()
    overlay_buf.seek(0)

    page.merge_page(PdfReader(overlay_buf, strict=False).pages[0])

    out = BytesIO()
    writer.write(out)
    return out.getvalue()