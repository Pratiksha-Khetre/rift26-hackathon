"""
phenotype_mapper.py — PharmaGuard Diplotype & Phenotype Mapper
Maps detected variants → star alleles → diplotypes → phenotypes
following CPIC guidelines.
"""

# rift26-hackathon\ML\phenotype_mapper.py

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# ACTIVITY SCORES per star allele (CPIC activity value model)
# Used for CYP2D6 and CYP2C9 where gene activity scoring applies.
# 1.0 = fully functional, 0.5 = decreased, 0.0 = non-functional
# ─────────────────────────────────────────────────────────────────────────────
ACTIVITY_SCORES = {
    # CYP2D6
    "CYP2D6": {
        "*1":   1.0,   # Normal function
        "*2":   1.0,   # Normal function
        "*10":  0.25,  # Decreased function
        "*17":  0.5,   # Decreased function
        "*29":  0.0,   # No function
        "*41":  0.5,   # Decreased function
        "*3":   0.0,   # No function (frameshift)
        "*4":   0.0,   # No function (splicing defect)
        "*5":   0.0,   # No function (gene deletion)
        "*6":   0.0,   # No function (frameshift)
        "*7":   0.0,   # No function
        "*8":   0.0,   # No function
        "xN":   2.0,   # Gene duplication adds +1.0 per extra copy
    },
    # CYP2C9
    "CYP2C9": {
        "*1":   1.0,
        "*2":   0.5,
        "*3":   0.0,
        "*5":   0.0,
        "*6":   0.0,
        "*11":  0.5,
    },
}

# ─────────────────────────────────────────────────────────────────────────────
# EXPLICIT DIPLOTYPE → PHENOTYPE LOOKUP TABLES
# Source: CPIC diplotype-phenotype tables (cpicpgx.org)
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
    "*1/*1":  "Normal Metabolizer",
    "*1/*2":  "Intermediate Metabolizer",
    "*1/*3":  "Intermediate Metabolizer",
    "*2/*2":  "Intermediate Metabolizer",
    "*2/*3":  "Poor Metabolizer",
    "*3/*3":  "Poor Metabolizer",
    "*1/*5":  "Intermediate Metabolizer",
    "*1/*6":  "Intermediate Metabolizer",
}

SLCO1B1_DIPLOTYPE_PHENOTYPE = {
    # SLCO1B1 uses a function-based classification for statin myopathy risk
    "*1a/*1a": ("Normal Function",        "Normal myopathy risk"),
    "*1a/*1b": ("Normal Function",        "Normal myopathy risk"),
    "*1b/*1b": ("Normal Function",        "Normal myopathy risk"),
    "*1a/*5":  ("Decreased Function",     "Intermediate myopathy risk"),
    "*1b/*5":  ("Decreased Function",     "Intermediate myopathy risk"),
    "*5/*5":   ("Poor Function",          "High myopathy risk"),
    "*5/*15":  ("Poor Function",          "High myopathy risk"),
    "*15/*15": ("Poor Function",          "High myopathy risk"),
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
    "*1/*1":    "Normal Metabolizer",
    "*1/*2A":   "Intermediate Metabolizer",
    "*1/*13":   "Intermediate Metabolizer",
    "*2A/*2A":  "Poor Metabolizer",
    "*2A/*13":  "Poor Metabolizer",
    "*13/*13":  "Poor Metabolizer",
    "*1/HapB3": "Intermediate Metabolizer",
    "HapB3/HapB3": "Intermediate Metabolizer",
}

# Map each gene to its diplotype-phenotype table
GENE_PHENOTYPE_TABLES = {
    "CYP2D6":  CYP2D6_DIPLOTYPE_PHENOTYPE,
    "CYP2C19": CYP2C19_DIPLOTYPE_PHENOTYPE,
    "CYP2C9":  CYP2C9_DIPLOTYPE_PHENOTYPE,
    "TPMT":    TPMT_DIPLOTYPE_PHENOTYPE,
    "DPYD":    DPYD_DIPLOTYPE_PHENOTYPE,
}

# SLCO1B1 rs4149056 genotype → phenotype (the key clinical SNP)
SLCO1B1_RS4149056_PHENOTYPE = {
    "TT":  ("Normal Function",     "Normal myopathy risk",       "*1a/*1a"),
    "TC":  ("Decreased Function",  "Intermediate myopathy risk", "*1a/*5"),
    "CT":  ("Decreased Function",  "Intermediate myopathy risk", "*1a/*5"),
    "CC":  ("Poor Function",       "High myopathy risk",         "*5/*5"),
}


def _star_allele_from_variant(variant: dict) -> str:
    """Return the star allele for a single variant record."""
    sa = variant.get("star_allele", "unknown")
    return sa if sa and sa != "unknown" else "*?"


def _infer_diplotype_from_variants(gene: str, variants: list[dict]) -> tuple[str, str]:
    """
    Infer the most likely diplotype and phenotype from a list of
    variants for a single gene.

    Returns (diplotype_str, phenotype_str).
    Uses heuristic:
      - No variants detected  → assume *1/*1 (wildtype)
      - One het variant       → *1/variant_allele
      - One hom variant       → variant_allele/variant_allele
      - Multiple variants     → report observed alleles
    """
    if not variants:
        # No variants = wildtype assumption
        return "*1/*1", _phenotype_lookup(gene, "*1/*1")

    # Collect non-wildtype alleles weighted by zygosity
    alleles = []
    for v in variants:
        sa = _star_allele_from_variant(v)
        zyg = v.get("zygosity", "heterozygous")
        if zyg == "homozygous_alt":
            alleles.extend([sa, sa])
        else:
            alleles.append(sa)

    # Deduplicate but preserve count
    if len(alleles) == 0:
        diplotype = "*1/*1"
    elif len(alleles) == 1:
        diplotype = f"*1/{alleles[0]}"
    else:
        # Sort for canonical lookup (lower allele first)
        sorted_alleles = sorted(alleles[:2])
        diplotype = f"{sorted_alleles[0]}/{sorted_alleles[1]}"

    phenotype = _phenotype_lookup(gene, diplotype)
    return diplotype, phenotype


def _phenotype_lookup(gene: str, diplotype: str) -> str:
    """Look up phenotype from diplotype in the appropriate table."""
    # Normalize diplotype for lookup (try both orderings)
    parts = diplotype.split("/")
    if len(parts) == 2:
        canonical   = f"{parts[0]}/{parts[1]}"
        alternative = f"{parts[1]}/{parts[0]}"
    else:
        canonical = alternative = diplotype

    if gene == "SLCO1B1":
        val = SLCO1B1_DIPLOTYPE_PHENOTYPE.get(canonical) \
           or SLCO1B1_DIPLOTYPE_PHENOTYPE.get(alternative)
        if val:
            return val[0]  # return function label
        return "Indeterminate"

    table = GENE_PHENOTYPE_TABLES.get(gene, {})
    phenotype = table.get(canonical) or table.get(alternative)
    if phenotype:
        return phenotype

    # Fallback: activity-score model for CYP2D6 / CYP2C9
    if gene in ACTIVITY_SCORES and len(parts) == 2:
        scores = ACTIVITY_SCORES[gene]
        a1_score = scores.get(parts[0], 1.0)
        a2_score = scores.get(parts[1], 1.0)
        total = a1_score + a2_score
        if gene == "CYP2D6":
            if total == 0:
                return "Poor Metabolizer"
            elif total < 1.0:
                return "Intermediate Metabolizer"
            elif total <= 2.25:
                return "Normal Metabolizer"
            else:
                return "Ultrarapid Metabolizer"
        elif gene == "CYP2C9":
            if total == 0:
                return "Poor Metabolizer"
            elif total < 1.5:
                return "Intermediate Metabolizer"
            else:
                return "Normal Metabolizer"

    return "Indeterminate"


def _handle_slco1b1(variants: list[dict]) -> tuple[str, str, str]:
    """
    Special handler for SLCO1B1 using rs4149056 genotype.
    Returns (diplotype, function_status, myopathy_risk).
    """
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

    # No rs4149056 → assume normal
    return "*1a/*1a", "Normal Function", "Normal myopathy risk"


def map_phenotypes(grouped_variants: dict[str, list[dict]]) -> dict[str, dict]:
    """
    Map all PGx gene variants to diplotypes and phenotypes.

    Parameters
    ----------
    grouped_variants : dict gene → list of variant dicts

    Returns
    -------
    dict gene → {diplotype, phenotype, variants, special_notes}
    """
    results = {}

    for gene, variants in grouped_variants.items():

        if gene == "SLCO1B1":
            diplotype, phenotype, myopathy_risk = _handle_slco1b1(variants)
            results[gene] = {
                "diplotype":      diplotype,
                "phenotype":      phenotype,
                "myopathy_risk":  myopathy_risk,
                "detected_variants": [v.get("rsid") for v in variants if v.get("rsid")],
                "raw_variants":   variants,
            }

        else:
            diplotype, phenotype = _infer_diplotype_from_variants(gene, variants)
            results[gene] = {
                "diplotype":      diplotype,
                "phenotype":      phenotype,
                "myopathy_risk":  None,
                "detected_variants": [v.get("rsid") for v in variants if v.get("rsid")],
                "raw_variants":   variants,
            }

        logger.debug(
            "Gene %s → diplotype=%s phenotype=%s",
            gene, results[gene]["diplotype"], results[gene]["phenotype"]
        )

    return results