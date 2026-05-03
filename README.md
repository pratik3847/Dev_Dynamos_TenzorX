<div align="center">

<img src="public/favicon.ico" width="64" height="64" alt="CareCompass AI" />

# CareCompass AI

### AI-Powered Healthcare Navigator for Indian Patients

[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat&logo=supabase)](https://supabase.com)
[![Groq](https://img.shields.io/badge/LLM-Groq%20Llama%203.3-F55036?style=flat)](https://groq.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat)](LICENSE)

**CareCompass AI** bridges the gap between patients and quality healthcare in India — from symptom input to hospital selection, treatment planning, and financial guidance — all in one intelligent, transparent flow.

[Live Demo](#) · [Report Bug](https://github.com/pratik3847/Dev_Dynamos_TenzorX/issues) · [Request Feature](https://github.com/pratik3847/Dev_Dynamos_TenzorX/issues)

</div>

---

## The Problem

Indian patients face three critical barriers when seeking healthcare:

- **Information asymmetry** — no reliable way to understand what treatment they need or what it costs
- **Hospital selection paralysis** — thousands of hospitals with no transparent quality or cost data
- **Financial shock** — unexpected bills with no planning tools or financing guidance

CareCompass AI solves all three in a single guided flow.

---

## What It Does

```
Symptoms → AI Diagnosis → Treatment Pathways → Hospital Selection → Financial Planning
```

| Step | What Happens |
|------|-------------|
| **1. Symptom Input** | Patient describes symptoms in plain language or via voice. Age, location, budget, and existing conditions are captured. |
| **2. Clinical Mapping** | LLM (Llama 3.3 via Groq) maps symptoms to ICD-10 codes with confidence scores, differential diagnoses, missing information flags, and recommended next steps. |
| **3. Treatment Pathways** | Evidence-based pathways generated from CGHS rate data + LLM clinical knowledge. Each step is individually priced. Age and comorbidity warnings shown. |
| **4. Hospital Selection** | Real hospitals from a national database, filtered by location/GPS, specialty, tier (Govt/Private/Trust), NABH accreditation, and distance. |
| **5. Financial Planning** | Itemised cost estimate derived from the chosen pathway and hospital tier. EMI calculator, insurance coverage input, finance partner directory, and PDF export. |

---

## Key Features

### Clinical Intelligence
- **LLM-powered diagnosis** using Groq's Llama 3.3 70B with structured clinical prompts
- **ICD-10 code mapping** via NLM ClinicalTables API (free, no key required)
- **Differential diagnoses** with individual confidence scores and clinical reasoning
- **Critical symptom weighting** — dengue detection from retro-orbital pain, endemic region boosting, cardiac vs GERD differentiation
- **Age-appropriateness matrix** — surgical pathways flagged for patients <18, >70, or with comorbidities
- **Comorbidity flags** — named risk reasons: diabetes → wound healing, CKD → contrast dye contraindication, cardiac → clearance required

### Treatment Pathways
- **30+ static pathways** for common Indian conditions (dengue, typhoid, malaria, diabetes, pneumonia, asthma, cardiac, orthopaedic, etc.) with verified CGHS 2023 rates
- **LLM-generated pathways** for any ICD-10 code not in the static cache
- **CGHS DB pricing** — each step looked up against the national procedure rate database
- **NLM MedlinePlus integration** — free condition summaries for LLM context

### Hospital Directory
- **National hospital database** with 10,000+ facilities
- **GPS-based nearby search** using PostGIS spatial queries
- **Government / Private / Trust / NGO** classification with colour-coded badges
- **NABH, JCI, ISO, NABL** accreditation badges from real DB data
- **Composite match score** — specialty relevance, accreditation, bed count, distance, emergency services
- **CGHS/PMJAY empanelment** flags for government scheme eligibility

### Financial Planning
- **Pathway-derived cost estimates** — totals computed from actual treatment steps, not generic formulas
- **Hospital tier adjustment** — budget (×1.0), mid-tier (×1.3), premium (×1.8), NABH premium (×1.15)
- **Named contingency buffer** — explicitly states which comorbidity adds which cost (e.g. "diabetes: wound healing risk")
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
| Sonner | Toast notifications |
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

### AI & Data Sources
| Source | What It Provides | Cost |
|--------|-----------------|------|
| Groq API (Llama 3.3 70B) | Clinical diagnosis, treatment pathway generation | Free tier |
| NLM ClinicalTables API | ICD-10-CM code search and validation | Free, no key |
| NLM MedlinePlus Connect | Condition summaries for LLM context | Free, no key |
| CGHS Rate Schedule 2023 | Official Indian government procedure costs | Public data |
| National Hospital Directory | Hospital data with accreditation and location | Public data |

---

## Project Structure

```
Dev_Dynamos_TenzorX/
├── backend/
│   ├── main.py                 # FastAPI app, CORS, router registration
│   ├── auth.py                 # JWT authentication
│   ├── database.py             # PostgreSQL connection
│   ├── models.py               # SQLAlchemy models
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
│   ├── components/
│   │   ├── healthcare/
│   │   │   ├── StepInput.tsx       # Screen 1: Symptom input
│   │   │   ├── StepCondition.tsx   # Screen 2: Clinical mapping results
│   │   │   ├── StepTreatment.tsx   # Screen 3: Treatment pathways
│   │   │   ├── StepHospitals.tsx   # Screen 4: Hospital selection
│   │   │   ├── StepFinance.tsx     # Screen 5: Financial planning
│   │   │   ├── HospitalSplitView.tsx  # Map + list split view
│   │   │   └── Stepper.tsx
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/
│   │   ├── api.ts              # All API calls + TypeScript interfaces
│   │   ├── healthcare-data.ts  # Offline fallback data
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Index.tsx           # Main navigator flow orchestrator
│   │   ├── Login.tsx
│   │   ├── Signup.tsx
│   │   └── Profile.tsx
│   └── context/
│       └── AuthContext.tsx     # JWT auth state
│
└── data/
    ├── cleaned_cghs_rates_full.csv     # CGHS procedure rates
    └── final_hospital_directory.csv    # National hospital data
```

---

## Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL with PostGIS extension (or Supabase project)

### 1. Clone the repository

```bash
git clone https://github.com/pratik3847/Dev_Dynamos_TenzorX.git
cd Dev_Dynamos_TenzorX
```

### 2. Backend setup

```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
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

Start the backend:

```bash
uvicorn backend.main:app --reload
```

API available at `http://localhost:8000` · Docs at `http://localhost:8000/docs`

### 3. Frontend setup

```bash
# Install dependencies (use legacy peer deps for react-leaflet compatibility)
npm install --legacy-peer-deps

# Start development server
npm run dev
```

Frontend available at `http://localhost:5173`

---

## Database Setup

Import the hospital and CGHS procedure data into your Supabase project:

```bash
# Import CGHS procedure rates
python backend/scripts/import_data.py
```

The database requires two main tables:
- `public.hospitals` — national hospital directory with PostGIS `location` column
- `public.cghs_procedures` — CGHS rate schedule with procedure codes and rates

---

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/signup` | POST | Register new user |
| `/api/v1/auth/login` | POST | Login, returns JWT |
| `/api/v1/auth/me` | GET | Get current user profile |
| `/api/v1/diagnosis/match` | POST | Map symptoms to ICD-10 + differentials |
| `/api/v1/clinical/pathway/{icd10}` | GET | Get treatment pathways for condition |
| `/api/v1/hospitals/search` | GET | Search hospitals by location/specialty |
| `/api/v1/hospitals/nearby` | POST | Find hospitals near GPS coordinates |
| `/api/v1/procedures/search` | GET | Search CGHS procedures |
| `/api/v1/procedures/estimate` | POST | Calculate cost estimate |

Full interactive docs: `http://localhost:8000/docs`

---

## Clinical Data Sources

All clinical content is traceable to verified sources:

| Data | Source | Notes |
|------|--------|-------|
| Procedure costs | CGHS Rate Schedule 2023 | Official Government of India rates |
| ICD-10 codes | NLM ClinicalTables (clinicaltables.nlm.nih.gov) | US National Library of Medicine |
| Condition summaries | NLM MedlinePlus Connect | Free API, no key required |
| Treatment guidelines | ICMR, WHO, NICE guidelines | Via LLM training data |
| Hospital data | National Health Authority directory | Public dataset |

---

## Team

**Dev Dynamos** — Built for TenzorX Hackathon

---

## Disclaimer

CareCompass AI is a **clinical decision support tool**, not a medical device or substitute for professional medical advice. All AI-generated content is for informational purposes only. Always consult a qualified physician before making healthcare decisions.

---

<div align="center">

Built with ❤️ for accessible, transparent healthcare in India

</div>
