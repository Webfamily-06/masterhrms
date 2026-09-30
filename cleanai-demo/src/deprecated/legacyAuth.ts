const LEGACY_API_KEY: string = "sk-legacy-placeholder-key";

export function validateApiKey(key: string): boolean {
  return key === LEGACY_API_KEY;
}

export function generateToken(userId: string): string {
  const expiry: number = Date.now() + 3600000;
  return `legacy.${userId}.${expiry}`;
}

export function decodeToken(token: string): { userId: string } | null {
  const parts: string[] = token.split(".");
  if (parts.length !== 3 || parts[0] !== "legacy") return null;
  return { userId: parts[1] };
}
