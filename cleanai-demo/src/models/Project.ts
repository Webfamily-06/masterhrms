export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  memberIds: string[];
  createdAt: Date;
  archivedAt: Date | null;
}

export function createProject(name: string, ownerId: string): Project {
  return {
    id: Math.random().toString(36).slice(2),
    name,
    description: "",
    ownerId,
    memberIds: [ownerId],
    createdAt: new Date(),
    archivedAt: null,
  };
}
