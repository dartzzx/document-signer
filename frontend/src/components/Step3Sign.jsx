import { useState } from "react";
import { CheckCircle, AlertTriangle, Download, Info, RotateCcw } from "lucide-react";

function parseSignedBy(dn) {
  if (!dn) return "Neznáme";
  try { dn = decodeURIComponent(dn); } catch(e) {}
  const obj = {};
  dn.split(",").forEach(p => {
    const [k, v] = p.split("=");
    if (k && v) obj[k.trim()] = v.trim();
  });
  return `${obj.GIVENNAME || ""} ${obj.SURNAME || ""}`.trim() || obj.CN || dn;
}

function parseIssuer(dn) {
  if (!dn) return "Neznáme";
  try { dn = decodeURIComponent(dn); } catch(e) {}
  const obj = {};
  dn.split(",").forEach(p => {
    const [k, v] = p.split("=");
    if (k && v) obj[k.trim()] = v.trim();
  });
  return obj.O || obj.CN || dn;
}

export default function Step3Sign({ currentPdfBlob, currentPdfName, setCurrentPdfBlob, setCurrentPdfName, onBack, onSignSuccess, onReset }) {
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

        let rawSignedBy = res.headers.get("X-Signed-By") || "";
        let rawIssuedBy = res.headers.get("X-Issued-By") || "";
        try { rawSignedBy = decodeURIComponent(rawSignedBy); } catch(e) {}

        setSignatureInfo({
          signedBy: rawSignedBy,
          issuedBy: rawIssuedBy,
          signedAt: new Date().toLocaleString(),
          profile: padesLevel === "PAdES_BASELINE_T" ? "PAdES-T" : "PAdES-B",
        });

        if (onSignSuccess) {
          onSignSuccess();
        }

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
          max-width: 860px;
          margin: 0 auto;
          padding: 40px 24px;
          display: grid;
          grid-template-columns: 1fr 260px;
          gap: 20px;
          align-items: start;
          min-height: calc(100vh - 56px - 80px);
          box-sizing: border-box;
        }
        .sign-card {
          background: #fff;
          border-radius: 16px;
          padding: 40px;
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
          flex-direction: column;
          gap: 8px;
          margin-bottom: 24px;
        }
        .pades-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
        }
        .pades-select {
          padding: 10px 12px;
          border: 1px solid #e8eaf0;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          background: #fff;
          width: 100%;
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
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
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
          display: flex;
          align-items: center;
          gap: 8px;
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
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .sig-detail {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #374151;
          margin: 4px 0;
        }
        .download-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: #16a34a;
          color: #fff;
          border-radius: 8px;
          text-decoration: none;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          transition: background 0.15s;
        }
        .download-btn:hover { background: #15803d; }

        .reset-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          background: #fff;
          color: #374151;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .reset-action-btn:hover {
          background: #f4fvh;
          border-color: #86efac;
          color: #111827;
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
          margin: 0 0 14px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .helper-card p {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #374151;
          margin: 0 0 6px;
        }
        .helper-list {
          margin: 0 0 16px 0;
          padding-left: 20px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: #6b7280;
          line-height: 1.5;
        }
      `}</style>

      <div className="step3-layout">
        <div className="sign-card">
          <h2>Aplikovať elektronický podpis</h2>
          <p className="subtitle">Dokument bude podpísaný pomocou aplikácie Autogram a vašej eID karty.</p>

          {!signedPdfUrl && (
            <div className="pades-row">
              <span className="pades-label">Profil PAdES:</span>
              <select
                className="pades-select"
                value={padesLevel}
                onChange={(e) => setPadesLevel(e.target.value)}
              >
                <option value="PAdES_BASELINE_B">PAdES-B-B (Základný kvalifikovaný podpis)</option>
                <option value="PAdES_BASELINE_T">PAdES-B-T (Podpis s nezávislou časovou pečiatkou)</option>
              </select>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#6b7280" }}>
                Pre dlhodobú overiteľnosť dokumentu odporúčame zvoliť profil PAdES-B-T.
              </span>
            </div>
          )}

          {!signedPdfUrl && (
            <button className="sign-btn" disabled={isSigning} onClick={signDocument}>
              {isSigning ? "Podpisujem... (skontrolujte Autogram)" : "Podpísať elektronicky dokument"}
            </button>
          )}

          {!signedPdfUrl && (
            <button className="back-btn" disabled={isSigning} onClick={onBack}>Späť</button>
          )}

          {error && (
            <div className="error-box">
              <AlertTriangle size={15} /> {error}
            </div>
          )}

          {signatureInfo && (
            <div className="success-box">
              <h4><CheckCircle size={17} /> Dokument bol úspešne podpísaný</h4>
              <div className="sig-detail"><b>Podpísal:</b> {parseSignedBy(signatureInfo.signedBy)}</div>
              <div className="sig-detail"><b>Vydavateľ:</b> {parseIssuer(signatureInfo.issuedBy)}</div>
              <div className="sig-detail"><b>Dátum:</b> {signatureInfo.signedAt}</div>
              <div className="sig-detail"><b>Profil:</b> {signatureInfo.profile}</div>
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#6b7280", cursor: "pointer" }}>
                  Zobraziť technický detail certifikátu
                </summary>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#9aa0b0", marginTop: 4, wordBreak: "break-all" }}>
                  {signatureInfo.signedBy}
                </div>
              </details>

              {signedPdfUrl && (
                <div style={{ marginTop: 24, borderTop: "1px solid #bbf7d0", paddingTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <a href={signedPdfUrl} download="signed.pdf" className="download-btn">
                    <Download size={15} /> Stiahnuť podpísaný dokument
                  </a>

                  <button onClick={onReset} className="reset-action-btn">
                    <RotateCcw size={14} /> Podpísať ďalší dokument
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="helper-card">
          <h3><Info size={16} /> {signedPdfUrl ? "Čo ďalej?" : "Pomocník pre podpisovanie"}</h3>

          {signedPdfUrl ? (
            <p style={{ color: "#6b7280", lineHeight: 1.5 }}>
              Váš dokument bol úspešne podpísaný. Teraz si ho môžete stiahnuť do svojho zariadenia a odoslať prijímateľovi.
              <br /><br />
              Dokument obsahuje vložený kryptografický podpis, ktorý je možné kedykoľvek overiť.
            </p>
          ) : (
            <>
              <p><b>1. Pred kliknutím na tlačidlo:</b></p>
              <ul className="helper-list">
                <li>Vložte eID kartu do čítačky.</li>
                <li>Uistite sa, že máte na pozadí <b>spustenú aplikáciu Autogram</b>.</li>
              </ul>

              <p><b>2. Priebeh podpisovania:</b></p>
              <ul className="helper-list" style={{ marginBottom: 0 }}>
                <li>Aplikácia vás vyzve na výber certifikátu.</li>
                <li>Zadáte <b>BOK kód</b> (6 číslic).</li>
                <li>Zadáte <b>Podpisový PIN</b> (6 číslic).</li>
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );
}