import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { Rnd } from "react-rnd";
import SignatureCanvas from "./SignatureCanvas";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function Step2Visual({ file, pdfDoc, setPdfDoc, currentPdfBlob, setCurrentPdfBlob, currentPdfName, setCurrentPdfName, onNext, onBack }) {
  const canvasRef = useRef(null);

  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [isRendering, setIsRendering] = useState(false);

  const [rects, setRects] = useState([]);
  const [sigType, setSigType] = useState("sketch");
  const [sigText, setSigText] = useState("Meno Priezvisko");
  const [sigImage, setSigImage] = useState(null);
  const [autoLastPage, setAutoLastPage] = useState(false);

  const [isPreparing, setIsPreparing] = useState(false);
  const [preparedOk, setPreparedOk] = useState(false);

  async function renderPage() {
    if (!pdfDoc) return;
    setIsRendering(true);
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    setIsRendering(false);
  }

  useEffect(() => { renderPage().catch(console.error); }, [pdfDoc, pageNum, scale]);

  function onCanvasClick(e) {
    if (!pdfDoc || isPreparing) return;
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const defaultW = 200;
    const defaultH = 80;
    setRects(prev => [...prev, {
      x, y,
      w: Math.min(defaultW, canvas.width - x),
      h: Math.min(defaultH, canvas.height - y),
      page: pageNum
    }]);
  }

  async function prepareVisual() {
    if (!currentPdfBlob || rects.length === 0) {
      alert("Kliknite do dokumentu kde chcete umiestniť podpis.");
      return;
    }
    setIsPreparing(true);

    try {
      const form = new FormData();
      form.append("file", new File([currentPdfBlob], currentPdfName, { type: "application/pdf" }));

      let targetRects = [...rects];
      if (autoLastPage && pdfDoc) {
        const lastPage = pdfDoc.numPages;
        const page = await pdfDoc.getPage(lastPage);
        const vp = page.getViewport({ scale });
        targetRects = [...rects, {
          x: vp.width - 220, y: vp.height - 100,
          w: 200, h: 80, page: lastPage
        }];
      }

      const signatures = await Promise.all(targetRects.map(async (r) => {
        const page = await pdfDoc.getPage(r.page);
        const viewport = page.getViewport({ scale });
        return {
          page: r.page - 1,
          x: r.x / scale,
          y: (viewport.height - (r.y + r.h)) / scale,
          w: r.w / scale,
          h: r.h / scale,
        };
      }));

      form.append("signatures", JSON.stringify(signatures));
      form.append("text", sigType === "text" ? sigText : "");
      if ((sigType === "image" || sigType === "sketch") && sigImage) {
        form.append("image", sigImage);
      }

      const res = await fetch("http://127.0.0.1:8000/prepare-visual-multi", {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        alert("Chyba: " + await res.text());
        return;
      }

      const blob = await res.blob();
      setCurrentPdfBlob(blob);
      setCurrentPdfName(`prepared_${currentPdfName}`);
      setRects([]);
      setPreparedOk(true);

      // reload preview
      const data = await blob.arrayBuffer();
      const newPdf = await pdfjsLib.getDocument({ data }).promise;
      setPdfDoc(newPdf);
      setPageNum(1);
    } finally {
      setIsPreparing(false);
    }
  }

  const sigTypeBtn = (val, label) => (
    <button
      onClick={() => setSigType(val)}
      style={{
        flex: 1, padding: "10px 0", border: "1px solid",
        borderColor: sigType === val ? "#2563eb" : "#e8eaf0",
        borderRadius: 8, background: sigType === val ? "#eff6ff" : "#fff",
        color: sigType === val ? "#2563eb" : "#374151",
        fontFamily: "'DM Sans', sans-serif", fontSize: 13,
        fontWeight: sigType === val ? 700 : 500,
        cursor: "pointer", transition: "all 0.15s"
      }}
    >{label}</button>
  );

  return (
    <>
      <style>{`
        .step2-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 20px;
          max-width: 1100px;
          margin: 28px auto;
          padding: 0 20px;
          align-items: start;
        }
        .preview-card {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
          overflow: hidden;
        }
        .preview-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-bottom: 1px solid #e8eaf0;
        }
        .preview-toolbar-left {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #374151;
        }
        .icon-btn {
          width: 30px; height: 30px;
          border: 1px solid #e8eaf0;
          border-radius: 6px;
          background: #fff;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
          transition: background 0.15s;
        }
        .icon-btn:hover:not(:disabled) { background: #f3f4f6; }
        .icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .canvas-wrap {
          padding: 16px;
          display: flex;
          justify-content: center;
          background: #f3f4f6;
          overflow: auto;
          max-height: 70vh;
        }
        .canvas-inner {
          position: relative;
          display: inline-block;
        }
        .preview-hint {
          text-align: center;
          padding: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: #9aa0b0;
          border-top: 1px solid #e8eaf0;
        }
        .panel-card {
          background: #fff;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
        }
        .panel-card h3 {
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 16px;
        }
        .panel-label {
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 16px 0 8px;
        }
        .type-row {
          display: flex;
          gap: 8px;
        }
        .sig-input {
          width: 100%;
          padding: 9px 12px;
          border: 1px solid #e8eaf0;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
        }
        .sig-input:focus { border-color: #2563eb; }
        .select-input {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #e8eaf0;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          background: #fff;
        }
        .checkbox-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #374151;
          cursor: pointer;
          margin-top: 8px;
        }
        .info-banner {
          margin-top: 16px;
          padding: 10px 14px;
          background: #eff6ff;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: #2563eb;
          display: flex;
          gap: 8px;
          align-items: flex-start;
        }
        .btn-primary {
          width: 100%;
          margin-top: 14px;
          padding: 13px;
          background: #2563eb;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        }
        .btn-primary:hover:not(:disabled) { background: #1d4ed8; }
        .btn-primary:disabled { background: #c7d2e8; cursor: not-allowed; }
        .btn-secondary {
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
          transition: background 0.2s;
        }
        .btn-secondary:hover:not(:disabled) { background: #f9fafb; }
        .btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
        .success-banner {
          margin-top: 10px;
          padding: 10px 14px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          color: #16a34a;
        }
      `}</style>

      <div className="step2-layout">
        {/* Ľavá časť – náhľad PDF */}
        <div className="preview-card">
          <div className="preview-toolbar">
            <div className="preview-toolbar-left">
              <button className="icon-btn" onClick={() => setScale(s => Math.max(0.5, +(s - 0.25).toFixed(2)))}>−</button>
              <span>{Math.round(scale * 100)}%</span>
              <button className="icon-btn" onClick={() => setScale(s => Math.min(3, +(s + 0.25).toFixed(2)))}>+</button>
            </div>
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#374151" }}>
              Strana {pageNum} / {pdfDoc?.numPages ?? "-"}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="icon-btn" disabled={!pdfDoc || pageNum <= 1 || isRendering} onClick={() => setPageNum(p => p - 1)}>‹</button>
              <button className="icon-btn" disabled={!pdfDoc || pageNum >= (pdfDoc?.numPages ?? 1) || isRendering} onClick={() => setPageNum(p => p + 1)}>›</button>
            </div>
          </div>

          <div className="canvas-wrap">
            <div className="canvas-inner">
              <canvas
                ref={canvasRef}
                onClick={onCanvasClick}
                style={{ display: "block", cursor: "crosshair" }}
              />
              {rects.filter(r => r.page === pageNum).map((r, i) => (
                <Rnd
                  key={i}
                  bounds="parent"
                  size={{ width: r.w, height: r.h }}
                  position={{ x: r.x, y: r.y }}
                  onDragStop={(e, d) => setRects(prev => prev.map((item, idx) => idx === i ? { ...item, x: d.x, y: d.y } : item))}
                  onResizeStop={(e, dir, ref, delta, pos) => setRects(prev => prev.map((item, idx) => idx === i ? { ...item, x: pos.x, y: pos.y, w: ref.offsetWidth, h: ref.offsetHeight } : item))}
                  style={{
                    border: "2px dashed #2563eb",
                    background: "rgba(37,99,235,0.08)",
                    borderRadius: 6,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontFamily: "'DM Sans', sans-serif",
                    color: "#2563eb", fontWeight: 600,
                  }}
                >
                  ✍ Podpis
                  <span
                    onClick={(e) => { e.stopPropagation(); setRects(prev => prev.filter((_, idx) => idx !== i)); }}
                    style={{ position: "absolute", top: 2, right: 6, cursor: "pointer", fontSize: 14, color: "#ef4444" }}
                  >✕</span>
                </Rnd>
              ))}
            </div>
          </div>

          <div className="preview-hint">
            {rects.length > 0
              ? `${rects.length} ${rects.length === 1 ? "podpis umiestnený" : "podpisy umiestnené"} – ťahajte pre presúvanie`
              : "Kliknite do dokumentu kde chcete umiestniť podpis"}
          </div>
        </div>

        {/* Pravý panel */}
        <div className="panel-card">
          <h3>Vizuálny podpis</h3>

          <div className="type-row">
            {sigTypeBtn("sketch", "✍ Napísať")}
            {sigTypeBtn("image", "⬆ Nahrať")}
            {sigTypeBtn("text", "T Text")}
          </div>

          <div style={{ marginTop: 14 }}>
            {sigType === "sketch" && (
              <SignatureCanvas onSave={(blob) => setSigImage(blob)} />
            )}
            {sigType === "image" && (
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSigImage(e.target.files?.[0] ?? null)}
                style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13 }}
              />
            )}
            {sigType === "text" && (
              <input
                className="sig-input"
                value={sigText}
                onChange={(e) => setSigText(e.target.value)}
                placeholder="Meno Priezvisko"
              />
            )}
          </div>

          <div className="panel-label">Umiestnenie</div>
          <div style={{ fontSize: 12, fontFamily: "'DM Sans', sans-serif", color: "#6b7280", marginBottom: 6 }}>Strana</div>
          <select
            className="select-input"
            value={pageNum}
            onChange={(e) => setPageNum(Number(e.target.value))}
          >
            {pdfDoc && Array.from({ length: pdfDoc.numPages }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={autoLastPage}
              onChange={(e) => setAutoLastPage(e.target.checked)}
            />
            Automaticky na poslednú stranu
          </label>

          <div className="info-banner">
            ℹ️ Vizuálny podpis sa vloží pred elektronickým podpisom (PAdES).
          </div>

          <button
            className="btn-primary"
            disabled={isPreparing || rects.length === 0}
            onClick={prepareVisual}
          >
            {isPreparing ? "Vkladám..." : "Vložiť vizuálny podpis"}
          </button>

          {preparedOk && (
            <div className="success-banner">✅ Vizuálny podpis bol vložený</div>
          )}

          <button
            className="btn-secondary"
            disabled={!preparedOk}
            onClick={onNext}
          >
            Pokračovať na elektronický podpis
          </button>
          <button className="btn-secondary" onClick={onBack}>
            Späť
          </button>
        </div>
      </div>
    </>
  );
}
