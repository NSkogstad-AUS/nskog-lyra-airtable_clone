import type { TableId } from "./table";

export type ColumnId = string;
export type ColumnType = "text" | "number";

export type Column = {
  id: ColumnId;
  tableId: TableId;
  name: string;
  type: ColumnType;
  size: number;
};
