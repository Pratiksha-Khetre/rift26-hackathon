// hooks/use-pharmaguard.ts

import { useState } from "react";
import {
  uploadVCF,
  analyzeDrugs,
  DrugAnalysis,
  MultipleDrugAnalysis,
  UploadVCFResponse,
} from "@/lib/api";

export function usePharmaGuard() {
  const [session, setSession] = useState<UploadVCFResponse | null>(null);
  const [results, setResults] = useState<DrugAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setLoading(true);
    setError(null);
    try {
      const data = await uploadVCF(file);
      setSession(data);
      return data;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze(drugs: string[]) {
    if (!session) {
      setError("Please upload a VCF file first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await analyzeDrugs(
        session.session_id,
        drugs,
        session.sample_id,
      );

      // Normalize to always be an array
      if ("analyses" in data) {
        setResults((data as MultipleDrugAnalysis).analyses);
      } else {
        setResults([data as DrugAnalysis]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setSession(null);
    setResults([]);
    setError(null);
  }

  return {
    session,
    results,
    loading,
    error,
    handleUpload,
    handleAnalyze,
    reset,
  };
}
