export const sessionStore = {
  get<T>(key: string): T | null {
    try {
      const item = sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : null;
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown): void {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage errors
    }
  },
  clear(key: string): void {
    sessionStorage.removeItem(key);
  },
  clearAll(): void {
    const keys = ["step_input_data", "step_finance_data", "step_condition_data", "navigator_current_step"];
    keys.forEach((k) => sessionStorage.removeItem(k));
  },
};
