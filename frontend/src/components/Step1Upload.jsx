import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertTriangle } from "lucide-react";

export default function Step1Upload({ onFileLoaded }) {
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [error, setError] = useState(null);
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
        .upload-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 24px;
          max-width: 900px;
          margin: 40px auto;
          padding: 0 24px;
        }
        .upload-card {
          background: #fff;
          border-radius: 16px;
          padding: 36px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        }
        .upload-card h2 {
          font-family: 'DM Sans', sans-serif;
          font-size: 22px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 24px;
        }
        .dropzone {
          border: 2px dashed #c7d2e8;
          border-radius: 12px;
          padding: 52px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #f8faff;
        }
        .dropzone:hover, .dropzone.drag {
          border-color: #2563eb;
          background: #eff6ff;
        }
        .dropzone-icon {
          display: flex;
          justify-content: center;
          margin-bottom: 12px;
          color: #94a3b8;
        }
        .dropzone h3 {
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          margin: 0 0 4px;
        }
        .dropzone p {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
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
          margin-top: 12px;
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
          margin-top: 12px;
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
        .tips-card {
          background: #fff;
          border-radius: 16px;
          padding: 28px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
          height: fit-content;
        }
        .tips-card h3 {
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
          gap: 10px;
        }
        .tips-list li {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #4b5563;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }
        .tips-list li::before {
          content: "•";
          color: #2563eb;
          font-weight: 700;
          flex-shrink: 0;
        }
        .btn-primary {
          width: 100%;
          margin-top: 24px;
          padding: 14px;
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
        .btn-primary:hover:not(:disabled) {
          background: #1d4ed8;
        }
        .btn-primary:disabled {
          background: #c7d2e8;
          cursor: not-allowed;
        }
      `}</style>

      <div className="upload-layout">
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
              <Upload size={40} strokeWidth={1.5} />
            </div>
            <h3>Vložiť súbor sem</h3>
            <p>alebo kliknite pre výber</p>
            <div className="dropzone-meta">Podporovaný formát: PDF (max 10MB)</div>
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
            onClick={() => {/* parent handles next step */}}
          >
            Pokračovať na vizuálny podpis
          </button>
        </div>

        <div className="tips-card">
          <h3>Tipy</h3>
          <ul className="tips-list">
            <li>Dokument musí byť PDF</li>
            <li>Viac strán je podporovaných</li>
            <li>Maximálna veľkosť súboru je 10MB</li>
            <li>Dokument by mal byť nezašifrovaný</li>
          </ul>
        </div>
      </div>
    </>
  );
}