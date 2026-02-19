"use client";

// rift26-hackathon\Frontend\app\results\page.jsx

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Shield,
  ArrowLeft,
  FileText,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  BarChart3,
} from "lucide-react";
import RiskCard from "@/components/pharmaguard/RiskCard";
import VariantTable from "@/components/pharmaguard/VariantTable";
import ExplanationAccordion from "@/components/pharmaguard/ExplanationAccordion";
import { mockRiskResults } from "@/lib/mock-data";
import { normalizeAnalysisResponse, mapRiskLabel } from "@/lib/api";

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Shield className="h-8 w-8 text-primary animate-pulse" />
            <p className="text-sm text-muted-foreground">Loading results...</p>
          </div>
        </div>
      }
    >
      <Results />
    </Suspense>
  );
}

// ── Helper: map one backend AnalysisResult → RiskCard-compatible shape ──────
function mapToRiskCard(analysis) {
  return {
    drug: analysis.drug,
    riskLevel: mapRiskLabel(analysis.risk_assessment.risk_label),
    // confidence_score is 0–1, multiply by 100 for the 0–100 riskScore bar
    riskScore: Math.round(analysis.risk_assessment.confidence_score * 100),
    summary: analysis.llm_generated_explanation?.summary || "",
    recommendation: analysis.clinical_recommendation?.action || "",
    affectedGenes: [analysis.pharmacogenomic_profile.primary_gene].filter(
      Boolean,
    ),
    evidenceLevel: "1A",
    guidelines:
      analysis.llm_generated_explanation?.guideline_reference ||
      analysis.clinical_recommendation?.action ||
      "",
  };
}

function Results() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState([]);
  const [activeTab, setActiveTab] = useState("risks");
  // NEW: track whether we used real API or mock fallback
  const [usingMock, setUsingMock] = useState(false);
  // NEW: track any error message from the API
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    const sessionId = searchParams.get("session");
    const drugsParam = searchParams.get("drugs");
    const drugIds = drugsParam ? drugsParam.split(",") : [];

    // ── No session ID → fall back to mock data ───────────────────
    if (!sessionId || drugIds.length === 0) {
      const fallback = Object.values(mockRiskResults);
      setResults(fallback);
      setUsingMock(true);
      setIsLoading(false);
      return;
    }

    // ── Real API call ────────────────────────────────────────────
    // Backend expects uppercase drug names; drug IDs in URL are lowercase (e.g. "warfarin")
    const drugNames = drugIds.map((d) => d.trim().toUpperCase());

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    fetch(`${API_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        // Send array for multiple drugs, single string for one drug
        drug: drugNames.length === 1 ? drugNames[0] : drugNames,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          // Try to get a meaningful error from the backend
          let detail = `Request failed with status ${res.status}`;
          try {
            const errBody = await res.json();
            detail = errBody.detail || detail;
          } catch {
            // ignore JSON parse error on error body
          }
          throw new Error(detail);
        }
        return res.json();
      })
      .then((data) => {
        // normalizeAnalysisResponse handles both single and multi-drug responses
        const analyses = normalizeAnalysisResponse(data);
        const mapped = analyses.map(mapToRiskCard);
        setResults(mapped);
        setUsingMock(false);
      })
      .catch((err) => {
        console.error("Analysis API error:", err.message);
        setApiError(err.message);
        // Fall back to mock data so the UI still renders something useful
        const fallback = drugIds
          .map((id) => mockRiskResults[id])
          .filter(Boolean);
        setResults(
          fallback.length > 0 ? fallback : Object.values(mockRiskResults),
        );
        setUsingMock(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [searchParams]);

  const riskSummary = {
    safe: results.filter((r) => r.riskLevel === "safe").length,
    adjust: results.filter((r) => r.riskLevel === "adjust").length,
    toxic: results.filter((r) => r.riskLevel === "toxic").length,
  };

  const tabs = [
    { id: "risks", label: "Risk Assessment", icon: BarChart3 },
    { id: "variants", label: "Variant Details", icon: FileText },
    { id: "learn", label: "Learn More", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-tight">
                PharmaGuard
              </h1>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest leading-tight">
                Precision Medicine
              </p>
            </div>
          </div>
          <nav className="hidden sm:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </Link>
            <Link href="/results" className="text-sm font-medium text-primary">
              Results
            </Link>
          </nav>
        </div>
      </header>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
            <Shield className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">
            Analyzing Drug-Gene Interactions
          </h2>
          <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
            Cross-referencing genomic variants with pharmacogenomic databases...
          </p>
          <div className="w-64 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* Results Content */}
      {!isLoading && (
        <>
          {/* Results Header */}
          <section className="border-b border-border bg-card">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Analysis
              </Link>

              {/* NEW: Show a banner if we fell back to mock data due to an API error */}
              {usingMock && apiError && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-medium text-amber-800">
                    ⚠ Could not reach the analysis server ({apiError}). Showing
                    demo data instead.
                  </p>
                </div>
              )}

              {/* NEW: Show a banner when displaying demo/mock data without an error */}
              {usingMock && !apiError && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-medium text-blue-800">
                    ℹ Showing demo data. Upload a VCF file and select drugs on
                    the home page to see real results.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">
                    Analysis Report
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {results.length} medication
                    {results.length !== 1 ? "s" : ""} analyzed against detected
                    genomic variants.
                  </p>
                </div>

                {/* Risk Summary Pills */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 rounded-full bg-safe-light px-3 py-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-safe" />
                    <span className="text-xs font-semibold text-safe">
                      {riskSummary.safe} Safe
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-warning-light px-3 py-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                    <span className="text-xs font-semibold text-warning-foreground">
                      {riskSummary.adjust} Adjust
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-toxic-light px-3 py-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 text-toxic" />
                    <span className="text-xs font-semibold text-toxic">
                      {riskSummary.toxic} Toxic
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 mt-6 -mb-px">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`inline-flex items-center gap-1.5 rounded-t-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "border-border border-b-card bg-background text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Tab Content */}
          <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            {activeTab === "risks" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {results.map((result) => (
                  <RiskCard key={result.drug} result={result} />
                ))}
              </div>
            )}

            {activeTab === "variants" && <VariantTable />}

            {activeTab === "learn" && <ExplanationAccordion />}
          </section>
        </>
      )}

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-auto">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                PharmaGuard
              </span>
              <span className="text-xs text-muted-foreground">
                Precision Medicine Risk Analyzer
              </span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              For educational and demonstration purposes only. Not for clinical
              use. Always consult a healthcare professional.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
