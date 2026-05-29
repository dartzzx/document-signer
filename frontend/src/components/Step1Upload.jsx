import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertTriangle, Info } from "lucide-react";

export default function Step1Upload({ onFileLoaded }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState(null);
  const [showTips, setShowTips] = useState(false);
  const inputRef = useRef(null);

  function handleFile(f) {
    setError(null);
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Súbor musí byť vo formáte PDF.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("Súbor je príliš veľký (max 10 MB).");
      return;
    }
    setFileName(f.name);
    onFileLoaded(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    handleFile(f);
  }

  return (
    <>
      <style>{`
        .upload-page {
          position: relative;
          padding: 40px 160px;
          min-height: calc(100vh - 56px - 80px);
          display: flex;
          flex-direction: column;
        }
        .upload-card {
          background: #fff;
          border-radius: 16px;
          padding: 48px 52px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
          flex: 1;
          display: flex;
          flex-direction: column;
        }
        .upload-card h2 {
          font-family: 'DM Sans', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 28px;
        }
        .dropzone {
          border: 2px dashed #c7d2e8;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
            background: #f8faff;
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
             justify-content: center;
             min-height: 200px;
        }
        .dropzone:hover, .dropzone.drag {
          border-color: #2563eb;
          background: #eff6ff;
        }
        .dropzone-icon {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
          color: #94a3b8;
        }
        .dropzone h3 {
          font-family: 'DM Sans', sans-serif;
          font-size: 20px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 8px;
        }
        .dropzone p {
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          color: #9aa0b0;
          margin: 0;
        }
        .dropzone-meta {
          margin-top: 16px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: #b0b8cc;
        }
        .file-loaded {
          margin-top: 14px;
          padding: 10px 14px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #16a34a;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .error-msg {
          margin-top: 14px;
          padding: 10px 14px;
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
        .btn-primary {
          width: 100%;
          margin-top: 24px;
          padding: 15px;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-primary:hover:not(:disabled) { background: #1d4ed8; }
        .btn-primary:disabled {
          background: #c7d2e8;
          cursor: not-allowed;
        }

        .tips-trigger {
          position: fixed;
          right: 0;
          top: 50%;
          transform: translateY(-50%);
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 14px 0 0 14px;
          padding: 18px 14px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          z-index: 200;
          box-shadow: -4px 0 16px rgba(37,99,235,0.2);
          transition: background 0.15s, padding 0.15s;
        }
        .tips-trigger:hover { background: #1d4ed8; }
        .tips-trigger-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          writing-mode: vertical-rl;
          text-orientation: mixed;
          transform: rotate(180deg);
          letter-spacing: 0.06em;
        }

        .tips-popup {
          position: fixed;
          right: 60px;
          top: 50%;
          transform: translateY(-50%) translateX(12px);
          background: #fff;
          border-radius: 16px;
          padding: 28px 28px;
          box-shadow: 0 8px 40px rgba(0,0,0,0.14);
          width: 300px;
          z-index: 199;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .tips-popup.visible {
          opacity: 1;
          pointer-events: auto;
          transform: translateY(-50%) translateX(0);
        }
        .tips-popup h3 {
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 16px;
        }
        .tips-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .tips-list li {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #4b5563;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          line-height: 1.5;
        }
        .tips-list li::before {
          content: "•";
          color: #2563eb;
          font-weight: 700;
          flex-shrink: 0;
        }
      `}</style>

      <div className="upload-page">
        <div className="upload-card">
          <h2>Nahraj svoj dokument</h2>

          <div
            className={`dropzone ${dragging ? "drag" : ""}`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
          >
            <div className="dropzone-icon">
              <Upload size={56} strokeWidth={1.2} />
            </div>
            <h3>Vložiť súbor sem</h3>
            <p>alebo kliknite pre výber zo zariadenia</p>
            <div className="dropzone-meta">Podporovaný formát: PDF · max 10 MB</div>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            style={{ display: "none" }}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {fileName && (
            <div className="file-loaded">
              <CheckCircle size={16} /> {fileName}
            </div>
          )}
          {error && (
            <div className="error-msg">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <button
            className="btn-primary"
            disabled={!fileName}
            onClick={() => {}}
          >
            Pokračovať na vizuálny podpis
          </button>
        </div>

        <div
          className="tips-trigger"
          onMouseEnter={() => setShowTips(true)}
          onMouseLeave={() => setShowTips(false)}
        >
          <Info size={20} />
          <span className="tips-trigger-label">Tipy</span>
        </div>

        <div
          className={`tips-popup ${showTips ? "visible" : ""}`}
          onMouseEnter={() => setShowTips(true)}
          onMouseLeave={() => setShowTips(false)}
        >
          <h3>Tipy</h3>
          <ul className="tips-list">
            <li>Dokument musí byť PDF</li>
            <li>Viac strán je podporovaných</li>
            <li>Maximálna veľkosť súboru je 10 MB</li>
            <li>Dokument by mal byť nezašifrovaný</li>
          </ul>
        </div>
      </div>
    </>
  );
}