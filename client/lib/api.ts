// rift26-hackathon\Frontend\lib\api.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─── Response Types ────────────────────────────────────────────────────────

export interface UploadVCFResponse {
  session_id: string;
  sample_id: string;
  filename: string;
  total_variants_parsed: number;
  pgx_variants_found: number;
  genes_with_variants: Record<string, number>;
  parse_errors: string[];
  status: string;
  message: string;
}

export interface DetectedVariant {
  rsid: string | null;
  gene: string;
  chromosome: string;
  position: number;
  ref: string;
  alt: string;
  genotype: string | null;
  zygosity: string;
  star_allele: string;
}

export interface RiskAssessment {
  risk_label: "Safe" | "Adjust Dosage" | "Toxic" | "Ineffective" | "Unknown";
  confidence_score: number;
  severity: "none" | "low" | "moderate" | "high" | "critical"; // ✅ matches backend
}

export interface PharmacogenomicProfile {
  primary_gene: string;
  diplotype: string;
  phenotype: string;
  detected_variants: DetectedVariant[];
}

export interface ClinicalRecommendation {
  action: string;
  alternative_drugs: string[];
  dose_adjustment?: string;
  monitoring?: string;
}

export interface LLMExplanation {
  summary: string;
  mechanism: string;
  guideline_reference: string;
}

export interface AnalysisResult {
  patient_id: string;
  drug: string;
  timestamp: string;
  risk_assessment: RiskAssessment;
  pharmacogenomic_profile: PharmacogenomicProfile;
  clinical_recommendation: ClinicalRecommendation;
  llm_generated_explanation: LLMExplanation;
  quality_metrics: {
    vcf_parsing_success: boolean;
    total_variants_parsed: number;
    pgx_variants_found: number;
    parse_errors: string[];
    genes_with_variants: string[];
  };
}

export interface MultiDrugAnalysisResponse {
  patient_id: string;
  timestamp: string;
  drug_count: number;
  analyses: AnalysisResult[];
}

// ─── API Functions ─────────────────────────────────────────────────────────

/**
 * Upload a VCF file to the backend.
 * Returns a session_id used in subsequent /analyze calls.
 */
export async function uploadVCF(file: File): Promise<UploadVCFResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/upload-vcf`, {
    method: "POST",
    body: formData,
    // NOTE: Do NOT set Content-Type header manually when using FormData.
    // The browser automatically sets it with the correct multipart boundary.
  });

  if (!res.ok) {
    // Safely parse error — backend may return JSON or plain text
    let errorMessage = "VCF upload failed";
    try {
      const error = await res.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = `Upload failed with status ${res.status}`;
    }
    throw new Error(errorMessage);
  }

  return res.json() as Promise<UploadVCFResponse>;
}

/**
 * Analyze one or more drugs against an uploaded VCF session.
 *
 * @param sessionId - The session_id returned from uploadVCF()
 * @param drugs     - Array of drug name strings e.g. ["WARFARIN", "CODEINE"]
 *
 * Returns either a single AnalysisResult (1 drug) or a MultiDrugAnalysisResponse (2+ drugs).
 */
export async function analyzeDrugs(
  sessionId: string,
  drugs: string[],
): Promise<AnalysisResult | MultiDrugAnalysisResponse> {
  if (!sessionId) {
    throw new Error("session_id is required. Please upload a VCF file first.");
  }

  if (!drugs || drugs.length === 0) {
    throw new Error("At least one drug must be specified.");
  }

  // Backend expects drug names in UPPERCASE
  const normalizedDrugs = drugs.map((d) => d.trim().toUpperCase());

  const res = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
      drug: normalizedDrugs.length === 1 ? normalizedDrugs[0] : normalizedDrugs,
      // Send a single string for 1 drug, array for multiple —
      // the backend handles both (Union[str, list[str]])
    }),
  });

  if (!res.ok) {
    let errorMessage = "Analysis failed";
    try {
      const error = await res.json();
      errorMessage = error.detail || errorMessage;
    } catch {
      errorMessage = `Analysis failed with status ${res.status}`;
    }
    throw new Error(errorMessage);
  }

  return res.json() as Promise<AnalysisResult | MultiDrugAnalysisResponse>;
}

/**
 * Type guard — check if a response is multi-drug.
 * Use this after calling analyzeDrugs() to safely access .analyses[].
 */
export function isMultiDrugResponse(
  response: AnalysisResult | MultiDrugAnalysisResponse,
): response is MultiDrugAnalysisResponse {
  return "analyses" in response;
}

/**
 * Helper: always returns an array of AnalysisResult regardless of
 * whether 1 or many drugs were requested.
 */
export function normalizeAnalysisResponse(
  response: AnalysisResult | MultiDrugAnalysisResponse,
): AnalysisResult[] {
  if (isMultiDrugResponse(response)) {
    return response.analyses;
  }
  return [response];
}

/**
 * Map backend risk_label → the riskLevel strings used by RiskCard
 * ("safe" | "adjust" | "toxic")
 */
export function mapRiskLabel(
  label: RiskAssessment["risk_label"],
): "safe" | "adjust" | "toxic" {
  const map: Record<string, "safe" | "adjust" | "toxic"> = {
    Safe: "safe",
    "Adjust Dosage": "adjust",
    Toxic: "toxic",
    Ineffective: "toxic", // treat as toxic — avoid the drug
    Unknown: "safe", // no data → default to safe display
  };
  return map[label] ?? "safe";
}
