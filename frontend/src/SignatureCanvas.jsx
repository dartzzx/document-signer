import { useRef, useState } from "react";

export default function SignatureCanvas({ onSave }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  function getPos(e, canvas) {
    const r = canvas.getBoundingClientRect();
    return {
      x: e.clientX - r.left,
      y: e.clientY - r.top,
    };
  }

  function onMouseDown(e) {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
  }

  function onMouseMove(e) {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#000";
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function onMouseUp() {
    setDrawing(false);
  }

  function clear() {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function save() {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => onSave(blob), "image/png");
  }

  return (
    <div style={{ marginTop: 10 }}>
      <canvas
        ref={canvasRef}
        width={300}
        height={120}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ border: "1px solid #888", background: "white", cursor: "crosshair" }}
      />
      <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
        <button onClick={clear}>Vymazať</button>
        <button onClick={save}>Použiť podpis</button>
      </div>
    </div>
  );
}