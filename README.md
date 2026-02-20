# 🧬 PharmaGuard — Pharmacogenomic Risk Prediction System

> **RIFT 2026 Hackathon · Pharmacogenomics / Explainable AI Track**  
> *"The right drug. The right dose. For the right patient."*

## 🔗 Quick Links

|---|---|
| 🌐 **Live Demo** | https://rift26-hackathon-4-662q.vercel.app/
| 🎥 **LinkedIn Demo Video** | https://www.linkedin.com/posts/sahil-pagar-505a40289_rift2026-pharmaguard-pharmacogenomics-ugcPost-7430435298485932032-NOj1?utm_source=social_share_send&utm_medium=android_app&rcm=ACoAAEYZTtUBDdf1mUumGMVE2_TvDn5Jl6U2Lvw&utm_campaign=copy_link

---

## 🚨 The Problem

**100,000+ Americans die every year from adverse drug reactions** — many of which are entirely preventable.

Standard prescriptions ignore a patient's genetic makeup. A drug that saves one person can kill another — based entirely on how their genes metabolize it. Doctors currently have no fast, reliable tool to check this before prescribing.
---

## ✅ Our Solution

**PharmaGuard** takes a patient's genetic data file (VCF) and a drug name, and in seconds tells a doctor:

- Is this drug **safe** for this patient?
- Does the **dose need adjustment**?
- Is it **toxic** or completely **ineffective** due to their genes?
- What is the **clinical recommendation** based on international guidelines?

All powered by real pharmacogenomic science (CPIC guidelines) + Claude AI for clinical explanations.

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         PharmaGuard                              │
│                                                                  │
│   FRONTEND (React)                                               │
│   • Drag-and-drop VCF upload                                     │
│   • Drug selector (single / multi)                               │
│   • Color-coded risk dashboard  🟢 Safe  🟡 Adjust  🔴 Toxic    │
│   • Downloadable JSON report                                     │
│                          │                                       │
│                    FastAPI Backend                               │
│                          │                                       │
│   ┌──────────────────────▼──────────────────────────────────┐   │
│   │  STEP 1 — vcf_parser.py                                 │   │
│   │  Read VCF file → extract PGx variants → identify gene  │   │
│   │  rs3892097 → CYP2D6 *4 → heterozygous                  │   │
│   └──────────────────────┬──────────────────────────────────┘   │
│   ┌──────────────────────▼──────────────────────────────────┐   │
│   │  STEP 2 — phenotype_mapper.py                           │   │
│   │  Variants → Diplotype (*1/*4) → Phenotype               │   │
│   │  Intermediate Metabolizer                               │   │
│   └──────────────────────┬──────────────────────────────────┘   │
│   ┌──────────────────────▼──────────────────────────────────┐   │
│   │  STEP 3 — pgx_rules.py  (CPIC Rule Engine)              │   │
│   │  Phenotype × Drug → Risk Label + Clinical Action        │   │
│   │  IM + CODEINE → "Adjust Dosage" · Severity: Moderate   │   │
│   └──────────────────────┬──────────────────────────────────┘   │
│   ┌──────────────────────▼──────────────────────────────────┐   │
│   │  STEP 4 — llm_explainer.py  (Claude AI)                 │   │
│   │  Generates: Summary · Mechanism · Guideline Citation    │   │
│   │  Falls back to templates if API key unavailable         │   │
│   └──────────────────────┬──────────────────────────────────┘   │
│                          │                                       │
│              Structured JSON Response                            │
│         (schema matches CPIC / hackathon spec exactly)          │
└──────────────────────────────────────────────────────────────────┘
```
## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python 3.11, FastAPI, Uvicorn |
| **AI / LLM** | Anthropic Claude (`claude-opus-4-6`) |
| **Frontend** | React, Next.js, Tailwind CSS |
| **Deployment** | Vercel (frontend) + Render (backend) |
| **Clinical Standard** | CPIC Guidelines, PharmGKB database |

---

## ⚙️ Installation & Setup

### Prerequisites
- Python 3.11+
- Node.js 18+

---

### Step 1 — Clone the repo

```bash
git clone https://github.com/your-org/pharmaguard.git
cd pharmaguard
```
### Step 2 — Backend setup

```bash
cd ML
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create your `.env` file:

```bash
cp .env.example .env
# Open .env and paste your ANTHROPIC_API_KEY
```

`.env.example`:
```
ANTHROPIC_API_KEY=your_key_here
```

Start the backend:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

- API live at: `http://localhost:8000`
- Swagger docs: `http://localhost:8000/docs`

---

### Step 3 — Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

Frontend live at: `http://localhost:3000`

---

### Step 4 — Quick test (no frontend needed)

```bash
cd ML
python test_pharmaguard.py    # full pipeline test with sample VCF
# or
python run.py                 # interactive terminal mode
```

---

## 📡 API Documentation

### Base URL
```
https://your-backend.onrender.com
```

---

### `GET /health`
Check if the service is running.

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "2026-02-19T08:00:00+00:00"
}
```

---

### `POST /upload-vcf`
Upload a patient VCF file. Returns a `session_id` to use in analysis.

**Request:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | File | `.vcf` file, max 5MB |

**Response:**
```json
{
  "session_id": "a3f1c2d4-...",
  "sample_id": "PATIENT_001",
  "pgx_variants_found": 6,
  "genes_with_variants": { "CYP2D6": 1, "CYP2C19": 1, "TPMT": 1 },
  "status": "ready_for_analysis"
}
```

---

### `POST /analyze`
Run full pharmacogenomic risk analysis.

**Request body:**
```json
{
  "session_id": "a3f1c2d4-...",
  "drug": "CODEINE",
  "patient_id": "PATIENT_001"
}
```

For **multiple drugs** at once:
```json
{
  "session_id": "a3f1c2d4-...",
  "drug": ["CODEINE", "WARFARIN", "SIMVASTATIN"]
}
```

**Risk labels returned:** `Safe` · `Adjust Dosage` · `Toxic` · `Ineffective` · `Unknown`

---

### `POST /analyze-file`
Upload + analyze in one request (great for demos).

**Request:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | File | `.vcf` file |
| `drug` | String | Drug name(s), comma-separated |
| `patient_id` | String | Optional |

---

### `GET /supported-drugs`
Returns all drugs in the PharmaGuard rule engine.

### `GET /supported-genes`
Returns all tracked pharmacogenes and rsID mappings.

---

## 💻 Usage Examples

### Using cURL

```bash
# 1. Upload VCF
curl -X POST https://your-backend.onrender.com/upload-vcf \
  -F "file=@test_patient.vcf"

# 2. Analyze (paste session_id from step 1)
curl -X POST https://your-backend.onrender.com/analyze \
  -H "Content-Type: application/json" \
  -d '{"session_id": "YOUR_SESSION_ID", "drug": "CODEINE"}'
```

---

### Using Python

```python
import requests

# Upload VCF
with open("test_patient.vcf", "rb") as f:
    upload = requests.post("http://localhost:8000/upload-vcf", files={"file": f})

session_id = upload.json()["session_id"]

# Analyze
result = requests.post("http://localhost:8000/analyze", json={
    "session_id": session_id,
    "drug": "CODEINE"
})

print(result.json()["risk_assessment"])
# → { "risk_label": "Adjust Dosage", "severity": "Moderate", "confidence_score": 0.8 }
```

---

### Sample JSON Output

```json
{
  "patient_id": "PATIENT_001",
  "drug": "CLOPIDOGREL",
  "timestamp": "2026-02-19T08:17:19+00:00",
  "risk_assessment": {
    "risk_label": "Ineffective",
    "confidence_score": 0.95,
    "severity": "High"
  },
  "pharmacogenomic_profile": {
    "primary_gene": "CYP2C19",
    "diplotype": "*2/*2",
    "phenotype": "Poor Metabolizer",
    "detected_variants": [
      {
        "rsid": "rs4244285",
        "gene": "CYP2C19",
        "zygosity": "homozygous_alt",
        "star_allele": "*2"
      }
    ]
  },
  "clinical_recommendation": {
    "action": "Clopidogrel cannot be activated. Switch to Prasugrel or Ticagrelor.",
    "alternative_drugs": ["Prasugrel", "Ticagrelor"]
  },
  "llm_generated_explanation": {
    "summary": "Patient's CYP2C19 *2/*2 genotype eliminates enzyme activity. Clopidogrel requires CYP2C19 for activation — this patient will receive no antiplatelet benefit.",
    "mechanism": "Homozygous *2/*2 produces less than 10% of normal active metabolite, rendering antiplatelet effect absent and leaving the patient at high thrombotic risk.",
    "guideline_reference": "CPIC guideline for clopidogrel and CYP2C19 (2013, updated 2022). Full guidance at cpicpgx.org."
  },
  "quality_metrics": {
    "vcf_parsing_success": true,
    "total_variants_parsed": 8,
    "pgx_variants_found": 6,
    "parse_errors": []
  }
}
```

---

## 🧬 Supported Genes & Drugs

**6 Pharmacogenes Tracked**

| Gene | Role | Why It Matters |
|---|---|---|
| CYP2D6 | Metabolic enzyme | ~25% of all prescribed drugs |
| CYP2C19 | Metabolic enzyme | Clopidogrel, SSRIs, PPIs |
| CYP2C9 | Metabolic enzyme | Warfarin, phenytoin, NSAIDs |
| SLCO1B1 | Hepatic transporter | Statin-induced myopathy |
| TPMT | Thiopurine enzyme | Azathioprine myelosuppression |
| DPYD | 5-FU catabolism | Fluorouracil toxicity |

**14 Drugs Supported**

`CODEINE` · `TRAMADOL` · `WARFARIN` · `PHENYTOIN` · `CLOPIDOGREL` · `SIMVASTATIN` · `ATORVASTATIN` · `AZATHIOPRINE` · `MERCAPTOPURINE` · `THIOGUANINE` · `FLUOROURACIL` · `CAPECITABINE` · `AMITRIPTYLINE` · `CITALOPRAM`

---

## 👥 Team

| Name | 
|Pratiksha Khetre|
|Pratik Jadhav|
|Sahil Pagar|
|Sushant Kunjir|
---

## 📌 Submission Info

- **Hackathon:** RIFT 2026 · Pharmacogenomics / Explainable AI Track
- **Submitted:** 19 February 2026
- **Tags:** `#RIFT2026` `#PharmaGuard` `#Pharmacogenomics` `#AIinHealthcare` `#PrecisionMedicine`

---

*Built in 24 hours. Powered by real clinical guidelines. May your algorithms save lives.*
