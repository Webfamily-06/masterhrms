export function capitalize(text: string): string {
  if (text.length === 0) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function reverseString(text: string): string {
  return text.split("").reverse().join("");
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
