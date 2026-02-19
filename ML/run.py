"""
run.py — PharmaGuard Interactive Terminal
Just run: python run.py
"""

# rift26-hackathon\ML\run.py

from vcf_parser import parse_vcf, group_variants_by_gene
from phenotype_mapper import map_phenotypes
from pgx_rules import assess_drug_risk

# ── Step 1: Load and parse VCF ─────────────────────────────────────────────
print("\n" + "="*55)
print("   PHARMAGUARD — Pharmacogenomic Risk Prediction")
print("="*55)

vcf_file = input("\nEnter VCF filename (press Enter for 'test_patient.vcf'): ").strip()
if not vcf_file:
    vcf_file = "test_patient.vcf"

print(f"\n Parsing {vcf_file}...")
parsed  = parse_vcf(vcf_file)
grouped = group_variants_by_gene(parsed["variants"])
profile = map_phenotypes(grouped)

print(f" Sample ID      : {parsed['sample_id']}")
print(f" Variants found : {parsed['pgx_variants_found']}")

# ── Step 2: Show gene phenotype summary ────────────────────────────────────
print("\n--- Gene Profile ---")
for gene, data in profile.items():
    if data["raw_variants"]:
        print(f"  {gene:<12} {data['diplotype']:<15} → {data['phenotype']}")

# ── Step 3: Ask for drug ───────────────────────────────────────────────────
print("\n--- Supported Drugs ---")
print("  CODEINE, TRAMADOL, WARFARIN, PHENYTOIN, CLOPIDOGREL,")
print("  SIMVASTATIN, ATORVASTATIN, AZATHIOPRINE, MERCAPTOPURINE,")
print("  FLUOROURACIL, CAPECITABINE, AMITRIPTYLINE, CITALOPRAM")

while True:
    print()
    drug = input("Enter drug name (or 'quit' to exit): ").strip().upper()

    if drug in ("QUIT", "EXIT", "Q"):
        print("\n Goodbye!\n")
        break

    if not drug:
        continue

    # ── Step 4: Risk assessment ────────────────────────────────────────────
    risk = assess_drug_risk(drug, profile)

    print("\n" + "="*55)
    print(f"  RESULT FOR: {risk.drug}")
    print("="*55)
    print(f"  Risk Label   : {risk.risk_label}")
    print(f"  Severity     : {risk.severity}")
    print(f"  Confidence   : {risk.confidence_score:.0%}")
    print(f"  Gene         : {risk.primary_gene}")
    print(f"  Diplotype    : {risk.diplotype}")
    print(f"  Phenotype    : {risk.phenotype}")
    print(f"\n  Action       : {risk.clinical_action}")
    if risk.alternative_drugs:
        print(f"  Alternatives : {', '.join(risk.alternative_drugs)}")
    if risk.dose_adjustment:
        print(f"  Dose Adjust  : {risk.dose_adjustment}")
    if risk.monitoring:
        print(f"  Monitoring   : {risk.monitoring}")
    print(f"\n  Guideline    : {risk.guideline}")
    print("="*55)