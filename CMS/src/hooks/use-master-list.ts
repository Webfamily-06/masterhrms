import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface MasterListOptions {
  endpoint: string;
  queryKey: string;
  defaultLimit?: number;
  defaultSortBy?: string;
  defaultSortOrder?: "asc" | "desc";
  extraParams?: Record<string, any>;
}

export function useMasterList<T = any>({
  endpoint,
  queryKey,
  defaultLimit = 10,
  defaultSortBy = "createdAt",
  defaultSortOrder = "desc",
  extraParams = {},
}: MasterListOptions) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultLimit);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState(defaultSortBy);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(defaultSortOrder);
  const [filters, setFilters] = useState<Record<string, any>>({});

  const params = useMemo(() => {
    return {
      page,
      limit,
      search: search || undefined,
      sortBy,
      sortOrder,
      ...filters,
      ...extraParams,
    };
  }, [page, limit, search, sortBy, sortOrder, filters, extraParams]);

  const { data, isLoading, isError, error, refetch } = useQuery<{
    data: T[];
    total: number;
    totalPages: number;
    statusCounts?: Record<string, number>;
  }>({
    queryKey: [queryKey, params],
    queryFn: async () => {
      const res = await api.get(endpoint, { params });
      
      // Raw array responses
      if (Array.isArray(res)) {
        return {
          data: res,
          total: res.length,
          totalPages: 1,
        };
      }

      // Paginated object format: check for list items
      const items = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res?.data?.items)
            ? res.data.items
            : Array.isArray(res?.data?.data)
              ? res.data.data
              : [];

      // Server-provided total or item count fallback
      const totalCount =
        typeof res?.total === "number"
          ? res.total
          : typeof res?.data?.total === "number"
            ? res.data.total
            : items.length;

      const totalPagesCount =
        typeof res?.totalPages === "number"
          ? res.totalPages
          : typeof res?.data?.totalPages === "number"
            ? res.data.totalPages
            : Math.max(1, Math.ceil(totalCount / limit));

      return {
        data: items,
        total: totalCount,
        totalPages: totalPagesCount,
        statusCounts: res?.statusCounts || res?.data?.statusCounts,
      };
    },
  });

  return {
    items: data?.data || [],
    data: data?.data || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 1,
    statusCounts: data?.statusCounts,
    page,
    limit,
    search,
    sortBy,
    sortOrder,
    filters,
    isLoading,
    isError,
    error,
    setPage,
    setLimit,
    setSearch,
    setSortBy,
    setSortOrder,
    setFilters,
    refetch,
  };
}
