"""
vcf_parser.py — PharmaGuard VCF File Parser
Parses VCF v4.2 files and extracts pharmacogenomic variants
for target genes: CYP2D6, CYP2C19, CYP2C9, SLCO1B1, TPMT, DPYD
"""

import re
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Target pharmacogenomic genes
PGX_GENES = {"CYP2D6", "CYP2C19", "CYP2C9", "SLCO1B1", "TPMT", "DPYD"}

# rsID → gene mapping for known pharmacogenomic SNPs
# In production this would be a full CPIC database lookup
RSID_TO_GENE = {
    # CYP2D6 variants
    "rs3892097":  "CYP2D6",   # *4
    "rs5030655":  "CYP2D6",   # *6
    "rs16947":    "CYP2D6",   # *2
    "rs1065852":  "CYP2D6",   # *10
    "rs28371706": "CYP2D6",   # *41
    "rs35742686": "CYP2D6",   # *3
    # CYP2C19 variants
    "rs4244285":  "CYP2C19",  # *2
    "rs4986893":  "CYP2C19",  # *3
    "rs12248560": "CYP2C19",  # *17
    "rs28399504": "CYP2C19",  # *4
    # CYP2C9 variants
    "rs1799853":  "CYP2C9",   # *2
    "rs1057910":  "CYP2C9",   # *3
    "rs28371686": "CYP2C9",   # *5
    "rs7900194":  "CYP2C9",   # *6
    # SLCO1B1 variants
    "rs4149056":  "SLCO1B1",  # *5 / c.521T>C
    "rs2306283":  "SLCO1B1",  # *1b
    # TPMT variants
    "rs1800460":  "TPMT",     # *3B
    "rs1142345":  "TPMT",     # *3C
    "rs1800584":  "TPMT",     # *4
    "rs1800462":  "TPMT",     # *2
    # DPYD variants
    "rs3918290":  "DPYD",     # *2A (IVS14+1G>A)
    "rs67376798": "DPYD",     # c.2846A>T
    "rs55886062": "DPYD",     # c.1679T>G (*13)
    "rs75017182": "DPYD",     # HapB3 tag SNP
}

# rsID → star allele name
RSID_TO_STAR_ALLELE = {
    "rs3892097":  "*4",
    "rs5030655":  "*6",
    "rs16947":    "*2",
    "rs1065852":  "*10",
    "rs28371706": "*41",
    "rs35742686": "*3",
    "rs4244285":  "*2",
    "rs4986893":  "*3",
    "rs12248560": "*17",
    "rs28399504": "*4",
    "rs1799853":  "*2",
    "rs1057910":  "*3",
    "rs28371686": "*5",
    "rs7900194":  "*6",
    "rs4149056":  "*5",
    "rs2306283":  "*1b",
    "rs1800460":  "*3B",
    "rs1142345":  "*3C",
    "rs1800584":  "*4",
    "rs1800462":  "*2",
    "rs3918290":  "*2A",
    "rs67376798": "c.2846A>T",
    "rs55886062": "*13",
    "rs75017182": "HapB3",
}

# Chromosomal position ranges for PGx genes (GRCh38)
# Used as fallback when rsID is absent
GENE_POSITIONS = {
    "CYP2D6":  ("chr22", 42522500, 42526882),
    "CYP2C19": ("chr10", 94762681, 94855547),
    "CYP2C9":  ("chr10", 94938657, 94990529),
    "SLCO1B1": ("chr12", 21281117, 21391780),
    "TPMT":    ("chr6",  18128541, 18155376),
    "DPYD":    ("chr1",  97543299, 98388615),
}


def _normalize_chrom(chrom: str) -> str:
    """Normalize chromosome name: '1' → 'chr1', 'chr1' → 'chr1'."""
    if not chrom.startswith("chr"):
        return f"chr{chrom}"
    return chrom


def _lookup_gene_by_position(chrom: str, pos: int) -> Optional[str]:
    """Return gene name if position falls within a known PGx gene region."""
    norm = _normalize_chrom(chrom)
    for gene, (gc, start, end) in GENE_POSITIONS.items():
        if norm == gc and start <= pos <= end:
            return gene
    return None


def _parse_genotype(fmt_keys: list[str], sample_vals: list[str]) -> Optional[str]:
    """
    Extract GT field from FORMAT/SAMPLE columns.
    Returns genotype string like '0/1', '1/1', '0|1', etc.
    Returns None if GT not found.
    """
    if not fmt_keys or not sample_vals:
        return None
    try:
        gt_idx = fmt_keys.index("GT")
        gt_raw = sample_vals[gt_idx]
        # Normalize phased/unphased separator
        return gt_raw.replace("|", "/")
    except (ValueError, IndexError):
        return None


def _genotype_to_zygosity(gt: Optional[str]) -> str:
    """Convert genotype string to zygosity label."""
    if not gt:
        return "unknown"
    alleles = gt.split("/")
    if len(alleles) != 2:
        return "unknown"
    a1, a2 = alleles
    if a1 == "." or a2 == ".":
        return "missing"
    if a1 == "0" and a2 == "0":
        return "homozygous_ref"
    if a1 == a2:
        return "homozygous_alt"
    return "heterozygous"


def parse_vcf(vcf_path: str) -> dict:
    """
    Main VCF parsing function.

    Parameters
    ----------
    vcf_path : str
        Path to VCF v4.2 file.

    Returns
    -------
    dict with keys:
        - sample_id : str
        - variants  : list[dict]  — filtered PGx variants only
        - parse_errors : list[str]
        - total_variants_parsed : int
        - pgx_variants_found : int
    """
    path = Path(vcf_path)
    if not path.exists():
        raise FileNotFoundError(f"VCF file not found: {vcf_path}")

    sample_id = "PATIENT_UNKNOWN"
    variants = []
    parse_errors = []
    total_parsed = 0
    header_parsed = False
    column_names = []

    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            for line_num, line in enumerate(fh, start=1):
                line = line.rstrip("\n")

                # ── Meta-information lines ────────────────────────────────
                if line.startswith("##"):
                    continue

                # ── Header line ───────────────────────────────────────────
                if line.startswith("#CHROM"):
                    column_names = line.lstrip("#").split("\t")
                    # Sample ID is column index 9 (FORMAT is index 8)
                    if len(column_names) > 9:
                        raw_id = column_names[9].strip()
                        sample_id = raw_id if raw_id else sample_id
                    header_parsed = True
                    continue

                # Skip non-data lines before header
                if not header_parsed:
                    continue

                # ── Data lines ────────────────────────────────────────────
                if not line.strip():
                    continue

                fields = line.split("\t")
                if len(fields) < 8:
                    parse_errors.append(f"Line {line_num}: fewer than 8 fields — skipped")
                    continue

                total_parsed += 1

                chrom  = fields[0].strip()
                pos    = int(fields[1].strip()) if fields[1].strip().isdigit() else 0
                rs_id  = fields[2].strip()   # '.' if missing
                ref    = fields[3].strip()
                alt    = fields[4].strip()
                qual   = fields[5].strip()
                flt    = fields[6].strip()
                info   = fields[7].strip()

                # Determine gene ───────────────────────────────────────────
                gene = None

                # 1) Check rsID lookup table
                if rs_id and rs_id != ".":
                    gene = RSID_TO_GENE.get(rs_id)

                # 2) Parse INFO for gene annotations (ANN, CSQ, GENE fields)
                if gene is None:
                    gene_match = re.search(r'(?:GENE|gene)=([^;]+)', info)
                    if gene_match:
                        candidate = gene_match.group(1).split(",")[0].strip()
                        if candidate in PGX_GENES:
                            gene = candidate

                # 3) Positional fallback
                if gene is None:
                    gene = _lookup_gene_by_position(chrom, pos)

                # Skip variants not in our PGx gene set
                if gene is None:
                    continue

                # Parse genotype ───────────────────────────────────────────
                genotype = None
                if len(fields) >= 10:
                    fmt_keys  = fields[8].split(":") if len(fields) > 8 else []
                    smpl_vals = fields[9].split(":") if len(fields) > 9 else []
                    genotype  = _parse_genotype(fmt_keys, smpl_vals)

                zygosity = _genotype_to_zygosity(genotype)

                # Skip homozygous reference (no variant)
                if zygosity == "homozygous_ref":
                    continue

                star_allele = RSID_TO_STAR_ALLELE.get(rs_id, "unknown")

                variant = {
                    "chromosome":   _normalize_chrom(chrom),
                    "position":     pos,
                    "rsid":         rs_id if rs_id != "." else None,
                    "ref":          ref,
                    "alt":          alt,
                    "gene":         gene,
                    "genotype":     genotype,
                    "zygosity":     zygosity,
                    "star_allele":  star_allele,
                    "quality":      qual,
                    "filter":       flt,
                }
                variants.append(variant)
                logger.debug("PGx variant found: %s %s %s/%s [%s]", gene, rs_id, ref, alt, zygosity)

    except Exception as exc:
        logger.error("VCF parse error: %s", exc)
        parse_errors.append(str(exc))

    # Derive sample ID from filename if still unknown
    if sample_id == "PATIENT_UNKNOWN":
        stem = path.stem.upper()
        sample_id = stem if stem else "PATIENT_UNKNOWN"

    return {
        "sample_id":              sample_id,
        "variants":               variants,
        "parse_errors":           parse_errors,
        "total_variants_parsed":  total_parsed,
        "pgx_variants_found":     len(variants),
    }


def group_variants_by_gene(variants: list[dict]) -> dict[str, list[dict]]:
    """Group parsed variants by gene name for downstream phenotype mapping."""
    grouped: dict[str, list[dict]] = {g: [] for g in PGX_GENES}
    for v in variants:
        gene = v.get("gene")
        if gene in grouped:
            grouped[gene].append(v)
    return grouped