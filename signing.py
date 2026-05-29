from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, Form
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
import urllib.parse

from typing import Optional

from services.autogram import sign_pdf_with_autogram
from services.visual import add_visual_signature

from models.signature import VisualSignatureParams

from pyhanko.sign.validation import validate_pdf_signature
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko_certvalidator import ValidationContext
from io import BytesIO

import asyncio
from concurrent.futures import ThreadPoolExecutor

import glob

from asn1crypto import pem, x509

import json

app = FastAPI()

# prepojenie medzi f-endom a b-endom
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Signed-By", "X-Issued-By"],
)


def content_disposition(filename: str) -> str:
    """Vráti správne enkódovaný Content-Disposition header podporujúci diakritiku (RFC 5987)."""
    encoded = urllib.parse.quote(filename)
    return f"attachment; filename*=UTF-8''{encoded}"


@app.get("/")
def root():
    return {"message": "Backend beží"}


@app.post("/prepare-visual")
async def prepare_visual(
        file: UploadFile = File(...),
        image: Optional[UploadFile] = File(None),  # volitelny parameter pre obrazok/sken podpisu
        params: VisualSignatureParams = Depends(VisualSignatureParams.as_form)
):
    pdf_bytes = await file.read()

    if not pdf_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Súbor nie je PDF")

    MAX_FILE_SIZE = 10 * 1024 * 1024

    if len(pdf_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Súbor je príliš veľký (max 10 MB).")

    ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg"}

    if image and image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Nepodporovaný formát obrázka. Povolené sú PNG a JPEG")

    image_bytes = await image.read() if image else None
    prepared = add_visual_signature(
        pdf_bytes=pdf_bytes,
        page_index=params.page,
        x=params.x,
        y=params.y,
        w=params.w,
        h=params.h,
        text=params.text,
        image_bytes=image_bytes,
    )
    return Response(
        content=prepared,
        media_type="application/pdf",
        headers={"Content-Disposition": content_disposition(f"prepared_{file.filename}")}
    )


@app.post("/prepare-visual-multi")
async def prepare_visual_multi(
        file: UploadFile = File(...),
        image: Optional[UploadFile] = File(None),
        signatures: str = Form(...),  # JSON string
        text: Optional[str] = Form(None),
        font_name: Optional[str] = Form(None),
):
    pdf_bytes = await file.read()

    if not pdf_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Súbor nie je PDF")

    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Súbor je príliš veľký (max 10 MB).")

    try:
        sig_list = json.loads(signatures)
    except Exception:
        raise HTTPException(status_code=400, detail="Neplatný formát signatures JSON")

    image_bytes = await image.read() if image else None

    # aplikuj všetky podpisy postupne
    current_pdf = pdf_bytes
    for sig in sig_list:
        current_pdf = add_visual_signature(
            pdf_bytes=current_pdf,
            page_index=sig["page"],
            x=sig["x"],
            y=sig["y"],
            w=sig["w"],
            h=sig["h"],
            text=text,
            image_bytes=image_bytes,
            font_name=font_name,
        )

    return Response(
        content=current_pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": content_disposition(f"prepared_{file.filename}")}
    )


@app.post("/sign")
async def sign_document(file: UploadFile = File(...), level: str = Form("PAdES_BASELINE_B")):
    pdf_bytes = await file.read()

    MAX_FILE_SIZE = 10 * 1024 * 1024

    if len(pdf_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Súbor je príliš veľký (max 10 MB).")

    if not pdf_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Súbor nie je PDF")

    try:
        status, result = sign_pdf_with_autogram(pdf_bytes, file.filename, level)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if status == "signed":
        signed_by = result.get("signedBy", "")
        issued_by = result.get("issuedBy", "")
        return Response(
            content=result["content"],
            media_type="application/pdf",
            headers={
                "Content-Disposition": content_disposition(f"signed_{file.filename}"),
                "X-Signed-By": urllib.parse.quote(signed_by),
                "X-Issued-By": urllib.parse.quote(issued_by),
            }
        )

    if status == "cancelled":
        return {"signed": False, "message": "Podpis zrušený"}

    raise HTTPException(
        status_code=result.get("status_code", 503),
        detail=result.get("message", "Chyba pri podpisovaní")
    )


def load_trust_roots():
    certs = []
    for path in glob.glob("certs/*.pem"):
        with open(path, "rb") as f:
            cert_data = f.read()
            if pem.detect(cert_data):
                _, _, der_bytes = pem.unarmor(cert_data)
                certs.append(x509.Certificate.load(der_bytes))
    return certs


def run_verify(pdf_bytes: bytes):
    reader = PdfFileReader(BytesIO(pdf_bytes), strict=False)
    sigs = reader.embedded_signatures

    if not sigs:
        return []

    trust_roots = load_trust_roots()
    vc = ValidationContext(
        trust_roots=trust_roots,
        allow_fetching=True
    )

    results = []
    for sig in sigs:
        try:
            status = validate_pdf_signature(sig, signer_validation_context=vc)
            results.append({
                "valid": status.valid,
                "intact": status.intact,
                "signedBy": status.signing_cert.subject.human_friendly,
                "issuedBy": status.signing_cert.issuer.human_friendly,
                "signedAt": str(status.signer_reported_dt),
                "certValid": status.trusted,
            })
        except Exception as e:
            results.append({"valid": False, "error": str(e)})

    return results


@app.post("/verify")
async def verify_signatures(file: UploadFile = File(...)):
    pdf_bytes = await file.read()

    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as pool:
        results = await loop.run_in_executor(pool, run_verify, pdf_bytes)

    return {"signatures": results}