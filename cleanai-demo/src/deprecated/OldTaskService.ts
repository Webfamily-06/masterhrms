export class OldTaskService {
  private tasks: Map<string, string> = new Map();

  addTask(id: string, title: string): void {
    this.tasks.set(id, title);
  }

  removeTask(id: string): void {
    this.tasks.delete(id);
  }

  getTask(id: string): string | undefined {
    return this.tasks.get(id);
  }

  listTasks(): string[] {
    return Array.from(this.tasks.values());
  }
}
