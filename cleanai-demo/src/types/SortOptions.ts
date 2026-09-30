export interface SortOptions {
  field: string;
  direction: "ascending" | "descending";
}

export function buildDefaultSortOptions(): SortOptions {
  return {
    field: "createdAt",
    direction: "descending",
  };
}
