import { useState } from "react";

function parseSignedBy(dn) {
  if (!dn) return "Neznáme";
  const obj = {};
  dn.split(",").forEach(p => {
    const [k, v] = p.split("=");
    if (k && v) obj[k.trim()] = v.trim();
  });
  return `${obj.GIVENNAME || ""} ${obj.SURNAME || ""}`.trim() || obj.CN || dn;
}

function parseIssuer(dn) {
  if (!dn) return "Neznáme";
  const obj = {};
  dn.split(",").forEach(p => {
    const [k, v] = p.split("=");
    if (k && v) obj[k.trim()] = v.trim();
  });
  return obj.O || obj.CN || dn;
}

export default function Step3Sign({ currentPdfBlob, currentPdfName, setCurrentPdfBlob, setCurrentPdfName, onBack }) {
  const [padesLevel, setPadesLevel] = useState("PAdES_BASELINE_B");
  const [isSigning, setIsSigning] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState(null);
  const [signatureInfo, setSignatureInfo] = useState(null);
  const [error, setError] = useState(null);

  async function signDocument() {
    if (!confirm("Naozaj chcete podpísať dokument? Táto akcia je nevratná.")) return;
    setIsSigning(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("file", new File([currentPdfBlob], currentPdfName, { type: "application/pdf" }));
      form.append("level", padesLevel);

      const res = await fetch("http://127.0.0.1:8000/sign", { method: "POST", body: form });

      if (!res.ok) {
        try {
          const err = await res.json();
          setError(err.detail || "Neznáma chyba");
        } catch {
          setError(await res.text());
        }
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/pdf")) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setSignedPdfUrl(url);
        setCurrentPdfBlob(blob);
        setCurrentPdfName(`signed_${currentPdfName}`);
        setSignatureInfo({
          signedBy: res.headers.get("X-Signed-By"),
          issuedBy: res.headers.get("X-Issued-By"),
          signedAt: new Date().toLocaleString(),
          profile: padesLevel === "PAdES_BASELINE_T" ? "PAdES-T" : "PAdES-B",
        });
      } else {
        const data = await res.json();
        setError(data.message || "Podpisovanie zlyhalo.");
      }
    } catch {
      setError("Nepodarilo sa spojiť s backendom.");
    } finally {
      setIsSigning(false);
    }
  }

  return (
    <>
      <style>{`
        .step3-layout {
          max-width: 700px;
          margin: 40px auto;
          padding: 0 24px;
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 20px;
          align-items: start;
        }
        .sign-card {
          background: #fff;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        }
        .sign-card h2 {
          font-family: 'DM Sans', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 6px;
        }
        .sign-card .subtitle {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 28px;
        }
        .pades-row {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }
        .pades-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          white-space: nowrap;
        }
        .pades-select {
          padding: 8px 12px;
          border: 1px solid #e8eaf0;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          background: #fff;
        }
        .sign-btn {
          width: 100%;
          padding: 15px;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
          letter-spacing: 0.01em;
        }
        .sign-btn:hover:not(:disabled) { background: #1d4ed8; }
        .sign-btn:disabled { background: #c7d2e8; cursor: not-allowed; }
        .back-btn {
          width: 100%;
          margin-top: 10px;
          padding: 13px;
          background: #fff;
          color: #374151;
          border: 1px solid #e8eaf0;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }
        .back-btn:hover { background: #f9fafb; }
        .error-box {
          margin-top: 14px;
          padding: 12px 16px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #dc2626;
        }
        .success-box {
          margin-top: 20px;
          padding: 20px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 12px;
        }
        .success-box h4 {
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 700;
          color: #15803d;
          margin: 0 0 12px;
        }
        .sig-detail {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #374151;
          margin: 4px 0;
        }
        .download-btn {
          display: inline-block;
          margin-top: 14px;
          padding: 10px 20px;
          background: #16a34a;
          color: #fff;
          border-radius: 8px;
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
        }
        .helper-card {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        }
        .helper-card h3 {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .helper-card p {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #6b7280;
          margin: 0;
          line-height: 1.5;
        }
      `}</style>

      <div className="step3-layout">
        <div className="sign-card">
          <h2>Aplikovať elektronický podpis</h2>
          <p className="subtitle">Dokument bude podpísaný pomocou aplikácie Autogram a vašej eID karty.</p>

          <div className="pades-row">
            <span className="pades-label">Profil PAdES:</span>
            <select
              className="pades-select"
              value={padesLevel}
              onChange={(e) => setPadesLevel(e.target.value)}
            >
              <option value="PAdES_BASELINE_B">PAdES-B</option>
              <option value="PAdES_BASELINE_T">PAdES-T</option>
            </select>
          </div>

          <button className="sign-btn" disabled={isSigning || !!signedPdfUrl} onClick={signDocument}>
            {isSigning ? "Podpisujem... (čakajte na Autogram)" : signedPdfUrl ? "✅ Dokument podpísaný" : "Podpísať elektronicky dokument"}
          </button>

          <button className="back-btn" onClick={onBack}>Späť</button>

          {error && <div className="error-box">⚠️ {error}</div>}

          {signatureInfo && (
            <div className="success-box">
              <h4>✅ Dokument bol úspešne podpísaný</h4>
              <div className="sig-detail"><b>Podpísal:</b> {parseSignedBy(signatureInfo.signedBy)}</div>
              <div className="sig-detail"><b>Vydavateľ:</b> {parseIssuer(signatureInfo.issuedBy)}</div>
              <div className="sig-detail"><b>Dátum:</b> {signatureInfo.signedAt}</div>
              <div className="sig-detail"><b>Profil:</b> {signatureInfo.profile}</div>
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#6b7280", cursor: "pointer" }}>
                  Detail certifikátu
                </summary>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#9aa0b0", marginTop: 4 }}>
                  {signatureInfo.signedBy}
                </div>
              </details>
              {signedPdfUrl && (
                <a href={signedPdfUrl} download="signed.pdf" className="download-btn">
                  ⬇ Stiahnuť podpísaný dokument
                </a>
              )}
            </div>
          )}
        </div>

        <div className="helper-card">
          <h3>ℹ️ Pomocník</h3>
          <p>
            Po kliknutí na tlačidlo sa otvorí aplikácia <b>Autogram</b>.
            Vložte eID kartu do čítačky a potvrďte podpis PIN kódom.
          </p>
        </div>
      </div>
    </>
  );
}
