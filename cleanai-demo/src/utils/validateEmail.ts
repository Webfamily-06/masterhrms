const EMAIL_REGEX: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

export function getDomain(email: string): string {
  const parts: string[] = email.split("@");
  return parts.length === 2 ? parts[1] : "";
}
