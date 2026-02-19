"""
llm_explainer.py — PharmaGuard LLM Explanation Generator
Uses Anthropic Claude API for real LLM-generated clinical explanations.
Falls back to template-based generation if API key is not set.
"""

import os
import logging

logger = logging.getLogger(__name__)

try:
    import anthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    logger.warning("anthropic package not installed. Using template fallback.")


# ─────────────────────────────────────────────────────────────────────────────
# TEMPLATE FALLBACK DATA
# ─────────────────────────────────────────────────────────────────────────────

GENE_MECHANISMS = {
    "CYP2D6": {
        "PM": "CYP2D6 is a hepatic cytochrome P450 enzyme metabolising ~25% of clinical drugs. Biallelic loss-of-function variants (e.g. *4, *5, *6) abolish enzymatic activity. For prodrugs like codeine requiring O-demethylation to active morphine, this causes therapeutic failure. For active parent drugs, toxic accumulation occurs at standard doses.",
        "UM": "CYP2D6 gene duplication (*1xN, *2xN) markedly increases enzymatic capacity. For codeine, ultrarapid morphine conversion produces plasma levels 3-5x higher than normal, causing life-threatening respiratory depression. FDA has issued black box warnings for codeine in ultrarapid metabolizers.",
        "IM": "Decreased-function CYP2D6 alleles (*10, *41, *17) yield activity scores of 0.25-1.25. Enzyme capacity is reduced but not absent, causing 1.5-2x elevated drug exposure. Prodrug activation is reduced (lower efficacy) while parent compound clearance is delayed (mild toxicity risk).",
        "NM": "Two functional CYP2D6 alleles confirm normal hepatic enzyme activity. Drug metabolism proceeds at expected rates yielding predictable plasma concentrations. Standard label dosing is appropriate.",
    },
    "CYP2C19": {
        "PM": "Homozygous CYP2C19 loss-of-function variants (*2/*2, *2/*3) eliminate functional enzyme. For clopidogrel requiring two-step CYP2C19 bioactivation, <10% of normal active metabolite is generated, rendering antiplatelet effect effectively absent and leaving the patient at high thrombotic risk.",
        "UM": "CYP2C19*17 (rs12248560) increases transcription yielding enhanced enzyme activity. For CYP2C19-metabolised antidepressants (citalopram, escitalopram), rapid clearance reduces plasma concentrations below therapeutic levels, compromising efficacy.",
        "IM": "Heterozygous CYP2C19 variants (*1/*2, *1/*3) produce intermediate activity. For clopidogrel, reduced activation leads to ~25-30% increased risk of major adverse cardiovascular events compared to normal metabolizers.",
        "NM": "Wildtype CYP2C19 alleles confirm normal enzyme activity. Standard pharmacokinetics expected for all CYP2C19 substrates including clopidogrel and antidepressants.",
        "RM": "Single CYP2C19*17 allele confers modestly increased enzyme activity. Most clinical scenarios require no adjustment, though enhanced clopidogrel activation may marginally increase bleeding risk.",
    },
    "CYP2C9": {
        "PM": "CYP2C9 metabolises S-warfarin (the potent enantiomer), phenytoin and NSAIDs. Biallelic loss-of-function variants reduce activity to <5% of wildtype, causing 2-3 fold elevated warfarin plasma concentrations at standard doses with life-threatening bleeding risk.",
        "IM": "Decreased-function CYP2C9 alleles (*2, *3) reduce total activity to 25-75% of normal. S-warfarin clearance is partially impaired requiring 15-35% dose reduction to achieve stable INR.",
        "NM": "Wildtype CYP2C9 confirms full enzyme activity. Standard warfarin pharmacokinetics expected with routine INR monitoring.",
    },
    "SLCO1B1": {
        "Poor Function": "SLCO1B1 encodes hepatic OATP1B1 transporter mediating statin uptake from portal blood into hepatocytes. Homozygous rs4149056 (CC, *5/*5) reduces transport capacity by 70-90%, causing markedly elevated systemic simvastatin concentrations and dramatically increased myopathy risk including potentially fatal rhabdomyolysis.",
        "Decreased Function": "Heterozygous rs4149056 C allele (TC) partially reduces OATP1B1 hepatic uptake. Simvastatin AUC increases ~2-fold conferring intermediate myopathy risk. Pravastatin and rosuvastatin are less OATP1B1-dependent and represent safer alternatives.",
        "Normal Function": "Wildtype SLCO1B1 (TT) confirms normal OATP1B1-mediated hepatic statin uptake. Standard statin dosing is appropriate.",
    },
    "TPMT": {
        "PM": "TPMT S-methylates and inactivates thiopurines (azathioprine, mercaptopurine). In TPMT-deficient patients (biallelic loss-of-function), metabolism shifts entirely to cytotoxic thioguanine nucleotides (TGN), causing TGN accumulation in hematopoietic cells and potentially fatal myelosuppression at standard doses.",
        "IM": "Heterozygous TPMT variants reduce activity to ~50% of normal, causing partial TGN accumulation. Risk of myelosuppression is elevated especially with concurrent allopurinol. Dose reductions of 30-50% with enhanced CBC monitoring are required.",
        "NM": "Normal TPMT activity ensures adequate thiopurine inactivation. Standard dosing with routine CBC monitoring per label is appropriate.",
    },
    "DPYD": {
        "PM": "DPYD encodes dihydropyrimidine dehydrogenase (DPD), responsible for >80% of 5-FU catabolism. Biallelic DPYD loss-of-function (*2A IVS14+1G>A, *13) eliminates DPD activity, causing life-threatening 5-FU accumulation with severe mucositis, myelosuppression, and neurotoxicity at standard doses.",
        "IM": "Heterozygous DPYD variants (*1/*2A, *1/HapB3) reduce DPD to 30-70% of normal. Fluoropyrimidine exposure is significantly increased. CPIC and EMA recommend 50% dose reduction with escalation only if initial cycles are well-tolerated.",
        "NM": "Normal DPYD activity ensures adequate 5-FU catabolism. Standard fluoropyrimidine dosing per oncology protocol is appropriate.",
    },
}

DRUG_DOSING = {
    "CODEINE": {
        "PM": "Avoid codeine. Prescribe morphine or hydromorphone at standard doses.",
        "UM": "Contraindicated. Use alternative opioid (morphine, buprenorphine) with careful titration.",
        "IM": "Reduced analgesic effect. Switch to morphine or oxycodone at standard doses.",
        "NM": "Standard codeine 30-60mg every 4-6 hours. No pharmacogenomic adjustment needed.",
    },
    "WARFARIN": {
        "PM": "Initiate at ≤2mg/day. Twice-weekly INR until stable. Expect 40-70% lower maintenance dose.",
        "IM": "Start at 75% of algorithm-predicted dose. Weekly INR for first month.",
        "NM": "Use validated dosing algorithm (IWPC). Standard monitoring.",
    },
    "CLOPIDOGREL": {
        "PM": "Switch to prasugrel 10mg/day or ticagrelor 90mg BID. Note prasugrel is contraindicated post-TIA/stroke.",
        "IM": "Consider ticagrelor or prasugrel in high cardiovascular risk patients.",
        "NM": "Standard clopidogrel 75mg/day. 300-600mg loading for ACS.",
    },
    "SIMVASTATIN": {
        "Poor Function": "Avoid simvastatin. Use pravastatin 40mg or rosuvastatin 10-20mg instead.",
        "Decreased Function": "Limit to maximum 20mg/day. Monitor CK and for myalgia symptoms.",
        "Normal Function": "Standard simvastatin dosing (20-80mg/day) as clinically indicated.",
    },
    "AZATHIOPRINE": {
        "PM": "If required, use 10% of standard dose (0.5-1mg/kg) with weekly CBC.",
        "IM": "Start at 50% of standard dose (1mg/kg). Escalate slowly with bi-weekly CBC.",
        "NM": "Standard 1.5-2.5mg/kg/day with monthly CBC monitoring.",
    },
    "FLUOROURACIL": {
        "PM": "Do NOT administer 5-FU or capecitabine. Select alternative cytotoxic regimen.",
        "IM": "Reduce starting dose by 50%. Escalate after cycle 2 if tolerated.",
        "NM": "Standard 5-FU dosing per protocol. TDM can guide adjustments.",
    },
}


def _template_explanation(gene, phenotype, drug, detected_variants, diplotype, risk_label, clinical_action, guideline):
    """Template-based fallback explanation."""
    drug_upper = drug.upper()
    variant_text = ", ".join(detected_variants) if detected_variants else "no pathogenic variants (wildtype assumed)"

    risk_map = {
        "Safe": "no clinically significant pharmacogenomic risk",
        "Adjust Dosage": "a clinically significant interaction requiring dose modification",
        "Toxic": "HIGH RISK of drug toxicity",
        "Ineffective": "predicted drug INEFFECTIVENESS due to pharmacogenomic factors",
        "Unknown": "an UNKNOWN pharmacogenomic risk profile",
    }

    summary = (
        f"This patient's {gene} genotype ({diplotype}) is classified as {phenotype}. "
        f"Detected pharmacogenomic variants: {variant_text}. "
        f"For {drug_upper}, this phenotype predicts {risk_map.get(risk_label, 'an unclassified interaction')}. "
        f"{clinical_action}"
    )

    gene_mechs = GENE_MECHANISMS.get(gene, {})
    mechanism = next(
        (v for k, v in gene_mechs.items() if k.lower() in phenotype.lower()),
        f"{gene} activity is altered, affecting {drug_upper} pharmacokinetics."
    )

    drug_dosing = DRUG_DOSING.get(drug_upper, {})
    dosing = next((v for k, v in drug_dosing.items() if k.lower() in phenotype.lower()), None)
    if dosing:
        mechanism += f"\n\nDosing Implication: {dosing}"

    guideline_reference = (
        f"{guideline}. Full prescribing guidance at cpicpgx.org and PharmGKB."
        if guideline and "No CPIC" not in guideline
        else f"No specific CPIC guideline for {drug_upper}. Consult FDA Pharmacogenomic Biomarkers table."
    )

    return {"summary": summary, "mechanism": mechanism, "guideline_reference": guideline_reference}


def generate_explanation(gene, phenotype, drug, detected_variants, diplotype, risk_label, clinical_action, guideline):
    """
    Main entry point.
    Uses Claude API if ANTHROPIC_API_KEY is set, else falls back to templates.
    """
    api_key = os.getenv("ANTHROPIC_API_KEY")

    if not api_key or not ANTHROPIC_AVAILABLE:
        logger.info("Using template-based explanation (no API key).")
        return _template_explanation(gene, phenotype, drug, detected_variants, diplotype, risk_label, clinical_action, guideline)

    variant_text = ", ".join(detected_variants) if detected_variants else "no variants detected (wildtype)"

    prompt = f"""You are a clinical pharmacogenomics expert. Generate a structured clinical explanation.

Patient Data:
- Gene: {gene}
- Diplotype: {diplotype}
- Phenotype: {phenotype}
- Drug: {drug}
- Detected Variants: {variant_text}
- Risk Assessment: {risk_label}
- Clinical Action: {clinical_action}
- Guideline: {guideline}

Respond ONLY with a valid JSON object with exactly these 3 keys (no markdown, no extra text):

{{
  "summary": "2-3 sentences: state genotype, phenotype, detected variants, and predicted risk for this drug.",
  "mechanism": "3-4 sentences: explain biological mechanism — enzyme/transporter function, molecular consequence of variant, effect on drug plasma levels or efficacy. Include specific dosing implication.",
  "guideline_reference": "1-2 sentences: cite the specific CPIC/DPWG guideline, recommendation strength, and where to find full guidance."
}}"""

    try:
        client = anthropic.Anthropic(api_key=api_key)
        message = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        )
        import json
        text = message.content[0].text.strip().replace("```json", "").replace("```", "").strip()
        parsed = json.loads(text)
        return {
            "summary":             parsed.get("summary", ""),
            "mechanism":           parsed.get("mechanism", ""),
            "guideline_reference": parsed.get("guideline_reference", ""),
        }
    except Exception as e:
        logger.error("Claude API failed: %s — using template fallback.", e)
        return _template_explanation(gene, phenotype, drug, detected_variants, diplotype, risk_label, clinical_action, guideline)