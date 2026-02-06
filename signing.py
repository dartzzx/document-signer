import base64
import requests

AUTOGRAM_URL = "http://localhost:37200/sign"

INPUT_FILE = "input.pdf"
OUTPUT_FILE = "signed.pdf"

# Načítanie PDF
with open(INPUT_FILE, "rb") as f:
    pdf_base64 = base64.b64encode(f.read()).decode("utf-8")

payload = {
    "document": {
        "content": pdf_base64,
        "filename": INPUT_FILE
    },
    "parameters": {
        "level": "PAdES_BASELINE_B"
    },
    "payloadMimeType": "application/pdf;base64"
}

response = requests.post(AUTOGRAM_URL, json=payload)

if response.status_code == 200:
    data = response.json()
    signed_pdf = base64.b64decode(data["content"])

    with open(OUTPUT_FILE, "wb") as f:
        f.write(signed_pdf)

    print("✅ Dokument podpísaný")
    print("Podpis:", data.get("signedBy"))

elif response.status_code == 204:
    print("❗ Podpis bol zrušený používateľom")

else:
    print("❌ Chyba:")
    print(response.status_code)
    print(response.text)
