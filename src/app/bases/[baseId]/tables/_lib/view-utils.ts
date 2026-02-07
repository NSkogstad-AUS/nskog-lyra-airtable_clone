import type { ViewScopedState, SidebarViewKind } from "./types";
import {
  VIEW_KIND_FILTER_KEY,
  VIEW_SEARCH_QUERY_FILTER_KEY,
  VIEW_SORTING_FILTER_KEY,
  VIEW_FILTER_GROUPS_FILTER_KEY,
  VIEW_HIDDEN_FIELDS_FILTER_KEY,
  DEFAULT_GRID_VIEW_NAME,
} from "./config";
import { normalizeSortingState } from "./sort-utils";
import { normalizeFilterGroups } from "./filter-utils";

export const normalizeViewName = (value: string) => value.trim() || DEFAULT_GRID_VIEW_NAME;

export const getViewKindFromFilters = (filters: unknown): SidebarViewKind | null => {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) return null;
  const value = (filters as Record<string, unknown>)[VIEW_KIND_FILTER_KEY];
  return value === "form" || value === "grid" ? value : null;
};

export const resolveSidebarViewKind = (view: { name: string; filters?: unknown }): SidebarViewKind => {
  const kindFromFilters = getViewKindFromFilters(view.filters);
  if (kindFromFilters) return kindFromFilters;
  return view.name.trim().toLowerCase().startsWith("form") ? "form" : "grid";
};

export const getViewKindLabel = (kind: SidebarViewKind) =>
  kind === "form" ? "form" : "grid view";

export const getDefaultViewScopedState = (): ViewScopedState => ({
  searchQuery: "",
  sorting: [],
  filterGroups: [],
  hiddenFieldIds: [],
});

export const parseViewScopedStateFromFilters = (filters: unknown): ViewScopedState => {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
    return getDefaultViewScopedState();
  }
  const filterObject = filters as Record<string, unknown>;
  const hiddenFieldIds = Array.isArray(filterObject[VIEW_HIDDEN_FIELDS_FILTER_KEY])
    ? (filterObject[VIEW_HIDDEN_FIELDS_FILTER_KEY] as unknown[])
        .filter((fieldId): fieldId is string => typeof fieldId === "string")
    : [];
  return {
    searchQuery:
      typeof filterObject[VIEW_SEARCH_QUERY_FILTER_KEY] === "string"
        ? filterObject[VIEW_SEARCH_QUERY_FILTER_KEY]
        : "",
    sorting: normalizeSortingState(filterObject[VIEW_SORTING_FILTER_KEY]),
    filterGroups: normalizeFilterGroups(filterObject[VIEW_FILTER_GROUPS_FILTER_KEY]),
    hiddenFieldIds,
  };
};

export const areViewScopedStatesEqual = (a: ViewScopedState | undefined, b: ViewScopedState) => {
  if (!a) return false;
  return (
    a.searchQuery === b.searchQuery &&
    JSON.stringify(a.sorting) === JSON.stringify(b.sorting) &&
    JSON.stringify(a.filterGroups) === JSON.stringify(b.filterGroups) &&
    JSON.stringify(a.hiddenFieldIds) === JSON.stringify(b.hiddenFieldIds)
  );
};
