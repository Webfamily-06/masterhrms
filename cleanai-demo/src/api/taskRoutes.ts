import { TaskService } from "../services/TaskService";
import { Priority } from "../models/Priority";
import { truncate } from "../utils/stringHelpers";
import { ApiResponse } from "../types/ApiResponse";

const MAX_TASKS_PER_PAGE: number = 50;

interface Route {
  method: string;
  path: string;
  handler: () => ApiResponse;
}

export function createTaskRoutes(taskService: TaskService): Route[] {
  return [
    {
      method: "GET",
      path: "/tasks",
      handler: (): ApiResponse => {
        const tasks = taskService.getAllTasks();
        return { success: true, data: tasks };
      },
    },
    {
      method: "POST",
      path: "/tasks",
      handler: (): ApiResponse => {
        const task = taskService.createTask(
          "New Task",
          "Description",
          Priority.Medium
        );
        return { success: true, data: task };
      },
    },
    {
      method: "GET",
      path: "/tasks/summary",
      handler: (): ApiResponse => {
        const summary: string = taskService.getTaskSummary();
        const shortSummary: string = truncate(summary, 100);
        return { success: true, data: shortSummary };
      },
    },
  ];
}

function buildTaskPreview(title: string, description: string): string {
  return `${title}: ${truncate(description, 50)}`;
}
