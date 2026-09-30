export enum TaskStatus {
  Open = "open",
  InProgress = "in_progress",
  Review = "review",
  Done = "done",
  Cancelled = "cancelled",
}

export function isTerminalStatus(status: TaskStatus): boolean {
  return status === TaskStatus.Done || status === TaskStatus.Cancelled;
}
