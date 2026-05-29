import { useEffect, useRef, useState, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import SignatureCanvas from "./SignatureCanvas";
import { PenLine, Upload, Type, X, Maximize2, Info, CheckCircle, ChevronDown } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const FONT_FAMILIES = {
  DejaVu: "sans-serif",
  DancingScript: "'DancingScript', cursive",
  Caveat: "'Caveat', cursive"
}

export default function Step2Visual({ file, pdfDoc, setPdfDoc, currentPdfBlob, setCurrentPdfBlob, currentPdfName, setCurrentPdfName, onNext, onBack }) {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);

  const [pageNum, setPageNum] = useState(1);
  const [scale, setScale] = useState(1.5);
  const [isRendering, setIsRendering] = useState(false);

  const [rects, setRects] = useState([]);
  const [sigType, setSigType] = useState("sketch");
  const [sigText, setSigText] = useState("Meno Priezvisko");
  const [sigFont, setSignFont] = useState("DejaVu")
  const [fontDropdownOpen, setFontDropdownOpen] = useState(false);
  const [sigImage, setSigImage] = useState(null);
  const [autoLastPage, setAutoLastPage] = useState(false);

  const [isPreparing, setIsPreparing] = useState(false);
  const [preparedOk, setPreparedOk] = useState(false);

  const renderTaskRef = useRef(null);
  const dragRef = useRef(null);

  async function renderPage() {
    if (!pdfDoc) return;
    if (renderTaskRef.current) {
      try { renderTaskRef.current.cancel(); } catch {}
      renderTaskRef.current = null;
    }
    setIsRendering(true);
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const task = page.render({ canvasContext: ctx, viewport });
    renderTaskRef.current = task;
    try {
      await task.promise;
    } catch (e) {
      if (e?.name !== "RenderingCancelledException") console.error(e);
    }
    setIsRendering(false);
  }

  useEffect(() => { renderPage().catch(console.error); }, [pdfDoc, pageNum, scale]);

  function mouseToPdf(e) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) / scale,
      y: (e.clientY - r.top) / scale,
    };
  }

  function onCanvasClick(e) {
    if (!pdfDoc || isPreparing) return;
    if (dragRef.current) return;

    const { x, y } = mouseToPdf(e);
    const pdfW = 180;
    const pdfH = 70;

    // vypocet max sirky
    const canvas = canvasRef.current;
    const canvasPdfW = canvas ? canvas.width / scale : 9999;
    const canvasPdfH = canvas ? canvas.height / scale : 9999;

    // zaciatocne suradnice boxu
    let newX = x - pdfW / 2;
    let newY = y - pdfH / 2;

    // osetrene pretecenie k rohom dokumentu
    newX = Math.max(0, Math.min(newX, canvasPdfW - pdfW));
    newY = Math.max(0, Math.min(newY, canvasPdfH - pdfH));

    setRects(prev => [...prev, {
      pdfX: newX,
      pdfY: newY,
      pdfW,
      pdfH,
      page: pageNum,
    }]);
  }

  function startDrag(e, index) {
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = mouseToPdf(e);
    const rect = rects[index];
    dragRef.current = {
      index,
      startMousePdfX: x,
      startMousePdfY: y,
      startRectPdfX: rect.pdfX,
      startRectPdfY: rect.pdfY,
    };
  }

  const onMouseMove = useCallback((e) => {
    if (!dragRef.current) return;
    e.preventDefault();
    const { index, startMousePdfX, startMousePdfY, startRectPdfX, startRectPdfY } = dragRef.current;
    const { x, y } = mouseToPdf(e);
    const dx = x - startMousePdfX;
    const dy = y - startMousePdfY;
    const canvas = canvasRef.current;
    let canvasPdfW = 9999, canvasPdfH = 9999;
    if (canvas) {
      canvasPdfW = canvas.width / scale;
      canvasPdfH = canvas.height / scale;
    }
    setRects(prev => prev.map((r, i) => {
      if (i !== index) return r;
      const newX = Math.max(0, Math.min(startRectPdfX + dx, canvasPdfW - r.pdfW));
      const newY = Math.max(0, Math.min(startRectPdfY + dy, canvasPdfH - r.pdfH));
      return { ...r, pdfX: newX, pdfY: newY };
    }));
  }, [scale]);

  const onMouseUp = useCallback(() => { dragRef.current = null; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  const resizeRef = useRef(null);

  function startResize(e, index) {
    e.preventDefault();
    e.stopPropagation();
    const rect = rects[index];
    resizeRef.current = {
      index,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPdfW: rect.pdfW,
      startPdfH: rect.pdfH,
    };
  }

  const onResizeMove = useCallback((e) => {
    if (!resizeRef.current) return;
    e.preventDefault();
    const { index, startMouseX, startMouseY, startPdfW, startPdfH } = resizeRef.current;
    const dx = (e.clientX - startMouseX) / scale;
    const dy = (e.clientY - startMouseY) / scale;
    setRects(prev => prev.map((r, i) => {
      if (i !== index) return r;
      return { ...r, pdfW: Math.max(60, startPdfW + dx), pdfH: Math.max(30, startPdfH + dy) };
    }));
  }, [scale]);

  const onResizeUp = useCallback(() => { resizeRef.current = null; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onResizeMove);
    window.addEventListener("mouseup", onResizeUp);
    return () => {
      window.removeEventListener("mousemove", onResizeMove);
      window.removeEventListener("mouseup", onResizeUp);
    };
  }, [onResizeMove, onResizeUp]);

  async function prepareVisual() {
    if (!currentPdfBlob || (rects.length === 0 && !autoLastPage)) {
      alert("Kliknite do dokumentu kde chcete umiestniť podpis, alebo zaškrtnite automaticky na poslednú stranu.");
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
        const vp = page.getViewport({ scale: 1 });
        targetRects = [...targetRects, {
          pdfX: vp.width - 220,
          pdfY: vp.height - 100,
          pdfW: 200,
          pdfH: 80,
          page: lastPage,
        }];
      }
      if (targetRects.length === 0) {
        alert("Kliknite do dokumentu kde chcete umiestniť podpis, alebo zaškrtnite automaticky na poslednú stranu.");
        return;
      }
      const signatures = await Promise.all(targetRects.map(async (r) => {
        const page = await pdfDoc.getPage(r.page);
        const viewport = page.getViewport({ scale: 1 });
        return {
          page: r.page - 1,
          x: r.pdfX,
          y: (viewport.height - (r.pdfY + r.pdfH)),
          w: r.pdfW,
          h: r.pdfH,
        };
      }));
      form.append("signatures", JSON.stringify(signatures));
      form.append("text", sigType === "text" ? sigText : "");
      form.append("font_name", sigFont);
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
      const data = await blob.arrayBuffer();
      const newPdf = await pdfjsLib.getDocument({ data }).promise;
      setPdfDoc(newPdf);
    } finally {
      setIsPreparing(false);
    }
  }

  const sigTypeBtn = (val, icon, label) => (
    <button
      onClick={() => setSigType(val)}
      style={{
        flex: 1, padding: "10px 0", border: "1px solid",
        borderColor: sigType === val ? "#2563eb" : "#e8eaf0",
        borderRadius: 8, background: sigType === val ? "#eff6ff" : "#fff",
        color: sigType === val ? "#2563eb" : "#374151",
        fontFamily: "'DM Sans', sans-serif", fontSize: 13,
        fontWeight: sigType === val ? 700 : 500,
        cursor: "pointer", transition: "all 0.15s",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
      }}
    >
      {icon}{label}
    </button>
  );

  return (
    <>
      <style>{`
        canvas {
          cursor: crosshair !important;
        }
        .step2-layout {
          display: grid;
          grid-template-columns: 1fr 300px;
          gap: 0;
          height: calc(100vh - 56px - 80px);
          overflow: hidden;
        }
        .preview-card {
          background: #fff;
          border-right: 1px solid #e8eaf0;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .preview-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          border-bottom: 1px solid #e8eaf0;
          flex-shrink: 0;
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
          color: #374151;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
          transition: background 0.15s;
        }
        .icon-btn:hover:not(:disabled) { background: #f3f4f6; }
        .icon-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .canvas-scroll {
          overflow: auto;
          flex: 1;
          background: #f3f4f6;
          padding: 16px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
        }
        .canvas-inner {
          position: relative;
          display: inline-block;
        }
        .sig-rect {
          position: absolute;
          border: 2px dashed #2563eb;
          background: rgba(37,99,235,0.08);
          border-radius: 6px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: #2563eb;
          font-weight: 600;
          cursor: grab;
          user-select: none;
          gap: 5px;
        }
        .sig-rect:active { cursor: grabbing; }
        .sig-rect-label {
          pointer-events: none;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .sig-rect-delete {
          position: absolute;
          top: 4px; right: 6px;
          cursor: pointer;
          color: #ef4444;
          line-height: 1;
          display: flex;
          align-items: center;
        }
        .sig-rect-resize {
          position: absolute;
          bottom: 2px; right: 2px;
          cursor: se-resize;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #2563eb;
        }
        .preview-hint {
          text-align: center;
          padding: 10px;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          color: #9aa0b0;
          border-top: 1px solid #e8eaf0;
          flex-shrink: 0;
        }
        .panel-card {
          background: #fff;
          padding: 24px;
          overflow-y: auto;
          height: 100%;
          box-sizing: border-box;
          border-left: 1px solid #e8eaf0;
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
        .type-row { display: flex; gap: 8px; }
        .sig-input {
          width: 100%;
          padding: 9px 12px;
          border: 1px solid #e8eaf0;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 14px;
          outline: none;
          box-sizing: border-box;
          background: #fff;
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
          display: flex;
          align-items: center;
          gap: 8px;
        }
      `}</style>

      <div className="step2-layout">
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

          <div className="canvas-scroll">
            <div className="canvas-inner" ref={overlayRef}>
              <canvas
                ref={canvasRef}
                onClick={onCanvasClick}
                style={{ display: "block", cursor: "crosshair" }}
              />
              {rects.map((r, globalIndex) => {
                if (r.page !== pageNum) return null;
                return (
                  <div
                    key={globalIndex}
                    className="sig-rect"
                    style={{
                      left: r.pdfX * scale,
                      top: r.pdfY * scale,
                      width: r.pdfW * scale,
                      height: r.pdfH * scale,
                    }}
                    onMouseDown={(e) => startDrag(e, globalIndex)}
                  >
                    <span className="sig-rect-label">
                      <PenLine size={13} /> Podpis
                    </span>
                    <span
                      className="sig-rect-delete"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRects(prev => prev.filter((_, idx) => idx !== globalIndex));
                      }}
                    >
                      <X size={14} />
                    </span>
                    <span
                      className="sig-rect-resize"
                      onMouseDown={(e) => startResize(e, globalIndex)}
                    >
                      <Maximize2 size={12} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="preview-hint">
            {rects.length > 0
              ? `${rects.length} ${rects.length === 1 ? "podpis umiestnený" : "podpisy umiestnené"} – ťahajte pre presúvanie`
              : "Kliknite do dokumentu kde chcete umiestniť podpis"}
          </div>
        </div>

        <div className="panel-card">
          <h3>Vizuálny podpis</h3>

          <div className="type-row">
            {sigTypeBtn("sketch", <PenLine size={14} />, "Napísať")}
            {sigTypeBtn("image", <Upload size={14} />, "Nahrať")}
            {sigTypeBtn("text", <Type size={14} />, "Text")}
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
              <>
                <input
                  className="sig-input"
                  value={sigText}
                  onChange={(e) => setSigText(e.target.value)}
                  placeholder="Meno Priezvisko"
                />
                <div style={{ position: "relative", marginTop: 8 }}>
                  <div
                    onClick={() => setFontDropdownOpen(o => !o)}
                    style={{
                      padding: "9px 12px",
                      border: "1px solid #e8eaf0",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontFamily: FONT_FAMILIES[sigFont],
                      fontSize: 14,
                      background: "#fff",
                      userSelect: "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      color: "#374151",
                    }}
                  >
                    {sigFont === "DejaVu" ? "DejaVu Sans" : sigFont === "DancingScript" ? "Dancing Script" : "Caveat"}
                    <ChevronDown size={14} />
                  </div>
                  {fontDropdownOpen && (
                    <div style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0, right: 0,
                      background: "#fff",
                      border: "1px solid #e8eaf0",
                      borderRadius: 8,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      zIndex: 100,
                      overflow: "hidden",
                    }}>
                      {[
                        { value: "DejaVu", label: "DejaVu Sans" },
                        { value: "DancingScript", label: "Dancing Script" },
                        { value: "Caveat", label: "Caveat" },
                      ].map(f => (
                        <div
                          key={f.value}
                          onClick={() => { setSignFont(f.value); setFontDropdownOpen(false); }}
                          style={{
                            padding: "10px 14px",
                            fontFamily: FONT_FAMILIES[f.value],
                            fontSize: 15,
                            cursor: "pointer",
                            background: sigFont === f.value ? "#eff6ff" : "#fff",
                            color: sigFont === f.value ? "#2563eb" : "#374151",
                          }}
                        >
                          {f.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
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
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            Vizuálny podpis sa vloží pred elektronickým podpisom (PAdES).
          </div>

          <button
            className="btn-primary"
            disabled={isPreparing || (rects.length === 0 && !autoLastPage)}
            onClick={prepareVisual}
          >
            {isPreparing ? "Vkladám..." : "Vložiť vizuálny podpis"}
          </button>

          {preparedOk && (
            <div className="success-banner">
              <CheckCircle size={15} /> Vizuálny podpis bol vložený
            </div>
          )}

          <button className="btn-secondary" onClick={onNext}>
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