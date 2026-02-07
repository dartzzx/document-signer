import { useState } from "react";

export default function App() {
  const [file, setFile] = useState(null);

  async function send() {
    if (!file) return alert("Vyber PDF");

    const form = new FormData();
    form.append("file", file);
    form.append("page", 0);
    form.append("x", 50);
    form.append("y", 50);
    form.append("w", 200);
    form.append("h", 80);
    form.append("text", "Test podpis");

    const res = await fetch("http://127.0.0.1:8000/prepare-visual", {
      method: "POST",
      body: form,
    });

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url);
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>PDF Visual Signing Test</h2>

      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br /><br />

      <button onClick={send}>
        Pridať vizuálny podpis
      </button>
    </div>
  );
}
