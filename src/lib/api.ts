const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface UserResponse {
  user_id: string;
  name: string;
  email: string;
  age?: number;
  gender?: string;
  phone?: string;
  city?: string;
  pincode?: string;
  blood_group?: string;
  height_cm?: number;
  weight_kg?: number;
  allergies: string[];
  comorbidities: string[];
  medications: string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_id?: string;
  budget_pref?: number;
  search_history: Array<Record<string, unknown>>;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  user: UserResponse;
}

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
  age?: number;
  gender?: string;
  phone?: string;
  city?: string;
  pincode?: string;
  blood_group?: string;
  height_cm?: number;
  weight_kg?: number;
  allergies?: string;
  conditions?: string;
  medications?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_id?: string;
  budget_pref?: number;
}

export interface UpdateProfilePayload {
  name?: string;
  age?: number;
  gender?: string;
  phone?: string;
  city?: string;
  pincode?: string;
  blood_group?: string;
  height_cm?: number;
  weight_kg?: number;
  allergies?: string | string[];
  conditions?: string | string[];
  medications?: string | string[];
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_id?: string;
  budget_pref?: number;
}

export interface DiagnosisMatchRequest {
  symptoms?: string;
  diagnosis?: string;
}

export interface Icd10Match {
  code: string;
  name: string;
}

export interface DiagnosisMatchResponse {
  condition_name?: string;
  specialty?: string;
  confidence?: number;
  keywords?: string[];
  icd10?: Icd10Match;
  source?: string;
  warnings?: string[];
}

const buildError = async (res: Response) => {
  let message = "Request failed";
  try {
    const data = await res.json();
    if (data?.detail) {
      message = typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail);
    }
  } catch {
    // ignore parsing errors
  }
  throw new Error(message);
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const { headers, ...rest } = options;
  const res = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
  });

  if (!res.ok) {
    await buildError(res);
  }

  return res.json() as Promise<T>;
};

export const signup = (payload: SignupPayload) =>
  request<TokenResponse>("/api/v1/auth/signup", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const login = (email: string, password: string) =>
  request<TokenResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

export const getMe = (token: string) =>
  request<UserResponse>("/api/v1/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

export const updateProfile = (token: string, payload: UpdateProfilePayload) =>
  request<UserResponse>("/api/v1/auth/profile", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

export const matchDiagnosis = (payload: DiagnosisMatchRequest) =>
  request<DiagnosisMatchResponse>("/api/v1/diagnosis/match", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export interface ClinicalMapRequest {
  symptoms: string;
  age?: number | null;
  comorbidities?: string[];
}

export interface ClinicalMapResponse extends DiagnosisMatchResponse {
  icd10_code: string;
  emergency_flag: boolean;
  reasoning: string;
  procedures: string[];
  all_matches: Icd10Match[];
}

export interface PathwayStep {
  seq: number;
  name: string;
  cost_low: number;
  cost_high: number;
}

export interface PathwayOption {
  id: string;
  name: string;
  type: "surgical" | "non_surgical";
  recommended: boolean;
  steps: PathwayStep[];
  total_cost_low: number;
  total_cost_high: number;
  note?: string;
}

export interface PathwayResponse {
  icd10_code: string;
  condition: string;
  pathways: PathwayOption[];
  matched: boolean;
}

export const mapSymptoms = async (token: string, payload: ClinicalMapRequest): Promise<ClinicalMapResponse> => {
  const baseResponse = await matchDiagnosis({ symptoms: payload.symptoms });
  
  // Transform base response into the expected ClinicalMapResponse
  const icd10_code = baseResponse.icd10?.code || "R69"; // Unknown if missing
  const isEmergency = 
    payload.symptoms.toLowerCase().includes("chest pain") || 
    payload.symptoms.toLowerCase().includes("stroke") ||
    payload.symptoms.toLowerCase().includes("emergency") ||
    payload.symptoms.toLowerCase().includes("heart attack") ||
    payload.symptoms.toLowerCase().includes("severe bleeding");
    
  return {
    ...baseResponse,
    icd10_code,
    emergency_flag: isEmergency,
    reasoning: `Matched based on clinical guidelines for ${baseResponse.condition_name || "reported symptoms"}.`,
    procedures: baseResponse.keywords || [],
    all_matches: baseResponse.icd10 ? [baseResponse.icd10] : [],
  };
};

export const getPathway = async (token: string, icd10Code: string): Promise<PathwayResponse> => {
  try {
    return await request<PathwayResponse>(`/api/v1/clinical/pathway/${encodeURIComponent(icd10Code)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.error("getPathway error:", error);
    // Return empty fallback
    return {
      icd10_code: icd10Code,
      condition: "Unknown",
      pathways: [],
      matched: false
    };
  }
};

export interface HospitalSearchParams {
  district?: string;
  state?: string;
  name?: string;
  specialty?: string;
  tier?: string;
  nabh_only?: boolean;
  limit?: number;
  offset?: number;
}

export interface NearbySearchParams {
  lat: number;
  lng: number;
  radius_km?: number;
  specialty?: string;
  tier?: string;
  nabh_only?: boolean;
  limit?: number;
}

export interface HospitalResult {
  id: string;
  hospital_name: string;
  hospital_category: string | null;
  care_type: string | null;
  discipline: string | null;
  address: string | null;
  state: string | null;
  district: string | null;
  town: string | null;
  pincode: string | null;
  telephone: string | null;
  mobile: string | null;
  emergency_num: string | null;
  email_primary: string | null;
  website: string | null;
  specialties: string | null;
  facilities: string | null;
  accreditation: string | null;
  total_beds: number | null;
  num_doctors: number | null;
  emergency_services: string | null;
  tariff_range: string | null;
  lat: number | null;
  lng: number | null;
  tier: "budget" | "mid_tier" | "premium";
  nabh_accredited: boolean;
  distance_km?: number;
}

export interface ProcedureResult {
  id: string;
  cghs_code: string;
  procedure_name: string;
  rate_non_nabh: number | null;
  rate_nabh: number | null;
  rate_super_speciality: number | null;
  specialty_classification: string | null;
}

export interface CostEstimate {
  cghs_code: string;
  procedure_name: string;
  hospital_tier: string;
  nabh_accredited: boolean;
  base_rate: number;
  tier_multiplier: number;
  los_days: number;
  procedure_cost: number;
  stay_cost_low: number;
  stay_cost_high: number;
  diagnostics_low: number;
  diagnostics_high: number;
  medicines_low: number;
  medicines_high: number;
  contingency_pct: number;
  contingency_low: number;
  contingency_high: number;
  total_low: number;
  total_high: number;
  applied_flags: string[];
  specialty_classification: string;
  disclaimer: string;
}

export const searchHospitals = async (token: string, params: HospitalSearchParams): Promise<HospitalResult[]> => {
  try {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) query.append(key, String(value));
    });
    return await request<HospitalResult[]>(`/api/v1/hospitals/search?${query.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.error("searchHospitals error:", error);
    return [];
  }
};

export const searchHospitalsNearby = async (token: string, params: NearbySearchParams): Promise<HospitalResult[]> => {
  try {
    console.log("Sending nearby payload:", params);
    return await request<HospitalResult[]>("/api/v1/hospitals/nearby", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(params),
    });
  } catch (error) {
    console.error("searchHospitalsNearby error:", error);
    return [];
  }
};

export const getHospital = (token: string, hospitalId: string): Promise<HospitalResult> =>
  request<HospitalResult>(`/api/v1/hospitals/${hospitalId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const getStates = async (token: string): Promise<string[]> => {
  try {
    return await request<string[]>("/api/v1/hospitals/states", {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.error("getStates error:", error);
    return [];
  }
};

export const getDistricts = async (token: string, state?: string): Promise<string[]> => {
  try {
    const query = state ? `?state=${encodeURIComponent(state)}` : "";
    return await request<string[]>(`/api/v1/hospitals/districts${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.error("getDistricts error:", error);
    return [];
  }
};

export const searchProcedures = async (token: string, q: string, specialty?: string): Promise<ProcedureResult[]> => {
  try {
    let query = `?q=${encodeURIComponent(q)}`;
    if (specialty) query += `&specialty=${encodeURIComponent(specialty)}`;
    return await request<ProcedureResult[]>(`/api/v1/procedures/search${query}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.error("searchProcedures error:", error);
    return [];
  }
};

export const getProcedureSpecialties = async (token: string): Promise<string[]> => {
  try {
    return await request<string[]>("/api/v1/procedures/specialties", {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (error) {
    console.error("getProcedureSpecialties error:", error);
    return [];
  }
};

export const estimateCost = (
  token: string,
  params: {
    cghs_code: string;
    hospital_tier: string;
    nabh_accredited: boolean;
    age?: number;
    comorbidities?: string[];
    los_override?: number;
  }
): Promise<CostEstimate> =>
  request<CostEstimate>("/api/v1/procedures/estimate", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(params),
  });

