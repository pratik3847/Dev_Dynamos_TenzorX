<div align="center">

<img src="public/logo.png" width="120" alt="CureWise AI" />

# CureWise AI
### AI-Powered Healthcare Navigator for Indian Patients

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Groq](https://img.shields.io/badge/Groq_Llama_3.3-F55036?style=for-the-badge)](https://groq.com)

> **From symptoms to hospital selection and financial planning — in one intelligent flow.**

**Team Dev Dynamos · TenzorX Hackathon**

</div>

---

> ⚠️ **Medical Disclaimer:** CureWise AI is a clinical decision support tool, not a medical device or substitute for professional medical advice. All AI-generated content is for informational purposes only. Always consult a qualified physician before making any healthcare decisions.

---

## 🎬 Demo

[![Watch the demo](https://img.youtube.com/vi/bKULo3JCca0/maxresdefault.jpg)](https://www.youtube.com/watch?v=bKULo3JCca0)

---

## Live Demo — Follow Ravi's Journey

**Patient:** Ravi, 45 years old · Mumbai · Budget ₹50,000 · Existing condition: Diabetes

| Step | Input | Output |
|------|-------|--------|
| **1 — Symptom Input** | "Fever 4 days, severe headache, pain behind eyes, body ache" + Diabetes selected | Budget ₹50,000 captured, comorbidity flagged |
| **2 — AI Diagnosis** | Groq Llama 3.3 analyses query with Mumbai location context | Dengue A90 — 82% · Malaria B50 — 38% · Typhoid A01 — 22% |
| **3 — Treatment** | Outpatient pathway selected | 7 steps · ₹4,000–₹10,100 · ⚠️ Diabetes HbA1c warning |
| **4 — Hospital** | Mumbai, GPS search | KEM Hospital 3.2 km · Sion 5.1 km · NABH accredited |
| **5 — Finance** | Budget ₹50,000 vs cost ₹10,100 | Within budget ✅ · EMI ₹673/mo · PDF exported |

---

## Screenshots

### Step 1 — Symptom Input
![Symptom Input](screenshots/image-2.png)

### Step 2 — AI Clinical Mapping
![AI Clinical Mapping](screenshots/image-3.png)

### Step 3 — Treatment Pathways
![Treatment Pathways](screenshots/image-4.png)

### Step 4 — Hospital Selection (Map View)
![Hospital Selection](screenshots/image-5.png)

### Step 4 — Hospital Details
![Hospital Details](screenshots/image-6.png)

### Step 5 — Financial Planning
![Financial Planning](screenshots/image-7.png)

---

## The Problem

Indian patients face three critical barriers when seeking healthcare:

- **Information asymmetry** — no reliable way to understand what treatment they need or what it costs
- **Hospital selection paralysis** — thousands of hospitals with no transparent quality or cost data
- **Financial shock** — unexpected bills with no planning tools or financing guidance

> 🔴 **500 million** Indians seek outpatient care annually with no digital guidance
> 🔴 **63%** of healthcare spending in India is out-of-pocket
> 🔴 **57%** of rural patients travel >30 km to reach a specialist — often the wrong one

---

## Why This Matters for Healthcare Lending

Every loan referral from CureWise arrives pre-qualified:

| What CureWise provides | What this replaces |
|------------------------|-------------------|
| ICD-10 confirmed condition | Manual underwriter asking "what is the procedure?" |
| Selected hospital + tier | Manual verification of treatment facility |
| Itemised cost breakdown | Back-and-forth on loan amount justification |
| Patient age + comorbidities | Risk assessment questionnaire |
| Confidence score | Manual case review |

> A standard healthcare loan pre-approval takes 3–5 days manually.
> **CureWise delivers the same structured data in under 60 seconds.**

---

## Key Features

### 🧠 Clinical Intelligence
- LLM-powered diagnosis using **Groq Llama 3.3 70B** with structured clinical prompts
- **ICD-10 code mapping** via NLM ClinicalTables API — validated, not guessed
- **Differential diagnoses** with individual confidence scores and clinical reasoning
- **Critical symptom weighting** — dengue from retro-orbital pain, endemic region boosting, cardiac vs GERD differentiation
- **Age-appropriateness matrix** — surgical pathways flagged for patients <18, >70, or with comorbidities
- **Named comorbidity flags** — diabetes → wound healing risk, CKD → contrast dye contraindication, cardiac → clearance required
- **Confidence-based CTA** — <50% confidence replaces "View Pathways" with "Refine Symptoms First"

### 💊 Treatment Pathways
- **30+ static pathways** for common Indian conditions with verified CGHS 2023 rates
  - Dengue (outpatient + inpatient + haemorrhagic), Typhoid, Malaria
  - Diabetes, Hypo/Hyperthyroidism, Pneumonia, Asthma, GERD, UTI, Migraine
  - Cardiac (Hypertension, Angina, MI, Heart Failure)
  - Orthopaedic (TKR, THR, Back Pain), General Surgery, Urology
- **LLM-generated pathways** for any ICD-10 code not in the static cache
- **CGHS DB pricing** — each step looked up against the national procedure rate database
- **NLM MedlinePlus** integration for condition context (free, no key)

### 🏥 Hospital Directory
- National hospital database with **10,000+ facilities**
- **GPS-based nearby search** using PostGIS spatial queries
- **Government / Private / Trust / NGO** classification with colour-coded badges
- **NABH, JCI, ISO, NABL** accreditation badges from real DB data
- **Composite match score** — specialty relevance, accreditation, bed count, distance, emergency services
- **CGHS/PMJAY empanelment** flags for government scheme eligibility

### 💰 Financial Planning
- **Pathway-derived cost estimates** — totals computed from actual treatment steps, not generic formulas
- **Hospital tier adjustment** — budget (×1.0), mid-tier (×1.3), premium (×1.8), NABH (+15%)
- **Named contingency buffer** — *"Diabetes adds wound healing risk"* not a generic percentage
- **Budget mismatch alert** — 3 actionable options when cost exceeds budget by >50%
- **EMI calculator** — mathematically correct, 0% promo or custom interest rate
- **6 verified finance partners** — Bajaj Finserv, LazyPay, KreditBee, Arogya Finance, HDFC Bank, CASHe
- **6 health insurance partners** — Star Health, Niva Bupa, HDFC ERGO, Care Health, Aditya Birla, Bajaj Allianz
- **PDF export** — full cost breakdown with patient profile, pathway, hospital, and EMI plan

---

## System Architecture

```mermaid
graph TB
    subgraph Client["🖥️ Frontend — React 18 + TypeScript"]
        S1[Step 1\nSymptom Input\n+ Voice]
        S2[Step 2\nClinical Mapping\nResults]
        S3[Step 3\nTreatment\nPathways]
        S4[Step 4\nHospital\nSelection + Map]
        S5[Step 5\nFinancial\nPlanning]
        S1 --> S2 --> S3 --> S4 --> S5
    end

    subgraph Backend["⚙️ Backend — FastAPI + Python"]
        D["/diagnosis/match\nLLM + ICD-10"]
        C["/clinical/pathway\n3-tier engine"]
        H["/hospitals/nearby\nPostGIS search"]
        P["/procedures/estimate\nCGHS pricing"]
    end

    subgraph AI["🧠 AI Layer"]
        G[Groq API\nLlama 3.3 70B]
        N1[NLM ClinicalTables\nICD-10 Validation]
        N2[NLM MedlinePlus\nCondition Summaries]
    end

    subgraph DB["🗄️ Database — Supabase PostgreSQL"]
        H1[(Hospitals\n10,000+ records\nPostGIS)]
        H2[(CGHS Procedures\n5,000+ rates)]
        H3[(Users &\nProfiles)]
    end

    S2 -->|symptoms + age\n+ location| D
    S3 -->|ICD-10 code| C
    S4 -->|GPS coords\n+ specialty| H
    S5 -->|cghs_code\n+ hospital tier| P

    D -->|structured prompt| G
    D -->|validate code| N1
    C -->|condition context| N2
    C -->|price steps| H2

    H -->|spatial query| H1
    P -->|rate lookup| H2
    D & C & H & P -->|auth| H3

    style Client fill:#1e3a5f,color:#fff
    style Backend fill:#1a4731,color:#fff
    style AI fill:#4a1942,color:#fff
    style DB fill:#3d2b00,color:#fff
```

---

## Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| Tailwind CSS + shadcn/ui | Design system |
| React Leaflet | Interactive hospital map |
| TanStack Query | Server state management |
| React Hook Form + Zod | Form validation |
| Web Speech API | Voice symptom input |

### Backend
| Technology | Purpose |
|-----------|---------|
| FastAPI (Python) | REST API framework |
| PostgreSQL (Supabase) | Primary database |
| PostGIS | Geospatial hospital search |
| psycopg2 | Database driver |
| httpx | Async HTTP client |
| python-jose + passlib | JWT authentication |

### AI & Free Data Sources
| Source | What It Provides | Cost |
|--------|-----------------|------|
| Groq API (Llama 3.3 70B) | Clinical diagnosis + pathway generation | Free tier |
| NLM ClinicalTables API | ICD-10-CM validation | Free, no key |
| NLM MedlinePlus Connect | Condition summaries | Free, no key |
| CGHS Rate Schedule 2023 | Official Indian procedure costs | Public data |
| National Hospital Directory | Hospital data with accreditation | Public data |

---

## Project Structure

```
CureWise/
├── backend/
│   ├── main.py                 # FastAPI app, CORS, router registration
│   ├── auth.py                 # JWT authentication
│   ├── database.py             # PostgreSQL connection
│   ├── schemas.py              # Pydantic schemas
│   ├── requirements.txt
│   └── routers/
│       ├── diagnosis.py        # LLM + ICD-10 symptom mapping
│       ├── clinical.py         # Treatment pathway engine (3-tier)
│       ├── hospitals.py        # Hospital search + nearby (PostGIS)
│       ├── procedures.py       # CGHS procedure lookup + cost estimation
│       └── users.py            # User profile management
│
├── src/
│   ├── components/healthcare/
│   │   ├── StepInput.tsx       # Screen 1: Symptom input + voice
│   │   ├── StepCondition.tsx   # Screen 2: Clinical mapping results
│   │   ├── StepTreatment.tsx   # Screen 3: Treatment pathways
│   │   ├── StepHospitals.tsx   # Screen 4: Hospital selection
│   │   ├── StepFinance.tsx     # Screen 5: Financial planning
│   │   └── HospitalSplitView.tsx
│   ├── lib/api.ts              # All API calls + TypeScript interfaces
│   └── pages/Index.tsx         # Main navigator flow orchestrator
│
├── data/
│   ├── cleaned_cghs_rates_full.csv
│   └── final_hospital_directory.csv
│
├── screenshots/                # App screenshots
└── public/logo.png
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Supabase project (PostgreSQL + PostGIS)
- Groq API key — free at [console.groq.com](https://console.groq.com)

### 1. Clone

```bash
git clone https://github.com/pratik3847/Dev_Dynamos_TenzorX.git
cd Dev_Dynamos_TenzorX
```

### 2. Backend

```bash
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r backend/requirements.txt
```

Create `backend/.env` (see `backend/.env.example` for reference):

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_DB_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
JWT_SECRET_KEY=any-random-32-char-string
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
LLM_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
LLM_API_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
```

```bash
uvicorn backend.main:app --reload
# API  → http://localhost:8000
# Docs → http://localhost:8000/docs
```

### 3. Frontend

```bash
npm install --legacy-peer-deps
npm run dev
# App → http://localhost:5173
```

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/signup` | POST | Register new user |
| `/api/v1/auth/login` | POST | Login, returns JWT |
| `/api/v1/auth/me` | GET | Get current user profile |
| `/api/v1/diagnosis/match` | POST | Map symptoms → ICD-10 + differentials |
| `/api/v1/clinical/pathway/{icd10}` | GET | Get treatment pathways |
| `/api/v1/hospitals/search` | GET | Search hospitals by location/specialty |
| `/api/v1/hospitals/nearby` | POST | Find hospitals near GPS coordinates |
| `/api/v1/procedures/estimate` | POST | Calculate cost estimate |

Full interactive docs: `http://localhost:8000/docs`

---

## Clinical Accuracy Standards

| Rule | Implementation |
|------|---------------|
| Never a final diagnosis | LLM system prompt enforces this with strict rules |
| Age-appropriate recommendations | <18 paediatric · 18–35 conservative preferred · 56+ anaesthesia risk · 70+ high surgical risk |
| Comorbidity-specific warnings | Named reasons: *"Diabetes: HbA1c pre-op check"* — not generic text |
| ICD-10 code accuracy | S-codes never used for degenerative/idiopathic conditions |
| Confidence transparency | Score shown on every diagnosis; <50% changes primary CTA |
| Disclaimer on every screen | Not just first and last |
| Data source attribution | CGHS 2023, ICMR, NLM cited |
| Budget mismatch warning | Fires if budget < 30% of minimum treatment cost |

---

<div align="center">

Built with ❤️ for accessible, transparent healthcare in India

**Team Dev Dynamos · TenzorX Hackathon**

</div>
