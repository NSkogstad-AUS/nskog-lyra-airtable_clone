import type { ColumnId } from "./column";
import type { TableId } from "./table";

export type RowId = string;
export type CellValue = string | number | null;

export type Row = {
  id: RowId;
  tableId: TableId;
  cells: Record<ColumnId, CellValue>;
};
