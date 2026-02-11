import type { SortingState } from "@tanstack/react-table";

export type TableRow = {
  id: string;
  serverId?: string;
} & Record<string, string>;

export type EditableColumnId = string;
export type EditingCell = {
  rowIndex: number;
  rowId: string;
  columnId: EditableColumnId;
};

export type FillDragState = {
  anchorRowIndex: number;
  anchorColumnIndex: number;
  hoverRowIndex: number;
  hoverColumnIndex: number;
  axis: "row" | "column" | null;
  pointerStartX: number;
  pointerStartY: number;
  sourceRange: {
    minRowIndex: number;
    maxRowIndex: number;
    minColumnIndex: number;
    maxColumnIndex: number;
  };
};

export type BaseMenuSections = {
  appearance: boolean;
  guide: boolean;
};

export type TableDefinition = {
  id: string;
  name: string;
  data: TableRow[];
  fields: TableField[];
  columnVisibility: Record<string, boolean>;
  nextRowId: number;
};

export type AddColumnKind = "singleLineText" | "number";
export type TableFieldKind = AddColumnKind;
export type NumberPresetId = "none" | "decimal4" | "integer" | "million1";
export type NumberSeparatorId = "local" | "commaPeriod" | "periodComma" | "spaceComma" | "spacePeriod";
export type NumberAbbreviationId = "none" | "thousand" | "million" | "billion";
export type NumberFieldConfig = {
  preset: NumberPresetId;
  decimalPlaces: string;
  separators: NumberSeparatorId;
  showThousandsSeparator: boolean;
  abbreviation: NumberAbbreviationId;
  allowNegative: boolean;
};
export type NumberPickerOption<T extends string> = {
  id: T;
  label: string;
  triggerLabel?: string;
  description?: string;
};
export type FieldMenuIcon = "name" | "paragraph" | "user" | "status" | "file" | "ai" | "number";
export type ColumnFieldMenuIcon =
  | "edit"
  | "duplicate"
  | "insertLeft"
  | "insertRight"
  | "primary"
  | "copyUrl"
  | "description"
  | "permissions"
  | "sortAsc"
  | "sortDesc"
  | "filter"
  | "group"
  | "dependencies"
  | "hide"
  | "delete";

export type TableField = {
  id: string;
  label: string;
  kind: TableFieldKind;
  size: number;
  defaultValue: string;
  description?: string;
  numberConfig?: NumberFieldConfig;
};

export type FieldMenuItem = {
  id: string;
  label: string;
  icon: FieldMenuIcon;
  sortId: string;
};

export type FilterOperator =
  | "contains"
  | "doesNotContain"
  | "greaterThan"
  | "greaterThanOrEqual"
  | "lessThan"
  | "lessThanOrEqual"
  | "is"
  | "isNot"
  | "isEmpty"
  | "isNotEmpty";
export type FilterJoin = "and" | "or";
export type FilterCondition = {
  id: string;
  columnId: string;
  operator: FilterOperator;
  value: string;
  join: FilterJoin;
};
export type FilterConditionGroup = {
  id: string;
  mode: "group" | "single";
  join: FilterJoin;
  conditions: FilterCondition[];
};
export type FilterGroupDragData = {
  type: "filter-group";
  groupId: string;
  mode: "group" | "single";
  conditionId?: string;
};
export type FilterConditionDragData = {
  type: "filter-condition";
  groupId: string;
  conditionId: string;
};
export type FilterGroupDropData = {
  type: "filter-group-drop";
  groupId: string;
};
export type FilterRootDropData = {
  type: "filter-root-drop";
  index: number;
};
export type FilterDragData =
  | FilterGroupDragData
  | FilterConditionDragData
  | FilterGroupDropData
  | FilterRootDropData;

export type SidebarViewKind = "grid" | "form";
export type SidebarViewContextMenuState = {
  viewId: string;
  top: number;
  left: number;
};
export type RowContextMenuState = {
  rowId: string;
  rowIndex: number;
  top: number;
  left: number;
};
export type ViewScopedState = {
  searchQuery: string;
  sorting: SortingState;
  filterGroups: FilterConditionGroup[];
  hiddenFieldIds: string[];
};

export type RowHeightOption = "short" | "medium" | "tall" | "extraTall";
