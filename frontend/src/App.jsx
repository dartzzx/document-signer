import { useState, useRef } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function App() {
  const canvasRef = useRef(null);
  const [fileName, setFileName] = useState("");

  async function previewPDF(f) {
    const data = await f.arrayBuffer();

    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;

    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // vyčisti canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>PDF preview</h2>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setFileName(f.name);
          previewPDF(f).catch((err) => {
            console.error(err);
            alert("PDF sa nepodarilo zobraziť. Pozri konzolu (F12).");
          });
        }}
      />

      {fileName && <div style={{ marginTop: 8 }}>{fileName}</div>}

      <div style={{ marginTop: 12 }}>
        <canvas ref={canvasRef} style={{ border: "1px solid #ccc" }} />
      </div>
    </div>
  );
}
