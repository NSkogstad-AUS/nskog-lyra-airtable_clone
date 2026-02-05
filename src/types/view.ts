import type { ColumnId } from "./column";
import type { Filter } from "./filter";
import type { Sort } from "./sort";
import type { TableId } from "./table";

export type ViewId = string;

export type View = {
  id: ViewId;
  tableId: TableId;
  name: string;
  filters: Filter[];
  sort: Sort | null;
  hiddenColumnIds: ColumnId[];
  columnOrder: ColumnId[];
  searchQuery: string | null;
};
