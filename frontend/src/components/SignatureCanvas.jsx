import { useRef, useState } from "react";

export default function SignatureCanvas({ onSave }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);

  function getPos(e, canvas) {
    const r = canvas.getBoundingClientRect();
    const scaleX = canvas.width / r.width;
    const scaleY = canvas.height / r.height;
    return {
      x: (e.clientX - r.left) * scaleX,
      y: (e.clientY - r.top) * scaleY,
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
        style={{
          border: "1px solid #d1d5e0",
          background: "white",
          cursor: "crosshair",
          width: "100%",
          height: "120px",
          borderRadius: 8,
          display: "block",
        }}
      />
      <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
        <button onClick={clear} style={{
          flex: 1, padding: "7px 0", border: "1px solid #d1d5e0",
          borderRadius: 8, background: "#fff", cursor: "pointer",
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#374151"
        }}>
          Vymazať
        </button>
        <button onClick={save} style={{
          flex: 1, padding: "7px 0", border: "none",
          borderRadius: 8, background: "#2563eb",
          cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
          fontSize: 13, color: "#fff", fontWeight: 600
        }}>
          Použiť podpis
        </button>
      </div>
    </div>
  );
}