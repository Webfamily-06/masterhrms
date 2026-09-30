export function generateId(): string {
  const timestamp: string = Date.now().toString(36);
  const random: string = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}
