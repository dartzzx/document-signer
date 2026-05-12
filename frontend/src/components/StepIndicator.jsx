export default function StepIndicator({ currentStep }) {
  const steps = [
    { number: 1, label: "Nahrať dokument" },
    { number: 2, label: "Vizuálny podpis" },
    { number: 3, label: "Elektronický podpis" },
  ];

  return (
    <>
      <style>{`
        .stepper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          padding: 28px 0 20px;
          background: #fff;
          border-bottom: 1px solid #e8eaf0;
        }
        .step-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          position: relative;
        }
        .step-circle {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 15px;
          font-family: 'DM Sans', sans-serif;
          transition: all 0.3s ease;
          border: 2px solid #d1d5e0;
          background: #fff;
          color: #9aa0b0;
        }
        .step-circle.active {
          background: #2563eb;
          border-color: #2563eb;
          color: #fff;
          box-shadow: 0 0 0 4px rgba(37,99,235,0.15);
        }
        .step-circle.done {
          background: #16a34a;
          border-color: #16a34a;
          color: #fff;
        }
        .step-label {
          font-size: 12px;
          font-family: 'DM Sans', sans-serif;
          color: #9aa0b0;
          font-weight: 500;
          white-space: nowrap;
        }
        .step-label.active {
          color: #2563eb;
          font-weight: 600;
        }
        .step-label.done {
          color: #16a34a;
        }
        .step-line {
          width: 80px;
          height: 2px;
          background: #e8eaf0;
          margin: 0 4px;
          margin-bottom: 22px;
          transition: background 0.3s ease;
        }
        .step-line.done {
          background: #16a34a;
        }
      `}</style>
      <div className="stepper">
        {steps.map((step, i) => (
          <div key={step.number} style={{ display: "flex", alignItems: "center" }}>
            <div className="step-item">
              <div className={`step-circle ${currentStep === step.number ? "active" : currentStep > step.number ? "done" : ""}`}>
                {currentStep > step.number ? "✓" : step.number}
              </div>
              <span className={`step-label ${currentStep === step.number ? "active" : currentStep > step.number ? "done" : ""}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`step-line ${currentStep > step.number ? "done" : ""}`} />
            )}
          </div>
        ))}
      </div>
    </>
  );
}