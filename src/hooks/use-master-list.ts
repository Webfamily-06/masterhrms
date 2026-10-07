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
  }>({
    queryKey: [queryKey, params],
    queryFn: async () => {
      const res = await api.get(endpoint, { params });
      // Support array or paginated response format
      if (Array.isArray(res.data)) {
        return {
          data: res.data,
          total: res.data.length,
          totalPages: 1,
        };
      }
      return {
        data: res.data.data || res.data.items || res.data || [],
        total: res.data.total ?? (res.data.data?.length || 0),
        totalPages: res.data.totalPages ?? Math.ceil((res.data.total || 1) / limit),
      };
    },
  });

  return {
    items: data?.data || [],
    total: data?.total || 0,
    totalPages: data?.totalPages || 1,
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
