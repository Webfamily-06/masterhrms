export interface ServerPhoneRule {
  minDigits: number;
  maxDigits: number;
}

export const SERVER_PHONE_RULES: Record<string, ServerPhoneRule> = {
  "+91": { minDigits: 10, maxDigits: 10 },
  "+1": { minDigits: 10, maxDigits: 10 },
  "+44": { minDigits: 9, maxDigits: 10 },
  "+971": { minDigits: 9, maxDigits: 9 },
  "+65": { minDigits: 8, maxDigits: 8 },
  "+61": { minDigits: 9, maxDigits: 9 },
  "+49": { minDigits: 9, maxDigits: 11 },
  "+33": { minDigits: 9, maxDigits: 9 },
  "+60": { minDigits: 9, maxDigits: 10 },
  "+966": { minDigits: 9, maxDigits: 9 },
};

export const COMMON_CALLING_CODES = [
  "+1684", "+1264", "+1268", "+1242", "+1246", "+1441",
  "+971", "+880", "+355", "+213", "+376", "+244", "+374", "+297", "+994", "+973", "+375", "+501", "+229", "+975", "+591",
  "+91", "+44", "+49", "+33", "+81", "+61", "+65", "+60", "+966", "+974", "+31", "+54", "+43", "+32",
  "+1", "+7",
];

export function validateAndNormalizeServerPhone(
  phone: string | null | undefined,
  isRequired: boolean = false,
  countryHint: string = "India"
): { isValid: boolean; normalized: string | null; error?: string } {
  if (!phone || !phone.trim()) {
    if (isRequired) {
      return { isValid: false, normalized: null, error: "Phone number is required." };
    }
    return { isValid: true, normalized: null };
  }

  const clean = phone.trim();

  // Reject alphabetic characters
  if (/[a-zA-Z]/.test(clean)) {
    return {
      isValid: false,
      normalized: clean,
      error: "Phone number cannot contain alphabetic characters.",
    };
  }

  // Reject arbitrary punctuation/scripts
  if (/[^0-9\s\-()+]/.test(clean)) {
    return {
      isValid: false,
      normalized: clean,
      error: "Phone number contains invalid formatting characters.",
    };
  }

  // Extract digits
  const allDigits = clean.replace(/\D/g, "");
  if (allDigits.length < 7 || allDigits.length > 15) {
    return {
      isValid: false,
      normalized: clean,
      error: `Phone number length is invalid (${allDigits.length} digits). Must be between 7 and 15 digits.`,
    };
  }

  // Detect calling code if prefixed with +
  let callingCode = "+91";
  let nationalDigits = allDigits;

  if (clean.startsWith("+")) {
    for (const code of COMMON_CALLING_CODES) {
      if (clean.startsWith(code)) {
        callingCode = code;
        const codeDigits = code.replace(/\D/g, "");
        nationalDigits = allDigits.slice(codeDigits.length);
        break;
      }
    }
  } else if (countryHint.toLowerCase() === "united states" || countryHint.toLowerCase() === "canada") {
    callingCode = "+1";
  } else if (countryHint.toLowerCase() === "united kingdom") {
    callingCode = "+44";
  }

  // Check country-specific rule if available
  const rule = SERVER_PHONE_RULES[callingCode];
  if (rule) {
    if (nationalDigits.length < rule.minDigits || nationalDigits.length > rule.maxDigits) {
      return {
        isValid: false,
        normalized: clean,
        error: `Phone number for ${callingCode} must be ${rule.minDigits === rule.maxDigits ? rule.minDigits : `${rule.minDigits}–${rule.maxDigits}`} digits (${nationalDigits.length} provided).`,
      };
    }
  }

  return {
    isValid: true,
    normalized: callingCode ? `${callingCode} ${nationalDigits}` : clean,
  };
}
