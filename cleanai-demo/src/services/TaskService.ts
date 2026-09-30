import { Task } from "../models/Task";
import { Priority } from "../models/Priority";
import { formatDate } from "../utils/formatDate";
import { generateId } from "../utils/generateId";
import { slugify } from "../utils/slugify";

export class TaskService {
  private tasks: Task[] = [];

  createTask(title: string, description: string, priority: Priority): Task {
    const task: Task = {
      id: generateId(),
      title,
      description,
      priority,
      completed: false,
      assigneeId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.tasks.push(task);
    return task;
  }

  getTaskById(id: string): Task | undefined {
    return this.tasks.find((task: Task) => task.id === id);
  }

  getAllTasks(): Task[] {
    return [...this.tasks];
  }

  completeTask(id: string): Task | undefined {
    const task: Task | undefined = this.getTaskById(id);
    if (task) {
      task.completed = true;
      task.updatedAt = new Date();
    }
    return task;
  }

  deleteTask(id: string): boolean {
    const index: number = this.tasks.findIndex((task: Task) => task.id === id);
    if (index === -1) return false;
    this.tasks.splice(index, 1);
    return true;
  }

  getTasksByPriority(priority: Priority): Task[] {
    return this.tasks.filter((task: Task) => task.priority === priority);
  }

  getTaskSummary(): string {
    const total: number = this.tasks.length;
    const completed: number = this.tasks.filter((t: Task) => t.completed).length;
    const lastUpdated: string = this.tasks.length > 0
      ? formatDate(this.tasks[this.tasks.length - 1].updatedAt)
      : "never";
    return `${completed}/${total} tasks completed (last update: ${lastUpdated})`;
  }

  private sortTasksByDate(tasks: Task[]): Task[] {
    return tasks.sort(
      (a: Task, b: Task) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  private filterCompletedTasks(tasks: Task[]): Task[] {
    return tasks.filter((task: Task) => !task.completed);
  }
}
