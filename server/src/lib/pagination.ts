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

/**
 * SaaS Contract Pagination Parser
 * - Cap limit strictly at 100
 * - Whitelist sortField against allowedSort array (prevent arbitrary injections)
 * - Do not manually inject tenantId (Prisma proxy/where handles tenant scoping)
 */
export function parsePagination(
  q: any,
  allowedSort: string[],
  defaultSort = "createdAt"
) {
  const page = Math.max(1, parseInt(q?.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(q?.limit, 10) || 25));
  const sortField = Array.isArray(allowedSort) && allowedSort.includes(q?.sort) ? q.sort : defaultSort;
  const order = q?.order === "asc" ? ("asc" as const) : ("desc" as const);
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { [sortField]: order },
    search: typeof q?.search === "string" ? q.search.trim() : "",
  };
}

/**
 * SaaS Contract Generic Paginator
 * Returns standardized contract { items, total, page, limit }
 */
export async function paginate<T>(
  delegate: { findMany: Function; count: Function },
  options: { where?: any; include?: any; select?: any } = {},
  p: ReturnType<typeof parsePagination>
) {
  const [items, total] = await Promise.all([
    delegate.findMany({
      where: options.where,
      include: options.include,
      select: options.select,
      skip: p.skip,
      take: p.take,
      orderBy: p.orderBy,
    }),
    delegate.count({ where: options.where }),
  ]);
  return { items: items as T[], total, page: p.page, limit: p.limit };
}
