import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { Rnd } from "react-rnd"

import SignatureCanvas from "./SignatureCanvas";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function App() {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  const [file, setFile] = useState(null);

  const [currentPdfBlob, setCurrentPdfBlob] = useState(null);
    const [currentPdfName, setCurrentPdfName] = useState("document.pdf");
    const [signedPdfUrl, setSignedPdfUrl] = useState(null);
    const [isSigning, setIsSigning] = useState(false);

  const [pdfDoc, setPdfDoc] = useState(null);

  const [pageNum, setPageNum] = useState(1); // pdf.js 1-based
  const [scale, setScale] = useState(1.5);

  // rectangle v UI pixeloch (origin hore-vľavo)
  const [rect, setRect] = useState(null);

  const [sigText, setSigText] = useState("Meno Priezvisko");

  const [preparedUrl, setPreparedUrl] = useState(null);
  const [isRendering, setIsRendering] = useState(false);

  // obrazok/sken podpisu
  const [sigImage, setSigImage] = useState(null);

  const [sigType, setSigType] = useState("text"); // "text" | "image"


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

    form.append("text", sigType === "text" ? sigText : "");
    if ((sigType === "image" || sigType === "sketch") && sigImage) form.append("image", sigImage);

    const res = await fetch("http://127.0.0.1:8000/prepare-visual", {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const t = await res.text();
      alert("Chyba z backendu: " + t);
      return;
    }

    const preparedBlob = await res.blob();

    setCurrentPdfBlob(preparedBlob);
    setCurrentPdfName(`prepared_${currentPdfName}`);

    // reload PDF v preview
    await loadPdf(preparedBlob);
  }

async function signDocument() {
  if (!currentPdfBlob) {
    alert("Nie je čo podpísať.");
    return;
  }

  setIsSigning(true);

  try {
    const fileToSign = new File([currentPdfBlob], currentPdfName, {
      type: "application/pdf",
    });

    const form = new FormData();
    form.append("file", fileToSign);

    const res = await fetch("http://127.0.0.1:8000/sign", {
      method: "POST",
      body: form,
    });

    const contentType = res.headers.get("content-type") || "";

    if (!res.ok) {
      const text = await res.text();
      alert("Chyba pri podpisovaní: " + text);
      return;
    }

    if (contentType.includes("application/pdf")) {
      const signedBlob = await res.blob();
      const url = URL.createObjectURL(signedBlob);

      setSignedPdfUrl(url);

      // nastav podpísaný dokument ako aktuálny
      setCurrentPdfBlob(signedBlob);
      setCurrentPdfName(`signed_${currentPdfName}`);

      await loadPdf(signedBlob);
      return;
    }

    const data = await res.json();
    alert(data.message || "Podpisovanie zlyhalo.");
  } catch (err) {
    console.error(err);
    alert("Nepodarilo sa spojiť s backendom.");
  } finally {
    setIsSigning(false);
  }
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
          setCurrentPdfBlob(f);
            setCurrentPdfName(f.name);
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
        <select value={sigType} onChange={(e) => setSigType(e.target.value)}>
            <option value="text">Text</option>
            <option value="image">Obrázok</option>
            <option value="sketch">Kresba</option>

        </select>
        {sigType === "text" && (
            <input
                value={sigText}
                onChange={(e) => setSigText(e.target.value)}
                placeholder="Text podpisu"
                style={{ width: 200 }}
            />
        )}
        {sigType === "image" && (
            <input
                type="file"
                accept="image/*"
                onChange={(e) => setSigImage(e.target.files?.[0] ?? null)}
            />
        )}
        {sigType === "sketch" && (
            <SignatureCanvas onSave={(blob) => setSigImage(blob)} />
        )}
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
          <Rnd
            bounds="parent"
            size={{ width: rect.w, height: rect.h }}
            position={{ x: rect.x, y: rect.y }}
            onDragStop={(e, d) => {
              setRect((r) => ({ ...r, x: d.x, y: d.y }));
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
              setRect({
                x: position.x,
                y: position.y,
                w: ref.offsetWidth,
                h: ref.offsetHeight,
              });
            }}
            style={{
              border: "2px dashed red",
              background: "rgba(255,0,0,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: "bold",
            }}
          >
            {sigText}
          </Rnd>
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
