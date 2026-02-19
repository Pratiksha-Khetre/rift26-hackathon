// rift26-hackathon\frontend2\components\pharmaguard\FileUpload.jsx

"use client";

import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, X } from "lucide-react";
import { uploadVCF } from "@/lib/api";

export default function FileUpload({ onFileAccepted }) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | uploading | done | error
  const [errorMsg, setErrorMsg] = useState("");
  const [variantCount, setVariantCount] = useState(0);
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

  async function handleRealUpload(selectedFile) {
    setFile(selectedFile);
    setStatus("uploading");
    setErrorMsg("");
    try {
      const result = await uploadVCF(selectedFile);
      setVariantCount(result.pgx_variants_found);
      setStatus("done");
      if (onFileAccepted) onFileAccepted(selectedFile, result);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Upload failed. Is the backend running?");
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleRealUpload(e.dataTransfer.files[0]);
    }
  }

  function handleChange(e) {
    if (e.target.files && e.target.files[0]) {
      handleRealUpload(e.target.files[0]);
    }
  }

  function handleRemove() {
    setFile(null);
    setStatus("idle");
    setErrorMsg("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="w-full">
      <label className="block text-sm font-semibold text-foreground mb-2">
        Upload Genomic Data
      </label>
      <p className="text-sm text-muted-foreground mb-4">
        Upload a VCF file to analyze pharmacogenomic variants.
      </p>

      {/* ── Idle: drop zone ── */}
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
            or click to browse (.vcf files only)
          </p>
          <p className="text-xs text-muted-foreground mt-3">
            Max file size: 50MB
          </p>
        </div>
      )}

      {/* ── Uploading: progress ── */}
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
            Sending to backend & parsing variants...
          </p>
        </div>
      )}

      {/* ── Done: success ── */}
      {status === "done" && file && (
        <div className="flex items-center justify-between rounded-lg border border-green-300 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                ✅ {variantCount} pharmacogenomic variants detected
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="Remove uploaded file"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* ── Error ── */}
      {status === "error" && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-red-700">
                Upload Failed
              </p>
              <p className="text-xs text-red-600 mt-1">{errorMsg}</p>
              <p className="text-xs text-red-500 mt-1">
                Make sure your FastAPI backend is running on port 8000.
              </p>
            </div>
            <button
              onClick={handleRemove}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-red-100 transition-colors"
            >
              <X className="h-4 w-4 text-red-500" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
