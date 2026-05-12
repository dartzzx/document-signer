import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

import StepIndicator from "./components/StepIndicator";
import Step1Upload from "./components/Step1Upload";
import Step2Visual from "./components/Step2Visual";
import Step3Sign from "./components/Step3Sign";
import VerifyPage from "./components/VerifyPage";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function App() {
  // "idle" | "pdf_loaded" | "visual_added" | "signed"
  const [step, setStep] = useState(1);
  const [showVerify, setShowVerify] = useState(false);

  const [file, setFile] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPdfBlob, setCurrentPdfBlob] = useState(null);
  const [currentPdfName, setCurrentPdfName] = useState("document.pdf");

  async function handleFileLoaded(f) {
    setFile(f);
    setCurrentPdfBlob(f);
    setCurrentPdfName(f.name);
    const data = await f.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    setPdfDoc(pdf);
    setStep(2);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #f3f4f6;
          min-height: 100vh;
          font-family: 'DM Sans', sans-serif;
        }

        .app-header {
          background: #fff;
          border-bottom: 1px solid #e8eaf0;
          padding: 0 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 56px;
          position: sticky;
          top: 0;
          z-index: 100;
        }

        .app-logo {
          font-family: 'DM Sans', sans-serif;
          font-size: 17px;
          font-weight: 700;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .header-nav {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-btn {
          padding: 7px 16px;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          border: 1px solid transparent;
        }

        .nav-btn.ghost {
          background: transparent;
          color: #374151;
          border-color: #e8eaf0;
        }
        .nav-btn.ghost:hover { background: #f3f4f6; }

        .nav-btn.active {
          background: #eff6ff;
          color: #2563eb;
          border-color: #bfdbfe;
        }
      `}</style>

      <div className="app-header">
        <div className="app-logo">
          ✍️ PodpisApp
        </div>
        <div className="header-nav">
          <button
            className={`nav-btn ${!showVerify ? "active" : "ghost"}`}
            onClick={() => setShowVerify(false)}
          >
            Podpísať dokument
          </button>
          <button
            className={`nav-btn ${showVerify ? "active" : "ghost"}`}
            onClick={() => setShowVerify(true)}
          >
            Overiť podpis
          </button>
        </div>
      </div>

      {showVerify ? (
        <VerifyPage />
      ) : (
        <>
          <StepIndicator currentStep={step} />

          {step === 1 && (
            <Step1Upload onFileLoaded={handleFileLoaded} />
          )}

          {step === 2 && (
            <Step2Visual
              file={file}
              pdfDoc={pdfDoc}
              setPdfDoc={setPdfDoc}
              currentPdfBlob={currentPdfBlob}
              setCurrentPdfBlob={setCurrentPdfBlob}
              currentPdfName={currentPdfName}
              setCurrentPdfName={setCurrentPdfName}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}

          {step === 3 && (
            <Step3Sign
              currentPdfBlob={currentPdfBlob}
              currentPdfName={currentPdfName}
              setCurrentPdfBlob={setCurrentPdfBlob}
              setCurrentPdfName={setCurrentPdfName}
              onBack={() => setStep(2)}
            />
          )}
        </>
      )}
    </>
  );
}