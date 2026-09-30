export class ProjectService {
  private projects: Map<string, string> = new Map();

  createProject(name: string, ownerId: string): string {
    const id: string = Math.random().toString(36).slice(2);
    this.projects.set(id, name);
    return id;
  }

  getProjectName(id: string): string | undefined {
    return this.projects.get(id);
  }

  archiveProject(id: string): boolean {
    return this.projects.delete(id);
  }

  listProjects(): string[] {
    return Array.from(this.projects.values());
  }
}
