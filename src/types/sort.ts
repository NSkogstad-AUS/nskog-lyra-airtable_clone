import type { ColumnId } from "./column";

export type SortDirection = "asc" | "desc";

export type Sort = {
  columnId: ColumnId;
  direction: SortDirection;
};
