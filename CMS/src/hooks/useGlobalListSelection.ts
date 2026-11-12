import * as React from "react";

export function useGlobalListSelection<T extends { id: string }>(items: T[] = []) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const selectedCount = selectedIds.size;

  const isSelected = React.useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const toggleRow = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAllVisible = React.useCallback((visibleIds: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach((id) => next.delete(id));
      } else {
        visibleIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isAllVisibleSelected = React.useCallback(
    (visibleIds: string[]) => {
      if (visibleIds.length === 0) return false;
      return visibleIds.every((id) => selectedIds.has(id));
    },
    [selectedIds]
  );

  const isSomeVisibleSelected = React.useCallback(
    (visibleIds: string[]) => {
      if (visibleIds.length === 0) return false;
      const some = visibleIds.some((id) => selectedIds.has(id));
      const all = visibleIds.every((id) => selectedIds.has(id));
      return some && !all;
    },
    [selectedIds]
  );

  const getSelectedItems = React.useCallback(
    (allItems: T[]) => {
      return allItems.filter((item) => selectedIds.has(item.id));
    },
    [selectedIds]
  );

  return {
    selectedIds,
    selectedCount,
    isSelected,
    toggleRow,
    selectAllVisible,
    clearSelection,
    isAllVisibleSelected,
    isSomeVisibleSelected,
    getSelectedItems,
    setSelectedIds
  };
}

