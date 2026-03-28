from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

from typing import Optional

from services.autogram import sign_pdf_with_autogram
from services.visual import add_visual_signature

from models.signature import VisualSignatureParams

app = FastAPI()

# prepojenie medzi f-endom a b-endom
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Backend beží"}


@app.post("/prepare-visual")
async def prepare_visual(
    file: UploadFile = File(...),
    image: Optional[UploadFile] = File(None), # volitelny parameter pre obrazok/sken podpisu
    params: VisualSignatureParams = Depends(VisualSignatureParams.as_form)
):
    pdf_bytes = await file.read()

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
        headers={"Content-Disposition": f'attachment; filename="prepared_{file.filename}"'}
    )


@app.post("/sign")
async def sign_document(file: UploadFile = File(...)):
    pdf_bytes = await file.read()

    MAX_FILE_SIZE = 10 * 1024 * 1024

    if len(pdf_bytes) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="Súbor je príliš veľký (max 10 MB).")

    if not pdf_bytes.startswith(b"%PDF"):
        raise HTTPException(status_code=400, detail="Súbor nie je PDF")

    try:
        status, result = sign_pdf_with_autogram(pdf_bytes, file.filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    if status == "signed":
        return Response(
            content=result["content"],
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="signed_{file.filename}"'}
        )

    if status == "cancelled":
        return {"signed": False, "message": "Podpis zrušený"}

    raise HTTPException(
        status_code = result.get("status_code", 503),
        detail = result.get("message", "Chyba pri podpisovaní")
    )
