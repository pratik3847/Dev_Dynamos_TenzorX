// Symptom → Condition mapping engine + treatment/hospital catalogs.
// Demo-only data for the AI Healthcare Navigator.

export type Severity = "low" | "moderate" | "high";

export interface Condition {
  id: string;
  name: string;
  specialty: string;
  description: string;
  indicators: string[];
  severity: Severity;
  keywords: string[];
  treatments: string[]; // treatment ids
}

export interface Treatment {
  id: string;
  name: string;
  iconKey: "pill" | "heart" | "stethoscope" | "syringe" | "activity" | "brain";
  costMin: number;
  costMax: number;
  desc: string;
  duration: string;
  invasive: string;
  recommended?: boolean;
}

export type HospitalTier = "budget" | "mid_tier" | "premium";

export interface Hospital {
  id: string;
  name: string;
  rating: number;
  reviews: number;
  accred: "NABH" | "JCI" | "NABH + JCI";
  tier: HospitalTier;
  nabh_accredited?: boolean;
  cost: number;
  city: string;
  distance: string; // fallback display when no geo coords known
  lat: number;
  lng: number;
  specialties: string[];
  recommended?: boolean;
  waitDays: number;
}

export const CONDITIONS: Condition[] = [
  {
    id: "angina",
    name: "Stable Angina (CAD)",
    specialty: "Cardiology",
    description: "Coronary Artery Disease — chest discomfort caused by reduced blood flow to the heart.",
    indicators: ["Chest discomfort during exertion", "Fatigue and shortness of breath", "Symptoms relieved with rest"],
    severity: "high",
    keywords: ["chest pain", "chest", "fatigue", "shortness of breath", "breath", "tightness", "heart"],
    treatments: ["meds-cardiac", "angioplasty", "cabg"],
  },
  {
    id: "migraine",
    name: "Migraine / Tension Headache",
    specialty: "Neurology",
    description: "Recurrent headache disorder, often with sensitivity to light, sound, or activity.",
    indicators: ["Persistent or throbbing headache", "Dizziness or visual aura", "Nausea or light sensitivity"],
    severity: "moderate",
    keywords: ["headache", "migraine", "dizziness", "dizzy", "head", "nausea", "light"],
    treatments: ["meds-neuro", "therapy-neuro", "imaging-mri"],
  },
  {
    id: "osteo",
    name: "Osteoarthritis (Knee)",
    specialty: "Orthopedics",
    description: "Degenerative joint condition causing knee pain, stiffness, and reduced mobility.",
    indicators: ["Joint pain when walking or climbing stairs", "Morning stiffness", "Swelling around the joint"],
    severity: "moderate",
    keywords: ["knee", "joint", "pain when walking", "stiffness", "swelling", "back pain", "hip"],
    treatments: ["physio", "meds-ortho", "knee-replacement"],
  },
  {
    id: "viral",
    name: "Viral Fever / Flu",
    specialty: "General Medicine",
    description: "Acute viral infection with fever, body ache, and fatigue lasting a few days.",
    indicators: ["High body temperature", "Body ache and weakness", "Cough or sore throat"],
    severity: "low",
    keywords: ["fever", "body ache", "cough", "cold", "sore throat", "flu", "weakness"],
    treatments: ["meds-general", "tests-blood", "consultation"],
  },
];

export const TREATMENTS: Record<string, Treatment> = {
  "meds-cardiac": {
    id: "meds-cardiac",
    name: "Medication & Lifestyle",
    iconKey: "pill",
    costMin: 10000,
    costMax: 50000,
    desc: "Daily medications (statins, beta-blockers) combined with diet and exercise plan.",
    duration: "Ongoing",
    invasive: "Non-invasive",
  },
  angioplasty: {
    id: "angioplasty",
    name: "Angioplasty (PCI)",
    iconKey: "heart",
    costMin: 150000,
    costMax: 500000,
    desc: "Minimally invasive procedure to widen blocked arteries using a stent.",
    duration: "1–2 days",
    invasive: "Minimally invasive",
    recommended: true,
  },
  cabg: {
    id: "cabg",
    name: "Bypass Surgery (CABG)",
    iconKey: "stethoscope",
    costMin: 300000,
    costMax: 800000,
    desc: "Open-heart surgery creating new routes around blocked arteries.",
    duration: "5–7 days",
    invasive: "Major surgery",
  },
  "meds-neuro": {
    id: "meds-neuro",
    name: "Preventive Medication",
    iconKey: "pill",
    costMin: 5000,
    costMax: 25000,
    desc: "Triptans and preventive medication tailored to migraine triggers.",
    duration: "Ongoing",
    invasive: "Non-invasive",
    recommended: true,
  },
  "therapy-neuro": {
    id: "therapy-neuro",
    name: "Cognitive Therapy",
    iconKey: "brain",
    costMin: 15000,
    costMax: 60000,
    desc: "Stress-management and biofeedback therapy to reduce attack frequency.",
    duration: "8–12 weeks",
    invasive: "Non-invasive",
  },
  "imaging-mri": {
    id: "imaging-mri",
    name: "MRI & Diagnostic Workup",
    iconKey: "activity",
    costMin: 8000,
    costMax: 20000,
    desc: "Brain MRI and neurological assessment to rule out secondary causes.",
    duration: "1 day",
    invasive: "Non-invasive",
  },
  physio: {
    id: "physio",
    name: "Physiotherapy",
    iconKey: "activity",
    costMin: 8000,
    costMax: 40000,
    desc: "Targeted exercises, manual therapy, and lifestyle modification.",
    duration: "6–12 weeks",
    invasive: "Non-invasive",
    recommended: true,
  },
  "meds-ortho": {
    id: "meds-ortho",
    name: "Pain & Anti-inflammatory",
    iconKey: "pill",
    costMin: 4000,
    costMax: 20000,
    desc: "NSAIDs and joint-support supplements with periodic review.",
    duration: "Ongoing",
    invasive: "Non-invasive",
  },
  "knee-replacement": {
    id: "knee-replacement",
    name: "Knee Replacement",
    iconKey: "stethoscope",
    costMin: 200000,
    costMax: 450000,
    desc: "Surgical replacement of damaged knee joint with a prosthetic implant.",
    duration: "4–6 days",
    invasive: "Major surgery",
  },
  "meds-general": {
    id: "meds-general",
    name: "Medication & Rest",
    iconKey: "pill",
    costMin: 1000,
    costMax: 5000,
    desc: "Antipyretics, hydration, and supportive care under physician guidance.",
    duration: "5–7 days",
    invasive: "Non-invasive",
    recommended: true,
  },
  "tests-blood": {
    id: "tests-blood",
    name: "Blood Workup",
    iconKey: "syringe",
    costMin: 1500,
    costMax: 6000,
    desc: "CBC, dengue, malaria & typhoid screening to confirm diagnosis.",
    duration: "Same day",
    invasive: "Minimally invasive",
  },
  consultation: {
    id: "consultation",
    name: "Doctor Consultation",
    iconKey: "stethoscope",
    costMin: 500,
    costMax: 2000,
    desc: "In-person or video consultation with a general physician.",
    duration: "30 mins",
    invasive: "Non-invasive",
  },
};

export const HOSPITALS: Hospital[] = [
  // Mumbai
  {
    id: "h1",
    name: "Apollo Hospitals",
    rating: 4.8,
    reviews: 2840,
    accred: "NABH + JCI",
    tier: "mid_tier",
    nabh_accredited: true,
    cost: 280000,
    city: "Mumbai",
    distance: "3.2 km",
    lat: 19.076,
    lng: 72.8777,
    specialties: ["Cardiology", "Neurology", "Orthopedics", "General Medicine"],
    recommended: true,
    waitDays: 2,
  },
  {
    id: "h2",
    name: "Fortis Healthcare",
    rating: 4.6,
    reviews: 1920,
    accred: "JCI",
    tier: "premium",
    nabh_accredited: false,
    cost: 320000,
    city: "Mumbai",
    distance: "5.1 km",
    lat: 19.1136,
    lng: 72.8697,
    specialties: ["Cardiology", "Orthopedics", "Neurology"],
    waitDays: 4,
  },
  {
    id: "h3",
    name: "Max Super Speciality",
    rating: 4.5,
    reviews: 1640,
    accred: "NABH",
    tier: "mid_tier",
    nabh_accredited: true,
    cost: 250000,
    city: "Mumbai",
    distance: "7.4 km",
    lat: 19.033,
    lng: 72.857,
    specialties: ["Cardiology", "General Medicine", "Orthopedics"],
    waitDays: 1,
  },
  {
    id: "h4",
    name: "Lilavati Hospital",
    rating: 4.4,
    reviews: 1210,
    accred: "NABH",
    tier: "premium",
    nabh_accredited: true,
    cost: 360000,
    city: "Mumbai",
    distance: "4.8 km",
    lat: 19.0509,
    lng: 72.8294,
    specialties: ["Cardiology", "Neurology", "Orthopedics"],
    waitDays: 6,
  },
  {
    id: "h5",
    name: "Kokilaben Dhirubhai Ambani",
    rating: 4.7,
    reviews: 2050,
    accred: "NABH + JCI",
    tier: "premium",
    nabh_accredited: true,
    cost: 340000,
    city: "Mumbai",
    distance: "8.9 km",
    lat: 19.133,
    lng: 72.8265,
    specialties: ["Cardiology", "Neurology", "Orthopedics", "General Medicine"],
    waitDays: 3,
  },
  // Delhi
  {
    id: "h6",
    name: "AIIMS Delhi",
    rating: 4.7,
    reviews: 3120,
    accred: "NABH",
    tier: "budget",
    nabh_accredited: true,
    cost: 180000,
    city: "Delhi",
    distance: "-",
    lat: 28.5672,
    lng: 77.21,
    specialties: ["Cardiology", "Neurology", "Orthopedics", "General Medicine"],
    recommended: true,
    waitDays: 5,
  },
  {
    id: "h7",
    name: "Medanta - The Medicity",
    rating: 4.7,
    reviews: 2410,
    accred: "NABH + JCI",
    tier: "premium",
    nabh_accredited: true,
    cost: 350000,
    city: "Gurgaon",
    distance: "-",
    lat: 28.4395,
    lng: 77.041,
    specialties: ["Cardiology", "Neurology", "Orthopedics"],
    waitDays: 2,
  },
  {
    id: "h8",
    name: "Max Saket",
    rating: 4.5,
    reviews: 1780,
    accred: "NABH",
    tier: "mid_tier",
    nabh_accredited: true,
    cost: 290000,
    city: "Delhi",
    distance: "-",
    lat: 28.5286,
    lng: 77.2185,
    specialties: ["Cardiology", "Orthopedics", "General Medicine"],
    waitDays: 3,
  },
  // Bangalore
  {
    id: "h9",
    name: "Manipal Hospital",
    rating: 4.6,
    reviews: 1980,
    accred: "NABH",
    tier: "mid_tier",
    nabh_accredited: true,
    cost: 270000,
    city: "Bangalore",
    distance: "-",
    lat: 12.9591,
    lng: 77.6494,
    specialties: ["Cardiology", "Neurology", "Orthopedics", "General Medicine"],
    waitDays: 2,
  },
  {
    id: "h10",
    name: "Narayana Health City",
    rating: 4.7,
    reviews: 2210,
    accred: "NABH + JCI",
    tier: "budget",
    nabh_accredited: true,
    cost: 240000,
    city: "Bangalore",
    distance: "-",
    lat: 12.8086,
    lng: 77.677,
    specialties: ["Cardiology", "Orthopedics", "Neurology"],
    recommended: true,
    waitDays: 3,
  },
  // Chennai
  {
    id: "h11",
    name: "Apollo Chennai",
    rating: 4.8,
    reviews: 2640,
    accred: "NABH + JCI",
    tier: "mid_tier",
    nabh_accredited: true,
    cost: 260000,
    city: "Chennai",
    distance: "-",
    lat: 13.0639,
    lng: 80.252,
    specialties: ["Cardiology", "Neurology", "Orthopedics", "General Medicine"],
    recommended: true,
    waitDays: 2,
  },
  {
    id: "h12",
    name: "MIOT International",
    rating: 4.5,
    reviews: 1430,
    accred: "NABH",
    tier: "mid_tier",
    nabh_accredited: true,
    cost: 280000,
    city: "Chennai",
    distance: "-",
    lat: 13.0118,
    lng: 80.198,
    specialties: ["Cardiology", "Orthopedics"],
    waitDays: 4,
  },
  // Hyderabad
  {
    id: "h13",
    name: "Apollo Jubilee Hills",
    rating: 4.7,
    reviews: 2090,
    accred: "NABH + JCI",
    tier: "mid_tier",
    nabh_accredited: true,
    cost: 250000,
    city: "Hyderabad",
    distance: "-",
    lat: 17.4239,
    lng: 78.4099,
    specialties: ["Cardiology", "Neurology", "Orthopedics", "General Medicine"],
    waitDays: 2,
  },
  {
    id: "h14",
    name: "KIMS Hospital",
    rating: 4.5,
    reviews: 1620,
    accred: "NABH",
    tier: "budget",
    nabh_accredited: true,
    cost: 230000,
    city: "Hyderabad",
    distance: "-",
    lat: 17.4378,
    lng: 78.4483,
    specialties: ["Cardiology", "Orthopedics", "Neurology"],
    waitDays: 3,
  },
  // Pune
  {
    id: "h15",
    name: "Ruby Hall Clinic",
    rating: 4.5,
    reviews: 1510,
    accred: "NABH",
    tier: "budget",
    nabh_accredited: true,
    cost: 240000,
    city: "Pune",
    distance: "-",
    lat: 18.5331,
    lng: 73.8807,
    specialties: ["Cardiology", "Orthopedics", "General Medicine", "Neurology"],
    waitDays: 2,
  },
  {
    id: "h16",
    name: "Jehangir Hospital",
    rating: 4.4,
    reviews: 1180,
    accred: "NABH",
    tier: "mid_tier",
    nabh_accredited: true,
    cost: 260000,
    city: "Pune",
    distance: "-",
    lat: 18.529,
    lng: 73.877,
    specialties: ["Cardiology", "Orthopedics"],
    waitDays: 3,
  },
  // Nagpur
  {
    id: "h17",
    name: "Orange City Medical Center",
    rating: 4.3,
    reviews: 980,
    accred: "NABH",
    tier: "budget",
    nabh_accredited: true,
    cost: 190000,
    city: "Nagpur",
    distance: "-",
    lat: 21.154,
    lng: 79.098,
    specialties: ["Cardiology", "General Medicine", "Orthopedics"],
    waitDays: 3,
  },
  // Jaipur
  {
    id: "h18",
    name: "Pink City Specialty Hospital",
    rating: 4.4,
    reviews: 1120,
    accred: "NABH + JCI",
    tier: "mid_tier",
    nabh_accredited: true,
    cost: 230000,
    city: "Jaipur",
    distance: "-",
    lat: 26.904,
    lng: 75.794,
    specialties: ["Cardiology", "Neurology", "General Medicine"],
    waitDays: 4,
  },
  // Bhopal
  {
    id: "h19",
    name: "Bhopal Heart Institute",
    rating: 4.2,
    reviews: 760,
    accred: "NABH",
    tier: "budget",
    nabh_accredited: true,
    cost: 200000,
    city: "Bhopal",
    distance: "-",
    lat: 23.252,
    lng: 77.421,
    specialties: ["Cardiology", "General Medicine"],
    waitDays: 2,
  },
  // Lucknow
  {
    id: "h20",
    name: "Awadh Multi-Speciality",
    rating: 4.3,
    reviews: 910,
    accred: "NABH",
    tier: "budget",
    nabh_accredited: true,
    cost: 210000,
    city: "Lucknow",
    distance: "-",
    lat: 26.855,
    lng: 80.958,
    specialties: ["Cardiology", "Orthopedics", "General Medicine"],
    waitDays: 3,
  },
];

export interface MatchResult {
  condition: Condition;
  confidence: number;
  matchedKeywords: string[];
}

export function matchCondition(symptoms: string): MatchResult {
  const text = symptoms.toLowerCase();
  let best: MatchResult = {
    condition: CONDITIONS[0],
    confidence: 55,
    matchedKeywords: [],
  };
  let bestScore = 0;

  CONDITIONS.forEach((c) => {
    const matched = c.keywords.filter((k) => text.includes(k));
    const score = matched.length;
    if (score > bestScore) {
      bestScore = score;
      const confidence = Math.min(96, 60 + score * 8 + (score >= 2 ? 6 : 0));
      best = { condition: c, confidence, matchedKeywords: matched };
    }
  });

  return best;
}

export function hospitalsForSpecialty(specialty: string): Hospital[] {
  return HOSPITALS.filter((h) => h.specialties.includes(specialty)).sort(
    (a, b) => b.rating - a.rating
  );
}

export function formatINR(value: number): string {
  return "₹" + value.toLocaleString("en-IN");
}

export function formatCostRange(min: number, max: number): string {
  const fmt = (n: number) =>
    n >= 100000 ? `${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L` : `${n / 1000}K`;
  return `₹${fmt(min)} – ₹${fmt(max)}`;
}
