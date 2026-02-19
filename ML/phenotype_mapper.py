"""
phenotype_mapper.py — PharmaGuard Diplotype & Phenotype Mapper
Maps detected variants → star alleles → diplotypes → phenotypes
following CPIC guidelines.

Supports: CYP2D6, CYP2C19, CYP2C9, SLCO1B1, TPMT, DPYD, HLA-B, HLA-A
"""

# rift26-hackathon\ML\phenotype_mapper.py

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# ACTIVITY SCORES per star allele (CPIC activity value model)
# ─────────────────────────────────────────────────────────────────────────────
ACTIVITY_SCORES = {
    "CYP2D6": {
        "*1":  1.0, "*2":  1.0, "*10": 0.25, "*17": 0.5,
        "*29": 0.0, "*41": 0.5, "*3":  0.0,  "*4":  0.0,
        "*5":  0.0, "*6":  0.0, "*7":  0.0,  "*8":  0.0,
        "xN":  2.0,
    },
    "CYP2C9": {
        "*1": 1.0, "*2": 0.5, "*3": 0.0,
        "*5": 0.0, "*6": 0.0, "*11": 0.5,
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# DIPLOTYPE → PHENOTYPE LOOKUP TABLES
# ─────────────────────────────────────────────────────────────────────────────

CYP2D6_DIPLOTYPE_PHENOTYPE = {
    "*1/*1":   "Normal Metabolizer",
    "*1/*2":   "Normal Metabolizer",
    "*2/*2":   "Normal Metabolizer",
    "*1/*4":   "Intermediate Metabolizer",
    "*1/*5":   "Intermediate Metabolizer",
    "*1/*10":  "Intermediate Metabolizer",
    "*1/*41":  "Intermediate Metabolizer",
    "*4/*10":  "Intermediate Metabolizer",
    "*10/*10": "Intermediate Metabolizer",
    "*41/*41": "Intermediate Metabolizer",
    "*4/*4":   "Poor Metabolizer",
    "*4/*5":   "Poor Metabolizer",
    "*3/*4":   "Poor Metabolizer",
    "*5/*5":   "Poor Metabolizer",
    "*3/*5":   "Poor Metabolizer",
    "*6/*6":   "Poor Metabolizer",
    "*1/*1xN": "Ultrarapid Metabolizer",
    "*2/*2xN": "Ultrarapid Metabolizer",
    "*1/*2xN": "Ultrarapid Metabolizer",
}

CYP2C19_DIPLOTYPE_PHENOTYPE = {
    "*1/*1":   "Normal Metabolizer",
    "*1/*17":  "Rapid Metabolizer",
    "*17/*17": "Ultrarapid Metabolizer",
    "*1/*2":   "Intermediate Metabolizer",
    "*1/*3":   "Intermediate Metabolizer",
    "*2/*17":  "Intermediate Metabolizer",
    "*1/*4":   "Intermediate Metabolizer",
    "*2/*2":   "Poor Metabolizer",
    "*2/*3":   "Poor Metabolizer",
    "*3/*3":   "Poor Metabolizer",
    "*2/*4":   "Poor Metabolizer",
}

CYP2C9_DIPLOTYPE_PHENOTYPE = {
    "*1/*1": "Normal Metabolizer",
    "*1/*2": "Intermediate Metabolizer",
    "*1/*3": "Intermediate Metabolizer",
    "*2/*2": "Intermediate Metabolizer",
    "*2/*3": "Poor Metabolizer",
    "*3/*3": "Poor Metabolizer",
    "*1/*5": "Intermediate Metabolizer",
    "*1/*6": "Intermediate Metabolizer",
}

SLCO1B1_DIPLOTYPE_PHENOTYPE = {
    "*1a/*1a": ("Normal Function",    "Normal myopathy risk"),
    "*1a/*1b": ("Normal Function",    "Normal myopathy risk"),
    "*1b/*1b": ("Normal Function",    "Normal myopathy risk"),
    "*1a/*5":  ("Decreased Function", "Intermediate myopathy risk"),
    "*1b/*5":  ("Decreased Function", "Intermediate myopathy risk"),
    "*5/*5":   ("Poor Function",      "High myopathy risk"),
    "*5/*15":  ("Poor Function",      "High myopathy risk"),
    "*15/*15": ("Poor Function",      "High myopathy risk"),
}

TPMT_DIPLOTYPE_PHENOTYPE = {
    "*1/*1":   "Normal Metabolizer",
    "*1/*2":   "Intermediate Metabolizer",
    "*1/*3A":  "Intermediate Metabolizer",
    "*1/*3B":  "Intermediate Metabolizer",
    "*1/*3C":  "Intermediate Metabolizer",
    "*1/*4":   "Intermediate Metabolizer",
    "*2/*3A":  "Poor Metabolizer",
    "*3A/*3A": "Poor Metabolizer",
    "*3B/*3C": "Poor Metabolizer",
    "*3C/*3C": "Poor Metabolizer",
    "*2/*2":   "Poor Metabolizer",
}

DPYD_DIPLOTYPE_PHENOTYPE = {
    "*1/*1":       "Normal Metabolizer",
    "*1/*2A":      "Intermediate Metabolizer",
    "*1/*13":      "Intermediate Metabolizer",
    "*2A/*2A":     "Poor Metabolizer",
    "*2A/*13":     "Poor Metabolizer",
    "*13/*13":     "Poor Metabolizer",
    "*1/HapB3":    "Intermediate Metabolizer",
    "HapB3/HapB3": "Intermediate Metabolizer",
}

GENE_PHENOTYPE_TABLES = {
    "CYP2D6":  CYP2D6_DIPLOTYPE_PHENOTYPE,
    "CYP2C19": CYP2C19_DIPLOTYPE_PHENOTYPE,
    "CYP2C9":  CYP2C9_DIPLOTYPE_PHENOTYPE,
    "TPMT":    TPMT_DIPLOTYPE_PHENOTYPE,
    "DPYD":    DPYD_DIPLOTYPE_PHENOTYPE,
}

SLCO1B1_RS4149056_PHENOTYPE = {
    "TT": ("Normal Function",    "Normal myopathy risk",       "*1a/*1a"),
    "TC": ("Decreased Function", "Intermediate myopathy risk", "*1a/*5"),
    "CT": ("Decreased Function", "Intermediate myopathy risk", "*1a/*5"),
    "CC": ("Poor Function",      "High myopathy risk",         "*5/*5"),
}

# ─────────────────────────────────────────────────────────────────────────────
# HLA-B tag SNPs
# rs2395029 / rs9264942  → HLA-B*57:01  (abacavir hypersensitivity)
# rs3909184 / rs2844682  → HLA-B*15:02  (carbamazepine SJS/TEN)
# ─────────────────────────────────────────────────────────────────────────────
HLA_B_5701_RSIDS = {"rs2395029", "rs9264942"}
HLA_B_1502_RSIDS = {"rs3909184", "rs2844682"}

# HLA-A tag SNPs
# rs1061235 → HLA-A*31:01 (carbamazepine DRESS)
HLA_A_3101_RSIDS = {"rs1061235"}


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _star_allele_from_variant(variant: dict) -> str:
    sa = variant.get("star_allele", "unknown")
    return sa if sa and sa != "unknown" else "*?"


def _infer_diplotype_from_variants(gene: str, variants: list[dict]) -> tuple[str, str]:
    if not variants:
        return "*1/*1", _phenotype_lookup(gene, "*1/*1")

    alleles = []
    for v in variants:
        sa = _star_allele_from_variant(v)
        zyg = v.get("zygosity", "heterozygous")
        if zyg == "homozygous_alt":
            alleles.extend([sa, sa])
        else:
            alleles.append(sa)

    if len(alleles) == 0:
        diplotype = "*1/*1"
    elif len(alleles) == 1:
        diplotype = f"*1/{alleles[0]}"
    else:
        sorted_alleles = sorted(alleles[:2])
        diplotype = f"{sorted_alleles[0]}/{sorted_alleles[1]}"

    phenotype = _phenotype_lookup(gene, diplotype)
    return diplotype, phenotype


def _phenotype_lookup(gene: str, diplotype: str) -> str:
    parts = diplotype.split("/")
    if len(parts) == 2:
        canonical   = f"{parts[0]}/{parts[1]}"
        alternative = f"{parts[1]}/{parts[0]}"
    else:
        canonical = alternative = diplotype

    if gene == "SLCO1B1":
        val = (SLCO1B1_DIPLOTYPE_PHENOTYPE.get(canonical) or
               SLCO1B1_DIPLOTYPE_PHENOTYPE.get(alternative))
        return val[0] if val else "Indeterminate"

    table = GENE_PHENOTYPE_TABLES.get(gene, {})
    phenotype = table.get(canonical) or table.get(alternative)
    if phenotype:
        return phenotype

    # Activity-score fallback for CYP2D6 / CYP2C9
    if gene in ACTIVITY_SCORES and len(parts) == 2:
        scores = ACTIVITY_SCORES[gene]
        total = scores.get(parts[0], 1.0) + scores.get(parts[1], 1.0)
        if gene == "CYP2D6":
            if total == 0:      return "Poor Metabolizer"
            elif total < 1.0:   return "Intermediate Metabolizer"
            elif total <= 2.25: return "Normal Metabolizer"
            else:               return "Ultrarapid Metabolizer"
        elif gene == "CYP2C9":
            if total == 0:      return "Poor Metabolizer"
            elif total < 1.5:   return "Intermediate Metabolizer"
            else:               return "Normal Metabolizer"

    return "Indeterminate"


def _handle_slco1b1(variants: list[dict]) -> tuple[str, str, str]:
    for v in variants:
        if v.get("rsid") == "rs4149056":
            ref = v.get("ref", "T")
            alt = v.get("alt", "C")
            zyg = v.get("zygosity", "heterozygous")
            if zyg == "homozygous_alt":
                geno_key = alt + alt
            elif zyg == "heterozygous":
                geno_key = ref + alt
            else:
                geno_key = ref + ref
            result = SLCO1B1_RS4149056_PHENOTYPE.get(
                geno_key.upper(),
                ("Indeterminate", "Unknown myopathy risk", "*?/*?")
            )
            return result[2], result[0], result[1]
    return "*1a/*1a", "Normal Function", "Normal myopathy risk"


def _handle_hla_b(variants: list[dict]) -> tuple[str, str]:
    """
    Determine HLA-B phenotype from detected variants.
    Returns (diplotype, phenotype) where phenotype is "Positive" or "Negative".

    Checks for HLA-B*57:01 (abacavir) and HLA-B*15:02 (carbamazepine) tag SNPs.
    Only heterozygous or homozygous_alt variants count — 0/0 are skipped by parser.
    """
    rsids_present = {
        v.get("rsid")
        for v in variants
        if v.get("zygosity") in ("heterozygous", "homozygous_alt") and v.get("rsid")
    }

    if rsids_present & HLA_B_5701_RSIDS:
        return "*57:01 Positive", "Positive"

    if rsids_present & HLA_B_1502_RSIDS:
        return "*15:02 Positive", "Positive"

    return "Wildtype", "Negative"


def _handle_hla_a(variants: list[dict]) -> tuple[str, str]:
    """
    Determine HLA-A phenotype from detected variants.
    Returns (diplotype, phenotype) where phenotype is "Positive" or "Negative".
    """
    rsids_present = {
        v.get("rsid")
        for v in variants
        if v.get("zygosity") in ("heterozygous", "homozygous_alt") and v.get("rsid")
    }

    if rsids_present & HLA_A_3101_RSIDS:
        return "*31:01 Positive", "Positive"

    return "Wildtype", "Negative"


# ─────────────────────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────────────────────

def map_phenotypes(grouped_variants: dict[str, list[dict]]) -> dict[str, dict]:
    """
    Map all PGx gene variants to diplotypes and phenotypes.

    Parameters
    ----------
    grouped_variants : dict  gene → list of variant dicts

    Returns
    -------
    dict  gene → {diplotype, phenotype, myopathy_risk, detected_variants, raw_variants}
    """
    results = {}

    for gene, variants in grouped_variants.items():

        # ── SLCO1B1 — transport function model ───────────────────────────────
        if gene == "SLCO1B1":
            diplotype, phenotype, myopathy_risk = _handle_slco1b1(variants)
            results[gene] = {
                "diplotype":         diplotype,
                "phenotype":         phenotype,
                "myopathy_risk":     myopathy_risk,
                "detected_variants": [v.get("rsid") for v in variants if v.get("rsid")],
                "raw_variants":      variants,
            }

        # ── HLA-B — presence/absence model ───────────────────────────────────
        elif gene == "HLA-B":
            diplotype, phenotype = _handle_hla_b(variants)
            results[gene] = {
                "diplotype":         diplotype,
                "phenotype":         phenotype,
                "myopathy_risk":     None,
                "detected_variants": [v.get("rsid") for v in variants if v.get("rsid")],
                "raw_variants":      variants,
            }

        # ── HLA-A — presence/absence model ───────────────────────────────────
        elif gene == "HLA-A":
            diplotype, phenotype = _handle_hla_a(variants)
            results[gene] = {
                "diplotype":         diplotype,
                "phenotype":         phenotype,
                "myopathy_risk":     None,
                "detected_variants": [v.get("rsid") for v in variants if v.get("rsid")],
                "raw_variants":      variants,
            }

        # ── All other genes — star-allele / activity-score model ──────────────
        else:
            diplotype, phenotype = _infer_diplotype_from_variants(gene, variants)
            results[gene] = {
                "diplotype":         diplotype,
                "phenotype":         phenotype,
                "myopathy_risk":     None,
                "detected_variants": [v.get("rsid") for v in variants if v.get("rsid")],
                "raw_variants":      variants,
            }

        logger.debug(
            "Gene %s → diplotype=%s phenotype=%s",
            gene, results[gene]["diplotype"], results[gene]["phenotype"]
        )

    # ── CRITICAL: Always inject HLA-B and HLA-A defaults ─────────────────────
    # If no HLA variants detected in VCF, mapper never creates these entries.
    # Without defaults, pgx_rules.py gets empty gene_data → no rule matches →
    # ABACAVIR and CARBAMAZEPINE return "Unknown".
    # Default "Negative" → rules match → returns "Safe" correctly.
    if "HLA-B" not in results:
        results["HLA-B"] = {
            "diplotype":         "Wildtype",
            "phenotype":         "Negative",
            "myopathy_risk":     None,
            "detected_variants": [],
            "raw_variants":      [],
        }

    if "HLA-A" not in results:
        results["HLA-A"] = {
            "diplotype":         "Wildtype",
            "phenotype":         "Negative",
            "myopathy_risk":     None,
            "detected_variants": [],
            "raw_variants":      [],
        }

    return results
