import type { SortingState } from "@tanstack/react-table";
import type { TableFieldKind } from "./types";

export const getSortDirectionLabelsForField = (fieldKind?: TableFieldKind) =>
  fieldKind === "number"
    ? { asc: "1 → 9", desc: "9 → 1" }
    : { asc: "A → Z", desc: "Z → A" };

export const cloneSortingState = (sorting: SortingState): SortingState =>
  sorting.map((entry) => ({ ...entry }));

export const normalizeSortingState = (value: unknown): SortingState => {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
      const id = (entry as Record<string, unknown>).id;
      const desc = (entry as Record<string, unknown>).desc;
      if (typeof id !== "string" || id.trim() === "") return null;
      return { id, desc: Boolean(desc) };
    })
    .filter((entry): entry is { id: string; desc: boolean } => Boolean(entry));
  return normalized.slice(0, 1);
};
