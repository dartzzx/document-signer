import base64
import requests

AUTOGRAM_URL = "http://localhost:37200/sign"

def sign_pdf_with_autogram(pdf_bytes: bytes, filename: str, level: str):
    payload = {
        "document": {
            "content": base64.b64encode(pdf_bytes).decode("utf-8"),
            "filename": filename
        },
        "parameters": {"level": level},
        "payloadMimeType": "application/pdf;base64"
    }

    try:
        r = requests.post(AUTOGRAM_URL, json=payload, timeout=60)
    except requests.RequestException:
        return "error", {
            "status_code": 503,
            "message": "Podpisovacia aplikácia Autogram nie je dostupná."
        }

    if r.status_code == 200:
        data = r.json()
        signed_pdf_bytes = base64.b64decode(data["content"])
        return "signed", {
            "signedBy": data.get("signedBy"),
            "issuedBy": data.get("issuedBy"),
            "content": signed_pdf_bytes,
        }

    if r.status_code == 204:
        return "cancelled", {}

    return "error", {
        "status_code": r.status_code,
        "message": r.text
    }
