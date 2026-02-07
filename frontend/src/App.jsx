import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function App() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  const [file, setFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);

  const [pageNum, setPageNum] = useState(1); // pdf.js 1-based
  const [scale, setScale] = useState(1.5);

  // rectangle v UI pixeloch (origin hore-vľavo)
  const [rect, setRect] = useState(null);

  const [preparedUrl, setPreparedUrl] = useState(null);
  const [isRendering, setIsRendering] = useState(false);

  async function loadPdf(f) {
    const data = await f.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    setPdfDoc(pdf);
    setPageNum(1);
    setRect(null);
    setPreparedUrl(null);
  }

  async function renderPage() {
    if (!pdfDoc) return;
    setIsRendering(true);

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // reset + resize
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    setIsRendering(false);
  }

  useEffect(() => {
    renderPage().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDoc, pageNum, scale]);

  // klik do canvasu -> vytvor default podpisový obdĺžnik
  function onCanvasClick(e) {
    if (!pdfDoc) return;

    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();

    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    const defaultW = 200;
    const defaultH = 80;

    // nech obdĺžnik nevybehne mimo canvas
    const w = Math.min(defaultW, canvas.width - x);
    const h = Math.min(defaultH, canvas.height - y);

    setRect({ x, y, w, h });
  }

  async function prepareVisual() {
    if (!file || !pdfDoc || !rect) {
      alert("Nahraj PDF a klikni do dokumentu, kde chceš podpis.");
      return;
    }

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const pageHeightPx = viewport.height;

    // UI(px, origin hore-vľavo) -> PDF(points, origin dole-vľavo)
    const xPdf = rect.x / scale;
    const wPdf = rect.w / scale;
    const hPdf = rect.h / scale;
    const yPdf = (pageHeightPx - (rect.y + rect.h)) / scale;

    const form = new FormData();
    form.append("file", file);
    form.append("page", String(pageNum - 1)); // backend 0-based
    form.append("x", String(xPdf));
    form.append("y", String(yPdf));
    form.append("w", String(wPdf));
    form.append("h", String(hPdf));
    form.append("text", "Test podpis");

    const res = await fetch("http://127.0.0.1:8000/prepare-visual", {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const t = await res.text();
      alert("Chyba z backendu: " + t);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    setPreparedUrl(url);

    // otvor výsledok v novej karte
    window.open(url, "_blank");
  }

  return (
    <div style={{ padding: 20, color: "white" }}>
      <h2>PDF preview + výber podpisu</h2>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setFile(f);
          loadPdf(f).catch((err) => {
            console.error(err);
            alert("Nepodarilo sa načítať PDF (pozri konzolu).");
          });
        }}
      />

      <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
        <button disabled={!pdfDoc || pageNum <= 1 || isRendering} onClick={() => setPageNum((p) => p - 1)}>
          ◀ Prev
        </button>
        <div>
          Strana: <b>{pageNum}</b> / {pdfDoc?.numPages ?? "-"}
        </div>
        <button disabled={!pdfDoc || pageNum >= (pdfDoc?.numPages ?? 1) || isRendering} onClick={() => setPageNum((p) => p + 1)}>
          Next ▶
        </button>

        <div style={{ marginLeft: 12 }}>
          Zoom:{" "}
          <input
            type="number"
            step="0.1"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            style={{ width: 70 }}
          />
        </div>

        <button disabled={!pdfDoc || !rect} onClick={prepareVisual} style={{ marginLeft: 12 }}>
          Pridať vizuálny podpis
        </button>
      </div>

      <div
        ref={wrapRef}
        style={{
          marginTop: 12,
          position: "relative",
          display: "inline-block",
          border: "1px solid #444",
        }}
      >
        <canvas
          ref={canvasRef}
          onClick={onCanvasClick}
          style={{ display: "block", cursor: "crosshair" }}
        />

        {/* overlay obdĺžnik */}
        {rect && (
          <div
            style={{
              position: "absolute",
              left: rect.x,
              top: rect.y,
              width: rect.w,
              height: rect.h,
              border: "2px dashed red",
              background: "rgba(255,0,0,0.12)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {rect && (
        <div style={{ marginTop: 10, fontSize: 14, opacity: 0.9 }}>
          Vybrané: x={rect.x.toFixed(0)} y={rect.y.toFixed(0)} w={rect.w.toFixed(0)} h={rect.h.toFixed(0)}
        </div>
      )}

      {preparedUrl && (
        <div style={{ marginTop: 12 }}>
          <a href={preparedUrl} download="prepared.pdf" style={{ color: "#8fd3ff" }}>
            Stiahnuť prepared.pdf
          </a>
        </div>
      )}
    </div>
  );
}
