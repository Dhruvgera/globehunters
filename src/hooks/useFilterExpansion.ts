import { useState } from "react";

export function useFilterExpansion(initialState: Record<string, boolean> = {}) {
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({
    stops: true,
    price: false,
    time: false,
    journey: false,
    departure: false,
    arrival: false,
    airlines: true,
    ...initialState,
  });

  const toggleFilter = (key: string) => {
    setExpandedFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    const allExpanded = Object.keys(expandedFilters).reduce(
      (acc, key) => ({ ...acc, [key]: true }),
      {}
    );
    setExpandedFilters(allExpanded);
  };

  const collapseAll = () => {
    const allCollapsed = Object.keys(expandedFilters).reduce(
      (acc, key) => ({ ...acc, [key]: false }),
      {}
    );
    setExpandedFilters(allCollapsed);
  };

  return {
    expandedFilters,
    toggleFilter,
    expandAll,
    collapseAll,
  };
}
