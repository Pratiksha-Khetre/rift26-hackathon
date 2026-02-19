#!/usr/bin/env python3
"""
test_pharmaguard.py — PharmaGuard End-to-End Test Runner

Runs a complete pharmacogenomic analysis pipeline on the example
test_patient.vcf file and prints formatted JSON output.

Usage:
    python test_pharmaguard.py
"""

import json
import sys
from pathlib import Path
from datetime import datetime, timezone

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

from vcf_parser       import parse_vcf, group_variants_by_gene
from phenotype_mapper import map_phenotypes
from pgx_rules        import assess_drug_risk
from llm_explainer    import generate_explanation


def build_full_report(patient_id: str, drug: str, parsed: dict, phenotype_profile: dict) -> dict:
    """Build the complete PharmaGuard JSON report."""
    risk      = assess_drug_risk(drug, phenotype_profile)
    gene_data = phenotype_profile.get(risk.primary_gene, {})

    detected_variants_rsids = [
        v.get("rsid") for v in gene_data.get("raw_variants", [])
        if v.get("rsid")
    ]
    detected_variants_full = [
        {
            "rsid":       v.get("rsid"),
            "gene":       v.get("gene"),
            "chromosome": v.get("chromosome"),
            "position":   v.get("position"),
            "ref":        v.get("ref"),
            "alt":        v.get("alt"),
            "genotype":   v.get("genotype"),
            "zygosity":   v.get("zygosity"),
            "star_allele": v.get("star_allele"),
        }
        for v in gene_data.get("raw_variants", [])
    ]

    explanation = generate_explanation(
        gene             = risk.primary_gene,
        phenotype        = risk.phenotype,
        drug             = drug,
        detected_variants= detected_variants_rsids,
        diplotype        = risk.diplotype,
        risk_label       = risk.risk_label,
        clinical_action  = risk.clinical_action,
        guideline        = risk.guideline,
    )

    clinical_recommendation = {
        "action":            risk.clinical_action,
        "alternative_drugs": risk.alternative_drugs,
    }
    if risk.dose_adjustment:
        clinical_recommendation["dose_adjustment"] = risk.dose_adjustment
    if risk.monitoring:
        clinical_recommendation["monitoring"] = risk.monitoring

    return {
        "patient_id": patient_id,
        "drug":       risk.drug,
        "timestamp":  datetime.now(timezone.utc).isoformat(),

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
            "vcf_parsing_success":   len(parsed.get("parse_errors", [])) == 0,
            "total_variants_parsed": parsed.get("total_variants_parsed", 0),
            "pgx_variants_found":    parsed.get("pgx_variants_found", 0),
            "parse_errors":          parsed.get("parse_errors", []),
        },
    }


def run_tests():
    vcf_path = Path(__file__).parent / "test_patient.vcf"

    print("=" * 70)
    print("  PharmaGuard — Pharmacogenomic Risk Prediction System")
    print("  Test Run")
    print("=" * 70)
    print()

    # ── STEP 1: Parse VCF ────────────────────────────────────────────────────
    print("▶ Step 1: Parsing VCF file ...")
    parsed = parse_vcf(str(vcf_path))
    print(f"  Sample ID:               {parsed['sample_id']}")
    print(f"  Total variants parsed:   {parsed['total_variants_parsed']}")
    print(f"  PGx variants found:      {parsed['pgx_variants_found']}")
    if parsed["parse_errors"]:
        print(f"  Parse errors:            {parsed['parse_errors']}")
    print()

    # ── STEP 2: Group by gene ────────────────────────────────────────────────
    print("▶ Step 2: Grouping variants by gene ...")
    grouped = group_variants_by_gene(parsed["variants"])
    for gene, variants in grouped.items():
        if variants:
            rsids = [v.get("rsid", "?") for v in variants]
            print(f"  {gene:<12} → {len(variants)} variant(s): {', '.join(str(r) for r in rsids)}")
    print()

    # ── STEP 3: Map phenotypes ───────────────────────────────────────────────
    print("▶ Step 3: Mapping diplotypes and phenotypes ...")
    phenotype_profile = map_phenotypes(grouped)
    for gene, data in phenotype_profile.items():
        print(f"  {gene:<12} → {data['diplotype']:<15} | {data['phenotype']}")
    print()

    # ── STEP 4: Assess drug risks ────────────────────────────────────────────
    test_drugs = [
        "CODEINE",
        "CLOPIDOGREL",
        "WARFARIN",
        "SIMVASTATIN",
        "AZATHIOPRINE",
        "FLUOROURACIL",
    ]

    print("▶ Step 4: Drug risk assessments ...")
    print()

    reports = []
    for drug in test_drugs:
        report = build_full_report(
            patient_id      = parsed["sample_id"],
            drug            = drug,
            parsed          = parsed,
            phenotype_profile = phenotype_profile,
        )
        reports.append(report)

        ra = report["risk_assessment"]
        pp = report["pharmacogenomic_profile"]
        print(f"  Drug: {drug}")
        print(f"    Gene:       {pp['primary_gene']}")
        print(f"    Diplotype:  {pp['diplotype']}")
        print(f"    Phenotype:  {pp['phenotype']}")
        print(f"    Risk Label: {ra['risk_label']}")
        print(f"    Severity:   {ra['severity']}")
        print(f"    Confidence: {ra['confidence_score']:.0%}")
        print()

    # ── STEP 5: Write sample JSON output ────────────────────────────────────
    output_path = Path(__file__).parent / "sample_output.json"
    with open(output_path, "w") as f:
        json.dump(reports, f, indent=2)

    print(f"✅ Full JSON output written to: {output_path}")
    print()

    # Print the first report as sample
    print("─" * 70)
    print("SAMPLE JSON OUTPUT (CODEINE analysis):")
    print("─" * 70)
    print(json.dumps(reports[0], indent=2))


if __name__ == "__main__":
    run_tests()