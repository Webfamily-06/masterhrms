export function migrateTaskFormat(oldData: Record<string, string>): unknown[] {
  return Object.entries(oldData).map(([id, title]) => ({
    id,
    title,
    description: "",
    completed: false,
    createdAt: new Date().toISOString(),
  }));
}

export function migrateUserFormat(oldData: Record<string, string>): unknown[] {
  return Object.entries(oldData).map(([id, name]) => ({
    id,
    name,
    email: `${name.toLowerCase().replace(/\s/g, ".")}@example.com`,
    role: "member",
  }));
}
