export const mockDrugs = [
  { id: "warfarin", name: "Warfarin", category: "Anticoagulant" },
  { id: "clopidogrel", name: "Clopidogrel", category: "Antiplatelet" },
  { id: "codeine", name: "Codeine", category: "Analgesic" },
  { id: "simvastatin", name: "Simvastatin", category: "Statin" },
  { id: "tamoxifen", name: "Tamoxifen", category: "Antineoplastic" },
  { id: "abacavir", name: "Abacavir", category: "Antiviral" },
  { id: "carbamazepine", name: "Carbamazepine", category: "Anticonvulsant" },
  { id: "fluorouracil", name: "5-Fluorouracil", category: "Antineoplastic" },
];

export const mockVariants = [
  {
    id: 1,
    gene: "CYP2D6",
    variant: "*4/*4",
    phenotype: "Poor Metabolizer",
    rsId: "rs3892097",
    alleleFrequency: "5.4%",
    significance: "Pathogenic",
  },
  {
    id: 2,
    gene: "CYP2C19",
    variant: "*2/*2",
    phenotype: "Poor Metabolizer",
    rsId: "rs4244285",
    alleleFrequency: "12.1%",
    significance: "Pathogenic",
  },
  {
    id: 3,
    gene: "CYP2C9",
    variant: "*1/*3",
    phenotype: "Intermediate Metabolizer",
    rsId: "rs1057910",
    alleleFrequency: "8.3%",
    significance: "Likely Pathogenic",
  },
  {
    id: 4,
    gene: "VKORC1",
    variant: "-1639 G>A",
    phenotype: "Decreased Expression",
    rsId: "rs9923231",
    alleleFrequency: "37.2%",
    significance: "Drug Response",
  },
  {
    id: 5,
    gene: "HLA-B",
    variant: "*57:01",
    phenotype: "Positive",
    rsId: "rs2395029",
    alleleFrequency: "6.8%",
    significance: "Pathogenic",
  },
  {
    id: 6,
    gene: "DPYD",
    variant: "*2A",
    phenotype: "Poor Metabolizer",
    rsId: "rs3918290",
    alleleFrequency: "1.1%",
    significance: "Pathogenic",
  },
];

export const mockRiskResults = {
  warfarin: {
    drug: "Warfarin",
    riskLevel: "adjust",
    riskScore: 72,
    summary:
      "CYP2C9 *1/*3 and VKORC1 -1639 G>A variants detected. Patient requires reduced warfarin dose. Standard dosing may lead to over-anticoagulation and increased bleeding risk.",
    recommendation:
      "Reduce initial dose by 25-50% based on FDA-approved pharmacogenomic dosing table. Monitor INR closely during initiation.",
    affectedGenes: ["CYP2C9", "VKORC1"],
    evidenceLevel: "1A",
    guidelines: "CPIC Guideline for Warfarin and CYP2C9/VKORC1 (2017)",
  },
  clopidogrel: {
    drug: "Clopidogrel",
    riskLevel: "toxic",
    riskScore: 91,
    summary:
      "CYP2C19 *2/*2 Poor Metabolizer phenotype detected. Clopidogrel is a prodrug requiring CYP2C19 activation. Patient cannot effectively convert clopidogrel to its active metabolite.",
    recommendation:
      "Avoid clopidogrel. Consider alternative antiplatelet therapy such as prasugrel or ticagrelor, which are not dependent on CYP2C19 metabolism.",
    affectedGenes: ["CYP2C19"],
    evidenceLevel: "1A",
    guidelines: "CPIC Guideline for Clopidogrel and CYP2C19 (2022)",
  },
  codeine: {
    drug: "Codeine",
    riskLevel: "safe",
    riskScore: 15,
    summary:
      "CYP2D6 *4/*4 Poor Metabolizer phenotype detected. Codeine requires CYP2D6 to convert to morphine. Patient will experience significantly reduced analgesic effect.",
    recommendation:
      "Codeine will be ineffective for this patient due to inability to form active metabolite morphine. Consider non-opioid alternatives or opioids not dependent on CYP2D6 such as morphine or oxymorphone.",
    affectedGenes: ["CYP2D6"],
    evidenceLevel: "1A",
    guidelines: "CPIC Guideline for Codeine and CYP2D6 (2019)",
  },
  simvastatin: {
    drug: "Simvastatin",
    riskLevel: "adjust",
    riskScore: 58,
    summary:
      "SLCO1B1 variant detected (simulated). Increased risk of simvastatin-induced myopathy. Patient has elevated plasma levels of the active acid form.",
    recommendation:
      "Prescribe a lower dose of simvastatin (max 20mg) or consider an alternative statin such as pravastatin or rosuvastatin which are less affected by SLCO1B1 variants.",
    affectedGenes: ["SLCO1B1"],
    evidenceLevel: "1A",
    guidelines: "CPIC Guideline for Simvastatin and SLCO1B1 (2014)",
  },
  tamoxifen: {
    drug: "Tamoxifen",
    riskLevel: "toxic",
    riskScore: 85,
    summary:
      "CYP2D6 *4/*4 Poor Metabolizer phenotype detected. Tamoxifen requires CYP2D6-mediated conversion to endoxifen (active metabolite). Severely reduced endoxifen concentrations expected.",
    recommendation:
      "Consider alternative endocrine therapy such as an aromatase inhibitor (in postmenopausal women) or increased tamoxifen dose under specialist supervision with therapeutic drug monitoring.",
    affectedGenes: ["CYP2D6"],
    evidenceLevel: "1A",
    guidelines: "CPIC Guideline for Tamoxifen and CYP2D6 (2018)",
  },
  abacavir: {
    drug: "Abacavir",
    riskLevel: "toxic",
    riskScore: 98,
    summary:
      "HLA-B*57:01 positive. This allele is strongly associated with abacavir hypersensitivity reaction (HSR), a potentially fatal multi-organ clinical syndrome.",
    recommendation:
      "DO NOT prescribe abacavir. HLA-B*57:01 positive patients must avoid abacavir. Use alternative antiretroviral agents. This is an FDA boxed warning.",
    affectedGenes: ["HLA-B"],
    evidenceLevel: "1A",
    guidelines: "CPIC Guideline for Abacavir and HLA-B (2014)",
  },
  carbamazepine: {
    drug: "Carbamazepine",
    riskLevel: "safe",
    riskScore: 22,
    summary:
      "No high-risk HLA alleles detected for carbamazepine hypersensitivity. Standard pharmacogenomic risk factors are within normal range for this patient.",
    recommendation:
      "Standard dosing may be used. Monitor for common side effects including dizziness, drowsiness, and nausea. Routine therapeutic drug monitoring is still recommended.",
    affectedGenes: [],
    evidenceLevel: "1A",
    guidelines: "CPIC Guideline for Carbamazepine and HLA-B/HLA-A (2017)",
  },
  fluorouracil: {
    drug: "5-Fluorouracil",
    riskLevel: "toxic",
    riskScore: 95,
    summary:
      "DPYD *2A variant detected. This results in complete DPD enzyme deficiency. 5-Fluorouracil and capecitabine are contraindicated due to risk of severe, life-threatening toxicity.",
    recommendation:
      "DO NOT administer 5-fluorouracil or capecitabine. Complete DPD deficiency carries a high risk of fatal toxicity. Seek alternative chemotherapy regimens. This is an FDA boxed warning.",
    affectedGenes: ["DPYD"],
    evidenceLevel: "1A",
    guidelines: "CPIC Guideline for Fluoropyrimidines and DPYD (2018)",
  },
};

export const mockExplanations = [
  {
    id: "pharmacogenomics",
    title: "What is Pharmacogenomics?",
    content:
      "Pharmacogenomics is the study of how an individual's genetic makeup (genome) affects their response to drugs. It combines pharmacology (the science of drugs) and genomics (the study of genes and their functions) to develop effective, safe medications and doses tailored to a person's genetic profile. Genetic variations can affect how quickly or slowly a drug is metabolized, its efficacy, and its potential side effects.",
  },
  {
    id: "risk-levels",
    title: "Understanding Risk Levels",
    content:
      "Risk levels in PharmaGuard are categorized into three tiers: SAFE (green) indicates the drug can be used at standard dosing with normal monitoring. ADJUST DOSAGE (yellow) means the patient may require dose modifications based on their genetic profile to optimize efficacy and minimize side effects. TOXIC/AVOID (red) signals a high-risk drug-gene interaction where the medication should be avoided or used only with extreme caution and specialist supervision. These levels are derived from clinical pharmacogenomics guidelines including CPIC and DPWG.",
  },
  {
    id: "variant-interpretation",
    title: "How Variants Are Interpreted",
    content:
      "Genetic variants are interpreted using standardized nomenclature systems. Star (*) alleles describe specific combinations of genetic changes within a gene (e.g., CYP2D6*4). Each allele combination results in a predicted metabolizer phenotype: Ultrarapid Metabolizer (UM), Normal Metabolizer (NM), Intermediate Metabolizer (IM), or Poor Metabolizer (PM). The phenotype determines how the patient processes certain drugs. HLA alleles are interpreted for immune-mediated drug reactions using presence/absence testing.",
  },
  {
    id: "evidence-levels",
    title: "Evidence Level Classification",
    content:
      "PharmaGuard uses the CPIC (Clinical Pharmacogenetics Implementation Consortium) evidence classification. Level 1A represents the strongest evidence: a prescribing action is recommended based on published CPIC or DPWG guidelines with strong supporting evidence. Level 1B indicates there is moderate evidence. Level 2A indicates potentially actionable evidence, while Level 2B and below have limited clinical evidence. Only Level 1A and 1B gene-drug pairs are included in primary risk assessments.",
  },
  {
    id: "data-privacy",
    title: "Genomic Data Privacy",
    content:
      "PharmaGuard processes all genomic data locally in your browser. No genetic information is transmitted to external servers. Your uploaded VCF/genomic files are parsed client-side and never stored. This demo uses mock data for illustrative purposes only. In a clinical setting, pharmacogenomic data should be handled in compliance with HIPAA, GINA, and institutional review board (IRB) guidelines. Always consult with qualified healthcare professionals before making medication changes.",
  },
];
