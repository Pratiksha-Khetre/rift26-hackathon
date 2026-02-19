"use client";

// rift26-hackathon\Frontend\app\page.jsx

import { useState } from "react";
import Link from "next/link";
import {
  Shield,
  Dna,
  Activity,
  FlaskConical,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import FileUpload from "@/components/pharmaguard/FileUpload";
import DrugSelector from "@/components/pharmaguard/DrugSelector";

const features = [
  {
    icon: Dna,
    title: "Genomic Variant Detection",
    description:
      "Automatically parse VCF files to identify clinically relevant pharmacogenomic variants across key drug-metabolizing genes.",
  },
  {
    icon: Activity,
    title: "Real-Time Risk Assessment",
    description:
      "Instantly evaluate drug-gene interactions and receive risk-stratified results based on CPIC and DPWG guidelines.",
  },
  {
    icon: FlaskConical,
    title: "Evidence-Based Insights",
    description:
      "All recommendations backed by Level 1A clinical evidence from established pharmacogenomics consortia and FDA labeling.",
  },
];

export default function Home() {
  const [fileUploaded, setFileUploaded] = useState(false);
  // NEW: store the session_id returned by the backend after VCF upload
  const [sessionId, setSessionId] = useState(null);
  const [selectedDrugs, setSelectedDrugs] = useState([]);

  // Both file uploaded AND session established AND at least one drug selected
  const canAnalyze = fileUploaded && sessionId && selectedDrugs.length > 0;

  // Called by FileUpload with (file, session_id, fullResult)
  // When user removes the file, all three args are null
  function handleFileAccepted(file, sid, result) {
    if (file && sid) {
      setFileUploaded(true);
      setSessionId(sid);
    } else {
      // File was removed — reset state
      setFileUploaded(false);
      setSessionId(null);
    }
  }

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
            <Link href="/" className="text-sm font-medium text-primary">
              Home
            </Link>
            <Link
              href="/results"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Results
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-safe animate-pulse" />
              <span className="text-xs font-medium text-primary">
                Clinical-Grade Pharmacogenomics
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl text-balance">
              Precision Medicine Risk Analyzer
            </h2>
            <p className="mt-4 text-base text-muted-foreground leading-relaxed sm:text-lg max-w-xl">
              Upload genomic data, select medications, and receive
              evidence-based risk assessments for drug-gene interactions.
              Empowering safer prescribing decisions.
            </p>
            <div className="mt-8 flex items-center gap-3">
              <a
                href="#analyze"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Start Analysis
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="#features"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="text-center mb-12">
            <h3 className="text-xl font-bold text-foreground sm:text-2xl text-balance">
              How PharmaGuard Works
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
              Three simple steps to personalized drug safety insights powered by
              clinical pharmacogenomics.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={idx}
                  className="group relative rounded-xl border border-border bg-card p-6 hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>Step {idx + 1}</span>
                    <ChevronRight className="h-3 w-3" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Analysis Section */}
      <section id="analyze" className="border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="text-center mb-10">
            <h3 className="text-xl font-bold text-foreground sm:text-2xl">
              Run Your Analysis
            </h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-lg mx-auto">
              Upload your genomic data and select medications to receive
              personalized risk assessments.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Step 1 - File Upload */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  1
                </span>
                <span className="text-sm font-semibold text-foreground">
                  Upload Genomic Data
                </span>
              </div>
              {/* CHANGED: pass handleFileAccepted which now receives (file, sessionId, result) */}
              <FileUpload onFileAccepted={handleFileAccepted} />
            </div>

            {/* Step 2 - Drug Selector */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  2
                </span>
                <span className="text-sm font-semibold text-foreground">
                  Select Medications
                </span>
              </div>
              <DrugSelector
                selectedDrugs={selectedDrugs}
                onDrugSelect={setSelectedDrugs}
              />
            </div>
          </div>

          {/* Analyze Button */}
          <div className="mt-8 flex justify-center">
            {canAnalyze ? (
              // CHANGED: URL now includes session= param so results page can call the real API
              <Link
                href={`/results?session=${sessionId}&drugs=${selectedDrugs.join(",")}`}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
              >
                Analyze Drug Interactions
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <div className="text-center">
                <button
                  disabled
                  className="inline-flex items-center gap-2 rounded-lg bg-muted px-8 py-3 text-sm font-semibold text-muted-foreground cursor-not-allowed"
                >
                  Analyze Drug Interactions
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="mt-2 text-xs text-muted-foreground">
                  {!fileUploaded
                    ? "Upload a VCF file to begin"
                    : !sessionId
                      ? "Waiting for upload to complete..."
                      : "Select at least one medication"}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border">
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
