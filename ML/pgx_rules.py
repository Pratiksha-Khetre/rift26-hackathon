"""
pgx_rules.py — PharmaGuard Drug Rule Engine
Maps gene phenotypes → drug-specific risk labels following
CPIC, DPWG, and FDA pharmacogenomic labelling guidelines.

Risk Labels  : Safe | Adjust Dosage | Toxic | Ineffective | Unknown
Severity     : Low | Moderate | High | Critical
"""

import logging
from dataclasses import dataclass, field
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class RiskResult:
    """Container for a single drug risk assessment."""
    drug:              str
    risk_label:        str           # Safe | Adjust Dosage | Toxic | Ineffective | Unknown
    severity:          str           # Low | Moderate | High | Critical
    confidence_score:  float         # 0.0 – 1.0
    primary_gene:      str
    phenotype:         str
    diplotype:         str
    detected_variants: list[str]     = field(default_factory=list)
    clinical_action:   str           = ""
    alternative_drugs: list[str]     = field(default_factory=list)
    dose_adjustment:   Optional[str] = None
    monitoring:        Optional[str] = None
    guideline:         str           = ""


# ─────────────────────────────────────────────────────────────────────────────
# DRUG RULE DEFINITIONS
# Each entry: drug_name → list of rule dicts in priority order.
# A rule is evaluated against the phenotype profile dict.
# ─────────────────────────────────────────────────────────────────────────────
DRUG_RULES: dict[str, list[dict]] = {

    # ── OPIOIDS ──────────────────────────────────────────────────────────────
    "CODEINE": [
        {
            "gene": "CYP2D6",
            "phenotype_match": ["Poor Metabolizer"],
            "risk_label": "Ineffective",
            "severity": "Moderate",
            "confidence": 0.95,
            "clinical_action": "Use alternative opioid (morphine, hydromorphone, oxycodone). Codeine will not be converted to active morphine.",
            "alternatives": ["Morphine", "Hydromorphone", "Oxycodone"],
            "guideline": "CPIC guideline for codeine and CYP2D6 (2014, updated 2022)",
        },
        {
            "gene": "CYP2D6",
            "phenotype_match": ["Ultrarapid Metabolizer"],
            "risk_label": "Toxic",
            "severity": "Critical",
            "confidence": 0.97,
            "clinical_action": "CONTRAINDICATED. Risk of life-threatening morphine toxicity (respiratory depression). Select alternative opioid.",
            "alternatives": ["Morphine (dose-titrated)", "Tramadol", "Buprenorphine"],
            "guideline": "CPIC guideline for codeine and CYP2D6 (2014, updated 2022); FDA black box warning",
        },
        {
            "gene": "CYP2D6",
            "phenotype_match": ["Intermediate Metabolizer"],
            "risk_label": "Adjust Dosage",
            "severity": "Moderate",
            "confidence": 0.80,
            "clinical_action": "Reduced analgesic effect expected. Consider alternative opioid or careful dose titration.",
            "alternatives": ["Morphine", "Oxycodone"],
            "dose_adjustment": "Consider dose increase with caution or switch to non-CYP2D6-metabolised opioid.",
            "guideline": "CPIC guideline for codeine and CYP2D6 (2014, updated 2022)",
        },
        {
            "gene": "CYP2D6",
            "phenotype_match": ["Normal Metabolizer"],
            "risk_label": "Safe",
            "severity": "Low",
            "confidence": 0.90,
            "clinical_action": "Use label-recommended dosing.",
            "guideline": "CPIC guideline for codeine and CYP2D6 (2014, updated 2022)",
        },
    ],

    "TRAMADOL": [
        {
            "gene": "CYP2D6",
            "phenotype_match": ["Ultrarapid Metabolizer"],
            "risk_label": "Toxic",
            "severity": "High",
            "confidence": 0.88,
            "clinical_action": "Risk of excessive O-desmethyltramadol accumulation. Consider alternative.",
            "alternatives": ["Morphine", "Oxycodone"],
            "guideline": "CPIC guideline for tramadol and CYP2D6 (2021)",
        },
        {
            "gene": "CYP2D6",
            "phenotype_match": ["Poor Metabolizer"],
            "risk_label": "Ineffective",
            "severity": "Moderate",
            "confidence": 0.85,
            "clinical_action": "Reduced O-desmethyltramadol formation; reduced analgesia. Consider alternative.",
            "alternatives": ["Morphine", "Hydromorphone"],
            "guideline": "CPIC guideline for tramadol and CYP2D6 (2021)",
        },
    ],

    # ── ANTICOAGULANTS ────────────────────────────────────────────────────────
    "WARFARIN": [
        {
            "gene": "CYP2C9",
            "phenotype_match": ["Poor Metabolizer"],
            "risk_label": "Adjust Dosage",
            "severity": "High",
            "confidence": 0.92,
            "clinical_action": "Significantly reduced warfarin metabolism. Start at 25–50% of standard dose. Frequent INR monitoring required.",
            "dose_adjustment": "Reduce initial dose by 50%. Target INR 2.0–3.0 with enhanced monitoring.",
            "monitoring": "INR twice weekly for first 2 weeks, then weekly until stable.",
            "guideline": "CPIC guideline for warfarin, CYP2C9, VKORC1, CYP4F2 (2017)",
        },
        {
            "gene": "CYP2C9",
            "phenotype_match": ["Intermediate Metabolizer"],
            "risk_label": "Adjust Dosage",
            "severity": "Moderate",
            "confidence": 0.87,
            "clinical_action": "Reduced warfarin clearance. Initiate at 75% of standard dose with close INR monitoring.",
            "dose_adjustment": "Reduce initial dose by 25%. Increase INR monitoring frequency.",
            "monitoring": "Weekly INR for first month.",
            "guideline": "CPIC guideline for warfarin, CYP2C9, VKORC1, CYP4F2 (2017)",
        },
        {
            "gene": "CYP2C9",
            "phenotype_match": ["Normal Metabolizer"],
            "risk_label": "Safe",
            "severity": "Low",
            "confidence": 0.85,
            "clinical_action": "Use standard label dosing. Routine INR monitoring.",
            "guideline": "CPIC guideline for warfarin, CYP2C9, VKORC1, CYP4F2 (2017)",
        },
    ],

    "PHENYTOIN": [
        {
            "gene": "CYP2C9",
            "phenotype_match": ["Poor Metabolizer"],
            "risk_label": "Toxic",
            "severity": "High",
            "confidence": 0.90,
            "clinical_action": "Severely reduced phenytoin metabolism. High risk of toxicity at standard doses. Reduce dose by 25–50%.",
            "dose_adjustment": "Reduce by 25–50%, use lower maintenance dose. Monitor serum levels closely.",
            "guideline": "CPIC guideline for phenytoin and CYP2C9, HLA-B (2020)",
        },
    ],

    # ── ANTIPLATELET ──────────────────────────────────────────────────────────
    "CLOPIDOGREL": [
        {
            "gene": "CYP2C19",
            "phenotype_match": ["Poor Metabolizer"],
            "risk_label": "Ineffective",
            "severity": "High",
            "confidence": 0.95,
            "clinical_action": "Clopidogrel will not be converted to active thiosuflate metabolite. Use prasugrel or ticagrelor instead.",
            "alternatives": ["Prasugrel", "Ticagrelor"],
            "guideline": "CPIC guideline for clopidogrel and CYP2C19 (2013, updated 2022)",
        },
        {
            "gene": "CYP2C19",
            "phenotype_match": ["Intermediate Metabolizer"],
            "risk_label": "Adjust Dosage",
            "severity": "Moderate",
            "confidence": 0.78,
            "clinical_action": "Reduced activation of clopidogrel. Consider alternative antiplatelet if high cardiovascular risk.",
            "alternatives": ["Prasugrel", "Ticagrelor"],
            "guideline": "CPIC guideline for clopidogrel and CYP2C19 (2013, updated 2022)",
        },
        {
            "gene": "CYP2C19",
            "phenotype_match": ["Rapid Metabolizer", "Ultrarapid Metabolizer"],
            "risk_label": "Safe",
            "severity": "Low",
            "confidence": 0.88,
            "clinical_action": "Enhanced clopidogrel activation. Use label-recommended dosing.",
            "guideline": "CPIC guideline for clopidogrel and CYP2C19 (2013, updated 2022)",
        },
        {
            "gene": "CYP2C19",
            "phenotype_match": ["Normal Metabolizer"],
            "risk_label": "Safe",
            "severity": "Low",
            "confidence": 0.90,
            "clinical_action": "Standard clopidogrel dosing recommended.",
            "guideline": "CPIC guideline for clopidogrel and CYP2C19 (2013, updated 2022)",
        },
    ],

    # ── STATINS ───────────────────────────────────────────────────────────────
    "SIMVASTATIN": [
        {
            "gene": "SLCO1B1",
            "phenotype_match": ["Poor Function", "Decreased Function"],
            "phenotype_contains": "risk",
            "risk_label": "Toxic",
            "severity": "High",
            "confidence": 0.92,
            "clinical_action": "High risk of simvastatin-induced myopathy due to reduced hepatic uptake. Use pravastatin or rosuvastatin. If simvastatin must be used, limit dose to 20 mg/day.",
            "alternatives": ["Pravastatin", "Rosuvastatin", "Atorvastatin (lower risk)"],
            "dose_adjustment": "Maximum simvastatin dose 20 mg/day if no alternative available.",
            "monitoring": "Monitor for muscle pain, weakness, elevated CK.",
            "guideline": "CPIC guideline for statins and SLCO1B1, ABCG2, CYP2C9 (2022)",
        },
        {
            "gene": "SLCO1B1",
            "phenotype_match": ["Normal Function"],
            "risk_label": "Safe",
            "severity": "Low",
            "confidence": 0.88,
            "clinical_action": "Standard simvastatin dosing. Routine monitoring.",
            "guideline": "CPIC guideline for statins and SLCO1B1, ABCG2, CYP2C9 (2022)",
        },
    ],

    "ATORVASTATIN": [
        {
            "gene": "SLCO1B1",
            "phenotype_match": ["Poor Function"],
            "risk_label": "Adjust Dosage",
            "severity": "Moderate",
            "confidence": 0.78,
            "clinical_action": "Increased atorvastatin exposure. Use lowest effective dose and monitor for myopathy.",
            "dose_adjustment": "Consider dose reduction. Max 40 mg/day.",
            "guideline": "CPIC guideline for statins and SLCO1B1 (2022)",
        },
    ],

    # ── THIOPURINES ───────────────────────────────────────────────────────────
    "AZATHIOPRINE": [
        {
            "gene": "TPMT",
            "phenotype_match": ["Poor Metabolizer"],
            "risk_label": "Toxic",
            "severity": "Critical",
            "confidence": 0.97,
            "clinical_action": "TPMT-deficient patient. Life-threatening myelosuppression risk at standard doses. Use non-thiopurine immunosuppressant or reduce dose to 10% with weekly CBC monitoring.",
            "alternatives": ["Mycophenolate mofetil", "Methotrexate"],
            "dose_adjustment": "If thiopurine required: reduce dose to 10% of standard, titrate based on CBC.",
            "monitoring": "Weekly CBC for first month, then bi-weekly.",
            "guideline": "CPIC guideline for thiopurines and TPMT, NUDT15 (2018, updated 2021)",
        },
        {
            "gene": "TPMT",
            "phenotype_match": ["Intermediate Metabolizer"],
            "risk_label": "Adjust Dosage",
            "severity": "Moderate",
            "confidence": 0.88,
            "clinical_action": "Reduced TPMT activity. Start at 50% of standard dose and titrate based on tolerance and CBC.",
            "dose_adjustment": "Reduce initial dose by 30–50%.",
            "monitoring": "CBC every 2 weeks for first 3 months.",
            "guideline": "CPIC guideline for thiopurines and TPMT, NUDT15 (2018, updated 2021)",
        },
        {
            "gene": "TPMT",
            "phenotype_match": ["Normal Metabolizer"],
            "risk_label": "Safe",
            "severity": "Low",
            "confidence": 0.88,
            "clinical_action": "Standard dosing. Routine CBC monitoring per label.",
            "guideline": "CPIC guideline for thiopurines and TPMT, NUDT15 (2018, updated 2021)",
        },
    ],

    "MERCAPTOPURINE": [
        {
            "gene": "TPMT",
            "phenotype_match": ["Poor Metabolizer"],
            "risk_label": "Toxic",
            "severity": "Critical",
            "confidence": 0.97,
            "clinical_action": "CONTRAINDICATED at standard doses. Use 10% of standard dose with aggressive CBC monitoring or select alternative.",
            "alternatives": ["Mycophenolate mofetil"],
            "guideline": "CPIC guideline for thiopurines and TPMT, NUDT15 (2018, updated 2021)",
        },
        {
            "gene": "TPMT",
            "phenotype_match": ["Intermediate Metabolizer"],
            "risk_label": "Adjust Dosage",
            "severity": "High",
            "confidence": 0.90,
            "clinical_action": "Start at 30–70% of standard dose, titrate based on CBC and clinical response.",
            "dose_adjustment": "Reduce dose by 30–70%.",
            "guideline": "CPIC guideline for thiopurines and TPMT, NUDT15 (2018, updated 2021)",
        },
    ],

    "THIOGUANINE": [
        {
            "gene": "TPMT",
            "phenotype_match": ["Poor Metabolizer"],
            "risk_label": "Toxic",
            "severity": "Critical",
            "confidence": 0.95,
            "clinical_action": "Reduce dose to 10% with weekly CBC monitoring or use non-thiopurine alternative.",
            "alternatives": ["Cytarabine"],
            "guideline": "CPIC guideline for thiopurines and TPMT, NUDT15 (2018, updated 2021)",
        },
    ],

    # ── FLUOROPYRIMIDINES ─────────────────────────────────────────────────────
    "FLUOROURACIL": [
        {
            "gene": "DPYD",
            "phenotype_match": ["Poor Metabolizer"],
            "risk_label": "Toxic",
            "severity": "Critical",
            "confidence": 0.97,
            "clinical_action": "CONTRAINDICATED. DPYD-deficient patient has <1% residual enzyme activity. Life-threatening 5-FU toxicity. Use alternative chemotherapy.",
            "alternatives": ["Irinotecan-based regimens (if applicable)", "Oxaliplatin"],
            "guideline": "CPIC guideline for fluoropyrimidines and DPYD (2017, updated 2022); EMA recommendation",
        },
        {
            "gene": "DPYD",
            "phenotype_match": ["Intermediate Metabolizer"],
            "risk_label": "Adjust Dosage",
            "severity": "High",
            "confidence": 0.90,
            "clinical_action": "Reduce starting dose by 50%. If well-tolerated after 2 cycles consider dose escalation with close monitoring.",
            "dose_adjustment": "Start at 50% of standard dose.",
            "monitoring": "CBC, LFTs, and toxicity assessment each cycle.",
            "guideline": "CPIC guideline for fluoropyrimidines and DPYD (2017, updated 2022); EMA recommendation",
        },
        {
            "gene": "DPYD",
            "phenotype_match": ["Normal Metabolizer"],
            "risk_label": "Safe",
            "severity": "Low",
            "confidence": 0.88,
            "clinical_action": "Standard dosing per oncology protocol.",
            "guideline": "CPIC guideline for fluoropyrimidines and DPYD (2017, updated 2022)",
        },
    ],

    "CAPECITABINE": [
        {
            "gene": "DPYD",
            "phenotype_match": ["Poor Metabolizer"],
            "risk_label": "Toxic",
            "severity": "Critical",
            "confidence": 0.96,
            "clinical_action": "CONTRAINDICATED. Capecitabine is a prodrug of 5-FU. Use alternative therapy.",
            "guideline": "CPIC guideline for fluoropyrimidines and DPYD (2017, updated 2022)",
        },
        {
            "gene": "DPYD",
            "phenotype_match": ["Intermediate Metabolizer"],
            "risk_label": "Adjust Dosage",
            "severity": "High",
            "confidence": 0.90,
            "clinical_action": "Reduce starting dose to 50%. Monitor for fluoropyrimidine toxicity.",
            "dose_adjustment": "Start at 50% of standard dose.",
            "guideline": "CPIC guideline for fluoropyrimidines and DPYD (2017, updated 2022)",
        },
    ],

    # ── ANTIDEPRESSANTS ───────────────────────────────────────────────────────
    "AMITRIPTYLINE": [
        {
            "gene": "CYP2D6",
            "phenotype_match": ["Poor Metabolizer"],
            "risk_label": "Toxic",
            "severity": "High",
            "confidence": 0.88,
            "clinical_action": "Reduced amitriptyline metabolism. High plasma levels possible. Reduce dose by 50% or use alternative (nortriptyline at reduced dose).",
            "dose_adjustment": "Reduce dose to 50% of standard.",
            "alternatives": ["SSRIs", "SNRIs"],
            "guideline": "CPIC guideline for tricyclic antidepressants and CYP2D6, CYP2C19 (2016)",
        },
        {
            "gene": "CYP2C19",
            "phenotype_match": ["Poor Metabolizer"],
            "risk_label": "Adjust Dosage",
            "severity": "Moderate",
            "confidence": 0.80,
            "clinical_action": "Reduced demethylation of amitriptyline. Use 50% of standard dose or alternative.",
            "dose_adjustment": "Reduce initial dose by 50%.",
            "guideline": "CPIC guideline for tricyclic antidepressants and CYP2D6, CYP2C19 (2016)",
        },
    ],

    "CITALOPRAM": [
        {
            "gene": "CYP2C19",
            "phenotype_match": ["Poor Metabolizer"],
            "risk_label": "Adjust Dosage",
            "severity": "Moderate",
            "confidence": 0.85,
            "clinical_action": "Reduced citalopram metabolism → elevated plasma levels → QTc prolongation risk. Reduce dose by 50%. Maximum 20 mg/day.",
            "dose_adjustment": "Maximum dose 20 mg/day.",
            "monitoring": "ECG monitoring recommended.",
            "guideline": "CPIC guideline for SSRIs and CYP2C19 (2015); FDA Drug Safety Communication",
        },
        {
            "gene": "CYP2C19",
            "phenotype_match": ["Ultrarapid Metabolizer"],
            "risk_label": "Ineffective",
            "severity": "Moderate",
            "confidence": 0.75,
            "clinical_action": "Rapid citalopram metabolism may reduce efficacy. Consider alternative SSRI.",
            "alternatives": ["Sertraline", "Mirtazapine"],
            "guideline": "CPIC guideline for SSRIs and CYP2C19 (2015)",
        },
    ],
}


# ─────────────────────────────────────────────────────────────────────────────
# GENE PRIORITY ORDER — which gene to evaluate first for a given drug
# ─────────────────────────────────────────────────────────────────────────────
DRUG_PRIMARY_GENE: dict[str, str] = {
    "CODEINE":       "CYP2D6",
    "TRAMADOL":      "CYP2D6",
    "WARFARIN":      "CYP2C9",
    "PHENYTOIN":     "CYP2C9",
    "CLOPIDOGREL":   "CYP2C19",
    "SIMVASTATIN":   "SLCO1B1",
    "ATORVASTATIN":  "SLCO1B1",
    "AZATHIOPRINE":  "TPMT",
    "MERCAPTOPURINE":"TPMT",
    "THIOGUANINE":   "TPMT",
    "FLUOROURACIL":  "DPYD",
    "CAPECITABINE":  "DPYD",
    "AMITRIPTYLINE": "CYP2D6",
    "CITALOPRAM":    "CYP2C19",
}


def _phenotype_matches(phenotype: str, match_list: list[str]) -> bool:
    """
    Check if the patient phenotype matches a rule's phenotype_match list.
    Also does partial substring matching for SLCO1B1 risk descriptions.
    """
    phenotype_lower = phenotype.lower()
    for m in match_list:
        if m.lower() in phenotype_lower or phenotype_lower in m.lower():
            return True
    return False


def assess_drug_risk(
    drug: str,
    phenotype_profile: dict[str, dict]
) -> RiskResult:
    """
    Main risk assessment function.

    Parameters
    ----------
    drug : str
        Drug name (case-insensitive).
    phenotype_profile : dict
        Output from phenotype_mapper.map_phenotypes()
        Keys are gene names; values have .diplotype, .phenotype, etc.

    Returns
    -------
    RiskResult dataclass instance.
    """
    drug_upper = drug.upper().strip()
    rules = DRUG_RULES.get(drug_upper)

    primary_gene = DRUG_PRIMARY_GENE.get(drug_upper, "Unknown")

    if not rules:
        # Drug not in our database
        gene_data = phenotype_profile.get(primary_gene, {})
        return RiskResult(
            drug=drug_upper,
            risk_label="Unknown",
            severity="Low",
            confidence_score=0.0,
            primary_gene=primary_gene,
            phenotype=gene_data.get("phenotype", "Unknown"),
            diplotype=gene_data.get("diplotype", "Unknown"),
            detected_variants=gene_data.get("detected_variants", []),
            clinical_action=f"No pharmacogenomic guideline available for {drug}. Use standard prescribing information.",
            guideline="No CPIC/DPWG guideline available",
        )

    # Evaluate rules in priority order
    for rule in rules:
        gene = rule["gene"]
        gene_data = phenotype_profile.get(gene, {})
        patient_phenotype = gene_data.get("phenotype", "")

        # For SLCO1B1 also check myopathy_risk
        if gene == "SLCO1B1":
            patient_phenotype = (
                gene_data.get("phenotype", "") + " " +
                gene_data.get("myopathy_risk", "")
            ).strip()

        if not patient_phenotype:
            continue  # No data for this gene, try next rule

        if _phenotype_matches(patient_phenotype, rule.get("phenotype_match", [])):
            logger.info(
                "Drug %s matched rule: gene=%s phenotype=%s → %s",
                drug_upper, gene, patient_phenotype, rule["risk_label"]
            )
            return RiskResult(
                drug=drug_upper,
                risk_label=rule["risk_label"],
                severity=rule["severity"],
                confidence_score=rule["confidence"],
                primary_gene=gene,
                phenotype=patient_phenotype.strip(),
                diplotype=gene_data.get("diplotype", "Unknown"),
                detected_variants=gene_data.get("detected_variants", []),
                clinical_action=rule.get("clinical_action", ""),
                alternative_drugs=rule.get("alternatives", []),
                dose_adjustment=rule.get("dose_adjustment"),
                monitoring=rule.get("monitoring"),
                guideline=rule.get("guideline", ""),
            )

    # No rule matched → Safe with low confidence
    gene_data = phenotype_profile.get(primary_gene, {})
    return RiskResult(
        drug=drug_upper,
        risk_label="Safe",
        severity="Low",
        confidence_score=0.70,
        primary_gene=primary_gene,
        phenotype=gene_data.get("phenotype", "Normal Metabolizer"),
        diplotype=gene_data.get("diplotype", "*1/*1"),
        detected_variants=gene_data.get("detected_variants", []),
        clinical_action="No pharmacogenomic risk factors identified. Use standard prescribing information.",
        guideline="CPIC / DPWG guidelines consulted",
    )


def assess_multiple_drugs(
    drugs: list[str],
    phenotype_profile: dict[str, dict]
) -> list[RiskResult]:
    """Assess risk for a list of drugs against a patient's phenotype profile."""
    return [assess_drug_risk(drug, phenotype_profile) for drug in drugs]