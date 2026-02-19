"""
main.py — PharmaGuard FastAPI Backend
Exposes endpoints for VCF upload, pharmacogenomic analysis, and health checks.

Endpoints:
  GET  /health           — Service health check
  POST /upload-vcf       — Upload and parse a VCF file
  POST /analyze          — Full pharmacogenomic risk analysis
  POST /analyze-batch    — Analyse multiple drugs at once
"""

# rift26-hackathon\ML\main.py

import os
import uuid
import logging
import tempfile
from dotenv import load_dotenv
load_dotenv()  # Loads ANTHROPIC_API_KEY from .env file
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Union

from fastapi import FastAPI, File, Form, UploadFile, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Internal modules
from vcf_parser      import parse_vcf, group_variants_by_gene
from phenotype_mapper import map_phenotypes
from pgx_rules        import assess_drug_risk, assess_multiple_drugs
from llm_explainer    import generate_explanation

# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("pharmaguard")

# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="PharmaGuard — Pharmacogenomic Risk Prediction API",
    description=(
        "Parses patient VCF files, maps pharmacogenomic variants to diplotypes, "
        "predicts drug-specific toxicity/efficacy risk, and generates clinical "
        "explanations following CPIC guidelines."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temporary storage for uploaded VCF sessions (in-memory for hackathon)
# In production this would be a database or object storage.
vcf_sessions: dict[str, dict] = {}

UPLOAD_DIR = Path(tempfile.gettempdir()) / "pharmaguard_uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


# ─────────────────────────────────────────────────────────────────────────────
# REQUEST / RESPONSE MODELS
# ─────────────────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    session_id: str
    drug: Union[str, list[str]]
    patient_id: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: str


# ─────────────────────────────────────────────────────────────────────────────
# HELPER: build the full analysis JSON for a single drug
# ─────────────────────────────────────────────────────────────────────────────

def _build_analysis_response(
    patient_id: str,
    drug: str,
    parsed_vcf: dict,
    phenotype_profile: dict,
) -> dict:
    """
    Orchestrates the full pipeline for one drug and returns the
    structured JSON matching the PharmaGuard output schema.
    """
    # 1. Drug risk assessment
    risk = assess_drug_risk(drug, phenotype_profile)

    # 2. Gene profile for primary gene
    gene_data = phenotype_profile.get(risk.primary_gene, {})
    detected_variants_rsids = [
        v.get("rsid") for v in gene_data.get("raw_variants", [])
        if v.get("rsid")
    ]
    detected_variants_full = [
        {
            "rsid":         v.get("rsid"),
            "gene":         v.get("gene"),
            "chromosome":   v.get("chromosome"),
            "position":     v.get("position"),
            "ref":          v.get("ref"),
            "alt":          v.get("alt"),
            "genotype":     v.get("genotype"),
            "zygosity":     v.get("zygosity"),
            "star_allele":  v.get("star_allele"),
        }
        for v in gene_data.get("raw_variants", [])
    ]

    # 3. LLM explanation
    explanation = generate_explanation(
        gene=risk.primary_gene,
        phenotype=risk.phenotype,
        drug=drug,
        detected_variants=detected_variants_rsids,
        diplotype=risk.diplotype,
        risk_label=risk.risk_label,
        clinical_action=risk.clinical_action,
        guideline=risk.guideline,
    )

    # 4. Clinical recommendation block
    clinical_recommendation = {
        "action":           risk.clinical_action,
        "alternative_drugs": risk.alternative_drugs,
    }
    if risk.dose_adjustment:
        clinical_recommendation["dose_adjustment"] = risk.dose_adjustment
    if risk.monitoring:
        clinical_recommendation["monitoring"] = risk.monitoring

    # 5. Assemble final response
    return {
        "patient_id":   patient_id,
        "drug":         risk.drug,
        "timestamp":    datetime.now(timezone.utc).isoformat(),

        "risk_assessment": {
            "risk_label":       risk.risk_label,
            "confidence_score": round(risk.confidence_score, 2),
            "severity":         risk.severity,
        },

        "pharmacogenomic_profile": {
            "primary_gene":      risk.primary_gene,
            "diplotype":         risk.diplotype,
            "phenotype":         risk.phenotype,
            "detected_variants": detected_variants_full,
        },

        "clinical_recommendation": clinical_recommendation,

        "llm_generated_explanation": explanation,

        "quality_metrics": {
            "vcf_parsing_success":    len(parsed_vcf.get("parse_errors", [])) == 0,
            "total_variants_parsed":  parsed_vcf.get("total_variants_parsed", 0),
            "pgx_variants_found":     parsed_vcf.get("pgx_variants_found", 0),
            "parse_errors":           parsed_vcf.get("parse_errors", []),
            "genes_with_variants":    [
                g for g, variants in group_variants_by_gene(
                    parsed_vcf.get("variants", [])
                ).items() if variants
            ],
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINTS
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """Returns service health status."""
    return {
        "status":    "healthy",
        "version":   "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.post("/upload-vcf", tags=["VCF"])
async def upload_vcf(
    file: UploadFile = File(..., description="VCF file (v4.1 or v4.2)"),
):
    """
    Upload a patient VCF file.
    Returns a session_id that must be passed to /analyze.

    - Accepts: multipart/form-data with a VCF file
    - Returns: session_id, sample_id, variant summary
    """
    # Validate file extension
    if not file.filename.lower().endswith((".vcf", ".vcf.gz")):
        raise HTTPException(
            status_code=400,
            detail="Only .vcf files are supported. Please upload a standard VCF file."
        )

    # Save to temp storage
    session_id = str(uuid.uuid4())
    save_path  = UPLOAD_DIR / f"{session_id}.vcf"

    try:
        content = await file.read()
        with open(save_path, "wb") as f:
            f.write(content)
        logger.info("VCF uploaded: session=%s file=%s size=%d bytes",
                    session_id, file.filename, len(content))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(exc)}")

    # Parse VCF immediately to validate and extract basic info
    try:
        parsed = parse_vcf(str(save_path))
    except Exception as exc:
        os.remove(save_path)
        raise HTTPException(status_code=422, detail=f"VCF parsing failed: {str(exc)}")

    # Store in session
    vcf_sessions[session_id] = {
        "path":   str(save_path),
        "parsed": parsed,
    }

    # Gene-level variant summary
    grouped = group_variants_by_gene(parsed["variants"])
    gene_summary = {
        gene: len(variants)
        for gene, variants in grouped.items()
        if variants
    }

    return JSONResponse(content={
        "session_id":             session_id,
        "sample_id":              parsed["sample_id"],
        "filename":               file.filename,
        "total_variants_parsed":  parsed["total_variants_parsed"],
        "pgx_variants_found":     parsed["pgx_variants_found"],
        "genes_with_variants":    gene_summary,
        "parse_errors":           parsed["parse_errors"],
        "status":                 "ready_for_analysis",
        "message":                (
            f"VCF parsed successfully. Found {parsed['pgx_variants_found']} "
            f"pharmacogenomic variants across {len(gene_summary)} gene(s). "
            f"Use session_id with POST /analyze to get drug risk assessment."
        ),
    })


@app.post("/analyze", tags=["Analysis"])
async def analyze(request: AnalyzeRequest):
    """
    Perform pharmacogenomic drug risk analysis.

    - Requires: session_id from /upload-vcf and drug name(s)
    - Returns: Full structured PharmaGuard risk assessment JSON

    Supported drugs include: CODEINE, WARFARIN, CLOPIDOGREL,
    SIMVASTATIN, AZATHIOPRINE, FLUOROURACIL, CAPECITABINE,
    TRAMADOL, PHENYTOIN, AMITRIPTYLINE, CITALOPRAM, and more.
    """
    session = vcf_sessions.get(request.session_id)
    if not session:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Session '{request.session_id}' not found. "
                "Please upload a VCF file first using POST /upload-vcf."
            )
        )

    parsed          = session["parsed"]
    grouped         = group_variants_by_gene(parsed["variants"])
    phenotype_profile = map_phenotypes(grouped)
    patient_id      = request.patient_id or parsed["sample_id"]

    # Handle single drug or list
    drugs = request.drug if isinstance(request.drug, list) else [request.drug]

    if len(drugs) == 1:
        # Return single analysis
        result = _build_analysis_response(patient_id, drugs[0], parsed, phenotype_profile)
        return JSONResponse(content=result)

    # Multiple drugs — return list
    results = []
    for drug in drugs:
        results.append(_build_analysis_response(patient_id, drug, parsed, phenotype_profile))

    return JSONResponse(content={
        "patient_id":   patient_id,
        "timestamp":    datetime.now(timezone.utc).isoformat(),
        "drug_count":   len(results),
        "analyses":     results,
    })


@app.post("/analyze-file", tags=["Analysis"])
async def analyze_file(
    file:       UploadFile = File(...),
    drug:       str        = Form(...),
    patient_id: Optional[str] = Form(default=None),
):
    """
    Combined endpoint: upload VCF and analyze in one request.
    Convenience endpoint for hackathon demos.
    """
    # Re-use upload logic
    if not file.filename.lower().endswith((".vcf", ".vcf.gz")):
        raise HTTPException(status_code=400, detail="Only .vcf files are supported.")

    session_id = str(uuid.uuid4())
    save_path  = UPLOAD_DIR / f"{session_id}.vcf"

    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    try:
        parsed = parse_vcf(str(save_path))
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"VCF parsing failed: {str(exc)}")

    grouped           = group_variants_by_gene(parsed["variants"])
    phenotype_profile = map_phenotypes(grouped)
    pid               = patient_id or parsed["sample_id"]

    drugs = [d.strip() for d in drug.split(",")]

    if len(drugs) == 1:
        result = _build_analysis_response(pid, drugs[0], parsed, phenotype_profile)
    else:
        result = {
            "patient_id": pid,
            "timestamp":  datetime.now(timezone.utc).isoformat(),
            "drug_count": len(drugs),
            "analyses":   [_build_analysis_response(pid, d, parsed, phenotype_profile) for d in drugs],
        }

    return JSONResponse(content=result)


@app.get("/supported-drugs", tags=["Reference"])
async def supported_drugs():
    """List all drugs with pharmacogenomic rules in the PharmaGuard database."""
    from pgx_rules import DRUG_RULES, DRUG_PRIMARY_GENE
    return {
        "supported_drugs": [
            {
                "drug":         drug,
                "primary_gene": DRUG_PRIMARY_GENE.get(drug, "Unknown"),
                "rule_count":   len(rules),
            }
            for drug, rules in DRUG_RULES.items()
        ],
        "total": len(DRUG_RULES),
    }


@app.get("/supported-genes", tags=["Reference"])
async def supported_genes():
    """List all pharmacogenes tracked by PharmaGuard."""
    from vcf_parser import PGX_GENES, RSID_TO_GENE
    return {
        "genes":           sorted(PGX_GENES),
        "tracked_rsids":   len(RSID_TO_GENE),
        "rsid_gene_map":   RSID_TO_GENE,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Entry point for local development
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)