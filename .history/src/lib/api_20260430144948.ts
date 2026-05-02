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
  allergies?: string;
  conditions?: string;
  medications?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  insurance_provider?: string;
  insurance_id?: string;
  budget_pref?: number;
}

const buildError = async (res: Response) => {
  let message = "Request failed";
  try {
    const data = await res.json();
    if (data?.detail) message = data.detail;
  } catch {
    // ignore parsing errors
  }
  throw new Error(message);
};

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
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
