// rift26-hackathon\frontend2\lib\api.ts

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://rift26-hackathon-ml.onrender.com";

// ── Types ──────────────────────────────────────────────────────────────────

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
  genotype: string;
  zygosity: string;
  star_allele: string;
}

export interface DrugAnalysis {
  patient_id: string;
  drug: string;
  timestamp: string;
  risk_assessment: {
    risk_label: "Safe" | "Adjust Dosage" | "Toxic" | "Ineffective" | "Unknown";
    confidence_score: number;
    severity: "Low" | "Moderate" | "High" | "Critical";
  };
  pharmacogenomic_profile: {
    primary_gene: string;
    diplotype: string;
    phenotype: string;
    detected_variants: DetectedVariant[];
  };
  clinical_recommendation: {
    action: string;
    alternative_drugs: string[];
    dose_adjustment?: string;
    monitoring?: string;
  };
  llm_generated_explanation: {
    summary: string;
    mechanism: string;
    guideline_reference: string;
  };
  quality_metrics: {
    vcf_parsing_success: boolean;
    total_variants_parsed: number;
    pgx_variants_found: number;
    parse_errors: string[];
  };
}

export interface MultipleDrugAnalysis {
  patient_id: string;
  timestamp: string;
  drug_count: number;
  analyses: DrugAnalysis[];
}

// ── API Functions ──────────────────────────────────────────────────────────

/** Upload a VCF file → returns session_id */
export async function uploadVCF(file: File): Promise<UploadVCFResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/upload-vcf`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Upload failed (${response.status})`);
  }

  return response.json();
}

/** Analyze one or more drugs using a session_id */
export async function analyzeDrugs(
  sessionId: string,
  drugs: string | string[],
  patientId?: string | null,
): Promise<DrugAnalysis | MultipleDrugAnalysis> {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      session_id: sessionId,
      drug: drugs,
      patient_id: patientId,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `Analysis failed (${response.status})`);
  }

  return response.json();
}

/** Get supported drugs list from backend */
export async function getSupportedDrugs(): Promise<{
  supported_drugs: { drug: string; primary_gene: string; rule_count: number }[];
  total: number;
}> {
  const response = await fetch(`${API_BASE_URL}/supported-drugs`);
  if (!response.ok) throw new Error("Failed to fetch supported drugs");
  return response.json();
}
