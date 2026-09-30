import { Priority } from "./Priority";

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  completed: boolean;
  assigneeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
