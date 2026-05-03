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

> **CureWise AI** bridges the gap between patients and quality healthcare in India — from symptom input to hospital selection, treatment planning, and financial guidance — all in one intelligent, transparent flow.

**Built for TenzorX Hackathon by Team Dev Dynamos**

</div>

---

## The Problem

Indian patients face three critical barriers when seeking healthcare:

- **Information asymmetry** — no reliable way to understand what treatment they need or what it costs
- **Hospital selection paralysis** — thousands of hospitals with no transparent quality or cost data  
- **Financial shock** — unexpected bills with no planning tools or financing guidance

**CureWise AI solves all three in a single guided 5-step flow.**

---

## Demo Flow

```
Symptoms  →  AI Diagnosis  →  Treatment Pathways  →  Hospital Selection  →  Financial Planning
   1               2                  3                      4                      5
```

| Step | Screen | What Happens |
|------|--------|-------------|
| 1 | **Symptom Input** | Patient describes symptoms in plain language or via voice. Age, location, budget, and existing conditions captured. Budget mismatch warning shown if budget < 30% of likely treatment cost. |
| 2 | **Clinical Mapping** | LLM maps symptoms to ICD-10 codes with confidence scores, differential diagnoses, missing info flags, comorbidity-specific questions, and next steps. |
| 3 | **Treatment Pathways** | Evidence-based pathways from CGHS data + LLM. Each step individually priced. Age-appropriateness and comorbidity surgical risk warnings shown. |
| 4 | **Hospital Selection** | Real hospitals filtered by GPS/location, specialty, tier (Govt/Private/Trust), NABH accreditation, and distance. Interactive map view. |
| 5 | **Financial Planning** | Itemised cost estimate from chosen pathway + hospital tier. EMI calculator, insurance coverage, 6 finance partners, PDF export. |

---

## Key Features

### 🧠 Clinical Intelligence
- LLM-powered diagnosis using **Groq Llama 3.3 70B** with structured clinical prompts
- **ICD-10 code mapping** via NLM ClinicalTables API
- **Differential diagnoses** with individual confidence scores and clinical reasoning
- **Critical symptom weighting** — dengue from retro-orbital pain, endemic region boosting, cardiac vs GERD differentiation
- **Age-appropriateness matrix** — surgical pathways flagged for patients <18, >70, or with comorbidities
- **Named comorbidity flags** — diabetes → wound healing risk, CKD → contrast dye contraindication, cardiac → clearance required

### 💊 Treatment Pathways
- **30+ static pathways** for common Indian conditions with verified CGHS 2023 rates
  - Dengue (outpatient + inpatient + haemorrhagic), Typhoid, Malaria
  - Diabetes, Hypo/Hyperthyroidism, Pneumonia, Asthma, GERD, UTI, Migraine
  - Cardiac (Hypertension, Angina, MI, Heart Failure), Orthopaedic (TKR, THR, Back Pain)
  - General Surgery (Appendicitis, Gallstones, Hernia), Urology (Kidney Stones)
- **LLM-generated pathways** for any ICD-10 code not in the static cache
- **CGHS DB pricing** — each step looked up against the national procedure rate database
- **NLM MedlinePlus** integration for condition context

### 🏥 Hospital Directory
- National hospital database with **10,000+ facilities**
- **GPS-based nearby search** using PostGIS spatial queries
- **Government / Private / Trust / NGO** classification with colour-coded badges
- **NABH, JCI, ISO, NABL** accreditation badges from real DB data
- **Composite match score** — specialty relevance, accreditation, bed count, distance, emergency services
- **CGHS/PMJAY empanelment** flags for government scheme eligibility

### 💰 Financial Planning
- **Pathway-derived cost estimates** — totals computed from actual treatment steps
- **Hospital tier adjustment** — budget (×1.0), mid-tier (×1.3), premium (×1.8), NABH (×1.15)
- **Named contingency buffer** — explicitly states which comorbidity adds which cost
- **EMI calculator** — 0% promo or custom interest rate, down payment slider, tenure selection
- **Insurance coverage** — enter coverage amount, see out-of-pocket instantly
- **6 verified finance partners** — Bajaj Finserv, LazyPay, KreditBee, Arogya Finance, HDFC Bank, CASHe
- **6 health insurance partners** — Star Health, Niva Bupa, HDFC ERGO, Care Health, Aditya Birla, Bajaj Allianz
- **PDF export** — full cost breakdown with patient profile, pathway, hospital, and EMI plan

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
| Source | What It Provides |
|--------|-----------------|
| Groq API (Llama 3.3 70B) | Clinical diagnosis + treatment pathway generation |
| NLM ClinicalTables API | ICD-10-CM code search and validation — free, no key |
| NLM MedlinePlus Connect | Condition summaries for LLM context — free, no key |
| CGHS Rate Schedule 2023 | Official Indian government procedure costs |
| National Hospital Directory | Hospital data with accreditation and location |

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
│   │   └── HospitalSplitView.tsx  # Map + list split view
│   ├── lib/
│   │   └── api.ts              # All API calls + TypeScript interfaces
│   └── pages/
│       └── Index.tsx           # Main navigator flow orchestrator
│
├── data/
│   ├── cleaned_cghs_rates_full.csv     # CGHS procedure rates
│   └── final_hospital_directory.csv    # National hospital data
│
└── public/
    └── logo.png                # CureWise logo
```

---

## Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- Supabase project (PostgreSQL + PostGIS)
- Groq API key (free at [console.groq.com](https://console.groq.com))

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

Create `backend/.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_DB_URL=postgresql://postgres.your-project:password@aws-region.pooler.supabase.com:6543/postgres
JWT_SECRET_KEY=your-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=10080
LLM_API_KEY=your-groq-api-key
LLM_API_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile
```

```bash
uvicorn backend.main:app --reload
# API → http://localhost:8000
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

---

## Clinical Accuracy Standards

All clinical content follows these guidelines:

- **ICD-10 codes** — validated against NLM ClinicalTables (never generic S-codes for non-traumatic conditions)
- **Confidence scoring** — differentials always have lower confidence than primary; <50% triggers "Refine Symptoms" CTA
- **Treatment sequencing** — pre-op tests always before surgery; physiotherapy after surgery
- **Cost benchmarks** — validated against CGHS 2023 rate schedule
- **Age matrix** — <18 paediatric flag, 18–35 conservative preferred, 56+ anaesthesia risk, 70+ high surgical risk
- **Comorbidity flags** — named reasons, not generic warnings

---

## Disclaimer

CureWise AI is a **clinical decision support tool**, not a medical device or substitute for professional medical advice. All AI-generated content is for informational purposes only. Always consult a qualified physician before making healthcare decisions.

---

<div align="center">

Built with ❤️ for accessible, transparent healthcare in India

**Team Dev Dynamos · TenzorX Hackathon**

</div>
