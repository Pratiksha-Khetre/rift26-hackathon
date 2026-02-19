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
  Code,
  Copy,
  Check,
  Download,
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

// ── Map backend AnalysisResult → RiskCard shape ──────────────────────────────
function mapToRiskCard(analysis) {
  return {
    drug: analysis.drug,
    riskLevel: mapRiskLabel(analysis.risk_assessment.risk_label),
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

// ── JSON Viewer component ────────────────────────────────────────────────────
function JSONViewer({ data }) {
  const [copied, setCopied] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(0);

  const jsonString = JSON.stringify(data, null, 2);

  function handleCopyAll() {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pharmaguard_analysis.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleCopySingle(item) {
    navigator.clipboard.writeText(JSON.stringify(item, null, 2));
  }

  // Colour each JSON key/value for syntax highlighting
  function highlight(json) {
    return json
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(
        /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
        (match) => {
          let cls = "text-blue-400"; // number
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = "text-purple-400"; // key
            } else {
              cls = "text-green-400"; // string value
            }
          } else if (/true|false/.test(match)) {
            cls = "text-yellow-400"; // boolean
          } else if (/null/.test(match)) {
            cls = "text-red-400"; // null
          }
          return `<span class="${cls}">${match}</span>`;
        },
      );
  }

  const items = Array.isArray(data) ? data : [data];

  return (
    <div className="w-full space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Code className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Raw JSON Output
            </h3>
            <p className="text-xs text-muted-foreground">
              {items.length} result{items.length !== 1 ? "s" : ""} — matches
              PharmaGuard API schema exactly
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {copied ? "Copied!" : "Copy All"}
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download JSON
          </button>
        </div>
      </div>

      {/* Schema reference */}
      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
        <p className="text-xs font-mono text-muted-foreground">
          <span className="text-purple-500">"severity"</span>:{" "}
          <span className="text-green-500">
            "none" | "low" | "moderate" | "high" | "critical"
          </span>
          {"  "}
          <span className="text-purple-500">"phenotype"</span>:{" "}
          <span className="text-green-500">
            "PM" | "IM" | "NM" | "RM" | "UM" | "Unknown"
          </span>
        </p>
      </div>

      {/* One card per drug result */}
      {items.map((item, idx) => (
        <div
          key={idx}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          {/* Card header — click to expand/collapse */}
          <button
            onClick={() => setExpandedIndex(expandedIndex === idx ? -1 : idx)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              {/* Risk badge */}
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  item.risk_assessment?.risk_label === "Safe"
                    ? "bg-green-100 text-green-700"
                    : item.risk_assessment?.risk_label === "Adjust Dosage"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {item.risk_assessment?.risk_label}
              </span>
              <span className="text-sm font-semibold text-foreground font-mono">
                {item.drug}
              </span>
              <span className="text-xs text-muted-foreground">
                Gene: {item.pharmacogenomic_profile?.primary_gene} · Phenotype:{" "}
                {item.pharmacogenomic_profile?.phenotype} · Severity:{" "}
                {item.risk_assessment?.severity}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopySingle(item);
                }}
                className="rounded p-1 hover:bg-muted transition-colors"
                title="Copy this result"
              >
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
              <span className="text-xs text-muted-foreground">
                {expandedIndex === idx ? "▲" : "▼"}
              </span>
            </div>
          </button>

          {/* Expanded JSON block */}
          {expandedIndex === idx && (
            <div className="border-t border-border">
              <pre
                className="overflow-x-auto bg-gray-950 p-4 text-xs leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: highlight(JSON.stringify(item, null, 2)),
                }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Results component ───────────────────────────────────────────────────
function Results() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState([]); // RiskCard-shaped data
  const [rawJson, setRawJson] = useState(null); // raw backend JSON
  const [activeTab, setActiveTab] = useState("risks");
  const [usingMock, setUsingMock] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    const sessionId = searchParams.get("session");
    const drugsParam = searchParams.get("drugs");
    const drugIds = drugsParam ? drugsParam.split(",") : [];

    // No session → mock data
    if (!sessionId || drugIds.length === 0) {
      const fallback = Object.values(mockRiskResults);
      setResults(fallback);
      setRawJson(fallback);
      setUsingMock(true);
      setIsLoading(false);
      return;
    }

    const drugNames = drugIds.map((d) => d.trim().toUpperCase());
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    fetch(`${API_URL}/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: sessionId,
        drug: drugNames.length === 1 ? drugNames[0] : drugNames,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          let detail = `Request failed with status ${res.status}`;
          try {
            const errBody = await res.json();
            detail = errBody.detail || detail;
          } catch {}
          throw new Error(detail);
        }
        return res.json();
      })
      .then((data) => {
        // Save raw JSON for the JSON tab
        setRawJson(data);

        // Map to RiskCard format for the Risk Assessment tab
        const analyses = normalizeAnalysisResponse(data);
        setResults(analyses.map(mapToRiskCard));
        setUsingMock(false);
      })
      .catch((err) => {
        console.error("Analysis API error:", err.message);
        setApiError(err.message);
        const fallback = drugIds
          .map((id) => mockRiskResults[id])
          .filter(Boolean);
        const usedFallback =
          fallback.length > 0 ? fallback : Object.values(mockRiskResults);
        setResults(usedFallback);
        setRawJson(usedFallback);
        setUsingMock(true);
      })
      .finally(() => setIsLoading(false));
  }, [searchParams]);

  const riskSummary = {
    safe: results.filter((r) => r.riskLevel === "safe").length,
    adjust: results.filter((r) => r.riskLevel === "adjust").length,
    toxic: results.filter((r) => r.riskLevel === "toxic").length,
  };

  const tabs = [
    { id: "risks", label: "Risk Assessment", icon: BarChart3 },
    { id: "variants", label: "Variant Details", icon: FileText },
    { id: "json", label: "JSON Output", icon: Code },
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

      {/* Loading */}
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

      {/* Results */}
      {!isLoading && (
        <>
          <section className="border-b border-border bg-card">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Analysis
              </Link>

              {/* Error / mock banners */}
              {usingMock && apiError && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-medium text-amber-800">
                    ⚠ Could not reach the analysis server ({apiError}). Showing
                    demo data instead.
                  </p>
                </div>
              )}
              {usingMock && !apiError && (
                <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-medium text-blue-800">
                    ℹ Showing demo data. Upload a VCF file on the home page to
                    see real results.
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

                {/* Risk summary pills */}
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

          {/* Tab content */}
          <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
            {activeTab === "risks" && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {results.map((result) => (
                  <RiskCard key={result.drug} result={result} />
                ))}
              </div>
            )}

            {activeTab === "variants" && <VariantTable />}

            {/* NEW: JSON Output tab */}
            {activeTab === "json" && rawJson && <JSONViewer data={rawJson} />}

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
