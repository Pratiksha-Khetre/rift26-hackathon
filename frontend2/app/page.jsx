// rift26-hackathon\frontend2\app\page.jsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FileUpload from "@/components/pharmaguard/FileUpload";
import DrugSelector from "@/components/pharmaguard/DrugSelector";
import VariantTable from "@/components/pharmaguard/VariantTable";
import ExplanationAccordion from "@/components/pharmaguard/ExplanationAccordion";
import { analyzeDrugs } from "@/lib/api";
import { Dna, FlaskConical, ArrowRight, Loader2 } from "lucide-react";

export default function Home() {
  const router = useRouter();

  // State
  const [sessionId, setSessionId] = useState(null); // from backend after upload
  const [sampleId, setSampleId] = useState(null); // patient ID from VCF
  const [uploadResult, setUploadResult] = useState(null); // full upload response
  const [selectedDrugs, setSelectedDrugs] = useState([]); // selected drug IDs
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // Called when FileUpload finishes — receives (file, backendResult)
  function handleFileAccepted(file, result) {
    setSessionId(result.session_id);
    setSampleId(result.sample_id);
    setUploadResult(result);
    setError(null);
  }

  // Called when user clicks Analyze
  async function handleAnalyze() {
    if (!sessionId) {
      setError("Please upload a VCF file first.");
      return;
    }
    if (selectedDrugs.length === 0) {
      setError("Please select at least one drug.");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Drug IDs in DrugSelector are lowercase (e.g. "codeine")
      // Backend expects uppercase (e.g. "CODEINE")
      const drugsUppercase = selectedDrugs.map((d) => d.toUpperCase());

      const data = await analyzeDrugs(sessionId, drugsUppercase, sampleId);

      // Normalize to always be an array of analyses
      let analyses = [];
      if (data.analyses) {
        analyses = data.analyses; // multiple drugs response
      } else {
        analyses = [data]; // single drug response
      }

      // Save to sessionStorage so results page can read it
      sessionStorage.setItem("pharmaguard_results", JSON.stringify(analyses));
      sessionStorage.setItem("pharmaguard_patient", sampleId || "PATIENT");

      // Navigate to results page
      router.push("/results");
    } catch (err) {
      setError(err.message || "Analysis failed. Is the backend running?");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Dna className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">PharmaGuard</h1>
            <p className="text-xs text-muted-foreground">
              Pharmacogenomic Risk Prediction
            </p>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* ── Step 1: Upload VCF ── */}
        <section className="rounded-xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
              1
            </span>
            <h2 className="text-base font-semibold text-foreground">
              Upload Patient VCF File
            </h2>
          </div>
          <FileUpload onFileAccepted={handleFileAccepted} />

          {/* Show upload summary after successful upload */}
          {uploadResult && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-semibold">Upload Successful ✅</p>
              <p>
                Sample ID:{" "}
                <span className="font-mono">{uploadResult.sample_id}</span>
              </p>
              <p>
                PGx variants found:{" "}
                <strong>{uploadResult.pgx_variants_found}</strong>
              </p>
              <p>
                Genes:{" "}
                {Object.entries(uploadResult.genes_with_variants)
                  .map(([gene, count]) => `${gene} (${count})`)
                  .join(", ")}
              </p>
            </div>
          )}
        </section>

        {/* ── Step 2: Select Drugs (only shown after upload) ── */}
        {sessionId && (
          <section className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 mb-6">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                2
              </span>
              <h2 className="text-base font-semibold text-foreground">
                Select Medications to Analyze
              </h2>
            </div>
            <DrugSelector
              onDrugSelect={setSelectedDrugs}
              selectedDrugs={selectedDrugs}
            />
          </section>
        )}

        {/* ── Error Message ── */}
        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            ⚠️ {error}
          </div>
        )}

        {/* ── Analyze Button (only shown after upload) ── */}
        {sessionId && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing || selectedDrugs.length === 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyzing {selectedDrugs.length} drug(s)...
              </>
            ) : (
              <>
                <FlaskConical className="h-4 w-4" />
                Analyze{" "}
                {selectedDrugs.length > 0
                  ? `${selectedDrugs.length} Drug(s)`
                  : "Drugs"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        )}

        {/* ── Variant Table (always shown as reference) ── */}
        <section className="rounded-xl border border-border bg-card p-6">
          <VariantTable />
        </section>

        {/* ── Explanation Accordion ── */}
        <section className="rounded-xl border border-border bg-card p-6">
          <ExplanationAccordion />
        </section>
      </div>
    </main>
  );
}
