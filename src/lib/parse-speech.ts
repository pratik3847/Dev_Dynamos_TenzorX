// Extracts age, budget, and location from free-form spoken text.
// Returns parsed fields plus a "cleaned" symptoms string with those phrases removed.

const CITIES = [
  "Mumbai", "Delhi", "New Delhi", "Bangalore", "Bengaluru", "Hyderabad",
  "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow",
  "Kochi", "Chandigarh", "Gurgaon", "Gurugram", "Noida", "Surat",
  "Indore", "Bhopal", "Nagpur", "Patna", "Vadodara", "Visakhapatnam",
];

export interface ParsedSpeech {
  age?: string;
  budget?: string;
  location?: string;
  cleaned: string;
}

const wordsToNumber = (w: string): number | null => {
  const map: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
    fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  };
  const parts = w.toLowerCase().split(/[\s-]+/);
  let total = 0;
  let matched = false;
  for (const p of parts) {
    if (map[p] != null) {
      total += map[p];
      matched = true;
    } else return null;
  }
  return matched ? total : null;
};

export const parseSpeech = (text: string): ParsedSpeech => {
  if (!text) return { cleaned: "" };
  let cleaned = ` ${text} `;
  const result: ParsedSpeech = { cleaned: text };

  // ---------- AGE ----------
  // "I am 35", "age 35", "35 years old", "thirty five years old"
  const ageDigit =
    cleaned.match(/\b(?:i'?m|i am|age(?:d)?(?: is)?|aged)\s+(\d{1,3})\b/i) ||
    cleaned.match(/\b(\d{1,3})\s*(?:years?(?:\s*old)?|yrs?\s*old|y\/o|yo)\b/i);
  if (ageDigit) {
    const n = parseInt(ageDigit[1], 10);
    if (n > 0 && n < 120) {
      result.age = String(n);
      cleaned = cleaned.replace(ageDigit[0], " ");
    }
  } else {
    const ageWord = cleaned.match(
      /\b(?:i'?m|i am|age(?:d)?(?: is)?|aged)\s+([a-z\s-]+?)\s+(?:years?\s*old|yrs?\s*old)\b/i,
    );
    if (ageWord) {
      const n = wordsToNumber(ageWord[1]);
      if (n && n > 0 && n < 120) {
        result.age = String(n);
        cleaned = cleaned.replace(ageWord[0], " ");
      }
    }
  }

  // ---------- BUDGET ----------
  // "budget is 3 lakhs", "budget of 300000", "₹3,00,000", "3 lakh budget", "50 thousand"
  const budgetMatchers: Array<{ re: RegExp; mult: number }> = [
    { re: /\b(?:budget(?:\s*(?:is|of|:))?|spend|afford|around|upto|up to)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:[.,]\d+)?)\s*(?:lakhs?|lacs?|lakh)\b/i, mult: 100000 },
    { re: /\b(?:budget(?:\s*(?:is|of|:))?|spend|afford|around|upto|up to)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:[.,]\d+)?)\s*(?:crores?|cr)\b/i, mult: 10000000 },
    { re: /\b(?:budget(?:\s*(?:is|of|:))?|spend|afford|around|upto|up to)\s*(?:₹|rs\.?|inr)?\s*(\d+(?:[.,]\d+)?)\s*(?:thousand|k)\b/i, mult: 1000 },
    { re: /\b(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|lakh)\b/i, mult: 100000 },
    { re: /\b(\d+(?:\.\d+)?)\s*(?:crores?|cr)\b/i, mult: 10000000 },
    { re: /\b(?:budget(?:\s*(?:is|of|:))?|spend|afford|around|upto|up to)\s*(?:₹|rs\.?|inr)?\s*([\d,]{4,})\b/i, mult: 1 },
    { re: /(?:₹|rs\.?|inr)\s*([\d,]{4,})\b/i, mult: 1 },
  ];
  for (const { re, mult } of budgetMatchers) {
    const m = cleaned.match(re);
    if (m) {
      const num = parseFloat(m[1].replace(/,/g, ""));
      if (!isNaN(num) && num > 0) {
        const total = Math.round(num * mult);
        result.budget = total.toLocaleString("en-IN");
        cleaned = cleaned.replace(m[0], " ");
        break;
      }
    }
  }

  // ---------- LOCATION ----------
  // "in Mumbai", "from Delhi", "located in Bangalore", or just any known city mentioned
  const locPhrase = cleaned.match(
    /\b(?:in|from|at|near|located\s+in|live\s+in|based\s+in)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\b/,
  );
  if (locPhrase) {
    const candidate = locPhrase[1].trim();
    const known = CITIES.find((c) => c.toLowerCase() === candidate.toLowerCase());
    if (known) {
      result.location = known === "Bengaluru" ? "Bangalore" : known === "Gurugram" ? "Gurgaon" : known;
      cleaned = cleaned.replace(locPhrase[0], " ");
    }
  }
  if (!result.location) {
    for (const city of CITIES) {
      const re = new RegExp(`\\b${city}\\b`, "i");
      if (re.test(cleaned)) {
        result.location = city === "Bengaluru" ? "Bangalore" : city === "Gurugram" ? "Gurgaon" : city;
        cleaned = cleaned.replace(re, " ");
        break;
      }
    }
  }

  // Tidy up cleaned text
  cleaned = cleaned
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.;])/g, "$1")
    .replace(/^[\s,.;]+|[\s,.;]+$/g, "")
    .trim();

  result.cleaned = cleaned;
  return result;
};
