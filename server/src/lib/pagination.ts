import { Request } from "express";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
  sortField: string;
  sortType: "asc" | "desc";
  search: string;
  isPaginated: boolean;
}

/**
 * Parses Universal Query Contract parameters (Stocky Rule 0):
 * - page: 1-indexed page number
 * - limit: Records per page (default 25, max 150)
 * - SortField / sortField / sortBy: Target sorting column
 * - SortType / sortType / order: 'asc' or 'desc'
 * - search / q: Global text search query
 */
export function parsePaginationParams(
  req: Request,
  defaultSortField = "createdAt",
  defaultLimit = 25
): PaginationParams {
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10) || 1);
  const limitParam = req.query.limit;
  const isPaginated =
    req.query.page !== undefined ||
    limitParam !== undefined ||
    req.query.paginate === "true";
  const limit = Math.min(150, Math.max(1, parseInt(String(limitParam || defaultLimit), 10) || defaultLimit));
  const skip = (page - 1) * limit;

  const rawSortField = String(req.query.SortField || req.query.sortField || req.query.sortBy || defaultSortField);
  const sortField = /^[a-zA-Z0-9_]+$/.test(rawSortField) ? rawSortField : defaultSortField;

  const rawSortType = String(req.query.SortType || req.query.sortType || req.query.order || "desc").toLowerCase();
  const sortType: "asc" | "desc" = rawSortType === "asc" ? "asc" : "desc";

  const search = String(req.query.search || req.query.q || "").trim();

  return {
    page,
    limit,
    skip,
    sortField,
    sortType,
    search,
    isPaginated,
  };
}

/**
 * Universal Paginated Response Envelope
 */
export function formatPaginatedResponse<T>(data: T[], total: number, params: PaginationParams) {
  return {
    data,
    total,
    page: params.page,
    limit: params.limit,
    totalPages: Math.ceil(total / params.limit) || 1,
    hasMore: params.page * params.limit < total,
  };
}
