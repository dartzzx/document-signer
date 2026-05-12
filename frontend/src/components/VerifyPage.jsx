import { useState, useRef } from "react";

export default function VerifyPage() {
  const [dragging, setDragging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [results, setResults] = useState(null);
  const [fileName, setFileName] = useState(null);
  const inputRef = useRef(null);

  async function verify(f) {
    if (!f || f.type !== "application/pdf") {
      alert("Nahrajte PDF súbor.");
      return;
    }
    setFileName(f.name);
    setIsVerifying(true);
    setResults(null);

    try {
      const form = new FormData();
      form.append("file", f);
      const res = await fetch("http://127.0.0.1:8000/verify", { method: "POST", body: form });
      const data = await res.json();
      setResults(data.signatures);
    } catch {
      alert("Chyba pri overovaní.");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <>
      <style>{`
        .verify-layout {
          max-width: 900px;
          margin: 36px auto;
          padding: 0 24px;
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 20px;
          align-items: start;
        }
        .verify-main h2 {
          font-family: 'DM Sans', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 6px;
        }
        .verify-main .subtitle {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #6b7280;
          margin: 0 0 22px;
        }
        .verify-dropzone {
          border: 2px dashed #c7d2e8;
          border-radius: 12px;
          padding: 48px 24px;
          text-align: center;
          cursor: pointer;
          background: #f8faff;
          transition: all 0.2s;
        }
        .verify-dropzone:hover, .verify-dropzone.drag {
          border-color: #2563eb;
          background: #eff6ff;
        }
        .verify-dropzone h3 {
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          margin: 12px 0 4px;
        }
        .verify-dropzone p {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #9aa0b0;
          margin: 0;
        }
        .sig-result {
          margin-top: 12px;
          padding: 16px 20px;
          border-radius: 10px;
          border: 1px solid;
        }
        .sig-result.valid {
          background: #f0fdf4;
          border-color: #bbf7d0;
        }
        .sig-result.invalid {
          background: #fef2f2;
          border-color: #fecaca;
        }
        .sig-result h4 {
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 700;
          margin: 0 0 8px;
        }
        .sig-result.valid h4 { color: #15803d; }
        .sig-result.invalid h4 { color: #dc2626; }
        .sig-detail {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #374151;
          margin: 3px 0;
        }
        .side-card {
          background: #fff;
          border-radius: 16px;
          padding: 22px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
          margin-bottom: 16px;
        }
        .side-card h3 {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 12px;
        }
        .check-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .check-list li {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #374151;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .check-list li::before {
          content: "✓";
          color: #16a34a;
          font-weight: 700;
        }
        .important-banner {
          background: #eff6ff;
          border-radius: 10px;
          padding: 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: #2563eb;
          line-height: 1.5;
        }
      `}</style>

      <div className="verify-layout">
        <div>
          <div className="verify-main">
            <h2>Overenie podpisu</h2>
            <p className="subtitle">Nahrajte podpísaný PDF dokument pre overenie elektronického podpisu</p>

            <div
              className={`verify-dropzone ${dragging ? "drag" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); verify(e.dataTransfer.files?.[0]); }}
            >
              <div style={{ fontSize: 36, color: "#94a3b8" }}>⬆️</div>
              <h3>Vložiť podpísaný PDF sem</h3>
              <p>alebo kliknite pre výber súboru</p>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              style={{ display: "none" }}
              onChange={(e) => verify(e.target.files?.[0])}
            />
          </div>

          {isVerifying && (
            <div style={{ marginTop: 20, textAlign: "center", fontFamily: "'DM Sans', sans-serif", color: "#6b7280" }}>
              Overujem podpisy...
            </div>
          )}

          {results && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                Výsledok overenia – {fileName}
              </div>
              {results.length === 0 && (
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#9aa0b0" }}>
                  Žiadne podpisy nenájdené.
                </div>
              )}
              {results.map((sig, i) => (
                <div key={i} className={`sig-result ${sig.valid ? "valid" : "invalid"}`}>
                  <h4>{sig.valid ? "✅ Platný podpis" : "❌ Neplatný podpis"}</h4>
                  {sig.signedBy && <div className="sig-detail"><b>Podpisovateľ:</b> {sig.signedBy}</div>}
                  {sig.issuedBy && <div className="sig-detail"><b>Vydavateľ:</b> {sig.issuedBy}</div>}
                  {sig.signedAt && <div className="sig-detail"><b>Čas:</b> {sig.signedAt}</div>}
                  {sig.certValid !== undefined && (
                    <div className="sig-detail">
                      <b>Certifikát:</b> {sig.certValid ? "✅ Dôveryhodný" : "⚠️ Nedôveryhodný"}
                    </div>
                  )}
                  {sig.error && <div className="sig-detail" style={{ color: "#dc2626" }}>Chyba: {sig.error}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="side-card">
            <h3>O overení</h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#6b7280", margin: "0 0 12px" }}>
              Overenie elektronického podpisu kontroluje:
            </p>
            <ul className="check-list">
              <li>Platnosť certifikátu</li>
              <li>Integritu dokumentu</li>
              <li>Časovú pečiatku</li>
              <li>Profil PAdES</li>
            </ul>
          </div>

          <div className="important-banner">
            ℹ️ <b>Dôležité</b><br />
            Overenie podpisu vyžaduje pripojenie na internet pre kontrolu revokácie certifikátov.
          </div>

          <div className="side-card" style={{ marginTop: 16 }}>
            <h3>Podporované formáty</h3>
            <ul className="check-list">
              <li>PAdES-BASELINE-B</li>
              <li>PAdES-BASELINE-T</li>
              <li>PAdES-BASELINE-LT</li>
              <li>PAdES-BASELINE-LTA</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
