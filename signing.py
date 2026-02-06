from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import Response

from services.autogram import sign_pdf_with_autogram
from services.visual import add_visual_signature

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Backend beží"}


@app.post("/prepare-visual")
async def prepare_visual(
    file: UploadFile = File(...),
    page: int = Form(...),         # 0-based
    x: float = Form(...),
    y: float = Form(...),
    w: float = Form(...),
    h: float = Form(...),
    text: str = Form(""),          # voliteľné
):
    pdf_bytes = await file.read()
    prepared = add_visual_signature(
        pdf_bytes=pdf_bytes,
        page_index=page,
        x=x, y=y, w=w, h=h,
        text=text if text else None,
        image_bytes=None,          # neskôr pridáš upload obrázka
    )
    return Response(
        content=prepared,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="prepared_{file.filename}"'}
    )


@app.post("/sign")
async def sign_document(file: UploadFile = File(...)):
    pdf_bytes = await file.read()
    status, result = sign_pdf_with_autogram(pdf_bytes, file.filename)

    if status == "signed":
        return Response(
            content=result["content"],
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="signed_{file.filename}"'}
        )
    if status == "cancelled":
        return {"signed": False, "message": "Podpis zrušený"}

    return {"error": result.get("message"), "status_code": result.get("status_code")}
