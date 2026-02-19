"use client";

// rift26-hackathon\Frontend\components\pharmaguard\FileUpload.jsx

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, X, AlertCircle } from "lucide-react";
import { uploadVCF } from "@/lib/api";

export default function FileUpload({ onFileAccepted }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadInfo, setUploadInfo] = useState(null); // stores full backend response
  const inputRef = useRef(null);

  function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  async function handleUpload(selectedFile) {
    setFile(selectedFile);
    setStatus("uploading");
    setErrorMsg("");
    setUploadInfo(null);

    try {
      const result = await uploadVCF(selectedFile);
      setUploadInfo(result);
      setStatus("done");
      // Pass both the file, session_id, and full result up to parent
      if (onFileAccepted)
        onFileAccepted(selectedFile, result.session_id, result);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Upload failed. Please try again.");
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUpload(e.dataTransfer.files[0]);
    }
  }

  function handleChange(e) {
    if (e.target.files && e.target.files[0]) {
      handleUpload(e.target.files[0]);
    }
  }

  function handleRemove() {
    setFile(null);
    setStatus("idle");
    setErrorMsg("");
    setUploadInfo(null);
    if (inputRef.current) inputRef.current.value = "";
    // Notify parent that file was removed
    if (onFileAccepted) onFileAccepted(null, null, null);
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-foreground mb-2">
        Upload Genomic Data
      </label>
      <p className="text-sm text-muted-foreground mb-4">
        Upload a VCF file to analyze pharmacogenomic variants.
      </p>

      {/* ── Idle: Drop Zone ─────────────────────────────────────── */}
      {status === "idle" && (
        <div
          className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer ${
            dragActive
              ? "border-primary bg-accent/50"
              : "border-border bg-card hover:border-primary/50 hover:bg-secondary/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload genomic data file"
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".vcf,.vcf.gz"
            className="hidden"
            onChange={handleChange}
            aria-hidden="true"
          />
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary mb-4">
            <Upload className="h-6 w-6 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Drag and drop your VCF file here
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            or click to browse (.vcf, .vcf.gz)
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Max file size: 50MB
          </p>
        </div>
      )}

      {/* ── Uploading: Progress ──────────────────────────────────── */}
      {status === "uploading" && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card p-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary mb-4">
            <FileText className="h-6 w-6 text-primary animate-pulse" />
          </div>
          <p className="text-sm font-medium text-foreground mb-2">
            Uploading {file?.name}...
          </p>
          <div className="w-full max-w-xs h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full animate-pulse w-3/4" />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Parsing genomic variants on server...
          </p>
        </div>
      )}

      {/* ── Done: Success ────────────────────────────────────────── */}
      {status === "done" && file && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {uploadInfo
                    ? `${uploadInfo.pgx_variants_found} pharmacogenomic variants detected`
                    : "Upload successful"}
                </p>
              </div>
            </div>
            <button
              onClick={handleRemove}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-green-100 transition-colors"
              aria-label="Remove uploaded file"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Show gene summary from backend if available */}
          {uploadInfo?.genes_with_variants &&
            Object.keys(uploadInfo.genes_with_variants).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Object.entries(uploadInfo.genes_with_variants).map(
                  ([gene, count]) => (
                    <span
                      key={gene}
                      className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-mono font-medium text-green-800"
                    >
                      {gene} ({count})
                    </span>
                  ),
                )}
              </div>
            )}
        </div>
      )}

      {/* ── Error ───────────────────────────────────────────────── */}
      {status === "error" && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-700">Upload failed</p>
              <p className="text-xs text-red-500 mt-1">{errorMsg}</p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="mt-3 text-xs font-medium text-red-600 underline hover:text-red-800"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
