// rift26-hackathon\frontend2\app\results\page.jsx

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RiskCard from "@/components/pharmaguard/RiskCard";
import ExplanationAccordion from "@/components/pharmaguard/ExplanationAccordion";
import {
  Dna,
  ArrowLeft,
  Download,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  HelpCircle,
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Map backend risk_label → RiskCard's riskLevel string
 */
function mapRiskLevel(riskLabel) {
  const map = {
    Safe: "safe",
    "Adjust Dosage": "adjust",
    Toxic: "toxic",
    Ineffective: "toxic",
    Unknown: "safe",
  };
  return map[riskLabel] || "safe";
}

/**
 * Map confidence_score (0-1) to a 0-100 risk score for display
 * Higher confidence of "Toxic/Ineffective" = higher score
 * Higher confidence of "Safe" = lower score
 */
function mapRiskScore(analysis) {
  const label = analysis.risk_assessment.risk_label;
  const confidence = analysis.risk_assessment.confidence_score;
  if (label === "Safe") return Math.round((1 - confidence) * 30);
  if (label === "Adjust Dosage") return Math.round(40 + confidence * 30);
  if (label === "Toxic" || label === "Ineffective")
    return Math.round(60 + confidence * 40);
  return 50;
}

/**
 * Convert one backend DrugAnalysis object → RiskCard props
 */
function toRiskCardProps(analysis) {
  return {
    drug: analysis.drug,
    riskLevel: mapRiskLevel(analysis.risk_assessment.risk_label),
    riskScore: mapRiskScore(analysis),
    affectedGenes: [analysis.pharmacogenomic_profile.primary_gene],
    summary:
      analysis.llm_generated_explanation?.summary || "No summary available.",
    recommendation: analysis.clinical_recommendation.action,
    guidelines: analysis.risk_assessment.risk_label,
    evidenceLevel: analysis.risk_assessment.severity === "Critical" ? "A" : "B",
  };
}

// ── Summary Banner ─────────────────────────────────────────────────────────

function SummaryBanner({ analyses }) {
  const toxic = analyses.filter(
    (a) =>
      a.risk_assessment.risk_label === "Toxic" ||
      a.risk_assessment.risk_label === "Ineffective",
  ).length;
  const adjust = analyses.filter(
    (a) => a.risk_assessment.risk_label === "Adjust Dosage",
  ).length;
  const safe = analyses.filter(
    (a) => a.risk_assessment.risk_label === "Safe",
  ).length;

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-center gap-3">
        <ShieldAlert className="h-6 w-6 text-red-500 shrink-0" />
        <div>
          <p className="text-2xl font-bold text-red-600">{toxic}</p>
          <p className="text-xs text-red-500">Toxic / Ineffective</p>
        </div>
      </div>
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-yellow-500 shrink-0" />
        <div>
          <p className="text-2xl font-bold text-yellow-600">{adjust}</p>
          <p className="text-xs text-yellow-500">Adjust Dosage</p>
        </div>
      </div>
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
        <CheckCircle2 className="h-6 w-6 text-green-500 shrink-0" />
        <div>
          <p className="text-2xl font-bold text-green-600">{safe}</p>
          <p className="text-xs text-green-500">Safe to Use</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Results Page ──────────────────────────────────────────────────────

export default function ResultsPage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Read results saved by page.jsx after API call
    const raw = sessionStorage.getItem("pharmaguard_results");
    const pid = sessionStorage.getItem("pharmaguard_patient");

    if (!raw) {
      // Nothing in storage → go back to upload page
      router.replace("/");
      return;
    }

    try {
      setAnalyses(JSON.parse(raw));
      setPatientId(pid || "PATIENT");
    } catch {
      router.replace("/");
    } finally {
      setLoaded(true);
    }
  }, [router]);

  function handleDownload() {
    const blob = new Blob([JSON.stringify(analyses, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pharmaguard_${patientId}_report.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground text-sm">Loading results...</p>
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-foreground font-medium">No results found.</p>
          <button
            onClick={() => router.push("/")}
            className="mt-4 text-sm text-primary underline"
          >
            Go back and upload a VCF file
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* ── Header ── */}
      <header className="border-b border-border bg-card px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              New Analysis
            </button>
            <span className="text-border">|</span>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <Dna className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">
                PharmaGuard Results
              </span>
            </div>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download JSON
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* ── Patient info ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Pharmacogenomic Risk Report
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Patient:{" "}
              <span className="font-mono font-medium">{patientId}</span>
              {" · "}
              {analyses.length} drug{analyses.length !== 1 ? "s" : ""} analyzed
              {" · "}
              {new Date(analyses[0]?.timestamp).toLocaleString()}
            </p>
          </div>
        </div>

        {/* ── Summary banner ── */}
        <SummaryBanner analyses={analyses} />

        {/* ── Risk Cards: Toxic first, then Adjust, then Safe ── */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            Drug Risk Assessments
          </h2>
          {[...analyses]
            .sort((a, b) => {
              const order = {
                Toxic: 0,
                Ineffective: 1,
                "Adjust Dosage": 2,
                Safe: 3,
                Unknown: 4,
              };
              return (
                (order[a.risk_assessment.risk_label] ?? 5) -
                (order[b.risk_assessment.risk_label] ?? 5)
              );
            })
            .map((analysis) => (
              <RiskCard
                key={analysis.drug}
                result={toRiskCardProps(analysis)}
              />
            ))}
        </section>

        {/* ── Detailed Mechanism section ── */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">
            Detailed Genetic Mechanisms
          </h2>
          {analyses.map((analysis) => (
            <div
              key={analysis.drug}
              className="rounded-lg border border-border p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono font-semibold text-primary text-sm">
                  {analysis.drug}
                </span>
                <span className="text-xs text-muted-foreground">
                  {analysis.pharmacogenomic_profile.primary_gene} ·{" "}
                  {analysis.pharmacogenomic_profile.diplotype} ·{" "}
                  {analysis.pharmacogenomic_profile.phenotype}
                </span>
              </div>
              <p className="text-sm text-foreground/80 leading-relaxed">
                {analysis.llm_generated_explanation?.mechanism ||
                  "No mechanism data available."}
              </p>
              <p className="text-xs text-muted-foreground mt-2 italic">
                {analysis.llm_generated_explanation?.guideline_reference}
              </p>
            </div>
          ))}
        </section>

        {/* ── Detected Variants ── */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground mb-4">
            Detected Pharmacogenomic Variants
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Drug
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Gene
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    rsID
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Star Allele
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Zygosity
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-foreground">
                    Risk
                  </th>
                </tr>
              </thead>
              <tbody>
                {analyses.flatMap((analysis) =>
                  analysis.pharmacogenomic_profile.detected_variants.map(
                    (variant, i) => (
                      <tr
                        key={`${analysis.drug}-${i}`}
                        className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">
                          {analysis.drug}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-foreground">
                          {variant.gene}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`https://www.ncbi.nlm.nih.gov/snp/${variant.rsid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline font-mono text-xs"
                          >
                            {variant.rsid || "—"}
                          </a>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground">
                          {variant.star_allele || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground capitalize">
                          {variant.zygosity?.replace("_", " ") || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                              analysis.risk_assessment.risk_label === "Safe"
                                ? "bg-green-100 text-green-700"
                                : analysis.risk_assessment.risk_label ===
                                    "Adjust Dosage"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {analysis.risk_assessment.risk_label}
                          </span>
                        </td>
                      </tr>
                    ),
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Explanation Accordion ── */}
        <section className="rounded-xl border border-border bg-card p-6">
          <ExplanationAccordion />
        </section>

        {/* ── Disclaimer ── */}
        <div className="rounded-lg border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          <strong>Clinical Disclaimer:</strong> This report is generated for
          informational purposes and is based on CPIC/DPWG pharmacogenomic
          guidelines. All clinical decisions must be made by qualified
          healthcare professionals. This tool does not constitute medical
          advice.
        </div>
      </div>
    </main>
  );
}
