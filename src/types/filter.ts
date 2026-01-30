import type { ColumnId } from "./column";

export type TextFilterOperator =
  | "contains"
  | "not_contains"
  | "is_empty"
  | "is_not_empty"
  | "equals";

export type NumberFilterOperator = "greater_than" | "less_than" | "equals";

export type Filter =
  | {
      columnId: ColumnId;
      type: "text";
      operator: TextFilterOperator;
      value?: string;
    }
  | {
      columnId: ColumnId;
      type: "number";
      operator: NumberFilterOperator;
      value?: number;
    };
