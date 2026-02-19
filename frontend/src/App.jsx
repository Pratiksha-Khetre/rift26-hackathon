import { useState } from "react";
import { uploadVCF, analyzeDrug } from "./api";

function App() {
  // ── State ──────────────────────────────────────────────
  const [file, setFile] = useState(null);
  const [drug, setDrug] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");

  const DRUGS = [
    "CODEINE",
    "WARFARIN",
    "CLOPIDOGREL",
    "SIMVASTATIN",
    "AZATHIOPRINE",
    "FLUOROURACIL",
    "TRAMADOL",
    "CITALOPRAM",
  ];

  // ── STEP 1: Handle file upload ──────────────────────────
  async function handleUpload(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError("");

    try {
      setUploadMsg("Uploading...");
      const data = await uploadVCF(selectedFile);
      setSessionId(data.session_id);
      setUploadMsg(
        `✅ Uploaded! Found ${data.pgx_variants_found} PGx variants`,
      );
    } catch (err) {
      setError("Upload failed: " + err.message);
      setUploadMsg("");
    }
  }

  // ── STEP 2: Handle analysis ─────────────────────────────
  async function handleAnalyze() {
    if (!sessionId) {
      setError("Please upload a VCF file first");
      return;
    }
    if (!drug) {
      setError("Please select a drug");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const data = await analyzeDrug(sessionId, drug);
      setResult(data);
    } catch (err) {
      setError("Analysis failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Risk color helper ───────────────────────────────────
  function riskColor(label) {
    const colors = {
      Safe: "green",
      "Adjust Dosage": "orange",
      Toxic: "red",
      Ineffective: "red",
      Unknown: "gray",
    };
    return colors[label] || "gray";
  }

  // ── UI ──────────────────────────────────────────────────
  return (
    <div
      style={{
        maxWidth: 800,
        margin: "0 auto",
        padding: 24,
        fontFamily: "sans-serif",
      }}
    >
      <h1>🧬 PharmaGuard</h1>
      <p style={{ color: "gray" }}>Pharmacogenomic Risk Prediction</p>

      {/* ── Upload VCF ── */}
      <div style={{ marginTop: 24 }}>
        <h3>Step 1 — Upload VCF File</h3>
        <input
          type="file"
          accept=".vcf"
          onChange={handleUpload}
          style={{ marginTop: 8 }}
        />
        {uploadMsg && <p style={{ color: "green" }}>{uploadMsg}</p>}
      </div>

      {/* ── Select Drug ── */}
      <div style={{ marginTop: 24 }}>
        <h3>Step 2 — Select Drug</h3>

        {/* Quick buttons */}
        <div
          style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}
        >
          {DRUGS.map((d) => (
            <button
              key={d}
              onClick={() => setDrug(d)}
              style={{
                padding: "6px 14px",
                background: drug === d ? "#3b82f6" : "#f1f5f9",
                color: drug === d ? "white" : "black",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Text input */}
        <input
          type="text"
          placeholder="Or type drug name..."
          value={drug}
          onChange={(e) => setDrug(e.target.value.toUpperCase())}
          style={{
            marginTop: 12,
            padding: "8px 12px",
            width: "100%",
            borderRadius: 6,
            border: "1px solid #e2e8f0",
          }}
        />
      </div>

      {/* ── Analyze button ── */}
      <button
        onClick={handleAnalyze}
        disabled={loading}
        style={{
          marginTop: 24,
          padding: "12px 32px",
          background: loading ? "#94a3b8" : "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: 8,
          fontSize: 16,
          cursor: loading ? "not-allowed" : "pointer",
          width: "100%",
        }}
      >
        {loading ? "Analyzing..." : "⚡ Analyze Risk"}
      </button>

      {/* ── Error ── */}
      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "#fee2e2",
            borderRadius: 8,
            color: "#dc2626",
          }}
        >
          ⚠ {error}
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div style={{ marginTop: 32 }}>
          {/* Risk label */}
          <div
            style={{
              padding: 20,
              background: "#f8fafc",
              borderRadius: 12,
              borderLeft: `6px solid ${riskColor(result.risk_assessment.risk_label)}`,
              marginBottom: 16,
            }}
          >
            <h2
              style={{
                color: riskColor(result.risk_assessment.risk_label),
                margin: 0,
              }}
            >
              {result.risk_assessment.risk_label}
            </h2>
            <p style={{ margin: "8px 0 0", color: "gray" }}>
              Drug: <b>{result.drug}</b> &nbsp;|&nbsp; Severity:{" "}
              <b>{result.risk_assessment.severity}</b> &nbsp;|&nbsp; Confidence:{" "}
              <b>
                {Math.round(result.risk_assessment.confidence_score * 100)}%
              </b>
            </p>
          </div>

          {/* Gene profile */}
          <div
            style={{
              padding: 16,
              background: "#f8fafc",
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <h3>🧬 Gene Profile</h3>
            <p>
              <b>Gene:</b> {result.pharmacogenomic_profile.primary_gene}
            </p>
            <p>
              <b>Diplotype:</b> {result.pharmacogenomic_profile.diplotype}
            </p>
            <p>
              <b>Phenotype:</b> {result.pharmacogenomic_profile.phenotype}
            </p>
          </div>

          {/* Clinical recommendation */}
          <div
            style={{
              padding: 16,
              background: "#f8fafc",
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <h3>🏥 Recommendation</h3>
            <p>{result.clinical_recommendation.action}</p>
            {result.clinical_recommendation.alternative_drugs?.length > 0 && (
              <p>
                <b>Alternatives:</b>{" "}
                {result.clinical_recommendation.alternative_drugs.join(", ")}
              </p>
            )}
            {result.clinical_recommendation.dose_adjustment && (
              <p>
                <b>Dose:</b> {result.clinical_recommendation.dose_adjustment}
              </p>
            )}
          </div>

          {/* AI Explanation */}
          <div
            style={{
              padding: 16,
              background: "#f8fafc",
              borderRadius: 12,
              marginBottom: 16,
            }}
          >
            <h3>🤖 AI Explanation</h3>
            <p>
              <b>Summary:</b> {result.llm_generated_explanation.summary}
            </p>
            <p style={{ marginTop: 8 }}>
              <b>Mechanism:</b> {result.llm_generated_explanation.mechanism}
            </p>
            <p style={{ marginTop: 8 }}>
              <b>Guideline:</b>{" "}
              {result.llm_generated_explanation.guideline_reference}
            </p>
          </div>

          {/* Download JSON */}
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(result, null, 2)], {
                type: "application/json",
              });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `pharmaguard_${result.drug}.json`;
              a.click();
            }}
            style={{
              padding: "10px 20px",
              background: "#10b981",
              color: "white",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            ⬇ Download JSON
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
