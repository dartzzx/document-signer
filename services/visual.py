from io import BytesIO
from typing import Optional

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader


def add_visual_signature(
    pdf_bytes: bytes,
    page_index: int,
    x: float,
    y: float,
    w: float,
    h: float,
    text: Optional[str] = None,
    image_bytes: Optional[bytes] = None,
) -> bytes:
    reader = PdfReader(BytesIO(pdf_bytes), strict=False)

    if page_index < 0 or page_index >= len(reader.pages):
        raise ValueError("Neplatné číslo strany")

    # 1) Najprv prenes celé PDF do writer-a (bez úprav)
    writer = PdfWriter()
    writer.append_pages_from_reader(reader)

    # 2) Zisti rozmery cieľovej stránky už z writer-a
    page = writer.pages[page_index]
    page_width = float(page.mediabox.width)
    page_height = float(page.mediabox.height)

    # Bezpečné orezanie do stránky
    x = max(0, min(x, page_width))
    y = max(0, min(y, page_height))
    w = max(1, min(w, page_width - x))
    h = max(1, min(h, page_height - y))

    # 3) Vyrob overlay PDF (1 stránka)
    overlay_buf = BytesIO()
    c = canvas.Canvas(overlay_buf, pagesize=(page_width, page_height))

    c.rect(x, y, w, h, stroke=1, fill=0)

    padding = 6
    if image_bytes:
        img = ImageReader(BytesIO(image_bytes))
        c.drawImage(
            img,
            x + padding,
            y + padding,
            width=w - 2 * padding,
            height=h - 2 * padding,
            preserveAspectRatio=True,
            mask="auto",
        )

    if text:
        c.setFont("Helvetica", 9)
        c.drawString(x + padding, y + h - 14, text)

    c.save()
    overlay_buf.seek(0)

    overlay_pdf = PdfReader(overlay_buf, strict=False)
    overlay_page = overlay_pdf.pages[0]

    # 4) Merge overlay do writer stránky (nie do reader stránky)
    page.merge_page(overlay_page)

    out = BytesIO()
    writer.write(out)
    return out.getvalue()
