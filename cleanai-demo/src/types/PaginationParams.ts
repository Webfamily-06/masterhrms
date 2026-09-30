export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export const DEFAULT_PAGE_SIZE: number = 20;
export const MAX_PAGE_SIZE: number = 100;
