"use client";

import {
  type ColumnDef,
  type ColumnSizingState,
  flexRender,
  getCoreRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  DndContext,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { faker } from "@faker-js/faker";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  Fragment,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { api } from "~/trpc/react";
import styles from "./tables.module.css";
import type {
  AddColumnKind,
  BaseMenuSections,
  ColumnFieldMenuIcon,
  EditableColumnId,
  EditingCell,
  FieldMenuIcon,
  FieldMenuItem,
  FilterCondition,
  FilterConditionDragData,
  FilterConditionGroup,
  FilterDragData,
  FilterGroupDragData,
  FilterGroupDropData,
  FilterJoin,
  FilterOperator,
  FilterRootDropData,
  FillDragState,
  NumberAbbreviationId,
  NumberFieldConfig,
  NumberPickerOption,
  NumberPresetId,
  NumberSeparatorId,
  RowContextMenuState,
  RowHeightOption,
  SidebarViewContextMenuState,
  SidebarViewKind,
  TableDefinition,
  TableField,
  TableFieldKind,
  TableRow,
  ViewScopedState,
} from "./_lib/types";
import { clamp } from "./_lib/math";
import { adjustColor, getContrastColor, toRgba } from "./_lib/color";
import {
  applyNumberAbbreviation,
  clampNumberDecimals,
  formatNumberCellValue,
  formatNumberWithSeparators,
  normalizeNumberValueForStorage,
  resolveNumberConfig,
} from "./_lib/number";
import { BaseHeader } from "./_components/BaseHeader";
import { LeftNavContent } from "./_components/LeftNavContent";
import { RowContextMenu } from "./_components/RowContextMenu";
import { SidebarContent } from "./_components/SidebarContent";
import { TablesTabHeader } from "./_components/TablesTabHeader";
import { TanstackTable } from "./_components/TanstackTable";
import { ViewBar } from "./_components/ViewBar";
import { NumberConfigPicker } from "./_components/forms/NumberConfigPicker";
import {
  PlainTableRow,
  DraggableTableRow,
  SortableTableRow,
  type SortableHandleProps,
  INERT_HANDLE_PROPS,
} from "./_components/table/TableRowComponents";
import { SortableRowCell } from "./_components/table/SortableRowCell";
import {
  SortableFilterGroupRow,
  SortableFilterConditionRow,
  FilterGroupDropZone,
  FilterRootDropZone,
} from "./_components/filters/FilterComponents";
import {
  SIDEBAR_ACCOUNT_DISABLED_ITEMS,
  OMNI_BIT_PATH,
  OMNI_ROTATIONS,
  DEFAULT_TABLE_ROW_COUNT,
  DEFAULT_TABLE_STATUS_OPTIONS,
  DEFAULT_TABLE_NOTES_PREFIXES,
  DEFAULT_TABLE_FIELDS,
  ROW_HEIGHT_ITEMS,
  ROW_HEIGHT_SETTINGS,
  TABLE_HEADER_HEIGHT,
  ROW_HEIGHT_TRANSITION_MS,
  ESCAPE_HIGHLIGHT_DURATION,
  FILTER_TEXT_OPERATOR_ITEMS,
  FILTER_NUMBER_OPERATOR_ITEMS,
  FILTER_JOIN_ITEMS,
  ADD_COLUMN_FIELD_AGENTS,
  ADD_COLUMN_STANDARD_FIELDS,
  ADD_COLUMN_KIND_CONFIG,
  NUMBER_PRESET_OPTIONS,
  NUMBER_DECIMAL_OPTIONS,
  NUMBER_SEPARATOR_OPTIONS,
  NUMBER_ABBREVIATION_OPTIONS,
} from "./_lib/constants";
import {
  UUID_REGEX,
  EMPTY_UUID,
  DEFAULT_BASE_NAME,
  DEFAULT_GRID_VIEW_NAME,
  DEFAULT_FORM_VIEW_NAME,
  BASE_NAME_SAVE_DEBOUNCE_MS,
  DEBUG_MAX_ROWS_PER_ADD,
  ROWS_PAGE_SIZE,
  ROWS_VIRTUAL_OVERSCAN,
  ROWS_FAST_SCROLL_OVERSCAN,
  ROWS_FAST_SCROLL_THRESHOLD,
  ROWS_FAST_SCROLL_PREFETCH_PAGES,
  BULK_ADD_100K_ROWS_COUNT,
  BULK_ADD_PROGRESS_BATCH_SIZE,
  BULK_CELL_UPDATE_BATCH_SIZE,
  ROW_DND_MAX_ROWS,
  AUTO_CREATED_INITIAL_VIEW_TABLE_IDS,
  VIEW_KIND_FILTER_KEY,
  VIEW_SEARCH_QUERY_FILTER_KEY,
  VIEW_SORTING_FILTER_KEY,
  VIEW_FILTER_GROUPS_FILTER_KEY,
  VIEW_HIDDEN_FIELDS_FILTER_KEY,
  ROW_NUMBER_COLUMN_WIDTH,
  ADD_COLUMN_CELL_WIDTH,
} from "./_lib/config";
import {
  FILTER_GROUP_DRAG_PREFIX,
  FILTER_CONDITION_DRAG_PREFIX,
  FILTER_GROUP_DROP_PREFIX,
  FILTER_ROOT_DROP_PREFIX,
  getFilterGroupDragId,
  getFilterConditionDragId,
  getFilterGroupDropId,
  getFilterRootDropId,
  operatorRequiresValue,
  getFilterOperatorItemsForField,
  getDefaultFilterOperatorForField,
  normalizeFilterGroupsForQuery,
  cloneFilterGroups,
  normalizeFilterGroups,
} from "./_lib/filter-utils";
import {
  getSortDirectionLabelsForField,
  cloneSortingState,
  normalizeSortingState,
} from "./_lib/sort-utils";
import {
  normalizeViewName,
  getViewKindFromFilters,
  resolveSidebarViewKind,
  getViewKindLabel,
  getDefaultViewScopedState,
  parseViewScopedStateFromFilters,
  areViewScopedStatesEqual,
} from "./_lib/view-utils";
import { getToolbarMenuPosition } from "./_lib/position-utils";
import { toCellText } from "./_lib/cell-utils";
import {
  isUuid,
  normalizeBaseName,
  createOptimisticId,
  createClientRowId,
  createServerRowId,
  getServerIdFromRowId,
  isServerRowId,
  escapeXmlText,
  getBaseInitials,
  createBaseFaviconDataUrl,
  getFieldKindPrefix,
  getFieldDisplayLabel,
  createColumnVisibility,
  moveFieldToDropIndex,
  mapDbColumnToField,
  mapFieldKindToDbType,
  resolveFieldMenuIcon,
} from "./_lib/table-utils";

type RowRange = { start: number; end: number };

type RowWindowStore = {
  total: number;
  rowsByUiId: Map<string, TableRow>;
  rawCellsByUiId: Map<string, Record<string, unknown>>;
  indexToUiId: Map<number, string>;
  uiIdToIndex: Map<string, number>;
  fetchedRanges: RowRange[];
  maxLoadedIndex: number;
  hasFetchedOnce: boolean;
};

type DbRow = { id: string; cells?: unknown };

const normalizeRanges = (ranges: RowRange[]) => {
  if (ranges.length <= 1) return ranges;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: RowRange[] = [];
  sorted.forEach((range) => {
    const last = merged[merged.length - 1];
    if (!last || range.start > last.end + 1) {
      merged.push({ ...range });
      return;
    }
    last.end = Math.max(last.end, range.end);
  });
  return merged;
};

const addRange = (ranges: RowRange[], start: number, end: number) =>
  normalizeRanges([...ranges, { start, end }]);

const getMissingRanges = (ranges: RowRange[], start: number, end: number) => {
  if (end < start) return [];
  if (ranges.length === 0) return [{ start, end }];
  const normalized = normalizeRanges(ranges);
  const missing: RowRange[] = [];
  let cursor = start;
  normalized.forEach((range) => {
    if (range.end < start || range.start > end) return;
    if (range.start > cursor) {
      missing.push({ start: cursor, end: Math.min(end, range.start - 1) });
    }
    cursor = Math.max(cursor, range.end + 1);
  });
  if (cursor <= end) {
    missing.push({ start: cursor, end });
  }
  return missing.filter((range) => range.end >= range.start);
};
import {
  createAttachmentLabel,
  createDefaultRows,
  createSingleBlankRow,
} from "./_lib/data-generation";

type SeedRowsMode = "faker" | "singleBlank";
type PendingRelativeInsert = {
  tableId: string;
  anchorRowId: string;
  position: "above" | "below";
  optimisticRowId: string;
  cells: Record<string, string>;
  fieldsSnapshot: TableField[];
};

const FALLBACK_BASE_ACCENTS = ["#2b71d7", "#8e4b88"] as const;

const hashValue = (input: string) => {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const resolveBaseAccent = (baseId: string, accent?: string | null) => {
  if (accent) return accent;
  return FALLBACK_BASE_ACCENTS[hashValue(baseId) % FALLBACK_BASE_ACCENTS.length] ?? "#2b71d7";
};

const flashEscapeHighlight = (element: HTMLElement | null) => {
  if (!element || typeof window === "undefined") return;
  const escapeHighlightClass = styles.escapeHighlight;
  if (!escapeHighlightClass) return;
  element.classList.add(escapeHighlightClass);
  window.setTimeout(() => {
    element.classList.remove(escapeHighlightClass);
  }, ESCAPE_HIGHLIGHT_DURATION);
};

export default function TablesPage() {
  const params = useParams<{ baseId?: string | string[] }>();
  const router = useRouter();
  const { status: authStatus, data: session } = useSession();
  const utils = api.useUtils();
  const isAuthenticated = authStatus === "authenticated";
  const routeBaseIdParam = params?.baseId;
  const routeBaseId = Array.isArray(routeBaseIdParam)
    ? (routeBaseIdParam[0] ?? "")
    : (routeBaseIdParam ?? "");

  const [viewName, setViewName] = useState(DEFAULT_GRID_VIEW_NAME);
  const [isEditingViewName, setIsEditingViewName] = useState(false);
  const viewNameInputRef = useRef<HTMLInputElement | null>(null);
  const createViewDialogInputRef = useRef<HTMLInputElement | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const dragOverRafRef = useRef<number | null>(null);
  const pendingOverRowIdRef = useRef<string | null>(null);
  const [baseName, setBaseName] = useState(DEFAULT_BASE_NAME);
  const [isBaseMenuOpen, setIsBaseMenuOpen] = useState(false);
  const [baseMenuSections, setBaseMenuSections] = useState<BaseMenuSections>({
    appearance: false,
    guide: true,
  });
  const [isBaseGuideEditing, setIsBaseGuideEditing] = useState(false);
  const [baseGuideText, setBaseGuideText] = useState(
    [
      "Use this space to share the goals and details of your base with your team.",
      "",
      "Start by outlining your goal.",
      "",
      "Next, share details about key information in your base:",
      "This table contains...",
      "This view shows...",
      "This link contains...",
      "",
      "Teammates will see this guide when they first open the base and can find it anytime by clicking the down arrow on the top of their screen.",
    ].join("\n"),
  );
  const [appearanceTab, setAppearanceTab] = useState<"color" | "icon">("color");
  const [baseAccent, setBaseAccent] = useState<string>(FALLBACK_BASE_ACCENTS[0]);
  const [isBaseMenuMoreOpen, setIsBaseMenuMoreOpen] = useState(false);
  const [isBaseStarred, setIsBaseStarred] = useState(false);
  const [isSidebarAccountMenuOpen, setIsSidebarAccountMenuOpen] = useState(false);
  const [isViewsSidebarOpen, setIsViewsSidebarOpen] = useState(true);
  const [isCreateViewMenuOpen, setIsCreateViewMenuOpen] = useState(false);
  const [createViewMenuPosition, setCreateViewMenuPosition] = useState({ top: -9999, left: -9999 });
  const [isCreateViewDialogOpen, setIsCreateViewDialogOpen] = useState(false);
  const [createViewDialogPosition, setCreateViewDialogPosition] = useState({ top: -9999, left: -9999 });
  const [createViewDialogName, setCreateViewDialogName] = useState("");
  const [createViewDialogKind, setCreateViewDialogKind] = useState<SidebarViewKind>("grid");
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [viewMenuPosition, setViewMenuPosition] = useState({ top: -9999, left: -9999 });
  // favoriteViewIds now comes from favoriteViewIdsQuery (DB-backed)
  // viewOrderIds is no longer needed - views are ordered by 'order' field in DB
  const [sidebarViewContextMenu, setSidebarViewContextMenu] =
    useState<SidebarViewContextMenuState | null>(null);
  const [rowContextMenu, setRowContextMenu] =
    useState<RowContextMenuState | null>(null);
  const [draggingViewId, setDraggingViewId] = useState<string | null>(null);
  const [viewDragOverId, setViewDragOverId] = useState<string | null>(null);
  const [viewDragOverSide, setViewDragOverSide] = useState<"top" | "bottom" | null>(null);
  const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
  const [tableDragOverId, setTableDragOverId] = useState<string | null>(null);
  const [tableDragOverSide, setTableDragOverSide] = useState<"left" | "right" | null>(null);
  const viewDragImageRef = useRef<HTMLElement | null>(null);
  const tableDragImageRef = useRef<HTMLElement | null>(null);
  const viewOrderPreviewRef = useRef<string[] | null>(null);
  const viewOrderBeforeDragRef = useRef<string[] | null>(null);
  const viewDropHandledRef = useRef(false);
  const viewDragRafRef = useRef<number | null>(null);
  const viewDragHandleArmedRef = useRef<string | null>(null);
  const tableOrderPreviewRef = useRef<string[] | null>(null);
  const tableOrderBeforeDragRef = useRef<string[] | null>(null);
  const tableDropHandledRef = useRef(false);
  const rowSelectDragRef = useRef<{ anchorRowIndex: number; lastRowIndex: number } | null>(null);
  const [isRowSelectDragging, setIsRowSelectDragging] = useState(false);
  const [isHideFieldsMenuOpen, setIsHideFieldsMenuOpen] = useState(false);
  const [hideFieldsMenuPosition, setHideFieldsMenuPosition] = useState({ top: -9999, left: -9999 });
  const [isSearchMenuOpen, setIsSearchMenuOpen] = useState(false);
  const [searchMenuPosition, setSearchMenuPosition] = useState({ top: -9999, left: -9999 });
  const [searchInputValue, setSearchInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMatchTotal, setSearchMatchTotal] = useState<number | null>(null);
  const [isSearchCountLoading, setIsSearchCountLoading] = useState(false);
  const [isSearchIndicesLoading, setIsSearchIndicesLoading] = useState(false);
  const [activeSearchMatchIndex, setActiveSearchMatchIndex] = useState(-1);
  const [serverSearchIndices, setServerSearchIndices] = useState<number[]>([]);
  const [serverSearchNavIndex, setServerSearchNavIndex] = useState(-1);
  const serverSearchRequestIdRef = useRef(0);
  const serverSearchIndicesRef = useRef<number[]>([]);
  const serverSearchNavIndexRef = useRef(-1);
  const searchNavigateRequestIdRef = useRef(0);
  const lastSearchNavigateAtRef = useRef(0);
  const suppressSearchViewportSyncUntilRef = useRef(0);
  const normalizedSearchQuery = useMemo(
    () => searchQuery.trim().toLowerCase(),
    [searchQuery],
  );
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filterMenuActiveAction, setFilterMenuActiveAction] = useState<
    "condition" | "group" | null
  >("condition");
  const [activeFilterSelect, setActiveFilterSelect] = useState<{
    type: "field" | "operator";
    conditionId: string;
  } | null>(null);
  const [filterSelectMenu, setFilterSelectMenu] = useState<{
    type: "field" | "operator";
    groupId: string;
    conditionId: string;
    anchor: HTMLElement | null;
  } | null>(null);
  const [filterSelectMenuPosition, setFilterSelectMenuPosition] = useState({
    top: -9999,
    left: -9999,
  });
  const [filterSelectSearch, setFilterSelectSearch] = useState("");
  const [filterMenuPosition, setFilterMenuPosition] = useState({ top: -9999, left: -9999 });
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [groupMenuPosition, setGroupMenuPosition] = useState({ top: -9999, left: -9999 });
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [sortMenuPosition, setSortMenuPosition] = useState({ top: -9999, left: -9999 });
  const [sortMenuView, setSortMenuView] = useState<"picker" | "editor">("picker");
  const [sortFieldSearch, setSortFieldSearch] = useState("");
  const [isSortFieldSearchFocused, setIsSortFieldSearchFocused] = useState(false);
  const [isAutoSortEnabled, setIsAutoSortEnabled] = useState(true);
  const [pendingSortRules, setPendingSortRules] = useState<SortingState | null>(null);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [colorMenuPosition, setColorMenuPosition] = useState({ top: -9999, left: -9999 });
  const [isRowHeightMenuOpen, setIsRowHeightMenuOpen] = useState(false);
  const [rowHeightMenuPosition, setRowHeightMenuPosition] = useState({ top: -9999, left: -9999 });
  const [isShareSyncMenuOpen, setIsShareSyncMenuOpen] = useState(false);
  const [shareSyncMenuPosition, setShareSyncMenuPosition] = useState({ top: -9999, left: -9999 });
  const [isBottomAddRecordMenuOpen, setIsBottomAddRecordMenuOpen] = useState(false);
  const [isBottomQuickAddOpen, setIsBottomQuickAddOpen] = useState(false);
  const [bottomQuickAddRowId, setBottomQuickAddRowId] = useState<string | null>(null);
  const [isDebugAddRowsOpen, setIsDebugAddRowsOpen] = useState(false);
  const [debugAddRowsCount, setDebugAddRowsCount] = useState("10");
  const [isAddingHundredThousandRows, setIsAddingHundredThousandRows] = useState(false);
  const [bulkAddStartRecordCount, setBulkAddStartRecordCount] = useState<number | null>(null);
  const [bulkAddInsertedRowCount, setBulkAddInsertedRowCount] = useState(0);
  const bulkAddRepairInFlightRef = useRef(false);
  const [isAddColumnMenuOpen, setIsAddColumnMenuOpen] = useState(false);
  const [addColumnMenuPosition, setAddColumnMenuPosition] = useState({ top: -9999, left: -9999 });
  const [addColumnInsertIndex, setAddColumnInsertIndex] = useState<number | null>(null);
  const [addColumnAnchorFieldId, setAddColumnAnchorFieldId] = useState<string | null>(null);
  const [isColumnFieldMenuOpen, setIsColumnFieldMenuOpen] = useState(false);
  const [columnFieldMenuPosition, setColumnFieldMenuPosition] = useState({ top: -9999, left: -9999 });
  const [columnFieldMenuFieldId, setColumnFieldMenuFieldId] = useState<string | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [columnDropTargetIndex, setColumnDropTargetIndex] = useState<number | null>(null);
  const [columnDropAnchorId, setColumnDropAnchorId] = useState<string | null>(null);
  const [columnDropIndicatorLeft, setColumnDropIndicatorLeft] = useState<number | null>(null);
  const [isEditFieldPopoverOpen, setIsEditFieldPopoverOpen] = useState(false);
  const [editFieldPopoverPosition, setEditFieldPopoverPosition] = useState({ top: -9999, left: -9999 });
  const [editFieldId, setEditFieldId] = useState<string | null>(null);
  const [editFieldName, setEditFieldName] = useState("");
  const [editFieldKind, setEditFieldKind] = useState<TableFieldKind>("singleLineText");
  const [editFieldDefaultValue, setEditFieldDefaultValue] = useState("");
  const [, setEditFieldAllowMultipleUsers] = useState(false);
  const [, setEditFieldNotifyUsers] = useState(true);
  const [isEditFieldDescriptionOpen, setIsEditFieldDescriptionOpen] = useState(false);
  const [editFieldDescription, setEditFieldDescription] = useState("");
  const [editNumberPreset, setEditNumberPreset] = useState<NumberPresetId>("none");
  const [editNumberDecimalPlaces, setEditNumberDecimalPlaces] = useState("1");
  const [editNumberSeparators, setEditNumberSeparators] = useState<NumberSeparatorId>("local");
  const [editNumberShowThousandsSeparator, setEditNumberShowThousandsSeparator] = useState(true);
  const [editNumberAbbreviation, setEditNumberAbbreviation] = useState<NumberAbbreviationId>("none");
  const [editNumberAllowNegative, setEditNumberAllowNegative] = useState(false);
  const [addColumnSearch, setAddColumnSearch] = useState("");
  const [selectedAddColumnKind, setSelectedAddColumnKind] = useState<AddColumnKind | null>(null);
  const [addColumnFieldName, setAddColumnFieldName] = useState("");
  const [addColumnDefaultValue, setAddColumnDefaultValue] = useState("");
  const [isAddColumnDescriptionOpen, setIsAddColumnDescriptionOpen] = useState(false);
  const [addColumnDescription, setAddColumnDescription] = useState("");
  const [numberPreset, setNumberPreset] = useState<NumberPresetId>("none");
  const [numberDecimalPlaces, setNumberDecimalPlaces] = useState("1");
  const [numberSeparators, setNumberSeparators] = useState<NumberSeparatorId>("local");
  const [numberShowThousandsSeparator, setNumberShowThousandsSeparator] = useState(true);
  const [numberAbbreviation, setNumberAbbreviation] = useState<NumberAbbreviationId>("none");
  const [numberAllowNegative, setNumberAllowNegative] = useState(false);
  const [showShareSyncInfo, setShowShareSyncInfo] = useState(true);
  const [rowHeight, setRowHeight] = useState<RowHeightOption>("short");
  const [isRowHeightAnimating, setIsRowHeightAnimating] = useState(false);
  const [isRowHeightCollapsing, setIsRowHeightCollapsing] = useState(false);
  const [rowHeightCollapseGap, setRowHeightCollapseGap] = useState(0);
  const [wrapHeaders, setWrapHeaders] = useState(false);
  const [hideFieldSearch, setHideFieldSearch] = useState("");
  const [hideFieldDragActiveId, setHideFieldDragActiveId] = useState<string | null>(null);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isTablesMenuOpen, setIsTablesMenuOpen] = useState(false);
  const [hiddenTableIds, setHiddenTableIds] = useState<string[]>([]);
  const [isHiddenTablesMenuOpen, setIsHiddenTablesMenuOpen] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [viewSearch, setViewSearch] = useState("");
  const [filterGroups, setFilterGroups] = useState<FilterConditionGroup[]>([]);
  const [debouncedFilterGroups, setDebouncedFilterGroups] = useState<FilterConditionGroup[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  // We keep the variable to avoid larger refactors, but the overlay is disabled for snappier UX.
  const [isFilterSortLoading, setIsFilterSortLoading] = useState(false);
  const filterSortLoadingDelayRef = useRef<number | null>(null);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({});
  const [viewStateById, setViewStateById] = useState<Record<string, ViewScopedState>>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [frozenDataColumnCount, setFrozenDataColumnCount] = useState(1);
  const [frozenBoundaryLeft, setFrozenBoundaryLeft] = useState(ROW_NUMBER_COLUMN_WIDTH);
  const [isDraggingFreezeDivider, setIsDraggingFreezeDivider] = useState(false);
  const [freezePreviewFrozenCount, setFreezePreviewFrozenCount] = useState<number | null>(null);
  const [isTableTabMenuOpen, setIsTableTabMenuOpen] = useState(false);
  const [tableTabMenuPosition, setTableTabMenuPosition] = useState({ top: -9999, left: -9999 });
  const [isDeleteTableConfirmOpen, setIsDeleteTableConfirmOpen] = useState(false);
  const [deleteTableConfirmPosition, setDeleteTableConfirmPosition] = useState({ top: -9999, left: -9999 });
  const [deleteTableConfirmTableId, setDeleteTableConfirmTableId] = useState<string | null>(null);
  const [isRenameTablePopoverOpen, setIsRenameTablePopoverOpen] = useState(false);
  const [renameTablePopoverPosition, setRenameTablePopoverPosition] = useState({
    top: -9999,
    left: -9999,
  });
  const [renameTableId, setRenameTableId] = useState<string | null>(null);
  const [renameTableValue, setRenameTableValue] = useState("");
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [toolsMenuPosition, setToolsMenuPosition] = useState({ top: -9999, left: -9999 });
  const [addMenuFromTables, setAddMenuFromTables] = useState(false);
  const [addMenuPosition, setAddMenuPosition] = useState({ top: -9999, left: -9999 });
  const baseMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const baseMenuRef = useRef<HTMLDivElement | null>(null);
  const baseMenuMoreButtonRef = useRef<HTMLButtonElement | null>(null);
  const baseMenuMoreMenuRef = useRef<HTMLDivElement | null>(null);
  const createViewButtonRef = useRef<HTMLButtonElement | null>(null);
  const createViewMenuRef = useRef<HTMLDivElement | null>(null);
  const createViewDialogRef = useRef<HTMLDivElement | null>(null);
  const viewMenuButtonRef = useRef<HTMLDivElement | null>(null);
  const viewMenuRef = useRef<HTMLDivElement | null>(null);
  const sidebarViewContextMenuRef = useRef<HTMLDivElement | null>(null);
  const rowContextMenuRef = useRef<HTMLDivElement | null>(null);
  const sidebarViewContextMenuAnchorRef = useRef<HTMLElement | null>(null);
  const rowContextMenuAnchorRef = useRef<HTMLElement | null>(null);
  const columnFieldMenuAnchorRef = useRef<HTMLElement | null>(null);
  const scrollToCellRef = useRef<(
    rowIndex: number,
    columnIndex: number,
    align?: "auto" | "start" | "center" | "end",
  ) => void>(
    (_rowIndex, _columnIndex, _align) => undefined,
  );
  const hideFieldsButtonRef = useRef<HTMLButtonElement | null>(null);
  const hideFieldsMenuRef = useRef<HTMLDivElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);
  const searchMenuRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastSearchQueryRef = useRef("");
  const searchNavTargetRef = useRef<{ rowIndex: number; columnIndex: number } | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const filterSelectMenuRef = useRef<HTMLDivElement | null>(null);
  const filterSelectSearchInputRef = useRef<HTMLInputElement | null>(null);
  const groupButtonRef = useRef<HTMLButtonElement | null>(null);
  const groupMenuRef = useRef<HTMLDivElement | null>(null);
  const sortButtonRef = useRef<HTMLButtonElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);
  const colorButtonRef = useRef<HTMLButtonElement | null>(null);
  const colorMenuRef = useRef<HTMLDivElement | null>(null);
  const rowHeightButtonRef = useRef<HTMLButtonElement | null>(null);
  const rowHeightMenuRef = useRef<HTMLDivElement | null>(null);
  const shareSyncButtonRef = useRef<HTMLButtonElement | null>(null);
  const shareSyncMenuRef = useRef<HTMLDivElement | null>(null);
  const bottomAddRecordButtonRef = useRef<HTMLButtonElement | null>(null);
  const bottomAddRecordMenuRef = useRef<HTMLDivElement | null>(null);
  const bottomAddRecordPlusButtonRef = useRef<HTMLButtonElement | null>(null);
  const debugAddRowsButtonRef = useRef<HTMLButtonElement | null>(null);
  const debugAddRowsPopoverRef = useRef<HTMLFormElement | null>(null);
  const addColumnButtonRef = useRef<HTMLButtonElement | null>(null);
  const addColumnMenuRef = useRef<HTMLDivElement | null>(null);
  const addColumnCreateRef = useRef<() => void>(() => undefined);
  const selectedAddColumnKindRef = useRef<AddColumnKind | null>(null);
  const insertRowRelativeRef = useRef<
    (args: {
      anchorRowId: string;
      anchorRowIndex: number;
      position: "above" | "below";
      overrideCells?: Record<string, string>;
      focusColumnIndex?: number;
      scrollAlign?: "auto" | "start" | "center" | "end";
    }) => void
  >(() => undefined);
  const columnFieldMenuRef = useRef<HTMLDivElement | null>(null);
  const columnHeaderRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const columnSizeSaveTimeoutRef = useRef<number | null>(null);
  const lastPersistedColumnSizesRef = useRef<Map<string, number>>(new Map());
  const editFieldPopoverRef = useRef<HTMLDivElement | null>(null);
  const editFieldNameInputRef = useRef<HTMLInputElement | null>(null);
  const addMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const addMenuRef = useRef<HTMLDivElement | null>(null);
  const tablesMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const tablesMenuRef = useRef<HTMLDivElement | null>(null);
  const tablesMenuAddRef = useRef<HTMLButtonElement | null>(null);
  const hiddenTablesButtonRef = useRef<HTMLButtonElement | null>(null);
  const hiddenTablesMenuRef = useRef<HTMLDivElement | null>(null);
  const tableTabMenuButtonRef = useRef<HTMLDivElement | null>(null);
  const tableTabMenuRef = useRef<HTMLDivElement | null>(null);
  const deleteTableConfirmRef = useRef<HTMLDivElement | null>(null);
  const renameTablePopoverRef = useRef<HTMLDivElement | null>(null);
  const renameTableInputRef = useRef<HTMLInputElement | null>(null);
  const toolsMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const toolsMenuRef = useRef<HTMLDivElement | null>(null);
  const transparentDragImageRef = useRef<HTMLImageElement | null>(null);
  const hideFieldRowRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const hideFieldRowTopByIdRef = useRef<Map<string, number>>(new Map());
  const hideFieldDragPreviewRef = useRef<HTMLDivElement | null>(null);
  const hideFieldDragPointerRef = useRef({ x: 0, y: 0 });
  const hideFieldDropIndicatorRef = useRef<HTMLDivElement | null>(null);
  const hideFieldDropIndexRef = useRef<number | null>(null);
  const hideFieldListRef = useRef<HTMLUListElement | null>(null);
  const optimisticColumnCellUpdatesRef = useRef<Map<string, Map<string, string>>>(new Map());
  const optimisticRowCellUpdatesRef = useRef<Map<string, Map<string, string>>>(new Map());
  const dirtyCellOverridesRef = useRef<Map<string, Map<string, string>>>(new Map());
  // Maps UI row IDs to their persisted UUIDs (for resolving queued cell updates)
  const optimisticRowIdToRealIdRef = useRef<Map<string, string>>(new Map());
  // Maps optimistic column IDs to their persisted UUIDs (for resolving stale editingCell.columnId)
  const optimisticColumnIdToRealIdRef = useRef<Map<string, string>>(new Map());
  const pendingRelativeInsertsRef = useRef<Map<string, PendingRelativeInsert[]>>(new Map());
  const suspendedServerSyncByTableRef = useRef<Map<string, number>>(new Map());
  const pendingScrollToCellRef = useRef<{
    rowIndex: number;
    columnIndex: number;
    align: "auto" | "start" | "center" | "end";
  } | null>(null);
  const activeCellScrollTimeoutRef = useRef<number | null>(null);
  const insertRelativeQueueRef = useRef<Promise<void>>(Promise.resolve());
  const rowHeightTransitionTimeoutRef = useRef<number | null>(null);
  const initialDocumentTitleRef = useRef<string | null>(null);
  const lastLoadedBaseIdRef = useRef<string | null>(null);
  const lastSyncedBaseNameRef = useRef<string | null>(null);
  const lastAppliedViewIdRef = useRef<string | null>(null);
  const lastPersistedViewStateByIdRef = useRef<Map<string, string>>(new Map());
  const pendingViewStateSignatureByIdRef = useRef<Map<string, string>>(new Map());
  const isBaseNameDirtyRef = useRef(false);
  const rowStoreRef = useRef<RowWindowStore | null>(null);
  const rowStoreKeyRef = useRef<string | null>(null);
  const rowStoreCacheRef = useRef<Map<string, RowWindowStore>>(new Map());
  const lastRowMapFieldsCountRef = useRef(0);
  const filterSortLoadingSignatureRef = useRef<string | null>(null);
  const searchCountRequestIdRef = useRef(0);
  const pendingRowWindowFetchesRef = useRef<Set<string>>(new Set());
  const rowWindowAbortControllerRef = useRef<AbortController | null>(null);
  const pendingRowWindowPatchesRef = useRef<
    Array<{ start: number; rows: DbRow[]; clearedIndices: Array<{ index: number; uiId: string }> }>
  >([]);
  const rowWindowFlushRafRef = useRef<number | null>(null);
  const isFastScrollingRef = useRef(false);
  const pendingRowRangeRef = useRef<{ start: number; end: number } | null>(null);
  const rowRangeDebounceTimeoutRef = useRef<number | null>(null);
  const baseNameSaveRequestIdRef = useRef(0);
  const leftNavRef = useRef<HTMLDivElement | null>(null);
  const freezeDividerDragStateRef = useRef<{
    containerLeft: number;
    minLeft: number;
    maxLeft: number;
    latestLeft: number;
  } | null>(null);
  const baseGuideTextRef = useRef<HTMLTextAreaElement | null>(null);
  const pendingCreateTableNameRef = useRef<string | null>(null);
  const pendingCreateTableRequestIdRef = useRef(0);
  const pendingCreateTableShouldCloseRef = useRef(false);
  const pendingCreateTableIdRef = useRef<string | null>(null);
  const pendingCreateTablePreviousActiveIdRef = useRef<string | null>(null);
  const pendingCreateTableCancelledRequestIdsRef = useRef<Set<number>>(new Set());
  const [baseMenuPosition, setBaseMenuPosition] = useState({ top: -9999, left: -9999 });
  // Early baseId resolution: use URL param immediately if valid UUID (skip waiting for basesQuery)
  const earlyBaseId = useMemo(() => {
    const routeId = Array.isArray(routeBaseIdParam)
      ? (routeBaseIdParam[0] ?? "")
      : (routeBaseIdParam ?? "");
    return isUuid(routeId) ? routeId : null;
  }, [routeBaseIdParam]);

  const [resolvedBaseId, setResolvedBaseId] = useState<string | null>(earlyBaseId);
  const [tables, setTables] = useState<TableDefinition[]>([]);
  const [pendingDeletedRowIdsByTable, setPendingDeletedRowIdsByTable] = useState<
    Map<string, Set<string>>
  >(() => new Map());
  const [pendingDeletedTableIds, setPendingDeletedTableIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [rowStoreVersion, setRowStoreVersion] = useState(0);
  const [rowWindowFetchCount, setRowWindowFetchCount] = useState(0);
  const [renderWindowStart, setRenderWindowStart] = useState(0);
  const [renderWindowEnd, setRenderWindowEnd] = useState(ROWS_PAGE_SIZE - 1);
  const renderWindowStartRef = useRef(0);
  const lastFilterSignatureRef = useRef<string | null>(null);

  // Early tableId resolution: read from localStorage immediately to enable parallel queries
  const earlyTableId = useMemo(() => {
    if (!earlyBaseId) return "";
    if (typeof window === "undefined") return "";
    try {
      return window.localStorage.getItem(`airtable-clone.activeTableId.${earlyBaseId}`) ?? "";
    } catch {
      return "";
    }
  }, [earlyBaseId]);

  const [activeTableId, setActiveTableId] = useState(earlyTableId);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const hasAutoCreatedBaseRef = useRef(false);
  const hasAutoCreatedInitialTableRef = useRef(false);
  const isDev = process.env.NODE_ENV === "development";
  const logPerf = useCallback(
    <T,>(label: string, fn: () => T) => {
      if (!isDev || typeof performance === "undefined") return fn();
      const start = performance.now();
      const result = fn();
      const duration = performance.now() - start;
      // eslint-disable-next-line no-console
      console.log(`[perf] ${label} – ${duration.toFixed(2)}ms`);
      return result;
    },
    [isDev],
  );
  type RowSortForQuery = Array<{
    columnId: string;
    direction: "asc" | "desc";
    columnKind?: "singleLineText" | "number";
  }>;
  // Extract only active table's fields to narrow dependency - avoids recomputation when other tables change
  const activeTableFieldsForSort = useMemo(
    () =>
      logPerf(
        `[sort] activeTableFieldsForSort (tables=${tables.length})`,
        () => (tables ?? []).find((t) => t.id === activeTableId)?.fields ?? [],
      ),
    [logPerf, tables, activeTableId]
  );
  // Create a map of field IDs to fields for filter normalization
  const activeTableFieldsById = useMemo(
    () =>
      logPerf(
        `[filter] activeTableFieldsById (fields=${activeTableFieldsForSort.length})`,
        () => new Map(activeTableFieldsForSort.map((f) => [f.id, f])),
      ),
    [activeTableFieldsForSort, logPerf]
  );
  // Normalize filter groups with column kind information for optimized server-side filtering
  const normalizedFilterGroups = useMemo(
    () =>
      logPerf(
        `[filter] normalize (${debouncedFilterGroups.length} groups)`,
        () => normalizeFilterGroupsForQuery(debouncedFilterGroups, activeTableFieldsById),
      ),
    [debouncedFilterGroups, activeTableFieldsById, logPerf]
  );
  const rowSortForQuery = useMemo<RowSortForQuery>(() => {
    return logPerf(`[sort] build sort (${sorting.length} rules)`, () =>
      sorting.reduce<RowSortForQuery>((accumulator, sortRule) => {
        if (sortRule.id === "rowNumber") return accumulator;
        const sortedField = activeTableFieldsForSort.find((field) => field.id === sortRule.id);
        if (!sortedField) return accumulator;
        accumulator.push({
          columnId: sortRule.id,
          direction: sortRule.desc ? "desc" : "asc",
          columnKind: sortedField.kind === "number" ? "number" : "singleLineText",
        });
        return accumulator;
      }, []),
    );
  }, [activeTableFieldsForSort, logPerf, sorting]);
  const frozenSortForQueryRef = useRef<RowSortForQuery>([]);
  useEffect(() => {
    frozenSortForQueryRef.current = rowSortForQuery;
  }, [rowSortForQuery]);
  useEffect(() => {
    frozenSortForQueryRef.current = [];
  }, [activeTableId]);
  // Debounce filter changes to avoid flooding the backend while staying responsive
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedFilterGroups(filterGroups);
    }, 200);
    return () => window.clearTimeout(timeoutId);
  }, [filterGroups]);
  const effectiveRowSortForQuery =
    rowSortForQuery.length > 0 ? rowSortForQuery : frozenSortForQueryRef.current;
  const activeFilterCount = normalizedFilterGroups.reduce(
    (count, group) => count + group.conditions.length,
    0,
  );
  const activeFilterSignature = useMemo(() => {
    // Use deterministic string building instead of JSON.stringify for performance
    const sortKey = effectiveRowSortForQuery
      .map((s) => `${s.columnId}:${s.direction}:${s.columnKind}`)
      .join("|");
    const filterKey = normalizedFilterGroups
      .map(
        (g) =>
          `${g.join}:[${g.conditions.map((c) => `${c.columnId}:${c.operator}:${c.value ?? ""}:${c.join}`).join(",")}]`
      )
      .join(";");
    return `${sortKey}::${filterKey}`;
  }, [normalizedFilterGroups, effectiveRowSortForQuery]);
  useEffect(() => {
    if (activeFilterSignature === lastFilterSignatureRef.current) return;
    lastFilterSignatureRef.current = activeFilterSignature;
    // Abort any in-flight window fetches when filters/sorts change
    if (rowWindowAbortControllerRef.current) {
      rowWindowAbortControllerRef.current.abort();
      rowWindowAbortControllerRef.current = null;
    }
    pendingRowWindowFetchesRef.current.clear();
    if (filterSortLoadingDelayRef.current) {
      window.clearTimeout(filterSortLoadingDelayRef.current);
      filterSortLoadingDelayRef.current = null;
    }
    setIsFilterSortLoading(false);
  }, [activeFilterSignature]);
  const updateTableById = useCallback(
    (tableId: string, updater: (table: TableDefinition) => TableDefinition) => {
      setTables((prev) =>
        prev.map((table) => (table.id === tableId ? updater(table) : table)),
      );
    },
    [],
  );
  const hasEffectiveRowSort = effectiveRowSortForQuery.length > 0;
  const applyRowTotal = useCallback((total: number) => {
    if (!Number.isFinite(total) || total < 0) return;
    const store = rowStoreRef.current;
    if (!store) return;
    const nextTotal = Math.max(0, total);
    if (store.total === nextTotal) return;
    store.total = nextTotal;
    if (nextTotal === 0 && activeTableId) {
      updateTableById(activeTableId, (table) => {
        const optimisticData = table.data.map((row) =>
          row && row.id.startsWith("c_") ? row : undefined,
        );
        const hasOptimisticRows = optimisticData.some(Boolean);
        if (hasOptimisticRows) {
          return { ...table, data: optimisticData };
        }
        return { ...table, data: [], nextRowId: 1 };
      });
    }
    setRowStoreVersion((prev) => prev + 1);
  }, [activeTableId, updateTableById]);
  const rowCountSignature = useMemo(
    () => `${activeTableId ?? ""}::${activeFilterSignature}::search=${normalizedSearchQuery}`,
    [activeFilterSignature, activeTableId, normalizedSearchQuery],
  );
  const rowCountRequestIdRef = useRef(0);
  const lastRowCountSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    serverSearchIndicesRef.current = serverSearchIndices;
  }, [serverSearchIndices]);

  useEffect(() => {
    serverSearchNavIndexRef.current = serverSearchNavIndex;
  }, [serverSearchNavIndex]);

  useEffect(() => {
    if (normalizedSearchQuery.length === 0) return;
    if (serverSearchIndices.length === 0) return;

    // Keep the search counter aligned with the user's current viewport position
    // when scrolling manually. Avoid overriding immediately after Enter-nav.
    // Use a generous guard: if the user navigated recently (within 2.5s) skip
    // the viewport sync entirely so the counter stays stable.
    const now = Date.now();
    if (now - lastSearchNavigateAtRef.current < 2500) return;
    if (now < suppressSearchViewportSyncUntilRef.current) return;

    const viewportTop = renderWindowStartRef.current;
    // Use first match at/after current viewport top for stable, monotonic counting.
    let lo = 0;
    let hi = serverSearchIndices.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (serverSearchIndices[mid]! < viewportTop) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }
    const bestIdx = lo < serverSearchIndices.length ? lo : serverSearchIndices.length - 1;

    if (serverSearchNavIndexRef.current === bestIdx) return;
    serverSearchNavIndexRef.current = bestIdx;
    setServerSearchNavIndex(bestIdx);
  }, [normalizedSearchQuery, renderWindowStart, serverSearchIndices]);

  const rowStoreKey = useMemo(
    () => (activeTableId ? `${activeTableId}:${activeFilterSignature}` : null),
    [activeTableId, activeFilterSignature],
  );

  useEffect(() => {
    if (!activeTableId || normalizedSearchQuery.length === 0) {
      searchCountRequestIdRef.current += 1;
      setSearchMatchTotal(null);
      setIsSearchCountLoading(false);
      return;
    }
    const requestId = searchCountRequestIdRef.current + 1;
    searchCountRequestIdRef.current = requestId;
    setIsSearchCountLoading(true);

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await utils.rows.getCount.fetch({
            tableId: activeTableId,
            searchQuery: normalizedSearchQuery,
            filterGroups: normalizedFilterGroups,
          });
          if (searchCountRequestIdRef.current !== requestId) return;
          setSearchMatchTotal(response?.total ?? 0);
        } catch {
          if (searchCountRequestIdRef.current !== requestId) return;
          setSearchMatchTotal(0);
        } finally {
          if (searchCountRequestIdRef.current !== requestId) return;
          setIsSearchCountLoading(false);
        }
      })();
    }, 240);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeTableId,
    normalizedFilterGroups,
    normalizedSearchQuery,
    utils.rows.getCount,
  ]);

  // Fetch all matching row indices from the server so navigation covers ALL rows.
  useEffect(() => {
    if (!activeTableId || normalizedSearchQuery.length === 0) {
      serverSearchRequestIdRef.current += 1;
      searchNavigateRequestIdRef.current += 1;
      setIsSearchIndicesLoading(false);
      serverSearchIndicesRef.current = [];
      setServerSearchIndices([]);
      serverSearchNavIndexRef.current = -1;
      setServerSearchNavIndex(-1);
      return;
    }
    const requestId = serverSearchRequestIdRef.current + 1;
    serverSearchRequestIdRef.current = requestId;
    searchNavigateRequestIdRef.current += 1;
    serverSearchIndicesRef.current = [];
    setServerSearchIndices([]);
    serverSearchNavIndexRef.current = -1;
    setServerSearchNavIndex(-1);
    setIsSearchIndicesLoading(true);

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await utils.rows.searchMatchIndices.fetch({
            tableId: activeTableId,
            searchQuery: normalizedSearchQuery,
            filterGroups: normalizedFilterGroups,
            sort:
              effectiveRowSortForQuery.length > 0
                ? effectiveRowSortForQuery
                : undefined,
          });
          if (serverSearchRequestIdRef.current !== requestId) return;
          setIsSearchIndicesLoading(false);
          const indices = response?.indices ?? [];
          const previousIndices = serverSearchIndicesRef.current;
          const previousNavIndex = serverSearchNavIndexRef.current;
          setServerSearchIndices(indices);
          if (indices.length > 0) {
            // Preserve the current navigated match when possible so Enter-repeat
            // doesn't jump to a different position after background refetches.
            let nextNavIndex = -1;
            if (
              previousIndices.length > 0 &&
              previousNavIndex >= 0 &&
              previousNavIndex < previousIndices.length
            ) {
              const previousRowIndex = previousIndices[previousNavIndex];
              if (previousRowIndex !== undefined) {
                const preservedIndex = indices.indexOf(previousRowIndex);
                if (preservedIndex >= 0) {
                  nextNavIndex = preservedIndex;
                }
              }
            }

            if (nextNavIndex < 0) {
              // Initialize to the match closest to the current viewport
              // so the counter reflects the user's scroll position.
              const viewportCenter = renderWindowStartRef.current + Math.floor(ROWS_PAGE_SIZE / 2);
              let bestIdx = 0;
              let bestDist = Math.abs(indices[0]! - viewportCenter);
              for (let i = 1; i < indices.length; i++) {
                const dist = Math.abs(indices[i]! - viewportCenter);
                if (dist < bestDist) {
                  bestDist = dist;
                  bestIdx = i;
                }
              }
              nextNavIndex = bestIdx;
            }

            serverSearchNavIndexRef.current = nextNavIndex;
            setServerSearchNavIndex(nextNavIndex);
          } else {
            serverSearchNavIndexRef.current = -1;
            setServerSearchNavIndex(-1);
          }
        } catch {
          if (serverSearchRequestIdRef.current !== requestId) return;
          setIsSearchIndicesLoading(false);
          searchNavigateRequestIdRef.current += 1;
          serverSearchIndicesRef.current = [];
          setServerSearchIndices([]);
          serverSearchNavIndexRef.current = -1;
          setServerSearchNavIndex(-1);
        }
      })();
    }, 280);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeTableId,
    effectiveRowSortForQuery,
    normalizedFilterGroups,
    normalizedSearchQuery,
    utils.rows.searchMatchIndices,
  ]);

  // Fetch total count in the background (debounced) so row windows stay fast.
  useEffect(() => {
    if (!activeTableId) {
      lastRowCountSignatureRef.current = null;
      rowCountRequestIdRef.current += 1;
      return;
    }
    if (rowCountSignature === lastRowCountSignatureRef.current) return;
    lastRowCountSignatureRef.current = rowCountSignature;

    const requestId = rowCountRequestIdRef.current + 1;
    rowCountRequestIdRef.current = requestId;
    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await utils.rows.getCount.fetch({
            tableId: activeTableId,
            searchQuery: normalizedSearchQuery,
            filterGroups: normalizedFilterGroups,
          });
          if (rowCountRequestIdRef.current !== requestId) return;
          applyRowTotal(response?.total ?? 0);
        } catch {
          // ignore count errors
        }
      })();
    }, 600);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeTableId,
    applyRowTotal,
    normalizedFilterGroups,
    normalizedSearchQuery,
    rowCountSignature,
    utils.rows.getCount,
  ]);

  useEffect(() => {
    if (!activeTableId) {
      filterSortLoadingSignatureRef.current = null;
      setIsFilterSortLoading(false);
      return;
    }
    if (filterSortLoadingSignatureRef.current === activeFilterSignature) return;
    filterSortLoadingSignatureRef.current = activeFilterSignature;
    setIsFilterSortLoading(false);
  }, [activeFilterSignature, activeTableId]);

  useEffect(() => {
    setIsFilterSortLoading(false);
  }, [isFilterSortLoading, rowStoreVersion, rowWindowFetchCount]);
  const resetRowStore = useCallback(
    (key: string | null, options?: { preserveWindow?: boolean }) => {
      const preserveWindow = options?.preserveWindow ?? false;
      const previousKey = rowStoreKeyRef.current;
      const previousStore = rowStoreRef.current;
      if (previousKey && previousStore) {
        rowStoreCacheRef.current.set(previousKey, previousStore);
      }
    rowStoreKeyRef.current = key;
    const cachedStore = key ? rowStoreCacheRef.current.get(key) ?? null : null;
    if (
      cachedStore &&
      cachedStore.hasFetchedOnce &&
      cachedStore.total === 0 &&
      cachedStore.maxLoadedIndex < 0
    ) {
      cachedStore.hasFetchedOnce = false;
    }
    rowStoreRef.current =
      cachedStore ??
      ({
        total: 0,
        rowsByUiId: new Map(),
        rawCellsByUiId: new Map(),
        indexToUiId: new Map(),
        uiIdToIndex: new Map(),
        fetchedRanges: [],
        maxLoadedIndex: -1,
        hasFetchedOnce: false,
      } as RowWindowStore);
    pendingRowWindowFetchesRef.current.clear();
    pendingRowWindowPatchesRef.current = [];
    if (rowWindowFlushRafRef.current !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(rowWindowFlushRafRef.current);
      rowWindowFlushRafRef.current = null;
    }
    if (rowRangeDebounceTimeoutRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(rowRangeDebounceTimeoutRef.current);
      rowRangeDebounceTimeoutRef.current = null;
    }
    pendingRowRangeRef.current = null;
      setRowStoreVersion((prev) => prev + 1);
      if (!preserveWindow) {
        setRenderWindowStart(0);
        setRenderWindowEnd(ROWS_PAGE_SIZE - 1);
      }
    },
    [],
  );

  useEffect(() => {
    if (!rowStoreKey) {
      resetRowStore(null);
      return;
    }
    if (rowStoreKeyRef.current !== rowStoreKey) {
      const previousTableId = rowStoreKeyRef.current?.split(":")[0] ?? null;
      const shouldPreserveWindow =
        Boolean(activeTableId) && previousTableId === activeTableId;
      resetRowStore(rowStoreKey, { preserveWindow: shouldPreserveWindow });

      // After resetting, sync table.data with the (potentially cached) new store
      // so stale data from a previous filter/sort doesn't interfere with new fetches.
      if (activeTableId) {
        const store = rowStoreRef.current;
        if (store && store.maxLoadedIndex >= 0 && store.indexToUiId.size > 0) {
          // Cached store — rebuild table data from it.
          // We can't call buildTableDataFromRowStore directly here (it's declared
          // later), so use rowStoreVersion bump to trigger the safety net effect.
        } else {
          // Fresh store: keep current rows visible for same-table filter/sort/search
          // changes to avoid brief full-table flicker; clear only when switching tables.
          if (previousTableId !== activeTableId) {
            updateTableById(activeTableId, (table) => ({
              ...table,
              data: [],
              nextRowId: 1,
            }));
          }
        }
      }
    }
  }, [activeTableId, resetRowStore, rowStoreKey, updateTableById]);

  // Abort in-flight row window requests when filter/sort changes
  useEffect(() => {
    // Abort previous requests when activeFilterSignature changes
    if (rowWindowAbortControllerRef.current) {
      rowWindowAbortControllerRef.current.abort();
    }
    rowWindowAbortControllerRef.current = new AbortController();
  }, [activeFilterSignature]);

  const basesQuery = api.bases.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const createBaseMutation = api.bases.create.useMutation();
  const updateBaseMutation = api.bases.update.useMutation();
  const tablesQuery = api.tables.listByBaseId.useQuery(
    { baseId: resolvedBaseId ?? EMPTY_UUID },
    { enabled: Boolean(resolvedBaseId) && isAuthenticated },
  );
  const activeTableBootstrapQuery = api.tables.getBootstrap.useQuery(
    { tableId: activeTableId || EMPTY_UUID },
    {
      enabled: Boolean(activeTableId) && isAuthenticated,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  );
  const createTableMutation = api.tables.create.useMutation();
  const deleteTableMutation = api.tables.delete.useMutation();
  const updateTableMutation = api.tables.update.useMutation();
  const reorderTablesMutation = api.tables.reorder.useMutation();
  const createViewMutation = api.views.create.useMutation();
  const updateViewMutation = api.views.update.useMutation();
  const deleteViewMutation = api.views.delete.useMutation();
  const reorderViewsMutation = api.views.reorder.useMutation();
  const addViewFavoriteMutation = api.views.addFavorite.useMutation();
  const removeViewFavoriteMutation = api.views.removeFavorite.useMutation();
  const favoriteViewIdsQuery = api.views.listFavorites.useQuery(
    { tableId: activeTableId || "" },
    { enabled: Boolean(activeTableId) && isAuthenticated },
  );
  const createColumnMutation = api.columns.create.useMutation();
  const createColumnsBulkMutation = api.columns.bulkCreate.useMutation();
  const updateColumnMutation = api.columns.update.useMutation();
  const deleteColumnMutation = api.columns.delete.useMutation();
  const reorderColumnsMutation = api.columns.reorder.useMutation();
  const createRowMutation = api.rows.create.useMutation();
  const insertRelativeRowMutation = api.rows.insertRelative.useMutation();
  const createRowsBulkMutation = api.rows.bulkCreate.useMutation();
  const createRowsGeneratedMutation = api.rows.bulkCreateGenerated.useMutation();
  const clearRowsByTableMutation = api.rows.clearByTableId.useMutation();
  const setColumnValueMutation = api.rows.setColumnValue.useMutation();
  const updateCellMutation = api.rows.updateCell.useMutation();
  const bulkUpdateCellsMutation = api.rows.bulkUpdateCells.useMutation();
  const deleteRowMutation = api.rows.delete.useMutation();
  const prepareIndexesMutation = api.rows.prepareIndexes.useMutation();
  const preparedTableIndexesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isSidebarAccountMenuOpen) return;
    const handleGlobalPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (
        target?.closest("[data-sidebar-account-menu]") ||
        target?.closest("[data-sidebar-account-menu-trigger]")
      ) {
        return;
      }
      setIsSidebarAccountMenuOpen(false);
    };
    window.addEventListener("pointerdown", handleGlobalPointerDown);
    return () => {
      window.removeEventListener("pointerdown", handleGlobalPointerDown);
    };
  }, [isSidebarAccountMenuOpen]);

  const activeBase = useMemo(() => {
    if (!resolvedBaseId) return null;
    return (basesQuery.data ?? []).find((base) => base.id === resolvedBaseId) ?? null;
  }, [basesQuery.data, resolvedBaseId]);

  useEffect(() => {
    if (!activeBase) return;
    const nextAccent = resolveBaseAccent(activeBase.id, activeBase.accent);
    setBaseAccent(nextAccent);
  }, [activeBase]);

  const hiddenTableIdSet = useMemo(() => new Set(hiddenTableIds), [hiddenTableIds]);
  const visibleTables = useMemo(
    () => (tables ?? []).filter((table) => !hiddenTableIdSet.has(table.id)),
    [tables, hiddenTableIdSet],
  );
  const hiddenTables = useMemo(
    () => (tables ?? []).filter((table) => hiddenTableIdSet.has(table.id)),
    [tables, hiddenTableIdSet],
  );

  const activeTable = useMemo(
    () =>
      tables.find((table) => table.id === activeTableId) ??
      visibleTables[0] ??
      tables[0],
    [tables, activeTableId, visibleTables],
  );

  useEffect(() => {
    if (!activeTableId || !activeTable) return;
    if (typeof window === "undefined") return;
    if (isAddingHundredThousandRows) return;
    if (bulkAddRepairInFlightRef.current) return;
    const pendingKey = `airtable-clone.bulkAddPending.${activeTableId}`;
    const raw = window.localStorage.getItem(pendingKey);
    if (!raw) return;
    let pending:
      | {
          targetTotal: number;
          baseCells?: Record<string, string>;
          generateFaker?: boolean;
          fields?: Array<{ id: string; label: string; kind: "singleLineText" | "number" }>;
        }
      | null = null;
    try {
      pending = JSON.parse(raw) as {
        targetTotal: number;
        baseCells?: Record<string, string>;
        generateFaker?: boolean;
        fields?: Array<{ id: string; label: string; kind: "singleLineText" | "number" }>;
      };
    } catch {
      window.localStorage.removeItem(pendingKey);
      return;
    }
    if (!pending?.targetTotal) {
      window.localStorage.removeItem(pendingKey);
      return;
    }

    bulkAddRepairInFlightRef.current = true;
    void (async () => {
      try {
        const countResult = await utils.rows.getCount.fetch({ tableId: activeTableId });
        const currentTotal = countResult?.total ?? 0;
        if (isDev) {
          // eslint-disable-next-line no-console
          console.log("[bulkAdd] repair check", { currentTotal, target: pending.targetTotal });
        }
        if (currentTotal >= pending.targetTotal) {
          window.localStorage.removeItem(pendingKey);
          return;
        }
        let missing = pending.targetTotal - currentTotal;
        const fallbackChunkSize = 1000;
        while (missing > 0) {
          const chunkSize = Math.min(fallbackChunkSize, missing);
          if (pending.generateFaker && (pending.fields?.length ?? 0) > 0) {
            await createRowsGeneratedMutation.mutateAsync({
              tableId: activeTableId,
              count: chunkSize,
              generateFaker: true,
              fields: pending.fields,
            });
          } else {
            await createRowsBulkMutation.mutateAsync({
              tableId: activeTableId,
              rows: Array.from({ length: chunkSize }, () => ({ cells: pending?.baseCells ?? {} })),
            });
          }
          missing -= chunkSize;
        }
        const updatedCount = await utils.rows.getCount.fetch({ tableId: activeTableId });
        if ((updatedCount?.total ?? 0) >= pending.targetTotal) {
          window.localStorage.removeItem(pendingKey);
        }
      } catch (error) {
        if (isDev) {
          // eslint-disable-next-line no-console
          console.error("[bulkAdd] repair failed", error);
        }
        // Best-effort repair; keep pending key for next reload.
      } finally {
        bulkAddRepairInFlightRef.current = false;
      }
    })();
  }, [
    activeTable,
    activeTableId,
    createRowsBulkMutation,
    createRowsGeneratedMutation,
    isAddingHundredThousandRows,
    utils.rows.getCount,
  ]);
  const activeTableColumns = useMemo(
    () => activeTableBootstrapQuery.data?.columns ?? [],
    [activeTableBootstrapQuery.data],
  );
  const tableViews = useMemo(
    () => activeTableBootstrapQuery.data?.views ?? [],
    [activeTableBootstrapQuery.data],
  );
  // Views are now ordered by 'order' field in DB, so tableViews is already in correct order
  const orderedTableViews = tableViews;
  const activeView = useMemo(() => {
    if (orderedTableViews.length === 0) return null;
    if (activeViewId) {
      return orderedTableViews.find((view) => view.id === activeViewId) ?? null;
    }
    return orderedTableViews[0] ?? null;
  }, [orderedTableViews, activeViewId]);
  const [favoriteViewIdsOverride, setFavoriteViewIdsOverride] = useState<Set<string> | null>(null);
  const favoriteViewIdSet = useMemo(() => {
    if (favoriteViewIdsOverride) return new Set(favoriteViewIdsOverride);
    return new Set(favoriteViewIdsQuery.data ?? []);
  }, [favoriteViewIdsQuery.data, favoriteViewIdsOverride]);
  const favoriteViewIds = useMemo(() => Array.from(favoriteViewIdSet), [favoriteViewIdSet]);
  const favoriteViews = useMemo(
    () => orderedTableViews.filter((view) => favoriteViewIdSet.has(view.id)),
    [orderedTableViews, favoriteViewIdSet],
  );
  const viewSearchQuery = useMemo(() => viewSearch.trim().toLowerCase(), [viewSearch]);
  const filteredFavoriteViews = useMemo(() => {
    if (!viewSearchQuery) return favoriteViews;
    return favoriteViews.filter((view) => view.name.toLowerCase().includes(viewSearchQuery));
  }, [favoriteViews, viewSearchQuery]);
  const filteredOrderedTableViews = useMemo(() => {
    if (!viewSearchQuery) return orderedTableViews;
    return orderedTableViews.filter((view) => view.name.toLowerCase().includes(viewSearchQuery));
  }, [orderedTableViews, viewSearchQuery]);
  const hasViewSearch = viewSearchQuery.length > 0;
  useEffect(() => {
    if (!favoriteViewIdsOverride) return;
    const serverIds = new Set(favoriteViewIdsQuery.data ?? []);
    const isSameSize = serverIds.size === favoriteViewIdsOverride.size;
    const isSameSet = isSameSize && Array.from(serverIds).every((id) => favoriteViewIdsOverride.has(id));
    if (isSameSet) {
      setFavoriteViewIdsOverride(null);
    }
  }, [favoriteViewIdsQuery.data, favoriteViewIdsOverride]);
  const sidebarContextView = useMemo(() => {
    if (!sidebarViewContextMenu) return null;
    return tableViews.find((view) => view.id === sidebarViewContextMenu.viewId) ?? null;
  }, [tableViews, sidebarViewContextMenu]);
  const sidebarContextViewKind = useMemo(
    () =>
      sidebarContextView
        ? resolveSidebarViewKind(sidebarContextView)
        : ("grid" as SidebarViewKind),
    [sidebarContextView],
  );
  const sidebarContextViewKindLabel = getViewKindLabel(sidebarContextViewKind);
  const activeViewKind = useMemo<SidebarViewKind>(
    () => (activeView ? resolveSidebarViewKind(activeView) : "grid"),
    [activeView],
  );
  const pendingDeletedRowIdSet = useMemo(() => {
    if (!activeTableId) return new Set<string>();
    return pendingDeletedRowIdsByTable.get(activeTableId) ?? new Set<string>();
  }, [activeTableId, pendingDeletedRowIdsByTable]);
  const activeRowStore = useMemo(
    () => rowStoreRef.current,
    [rowStoreKey, rowStoreVersion],
  );
  const activeTableTotalRows = Math.max(
    (activeRowStore?.total ?? 0) - pendingDeletedRowIdSet.size,
    activeTable?.data.length ?? 0,
  );
  const data = useMemo(() => activeTable?.data ?? [], [activeTable]);
  const bottomQuickAddRow = useMemo(() => {
    if (!bottomQuickAddRowId) return null;
    return data.find((row) => row?.id === bottomQuickAddRowId) ?? null;
  }, [bottomQuickAddRowId, data]);
  const bottomQuickAddRowIndex = useMemo(
    () =>
      bottomQuickAddRowId
        ? data.findIndex((row) => row?.id === bottomQuickAddRowId)
        : -1,
    [bottomQuickAddRowId, data],
  );

  useEffect(() => {
    if (!activeTableId) return;
    if (pendingDeletedRowIdSet.size === 0) return;
    const serverIdSet = new Set(activeRowStore?.rowsByUiId.keys() ?? []);
    if (serverIdSet.size === 0) return;
    const nextPending = new Set(pendingDeletedRowIdSet);
    let didUpdate = false;
    pendingDeletedRowIdSet.forEach((rowId) => {
      if (!serverIdSet.has(rowId)) {
        nextPending.delete(rowId);
        didUpdate = true;
      }
    });
    if (!didUpdate) return;
    setPendingDeletedRowIdsByTable((prev) => {
      const next = new Map(prev);
      if (nextPending.size === 0) {
        next.delete(activeTableId);
      } else {
        next.set(activeTableId, nextPending);
      }
      return next;
    });
  }, [
    activeTableId,
    activeRowStore,
    pendingDeletedRowIdSet,
    setPendingDeletedRowIdsByTable,
  ]);

  const loadedRecordCount = data.length;
  const totalRecordCount = Math.max(activeTableTotalRows, loadedRecordCount);
  const bulkAddProgressCount =
    isAddingHundredThousandRows && bulkAddStartRecordCount !== null
      ? Math.min(bulkAddInsertedRowCount, BULK_ADD_100K_ROWS_COUNT)
      : 0;
  const displayedRecordCount =
    isAddingHundredThousandRows && bulkAddStartRecordCount !== null
      ? Math.max(
          totalRecordCount,
          bulkAddStartRecordCount + BULK_ADD_100K_ROWS_COUNT,
        )
      : totalRecordCount;
  const tableFields = useMemo(() => activeTable?.fields ?? [], [activeTable?.fields]);
  const bootstrapFieldsForRows = useMemo(() => {
    if (!activeTableBootstrapQuery.data?.columns) return [];
    return activeTableBootstrapQuery.data.columns.map((column) =>
      mapDbColumnToField(column),
    );
  }, [activeTableBootstrapQuery.data?.columns]);
  const tableFieldById = useMemo(
    () => new Map(tableFields.map((field) => [field.id, field] as const)),
    [tableFields],
  );
  const isPlaceholderRow = useCallback(
    (row: TableRow | undefined) => !row || row.id.startsWith("placeholder-"),
    [],
  );
  const mapDbRowToTableRow = useCallback(
    (
      dbRow: DbRow,
      fieldsOverride?: TableField[],
    ) => {
      const uiId = createServerRowId(dbRow.id);
      optimisticRowIdToRealIdRef.current.set(uiId, dbRow.id);
      const nextRow: TableRow = { id: uiId, serverId: dbRow.id };
      const cells = (dbRow.cells ?? {}) as Record<string, unknown>;
      const fields =
        fieldsOverride ??
        (tableFields.length > 0 ? tableFields : bootstrapFieldsForRows);
      logPerf(`[rows] mapDbRowToTableRow (${fields.length} fields)`, () => {
        fields.forEach((field) => {
          const cellValue = cells[field.id];
          nextRow[field.id] = toCellText(cellValue, field.defaultValue);
        });
      });
      const overrides = dirtyCellOverridesRef.current.get(uiId);
      if (overrides && overrides.size > 0) {
        overrides.forEach((value, columnId) => {
          const serverValue = nextRow[columnId];
          if (serverValue === value) {
            overrides.delete(columnId);
            return;
          }
          nextRow[columnId] = value;
        });
        if (overrides.size === 0) {
          dirtyCellOverridesRef.current.delete(uiId);
        }
      }
      return nextRow;
    },
    [bootstrapFieldsForRows, tableFields],
  );
  const buildTableDataFromRowStore = useCallback(
    (table: TableDefinition, store: RowWindowStore) => {
      const optimisticEntries: Array<[number, TableRow]> = [];
      table.data.forEach((row, index) => {
        if (row && row.id.startsWith("c_")) {
          optimisticEntries.push([index, row]);
        }
      });

      let desiredLength = Math.max(store.maxLoadedIndex + 1, 0);
      optimisticEntries.forEach(([index]) => {
        if (index + 1 > desiredLength) desiredLength = index + 1;
      });

      const nextData: Array<TableRow | undefined> = new Array<TableRow | undefined>(desiredLength);
      store.indexToUiId.forEach((uiId, index) => {
        const row = store.rowsByUiId.get(uiId);
        if (row) {
          nextData[index] = row;
        }
      });

      optimisticEntries.forEach(([index, row]) => {
        if (index >= nextData.length) {
          nextData.length = index + 1;
        }
        nextData[index] = row;
      });

      const total = store.total ?? nextData.length;
      return {
        ...table,
        data: nextData,
        nextRowId: Math.max(total, nextData.length) + 1,
      };
    },
    [],
  );
  const flushRowWindowPatches = useCallback(() => {
    if (rowWindowFlushRafRef.current !== null) return;
    const tableId = activeTableId;
    if (!tableId) {
      pendingRowWindowPatchesRef.current = [];
      return;
    }
    const runFlush = () => {
      rowWindowFlushRafRef.current = null;
      const patches = pendingRowWindowPatchesRef.current;
      if (patches.length === 0) return;
      pendingRowWindowPatchesRef.current = [];

      updateTableById(tableId, (table) => {
        const nextData = [...table.data] as Array<TableRow | undefined>;
        const optimisticEntries: Array<[number, TableRow]> = [];
        nextData.forEach((row, index) => {
          if (row && row.id.startsWith("c_")) {
            optimisticEntries.push([index, row]);
          }
        });
        const maxOptimisticIndex = optimisticEntries.reduce(
          (max, [index]) => Math.max(max, index),
          -1,
        );
        let targetLength = 0;
        const maxLoadedIndex = rowStoreRef.current?.maxLoadedIndex ?? -1;
        patches.forEach((patch) => {
          if (patch.rows.length === 0) return;
          const patchEnd = patch.start + patch.rows.length;
          if (patchEnd > targetLength) targetLength = patchEnd;
        });
        const desiredLength = Math.max(
          targetLength,
          maxLoadedIndex >= 0 ? maxLoadedIndex + 1 : 0,
          maxOptimisticIndex >= 0 ? maxOptimisticIndex + 1 : 0,
        );
        if (nextData.length !== desiredLength) {
          nextData.length = desiredLength;
        }

        const idToIndex = new Map<string, number>();
        nextData.forEach((row, index) => {
          if (row) idToIndex.set(row.id, index);
        });

        patches.forEach((patch) => {
          patch.clearedIndices.forEach((cleared) => {
            const { index, uiId: expectedUiId } = cleared;
            if (index < nextData.length) {
              const existing = nextData[index];
              // Only clear if the current occupant is the row that actually moved.
              // A different row placed by an earlier patch must not be wiped out.
              if (existing && existing.id === expectedUiId && idToIndex.get(existing.id) === index) {
                idToIndex.delete(existing.id);
                nextData[index] = undefined;
              }
            }
          });
          patch.rows.forEach((dbRow, index) => {
            const rowIndex = patch.start + index;
            const uiId = createServerRowId(dbRow.id);
            const nextRow = rowStoreRef.current?.rowsByUiId.get(uiId);
            if (nextRow) {
              const existingIndex = idToIndex.get(nextRow.id);
              if (existingIndex !== undefined && existingIndex !== rowIndex) {
                nextData[existingIndex] = undefined;
              }
              nextData[rowIndex] = nextRow;
              idToIndex.set(nextRow.id, rowIndex);
            }
          });
        });

        optimisticEntries.forEach(([index, row]) => {
          if (index >= nextData.length) return;
          nextData[index] = row;
          idToIndex.set(row.id, index);
        });

        const total = rowStoreRef.current?.total ?? nextData.length;
        return {
          ...table,
          data: nextData,
          nextRowId: Math.max(total, nextData.length) + 1,
        };
      });

      setRowStoreVersion((prev) => prev + 1);
    };

    // Flush synchronously via microtask instead of RAF to eliminate ~16ms frame delay.
    // React 18 auto-batches state updates, so multiple flushes within one tick coalesce.
    rowWindowFlushRafRef.current = 1 as unknown as number;
    queueMicrotask(runFlush);
  }, [activeTableId, updateTableById]);
  const applyRowWindow = useCallback(
    (
      start: number,
      dbRows: DbRow[],
      total: number,
    ) => {
      if (!activeTableId) return;
      const store =
      rowStoreRef.current ??
      ({
        total: 0,
        rowsByUiId: new Map(),
        rawCellsByUiId: new Map(),
        indexToUiId: new Map(),
        uiIdToIndex: new Map(),
        fetchedRanges: [],
        maxLoadedIndex: -1,
        hasFetchedOnce: false,
      } as RowWindowStore);
      rowStoreRef.current = store;

      const clearedIndices: Array<{ index: number; uiId: string }> = [];
      store.hasFetchedOnce = true;
      dbRows.forEach((dbRow, index) => {
        const rowIndex = start + index;
        const uiId = createServerRowId(dbRow.id);
        // Preserve raw cells for potential re-mapping when fields become available
        store.rawCellsByUiId.set(uiId, ((dbRow.cells ?? {}) as Record<string, unknown>));
        const existingIndex = store.uiIdToIndex.get(uiId);
        if (existingIndex !== undefined && existingIndex !== rowIndex) {
          store.indexToUiId.delete(existingIndex);
          clearedIndices.push({ index: existingIndex, uiId });
        }
        store.uiIdToIndex.set(uiId, rowIndex);
        store.indexToUiId.set(rowIndex, uiId);
        const nextRow = mapDbRowToTableRow(dbRow);
        store.rowsByUiId.set(uiId, nextRow);
      });

      if (Number.isFinite(total) && total >= 0) {
        store.total = Math.max(0, total);
      }
      if (dbRows.length > 0) {
        store.maxLoadedIndex = Math.max(
          store.maxLoadedIndex,
          start + dbRows.length - 1,
        );
      }
      if (dbRows.length > 0) {
        const endIndex = start + dbRows.length - 1;
        store.fetchedRanges = addRange(store.fetchedRanges, start, endIndex);
      }

      pendingRowWindowPatchesRef.current.push({
        start,
        rows: dbRows,
        clearedIndices,
      });
      flushRowWindowPatches();
    },
    [activeTableId, flushRowWindowPatches, mapDbRowToTableRow],
  );
  const ensureRowRange = useCallback(
    async (start: number, end: number) => {
      if (!activeTableId) return;
      const store = rowStoreRef.current;
      if (!store) return;
      const storeKey = rowStoreKeyRef.current;
      if (!storeKey) return;
      if (store.hasFetchedOnce && store.total === 0 && store.maxLoadedIndex < 0) {
        const hasLocalRows =
          activeTable?.data.some((row) => row !== undefined) ?? false;
        if (!hasLocalRows) return;
        store.hasFetchedOnce = false;
      }
      const missing = getMissingRanges(store.fetchedRanges, start, end);
      if (missing.length === 0) return;

      const maxPages =
        isFastScrollingRef.current ? ROWS_FAST_SCROLL_PREFETCH_PAGES : Math.max(2, ROWS_FAST_SCROLL_PREFETCH_PAGES);
      let pagesFetched = 0;
      for (const range of missing) {
        for (
          let offset = range.start;
          offset <= range.end;
          offset += ROWS_PAGE_SIZE
        ) {
          if (pagesFetched >= maxPages) return;
          const limit = Math.min(ROWS_PAGE_SIZE, range.end - offset + 1);
          const key = `${offset}:${limit}`;
          if (pendingRowWindowFetchesRef.current.has(key)) continue;
          pendingRowWindowFetchesRef.current.add(key);
          setRowWindowFetchCount((count) => count + 1);
          try {
            rowWindowAbortControllerRef.current ??= new AbortController();
            const includeTotal = !store.hasFetchedOnce || store.total <= 0;
            const fetchStart = performance.now();
            const response = await utils.rows.getWindow.fetch({
              tableId: activeTableId,
              start: offset,
              limit,
              filterGroups: normalizedFilterGroups,
              sort:
                effectiveRowSortForQuery.length > 0
                  ? effectiveRowSortForQuery
                  : undefined,
              includeTotal,
            });
            if (isDev) {
              const fetchDuration = performance.now() - fetchStart;
              // eslint-disable-next-line no-console
              console.log(
                `[perf] rows.getWindow offset=${offset} limit=${limit} rows=${response?.rows?.length ?? 0} ` +
                  `filters=${normalizedFilterGroups.length} sorts=${effectiveRowSortForQuery.length} ` +
                  `${fetchDuration.toFixed(1)}ms`
              );
            }
            if (rowStoreKeyRef.current !== storeKey) {
              return;
            }
            const rows = response?.rows ?? [];
            const pendingDeletedRowIds = pendingDeletedRowIdsByTable.get(activeTableId);
            const filteredRows =
              pendingDeletedRowIds && pendingDeletedRowIds.size > 0
                ? rows.filter((row) => !pendingDeletedRowIds.has(createServerRowId(row.id)))
                : rows;
            if (filteredRows.length > 0 || response?.total !== undefined) {
              applyRowWindow(offset, filteredRows, response?.total ?? store.total);
            }
          } catch {
            // ignore
          } finally {
            pendingRowWindowFetchesRef.current.delete(key);
            setRowWindowFetchCount((count) => Math.max(0, count - 1));
          }
          pagesFetched += 1;
        }
      }
    },
    [
      activeTableId,
      applyRowWindow,
      activeTable,
      normalizedFilterGroups,
      pendingDeletedRowIdsByTable,
      effectiveRowSortForQuery,
      setRowWindowFetchCount,
      utils.rows.getWindow,
    ],
  );

  const removeRowByIdFromData = useCallback(
    (rows: Array<TableRow | undefined>, rowId: string) => {
    const next = [...rows] as Array<TableRow | undefined>;
    const index = next.findIndex((row) => row?.id === rowId);
    if (index !== -1) {
      next.splice(index, 1);
    }
    return next;
  }, []);

  const removeRowIdsFromData = useCallback(
    (rows: Array<TableRow | undefined>, ids: Set<string>) => {
    if (ids.size === 0) return rows;
    const next = [...rows] as Array<TableRow | undefined>;
    for (let index = next.length - 1; index >= 0; index -= 1) {
      const row = next[index];
      if (row && ids.has(row.id)) {
        next.splice(index, 1);
      }
    }
    return next;
  }, []);

  const applyRowDeletionToRowStore = useCallback(
    (deletedIndex: number) => {
      const store = rowStoreRef.current;
      if (!store) return;
      if (!Number.isFinite(deletedIndex) || deletedIndex < 0) return;

      const entries = Array.from(store.indexToUiId.entries()).sort(
        ([a], [b]) => a - b,
      );
      if (entries.length === 0) return;

      store.indexToUiId.clear();
      store.uiIdToIndex.clear();
      let maxIndex = -1;
      entries.forEach(([index, uiId]) => {
        if (index === deletedIndex) return;
        const nextIndex = index > deletedIndex ? index - 1 : index;
        store.indexToUiId.set(nextIndex, uiId);
        store.uiIdToIndex.set(uiId, nextIndex);
        if (nextIndex > maxIndex) maxIndex = nextIndex;
      });

      store.maxLoadedIndex = maxIndex;
      store.fetchedRanges = store.fetchedRanges
        .map((range) => {
          if (range.end < deletedIndex) return range;
          if (range.start > deletedIndex) {
            return { start: range.start - 1, end: range.end - 1 };
          }
          return { start: range.start, end: range.end - 1 };
        })
        .filter((range) => range.end >= range.start);

      setRowStoreVersion((prev) => prev + 1);
    },
    [],
  );

  const applyRowInsertionToRowStore = useCallback(
    (insertedIndex: number) => {
      const store = rowStoreRef.current;
      if (!store) return;
      if (!Number.isFinite(insertedIndex) || insertedIndex < 0) return;

      const entries = Array.from(store.indexToUiId.entries()).sort(
        ([a], [b]) => b - a,
      );
      if (entries.length === 0) return;

      store.indexToUiId.clear();
      store.uiIdToIndex.clear();
      let maxIndex = -1;
      entries.forEach(([index, uiId]) => {
        const nextIndex = index >= insertedIndex ? index + 1 : index;
        store.indexToUiId.set(nextIndex, uiId);
        store.uiIdToIndex.set(uiId, nextIndex);
        if (nextIndex > maxIndex) maxIndex = nextIndex;
      });

      store.maxLoadedIndex = maxIndex;
      store.fetchedRanges = store.fetchedRanges.map((range) => {
        if (range.end < insertedIndex) return range;
        if (range.start >= insertedIndex) {
          return { start: range.start + 1, end: range.end + 1 };
        }
        return { start: range.start, end: range.end + 1 };
      });

      setRowStoreVersion((prev) => prev + 1);
    },
    [],
  );

  const hideFieldItems = useMemo<FieldMenuItem[]>(
    () =>
      tableFields.map((field) => ({
        id: field.id,
        label: field.label,
        icon: resolveFieldMenuIcon(field),
        sortId: field.id,
      })),
    [tableFields],
  );
  const sortableFields = useMemo(() => tableFields, [tableFields]);
  const validSortingRules = useMemo(
    () =>
      sorting.filter((sortRule) =>
        sortableFields.some((field) => field.id === sortRule.id),
      ),
    [sorting, sortableFields],
  );
  const displayedSortRules = useMemo<SortingState>(() => {
    if (!isAutoSortEnabled && pendingSortRules !== null) {
      return pendingSortRules;
    }
    if (validSortingRules.length > 0) return validSortingRules;
    const defaultFieldId = sortableFields[0]?.id;
    return defaultFieldId ? [{ id: defaultFieldId, desc: false }] : [];
  }, [validSortingRules, sortableFields, isAutoSortEnabled, pendingSortRules]);
  const handleSortRuleFieldChange = useCallback(
    (index: number, nextFieldId: string) => {
      if (!nextFieldId) return;
      const updateRules = (prev: SortingState) => {
        const sourceRules =
          prev.length > 0
            ? prev.filter((rule) => sortableFields.some((field) => field.id === rule.id))
            : displayedSortRules;
        if (!sourceRules[index]) return prev;
        return sourceRules.map((rule, ruleIndex) =>
          ruleIndex === index ? { ...rule, id: nextFieldId } : rule,
        );
      };
      if (isAutoSortEnabled) {
        setSorting(updateRules);
      } else {
        setPendingSortRules((prev) => updateRules(prev ?? displayedSortRules));
      }
    },
    [displayedSortRules, sortableFields, isAutoSortEnabled],
  );
  const handleSortRuleDirectionChange = useCallback(
    (index: number, nextDirection: "asc" | "desc") => {
      const updateRules = (prev: SortingState) => {
        const sourceRules =
          prev.length > 0
            ? prev.filter((rule) => sortableFields.some((field) => field.id === rule.id))
            : displayedSortRules;
        if (!sourceRules[index]) return prev;
        return sourceRules.map((rule, ruleIndex) =>
          ruleIndex === index ? { ...rule, desc: nextDirection === "desc" } : rule,
        );
      };
      if (isAutoSortEnabled) {
        setSorting(updateRules);
      } else {
        setPendingSortRules((prev) => updateRules(prev ?? displayedSortRules));
      }
    },
    [displayedSortRules, sortableFields, isAutoSortEnabled],
  );
  const handleAddSortRule = useCallback(() => {
    if (sortableFields.length === 0) return;
    const updateRules = (prev: SortingState) => {
      const sourceRules =
        prev.length > 0
          ? prev.filter((rule) => sortableFields.some((field) => field.id === rule.id))
          : displayedSortRules;
      const usedFieldIds = new Set(sourceRules.map((rule) => rule.id));
      const nextField =
        sortableFields.find((field) => !usedFieldIds.has(field.id)) ?? sortableFields[0];
      if (!nextField) return sourceRules;
      return [...sourceRules, { id: nextField.id, desc: false }];
    };
    if (isAutoSortEnabled) {
      setSorting(updateRules);
    } else {
      setPendingSortRules((prev) => updateRules(prev ?? displayedSortRules));
    }
  }, [displayedSortRules, sortableFields, isAutoSortEnabled]);
  const handleRemoveSortRule = useCallback(
    (index: number) => {
      const updateRules = (prev: SortingState) => {
        const sourceRules = prev.filter((rule) =>
          sortableFields.some((field) => field.id === rule.id),
        );
        if (!sourceRules[index]) return prev;
        return sourceRules.filter((_, ruleIndex) => ruleIndex !== index);
      };
      if (isAutoSortEnabled) {
        setSorting(updateRules);
      } else {
        setPendingSortRules((prev) => updateRules(prev ?? displayedSortRules));
      }
    },
    [sortableFields, isAutoSortEnabled, displayedSortRules],
  );
  const handleApplySort = useCallback(() => {
    if (pendingSortRules !== null) {
      setSorting(pendingSortRules);
      setPendingSortRules(null);
    }
    setIsSortMenuOpen(false);
  }, [pendingSortRules]);
  const handleCancelSort = useCallback(() => {
    setPendingSortRules(null);
    setIsSortMenuOpen(false);
  }, []);
  const filteredSortFields = useMemo(() => {
    const query = sortFieldSearch.trim().toLowerCase();
    if (!query) return sortableFields;
    return sortableFields.filter((field) => field.label.toLowerCase().includes(query));
  }, [sortFieldSearch, sortableFields]);
  const activeSortFieldId = sorting[0]?.id ?? null;
  const handleSelectSortField = useCallback(
    (fieldId: string) => {
      if (!fieldId) return;
      if (isAutoSortEnabled) {
        setSorting([{ id: fieldId, desc: false }]);
        setPendingSortRules(null);
      } else {
        setPendingSortRules([{ id: fieldId, desc: false }]);
      }
      setSortMenuView("editor");
    },
    [isAutoSortEnabled],
  );
  const isSortFieldSearchActive =
    isSortFieldSearchFocused || sortFieldSearch.trim().length > 0;
  const isSortActive = isAutoSortEnabled && sorting.length > 0;
  const sortedColumnIdSet = useMemo(
    () => (isSortActive ? new Set(sorting.map((rule) => rule.id)) : new Set<string>()),
    [sorting, isSortActive],
  );
  const activeFilteredColumnIds = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const group of normalizedFilterGroups) {
      for (const condition of group.conditions) {
        if (!condition.columnId || seen.has(condition.columnId)) continue;
        seen.add(condition.columnId);
        ordered.push(condition.columnId);
      }
    }
    return ordered;
  }, [normalizedFilterGroups]);
  const filteredColumnIdSet = useMemo(
    () => new Set(activeFilteredColumnIds),
    [activeFilteredColumnIds],
  );
  const filteredColumnSummary = useMemo(
    () =>
      activeFilteredColumnIds
        .map((columnId) => tableFields.find((field) => field.id === columnId)?.label ?? "")
        .filter((label) => label.length > 0)
        .join(", "),
    [activeFilteredColumnIds, tableFields],
  );
  const filteredTables = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    if (!query) return tables;
    return tables.filter((table) => table.name.toLowerCase().includes(query));
  }, [tables, tableSearch]);
  const topLevelJoinValue = useMemo<FilterJoin>(
    () => filterGroups[1]?.join ?? "and",
    [filterGroups],
  );
  const topLevelJoinLabel =
    FILTER_JOIN_ITEMS.find((item) => item.id === topLevelJoinValue)?.label ?? topLevelJoinValue;
  const filteredHideFields = useMemo(() => {
    const query = hideFieldSearch.trim().toLowerCase();
    if (!query) return hideFieldItems;
    return hideFieldItems.filter((field) =>
      field.label.toLowerCase().includes(query),
    );
  }, [hideFieldSearch, hideFieldItems]);
  const draggedHideField = useMemo(() => {
    if (!hideFieldDragActiveId) return null;
    return hideFieldItems.find((field) => field.id === hideFieldDragActiveId) ?? null;
  }, [hideFieldDragActiveId, hideFieldItems]);
  const draggedHideTableField = useMemo(() => {
    if (!draggedHideField) return null;
    return tableFields.find((field) => field.id === draggedHideField.id) ?? null;
  }, [draggedHideField, tableFields]);
  const isDraggedHideFieldVisible = Boolean(
    draggedHideField && activeTable?.columnVisibility[draggedHideField.id] !== false,
  );
  const updateHideFieldDropIndicator = useCallback((dropIndex: number | null, activeFieldId: string | null) => {
    const indicator = hideFieldDropIndicatorRef.current;
    const list = hideFieldListRef.current;
    if (!indicator || !list) return;

    if (dropIndex === null || !activeFieldId) {
      indicator.classList.remove(styles.hideFieldsMenuDropIndicatorVisible!);
      return;
    }

    const fields = filteredHideFields.filter((f) => f.id !== activeFieldId);
    let topPosition = 4; // Default top padding

    if (dropIndex >= fields.length) {
      // Drop at end - position after last item
      const lastField = fields[fields.length - 1];
      if (lastField) {
        const lastRow = hideFieldRowRefs.current.get(lastField.id);
        if (lastRow) {
          const listRect = list.getBoundingClientRect();
          const rowRect = lastRow.getBoundingClientRect();
          topPosition = rowRect.bottom - listRect.top + list.scrollTop + 2;
        }
      }
    } else {
      // Drop before specific item
      const targetField = fields[dropIndex];
      if (targetField) {
        const targetRow = hideFieldRowRefs.current.get(targetField.id);
        if (targetRow) {
          const listRect = list.getBoundingClientRect();
          const rowRect = targetRow.getBoundingClientRect();
          topPosition = rowRect.top - listRect.top + list.scrollTop - 2;
        }
      }
    }

    indicator.style.top = `${topPosition}px`;
    indicator.classList.add(styles.hideFieldsMenuDropIndicatorVisible!);
  }, [filteredHideFields]);
  const updateHideFieldDragFromPointer = useCallback(
    (pointerX: number, pointerY: number) => {
      // Update preview position
      hideFieldDragPointerRef.current = { x: pointerX, y: pointerY };
      const previewElement = hideFieldDragPreviewRef.current;
      if (previewElement) {
        previewElement.style.transform = `translate3d(${pointerX + 12}px, ${pointerY + 12}px, 0)`;
      }

      // Calculate drop index
      const activeFieldId = hideFieldDragActiveId;
      if (!activeFieldId) return;
      const fieldsWithoutActive = filteredHideFields.filter((f) => f.id !== activeFieldId);
      let nextDropIndex = fieldsWithoutActive.length;

      for (let index = 0; index < fieldsWithoutActive.length; index += 1) {
        const field = fieldsWithoutActive[index];
        if (!field) continue;
        const rowElement = hideFieldRowRefs.current.get(field.id);
        if (!rowElement) continue;
        const rowBounds = rowElement.getBoundingClientRect();
        const midpoint = rowBounds.top + rowBounds.height / 2;
        if (pointerY <= midpoint) {
          nextDropIndex = index;
          break;
        }
      }

      hideFieldDropIndexRef.current = nextDropIndex;
      updateHideFieldDropIndicator(nextDropIndex, activeFieldId);
    },
    [filteredHideFields, hideFieldDragActiveId, updateHideFieldDropIndicator],
  );
  const resetHideFieldDragState = useCallback(() => {
    const previewElement = hideFieldDragPreviewRef.current;
    if (previewElement) {
      previewElement.style.transform = "translate3d(-9999px, -9999px, 0)";
    }
    const indicator = hideFieldDropIndicatorRef.current;
    if (indicator) {
      indicator.classList.remove(styles.hideFieldsMenuDropIndicatorVisible!);
    }
    hideFieldDropIndexRef.current = null;
    setHideFieldDragActiveId(null);
  }, []);
  const applyHideFieldReorder = useCallback(
    async (nextFieldIds: string[]) => {
      if (!activeTable) return;
      const tableId = activeTable.id;
      const currentFields = activeTable.fields;
      if (nextFieldIds.length !== currentFields.length) return;
      const currentFieldIds = currentFields.map((field) => field.id);
      const hasOrderChanged = currentFieldIds.some(
        (fieldId, index) => fieldId !== nextFieldIds[index],
      );
      if (!hasOrderChanged) return;

      const fieldById = new Map(currentFields.map((field) => [field.id, field] as const));
      const nextFields = nextFieldIds
        .map((fieldId) => fieldById.get(fieldId))
        .filter((field): field is TableField => Boolean(field));
      if (nextFields.length !== currentFields.length) return;

      setTables((prev) =>
        prev.map((table) =>
          table.id === tableId
            ? {
                ...table,
                fields: nextFields,
              }
            : table,
        ),
      );

      try {
        await reorderColumnsMutation.mutateAsync({
          tableId,
          columnIds: nextFields.map((field) => field.id),
        });
      } catch {
        setTables((prev) =>
          prev.map((table) =>
            table.id === tableId
              ? {
                  ...table,
                  fields: currentFields,
                }
              : table,
          ),
        );
      } finally {
        await utils.tables.getBootstrap.invalidate({ tableId });
      }
    },
    [activeTable, reorderColumnsMutation, utils.tables.getBootstrap],
  );
  const handleHideFieldDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>, fieldId: string) => {
      if (reorderColumnsMutation.isPending) {
        event.preventDefault();
        return;
      }
      if (!transparentDragImageRef.current) {
        const image = new window.Image();
        image.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
        transparentDragImageRef.current = image;
      }
      if (transparentDragImageRef.current) {
        event.dataTransfer.setDragImage(transparentDragImageRef.current, 0, 0);
      }
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", fieldId);
      // Update preview position
      hideFieldDragPointerRef.current = { x: event.clientX, y: event.clientY };
      const previewElement = hideFieldDragPreviewRef.current;
      if (previewElement) {
        previewElement.style.transform = `translate3d(${event.clientX + 12}px, ${event.clientY + 12}px, 0)`;
      }
      // Initialize drop index
      const sourceIndex = hideFieldItems.findIndex((field) => field.id === fieldId);
      hideFieldDropIndexRef.current = sourceIndex === -1 ? null : sourceIndex;
      setHideFieldDragActiveId(fieldId);
    },
    [reorderColumnsMutation.isPending, hideFieldItems],
  );
  const handleHideFieldListDragOver = useCallback(
    (event: React.DragEvent<HTMLUListElement>) => {
      if (!hideFieldDragActiveId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      updateHideFieldDragFromPointer(event.clientX, event.clientY);
    },
    [hideFieldDragActiveId, updateHideFieldDragFromPointer],
  );
  const handleHideFieldListDrop = useCallback(
    (event: React.DragEvent<HTMLUListElement>) => {
      if (!hideFieldDragActiveId) return;
      event.preventDefault();
      updateHideFieldDragFromPointer(event.clientX, event.clientY);
    },
    [hideFieldDragActiveId, updateHideFieldDragFromPointer],
  );
  const handleHideFieldDragEnd = useCallback(() => {
    const activeFieldId = hideFieldDragActiveId;
    const dropIndex = hideFieldDropIndexRef.current;
    resetHideFieldDragState();
    if (!activeFieldId || dropIndex === null) return;
    // Get the fields without the dragged item to calculate correct target position
    const fieldsWithoutActive = hideFieldItems.filter((f) => f.id !== activeFieldId);
    const sourceIndex = hideFieldItems.findIndex((field) => field.id === activeFieldId);
    if (sourceIndex === -1) return;
    // Calculate the actual target index in the full list
    const targetField = fieldsWithoutActive[dropIndex];
    let targetIndex: number;
    if (targetField) {
      targetIndex = hideFieldItems.findIndex((f) => f.id === targetField.id);
      // Adjust if moving down (source was before target)
      if (sourceIndex < targetIndex) {
        targetIndex -= 1;
      }
    } else {
      // Dropping at end
      targetIndex = hideFieldItems.length - 1;
    }
    if (sourceIndex === targetIndex) return;
    const nextFieldIds = moveFieldToDropIndex(hideFieldItems, activeFieldId, dropIndex).map(
      (field) => field.id,
    );
    void applyHideFieldReorder(nextFieldIds);
  }, [
    hideFieldDragActiveId,
    hideFieldItems,
    resetHideFieldDragState,
    applyHideFieldReorder,
  ]);
  const filteredAddColumnAgents = useMemo(() => {
    const query = addColumnSearch.trim().toLowerCase();
    if (!query) return ADD_COLUMN_FIELD_AGENTS;
    return ADD_COLUMN_FIELD_AGENTS.filter((item) =>
      item.label.toLowerCase().includes(query),
    );
  }, [addColumnSearch]);
  const filteredAddColumnStandardFields = useMemo(() => {
    const query = addColumnSearch.trim().toLowerCase();
    if (!query) return ADD_COLUMN_STANDARD_FIELDS;
    return ADD_COLUMN_STANDARD_FIELDS.filter((item) =>
      item.label.toLowerCase().includes(query),
    );
  }, [addColumnSearch]);
  const isRestrictedAddColumnMode = true;
  const selectedAddColumnConfig = selectedAddColumnKind
    ? ADD_COLUMN_KIND_CONFIG[selectedAddColumnKind]
    : null;
  const numberFieldExample = useMemo(() => {
    const decimals = clampNumberDecimals(numberDecimalPlaces);
    const baseValue = numberAllowNegative ? -3456 : 3456;
    const abbreviated = applyNumberAbbreviation(baseValue, numberAbbreviation);
    const formatted = formatNumberWithSeparators(
      abbreviated.value,
      decimals,
      numberShowThousandsSeparator,
      numberSeparators,
    );
    return `${formatted}${abbreviated.suffix}`;
  }, [
    numberDecimalPlaces,
    numberAllowNegative,
    numberAbbreviation,
    numberShowThousandsSeparator,
    numberSeparators,
  ]);
  const editNumberFieldExample = useMemo(() => {
    const decimals = clampNumberDecimals(editNumberDecimalPlaces);
    const baseValue = editNumberAllowNegative ? -3456 : 3456;
    const abbreviated = applyNumberAbbreviation(baseValue, editNumberAbbreviation);
    const formatted = formatNumberWithSeparators(
      abbreviated.value,
      decimals,
      editNumberShowThousandsSeparator,
      editNumberSeparators,
    );
    return `${formatted}${abbreviated.suffix}`;
  }, [
    editNumberDecimalPlaces,
    editNumberAllowNegative,
    editNumberAbbreviation,
    editNumberShowThousandsSeparator,
    editNumberSeparators,
  ]);
  const columnVisibility = useMemo(() => activeTable?.columnVisibility ?? {}, [activeTable]);
  const hiddenFieldIds = useMemo(
    () => tableFields.filter((field) => columnVisibility[field.id] === false).map((field) => field.id),
    [tableFields, columnVisibility],
  );
  const hiddenFieldsCount = useMemo(
    () =>
      hideFieldItems.reduce(
        (count, field) => count + (columnVisibility[field.id] === false ? 1 : 0),
        0,
      ),
    [hideFieldItems, columnVisibility],
  );
  const visibleFieldIds = useMemo(
    () =>
      tableFields
        .filter((field) => columnVisibility[field.id] !== false)
        .map((field) => field.id),
    [tableFields, columnVisibility],
  );

  const columns = useMemo<ColumnDef<TableRow>[]>(
    () => {
      const dynamicColumns = tableFields.map<ColumnDef<TableRow>>((field) => ({
        id: field.id,
        accessorKey: field.id,
        header: getFieldDisplayLabel(field),
        size: field.size,
        cell: ({ getValue }) => {
          const value = getValue();
          const textValue =
            typeof value === "string"
              ? value
              : typeof value === "number"
                ? String(value)
                : "";
          if (field.kind !== "number") return textValue;
          return formatNumberCellValue(textValue, field.numberConfig);
        },
      }));
      return [
        {
          id: "rowNumber",
          header: "",
          size: ROW_NUMBER_COLUMN_WIDTH,
          minSize: ROW_NUMBER_COLUMN_WIDTH,
          maxSize: ROW_NUMBER_COLUMN_WIDTH,
          enableResizing: false,
          enableSorting: false,
          cell: ({ row }) => row.index + renderWindowStartRef.current + 1,
        },
        ...dynamicColumns,
      ];
    },
    [tableFields],
  );

  const columnFieldMenuField = useMemo(
    () => tableFields.find((field) => field.id === columnFieldMenuFieldId) ?? null,
    [tableFields, columnFieldMenuFieldId],
  );
  const columnFieldMenuFieldIndex = useMemo(
    () =>
      columnFieldMenuFieldId
        ? tableFields.findIndex((field) => field.id === columnFieldMenuFieldId)
        : -1,
    [tableFields, columnFieldMenuFieldId],
  );
  const isColumnFieldPrimary = Boolean(
    columnFieldMenuFieldId && tableFields[0]?.id === columnFieldMenuFieldId,
  );
  const isColumnFieldActionPending =
    createColumnMutation.isPending ||
    updateColumnMutation.isPending ||
    deleteColumnMutation.isPending ||
    reorderColumnsMutation.isPending;
  const isTableTabActionPending =
    createTableMutation.isPending ||
    createColumnsBulkMutation.isPending ||
    createRowsBulkMutation.isPending ||
    createRowsGeneratedMutation.isPending ||
    clearRowsByTableMutation.isPending ||
    deleteTableMutation.isPending ||
    reorderTablesMutation.isPending;
  const isViewActionPending =
    createViewMutation.isPending ||
    deleteViewMutation.isPending;
  const gridViewCount = useMemo(
    () => tableViews.filter((view) => resolveSidebarViewKind(view) === "grid").length,
    [tableViews, resolveSidebarViewKind],
  );
  const canDeleteActiveView =
    activeView != null
      ? resolveSidebarViewKind(activeView) !== "grid" || gridViewCount > 1
      : false;
  const deleteViewTooltip =
    "You can't delete a view when it's the only grid view left in the table.";
  const canHideActiveTable = Boolean(activeTableId) && visibleTables.length > 1;
  const canClearActiveTableData = Boolean(activeTable && activeTable.data.length > 0);
  const columnFieldSortState = useMemo<"asc" | "desc" | null>(() => {
    if (!columnFieldMenuFieldId) return null;
    const rule = sorting.find((entry) => entry.id === columnFieldMenuFieldId);
    if (!rule) return null;
    return rule.desc ? "desc" : "asc";
  }, [sorting, columnFieldMenuFieldId]);
  const isColumnDragging = draggingColumnId !== null;
  const [, setActiveCellId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingOriginalValue, setEditingOriginalValue] = useState("");
  const [isEditingDirty, setIsEditingDirty] = useState(false);
  const editAutoSaveTimeoutRef = useRef<number | null>(null);
  const editingCellRef = useRef<EditingCell | null>(null);
  const editingValueRef = useRef("");
  const editingInputRef = useRef<HTMLInputElement | null>(null);
  const editingOriginalValueRef = useRef("");
  const editingDirtyRef = useRef(false);
  const activeCellRowIndexRef = useRef<number | null>(null);
  const activeCellColumnIndexRef = useRef<number | null>(null);
  const activeCellFollowTimeoutRef = useRef<number | null>(null);
  const activeCellFollowAttemptsRef = useRef(0);
  const activeCellFollowEnabledRef = useRef(false);
  const [activeCellRowIndex, setActiveCellRowIndex] = useState<number | null>(
    null,
  );
  const [activeCellColumnIndex, setActiveCellColumnIndex] = useState<number | null>(null);
  const [selectedHeaderColumnIndex, setSelectedHeaderColumnIndex] = useState<number | null>(null);

  // Selection anchor (where shift+select started - stays fixed during extend)
  const [selectionAnchor, setSelectionAnchor] = useState<{
    rowIndex: number;
    columnIndex: number;
  } | null>(null);
  const [selectionFocus, setSelectionFocus] = useState<{
    rowIndex: number;
    columnIndex: number;
  } | null>(null);

  // Selection range bounds (computed from anchor + active cell for efficient checks)
  const [selectionRange, setSelectionRange] = useState<{
    minRowIndex: number;
    maxRowIndex: number;
    minColumnIndex: number;
    maxColumnIndex: number;
  } | null>(null);
  const suppressFocusSelectionRef = useRef(false);
  const [fillDragState, setFillDragState] = useState<FillDragState | null>(null);
  const hasDirtyOverrides = dirtyCellOverridesRef.current.size > 0;
  const isSaving =
    isEditingDirty ||
    hasDirtyOverrides ||
    createBaseMutation.isPending ||
    updateBaseMutation.isPending ||
    createTableMutation.isPending ||
    updateTableMutation.isPending ||
    deleteTableMutation.isPending ||
    reorderTablesMutation.isPending ||
    createViewMutation.isPending ||
    updateViewMutation.isPending ||
    deleteViewMutation.isPending ||
    reorderViewsMutation.isPending ||
    addViewFavoriteMutation.isPending ||
    removeViewFavoriteMutation.isPending ||
    createColumnMutation.isPending ||
    updateColumnMutation.isPending ||
    deleteColumnMutation.isPending ||
    reorderColumnsMutation.isPending ||
    createRowMutation.isPending ||
    insertRelativeRowMutation.isPending ||
    createRowsBulkMutation.isPending ||
    createRowsGeneratedMutation.isPending ||
    clearRowsByTableMutation.isPending ||
    setColumnValueMutation.isPending ||
    updateCellMutation.isPending ||
    bulkUpdateCellsMutation.isPending ||
    deleteRowMutation.isPending ||
    isAddingHundredThousandRows;

  useEffect(() => {
    editingCellRef.current = editingCell;
  }, [editingCell]);

  useEffect(() => {
    editingValueRef.current = editingValue;
  }, [editingValue]);

  useEffect(() => {
    editingOriginalValueRef.current = editingOriginalValue;
  }, [editingOriginalValue]);

  useEffect(() => {
    activeCellRowIndexRef.current = activeCellRowIndex;
  }, [activeCellRowIndex]);

  useEffect(() => {
    activeCellColumnIndexRef.current = activeCellColumnIndex;
  }, [activeCellColumnIndex]);

  const clearEditAutoSaveTimeout = useCallback(() => {
    if (editAutoSaveTimeoutRef.current) {
      window.clearTimeout(editAutoSaveTimeoutRef.current);
      editAutoSaveTimeoutRef.current = null;
    }
  }, []);

  const updateEditingDirtyState = useCallback((nextValue: string) => {
    const isDirty = nextValue !== editingOriginalValueRef.current;
    if (isDirty === editingDirtyRef.current) return;
    editingDirtyRef.current = isDirty;
    setIsEditingDirty(isDirty);
  }, []);

  const resetEditingState = useCallback(() => {
    clearEditAutoSaveTimeout();
    setEditingCell(null);
    setEditingValue("");
    setEditingOriginalValue("");
    editingValueRef.current = "";
    editingOriginalValueRef.current = "";
    editingDirtyRef.current = false;
    setIsEditingDirty(false);
  }, [clearEditAutoSaveTimeout]);

  const enqueueInsertRelative = useCallback((task: () => Promise<void>) => {
    insertRelativeQueueRef.current = insertRelativeQueueRef.current
      .then(task)
      .catch(() => undefined)
      .then(() => undefined);
  }, []);

  // Clipboard state for cut/copy operations
  const [clipboardData, setClipboardData] = useState<{
    cells: Array<Array<{ value: string; columnId: string }>>;
    isCut: boolean;
    sourceRange: { minRow: number; maxRow: number; minCol: number; maxCol: number };
  } | null>(null);

  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const rowTopByIdRef = useRef<Map<string, number>>(new Map());
  const shouldAnimateRowPositionsRef = useRef(false);
  const hasMeasuredRowPositionsRef = useRef(false);
  const dropTargetRowIdRef = useRef<string | null>(null);
  const fillDragStateRef = useRef<FillDragState | null>(null);
  const previousFilterSignatureRef = useRef<string | null>(null);
  const previousTableIdRef = useRef<string | null>(null);
  const skipNextFilterClearRef = useRef(false);

  // Fast scroll detection for scrollbar dragging
  const lastScrollTopRef = useRef<number>(0);
  const lastScrollTimeRef = useRef<number>(Date.now());
  const scrollVelocityRef = useRef<number>(0);
  const [isFastScrolling, setIsFastScrolling] = useState(false);

  const clearGridSelectionState = useCallback(() => {
    resetEditingState();
    setActiveCellId(null);
    setActiveCellRowIndex(null);
    setActiveCellColumnIndex(null);
    setSelectedHeaderColumnIndex(null);
    setSelectionAnchor(null);
    setSelectionRange(null);
    fillDragStateRef.current = null;
    setFillDragState(null);
    setRowSelection({});
    setActiveRowId(null);
    dropTargetRowIdRef.current = null;
  }, [resetEditingState]);

  const setRowElementRef = useCallback(
    (rowId: string) => (element: HTMLTableRowElement | null) => {
      const rowDropTargetClass = styles.tanstackRowDropTarget;
      if (element) {
        rowRefs.current.set(rowId, element);
        if (dropTargetRowIdRef.current === rowId && rowDropTargetClass) {
          element.classList.add(rowDropTargetClass);
        }
      } else {
        rowRefs.current.delete(rowId);
      }
    },
    [],
  );
  const setDropTargetRow = useCallback((rowId: string | null) => {
    const rowDropTargetClass = styles.tanstackRowDropTarget;
    const previousId = dropTargetRowIdRef.current;
    if (previousId === rowId) return;
    if (previousId && rowDropTargetClass) {
      rowRefs.current.get(previousId)?.classList.remove(rowDropTargetClass);
    }
    dropTargetRowIdRef.current = rowId;
    if (rowId && rowDropTargetClass) {
      rowRefs.current.get(rowId)?.classList.add(rowDropTargetClass);
    }
  }, []);

  useEffect(() => {
    if (!hasMeasuredRowPositionsRef.current) {
      hasMeasuredRowPositionsRef.current = true;
      return;
    }
    shouldAnimateRowPositionsRef.current = true;
  }, [sorting, activeFilterSignature]);

  useEffect(() => {
    rowTopByIdRef.current.clear();
    rowRefs.current.clear();
    shouldAnimateRowPositionsRef.current = false;
  }, [activeTableId]);

  useEffect(() => {
    console.log("[DEBUG] activeFilterSignature changed, clearing grid selection state");
    clearGridSelectionState();
  }, [activeFilterSignature, clearGridSelectionState]);

  const baseAccentSoft = toRgba(baseAccent, 0.14);
  const baseAccentHover = adjustColor(baseAccent, -14);
  const baseAccentContrast = getContrastColor(baseAccent);
  const activeTableName = activeTable?.name.trim() ?? "Tables";

  useEffect(() => {
    initialDocumentTitleRef.current ??= document.title;

    const nextBaseName = normalizeBaseName(baseName);
    document.title = `${nextBaseName}: ${activeTableName}`;

    const dynamicFaviconSelector = 'link[data-dynamic-base-favicon="true"]';
    let dynamicFavicon = document.querySelector<HTMLLinkElement>(dynamicFaviconSelector);
    if (!dynamicFavicon) {
      dynamicFavicon = document.createElement("link");
      dynamicFavicon.rel = "icon";
      dynamicFavicon.type = "image/svg+xml";
      dynamicFavicon.dataset.dynamicBaseFavicon = "true";
      document.head.appendChild(dynamicFavicon);
    }
    dynamicFavicon.href = createBaseFaviconDataUrl(
      nextBaseName,
      baseAccent,
      baseAccentContrast,
    );
  }, [baseName, activeTableName, baseAccent, baseAccentContrast]);

  useEffect(() => {
    return () => {
      const dynamicFavicon = document.querySelector<HTMLLinkElement>(
        'link[data-dynamic-base-favicon="true"]',
      );
      dynamicFavicon?.remove();
      if (initialDocumentTitleRef.current) {
        document.title = initialDocumentTitleRef.current;
      }
    };
  }, []);

  const updateActiveTable = useCallback(
    (updater: (table: TableDefinition) => TableDefinition) => {
      setTables((prev) =>
        prev.map((table) =>
          table.id === activeTableId ? updater(table) : table,
        ),
      );
    },
    [activeTableId],
  );

  const updateActiveTableData = useCallback(
    (updater: (rows: Array<TableRow | undefined>) => Array<TableRow | undefined>) => {
      updateActiveTable((table) => ({ ...table, data: updater(table.data) }));
    },
    [updateActiveTable],
  );

  const resolveServerRowId = useCallback((rowId: string | null | undefined) => {
    if (!rowId) return null;
    if (isServerRowId(rowId)) return getServerIdFromRowId(rowId);
    return optimisticRowIdToRealIdRef.current.get(rowId) ?? null;
  }, []);

  const setDirtyCellOverride = useCallback(
    (rowId: string, columnId: string, value: string) => {
      const byColumn = dirtyCellOverridesRef.current.get(rowId) ?? new Map<string, string>();
      byColumn.set(columnId, value);
      dirtyCellOverridesRef.current.set(rowId, byColumn);
    },
    [],
  );

  const clearDirtyCellOverride = useCallback((rowId: string, columnId: string) => {
    const byColumn = dirtyCellOverridesRef.current.get(rowId);
    if (!byColumn) return;
    byColumn.delete(columnId);
    if (byColumn.size === 0) {
      dirtyCellOverridesRef.current.delete(rowId);
    }
  }, []);

  const resolveDirtyOverridesForRow = useCallback(
    (optimisticRowId: string, realRowId: string) => {
      const overrides = dirtyCellOverridesRef.current.get(optimisticRowId);
      if (!overrides) return;
      dirtyCellOverridesRef.current.delete(optimisticRowId);
      const existing = dirtyCellOverridesRef.current.get(realRowId);
      if (existing) {
        overrides.forEach((value, columnId) => {
          existing.set(columnId, value);
        });
        dirtyCellOverridesRef.current.set(realRowId, existing);
        return;
      }
      dirtyCellOverridesRef.current.set(realRowId, overrides);
    },
    [],
  );

  const resolveDirtyOverridesForColumn = useCallback(
    (optimisticColumnId: string, realColumnId: string) => {
      dirtyCellOverridesRef.current.forEach((byColumn, rowId) => {
        if (!byColumn.has(optimisticColumnId)) return;
        const value = byColumn.get(optimisticColumnId);
        byColumn.delete(optimisticColumnId);
        if (value !== undefined) {
          byColumn.set(realColumnId, value);
        }
        if (byColumn.size === 0) {
          dirtyCellOverridesRef.current.delete(rowId);
        }
      });
    },
    [],
  );

  useEffect(() => {
    setColumnSizing({});
    lastRowMapFieldsCountRef.current = 0;
  }, [activeTableId]);

  useEffect(() => {
    if (!activeTableId || !activeTableBootstrapQuery.data) return;
    const nextPersisted = new Map<string, number>();
    activeTableBootstrapQuery.data.columns.forEach((column) => {
      if (!isUuid(column.id)) return;
      if (typeof column.size === "number") {
        nextPersisted.set(column.id, column.size);
      }
    });
    lastPersistedColumnSizesRef.current = nextPersisted;
  }, [activeTableId, activeTableBootstrapQuery.data]);

  useEffect(() => {
    if (!activeTableId) return;
    if (columnSizeSaveTimeoutRef.current) {
      window.clearTimeout(columnSizeSaveTimeoutRef.current);
    }

    const entries = Object.entries(columnSizing);
    if (entries.length === 0) return;

    columnSizeSaveTimeoutRef.current = window.setTimeout(() => {
      const updates: Array<{ id: string; size: number }> = [];
      const persistedSizes = lastPersistedColumnSizesRef.current;

      entries.forEach(([columnId, size]) => {
        if (!isUuid(columnId)) return;
        if (!Number.isFinite(size)) return;
        const nextSize = Math.max(1, Math.round(size));
        if (persistedSizes.get(columnId) === nextSize) return;
        updates.push({ id: columnId, size: nextSize });
      });

      if (updates.length === 0) return;

      updateActiveTable((table) => {
        let didChange = false;
        const nextFields = table.fields.map((field) => {
          const update = updates.find((entry) => entry.id === field.id);
          if (!update || field.size === update.size) return field;
          didChange = true;
          return { ...field, size: update.size };
        });
        return didChange ? { ...table, fields: nextFields } : table;
      });

      updates.forEach(({ id, size }) => {
        persistedSizes.set(id, size);
        void updateColumnMutation.mutateAsync({ id, size }).catch(() => {
          // Ignore resize persistence errors.
        });
      });
    }, 250);

    return () => {
      if (columnSizeSaveTimeoutRef.current) {
        window.clearTimeout(columnSizeSaveTimeoutRef.current);
      }
    };
  }, [activeTableId, columnSizing, updateActiveTable, updateColumnMutation]);

  const applyLocalCellPatches = useCallback(
    (patchesByRowIndex: Map<number, Record<string, string>>) => {
      if (patchesByRowIndex.size <= 0) return;
      patchesByRowIndex.forEach((rowPatch, rowIndex) => {
        const row = activeTable?.data[rowIndex];
        if (!row) return;
        Object.entries(rowPatch).forEach(([columnId, value]) => {
          setDirtyCellOverride(row.id, columnId, value);
        });
      });
      updateActiveTableData((prevRows) =>
        prevRows.map((row, rowIndex) => {
          const rowPatch = patchesByRowIndex.get(rowIndex);
          if (!rowPatch || !row) return row;
          return { ...row, ...rowPatch };
        }),
      );
    },
    [activeTable?.data, setDirtyCellOverride, updateActiveTableData],
  );

  const queueOptimisticRowCellUpdate = useCallback(
    (optimisticRowId: string, columnId: string, value: string) => {
      const queuedByColumnId =
        optimisticRowCellUpdatesRef.current.get(optimisticRowId) ?? new Map<string, string>();
      queuedByColumnId.set(columnId, value);
      optimisticRowCellUpdatesRef.current.set(optimisticRowId, queuedByColumnId);
    },
    [],
  );

  const consumeOptimisticRowCellUpdates = useCallback((optimisticRowId: string) => {
    const queuedByColumnId = optimisticRowCellUpdatesRef.current.get(optimisticRowId);
    if (!queuedByColumnId) return new Map<string, string>();
    optimisticRowCellUpdatesRef.current.delete(optimisticRowId);
    return queuedByColumnId;
  }, []);

  const clearOptimisticRowCellUpdates = useCallback((optimisticRowId: string) => {
    optimisticRowCellUpdatesRef.current.delete(optimisticRowId);
  }, []);

  const commitBulkCellUpdates = useCallback(
    (
      tableId: string,
      updates: Array<{ rowId: string; columnId: string; value: string }>,
    ) => {
      if (updates.length <= 0) return;
      const dedupedByCell = new Map<
        string,
        { rowId: string; columnId: string; value: string }
      >();
      updates.forEach((update) => {
        dedupedByCell.set(`${update.rowId}:${update.columnId}`, update);
      });
      const dedupedUpdates = Array.from(dedupedByCell.values());
      if (dedupedUpdates.length <= 0) return;
      const serverUpdates: Array<{
        uiRowId: string;
        rowId: string;
        columnId: string;
        value: string;
      }> = [];
      dedupedUpdates.forEach((update) => {
        setDirtyCellOverride(update.rowId, update.columnId, update.value);
        const serverRowId = resolveServerRowId(update.rowId);
        if (!serverRowId) {
          queueOptimisticRowCellUpdate(update.rowId, update.columnId, update.value);
          return;
        }
        serverUpdates.push({
          uiRowId: update.rowId,
          rowId: serverRowId,
          columnId: update.columnId,
          value: update.value,
        });
      });

      if (serverUpdates.length <= 0) return;

      for (
        let startIndex = 0;
        startIndex < serverUpdates.length;
        startIndex += BULK_CELL_UPDATE_BATCH_SIZE
      ) {
        const updatesChunk = serverUpdates.slice(
          startIndex,
          startIndex + BULK_CELL_UPDATE_BATCH_SIZE,
        );
        bulkUpdateCellsMutation.mutate(
          {
            tableId,
            updates: updatesChunk.map(({ rowId, columnId, value }) => ({
              rowId,
              columnId,
              value,
            })),
          },
          {
            onSuccess: () => {
              updatesChunk.forEach((update) => {
                clearDirtyCellOverride(update.uiRowId, update.columnId);
              });
            },
            onError: () => {
              void utils.rows.listByTableId.invalidate({ tableId });
            },
          },
        );
      }
    },
    [
      bulkUpdateCellsMutation,
      clearDirtyCellOverride,
      queueOptimisticRowCellUpdate,
      resolveServerRowId,
      setDirtyCellOverride,
      utils.rows.listByTableId,
    ],
  );

  const queueOptimisticColumnCellUpdate = useCallback(
    (tableId: string, rowId: string, optimisticColumnId: string, value: string) => {
      const queueKey = `${tableId}:${optimisticColumnId}`;
      const queuedByRowId =
        optimisticColumnCellUpdatesRef.current.get(queueKey) ?? new Map<string, string>();
      queuedByRowId.set(rowId, value);
      optimisticColumnCellUpdatesRef.current.set(queueKey, queuedByRowId);
    },
    [],
  );

  const consumeOptimisticColumnCellUpdates = useCallback(
    (tableId: string, optimisticColumnId: string) => {
      const queueKey = `${tableId}:${optimisticColumnId}`;
      const queuedByRowId = optimisticColumnCellUpdatesRef.current.get(queueKey);
      if (!queuedByRowId) return new Map<string, string>();
      optimisticColumnCellUpdatesRef.current.delete(queueKey);
      return queuedByRowId;
    },
    [],
  );

  const clearOptimisticColumnCellUpdates = useCallback(
    (tableId: string, optimisticColumnId: string) => {
      optimisticColumnCellUpdatesRef.current.delete(`${tableId}:${optimisticColumnId}`);
    },
    [],
  );

  const resolveOptimisticRowId = useCallback(
    (optimisticRowId: string, realRowId: string) => {
      optimisticRowIdToRealIdRef.current.set(optimisticRowId, realRowId);
    },
    [],
  );

  const suspendTableServerSync = useCallback((tableId: string) => {
    const currentCount = suspendedServerSyncByTableRef.current.get(tableId) ?? 0;
    suspendedServerSyncByTableRef.current.set(tableId, currentCount + 1);
  }, []);

  const resumeTableServerSync = useCallback((tableId: string) => {
    const currentCount = suspendedServerSyncByTableRef.current.get(tableId) ?? 0;
    if (currentCount <= 1) {
      suspendedServerSyncByTableRef.current.delete(tableId);
      return;
    }
    suspendedServerSyncByTableRef.current.set(tableId, currentCount - 1);
  }, []);

  const addPendingRowDeletion = useCallback((tableId: string, rowId: string) => {
    setPendingDeletedRowIdsByTable((prev) => {
      const next = new Map(prev);
      const existing = next.get(tableId);
      const nextSet = new Set(existing ?? []);
      nextSet.add(rowId);
      next.set(tableId, nextSet);
      return next;
    });
  }, []);

  const removePendingRowDeletion = useCallback((tableId: string, rowId: string) => {
    setPendingDeletedRowIdsByTable((prev) => {
      const existing = prev.get(tableId);
      if (!existing?.has(rowId)) return prev;
      const next = new Map(prev);
      const nextSet = new Set(existing);
      nextSet.delete(rowId);
      if (nextSet.size === 0) {
        next.delete(tableId);
      } else {
        next.set(tableId, nextSet);
      }
      return next;
    });
  }, []);

  const queuePendingRelativeInsert = useCallback(
    (anchorRowId: string, pending: PendingRelativeInsert) => {
      const existing = pendingRelativeInsertsRef.current.get(anchorRowId);
      if (existing) {
        existing.push(pending);
        return;
      }
      pendingRelativeInsertsRef.current.set(anchorRowId, [pending]);
    },
    [],
  );

  const clearPendingRelativeInsertsForAnchor = useCallback(
    (anchorRowId: string) => {
      const pending = pendingRelativeInsertsRef.current.get(anchorRowId);
      if (!pending || pending.length === 0) return;
      pendingRelativeInsertsRef.current.delete(anchorRowId);

      pending.forEach((entry) => {
        const { tableId, optimisticRowId } = entry;
        clearOptimisticRowCellUpdates(optimisticRowId);
        updateTableById(tableId, (table) => {
          const index = table.data.findIndex((row) => row?.id === optimisticRowId);
          if (index !== -1) {
            applyRowDeletionToRowStore(index);
          }
          return {
            ...table,
            data: removeRowByIdFromData(table.data, optimisticRowId),
          };
        });
        resumeTableServerSync(tableId);
        clearPendingRelativeInsertsForAnchor(optimisticRowId);
      });
    },
    [
      applyRowDeletionToRowStore,
      clearOptimisticRowCellUpdates,
      removeRowByIdFromData,
      resumeTableServerSync,
      updateTableById,
    ],
  );

  const flushPendingRelativeInserts = useCallback(
    async (anchorOptimisticId: string, realAnchorId: string) => {
      const pending = pendingRelativeInsertsRef.current.get(anchorOptimisticId);
      if (!pending || pending.length === 0) return;
      pendingRelativeInsertsRef.current.delete(anchorOptimisticId);

      for (const entry of pending) {
        const { tableId, position, cells, optimisticRowId, fieldsSnapshot } = entry;
        try {
          const createdRow = await insertRelativeRowMutation.mutateAsync({
            anchorRowId: realAnchorId,
            position,
            cells,
          });
          if (!createdRow?.id) {
            resumeTableServerSync(tableId);
            continue;
          }
          const createdRowId = createdRow.id;
          optimisticRowIdToRealIdRef.current.set(optimisticRowId, createdRowId);
          resolveOptimisticRowId(optimisticRowId, createdRowId);
          const nextRow: TableRow = { id: optimisticRowId, serverId: createdRowId };
          const createdCells = (createdRow.cells ?? {}) as Record<string, unknown>;
          fieldsSnapshot.forEach((field) => {
            const value = createdCells[field.id];
            nextRow[field.id] = toCellText(value, field.defaultValue);
          });
          const queuedUpdates = consumeOptimisticRowCellUpdates(optimisticRowId);
          queuedUpdates.forEach((value, columnId) => {
            nextRow[columnId] = value;
          });
          updateTableById(tableId, (table) => ({
            ...table,
            data: (() => {
              const nextData = table.data.map((row) =>
                row?.id === optimisticRowId ? nextRow : row,
              );
              const firstIndex = nextData.findIndex((row) => row?.id === nextRow.id);
              if (firstIndex !== -1) {
                for (let index = 0; index < nextData.length; index += 1) {
                  if (index !== firstIndex && nextData[index]?.id === nextRow.id) {
                    nextData[index] = undefined;
                  }
                }
              }
              return nextData;
            })(),
          }));
          if (queuedUpdates.size > 0) {
            commitBulkCellUpdates(
              tableId,
              Array.from(queuedUpdates.entries()).map(([columnId, value]) => ({
                rowId: optimisticRowId,
                columnId,
                value,
              })),
            );
          }
          await flushPendingRelativeInserts(optimisticRowId, createdRowId);
        } catch {
          clearOptimisticRowCellUpdates(optimisticRowId);
          clearPendingRelativeInsertsForAnchor(optimisticRowId);
          updateTableById(tableId, (table) => {
            const index = table.data.findIndex((row) => row?.id === optimisticRowId);
            if (index !== -1) {
              applyRowDeletionToRowStore(index);
            }
            return {
              ...table,
              data: removeRowByIdFromData(table.data, optimisticRowId),
            };
          });
        } finally {
          void utils.rows.listByTableId.invalidate({ tableId });
          resumeTableServerSync(tableId);
        }
      }
    },
    [
      applyRowDeletionToRowStore,
      clearPendingRelativeInsertsForAnchor,
      clearOptimisticRowCellUpdates,
      commitBulkCellUpdates,
      consumeOptimisticRowCellUpdates,
      insertRelativeRowMutation,
      removeRowByIdFromData,
      resumeTableServerSync,
      resolveOptimisticRowId,
      updateTableById,
      utils.rows.listByTableId,
    ],
  );

  const createTableWithDefaultSchema = useCallback(
    async (name: string, seedRows: boolean, seedMode: SeedRowsMode = "faker") => {
      if (!resolvedBaseId) return null;

      const createdTable = await createTableMutation.mutateAsync({
        baseId: resolvedBaseId,
        name,
      });
      if (!createdTable) return null;

      const baseTable: TableDefinition = {
        id: createdTable.id,
        name: createdTable.name,
        fields: [],
        columnVisibility: {},
        data: [],
        nextRowId: 1,
      };

      // Render the table tab immediately, then hydrate schema/data in the background.
      setTables((prev) => [...prev, baseTable]);
      setHiddenTableIds((prev) => prev.filter((id) => id !== createdTable.id));
      setActiveTableId(createdTable.id);

      try {
        const createdColumns = await createColumnsBulkMutation.mutateAsync({
          tableId: createdTable.id,
          columns: DEFAULT_TABLE_FIELDS.map((field) => ({
            name: field.label,
            type: mapFieldKindToDbType(field.kind),
            size: field.size,
          })),
        });

        let createdRows: Array<{ id: string; cells: Record<string, unknown> }> = [];
        if (seedRows) {
          const columnIdByLegacyId = new Map<string, string>();
          DEFAULT_TABLE_FIELDS.forEach((field, index) => {
            const createdColumn = createdColumns[index];
            if (createdColumn) {
              columnIdByLegacyId.set(field.id, createdColumn.id);
            }
          });

          const seedRowsToUse =
            seedMode === "singleBlank" ? [createSingleBlankRow()] : createDefaultRows();
          const cappedSeedRows = seedRowsToUse.slice(0, DEFAULT_TABLE_ROW_COUNT);
          const rowsToCreate = cappedSeedRows.map((rowTemplate) => {
            const cells: Record<string, string> = {};
            DEFAULT_TABLE_FIELDS.forEach((field) => {
              const columnId = columnIdByLegacyId.get(field.id);
              if (!columnId) return;
              const cellValue = rowTemplate[field.id];
              cells[columnId] = typeof cellValue === "string" ? cellValue : field.defaultValue;
            });
            return { cells };
          });

          const createdRowsResult = await createRowsBulkMutation.mutateAsync({
            tableId: createdTable.id,
            rows: rowsToCreate,
          });
          createdRows = createdRowsResult.map((row) => ({
            id: row.id,
            cells: (row.cells ?? {}) as Record<string, unknown>,
          }));
        }

        const mappedFields = createdColumns.map(mapDbColumnToField);
        const nextRows = createdRows.map((row) => {
          const uiId = createServerRowId(row.id);
          optimisticRowIdToRealIdRef.current.set(uiId, row.id);
          const nextRow: TableRow = { id: uiId, serverId: row.id };
          const cells = row.cells;
          mappedFields.forEach((field) => {
            const cellValue = cells[field.id];
            nextRow[field.id] = toCellText(cellValue, field.defaultValue);
          });
          return nextRow;
        });

        const nextTable: TableDefinition = {
          id: createdTable.id,
          name: createdTable.name,
          fields: mappedFields,
          columnVisibility: createColumnVisibility(mappedFields),
          data: nextRows,
          nextRowId: nextRows.length + 1,
        };

        setTables((prev) =>
          prev.map((table) => (table.id === createdTable.id ? nextTable : table)),
        );

        const createdTableStorePrefix = `${createdTable.id}:`;
        for (const key of rowStoreCacheRef.current.keys()) {
          if (key.startsWith(createdTableStorePrefix)) {
            rowStoreCacheRef.current.delete(key);
          }
        }

        if (nextRows.length > 0) {
          const rowsByUiId = new Map<string, TableRow>();
          const rawCellsByUiId = new Map<string, Record<string, unknown>>();
          const indexToUiId = new Map<number, string>();
          const uiIdToIndex = new Map<string, number>();

          nextRows.forEach((row, index) => {
            rowsByUiId.set(row.id, row);
            indexToUiId.set(index, row.id);
            uiIdToIndex.set(row.id, index);
          });
          createdRows.forEach((row) => {
            rawCellsByUiId.set(createServerRowId(row.id), row.cells);
          });

          const seededStore: RowWindowStore = {
            total: nextRows.length,
            rowsByUiId,
            rawCellsByUiId,
            indexToUiId,
            uiIdToIndex,
            fetchedRanges: [{ start: 0, end: nextRows.length - 1 }],
            maxLoadedIndex: nextRows.length - 1,
            hasFetchedOnce: true,
          };

          const activeStoreKey = rowStoreKeyRef.current;
          if (activeStoreKey?.startsWith(createdTableStorePrefix)) {
            rowStoreRef.current = seededStore;
            rowStoreCacheRef.current.set(activeStoreKey, seededStore);
            setRowStoreVersion((prev) => prev + 1);
          }
        }

        void Promise.all([
          utils.tables.listByBaseId.invalidate({ baseId: resolvedBaseId }),
          utils.tables.getBootstrap.invalidate({ tableId: createdTable.id }),
          utils.rows.listByTableId.invalidate({ tableId: createdTable.id }),
        ]);

        return nextTable;
      } catch {
        void Promise.all([
          utils.tables.listByBaseId.invalidate({ baseId: resolvedBaseId }),
          utils.tables.getBootstrap.invalidate({ tableId: createdTable.id }),
          utils.rows.listByTableId.invalidate({ tableId: createdTable.id }),
        ]);
        return baseTable;
      }
    },
    [
      resolvedBaseId,
      createTableMutation,
      createColumnsBulkMutation,
      createRowsBulkMutation,
      utils.tables.listByBaseId,
      utils.tables.getBootstrap,
      utils.rows.listByTableId,
    ],
  );

  useEffect(() => {
    if (!isAuthenticated) return;
    if (basesQuery.isLoading) return;
    const userBases = basesQuery.data ?? [];

    if (userBases.length === 0) {
      if (hasAutoCreatedBaseRef.current || createBaseMutation.isPending) return;
      hasAutoCreatedBaseRef.current = true;
      createBaseMutation.mutate(
        { name: DEFAULT_BASE_NAME },
        {
          onSuccess: (base) => {
            if (!base) {
              hasAutoCreatedBaseRef.current = false;
              return;
            }
            // Don't reset ref here - let the userBases.length > 0 check below handle it
            // to avoid race conditions where ref resets before query refetches
            lastLoadedBaseIdRef.current = base.id;
            lastSyncedBaseNameRef.current = base.name;
            isBaseNameDirtyRef.current = false;
            baseNameSaveRequestIdRef.current += 1;
            setBaseName(base.name);
            setResolvedBaseId(base.id);
            router.replace(`/bases/${base.id}/tables`);
            void utils.bases.list.invalidate();
          },
          onError: () => {
            hasAutoCreatedBaseRef.current = false;
          },
        },
      );
      return;
    }

    // Reset the auto-create flag once we have bases (prevents stale ref after creation)
    hasAutoCreatedBaseRef.current = false;

    const requestedBaseId = isUuid(routeBaseId) ? routeBaseId : null;
    const matchedBase = requestedBaseId
      ? userBases.find((base) => base.id === requestedBaseId)
      : null;
    const nextBase = matchedBase ?? userBases[0];
    if (!nextBase) return;

    if (resolvedBaseId !== nextBase.id) {
      setResolvedBaseId(nextBase.id);
    }
    if (routeBaseId !== nextBase.id) {
      router.replace(`/bases/${nextBase.id}/tables`);
    }
  }, [
    isAuthenticated,
    basesQuery.isLoading,
    basesQuery.data,
    createBaseMutation,
    routeBaseId,
    resolvedBaseId,
    router,
    utils.bases.list,
  ]);

  useEffect(() => {
    if (!activeBase) return;
    const isBaseSwitch = lastLoadedBaseIdRef.current !== activeBase.id;
    if (isBaseSwitch) {
      lastLoadedBaseIdRef.current = activeBase.id;
      lastSyncedBaseNameRef.current = activeBase.name;
      isBaseNameDirtyRef.current = false;
      baseNameSaveRequestIdRef.current += 1;
      setBaseName(activeBase.name);
      return;
    }

    if (!isBaseMenuOpen && !isBaseNameDirtyRef.current && baseName !== activeBase.name) {
      lastSyncedBaseNameRef.current = activeBase.name;
      setBaseName(activeBase.name);
    }
  }, [activeBase, baseName, isBaseMenuOpen]);

  useEffect(() => {
    if (!resolvedBaseId || !activeBase) return;
    if (!isBaseNameDirtyRef.current) return;
    if (lastLoadedBaseIdRef.current !== resolvedBaseId) return;

    const normalizedBaseName = normalizeBaseName(baseName);
    if (normalizedBaseName === lastSyncedBaseNameRef.current) {
      isBaseNameDirtyRef.current = false;
      if (baseName !== normalizedBaseName) {
        setBaseName(normalizedBaseName);
      }
      return;
    }

    const requestId = baseNameSaveRequestIdRef.current + 1;
    baseNameSaveRequestIdRef.current = requestId;

    const timeoutId = window.setTimeout(() => {
      void updateBaseMutation
        .mutateAsync({ id: resolvedBaseId, name: normalizedBaseName })
        .then((updatedBase) => {
          if (!updatedBase || baseNameSaveRequestIdRef.current !== requestId) return;
          lastSyncedBaseNameRef.current = updatedBase.name;
          isBaseNameDirtyRef.current = false;
          setBaseName(updatedBase.name);
          void utils.bases.list.invalidate();
        })
        .catch(() => {
          if (baseNameSaveRequestIdRef.current === requestId) {
            isBaseNameDirtyRef.current = true;
          }
        });
    }, BASE_NAME_SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeBase, baseName, resolvedBaseId, updateBaseMutation, utils.bases.list]);

  const handleBaseAccentSelect = useCallback(
    (color: string) => {
      if (!resolvedBaseId) return;
      setBaseAccent(color);
      void updateBaseMutation
        .mutateAsync({ id: resolvedBaseId, accent: color })
        .then(() => {
          void utils.bases.list.invalidate();
        })
        .catch(() => {
          // Ignore accent update errors to keep the UI responsive.
        });
    },
    [resolvedBaseId, updateBaseMutation, utils.bases.list],
  );

  useEffect(() => {
    if (!tablesQuery.data) return;
    const visibleData = tablesQuery.data.filter(
      (dbTable) => !pendingDeletedTableIds.has(dbTable.id),
    );
    setTables((prev) => {
      const prevById = new Map(prev.map((table) => [table.id, table]));
      return visibleData.map((dbTable) => {
        const existing = prevById.get(dbTable.id);
        if (existing) {
          return {
            ...existing,
            name: dbTable.name,
          };
        }
        const newTable: TableDefinition = {
          id: dbTable.id,
          name: dbTable.name,
          data: [],
          fields: [],
          columnVisibility: {},
          nextRowId: 1,
        };
        // If the row store already has data for this table (row fetch completed
        // before tablesQuery.data arrived), hydrate immediately to avoid showing
        // empty rows.
        const store = rowStoreRef.current;
        const storeTableId = rowStoreKeyRef.current?.split(":")[0];
        if (
          store &&
          storeTableId === dbTable.id &&
          store.maxLoadedIndex >= 0 &&
          store.indexToUiId.size > 0
        ) {
          return buildTableDataFromRowStore(newTable, store);
        }
        return newTable;
      });
    });
  }, [tablesQuery.data, pendingDeletedTableIds]);

  useEffect(() => {
    setHiddenTableIds((prev) => {
      const existingIds = new Set(tables.map((table) => table.id));
      const next = prev.filter((tableId) => existingIds.has(tableId));
      return next.length === prev.length ? prev : next;
    });
  }, [tables]);

  useEffect(() => {
    if (pendingDeletedTableIds.size === 0) return;
    if (!tablesQuery.data) return;
    const existingIds = new Set(tablesQuery.data.map((table) => table.id));
    setPendingDeletedTableIds((prev) => {
      const next = new Set(
        Array.from(prev).filter((tableId) => existingIds.has(tableId)),
      );
      return next.size === prev.size ? prev : next;
    });
  }, [tablesQuery.data, pendingDeletedTableIds.size]);

  // Persist active table ID to localStorage
  useEffect(() => {
    if (!resolvedBaseId || !activeTableId) return;
    try {
      window.localStorage.setItem(
        `airtable-clone.activeTableId.${resolvedBaseId}`,
        activeTableId,
      );
    } catch {
      // Ignore localStorage errors
    }
  }, [resolvedBaseId, activeTableId]);

  // Restore active table ID from localStorage on initial load
  useEffect(() => {
    if (!resolvedBaseId || !tables.length) return;
    // Only restore if we don't have an active table yet
    if (activeTableId) return;
    try {
      const storedTableId = window.localStorage.getItem(
        `airtable-clone.activeTableId.${resolvedBaseId}`,
      );
      if (storedTableId && tables.some((t) => t.id === storedTableId)) {
        setActiveTableId(storedTableId);
        return;
      }
    } catch {
      // Ignore localStorage errors
    }
    // Fallback to first visible table
    setActiveTableId(visibleTables[0]?.id ?? tables[0]?.id ?? "");
  }, [resolvedBaseId, tables, visibleTables, activeTableId]);

  // Persist active view ID per table
  useEffect(() => {
    if (!resolvedBaseId || !activeTableId || !activeViewId) return;
    try {
      window.localStorage.setItem(
        `airtable-clone.activeViewId.${resolvedBaseId}.${activeTableId}`,
        activeViewId,
      );
    } catch {
      // Ignore localStorage errors
    }
  }, [resolvedBaseId, activeTableId, activeViewId]);

  // Restore active view ID from localStorage when table views load
  useEffect(() => {
    if (!resolvedBaseId || !activeTableId || !tableViews.length) return;
    if (activeViewId) return;
    try {
      const storedViewId = window.localStorage.getItem(
        `airtable-clone.activeViewId.${resolvedBaseId}.${activeTableId}`,
      );
      if (storedViewId && tableViews.some((view) => view.id === storedViewId)) {
        setActiveViewId(storedViewId);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [resolvedBaseId, activeTableId, tableViews, activeViewId]);

  useEffect(() => {
    // Don't clear activeTableId while tables are still loading - preserve early ID for parallel queries
    if (!tables.length) {
      if (activeTableId && !tablesQuery.isLoading) setActiveTableId("");
      return;
    }
    if (!activeTableId) return;
    const activeIsVisible = visibleTables.some((table) => table.id === activeTableId);
    if (!activeIsVisible) {
      setActiveTableId(visibleTables[0]?.id ?? tables[0]?.id ?? "");
    }
  }, [tables, visibleTables, activeTableId, tablesQuery.isLoading]);

  useEffect(() => {
    if (!activeTableId) {
      if (activeViewId) setActiveViewId(null);
      return;
    }
    if (tableViews.length === 0) {
      if (activeViewId) setActiveViewId(null);
      return;
    }
    const activeStillExists = activeViewId
      ? tableViews.some((view) => view.id === activeViewId)
      : false;
    if (!activeStillExists) {
      setActiveViewId(tableViews[0]?.id ?? null);
    }
  }, [activeTableId, tableViews, activeViewId]);

  // Clear cell selection when table changes
  const prevActiveTableIdRef = useRef(activeTableId);
  useEffect(() => {
    if (prevActiveTableIdRef.current !== activeTableId) {
      clearGridSelectionState();
      prevActiveTableIdRef.current = activeTableId;
    }
  }, [activeTableId, clearGridSelectionState]);

  // Clear highlighted cells when switching views in the same table.
  const prevActiveViewIdRef = useRef(activeViewId);
  const activeViewIdRef = useRef(activeViewId);
  useEffect(() => {
    if (prevActiveViewIdRef.current !== activeViewId) {
      clearGridSelectionState();
      prevActiveViewIdRef.current = activeViewId;
    }
    activeViewIdRef.current = activeViewId;
  }, [activeViewId, clearGridSelectionState]);

  useEffect(() => {
    // Wait for bootstrap data to be loaded before deciding whether to create initial view
    if (!activeTableId || activeTableBootstrapQuery.isLoading || !activeTableBootstrapQuery.data) return;
    if (tableViews.length > 0) return;
    if (AUTO_CREATED_INITIAL_VIEW_TABLE_IDS.has(activeTableId)) return;
    AUTO_CREATED_INITIAL_VIEW_TABLE_IDS.add(activeTableId);
    const tableId = activeTableId;
    createViewMutation.mutate(
      {
        tableId,
        name: DEFAULT_GRID_VIEW_NAME,
        filters: { [VIEW_KIND_FILTER_KEY]: "grid" as SidebarViewKind },
      },
      {
        onSuccess: (createdView) => {
          if (!createdView) return;
          setActiveViewId(createdView.id);
          setViewName(createdView.name);
          void utils.tables.getBootstrap.invalidate({ tableId });
        },
        onError: () => {
          AUTO_CREATED_INITIAL_VIEW_TABLE_IDS.delete(tableId);
        },
      },
    );
  }, [
    activeTableId,
    tableViews.length,
    activeTableBootstrapQuery.isLoading,
    activeTableBootstrapQuery.data,
    createViewMutation,
    utils.tables.getBootstrap,
  ]);

  useEffect(() => {
    if (isEditingViewName) return;
    setViewName(activeView?.name ?? DEFAULT_GRID_VIEW_NAME);
  }, [activeView, isEditingViewName]);

  useEffect(() => {
    if (!activeViewId) return;
    const currentState: ViewScopedState = {
      searchQuery,
      sorting: cloneSortingState(sorting),
      filterGroups: cloneFilterGroups(filterGroups),
      hiddenFieldIds: [...hiddenFieldIds],
    };
    setViewStateById((prev) => {
      if (areViewScopedStatesEqual(prev[activeViewId], currentState)) return prev;
      return {
        ...prev,
        [activeViewId]: currentState,
      };
    });
  }, [activeViewId, searchQuery, sorting, filterGroups, hiddenFieldIds]);

  useEffect(() => {
    if (!resolvedBaseId || !activeTableId || !activeViewId) return;
    const currentState = viewStateById[activeViewId];
    if (!currentState) return;
    try {
      window.localStorage.setItem(
        `airtable-clone.viewState.${resolvedBaseId}.${activeTableId}.${activeViewId}`,
        JSON.stringify(currentState),
      );
    } catch {
      // Ignore localStorage errors
    }
  }, [resolvedBaseId, activeTableId, activeViewId, viewStateById]);

  useEffect(() => {
    if (!activeViewId || !activeView || !activeTableId) {
      lastAppliedViewIdRef.current = activeViewId ?? null;
      return;
    }
    if (activeView.id !== activeViewId) return;

    const previousViewId = lastAppliedViewIdRef.current;
    if (previousViewId === activeViewId) return;

    let storedState: ViewScopedState | null = null;
    try {
      const storedValue = window.localStorage.getItem(
        `airtable-clone.viewState.${resolvedBaseId}.${activeTableId}.${activeViewId}`,
      );
      if (storedValue) {
        storedState = JSON.parse(storedValue) as ViewScopedState;
      }
    } catch {
      // Ignore localStorage errors
    }

    const nextState =
      viewStateById[activeViewId] ?? storedState ?? parseViewScopedStateFromFilters(activeView.filters);
    setSearchQuery(nextState.searchQuery);
    setSearchInputValue(nextState.searchQuery);
    setSorting(cloneSortingState(nextState.sorting));
    setFilterGroups(cloneFilterGroups(nextState.filterGroups));

    const nextHiddenFieldIdSet = new Set(nextState.hiddenFieldIds);
    updateTableById(activeTableId, (table) => ({
      ...table,
      columnVisibility: Object.fromEntries(
        table.fields.map((field) => [field.id, !nextHiddenFieldIdSet.has(field.id)]),
      ),
    }));

    setViewStateById((prev) =>
      prev[activeViewId]
        ? prev
        : {
            ...prev,
            [activeViewId]: nextState,
          },
    );

    lastAppliedViewIdRef.current = activeViewId;
  }, [
    activeViewId,
    activeView,
    activeTableId,
    viewStateById,
    updateTableById,
  ]);

  // Auto-save view settings to database with debounce
  useEffect(() => {
    if (!activeViewId || !activeView) return;
    if (!isUuid(activeViewId)) return;
    if (activeView.id !== activeViewId) return;

    // Skip if this is the initial load (view was just applied from DB)
    if (lastAppliedViewIdRef.current !== activeViewId) return;

    const currentState = viewStateById[activeViewId];
    if (!currentState) return;

    // Convert filterGroups to the format expected by the API
    const filtersForApi = currentState.filterGroups;
    const firstSortRule = currentState.sorting[0];
    const sortForApi =
      firstSortRule && isUuid(firstSortRule.id)
        ? {
            columnId: firstSortRule.id,
            direction: firstSortRule.desc ? "desc" : "asc",
          }
        : null;
    const hiddenColumnIdsForApi = currentState.hiddenFieldIds.filter(isUuid);
    const signature = JSON.stringify({
      filters: filtersForApi,
      sort: sortForApi,
      hiddenColumnIds: hiddenColumnIdsForApi,
      searchQuery: currentState.searchQuery || null,
    });

    if (!lastPersistedViewStateByIdRef.current.has(activeViewId)) {
      lastPersistedViewStateByIdRef.current.set(activeViewId, signature);
      return;
    }

    if (lastPersistedViewStateByIdRef.current.get(activeViewId) === signature) {
      return;
    }

    if (pendingViewStateSignatureByIdRef.current.get(activeViewId) === signature) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      pendingViewStateSignatureByIdRef.current.set(activeViewId, signature);
      updateViewMutation.mutate(
        {
          id: activeViewId,
          filters: filtersForApi,
          sort: sortForApi,
          hiddenColumnIds: hiddenColumnIdsForApi,
          searchQuery: currentState.searchQuery || null,
        },
        {
          onSuccess: () => {
            lastPersistedViewStateByIdRef.current.set(activeViewId, signature);
            pendingViewStateSignatureByIdRef.current.delete(activeViewId);
          },
          onError: () => {
            pendingViewStateSignatureByIdRef.current.delete(activeViewId);
          },
        },
      );
    }, 500); // 500ms debounce

    return () => window.clearTimeout(timeoutId);
  }, [activeViewId, activeView, viewStateById, updateViewMutation]);

  // Favorites and view order are now DB-backed, so localStorage effects removed

  useEffect(() => {
    if (!sidebarViewContextMenu) return;
    const stillExists = tableViews.some(
      (view) => view.id === sidebarViewContextMenu.viewId,
    );
    if (!stillExists) {
      setSidebarViewContextMenu(null);
    }
  }, [sidebarViewContextMenu, tableViews]);

  useEffect(() => {
    // Only run once when the component mounts and query finishes loading
    if (!resolvedBaseId) return;
    if (tablesQuery.isLoading || tablesQuery.isFetching) return;
    if (!tablesQuery.data) return; // Wait for data to be loaded

    // Check if tables already exist - if so, never auto-create
    const tableCount = tablesQuery.data.length;
    if (tableCount > 0) {
      hasAutoCreatedInitialTableRef.current = true; // Mark as "already handled" even if we didn't create
      return;
    }

    // Additional safeguard: check if we're already creating or have already created
    if (hasAutoCreatedInitialTableRef.current || createTableMutation.isPending) return;

    // Create the initial table
    hasAutoCreatedInitialTableRef.current = true;
    void createTableWithDefaultSchema("Table 1", true).catch(() => {
      hasAutoCreatedInitialTableRef.current = false;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedBaseId, tablesQuery.isLoading]); // Minimal dependencies - only run when baseId or loading state changes

  useEffect(() => {
    if (!activeTableId || !activeTableBootstrapQuery.data) return;
    if (activeTableBootstrapQuery.isLoading || activeTableBootstrapQuery.isFetching) return;

    setTables((prev) =>
      prev.map((table) => {
        if (table.id !== activeTableId) return table;
        if (table.fields.some((field) => !isUuid(field.id))) {
          // Keep optimistic columns/cells local until real column ids are returned.
          return table;
        }
        if ((suspendedServerSyncByTableRef.current.get(table.id) ?? 0) > 0) {
          // Preserve local edits while post-create column persistence finishes.
          return table;
        }
        const existingFieldById = new Map(table.fields.map((field) => [field.id, field]));
        const mappedFields = activeTableColumns.map((column) => {
          const mappedField = mapDbColumnToField(column);
          const existingField = existingFieldById.get(mappedField.id);
          if (!existingField) return mappedField;
          return {
            ...existingField,
            label: mappedField.label,
            kind: mappedField.kind,
            size: mappedField.size,
            numberConfig: existingField.numberConfig ?? mappedField.numberConfig,
            description: existingField.description ?? mappedField.description,
          };
        });

        const nextVisibility = mappedFields.reduce<Record<string, boolean>>(
          (acc, field) => {
            acc[field.id] = table.columnVisibility[field.id] ?? true;
            return acc;
          },
          {},
        );

        const nextRowId = Math.max(activeTableTotalRows, table.data.length) + 1;
        const sameFieldStructure =
          table.fields.length === mappedFields.length &&
          table.fields.every((field, index) => {
            const nextField = mappedFields[index];
            if (!nextField) return false;
            return (
              nextField.id === field.id &&
              nextField.label === field.label &&
              nextField.kind === field.kind
            );
          });
        const hasSameVisibility =
          Object.keys(table.columnVisibility).length === Object.keys(nextVisibility).length &&
          mappedFields.every(
            (field) => table.columnVisibility[field.id] === nextVisibility[field.id],
          );

        if (sameFieldStructure && hasSameVisibility && table.nextRowId === nextRowId) {
          return table;
        }

        return {
          ...table,
          fields: mappedFields,
          columnVisibility: nextVisibility,
          nextRowId,
        };
      }),
    );
  }, [
    activeTableId,
    activeTableBootstrapQuery.data,
    activeTableBootstrapQuery.isLoading,
    activeTableBootstrapQuery.isFetching,
    activeTableColumns,
    activeTableTotalRows,
  ]);

  useEffect(() => {
    if (!activeTableId) return;
    const previousTableId = previousTableIdRef.current;
    if (previousTableId === activeTableId) return;
    previousTableIdRef.current = activeTableId;
    previousFilterSignatureRef.current = activeFilterSignature;
    skipNextFilterClearRef.current = true;
    updateTableById(activeTableId, (table) => ({
      ...(() => {
        if (table.data.length === 0) {
          return {
            ...table,
            data: [],
            nextRowId: 1,
          };
        }
        const seen = new Set<string>();
        const nextData = table.data.map((row) => {
          if (!row) return row;
          if (seen.has(row.id)) return undefined;
          seen.add(row.id);
          return row;
        });
        return {
          ...table,
          data: nextData,
        };
      })(),
    }));
  }, [activeTableId, updateTableById, activeFilterSignature]);

  useEffect(() => {
    if (!activeTableId) return;
    const previousSignature = previousFilterSignatureRef.current;
    if (previousSignature === null) {
      previousFilterSignatureRef.current = activeFilterSignature;
      return;
    }
    if (previousSignature === activeFilterSignature) return;

    if (skipNextFilterClearRef.current) {
      skipNextFilterClearRef.current = false;
      previousFilterSignatureRef.current = activeFilterSignature;
      return;
    }

    previousFilterSignatureRef.current = activeFilterSignature;
    const store = rowStoreRef.current;
    if (store && store.maxLoadedIndex >= 0 && store.indexToUiId.size > 0) {
      updateTableById(activeTableId, (table) => buildTableDataFromRowStore(table, store));
    }
  }, [activeTableId, activeFilterSignature, buildTableDataFromRowStore, updateTableById]);

  // Safety net: if the row store has data but the active table's data array is
  // missing rows (e.g. because flushRowWindowPatches ran before tables were
  // populated, or cross-patch clearedIndices interference left holes),
  // rebuild the table data from the store.
  useEffect(() => {
    if (!activeTableId) return;
    const store = rowStoreRef.current;
    if (!store || store.maxLoadedIndex < 0 || store.indexToUiId.size === 0) return;
    setTables((prev) => {
      const table = prev.find((t) => t.id === activeTableId);
      if (!table) return prev;

      // Check if data is completely empty
      const isEmpty = table.data.length === 0 || !table.data.some((r) => r !== undefined);
      if (isEmpty) {
        return prev.map((t) =>
          t.id === activeTableId ? buildTableDataFromRowStore(t, store) : t,
        );
      }

      // Check for partial blanks: if the store has rows that the data array is
      // missing (undefined entries within the loaded range), rebuild to fill holes.
      const loadedEnd = Math.min(store.maxLoadedIndex, table.data.length - 1);
      let hasBlanks = false;
      for (let i = 0; i <= loadedEnd; i++) {
        if (table.data[i] === undefined && store.indexToUiId.has(i)) {
          hasBlanks = true;
          break;
        }
      }
      if (!hasBlanks) return prev;
      return prev.map((t) =>
        t.id === activeTableId ? buildTableDataFromRowStore(t, store) : t,
      );
    });
  }, [activeTableId, rowStoreVersion, buildTableDataFromRowStore]);

  useEffect(() => {
    if (tableFields.length === 0) {
      setFilterGroups((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const fallbackColumnId = tableFields[0]?.id ?? "";
    const fieldById = new Map(tableFields.map((field) => [field.id, field]));
    setFilterGroups((prev) => {
      let changed = false;
      const next = prev.map((group, groupIndex) => {
        const nextGroupJoin: FilterJoin = groupIndex === 0 ? "and" : group.join;
        let groupChanged = nextGroupJoin !== group.join;
        const nextConditions = group.conditions.map((condition, conditionIndex) => {
          const hasColumn = tableFields.some((field) => field.id === condition.columnId);
          const nextColumnId = hasColumn ? condition.columnId : fallbackColumnId;
          const nextJoin: FilterJoin = conditionIndex === 0 ? "and" : condition.join;
          const nextField = fieldById.get(nextColumnId);
          const operatorItems = getFilterOperatorItemsForField(nextField?.kind);
          const allowedOperators = new Set(operatorItems.map((item) => item.id));
          const nextOperator = allowedOperators.has(condition.operator)
            ? condition.operator
            : getDefaultFilterOperatorForField(nextField?.kind);
          const nextValue = operatorRequiresValue(nextOperator) ? condition.value : "";
          if (
            nextColumnId !== condition.columnId ||
            nextJoin !== condition.join ||
            nextOperator !== condition.operator ||
            nextValue !== condition.value
          ) {
            groupChanged = true;
            return {
              ...condition,
              columnId: nextColumnId,
              join: nextJoin,
              operator: nextOperator,
              value: nextValue,
            };
          }
          return condition;
        });
        if (groupChanged) {
          changed = true;
          return {
            ...group,
            join: nextGroupJoin,
            conditions: nextConditions,
          };
        }
        return group;
      });
      return changed ? next : prev;
    });
  }, [tableFields]);

  const positionRenameTablePopoverForElement = useCallback((anchor: HTMLElement | null) => {
    if (!anchor || typeof document === "undefined") return;
    const rect = anchor.getBoundingClientRect();
    const popoverWidth = 388;
    const gap = 8;
    const left = Math.max(gap, Math.min(rect.left, window.innerWidth - popoverWidth - gap));
    const top = rect.bottom + gap;
    setRenameTablePopoverPosition({ top, left });
  }, []);

  const positionDeleteTableConfirmForTable = useCallback((tableId: string) => {
    if (typeof document === "undefined") return;
    const trigger = document.querySelector<HTMLElement>(`[data-table-tab-id="${tableId}"]`);
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const popoverWidth = 260;
    const gap = 8;
    const left = Math.max(gap, Math.min(rect.left, window.innerWidth - popoverWidth - gap));
    const top = rect.bottom + gap;
    setDeleteTableConfirmPosition({ top, left });
  }, []);

  const deleteTableById = useCallback(
    async (tableId: string, preferredActiveId?: string | null) => {
      if (!resolvedBaseId) return;
      if (pendingDeletedTableIds.has(tableId)) return;

      const previousTables = tables;
      const previousHiddenTableIds = hiddenTableIds;
      const previousActiveTableId = activeTableId;

      const preferredActive =
        preferredActiveId && preferredActiveId !== tableId
          ? tables.find((table) => table.id === preferredActiveId)?.id ?? null
          : null;
      const visibleIndex = visibleTables.findIndex((table) => table.id === tableId);
      const leftNeighborId =
        visibleIndex > 0 ? visibleTables[visibleIndex - 1]?.id ?? null : null;
      const rightNeighborId =
        visibleIndex >= 0 ? visibleTables[visibleIndex + 1]?.id ?? null : null;
      const fallbackId =
        tables.find((table) => table.id !== tableId)?.id ?? "";
      const nextActiveId =
        preferredActive ?? leftNeighborId ?? rightNeighborId ?? fallbackId ?? "";

      setPendingDeletedTableIds((prev) => {
        const next = new Set(prev);
        next.add(tableId);
        return next;
      });
      setTables((prev) => prev.filter((table) => table.id !== tableId));
      setHiddenTableIds((prev) => prev.filter((id) => id !== tableId));
      setActiveTableId(nextActiveId);

      try {
        await deleteTableMutation.mutateAsync({ id: tableId });
        void utils.tables.listByBaseId.invalidate({ baseId: resolvedBaseId });
      } catch {
        setPendingDeletedTableIds((prev) => {
          const next = new Set(prev);
          next.delete(tableId);
          return next;
        });
        setTables(previousTables);
        setHiddenTableIds(previousHiddenTableIds);
        setActiveTableId(previousActiveTableId);
      }
    },
    [
      activeTableId,
      hiddenTableIds,
      pendingDeletedTableIds,
      resolvedBaseId,
      tables,
      visibleTables,
      deleteTableMutation,
      utils.tables.listByBaseId,
    ],
  );

  const handleStartFromScratch = () => {
    const nextIndex = tables.length + 1;
    const defaultName = `Table ${nextIndex}`;
    setIsAddMenuOpen(false);
    setIsTableTabMenuOpen(false);
    setRenameTableId(null);
    setRenameTableValue(defaultName);
    pendingCreateTableNameRef.current = defaultName;
    pendingCreateTableShouldCloseRef.current = false;
    pendingCreateTableIdRef.current = null;
    pendingCreateTablePreviousActiveIdRef.current = activeTableId;
    setIsRenameTablePopoverOpen(true);
    const anchor = addMenuFromTables ? tablesMenuAddRef.current : addMenuButtonRef.current;
    positionRenameTablePopoverForElement(anchor);

    const requestId = pendingCreateTableRequestIdRef.current + 1;
    pendingCreateTableRequestIdRef.current = requestId;

    void (async () => {
      const createdTable = await createTableWithDefaultSchema(defaultName, true);
      if (!createdTable) return;
      if (pendingCreateTableCancelledRequestIdsRef.current.has(requestId)) {
        pendingCreateTableCancelledRequestIdsRef.current.delete(requestId);
        pendingCreateTableNameRef.current = null;
        pendingCreateTableShouldCloseRef.current = false;
        pendingCreateTableIdRef.current = null;
        const previousActiveId = pendingCreateTablePreviousActiveIdRef.current;
        pendingCreateTablePreviousActiveIdRef.current = null;
        void deleteTableById(createdTable.id, previousActiveId);
        return;
      }
      if (requestId !== pendingCreateTableRequestIdRef.current) return;
      const desiredName = (pendingCreateTableNameRef.current ?? "").trim();
      if (desiredName && desiredName !== createdTable.name) {
        setTables((prev) =>
          prev.map((table) =>
            table.id === createdTable.id ? { ...table, name: desiredName } : table,
          ),
        );
        updateTableMutation.mutate(
          { id: createdTable.id, name: desiredName },
          {
            onSuccess: () => {
              if (!resolvedBaseId) return;
              void utils.tables.listByBaseId.invalidate({ baseId: resolvedBaseId });
            },
          },
        );
      }

      pendingCreateTableIdRef.current = createdTable.id;
      setRenameTableId(createdTable.id);
      setRenameTableValue(desiredName || createdTable.name);
      updateRenameTablePopoverPosition(createdTable.id);
      if (pendingCreateTableShouldCloseRef.current) {
        closeRenameTablePopover();
        pendingCreateTableIdRef.current = null;
        pendingCreateTablePreviousActiveIdRef.current = null;
      }
      pendingCreateTableNameRef.current = null;
      pendingCreateTableShouldCloseRef.current = false;
    })();
  };

  const closeRenameTablePopover = useCallback(() => {
    if (!renameTableId) {
      pendingCreateTableNameRef.current = null;
      pendingCreateTableShouldCloseRef.current = false;
    }
    setIsRenameTablePopoverOpen(false);
    setRenameTableId(null);
  }, [renameTableId]);

  const handleRenameTableCancel = useCallback(() => {
    if (renameTableId && pendingCreateTableIdRef.current === renameTableId) {
      pendingCreateTableIdRef.current = null;
      pendingCreateTableNameRef.current = null;
      pendingCreateTableShouldCloseRef.current = false;
      const previousActiveId = pendingCreateTablePreviousActiveIdRef.current;
      pendingCreateTablePreviousActiveIdRef.current = null;
      closeRenameTablePopover();
      void deleteTableById(renameTableId, previousActiveId);
      return;
    }
    if (!renameTableId) {
      const requestId = pendingCreateTableRequestIdRef.current;
      if (requestId > 0) {
        pendingCreateTableCancelledRequestIdsRef.current.add(requestId);
      }
    }
    closeRenameTablePopover();
  }, [closeRenameTablePopover, deleteTableById, renameTableId]);

  const openDeleteTableConfirm = useCallback(() => {
    if (!activeTableId) return;
    setIsTableTabMenuOpen(false);
    setDeleteTableConfirmTableId(activeTableId);
    setIsDeleteTableConfirmOpen(true);
    positionDeleteTableConfirmForTable(activeTableId);
  }, [activeTableId, positionDeleteTableConfirmForTable]);

  const closeDeleteTableConfirm = useCallback(() => {
    setIsDeleteTableConfirmOpen(false);
    setDeleteTableConfirmTableId(null);
  }, []);

  const updateRenameTablePopoverPosition = useCallback((tableId: string) => {
    if (typeof document === "undefined") return;
    const trigger = document.querySelector<HTMLElement>(
      `[data-table-tab-id="${tableId}"]`,
    );
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const popoverWidth = 388;
    const gap = 8;
    const left = Math.max(
      gap,
      Math.min(rect.left, window.innerWidth - popoverWidth - gap),
    );
    const top = rect.bottom + gap;
    setRenameTablePopoverPosition({ top, left });
  }, []);

  const openRenameTablePopover = useCallback(
    (tableId: string) => {
      const tableToRename = tables.find((table) => table.id === tableId);
      if (!tableToRename) return;
      setRenameTableId(tableId);
      setRenameTableValue(tableToRename.name);
      setIsTableTabMenuOpen(false);
      setIsRenameTablePopoverOpen(true);
      updateRenameTablePopoverPosition(tableId);
    },
    [tables, updateRenameTablePopoverPosition],
  );

  const handleRenameTableSave = useCallback(() => {
    const nextName = renameTableValue.trim();
    if (!nextName) {
      closeRenameTablePopover();
      return;
    }
    if (!renameTableId) {
      pendingCreateTableNameRef.current = nextName;
      pendingCreateTableShouldCloseRef.current = true;
      pendingCreateTableCancelledRequestIdsRef.current.delete(
        pendingCreateTableRequestIdRef.current,
      );
      closeRenameTablePopover();
      return;
    }
    if (pendingCreateTableIdRef.current === renameTableId) {
      pendingCreateTableIdRef.current = null;
      pendingCreateTablePreviousActiveIdRef.current = null;
    }
    setTables((prev) =>
      prev.map((table) =>
        table.id === renameTableId ? { ...table, name: nextName } : table,
      ),
    );
    updateTableMutation.mutate(
      {
        id: renameTableId,
        name: nextName,
      },
      {
        onSuccess: () => {
          if (!resolvedBaseId) return;
          void utils.tables.listByBaseId.invalidate({ baseId: resolvedBaseId });
        },
      },
    );
    closeRenameTablePopover();
  }, [
    renameTableId,
    renameTableValue,
    closeRenameTablePopover,
    updateTableMutation,
    resolvedBaseId,
    utils.tables.listByBaseId,
  ]);

  const buildUniqueTableName = useCallback(
    (baseName: string, skipTableId?: string) => {
      const normalizedBase = baseName.trim() || "Table";
      const existing = new Set(
        tables
          .filter((table) => table.id !== skipTableId)
          .map((table) => table.name.trim().toLowerCase()),
      );
      if (!existing.has(normalizedBase.toLowerCase())) {
        return normalizedBase;
      }
      let suffix = 2;
      while (existing.has(`${normalizedBase} ${suffix}`.toLowerCase())) {
        suffix += 1;
      }
      return `${normalizedBase} ${suffix}`;
    },
    [tables],
  );

  const handleHideActiveTable = useCallback(() => {
    if (!activeTableId || visibleTables.length <= 1) return;
    setHiddenTableIds((prev) =>
      prev.includes(activeTableId) ? prev : [...prev, activeTableId],
    );
    const nextActiveTable = visibleTables.find((table) => table.id !== activeTableId);
    if (nextActiveTable) {
      setActiveTableId(nextActiveTable.id);
    }
    setIsTableTabMenuOpen(false);
  }, [activeTableId, visibleTables]);

  const handleUnhideTable = useCallback((tableId: string, activate: boolean) => {
    setHiddenTableIds((prev) => prev.filter((id) => id !== tableId));
    if (activate) {
      setActiveTableId(tableId);
    }
    setIsHiddenTablesMenuOpen(false);
  }, []);

  const handleDuplicateActiveTable = useCallback(async () => {
    if (!activeTable || !resolvedBaseId) return;
    setIsTableTabMenuOpen(false);

    try {
      const sourceTable = activeTable;
      const duplicateName = buildUniqueTableName(`${sourceTable.name} copy`);

      const createdTable = await createTableMutation.mutateAsync({
        baseId: resolvedBaseId,
        name: duplicateName,
      });
      if (!createdTable) return;

      const createdColumns = sourceTable.fields.length
        ? await createColumnsBulkMutation.mutateAsync({
            tableId: createdTable.id,
            columns: sourceTable.fields.map((field) => ({
              name: field.label,
              type: mapFieldKindToDbType(field.kind),
              size: field.size,
            })),
          })
        : [];

      const sourceFields = sourceTable.fields;
      const sourceFieldIdsByIndex = sourceFields.map((field) => field.id);

      let createdRows: Array<{ id: string; cells: Record<string, unknown> }> = [];
      if (sourceTable.data.length > 0 && createdColumns.length > 0) {
        const newColumnIdBySourceId = new Map<string, string>();
        sourceFieldIdsByIndex.forEach((sourceFieldId, index) => {
          const createdColumn = createdColumns[index];
          if (createdColumn) {
            newColumnIdBySourceId.set(sourceFieldId, createdColumn.id);
          }
        });

        const rowsToCreate = sourceTable.data.flatMap((row) => {
          if (!row) return [];
          const cells: Record<string, string> = {};
          sourceFields.forEach((field) => {
            const nextColumnId = newColumnIdBySourceId.get(field.id);
            if (!nextColumnId) return;
            cells[nextColumnId] = row[field.id] ?? field.defaultValue;
          });
          return [{ cells }];
        });

        const createdRowsResult = await createRowsBulkMutation.mutateAsync({
          tableId: createdTable.id,
          rows: rowsToCreate,
        });

        createdRows = createdRowsResult.map((row) => ({
          id: row.id,
          cells: (row.cells ?? {}) as Record<string, unknown>,
        }));
      }

      const nextFields = createdColumns.map<TableField>((column, index) => {
        const sourceField = sourceFields[index];
        const kind: TableFieldKind =
          sourceField?.kind ?? (column.type === "number" ? "number" : "singleLineText");

        return {
          id: column.id,
          label: column.name,
          kind,
          size: sourceField?.size ?? (kind === "number" ? 160 : 220),
          defaultValue: sourceField?.defaultValue ?? "",
        };
      });

      const nextVisibility = nextFields.reduce<Record<string, boolean>>(
        (acc, field, index) => {
          const sourceFieldId = sourceFieldIdsByIndex[index];
          acc[field.id] = sourceFieldId
            ? sourceTable.columnVisibility[sourceFieldId] !== false
            : true;
          return acc;
        },
        {},
      );

      const nextRows = createdRows.map((row) => {
        const uiId = createServerRowId(row.id);
        optimisticRowIdToRealIdRef.current.set(uiId, row.id);
        const nextRow: TableRow = { id: uiId, serverId: row.id };
        nextFields.forEach((field) => {
          const cellValue = row.cells[field.id];
          nextRow[field.id] = toCellText(cellValue, field.defaultValue);
        });
        return nextRow;
      });

      const nextTable: TableDefinition = {
        id: createdTable.id,
        name: createdTable.name,
        fields: nextFields,
        columnVisibility: nextVisibility,
        data: nextRows,
        nextRowId: nextRows.length + 1,
      };

      setTables((prev) => [...prev, nextTable]);
      setHiddenTableIds((prev) => prev.filter((id) => id !== createdTable.id));
      setActiveTableId(createdTable.id);

      await Promise.all([
        utils.tables.listByBaseId.invalidate({ baseId: resolvedBaseId }),
        utils.tables.getBootstrap.invalidate({ tableId: createdTable.id }),
        utils.rows.listByTableId.invalidate({ tableId: createdTable.id }),
      ]);
    } catch {
      // Ignore errors here and let the next query refresh bring state back in sync.
    }
  }, [
    activeTable,
    resolvedBaseId,
    buildUniqueTableName,
    createTableMutation,
    createColumnsBulkMutation,
    createRowsBulkMutation,
    utils.tables.listByBaseId,
    utils.tables.getBootstrap,
    utils.rows.listByTableId,
  ]);

  const handleClearActiveTableData = useCallback(async () => {
    if (!activeTable) return;
    setIsTableTabMenuOpen(false);

    const tableId = activeTable.id;
    const previousRows = activeTable.data;
    const previousNextRowId = activeTable.nextRowId;

    updateTableById(tableId, (table) => ({
      ...table,
      data: [],
      nextRowId: 1,
    }));
    setRowSelection({});
    resetEditingState();
    setActiveCellId(null);
    setActiveCellRowIndex(null);
    setActiveCellColumnIndex(null);
    setActiveRowId(null);
    setDropTargetRow(null);

    try {
      await clearRowsByTableMutation.mutateAsync({ tableId });
      void utils.rows.listByTableId.invalidate({ tableId });
    } catch {
      updateTableById(tableId, (table) => ({
        ...table,
        data: previousRows,
        nextRowId: previousNextRowId,
      }));
    }
  }, [
    activeTable,
    clearRowsByTableMutation,
    resetEditingState,
    setDropTargetRow,
    updateTableById,
    utils.rows.listByTableId,
  ]);

  const handleDeleteActiveTable = useCallback(async () => {
    if (!activeTable || !resolvedBaseId) return;
    const tableId = activeTable.id;
    setIsTableTabMenuOpen(false);
    closeRenameTablePopover();
    void deleteTableById(tableId);
  }, [activeTable, resolvedBaseId, closeRenameTablePopover, deleteTableById]);

  const handleDeleteRow = useCallback(
    async (rowId: string) => {
      if (!activeTable) return;
      const tableId = activeTable.id;
      if (pendingDeletedRowIdSet.has(rowId)) return;

      addPendingRowDeletion(tableId, rowId);

      // Optimistic update
      const previousData = activeTable.data;
      const deletedIndex = activeTable.data.findIndex((row) => row?.id === rowId);
      updateActiveTable((table) => ({
        ...table,
        data: removeRowByIdFromData(table.data, rowId),
      }));
      if (deletedIndex !== -1) {
        applyRowDeletionToRowStore(deletedIndex);
      }

      const serverRowId = resolveServerRowId(rowId);
      if (!serverRowId) {
        clearOptimisticRowCellUpdates(rowId);
        optimisticRowIdToRealIdRef.current.delete(rowId);
        removePendingRowDeletion(tableId, rowId);
        return;
      }

      try {
        await deleteRowMutation.mutateAsync({ id: serverRowId });
        removePendingRowDeletion(tableId, rowId);
        const store = rowStoreRef.current;
        if (store) {
          store.rowsByUiId.delete(rowId);
          store.rawCellsByUiId.delete(rowId);
          if (store.total > 0) {
            store.total = Math.max(0, store.total - 1);
          }
          setRowStoreVersion((prev) => prev + 1);
        }
        void utils.rows.listByTableId.invalidate({ tableId });
      } catch {
        // Rollback on error
        removePendingRowDeletion(tableId, rowId);
        updateActiveTable((table) => ({
          ...table,
          data: previousData,
        }));
        resetRowStore(rowStoreKey ?? null);
      }
    },
    [
      activeTable,
      addPendingRowDeletion,
      applyRowDeletionToRowStore,
      clearOptimisticRowCellUpdates,
      deleteRowMutation,
      pendingDeletedRowIdSet,
      removeRowByIdFromData,
      resolveServerRowId,
      removePendingRowDeletion,
      resetRowStore,
      rowStoreKey,
      updateActiveTable,
      utils.rows.listByTableId,
    ],
  );

  const startEditing = useCallback(
    (
      rowIndex: number,
      rowId: string,
      columnId: EditableColumnId,
      initialValue: string,
      originalValue: string = initialValue,
    ) => {
      clearEditAutoSaveTimeout();
      editingValueRef.current = initialValue;
      editingOriginalValueRef.current = originalValue;
      editingDirtyRef.current = false;
      setIsEditingDirty(false);
      updateEditingDirtyState(initialValue);
      flushSync(() => {
        setEditingCell({ rowIndex, rowId, columnId });
        setEditingValue(initialValue);
        setEditingOriginalValue(originalValue);
      });
      const input = editingInputRef.current;
      if (input) {
        input.focus();
        const nextPos = input.value.length;
        try {
          input.setSelectionRange(nextPos, nextPos);
        } catch {
          // Some inputs may not support selection; ignore.
        }
      }
    },
    [clearEditAutoSaveTimeout, updateEditingDirtyState],
  );

  const persistEditingValue = useCallback(
    (
      cell: EditingCell,
      value: string,
      options?: {
        closeEditor?: boolean;
        updateOriginalOnSuccess?: boolean;
        skipLocalUpdate?: boolean;
      },
    ) => {
      const rawRowId = cell.rowId;
      const resolvedServerRowId = resolveServerRowId(rawRowId);
      // Resolve column ID: if the column was optimistic when editing started but has since been
      // persisted, editingCell.columnId is stale. Look up the current ID from the mapping.
      const rawColumnId = cell.columnId;
      const targetColumnId = isUuid(rawColumnId)
        ? rawColumnId
        : optimisticColumnIdToRealIdRef.current.get(rawColumnId) ?? rawColumnId;
      const targetField = activeTable?.fields.find((field) => field.id === targetColumnId);
      const nextValue =
        targetField?.kind === "number"
          ? normalizeNumberValueForStorage(
              value,
              resolveNumberConfig(targetField.numberConfig),
            )
          : value;
      if (!options?.skipLocalUpdate) {
        updateActiveTableData((prev) =>
          prev.map((row) =>
            row?.id === rawRowId ? { ...row, [targetColumnId]: nextValue } : row,
          ),
        );
      }
      setDirtyCellOverride(rawRowId, targetColumnId, nextValue);

      const handlePersisted = () => {
        clearDirtyCellOverride(rawRowId, targetColumnId);
        if (!options?.updateOriginalOnSuccess) return;
        const currentCell = editingCellRef.current;
        if (!currentCell) return;
        if (currentCell.rowId !== cell.rowId || currentCell.columnId !== cell.columnId) return;
        if (editingValueRef.current !== value) return;
        editingOriginalValueRef.current = value;
        setEditingOriginalValue(value);
        updateEditingDirtyState(editingValueRef.current);
      };

      if (isUuid(targetColumnId)) {
        // Column is persisted - update immediately if row is also persisted.
        if (resolvedServerRowId) {
          updateCellMutation.mutate(
            {
              rowId: resolvedServerRowId,
              columnId: targetColumnId,
              value: nextValue,
            },
            {
              onSuccess: handlePersisted,
            },
          );
        } else {
          // If row is optimistic, persist after row creation completes.
          queueOptimisticRowCellUpdate(rawRowId, targetColumnId, nextValue);
        }
      } else if (activeTable?.id) {
        // Column is still optimistic - queue for persistence when column is finalized.
        // Queue even if row is optimistic; we'll resolve the row ID during finalization.
        queueOptimisticColumnCellUpdate(
          activeTable.id,
          rawRowId,
          targetColumnId,
          nextValue,
        );
      }

      if (options?.closeEditor) {
        setEditingCell(null);
        setEditingOriginalValue("");
        editingOriginalValueRef.current = "";
        editingValueRef.current = "";
        editingDirtyRef.current = false;
        setIsEditingDirty(false);
      }
    },
    [
      activeTable,
      clearDirtyCellOverride,
      updateEditingDirtyState,
      queueOptimisticColumnCellUpdate,
      queueOptimisticRowCellUpdate,
      setDirtyCellOverride,
      updateActiveTableData,
      updateCellMutation,
      resolveServerRowId,
    ],
  );

  const scheduleEditAutoSave = useCallback(
    (value: string) => {
      const cellSnapshot = editingCellRef.current;
      if (!cellSnapshot) return;
      clearEditAutoSaveTimeout();
      editAutoSaveTimeoutRef.current = window.setTimeout(() => {
        editAutoSaveTimeoutRef.current = null;
        persistEditingValue(cellSnapshot, value, {
          updateOriginalOnSuccess: true,
          skipLocalUpdate: true,
        });
      }, 700);
    },
    [clearEditAutoSaveTimeout, persistEditingValue],
  );

  const handleEditingValueChange = useCallback(
    (nextValue: string) => {
      editingValueRef.current = nextValue;
      updateEditingDirtyState(nextValue);
      scheduleEditAutoSave(nextValue);
    },
    [scheduleEditAutoSave, updateEditingDirtyState],
  );

  const commitEdit = useCallback(() => {
    if (!editingCell) return;
    clearEditAutoSaveTimeout();
    const nextValue = editingInputRef.current?.value ?? editingValueRef.current;
    if (nextValue === editingOriginalValueRef.current) {
      setEditingCell(null);
      setEditingOriginalValue("");
      editingOriginalValueRef.current = "";
      editingValueRef.current = "";
      editingDirtyRef.current = false;
      setIsEditingDirty(false);
      return;
    }
    setEditingValue(nextValue);
    editingValueRef.current = nextValue;
    persistEditingValue(editingCell, nextValue, { closeEditor: true });
  }, [
    clearEditAutoSaveTimeout,
    editingCell,
    persistEditingValue,
  ]);

  useEffect(() => {
    if (!editingCell) {
      clearEditAutoSaveTimeout();
    }
    return () => {
      clearEditAutoSaveTimeout();
    };
  }, [clearEditAutoSaveTimeout, editingCell]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const container = tableContainerRef.current;
      if (!container) {
        activeCellFollowEnabledRef.current = false;
        return;
      }
      const isInsideContainer = container.contains(target);
      if (!isInsideContainer) {
        if (editingCell) {
          commitEdit();
        }
        clearGridSelectionState();
        return;
      }
      const tableElement = container.querySelector("table");
      if (tableElement?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest('[role="menu"], [role="dialog"], [role="listbox"]')
      ) {
        return;
      }
      if (editingCell) {
        commitEdit();
      }
      clearGridSelectionState();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [clearGridSelectionState, commitEdit, editingCell]);

  const switchActiveTable = useCallback(
    (nextTableId: string) => {
      if (editingCell) {
        commitEdit();
      }
      setActiveTableId(nextTableId);
    },
    [commitEdit, editingCell],
  );

  const startEditingViewName = (targetView?: { id: string; name: string }) => {
    if (targetView) {
      setActiveViewId(targetView.id);
      setViewName(targetView.name);
    } else {
      setViewName(activeView?.name ?? DEFAULT_GRID_VIEW_NAME);
    }
    setIsEditingViewName(true);
    requestAnimationFrame(() => {
      if (viewNameInputRef.current) {
        viewNameInputRef.current.focus();
        viewNameInputRef.current.select();
      }
    });
  };

  const clearTextSelection = () => {
    if (typeof window === "undefined") return;
    window.getSelection()?.removeAllRanges();
  };

  const commitViewName = () => {
    setIsEditingViewName(false);
    clearTextSelection();
    if (!activeView || !activeTableId) {
      setViewName(DEFAULT_GRID_VIEW_NAME);
      return;
    }
    const tableId = activeTableId;
    const nextName = normalizeViewName(viewName);
    if (nextName === activeView.name) {
      setViewName(nextName);
      return;
    }
    updateViewMutation.mutate(
      {
        id: activeView.id,
        name: nextName,
      },
      {
        onSuccess: (updatedView) => {
          if (!updatedView) return;
          setViewName(updatedView.name);
          void utils.tables.getBootstrap.invalidate({ tableId });
        },
        onError: () => {
          setViewName(activeView.name);
        },
      },
    );
  };

  const cancelViewNameEdit = () => {
    setViewName(activeView?.name ?? DEFAULT_GRID_VIEW_NAME);
    setIsEditingViewName(false);
    clearTextSelection();
  };

  const buildUniqueViewName = useCallback(
    (baseName: string, skipViewId?: string) => {
      const normalizedBase = normalizeViewName(baseName);
      const existing = new Set(
        tableViews
          .filter((view) => view.id !== skipViewId)
          .map((view) => view.name.toLowerCase()),
      );
      if (!existing.has(normalizedBase.toLowerCase())) {
        return normalizedBase;
      }
      let suffix = 2;
      while (existing.has(`${normalizedBase} ${suffix}`.toLowerCase())) {
        suffix += 1;
      }
      return `${normalizedBase} ${suffix}`;
    },
    [tableViews],
  );

  const createViewOfKind = useCallback(
    (
      kind: SidebarViewKind,
      options?: {
        baseName?: string;
        sourceViewId?: string;
      },
    ) => {
      if (!activeTableId || createViewMutation.isPending) return;
      const sourceView = options?.sourceViewId
        ? tableViews.find((view) => view.id === options.sourceViewId) ?? null
        : null;
      const sourceKind = sourceView ? resolveSidebarViewKind(sourceView) : kind;
      const nextName = buildUniqueViewName(
        options?.baseName ??
          (sourceKind === "form" ? DEFAULT_FORM_VIEW_NAME : DEFAULT_GRID_VIEW_NAME),
      );
      const normalizedFilters = sourceView?.filters;
      const nextFilters =
        normalizedFilters &&
        typeof normalizedFilters === "object" &&
        !Array.isArray(normalizedFilters)
          ? {
              ...(normalizedFilters as Record<string, unknown>),
              [VIEW_KIND_FILTER_KEY]: sourceKind,
            }
          : { [VIEW_KIND_FILTER_KEY]: sourceKind };
      const tableId = activeTableId;
      const optimisticViewId = createOptimisticId("view");
      const now = new Date();
      const nextOrder =
        tableViews.reduce(
          (max, view) => (typeof view.order === "number" ? Math.max(max, view.order) : max),
          -1,
        ) + 1;
      const optimisticView = {
        id: optimisticViewId,
        tableId,
        name: nextName,
        order: nextOrder,
        filters: nextFilters,
        sort: null,
        hiddenColumnIds: [],
        columnOrder: [],
        searchQuery: null,
        createdAt: now,
        updatedAt: now,
      };
      const previousActiveViewId = activeViewId;
      const previousViewName = viewName;
      utils.tables.getBootstrap.setData({ tableId }, (prev) => {
        if (!prev) return prev;
        if (prev.views.some((view) => view.id === optimisticViewId)) return prev;
        return {
          ...prev,
          views: [...prev.views, optimisticView],
        };
      });
      setActiveViewId(optimisticViewId);
      activeViewIdRef.current = optimisticViewId;
      setViewName(nextName);
      setIsEditingViewName(false);
      createViewMutation.mutate(
        {
          tableId,
          name: nextName,
          filters: nextFilters,
        },
        {
          onSuccess: (createdView) => {
            if (!createdView) return;
            utils.tables.getBootstrap.setData({ tableId }, (prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                views: prev.views.map((view) =>
                  view.id === optimisticViewId ? createdView : view,
                ),
              };
            });
            if (activeViewIdRef.current === optimisticViewId) {
              setActiveViewId(createdView.id);
              activeViewIdRef.current = createdView.id;
              setViewName(createdView.name);
              setIsEditingViewName(false);
            }
            setViewStateById((prev) => {
              const optimisticState = prev[optimisticViewId];
              if (!optimisticState) return prev;
              const next = { ...prev };
              delete next[optimisticViewId];
              next[createdView.id] = optimisticState;
              return next;
            });
            void utils.tables.getBootstrap.invalidate({ tableId });
          },
          onError: () => {
            utils.tables.getBootstrap.setData({ tableId }, (prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                views: prev.views.filter((view) => view.id !== optimisticViewId),
              };
            });
            setViewStateById((prev) => {
              if (!prev[optimisticViewId]) return prev;
              const { [optimisticViewId]: _, ...rest } = prev;
              return rest;
            });
            if (activeViewIdRef.current === optimisticViewId) {
              setActiveViewId(previousActiveViewId ?? null);
              activeViewIdRef.current = previousActiveViewId ?? null;
              setViewName(previousViewName);
              setIsEditingViewName(false);
            }
            void utils.tables.getBootstrap.invalidate({ tableId });
          },
        },
      );
    },
    [
      activeTableId,
      activeViewId,
      buildUniqueViewName,
      createViewMutation,
      tableViews,
      utils.tables.getBootstrap,
      viewName,
    ],
  );

  const getDefaultCreateViewName = useCallback(
    (kind: SidebarViewKind) => {
      if (kind === "form") {
        return DEFAULT_FORM_VIEW_NAME;
      }
      return "Grid";
    },
    [],
  );

  const openCreateViewDialog = useCallback(
    (kind: SidebarViewKind) => {
      if (!activeTableId) return;
      setIsCreateViewMenuOpen(false);
      setCreateViewDialogKind(kind);
      const defaultName = buildUniqueViewName(getDefaultCreateViewName(kind));
      setCreateViewDialogName(defaultName);
      setIsCreateViewDialogOpen(true);
    },
    [activeTableId, buildUniqueViewName, getDefaultCreateViewName],
  );

  const handleCreateGridView = useCallback(() => {
    openCreateViewDialog("grid");
  }, [openCreateViewDialog]);

  const handleCreateFormView = useCallback(() => {
    setIsCreateViewMenuOpen(false);
    createViewOfKind("form");
  }, [createViewOfKind]);

  const handleCreateViewDialogCancel = useCallback(() => {
    setIsCreateViewDialogOpen(false);
  }, []);

  const handleCreateViewDialogSubmit = useCallback(() => {
    if (!activeTableId) return;
    const trimmedName = createViewDialogName.trim();
    const baseName = trimmedName || getDefaultCreateViewName(createViewDialogKind);
    setIsCreateViewDialogOpen(false);
    createViewOfKind(createViewDialogKind, { baseName });
  }, [
    activeTableId,
    createViewDialogKind,
    createViewDialogName,
    createViewOfKind,
    getDefaultCreateViewName,
  ]);

  const handleDuplicateViewById = useCallback(
    (viewId: string) => {
      const sourceView = tableViews.find((view) => view.id === viewId);
      if (!sourceView) return;
      const sourceKind = resolveSidebarViewKind(sourceView);
      setIsViewMenuOpen(false);
      setSidebarViewContextMenu(null);
      createViewOfKind(sourceKind, {
        baseName: `${sourceView.name} copy`,
        sourceViewId: sourceView.id,
      });
    },
    [tableViews, createViewOfKind],
  );

  const handleDeleteViewById = useCallback(
    (viewId: string) => {
      if (!activeTableId || tableViews.length <= 1) return;
      const deletedIndex = tableViews.findIndex((view) => view.id === viewId);
      if (deletedIndex === -1) return;
      const deletedView = tableViews[deletedIndex];
      if (!deletedView) return;
      const shouldSwitchActive = activeViewId === viewId;
      const findGridAbove = () => {
        for (let index = deletedIndex - 1; index >= 0; index -= 1) {
          const view = tableViews[index];
          if (view && resolveSidebarViewKind(view) === "grid") return view;
        }
        return null;
      };
      const findGridBelow = () => {
        for (let index = deletedIndex + 1; index < tableViews.length; index += 1) {
          const view = tableViews[index];
          if (view && resolveSidebarViewKind(view) === "grid") return view;
        }
        return null;
      };
      const fallbackView = tableViews.find((view) => view.id !== viewId) ?? null;
      const nextActiveView = findGridAbove() ?? findGridBelow() ?? fallbackView;
      const nextActiveId = nextActiveView?.id ?? null;
      const tableId = activeTableId;
      const previousActiveViewId = activeViewId;
      const previousViewName = viewName;
      const previousViewState = viewStateById[viewId];
      setIsViewMenuOpen(false);
      setSidebarViewContextMenu(null);
      utils.tables.getBootstrap.setData({ tableId }, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          views: prev.views.filter((view) => view.id !== viewId),
        };
      });
      setViewStateById((prev) => {
        if (!prev[viewId]) return prev;
        const { [viewId]: _, ...rest } = prev;
        return rest;
      });
      if (shouldSwitchActive) {
        setActiveViewId(nextActiveId);
        activeViewIdRef.current = nextActiveId;
        if (nextActiveView) {
          setViewName(nextActiveView.name);
        } else {
          setViewName(DEFAULT_GRID_VIEW_NAME);
        }
        setIsEditingViewName(false);
      }
      deleteViewMutation.mutate(
        { id: viewId },
        {
          onSuccess: () => {
            // Favorites are cleaned up via cascade delete, refetch to sync
            void favoriteViewIdsQuery.refetch();
            void utils.tables.getBootstrap.invalidate({ tableId });
          },
          onError: () => {
            utils.tables.getBootstrap.setData({ tableId }, (prev) => {
              if (!prev) return prev;
              if (prev.views.some((view) => view.id === viewId)) return prev;
              const nextViews = [...prev.views];
              const insertIndex = Math.min(deletedIndex, nextViews.length);
              nextViews.splice(insertIndex, 0, deletedView);
              return {
                ...prev,
                views: nextViews,
              };
            });
            setViewStateById((prev) => {
              if (!previousViewState || prev[viewId]) return prev;
              return {
                ...prev,
                [viewId]: previousViewState,
              };
            });
            if (shouldSwitchActive && activeViewIdRef.current === nextActiveId) {
              setActiveViewId(previousActiveViewId ?? null);
              activeViewIdRef.current = previousActiveViewId ?? null;
              setViewName(previousViewName);
              setIsEditingViewName(false);
            }
            void utils.tables.getBootstrap.invalidate({ tableId });
          },
        },
      );
    },
    [
      activeTableId,
      activeViewId,
      tableViews,
      deleteViewMutation,
      favoriteViewIdsQuery,
      resolveSidebarViewKind,
      utils.tables.getBootstrap,
      viewName,
      viewStateById,
    ],
  );

  const handleDuplicateActiveView = useCallback(() => {
    if (!activeView) return;
    handleDuplicateViewById(activeView.id);
  }, [activeView, handleDuplicateViewById]);

  const handleDeleteActiveView = useCallback(() => {
    if (!activeView) return;
    handleDeleteViewById(activeView.id);
  }, [activeView, handleDeleteViewById]);

  const selectView = useCallback((viewId: string, name: string) => {
    setActiveViewId(viewId);
    setViewName(name);
    setIsEditingViewName(false);
    setIsViewMenuOpen(false);
    setSidebarViewContextMenu(null);
    // Clear cell selection when switching views
    resetEditingState();
    setActiveCellRowIndex(null);
    setActiveCellColumnIndex(null);
    setSelectionAnchor(null);
    setSelectionRange(null);
    setSelectedHeaderColumnIndex(null);
  }, [resetEditingState]);

  const toggleViewFavorite = useCallback(
    (viewId: string) => {
      const isFavorite = favoriteViewIdSet.has(viewId);
      const nextFavorites = new Set(favoriteViewIdSet);
      if (isFavorite) {
        nextFavorites.delete(viewId);
      } else {
        nextFavorites.add(viewId);
      }
      setFavoriteViewIdsOverride(nextFavorites);
      if (isFavorite) {
        removeViewFavoriteMutation.mutate(
          { viewId },
          {
            onSuccess: () => {
              void favoriteViewIdsQuery.refetch();
            },
            onError: () => {
              setFavoriteViewIdsOverride(null);
              void favoriteViewIdsQuery.refetch();
            },
          },
        );
      } else {
        addViewFavoriteMutation.mutate(
          { viewId },
          {
            onSuccess: () => {
              void favoriteViewIdsQuery.refetch();
            },
            onError: () => {
              setFavoriteViewIdsOverride(null);
              void favoriteViewIdsQuery.refetch();
            },
          },
        );
      }
    },
    [
      favoriteViewIdSet,
      addViewFavoriteMutation,
      removeViewFavoriteMutation,
      favoriteViewIdsQuery,
    ],
  );

  const getSidebarViewContextMenuPosition = useCallback((clientX: number, clientY: number) => {
    const menuWidth = 260;
    const menuHeight = 220;
    const viewportPadding = 8;
    const left = Math.max(
      viewportPadding,
      Math.min(clientX, window.innerWidth - menuWidth - viewportPadding),
    );
    const top = Math.max(
      viewportPadding,
      Math.min(clientY, window.innerHeight - menuHeight - viewportPadding),
    );
    return { left, top };
  }, []);

  const openSidebarViewContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>, viewId: string) => {
      event.preventDefault();
      const { left, top } = getSidebarViewContextMenuPosition(event.clientX, event.clientY);
      sidebarViewContextMenuAnchorRef.current = event.currentTarget as HTMLElement;
      setSidebarViewContextMenu({ viewId, top, left });
    },
    [getSidebarViewContextMenuPosition],
  );

  const applyViewOrder = useCallback(
    (nextOrder: string[]) => {
      if (!activeTableId) return;
      const viewById = new Map(tableViews.map((view) => [view.id, view]));
      const nextOrderSet = new Set(nextOrder);
      const fullOrder = [
        ...nextOrder,
        ...tableViews.map((view) => view.id).filter((id) => !nextOrderSet.has(id)),
      ];
      const nextViews = fullOrder
        .map((viewId, index) => {
          const view = viewById.get(viewId);
          if (!view) return null;
          return view.order === index ? view : { ...view, order: index };
        })
        .filter((view): view is (typeof tableViews)[number] => Boolean(view));
      utils.tables.getBootstrap.setData({ tableId: activeTableId }, (prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          views: nextViews,
        };
      });
    },
    [activeTableId, tableViews, utils.tables.getBootstrap],
  );

  const applyTableOrder = useCallback((nextOrder: string[]) => {
    setTables((prev) => {
      if (prev.length <= 1) return prev;
      const tableById = new Map(prev.map((table) => [table.id, table] as const));
      const nextOrderSet = new Set(nextOrder);
      const fullOrder = [
        ...nextOrder,
        ...prev.map((table) => table.id).filter((id) => !nextOrderSet.has(id)),
      ];
      const nextTables = fullOrder
        .map((tableId) => tableById.get(tableId))
        .filter((table): table is TableDefinition => Boolean(table));
      if (nextTables.length !== prev.length) return prev;
      return nextTables;
    });
  }, []);

  const persistTableOrder = useCallback(
    (nextOrder: string[], rollbackOrder?: string[] | null) => {
      if (!resolvedBaseId) return;
      if (!nextOrder.every((tableId) => isUuid(tableId))) return;
      reorderTablesMutation.mutate(
        { baseId: resolvedBaseId, tableIds: nextOrder },
        {
          onSuccess: () => {
            void utils.tables.listByBaseId.invalidate({ baseId: resolvedBaseId });
          },
          onError: () => {
            if (rollbackOrder && rollbackOrder.length > 0) {
              applyTableOrder(rollbackOrder);
            }
            void utils.tables.listByBaseId.invalidate({ baseId: resolvedBaseId });
          },
        },
      );
    },
    [applyTableOrder, reorderTablesMutation, resolvedBaseId, utils.tables.listByBaseId],
  );

  const getReorderedVisibleTableIds = useCallback(
    (sourceId: string, targetId: string, placement: "before" | "after" = "before") => {
      const currentOrder = visibleTables.map((table) => table.id);
      const fromIndex = currentOrder.indexOf(sourceId);
      if (fromIndex === -1) return null;
      const next = currentOrder.filter((id) => id !== sourceId);
      const targetIndex = next.indexOf(targetId);
      if (targetIndex === -1) return null;
      const insertionIndex = placement === "after" ? targetIndex + 1 : targetIndex;
      next.splice(insertionIndex, 0, sourceId);
      const hasChanged = next.some((id, index) => id !== currentOrder[index]);
      return hasChanged ? next : null;
    },
    [visibleTables],
  );

  const getTableDropPlacement = useCallback(
    (clientX: number, target: HTMLElement | null): "before" | "after" => {
      if (!target) return "before";
      const rect = target.getBoundingClientRect();
      return clientX >= rect.left + rect.width / 2 ? "after" : "before";
    },
    [],
  );

  const buildFullTableOrder = useCallback(
    (nextVisibleOrder: string[]) => {
      const nextVisibleSet = new Set(nextVisibleOrder);
      const nextVisibleQueue = [...nextVisibleOrder];
      const nextFullOrder: string[] = [];
      tables.forEach((table) => {
        if (!nextVisibleSet.has(table.id)) {
          nextFullOrder.push(table.id);
          return;
        }
        const nextVisibleId = nextVisibleQueue.shift();
        nextFullOrder.push(nextVisibleId ?? table.id);
      });
      nextVisibleQueue.forEach((tableId) => nextFullOrder.push(tableId));
      return nextFullOrder;
    },
    [tables],
  );

  const removeTableDragImage = useCallback(() => {
    const dragImage = tableDragImageRef.current;
    if (dragImage?.parentNode) {
      dragImage.parentNode.removeChild(dragImage);
    }
    tableDragImageRef.current = null;
  }, []);

  const animateTableTabReorder = useCallback((orderedIds: string[]) => {
    if (typeof window === "undefined") return;
    const beforeRects = new Map<string, DOMRect>();
    orderedIds.forEach((id) => {
      const element = document.querySelector<HTMLElement>(`[data-table-tab-id="${id}"]`);
      if (element) {
        beforeRects.set(id, element.getBoundingClientRect());
      }
    });
    window.requestAnimationFrame(() => {
      orderedIds.forEach((id) => {
        const element = document.querySelector<HTMLElement>(`[data-table-tab-id="${id}"]`);
        const beforeRect = beforeRects.get(id);
        if (!element || !beforeRect) return;
        const afterRect = element.getBoundingClientRect();
        const deltaX = beforeRect.left - afterRect.left;
        if (Math.abs(deltaX) < 0.5) return;
        element.animate(
          [
            { transform: `translateX(${deltaX}px)` },
            { transform: "translateX(0)" },
          ],
          {
            duration: 170,
            easing: "cubic-bezier(0.2, 0, 0, 1)",
          },
        );
      });
    });
  }, []);

  const handleTableDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>, tableId: string) => {
      const target = event.target as HTMLElement | null;
      const currentTarget = event.currentTarget as HTMLElement | null;
      if (target?.closest('[data-table-tab-menu-trigger="true"]')) {
        event.preventDefault();
        return;
      }
      tableDropHandledRef.current = false;
      tableOrderPreviewRef.current = null;
      tableOrderBeforeDragRef.current = tables.map((table) => table.id);
      removeTableDragImage();
      const dragRoot =
        (currentTarget?.closest("[data-table-tab-id]") as HTMLElement | null) ?? currentTarget;
      if (dragRoot) {
        const rect = dragRoot.getBoundingClientRect();
        const dragClone = dragRoot.cloneNode(true) as HTMLElement;
        const dragPreviewClass = styles.tableTabDragPreview;
        if (dragPreviewClass) {
          dragClone.classList.add(dragPreviewClass);
        }
        dragClone.style.width = `${rect.width}px`;
        dragClone.style.height = `${rect.height}px`;
        dragClone.style.position = "fixed";
        dragClone.style.top = "-9999px";
        dragClone.style.left = "-9999px";
        dragClone.style.pointerEvents = "none";
        dragClone.style.boxSizing = "border-box";
        document.body.appendChild(dragClone);
        tableDragImageRef.current = dragClone;
        const offsetX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const offsetY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
        event.dataTransfer.setDragImage(dragClone, offsetX, offsetY);
      }
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", tableId);
      setDraggingTableId(tableId);
      setTableDragOverId(null);
      setTableDragOverSide(null);
    },
    [removeTableDragImage, styles.tableTabDragPreview, tables],
  );

  const handleTableDragOver = useCallback(
    (event: React.DragEvent<HTMLElement>, tableId: string, targetElement?: HTMLElement | null) => {
      if (!draggingTableId || tableId === draggingTableId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const resolvedTarget = targetElement ?? (event.currentTarget as HTMLElement | null);
      const placement = getTableDropPlacement(event.clientX, resolvedTarget);
      setTableDragOverId(tableId);
      setTableDragOverSide(placement === "after" ? "right" : "left");
    },
    [draggingTableId, getTableDropPlacement],
  );

  const handleTableDrop = useCallback(
    (event: React.DragEvent<HTMLElement>, tableId: string, targetElement?: HTMLElement | null) => {
      event.preventDefault();
      if (!draggingTableId || tableId === draggingTableId) return;
      tableDropHandledRef.current = true;
      const resolvedTarget = targetElement ?? (event.currentTarget as HTMLElement | null);
      const placement = getTableDropPlacement(event.clientX, resolvedTarget);
      const nextFullOrder =
        tableOrderPreviewRef.current ??
        (() => {
          const nextVisibleOrder = getReorderedVisibleTableIds(draggingTableId, tableId, placement);
          return nextVisibleOrder ? buildFullTableOrder(nextVisibleOrder) : tables.map((table) => table.id);
        })();
      animateTableTabReorder(nextFullOrder);
      applyTableOrder(nextFullOrder);
      persistTableOrder(nextFullOrder, tableOrderBeforeDragRef.current);
      tableOrderPreviewRef.current = null;
      tableOrderBeforeDragRef.current = null;
      setDraggingTableId(null);
      setTableDragOverId(null);
      setTableDragOverSide(null);
    },
    [
      applyTableOrder,
      animateTableTabReorder,
      buildFullTableOrder,
      draggingTableId,
      getTableDropPlacement,
      getReorderedVisibleTableIds,
      persistTableOrder,
      tables,
    ],
  );

  const handleTableTabsDrop = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      if (!draggingTableId) return;
      const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      const tableTab = target?.closest?.("[data-table-tab-id]") as HTMLElement | null;
      const overTableId = tableTab?.getAttribute("data-table-tab-id");
      if (overTableId && overTableId !== draggingTableId) {
        handleTableDrop(event, overTableId, tableTab);
        return;
      }

      const currentVisibleOrder = visibleTables.map((table) => table.id);
      const sourceIndex = currentVisibleOrder.indexOf(draggingTableId);
      if (sourceIndex === -1) {
        setDraggingTableId(null);
        setTableDragOverId(null);
        setTableDragOverSide(null);
        tableOrderPreviewRef.current = null;
        tableOrderBeforeDragRef.current = null;
        tableDropHandledRef.current = false;
        removeTableDragImage();
        return;
      }

      const nextVisibleOrder = [
        ...currentVisibleOrder.filter((tableId) => tableId !== draggingTableId),
        draggingTableId,
      ];
      const hasChanged = nextVisibleOrder.some((tableId, index) => tableId !== currentVisibleOrder[index]);
      tableDropHandledRef.current = true;
      if (hasChanged) {
        const nextFullOrder = buildFullTableOrder(nextVisibleOrder);
        animateTableTabReorder(nextFullOrder);
        applyTableOrder(nextFullOrder);
        persistTableOrder(nextFullOrder, tableOrderBeforeDragRef.current);
      }
      tableOrderPreviewRef.current = null;
      tableOrderBeforeDragRef.current = null;
      setDraggingTableId(null);
      setTableDragOverId(null);
      setTableDragOverSide(null);
      removeTableDragImage();
    },
    [
      applyTableOrder,
      animateTableTabReorder,
      buildFullTableOrder,
      draggingTableId,
      handleTableDrop,
      persistTableOrder,
      removeTableDragImage,
      visibleTables,
    ],
  );

  const handleTableDragEnd = useCallback(() => {
    if (!tableDropHandledRef.current) {
      tableOrderPreviewRef.current = null;
      tableOrderBeforeDragRef.current = null;
    }
    tableOrderPreviewRef.current = null;
    tableOrderBeforeDragRef.current = null;
    tableDropHandledRef.current = false;
    setDraggingTableId(null);
    setTableDragOverId(null);
    setTableDragOverSide(null);
    removeTableDragImage();
  }, [removeTableDragImage]);

  const persistViewOrder = useCallback(
    (nextOrder: string[], rollbackOrder?: string[] | null) => {
      if (!activeTableId) return;
      if (!nextOrder.every((viewId) => isUuid(viewId))) return;
      reorderViewsMutation.mutate(
        { tableId: activeTableId, viewIds: nextOrder },
        {
          onSuccess: () => {
            void utils.tables.getBootstrap.invalidate({ tableId: activeTableId });
          },
          onError: () => {
            if (rollbackOrder && rollbackOrder.length > 0) {
              applyViewOrder(rollbackOrder);
            }
            void utils.tables.getBootstrap.invalidate({ tableId: activeTableId });
          },
        },
      );
    },
    [activeTableId, applyViewOrder, reorderViewsMutation, utils.tables.getBootstrap],
  );

  const getReorderedViewIds = useCallback(
    (sourceId: string, targetId: string, placement: "before" | "after" = "before") => {
      const currentOrder = viewOrderPreviewRef.current ?? tableViews.map((view) => view.id);
      const fromIndex = currentOrder.indexOf(sourceId);
      if (fromIndex === -1) return null;
      const next = currentOrder.filter((id) => id !== sourceId);
      const targetIndex = next.indexOf(targetId);
      if (targetIndex === -1) return null;
      const insertionIndex = placement === "after" ? targetIndex + 1 : targetIndex;
      next.splice(insertionIndex, 0, sourceId);
      const hasChanged = next.some((id, index) => id !== currentOrder[index]);
      return hasChanged ? next : null;
    },
    [tableViews],
  );

  const getViewDropPlacement = useCallback(
    (clientY: number, target: HTMLElement | null): "before" | "after" => {
      if (!target) return "before";
      const rect = target.getBoundingClientRect();
      return clientY >= rect.top + rect.height / 2 ? "after" : "before";
    },
    [],
  );

  const applyViewOrderWithAnimation = useCallback(
    (orderedIds: string[]) => {
      if (typeof window === "undefined") {
        applyViewOrder(orderedIds);
        return;
      }

      // 1. Snapshot current positions BEFORE the state update
      const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-view-id]"));
      const beforeTops = new Map<string, number>();
      rows.forEach((row) => {
        const id = row.getAttribute("data-view-id");
        if (id) beforeTops.set(id, row.getBoundingClientRect().top);
      });

      // 2. Apply the new order (triggers React re-render)
      applyViewOrder(orderedIds);

      // 3. After paint, animate from old position to new position
      requestAnimationFrame(() => {
        const updatedRows = Array.from(
          document.querySelectorAll<HTMLElement>("[data-view-id]"),
        );
        updatedRows.forEach((row) => {
          const id = row.getAttribute("data-view-id");
          if (!id) return;
          const beforeTop = beforeTops.get(id);
          if (beforeTop === undefined) return;
          const afterTop = row.getBoundingClientRect().top;
          const deltaY = beforeTop - afterTop;
          if (Math.abs(deltaY) < 0.5) return;

          // Cancel any running animation on this element so the new one takes over cleanly
          row.getAnimations().forEach((a) => a.cancel());

          row.animate(
            [
              { transform: `translateY(${deltaY}px)` },
              { transform: "translateY(0)" },
            ],
            {
              duration: 180,
              easing: "cubic-bezier(0.2, 0, 0, 1)",
              fill: "none",
            },
          );
        });
      });
    },
    [applyViewOrder],
  );

  const armViewDragHandle = useCallback((viewId: string) => {
    viewDragHandleArmedRef.current = viewId;
  }, []);

  const removeViewDragImage = useCallback(() => {
    const dragImage = viewDragImageRef.current;
    if (dragImage?.parentNode) {
      dragImage.parentNode.removeChild(dragImage);
    }
    viewDragImageRef.current = null;
  }, []);

  const handleViewDragStart = useCallback(
    (event: React.DragEvent<HTMLElement>, viewId: string) => {
      const target = event.target as HTMLElement | null;
      const currentTarget = event.currentTarget as HTMLElement | null;
      const armedViewId = viewDragHandleArmedRef.current;
      viewDragHandleArmedRef.current = null;
      viewDropHandledRef.current = false;
      viewOrderPreviewRef.current = null;
      viewOrderBeforeDragRef.current = tableViews.map((view) => view.id);
      viewOrderPreviewRef.current = tableViews.map((view) => view.id);
      if (target) {
        const isHandle = Boolean(target.closest('[data-view-drag-handle="true"]'));
        const isHandleArmed = armedViewId === viewId;
        if (!isHandle && !isHandleArmed) {
          event.preventDefault();
          return;
        }
      }
      removeViewDragImage();
      const dragRoot =
        (currentTarget?.closest("[data-view-id]") as HTMLElement | null) ?? currentTarget;
      if (dragRoot) {
        const rect = dragRoot.getBoundingClientRect();
        const dragClone = dragRoot.cloneNode(true) as HTMLElement;
        const dragPreviewClass = styles.viewListItemDragPreview;
        if (dragPreviewClass) {
          dragClone.classList.add(dragPreviewClass);
        }
        dragClone.style.width = `${rect.width}px`;
        dragClone.style.height = `${rect.height}px`;
        dragClone.style.position = "fixed";
        dragClone.style.top = "-9999px";
        dragClone.style.left = "-9999px";
        dragClone.style.pointerEvents = "none";
        dragClone.style.boxSizing = "border-box";
        document.body.appendChild(dragClone);
        viewDragImageRef.current = dragClone;
        const offsetX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
        const offsetY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
        event.dataTransfer.setDragImage(dragClone, offsetX, offsetY);
      }
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", viewId);
      setDraggingViewId(viewId);
      setViewDragOverId(null);
      setViewDragOverSide(null);
    },
    [removeViewDragImage, styles.viewListItemDragPreview, tableViews],
  );

  const handleViewDrag = useCallback(
    (event: React.DragEvent<HTMLElement>, viewId: string) => {
      if (event.clientX === 0 && event.clientY === 0) return;
      setSidebarViewContextMenu((prev) => {
        if (prev?.viewId !== viewId) return prev;
        const { left, top } = getSidebarViewContextMenuPosition(event.clientX, event.clientY);
        return { ...prev, left, top };
      });
    },
    [getSidebarViewContextMenuPosition],
  );

  const handleViewDragEnd = useCallback(() => {
    if (viewDragRafRef.current != null) {
      cancelAnimationFrame(viewDragRafRef.current);
      viewDragRafRef.current = null;
    }
    if (!viewDropHandledRef.current && viewOrderBeforeDragRef.current) {
      applyViewOrder(viewOrderBeforeDragRef.current);
    }
    viewOrderPreviewRef.current = null;
    viewOrderBeforeDragRef.current = null;
    viewDropHandledRef.current = false;
    setDraggingViewId(null);
    setViewDragOverId(null);
    setViewDragOverSide(null);
    removeViewDragImage();
  }, [applyViewOrder, removeViewDragImage]);

  const handleViewDragOver = useCallback(
    (event: React.DragEvent<HTMLElement>, viewId: string, targetElement?: HTMLElement | null) => {
      if (!draggingViewId || viewId === draggingViewId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const resolvedTarget = targetElement ?? (event.currentTarget as HTMLElement | null);
      const placement = getViewDropPlacement(event.clientY, resolvedTarget);

      // Throttle reorder to max once per animation frame
      if (viewDragRafRef.current != null) {
        cancelAnimationFrame(viewDragRafRef.current);
      }
      viewDragRafRef.current = requestAnimationFrame(() => {
        viewDragRafRef.current = null;
        const nextOrder = getReorderedViewIds(draggingViewId, viewId, placement);
        if (nextOrder) {
          const previousOrder = viewOrderPreviewRef.current;
          const isSameOrder =
            previousOrder?.length === nextOrder.length &&
            previousOrder?.every((id, index) => id === nextOrder[index]) === true;
          if (!isSameOrder) {
            applyViewOrderWithAnimation(nextOrder);
            viewOrderPreviewRef.current = nextOrder;
          }
        }
      });
      setViewDragOverId(viewId);
      setViewDragOverSide(placement === "after" ? "bottom" : "top");
    },
    [
      applyViewOrderWithAnimation,
      draggingViewId,
      getReorderedViewIds,
      getViewDropPlacement,
    ],
  );

  const handleViewDrop = useCallback(
    (event: React.DragEvent<HTMLElement>, viewId: string, targetElement?: HTMLElement | null) => {
      event.preventDefault();
      if (!draggingViewId || viewId === draggingViewId) return;
      viewDropHandledRef.current = true;
      const resolvedTarget = targetElement ?? (event.currentTarget as HTMLElement | null);
      const placement = getViewDropPlacement(event.clientY, resolvedTarget);
      const nextOrder =
        viewOrderPreviewRef.current ??
        getReorderedViewIds(draggingViewId, viewId, placement) ??
        tableViews.map((view) => view.id);
      applyViewOrderWithAnimation(nextOrder);
      persistViewOrder(nextOrder, viewOrderBeforeDragRef.current);
      viewOrderPreviewRef.current = null;
      viewOrderBeforeDragRef.current = null;
      setDraggingViewId(null);
      setViewDragOverId(null);
      setViewDragOverSide(null);
      removeViewDragImage();
    },
    [
      applyViewOrderWithAnimation,
      draggingViewId,
      getViewDropPlacement,
      getReorderedViewIds,
      persistViewOrder,
      removeViewDragImage,
      tableViews,
    ],
  );

  const handleViewListDrop = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      if (!draggingViewId) return;
      const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
      const viewRow = target?.closest?.("[data-view-id]") as HTMLElement | null;
      const overViewId = viewRow?.getAttribute("data-view-id");
      if (overViewId && overViewId !== draggingViewId) {
        handleViewDrop(event, overViewId, viewRow);
        return;
      }

      const currentOrder = tableViews.map((view) => view.id);
      const sourceIndex = currentOrder.indexOf(draggingViewId);
      if (sourceIndex === -1) {
        setDraggingViewId(null);
        setViewDragOverId(null);
        setViewDragOverSide(null);
        viewOrderPreviewRef.current = null;
        viewOrderBeforeDragRef.current = null;
        viewDropHandledRef.current = false;
        removeViewDragImage();
        return;
      }

      const nextOrder = [
        ...currentOrder.filter((viewId) => viewId !== draggingViewId),
        draggingViewId,
      ];
      const hasChanged = nextOrder.some((viewId, index) => viewId !== currentOrder[index]);
      viewDropHandledRef.current = true;
      if (hasChanged) {
        applyViewOrderWithAnimation(nextOrder);
        persistViewOrder(nextOrder, viewOrderBeforeDragRef.current);
      }
      viewOrderPreviewRef.current = null;
      viewOrderBeforeDragRef.current = null;
      setDraggingViewId(null);
      setViewDragOverId(null);
      setViewDragOverSide(null);
      removeViewDragImage();
    },
    [
      applyViewOrderWithAnimation,
      draggingViewId,
      handleViewDrop,
      persistViewOrder,
      removeViewDragImage,
      tableViews,
    ],
  );

  const handleRenameViewById = (viewId: string) => {
    const targetView = tableViews.find((view) => view.id === viewId);
    if (!targetView) return;
    setSidebarViewContextMenu(null);
    setIsViewMenuOpen(false);
    startEditingViewName({ id: targetView.id, name: targetView.name });
  };

  const cancelEdit = useCallback(() => {
    resetEditingState();
  }, [resetEditingState]);

  const clearActiveCell = useCallback(() => {
    setActiveCellId(null);
    setActiveCellRowIndex(null);
    setActiveCellColumnIndex(null);
  }, []);

  // Compute selection bounds from anchor and current active cell
  const computeSelectionRange = useCallback(
    (anchor: { rowIndex: number; columnIndex: number }, current: { rowIndex: number; columnIndex: number }) => ({
      minRowIndex: Math.min(anchor.rowIndex, current.rowIndex),
      maxRowIndex: Math.max(anchor.rowIndex, current.rowIndex),
      minColumnIndex: Math.min(anchor.columnIndex, current.columnIndex),
      maxColumnIndex: Math.max(anchor.columnIndex, current.columnIndex),
    }),
    []
  );

  // Check if a cell is within the selection range
  const isCellInSelection = useCallback(
    (rowIndex: number, columnIndex: number) => {
      if (!selectionRange) return false;
      return (
        rowIndex >= selectionRange.minRowIndex &&
        rowIndex <= selectionRange.maxRowIndex &&
        columnIndex >= selectionRange.minColumnIndex &&
        columnIndex <= selectionRange.maxColumnIndex
      );
    },
    [selectionRange]
  );

  // Check if a cell is on the edge of the selection
  const isSelectionEdge = useCallback(
    (edge: "top" | "bottom" | "left" | "right", rowIndex: number, columnIndex: number): boolean => {
      if (!selectionRange) return false;
      if (!isCellInSelection(rowIndex, columnIndex)) return false;

      switch (edge) {
        case "top":
          return rowIndex === selectionRange.minRowIndex;
        case "bottom":
          return rowIndex === selectionRange.maxRowIndex;
        case "left":
          return columnIndex === selectionRange.minColumnIndex;
        case "right":
          return columnIndex === selectionRange.maxColumnIndex;
      }
    },
    [selectionRange, isCellInSelection]
  );

  // Check if cell is in cut range for visual indicator
  const isCellInCutRange = useCallback(
    (rowIndex: number, columnIndex: number): boolean => {
      if (!clipboardData?.isCut) return false;
      const { sourceRange } = clipboardData;
      return (
        rowIndex >= sourceRange.minRow &&
        rowIndex <= sourceRange.maxRow &&
        columnIndex >= sourceRange.minCol &&
        columnIndex <= sourceRange.maxCol
      );
    },
    [clipboardData]
  );

  // Start a new selection (single click or arrow without shift)
  const startSelection = useCallback(
    (cellId: string, rowIndex: number, columnIndex: number) => {
      console.log("[DEBUG] startSelection called:", { cellId, rowIndex, columnIndex });
      setActiveCellId(cellId);
      setActiveCellRowIndex(rowIndex);
      setActiveCellColumnIndex(columnIndex);
      setSelectedHeaderColumnIndex(null);
      setSelectionAnchor({ rowIndex, columnIndex });
      setSelectionFocus({ rowIndex, columnIndex });
      setSelectionRange(null); // Single cell = no range highlight
    },
    []
  );

  // Extend selection from anchor to new position (shift+click or shift+arrow)
  // Note: activeCellId will be updated when the cell is accessed via table later
  const extendSelection = useCallback(
    (
      rowIndex: number,
      columnIndex: number,
      options?: {
        preserveActiveCell?: boolean;
      },
    ) => {
      // Use current anchor, or create one from active cell if none exists
      const anchor =
        selectionAnchor ??
        (activeCellRowIndex !== null && activeCellColumnIndex !== null
          ? { rowIndex: activeCellRowIndex, columnIndex: activeCellColumnIndex }
          : null);

      if (!anchor) return;

      // Set anchor if we didn't have one
      if (!selectionAnchor) {
        setSelectionAnchor(anchor);
      }

      // Compute and set the selection range
      const range = computeSelectionRange(anchor, { rowIndex, columnIndex });
      setSelectionRange(range);
      setSelectionFocus({ rowIndex, columnIndex });
      if (!options?.preserveActiveCell) {
        setActiveCellRowIndex(rowIndex);
        setActiveCellColumnIndex(columnIndex);
      }
    },
    [selectionAnchor, activeCellRowIndex, activeCellColumnIndex, computeSelectionRange]
  );

  // Clear all selection state
  const clearSelection = useCallback(() => {
    setActiveCellId(null);
    setActiveCellRowIndex(null);
    setActiveCellColumnIndex(null);
    setSelectedHeaderColumnIndex(null);
    setSelectionAnchor(null);
    setSelectionFocus(null);
    setSelectionRange(null);
    fillDragStateRef.current = null;
    setFillDragState(null);
  }, []);

  // Helper to get cell ref key
  const getCellRefKey = useCallback(
    (rowIndex: number, columnIndex: number) => `${rowIndex}-${columnIndex}`,
    [],
  );

  // Register cell ref
  const registerCellRef = useCallback(
    (rowIndex: number, columnIndex: number, element: HTMLTableCellElement | null) => {
      const key = getCellRefKey(rowIndex, columnIndex);
      if (element) {
        cellRefs.current.set(key, element);
      } else {
        cellRefs.current.delete(key);
      }
    },
    [getCellRefKey],
  );

  const getLinearFillRange = useCallback(
    (state: FillDragState) => {
      if (state.axis === "row") {
        if (
          state.hoverRowIndex >= state.sourceRange.minRowIndex &&
          state.hoverRowIndex <= state.sourceRange.maxRowIndex
        ) {
          return null;
        }
        return {
          minRowIndex: Math.min(state.sourceRange.minRowIndex, state.hoverRowIndex),
          maxRowIndex: Math.max(state.sourceRange.maxRowIndex, state.hoverRowIndex),
          minColumnIndex: state.sourceRange.minColumnIndex,
          maxColumnIndex: state.sourceRange.maxColumnIndex,
        };
      }
      if (state.axis === "column") {
        if (
          state.hoverColumnIndex >= state.sourceRange.minColumnIndex &&
          state.hoverColumnIndex <= state.sourceRange.maxColumnIndex
        ) {
          return null;
        }
        return {
          minRowIndex: state.sourceRange.minRowIndex,
          maxRowIndex: state.sourceRange.maxRowIndex,
          minColumnIndex: Math.min(state.sourceRange.minColumnIndex, state.hoverColumnIndex),
          maxColumnIndex: Math.max(state.sourceRange.maxColumnIndex, state.hoverColumnIndex),
        };
      }
      return null;
    },
    [],
  );

  const fillDragRange = useMemo(() => {
    if (!fillDragState) return null;
    return getLinearFillRange(fillDragState);
  }, [fillDragState, getLinearFillRange]);

  const fillHandlePosition = useMemo(() => {
    const activeRange = fillDragRange ?? selectionRange;
    if (activeRange) {
      return {
        rowIndex: activeRange.maxRowIndex,
        columnIndex: activeRange.maxColumnIndex,
      };
    }
    if (activeCellRowIndex === null || activeCellColumnIndex === null) return null;
    return {
      rowIndex: activeCellRowIndex,
      columnIndex: activeCellColumnIndex,
    };
  }, [fillDragRange, selectionRange, activeCellRowIndex, activeCellColumnIndex]);

  const getCellPositionFromPoint = useCallback((clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!(element instanceof Element)) return null;
    const cell = element.closest('[data-cell="true"]');
    if (!(cell instanceof HTMLTableCellElement)) return null;
    const rowIndex = Number.parseInt(cell.dataset.rowIndex ?? "", 10);
    const columnIndex = Number.parseInt(cell.dataset.columnIndex ?? "", 10);
    if (!Number.isFinite(rowIndex) || !Number.isFinite(columnIndex)) return null;
    if (columnIndex < 1) return null;
    return { rowIndex, columnIndex };
  }, []);

  const getRowIndexFromPoint = useCallback((clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!(element instanceof Element)) return null;
    const cell = element.closest('[data-cell="true"]');
    if (!(cell instanceof HTMLTableCellElement)) return null;
    const rowIndex = Number.parseInt(cell.dataset.rowIndex ?? "", 10);
    if (!Number.isFinite(rowIndex)) return null;
    return rowIndex;
  }, []);

  const handleFillHandleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, rowIndex: number, columnIndex: number) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      const sourceRange = selectionRange ?? {
        minRowIndex: rowIndex,
        maxRowIndex: rowIndex,
        minColumnIndex: columnIndex,
        maxColumnIndex: columnIndex,
      };
      const nextState: FillDragState = {
        anchorRowIndex: rowIndex,
        anchorColumnIndex: columnIndex,
        hoverRowIndex: rowIndex,
        hoverColumnIndex: columnIndex,
        axis: null,
        pointerStartX: event.clientX,
        pointerStartY: event.clientY,
        sourceRange,
      };
      fillDragStateRef.current = nextState;
      setFillDragState(nextState);
    },
    [selectionRange],
  );

  useEffect(() => {
    if (!fillDragState) return;

    const handleMouseMove = (event: MouseEvent) => {
      const nextCell = getCellPositionFromPoint(event.clientX, event.clientY);
      if (!nextCell) return;
      setFillDragState((prev) => {
        if (!prev) return prev;
        const pointerDeltaX = event.clientX - prev.pointerStartX;
        const pointerDeltaY = event.clientY - prev.pointerStartY;
        let nextAxis = prev.axis;
        if (Math.abs(pointerDeltaX) >= 4 || Math.abs(pointerDeltaY) >= 4) {
          nextAxis = Math.abs(pointerDeltaX) >= Math.abs(pointerDeltaY) ? "column" : "row";
        }
        const constrainedHoverRowIndex =
          nextAxis === "row"
            ? nextCell.rowIndex
            : prev.anchorRowIndex;
        const constrainedHoverColumnIndex =
          nextAxis === "column"
            ? nextCell.columnIndex
            : prev.anchorColumnIndex;
        if (
          prev.hoverRowIndex === constrainedHoverRowIndex &&
          prev.hoverColumnIndex === constrainedHoverColumnIndex &&
          prev.axis === nextAxis
        ) {
          return prev;
        }
        const nextState = {
          ...prev,
          hoverRowIndex: constrainedHoverRowIndex,
          hoverColumnIndex: constrainedHoverColumnIndex,
          axis: nextAxis,
        };
        fillDragStateRef.current = nextState;
        return nextState;
      });
    };

    const handleMouseUp = () => {
      const dragState = fillDragStateRef.current;
      if (!dragState) return;
      const nextRange = getLinearFillRange(dragState);
      const sourceIsSingleCell =
        dragState.sourceRange.minRowIndex === dragState.sourceRange.maxRowIndex &&
        dragState.sourceRange.minColumnIndex === dragState.sourceRange.maxColumnIndex;
      const isSingleCell =
        nextRange !== null &&
        nextRange.minRowIndex === nextRange.maxRowIndex &&
        nextRange.minColumnIndex === nextRange.maxColumnIndex;
      // Preserve the original active anchor cell while using the fill handle.
      if (!nextRange) {
        setSelectionRange(sourceIsSingleCell ? null : dragState.sourceRange);
      } else {
        setSelectionRange(isSingleCell ? null : nextRange);
      }
      fillDragStateRef.current = null;
      setFillDragState(null);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "crosshair";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
    };
  }, [fillDragState, getCellPositionFromPoint, getLinearFillRange]);

  // scrollToCell and keyboard handlers are defined after table/rowVirtualizer

  // Toggle all rows selection
  const toggleAllRowsSelection = () => {
    clearSelection();
    const allSelected = table.getIsAllRowsSelected();
    table.toggleAllRowsSelected(!allSelected);
  };

  const getFakerCellValue = useCallback(
    (field: TableField) => {
      const label = field.label.toLowerCase();
      if (label.includes("status")) {
        return faker.helpers.arrayElement(DEFAULT_TABLE_STATUS_OPTIONS);
      }
      if (label.includes("assignee") || label.includes("owner") || label.includes("assigned")) {
        return faker.person.firstName();
      }
      if (label.includes("note") || label.includes("notes")) {
        return faker.company.buzzPhrase();
      }
      if (label.includes("attachment") || label.includes("file")) {
        return createAttachmentLabel();
      }
      if (label.includes("name") || label.includes("title")) {
        return faker.company.buzzPhrase();
      }
      if (field.kind === "number") {
        return String(faker.number.int({ min: 1, max: 10_000 }));
      }
      return faker.word.words({ count: { min: 2, max: 4 } });
    },
    [],
  );

  const addRow = (options?: {
    scrollAlign?: "auto" | "start" | "center" | "end";
    scrollToTableBottomIfNeeded?: boolean;
  }) => {
    if (!activeTable) return null;
    const tableId = activeTable.id;
    const fieldsSnapshot = activeTable.fields;
    const nextRowIndex = activeTable.data.length;
    const scrollAlign = options?.scrollAlign ?? "auto";
    const scrollToTableBottomIfNeeded = options?.scrollToTableBottomIfNeeded ?? false;
    const shouldScrollToNewRow = (() => {
      if (options?.scrollAlign) return true;
      const container = tableContainerRef.current;
      if (!container) return true;
      const bottomThresholdPx = 6;
      const isBottomVisible =
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - bottomThresholdPx;
      return !isBottomVisible;
    })();
    const scrollTargetRowIndex =
      shouldScrollToNewRow && scrollToTableBottomIfNeeded
        ? Math.max(nextRowIndex, activeTableTotalRows)
        : nextRowIndex;
    const firstEditableColumnIndex = fieldsSnapshot.length > 0 ? 1 : null;
    const cells: Record<string, string> = {};
    fieldsSnapshot.forEach((field) => {
      cells[field.id] =
        field.defaultValue && field.defaultValue.length > 0
          ? field.defaultValue
          : getFakerCellValue(field);
    });
    const optimisticRowId = createClientRowId();
    const optimisticRow: TableRow = {
      id: optimisticRowId,
      ...cells,
    };

    updateTableById(tableId, (table) => ({
      ...table,
      nextRowId: table.nextRowId + 1,
      data: [...table.data, optimisticRow],
    }));

    setActiveCellId(null);
    setActiveCellRowIndex(nextRowIndex);
    setSelectedHeaderColumnIndex(null);
    fillDragStateRef.current = null;
    setFillDragState(null);
    if (firstEditableColumnIndex !== null) {
      setActiveCellColumnIndex(firstEditableColumnIndex);
      setSelectionAnchor({
        rowIndex: nextRowIndex,
        columnIndex: firstEditableColumnIndex,
      });
      setSelectionRange(null);
      if (shouldScrollToNewRow) {
        const effectiveAlign = scrollToTableBottomIfNeeded ? "end" : scrollAlign;
        requestAnimationFrame(() => {
          scrollToCell(scrollTargetRowIndex, firstEditableColumnIndex, effectiveAlign);
        });

        if (scrollToTableBottomIfNeeded) {
          void (async () => {
            try {
              const response = await utils.rows.getCount.fetch({
                tableId,
                forceRefresh: true,
              });
              const serverTotal = Math.max(0, response?.total ?? 0);
              const inferredTotal = Math.max(
                nextRowIndex + 1,
                serverTotal + (serverTotal <= nextRowIndex ? 1 : 0),
              );
              if (inferredTotal <= 0) return;
              applyRowTotal(inferredTotal);
              const reconciledTarget = inferredTotal - 1;

              const scrollToBottom = () => {
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    scrollToCell(reconciledTarget, firstEditableColumnIndex, "end");
                  });
                });
              };

              scrollToBottom();
              for (let attempt = 0; attempt < 4; attempt += 1) {
                await new Promise<void>((resolve) => {
                  window.setTimeout(() => resolve(), 90);
                });
                const container = tableContainerRef.current;
                const isAtBottom =
                  !!container &&
                  container.scrollTop + container.clientHeight >= container.scrollHeight - 8;
                if (isAtBottom) break;
                scrollToBottom();
              }
            } catch {
              // ignore; best-effort bottom scroll
            }
          })();
        }
      }
    } else {
      setActiveCellColumnIndex(null);
      setSelectionAnchor(null);
      setSelectionRange(null);
    }

    createRowMutation.mutate(
      {
        tableId,
        cells,
        clientUiId: optimisticRowId,
      },
      {
        onSuccess: (createdRow) => {
          if (!createdRow?.id) return;
          // Track mapping for resolving queued cell updates in optimistic columns
          const createdRowId = createdRow.id;
          optimisticRowIdToRealIdRef.current.set(optimisticRowId, createdRowId);
          resolveOptimisticRowId(optimisticRowId, createdRowId);
          void flushPendingRelativeInserts(optimisticRowId, createdRowId);
          const nextRow: TableRow = { id: optimisticRowId, serverId: createdRowId };
          const createdCells = (createdRow.cells ?? {}) as Record<string, unknown>;
          fieldsSnapshot.forEach((field) => {
            const value = createdCells[field.id];
            nextRow[field.id] = toCellText(value, field.defaultValue);
          });
          const queuedUpdates = consumeOptimisticRowCellUpdates(optimisticRowId);
          queuedUpdates.forEach((value, columnId) => {
            nextRow[columnId] = value;
          });
          updateTableById(tableId, (table) => ({
            ...table,
            data: (() => {
              const nextData = table.data.map((row) =>
                row?.id === optimisticRowId ? nextRow : row,
              );
              const firstIndex = nextData.findIndex((row) => row?.id === nextRow.id);
              if (firstIndex !== -1) {
                for (let index = 0; index < nextData.length; index += 1) {
                  if (index !== firstIndex && nextData[index]?.id === nextRow.id) {
                    nextData[index] = undefined;
                  }
                }
              }
              return nextData;
            })(),
          }));
          if (queuedUpdates.size > 0) {
            commitBulkCellUpdates(
              tableId,
              Array.from(queuedUpdates.entries()).map(([columnId, value]) => ({
                rowId: optimisticRowId,
                columnId,
                value,
              })),
            );
          }
          void utils.rows.listByTableId.invalidate({ tableId });
        },
        onError: () => {
          clearOptimisticRowCellUpdates(optimisticRowId);
          clearPendingRelativeInsertsForAnchor(optimisticRowId);
          updateTableById(tableId, (table) => ({
            ...table,
            data: removeRowByIdFromData(table.data, optimisticRowId),
          }));
        },
      },
    );
    return optimisticRowId;
  };

  const insertRowRelative = useCallback(
    ({
      anchorRowId,
      anchorRowIndex,
      position,
      overrideCells,
      focusColumnIndex,
      scrollAlign,
    }: {
      anchorRowId: string;
      anchorRowIndex: number;
      position: "above" | "below";
      overrideCells?: Record<string, string>;
      focusColumnIndex?: number;
      scrollAlign?: "auto" | "start" | "center" | "end";
    }) => {
      if (!activeTable) return;
      const tableId = activeTable.id;
      const fieldsSnapshot = activeTable.fields;

      const clampedAnchorIndex = clamp(anchorRowIndex, 0, activeTable.data.length - 1);
      const insertionIndex = clamp(
        clampedAnchorIndex + (position === "below" ? 1 : 0),
        0,
        activeTable.data.length,
      );

      const firstEditableColumnIndex = fieldsSnapshot.length > 0 ? 1 : null;
      const preferredColumnIndex =
        typeof focusColumnIndex === "number" && focusColumnIndex > 0
          ? focusColumnIndex
          : firstEditableColumnIndex;
    const cells: Record<string, string> = {};
    fieldsSnapshot.forEach((field) => {
      cells[field.id] =
        overrideCells?.[field.id] ??
        (field.defaultValue && field.defaultValue.length > 0
          ? field.defaultValue
          : getFakerCellValue(field));
    });

      const optimisticRowId = createClientRowId();
      const optimisticRow: TableRow = {
        id: optimisticRowId,
        ...cells,
      };

      suspendTableServerSync(tableId);
      updateTableById(tableId, (table) => ({
        ...table,
        nextRowId: table.nextRowId + 1,
        data: [
          ...table.data.slice(0, insertionIndex),
          optimisticRow,
          ...table.data.slice(insertionIndex),
        ],
      }));
      applyRowInsertionToRowStore(insertionIndex);

      setActiveCellId(null);
      setActiveCellRowIndex(insertionIndex);
      setSelectedHeaderColumnIndex(null);
      fillDragStateRef.current = null;
      setFillDragState(null);
      const resolvedScrollAlign = scrollAlign ?? "auto";
      if (preferredColumnIndex !== null) {
        setActiveCellColumnIndex(preferredColumnIndex);
        setSelectionAnchor({
          rowIndex: insertionIndex,
          columnIndex: preferredColumnIndex,
        });
        setSelectionFocus({
          rowIndex: insertionIndex,
          columnIndex: preferredColumnIndex,
        });
        setSelectionRange(null);
        requestAnimationFrame(() => {
          scrollToCellRef.current(
            insertionIndex,
            preferredColumnIndex,
            resolvedScrollAlign,
          );
        });
      } else {
        setActiveCellColumnIndex(null);
        setSelectionAnchor(null);
        setSelectionFocus(null);
        setSelectionRange(null);
      }

      enqueueInsertRelative(async () => {
        try {
          const createdRow = await insertRelativeRowMutation.mutateAsync({
            anchorRowId,
            position,
            cells,
          });
          if (!createdRow?.id) return;
          const createdRowId = createdRow.id;
          optimisticRowIdToRealIdRef.current.set(optimisticRowId, createdRowId);
          resolveOptimisticRowId(optimisticRowId, createdRowId);
          void flushPendingRelativeInserts(optimisticRowId, createdRowId);
          const nextRow: TableRow = { id: optimisticRowId, serverId: createdRowId };
          const createdCells = (createdRow.cells ?? {}) as Record<string, unknown>;
          fieldsSnapshot.forEach((field) => {
            const value = createdCells[field.id];
            nextRow[field.id] = toCellText(value, field.defaultValue);
          });
          const queuedUpdates = consumeOptimisticRowCellUpdates(optimisticRowId);
          queuedUpdates.forEach((value, columnId) => {
            nextRow[columnId] = value;
          });
          updateTableById(tableId, (table) => ({
            ...table,
            data: (() => {
              const nextData = table.data.map((row) =>
                row?.id === optimisticRowId ? nextRow : row,
              );
              const firstIndex = nextData.findIndex((row) => row?.id === nextRow.id);
              if (firstIndex !== -1) {
                for (let index = 0; index < nextData.length; index += 1) {
                  if (index !== firstIndex && nextData[index]?.id === nextRow.id) {
                    nextData[index] = undefined;
                  }
                }
              }
              return nextData;
            })(),
          }));
          if (queuedUpdates.size > 0) {
            commitBulkCellUpdates(
              tableId,
              Array.from(queuedUpdates.entries()).map(([columnId, value]) => ({
                rowId: optimisticRowId,
                columnId,
                value,
              })),
            );
          }
        } catch {
          clearOptimisticRowCellUpdates(optimisticRowId);
          updateTableById(tableId, (table) => {
            const index = table.data.findIndex((row) => row?.id === optimisticRowId);
            if (index !== -1) {
              applyRowDeletionToRowStore(index);
            }
            return {
              ...table,
              data: removeRowByIdFromData(table.data, optimisticRowId),
            };
          });
        } finally {
          // Trigger refetch with correct ordering, then allow server sync to resume.
          await utils.rows.listByTableId.invalidate({ tableId });
          resumeTableServerSync(tableId);
        }
      });
    },
    [
      activeTable,
      applyRowDeletionToRowStore,
      applyRowInsertionToRowStore,
      clearPendingRelativeInsertsForAnchor,
      clearOptimisticRowCellUpdates,
      commitBulkCellUpdates,
      consumeOptimisticRowCellUpdates,
      enqueueInsertRelative,
      insertRelativeRowMutation,
      flushPendingRelativeInserts,
      removeRowByIdFromData,
      resolveOptimisticRowId,
      suspendTableServerSync,
      updateTableById,
      resumeTableServerSync,
      utils.rows.listByTableId,
    ],
  );

  useEffect(() => {
    insertRowRelativeRef.current = insertRowRelative;
  }, [insertRowRelative]);

  const addRowsForDebug = useCallback(
    async (requestedCount: number): Promise<void> => {
      if (!activeTable) return;
      const normalizedCount = Math.max(
        1,
        Math.min(DEBUG_MAX_ROWS_PER_ADD, Math.floor(requestedCount)),
      );
      if (!Number.isFinite(normalizedCount)) return;

      const tableId = activeTable.id;
      const fieldsSnapshot = activeTable.fields;
      const buildCells = () => {
        const cells: Record<string, string> = {};
        fieldsSnapshot.forEach((field) => {
          cells[field.id] =
            field.defaultValue && field.defaultValue.length > 0
              ? field.defaultValue
              : getFakerCellValue(field);
        });
        return cells;
      };

      const optimisticRows: TableRow[] = Array.from({ length: normalizedCount }, () => ({
        id: createClientRowId(),
        ...buildCells(),
      }));
      const optimisticRowIds = optimisticRows.map((row) => row.id);

      updateTableById(tableId, (table) => ({
        ...table,
        nextRowId: table.nextRowId + normalizedCount,
        data: [...table.data, ...optimisticRows],
      }));

      try {
        const createdRows = await createRowsBulkMutation.mutateAsync({
          tableId,
          rows: Array.from({ length: normalizedCount }, () => ({
            cells: buildCells(),
          })),
        });

        const replacementByOptimisticId = new Map<string, TableRow>();
        for (let index = 0; index < optimisticRowIds.length; index += 1) {
          const optimisticId = optimisticRowIds[index];
          const createdRow = createdRows[index];
          if (!optimisticId || !createdRow?.id) continue;
          const createdRowId = createdRow.id;
          // Track mapping for resolving queued cell updates in optimistic columns
          optimisticRowIdToRealIdRef.current.set(optimisticId, createdRowId);
          resolveOptimisticRowId(optimisticId, createdRowId);
          void flushPendingRelativeInserts(optimisticId, createdRowId);
          const nextRow: TableRow = { id: optimisticId, serverId: createdRowId };
          const createdCells = (createdRow.cells ?? {}) as Record<string, unknown>;
          fieldsSnapshot.forEach((field) => {
            const value = createdCells[field.id];
            nextRow[field.id] = toCellText(value, field.defaultValue);
          });
          replacementByOptimisticId.set(optimisticId, nextRow);
        }

        const unresolvedOptimisticIds = new Set(
          optimisticRowIds.filter((id) => !replacementByOptimisticId.has(id)),
        );

        updateTableById(tableId, (table) => ({
          ...table,
          data: removeRowIdsFromData(
            table.data.map((row) =>
              row?.id ? (replacementByOptimisticId.get(row.id) ?? row) : row,
            ),
            unresolvedOptimisticIds,
          ),
        }));

        await utils.rows.listByTableId.invalidate({ tableId });
      } catch (error) {
        const optimisticIdSet = new Set(optimisticRowIds);
        optimisticRowIds.forEach((optimisticId) => {
          clearPendingRelativeInsertsForAnchor(optimisticId);
        });
        updateTableById(tableId, (table) => ({
          ...table,
          data: removeRowIdsFromData(table.data, optimisticIdSet),
        }));
        throw error;
      }
    },
    [
      activeTable,
      clearPendingRelativeInsertsForAnchor,
      createRowsBulkMutation,
      flushPendingRelativeInserts,
      getFakerCellValue,
      removeRowIdsFromData,
      resolveOptimisticRowId,
      updateTableById,
      utils.rows.listByTableId,
    ],
  );

  const handleDebugAddRowsSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const parsedCount = Number.parseInt(debugAddRowsCount, 10);
      if (!Number.isFinite(parsedCount) || parsedCount <= 0) return;
      void addRowsForDebug(parsedCount);
      setIsDebugAddRowsOpen(false);
      setIsBottomAddRecordMenuOpen(false);
    },
    [debugAddRowsCount, addRowsForDebug],
  );

  const handleAddOneHundredThousandRows = useCallback(() => {
    if (!activeTable || isAddingHundredThousandRows) return;

    const tableId = activeTable.id;
    const startRecordCount = Math.max(activeTableTotalRows, activeTable.data.length);
    const fakerFields: Array<{
      id: string;
      label: string;
      kind: "number" | "singleLineText";
    }> = activeTable.fields.map((field) => ({
      id: field.id,
      label: field.label,
      kind: field.kind === "number" ? "number" : "singleLineText",
    }));
    const baseCells: Record<string, string> = {};
    activeTable.fields.forEach((field) => {
      baseCells[field.id] =
        field.defaultValue && field.defaultValue.length > 0
          ? field.defaultValue
          : getFakerCellValue(field);
    });
    const buildCells = () => {
      const cells: Record<string, string> = {};
      activeTable.fields.forEach((field) => {
        cells[field.id] =
          field.defaultValue && field.defaultValue.length > 0
            ? field.defaultValue
            : getFakerCellValue(field);
      });
      return cells;
    };

    setIsBottomAddRecordMenuOpen(false);
    setIsDebugAddRowsOpen(false);
    setBulkAddStartRecordCount(startRecordCount);
    setBulkAddInsertedRowCount(0);
    setIsAddingHundredThousandRows(true);
    if (typeof window !== "undefined") {
      const pendingKey = `airtable-clone.bulkAddPending.${tableId}`;
      const targetTotal = startRecordCount + BULK_ADD_100K_ROWS_COUNT;
      window.localStorage.setItem(
        pendingKey,
        JSON.stringify({
          targetTotal,
          baseCells,
          generateFaker: true,
          fields: fakerFields,
        }),
      );
    }
    const store = rowStoreRef.current;
    if (store) {
      const nextTotal = Math.max(store.total, startRecordCount) + BULK_ADD_100K_ROWS_COUNT;
      if (nextTotal !== store.total) {
        store.total = nextTotal;
        setRowStoreVersion((prev) => prev + 1);
      }
    }

    const firstVisibleBatchCount = Math.min(ROWS_PAGE_SIZE, BULK_ADD_100K_ROWS_COUNT);
    const waitForNextPaint = () =>
      new Promise<void>((resolve) => {
        if (typeof window === "undefined") {
          resolve();
          return;
        }
        window.requestAnimationFrame(() => resolve());
      });

    void (async () => {
      try {
        // Make the add feel instant while the rest continues in background.
        await addRowsForDebug(firstVisibleBatchCount);
        let insertedSoFar = firstVisibleBatchCount;
        setBulkAddInsertedRowCount(insertedSoFar);
        await waitForNextPaint();

        const remainingCount = BULK_ADD_100K_ROWS_COUNT - insertedSoFar;
        let generatedTotal: number | null = null;
        if (remainingCount > 0) {
          let insertedRemaining = 0;
          try {
            const result = await createRowsGeneratedMutation.mutateAsync({
              tableId,
              count: remainingCount,
              generateFaker: true,
              fields: fakerFields,
            });
            insertedRemaining = result.inserted;
            generatedTotal = result.total;
            if (isDev) {
              // eslint-disable-next-line no-console
              console.log("[bulkAdd] rows.bulkCreateGenerated total", result.total);
            }
          } catch (error) {
            if (isDev) {
              // eslint-disable-next-line no-console
              console.error("[bulkAdd] rows.bulkCreateGenerated failed", error);
            }
            const fallbackChunkSize = 1000;
            while (insertedRemaining < remainingCount) {
              const chunkSize = Math.min(fallbackChunkSize, remainingCount - insertedRemaining);
              let createdRows: Awaited<ReturnType<typeof createRowsBulkMutation.mutateAsync>> = [];
              try {
                createdRows = await createRowsBulkMutation.mutateAsync({
                  tableId,
                  rows: Array.from({ length: chunkSize }, () => ({ cells: buildCells() })),
                });
              } catch (bulkError) {
                if (isDev) {
                  // eslint-disable-next-line no-console
                  console.error("[bulkAdd] rows.bulkCreate fallback failed", bulkError);
                }
                break;
              }
              insertedRemaining += createdRows.length;
              insertedSoFar += createdRows.length;
              setBulkAddInsertedRowCount(insertedSoFar);
              const store = rowStoreRef.current;
              if (store) {
                const nextTotal = Math.max(store.total, startRecordCount + insertedSoFar);
                if (nextTotal !== store.total) {
                  store.total = nextTotal;
                  setRowStoreVersion((prev) => prev + 1);
                }
              }
              await waitForNextPaint();
            }
          }

          insertedSoFar += insertedRemaining;
          setBulkAddInsertedRowCount(insertedSoFar);
          const store = rowStoreRef.current;
          if (store) {
            const nextTotal = Math.max(store.total, startRecordCount + insertedSoFar);
            if (nextTotal !== store.total) {
              store.total = nextTotal;
              setRowStoreVersion((prev) => prev + 1);
            }
          }
          await waitForNextPaint();
        }

        const targetTotal = startRecordCount + BULK_ADD_100K_ROWS_COUNT;
        try {
          const countResult = await utils.rows.getCount.fetch({ tableId });
          const confirmedTotal = Math.max(
            countResult?.total ?? 0,
            generatedTotal ?? 0,
          );
          if (confirmedTotal > 0) {
            applyRowTotal(confirmedTotal);
          }
          if (confirmedTotal < targetTotal) {
            let missing = targetTotal - confirmedTotal;
            const fallbackChunkSize = 1000;
            while (missing > 0) {
              const chunkSize = Math.min(fallbackChunkSize, missing);
              await createRowsBulkMutation.mutateAsync({
                tableId,
                rows: Array.from({ length: chunkSize }, () => ({ cells: buildCells() })),
              });
              missing -= chunkSize;
              insertedSoFar += chunkSize;
              setBulkAddInsertedRowCount(insertedSoFar);
              const store = rowStoreRef.current;
              if (store) {
                const nextTotal = Math.max(store.total, startRecordCount + insertedSoFar);
                if (nextTotal !== store.total) {
                  store.total = nextTotal;
                  setRowStoreVersion((prev) => prev + 1);
                }
              }
              await waitForNextPaint();
            }
          }
          if (typeof window !== "undefined" && confirmedTotal >= targetTotal) {
            const pendingKey = `airtable-clone.bulkAddPending.${tableId}`;
            window.localStorage.removeItem(pendingKey);
          }
        } catch (error) {
          if (isDev) {
            // eslint-disable-next-line no-console
            console.error("[bulkAdd] post-check failed", error);
          }
        }

        await utils.rows.listByTableId.invalidate({ tableId });
        void prepareIndexesMutation.mutateAsync({ tableId }).catch(() => {
          // best-effort preindex after bulk insert
        });
      } catch (error) {
        if (isDev) {
          // eslint-disable-next-line no-console
          console.error("[bulkAdd] failed", error);
        }
        const store = rowStoreRef.current;
        if (store) {
          const nextTotal = Math.max(store.total, startRecordCount + firstVisibleBatchCount);
          if (nextTotal !== store.total) {
            store.total = nextTotal;
            setRowStoreVersion((prev) => prev + 1);
          }
        }
      } finally {
        setIsAddingHundredThousandRows(false);
        setBulkAddStartRecordCount(null);
        setBulkAddInsertedRowCount(0);
      }
    })();
  }, [
    activeTable,
    activeTableTotalRows,
    addRowsForDebug,
    applyRowTotal,
    createRowsGeneratedMutation,
    getFakerCellValue,
    isAddingHundredThousandRows,
    prepareIndexesMutation,
    utils.rows.getCount,
    utils.rows.listByTableId,
  ]);

  // DnD Kit sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px drag before activating
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag start to show overlay
  const handleDragStart = (event: DragStartEvent) => {
    const rowDragCursorClass = styles.rowDragCursor;
    if (!isRowDragEnabled) return;
    if (dragOverRafRef.current !== null) {
      window.cancelAnimationFrame(dragOverRafRef.current);
      dragOverRafRef.current = null;
    }
    pendingOverRowIdRef.current = null;
    setDropTargetRow(null);
    if (typeof document !== "undefined" && rowDragCursorClass) {
      document.body.classList.add(rowDragCursorClass);
    }
    setActiveRowId(event.active.id as string);
  };

  // Handle drag over to show drop indicator
  const handleDragOver = (event: DragOverEvent) => {
    if (!isRowDragEnabled) return;
    const { over } = event;
    const nextOverId = over && over.id !== activeRowId ? (over.id as string) : null;
    if (pendingOverRowIdRef.current === nextOverId) return;
    pendingOverRowIdRef.current = nextOverId;
    if (dragOverRafRef.current !== null) return;
    dragOverRafRef.current = window.requestAnimationFrame(() => {
      dragOverRafRef.current = null;
      setDropTargetRow(pendingOverRowIdRef.current);
    });
  };

  // Handle drag end to reorder rows
  const handleDragEnd = (event: DragEndEvent) => {
    const rowDragCursorClass = styles.rowDragCursor;
    if (!isRowDragEnabled) return;
    const { active, over } = event;

    setActiveRowId(null);
    if (dragOverRafRef.current !== null) {
      window.cancelAnimationFrame(dragOverRafRef.current);
      dragOverRafRef.current = null;
    }
    pendingOverRowIdRef.current = null;
    setDropTargetRow(null);
    if (typeof document !== "undefined" && rowDragCursorClass) {
      document.body.classList.remove(rowDragCursorClass);
    }

    if (over && active.id !== over.id) {
      updateActiveTableData((items) => {
        const oldIndex = items.findIndex((item) => item?.id === active.id);
        const newIndex = items.findIndex((item) => item?.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return items;

        const newItems = [...items];
        const movedItem = newItems[oldIndex];
        if (!movedItem) return items;
        newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);

        return newItems;
      });
    }
  };

  const windowRowCount = useMemo(() => {
    if (data.length === 0) return 0;
    const start = Math.max(0, renderWindowStart);
    const end = Math.min(renderWindowEnd, data.length - 1);
    return end >= start ? end - start + 1 : 0;
  }, [data.length, renderWindowEnd, renderWindowStart]);
  const isRowDragEnabled =
    windowRowCount > 0 && windowRowCount <= ROW_DND_MAX_ROWS && !hasEffectiveRowSort;
  // Get row IDs for sortable context (only current window to avoid huge lists)
  const rowIds = useMemo(() => {
    if (!isRowDragEnabled) return [];
    const slice = data.slice(renderWindowStart, renderWindowEnd + 1);
    return slice.flatMap((row) => (row && !isPlaceholderRow(row) ? [row.id] : []));
  }, [data, isPlaceholderRow, isRowDragEnabled, renderWindowEnd, renderWindowStart]);

  const filterGroupDragIds = useMemo(
    () => filterGroups.map((group) => getFilterGroupDragId(group.id)),
    [filterGroups],
  );
  const lastFilterDragOverRef = useRef<DragOverEvent["over"] | null>(null);

  const filterSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const filterCollisionDetection: CollisionDetection = useCallback((args) => {
    const activeData = args.active.data.current as FilterDragData | undefined;
    if (!activeData) {
      return closestCenter(args);
    }
    const filteredContainers = args.droppableContainers.filter((container) => {
      const data = container.data.current as FilterDragData | undefined;
      if (!data) return false;
      if (activeData.type === "filter-group") {
        if (data.type === "filter-group") return true;
        if (activeData.mode === "single") {
          return data.type === "filter-group-drop" || data.type === "filter-condition" || data.type === "filter-root-drop";
        }
        return false;
      }
      if (activeData.type === "filter-condition") {
        return data.type === "filter-condition" || data.type === "filter-group-drop" || data.type === "filter-root-drop";
      }
      return false;
    });
    if (filteredContainers.length === 0) {
      return closestCenter(args);
    }
    return closestCenter({
      ...args,
      droppableContainers: filteredContainers,
    });
  }, []);

  const moveFilterGroup = useCallback((activeGroupId: string, overGroupId: string) => {
    if (activeGroupId === overGroupId) return;
    setFilterGroups((prev) => {
      const oldIndex = prev.findIndex((group) => group.id === activeGroupId);
      const newIndex = prev.findIndex((group) => group.id === overGroupId);
      if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }, []);

  const moveFilterCondition = useCallback(
    (groupId: string, activeConditionId: string, overConditionId: string) => {
      if (activeConditionId === overConditionId) return;
      setFilterGroups((prev) =>
        prev.map((group) => {
          if (group.id !== groupId) return group;
          const oldIndex = group.conditions.findIndex(
            (condition) => condition.id === activeConditionId,
          );
          const newIndex = group.conditions.findIndex(
            (condition) => condition.id === overConditionId,
          );
          if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return group;
          return {
            ...group,
            conditions: arrayMove(group.conditions, oldIndex, newIndex),
          };
        }),
      );
    },
    [],
  );

  const moveFilterConditionToGroup = useCallback(
    (
      sourceGroupId: string,
      conditionId: string,
      targetGroupId: string,
      targetIndex?: number,
    ) => {
      setFilterGroups((prev) => {
        const sourceGroup = prev.find((group) => group.id === sourceGroupId);
        const targetGroup = prev.find((group) => group.id === targetGroupId);
        if (!sourceGroup || !targetGroup) return prev;

        const condition = sourceGroup.conditions.find(
          (entry) => entry.id === conditionId,
        );
        if (!condition) return prev;

        if (sourceGroupId === targetGroupId) {
          const oldIndex = sourceGroup.conditions.findIndex(
            (entry) => entry.id === conditionId,
          );
          const nextIndex =
            typeof targetIndex === "number"
              ? Math.max(0, Math.min(targetIndex, sourceGroup.conditions.length - 1))
              : sourceGroup.conditions.length - 1;
          if (oldIndex === -1 || oldIndex === nextIndex) return prev;
          return prev.map((group) =>
            group.id === sourceGroupId
              ? { ...group, conditions: arrayMove(group.conditions, oldIndex, nextIndex) }
              : group,
          );
        }

        const targetJoin = targetGroup.conditions[1]?.join ?? "and";
        const normalizedCondition: FilterCondition = {
          ...condition,
          join: targetJoin,
        };

        return prev
          .map((group) => {
            if (group.id === sourceGroupId) {
              const nextConditions = group.conditions.filter(
                (entry) => entry.id !== conditionId,
              );
              return {
                ...group,
                conditions: nextConditions,
              };
            }
            if (group.id === targetGroupId) {
              const nextConditions = [...group.conditions];
              const insertIndex =
                typeof targetIndex === "number"
                  ? Math.max(0, Math.min(targetIndex, nextConditions.length))
                  : nextConditions.length;
              nextConditions.splice(insertIndex, 0, normalizedCondition);
              return {
                ...group,
                mode:
                  group.mode === "single" && nextConditions.length > 1 ? "group" : group.mode,
                conditions: nextConditions,
              };
            }
            return group;
          })
          .filter((group) => group.conditions.length > 0);
      });
    },
    [],
  );

  const extractConditionToNewGroup = useCallback(
    (sourceGroupId: string, conditionId: string, insertIndex: number) => {
      setFilterGroups((prev) => {
        const sourceGroup = prev.find((group) => group.id === sourceGroupId);
        if (!sourceGroup) return prev;

        const condition = sourceGroup.conditions.find(
          (entry) => entry.id === conditionId,
        );
        if (!condition) return prev;

        // If source group only has this one condition, just move the whole group
        if (sourceGroup.conditions.length === 1) {
          const sourceIndex = prev.findIndex((g) => g.id === sourceGroupId);
          if (sourceIndex === -1 || sourceIndex === insertIndex) return prev;
          return arrayMove(prev, sourceIndex, insertIndex > sourceIndex ? insertIndex - 1 : insertIndex);
        }

        // Extract condition and create new single-mode group
        const newGroup: FilterConditionGroup = {
          id: createOptimisticId("filter-group"),
          mode: "single",
          join: "and",
          conditions: [{ ...condition, join: "and" }],
        };

        // Remove from source and insert new group
        const withoutCondition = prev.map((group) =>
          group.id === sourceGroupId
            ? { ...group, conditions: group.conditions.filter((c) => c.id !== conditionId) }
            : group,
        );

        const result = [...withoutCondition];
        result.splice(insertIndex, 0, newGroup);
        return result.filter((group) => group.conditions.length > 0);
      });
    },
    [],
  );

  const handleFilterDragStart = useCallback((event: DragStartEvent) => {
    const activeData = event.active.data.current as FilterDragData | undefined;
    if (!activeData) return;
    lastFilterDragOverRef.current = null;
  }, []);

  const applyFilterDrag = useCallback(
    (activeData: FilterDragData, overData: FilterDragData) => {
      if (activeData.type === "filter-group") {
        if (overData.type === "filter-group") {
          moveFilterGroup(activeData.groupId, overData.groupId);
          return;
        }
        if (activeData.mode === "single" && activeData.conditionId) {
          if (overData.type === "filter-condition") {
            const targetGroup = filterGroups.find((group) => group.id === overData.groupId);
            const targetIndex = targetGroup
              ? targetGroup.conditions.findIndex(
                  (entry) => entry.id === overData.conditionId,
                )
              : -1;
            if (targetIndex >= 0) {
              moveFilterConditionToGroup(
                activeData.groupId,
                activeData.conditionId,
                overData.groupId,
                targetIndex,
              );
            }
            return;
          }
          if (overData.type === "filter-group-drop") {
            moveFilterConditionToGroup(
              activeData.groupId,
              activeData.conditionId,
              overData.groupId,
            );
            return;
          }
          if (overData.type === "filter-root-drop") {
            const currentIndex = filterGroups.findIndex((g) => g.id === activeData.groupId);
            if (currentIndex !== -1 && currentIndex !== overData.index) {
              const targetIndex = overData.index > currentIndex ? overData.index - 1 : overData.index;
              setFilterGroups((prev) => arrayMove(prev, currentIndex, targetIndex));
            }
          }
        }
        return;
      }
      if (activeData.type === "filter-condition") {
        if (overData.type === "filter-condition") {
          if (activeData.groupId === overData.groupId) {
            moveFilterCondition(activeData.groupId, activeData.conditionId, overData.conditionId);
            return;
          }
          const targetGroup = filterGroups.find((group) => group.id === overData.groupId);
          const targetIndex = targetGroup
            ? targetGroup.conditions.findIndex((entry) => entry.id === overData.conditionId)
            : -1;
          if (targetIndex >= 0) {
            moveFilterConditionToGroup(
              activeData.groupId,
              activeData.conditionId,
              overData.groupId,
              targetIndex,
            );
          }
          return;
        }
        if (overData.type === "filter-group-drop") {
          moveFilterConditionToGroup(
            activeData.groupId,
            activeData.conditionId,
            overData.groupId,
          );
          return;
        }
        if (overData.type === "filter-root-drop") {
          extractConditionToNewGroup(
            activeData.groupId,
            activeData.conditionId,
            overData.index,
          );
        }
      }
    },
    [extractConditionToNewGroup, filterGroups, moveFilterCondition, moveFilterConditionToGroup, moveFilterGroup],
  );

  const handleFilterDragOver = useCallback((event: DragOverEvent) => {
    lastFilterDragOverRef.current = event.over ?? null;
  }, []);

  const handleFilterDragEnd = useCallback(
    (event: DragEndEvent) => {
      const activeData = event.active.data.current as FilterDragData | undefined;
      if (!activeData) return;
      const over = event.over ?? lastFilterDragOverRef.current;
      if (!over) return;
      const overData = over.data.current as FilterDragData | undefined;
      if (!overData) return;
      applyFilterDrag(activeData, overData);
    },
    [applyFilterDrag],
  );

  const createFilterCondition = useCallback(
    (join: FilterJoin): FilterCondition => {
      const initialField = tableFields[0];
      return {
        id: createOptimisticId("filter"),
        columnId: initialField?.id ?? "",
        operator: getDefaultFilterOperatorForField(initialField?.kind),
        value: "",
        join,
      };
    },
    [tableFields],
  );

  const createFilterGroup = useCallback(
    (join: FilterJoin, mode: "group" | "single"): FilterConditionGroup => ({
      id: createOptimisticId("filter-group"),
      mode,
      join,
      conditions: [createFilterCondition("and")],
    }),
    [createFilterCondition],
  );

  const addFilterCondition = useCallback(() => {
    setFilterGroups((prev) => {
      return [...prev, createFilterGroup(prev.length === 0 ? "and" : "and", "single")];
    });
  }, [createFilterGroup]);

  const addFilterConditionGroup = useCallback(() => {
    setFilterGroups((prev) => [
      ...prev,
      createFilterGroup(prev.length === 0 ? "and" : "and", "group"),
    ]);
  }, [createFilterGroup]);

  const updateFilterCondition = useCallback(
    (
      groupId: string,
      conditionId: string,
      updater: (condition: FilterCondition) => FilterCondition,
    ) => {
      setFilterGroups((prev) =>
        prev.map((group) =>
          group.id !== groupId
            ? group
            : {
                ...group,
                conditions: group.conditions.map((condition) =>
                  condition.id === conditionId ? updater(condition) : condition,
                ),
              },
        ),
      );
    },
    [],
  );

  const handleFilterFieldSelect = useCallback(
    (groupId: string, conditionId: string, nextColumnId: string) => {
      const nextField = tableFields.find((field) => field.id === nextColumnId);
      const nextOperator = getDefaultFilterOperatorForField(nextField?.kind);
      updateFilterCondition(groupId, conditionId, (current) => ({
        ...current,
        columnId: nextColumnId,
        operator: nextOperator,
        value: operatorRequiresValue(nextOperator) ? current.value : "",
      }));
    },
    [tableFields, updateFilterCondition],
  );

  const handleFilterOperatorSelect = useCallback(
    (groupId: string, conditionId: string, nextOperator: FilterOperator) => {
      updateFilterCondition(groupId, conditionId, (current) => ({
        ...current,
        operator: nextOperator,
        value: operatorRequiresValue(nextOperator) ? current.value : "",
      }));
    },
    [updateFilterCondition],
  );

  const removeFilterCondition = useCallback((groupId: string, conditionId: string) => {
    setFilterGroups((prev) =>
      prev
        .map((group) =>
          group.id !== groupId
            ? group
            : {
                ...group,
                conditions: group.conditions.filter((condition) => condition.id !== conditionId),
              },
        )
        .filter((group) => group.conditions.length > 0),
    );
  }, []);

  const removeFilterGroup = useCallback((groupId: string) => {
    setFilterGroups((prev) => prev.filter((group) => group.id !== groupId));
  }, []);

  const buildUniqueFieldName = useCallback(
    (baseName: string, skipFieldId?: string) => {
      const normalizedBase = baseName.trim() || "Field";
      const existing = new Set(
        tableFields
          .filter((field) => field.id !== skipFieldId)
          .map((field) => field.label.trim().toLowerCase()),
      );
      if (!existing.has(normalizedBase.toLowerCase())) {
        return normalizedBase;
      }
      let suffix = 2;
      while (existing.has(`${normalizedBase} ${suffix}`.toLowerCase())) {
        suffix += 1;
      }
      return `${normalizedBase} ${suffix}`;
    },
    [tableFields],
  );

  const registerColumnHeaderRef = useCallback(
    (columnId: string, element: HTMLTableCellElement | null) => {
      if (element) {
        columnHeaderRefs.current.set(columnId, element);
        return;
      }
      columnHeaderRefs.current.delete(columnId);
    },
    [],
  );

  const resetColumnDragState = useCallback(() => {
    setDraggingColumnId(null);
    setColumnDropTargetIndex(null);
    setColumnDropAnchorId(null);
    setColumnDropIndicatorLeft(null);
  }, []);

  const getColumnDropMeta = useCallback(
    (clientX: number, activeColumnId: string) => {
      const container = tableContainerRef.current;
      if (!container || visibleFieldIds.length === 0) return null;

      const headerRects = visibleFieldIds
        .map((fieldId) => {
          const element = columnHeaderRefs.current.get(fieldId);
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return {
            fieldId,
            left: rect.left,
            right: rect.right,
            midpoint: rect.left + rect.width / 2,
          };
        })
        .filter(
          (
            rect,
          ): rect is {
            fieldId: string;
            left: number;
            right: number;
            midpoint: number;
          } => Boolean(rect),
        );

      if (headerRects.length === 0) return null;

      let insertionPosition = headerRects.length;
      for (let index = 0; index < headerRects.length; index += 1) {
        if (clientX < headerRects[index]!.midpoint) {
          insertionPosition = index;
          break;
        }
      }

      const activeIndex = visibleFieldIds.indexOf(activeColumnId);
      if (activeIndex === -1) return null;

      const visibleWithoutActive = visibleFieldIds.filter((fieldId) => fieldId !== activeColumnId);
      let targetIndex = insertionPosition;
      if (targetIndex > activeIndex) {
        targetIndex -= 1;
      }
      targetIndex = Math.max(0, Math.min(visibleWithoutActive.length, targetIndex));

      const containerRect = container.getBoundingClientRect();
      let indicatorViewportLeft = headerRects[0]!.left;
      let anchorId: string | null = null;

      if (targetIndex === 0) {
        indicatorViewportLeft = headerRects[0]!.left;
      } else {
        anchorId = visibleWithoutActive[targetIndex - 1] ?? null;
        const anchorRect = anchorId
          ? columnHeaderRefs.current.get(anchorId)?.getBoundingClientRect()
          : null;
        indicatorViewportLeft = anchorRect?.right ?? headerRects[headerRects.length - 1]!.right;
      }

      const indicatorLeft =
        indicatorViewportLeft - containerRect.left + container.scrollLeft;

      return { targetIndex, anchorId, indicatorLeft };
    },
    [visibleFieldIds],
  );

  const applyColumnDragReorder = useCallback(
    async (activeColumnId: string, targetIndex: number) => {
      if (!activeTable) return;
      const activeIndex = visibleFieldIds.indexOf(activeColumnId);
      if (activeIndex === -1) return;

      const visibleWithoutActive = visibleFieldIds.filter((fieldId) => fieldId !== activeColumnId);
      const clampedTargetIndex = Math.max(
        0,
        Math.min(visibleWithoutActive.length, targetIndex),
      );

      if (activeIndex === clampedTargetIndex) {
        return;
      }

      const draggedField = activeTable.fields.find((field) => field.id === activeColumnId);
      if (!draggedField) return;
      const fieldsWithoutDragged = activeTable.fields.filter(
        (field) => field.id !== activeColumnId,
      );

      let nextFields: TableField[];
      const insertBeforeId = visibleWithoutActive[clampedTargetIndex] ?? null;

      if (insertBeforeId) {
        const insertBeforeIndex = fieldsWithoutDragged.findIndex(
          (field) => field.id === insertBeforeId,
        );
        if (insertBeforeIndex === -1) return;
        nextFields = [
          ...fieldsWithoutDragged.slice(0, insertBeforeIndex),
          draggedField,
          ...fieldsWithoutDragged.slice(insertBeforeIndex),
        ];
      } else {
        const lastVisibleId = visibleWithoutActive[visibleWithoutActive.length - 1];
        if (!lastVisibleId) return;
        const lastVisibleIndex = fieldsWithoutDragged.findIndex(
          (field) => field.id === lastVisibleId,
        );
        const insertionIndex =
          lastVisibleIndex === -1 ? fieldsWithoutDragged.length : lastVisibleIndex + 1;
        nextFields = [
          ...fieldsWithoutDragged.slice(0, insertionIndex),
          draggedField,
          ...fieldsWithoutDragged.slice(insertionIndex),
        ];
      }

      if (nextFields.every((field, index) => field.id === activeTable.fields[index]?.id)) {
        return;
      }

      updateActiveTable((table) => ({
        ...table,
        fields: nextFields,
      }));

      try {
        await reorderColumnsMutation.mutateAsync({
          tableId: activeTable.id,
          columnIds: nextFields.map((field) => field.id),
        });
      } finally {
        await utils.tables.getBootstrap.invalidate({ tableId: activeTable.id });
      }
    },
    [activeTable, visibleFieldIds, updateActiveTable, reorderColumnsMutation, utils.tables.getBootstrap],
  );

  const handleColumnHeaderDragStart = useCallback(
    (event: React.DragEvent<HTMLTableCellElement>, columnId: string) => {
      const target = event.target as Element | null;
      if (target?.closest('[data-column-resizer="true"]')) {
        event.preventDefault();
        return;
      }
      const headerRect = event.currentTarget.getBoundingClientRect();
      const distanceFromRightEdge = headerRect.right - event.clientX;
      if (distanceFromRightEdge <= 12) {
        event.preventDefault();
        return;
      }
      setDraggingColumnId(columnId);
      // Clear any header selection and active cell/selection state so the
      // previously-selected column fully un-highlights while dragging.
      setSelectedHeaderColumnIndex(null);
      setSelectionAnchor(null);
      setSelectionFocus(null);
      setSelectionRange(null);
      setActiveCellId(null);
      setActiveCellRowIndex(null);
      setActiveCellColumnIndex(null);
      setColumnDropTargetIndex(null);
      setColumnDropAnchorId(null);
      setColumnDropIndicatorLeft(null);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", columnId);
      setIsColumnFieldMenuOpen(false);
      setIsEditFieldPopoverOpen(false);
    },
    [],
  );

  const handleColumnHeaderDragOver = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      if (!draggingColumnId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      const meta = getColumnDropMeta(event.clientX, draggingColumnId);
      if (!meta) return;
      setColumnDropTargetIndex(meta.targetIndex);
      setColumnDropAnchorId(meta.anchorId);
      setColumnDropIndicatorLeft(meta.indicatorLeft);
    },
    [draggingColumnId, getColumnDropMeta],
  );

  const handleColumnHeaderDrop = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      if (!draggingColumnId) return;
      event.preventDefault();
      const activeColumnId = draggingColumnId;
      const meta = getColumnDropMeta(event.clientX, activeColumnId);
      const targetIndex = meta?.targetIndex ?? columnDropTargetIndex;
      resetColumnDragState();
      if (targetIndex === null) return;
      void applyColumnDragReorder(activeColumnId, targetIndex);
    },
    [
      draggingColumnId,
      getColumnDropMeta,
      columnDropTargetIndex,
      resetColumnDragState,
      applyColumnDragReorder,
    ],
  );

  const handleColumnHeaderDragEnd = useCallback(() => {
    resetColumnDragState();
  }, [resetColumnDragState]);

  const closeColumnFieldMenu = useCallback(() => {
    setIsColumnFieldMenuOpen(false);
  }, []);

  const closeEditFieldPopover = useCallback(() => {
    setIsEditFieldPopoverOpen(false);
  }, []);

  const closeRowContextMenu = useCallback(() => {
    setRowContextMenu(null);
  }, []);

  const openRowContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>, rowId: string, rowIndex: number) => {
      event.preventDefault();
      event.stopPropagation();
      rowContextMenuAnchorRef.current = event.currentTarget as HTMLElement;
      const menuWidth = 240;
      const menuHeight = 480;
      const gap = 8;
      const left = Math.max(gap, Math.min(event.clientX, window.innerWidth - menuWidth - gap));
      const top = Math.max(gap, Math.min(event.clientY, window.innerHeight - menuHeight - gap));
      setRowContextMenu({ rowId, rowIndex, top, left });
      setIsColumnFieldMenuOpen(false);
      setIsEditFieldPopoverOpen(false);
    },
    [],
  );

  const openColumnFieldMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>, fieldId: string) => {
      event.preventDefault();
      event.stopPropagation();
      const anchor = event.currentTarget as HTMLElement;
      columnFieldMenuAnchorRef.current = anchor;
      const menuWidth = 320;
      const menuHeight = 620;
      const gap = 8;
      const rect = anchor.getBoundingClientRect();
      let left = rect.left;
      if (left + menuWidth + gap > window.innerWidth) {
        left = rect.right - menuWidth;
      }
      left = Math.max(gap, Math.min(left, window.innerWidth - menuWidth - gap));
      const top = Math.max(
        gap,
        Math.min(rect.bottom - 4, window.innerHeight - menuHeight - gap),
      );
      setColumnFieldMenuFieldId(fieldId);
      setColumnFieldMenuPosition({ top, left });
      setIsColumnFieldMenuOpen(true);
      setIsEditFieldPopoverOpen(false);
    },
    [],
  );

  const openEditFieldPopover = useCallback(
    (fieldId: string) => {
      const field = tableFields.find((item) => item.id === fieldId);
      if (!field) return;
      const trigger = document.querySelector<HTMLElement>(`[data-column-field-id="${fieldId}"]`);
      const popoverWidth = 404;
      const gap = 8;
      const left = trigger
        ? Math.max(
            gap,
            Math.min(trigger.getBoundingClientRect().left, window.innerWidth - popoverWidth - gap),
          )
        : Math.max(
            gap,
            Math.min(columnFieldMenuPosition.left, window.innerWidth - popoverWidth - gap),
          );
      const top = trigger
        ? trigger.getBoundingClientRect().bottom + 6
        : Math.min(columnFieldMenuPosition.top + 16, window.innerHeight - 520);

      setEditFieldId(field.id);
      setEditFieldName(field.label);
      setEditFieldKind(field.kind);
      setEditFieldDefaultValue(field.defaultValue ?? "");
      setEditFieldAllowMultipleUsers(false);
      setEditFieldNotifyUsers(true);
      const nextDescription = field.description ?? "";
      setIsEditFieldDescriptionOpen(nextDescription.trim().length > 0);
      setEditFieldDescription(nextDescription);
      setEditNumberPreset(field.numberConfig?.preset ?? "none");
      setEditNumberDecimalPlaces(field.numberConfig?.decimalPlaces ?? "1");
      setEditNumberSeparators(field.numberConfig?.separators ?? "local");
      setEditNumberShowThousandsSeparator(field.numberConfig?.showThousandsSeparator ?? true);
      setEditNumberAbbreviation(field.numberConfig?.abbreviation ?? "none");
      setEditNumberAllowNegative(field.numberConfig?.allowNegative ?? false);
      setEditFieldPopoverPosition({ top, left });
      setIsEditFieldPopoverOpen(true);
      setIsColumnFieldMenuOpen(false);
    },
    [tableFields, columnFieldMenuPosition],
  );

  const handleEditFieldSave = useCallback(async () => {
    if (!editFieldId || !activeTable) return;
    const currentField = tableFields.find((field) => field.id === editFieldId);
    if (!currentField) return;
    const tableId = activeTable.id;
    const nextName = buildUniqueFieldName(editFieldName || currentField.label, editFieldId);
    const nextKind = editFieldKind;
    const nextNumberConfig: NumberFieldConfig | undefined =
      nextKind === "number"
        ? resolveNumberConfig({
            preset: editNumberPreset,
            decimalPlaces: String(clampNumberDecimals(editNumberDecimalPlaces)),
            separators: editNumberSeparators,
            showThousandsSeparator: editNumberShowThousandsSeparator,
            abbreviation: editNumberAbbreviation,
            allowNegative: editNumberAllowNegative,
          })
        : undefined;
    const nextDescription = editFieldDescription.trim();
    const nextDefaultValue =
      nextKind === "number" && nextNumberConfig
        ? normalizeNumberValueForStorage(editFieldDefaultValue, nextNumberConfig)
        : editFieldDefaultValue;

    updateTableById(tableId, (table) => ({
      ...table,
      fields: table.fields.map((field) =>
        field.id === editFieldId
          ? {
              ...field,
              label: nextName,
              kind: nextKind,
              defaultValue: nextDefaultValue,
              description: nextDescription || undefined,
              numberConfig: nextNumberConfig,
            }
          : field,
      ),
    }));
    setIsEditFieldPopoverOpen(false);
    void updateColumnMutation
      .mutateAsync({
        id: editFieldId,
        name: nextName,
        type: mapFieldKindToDbType(nextKind),
      })
      .then(() => {
        void Promise.all([
          utils.tables.getBootstrap.invalidate({ tableId }),
          utils.rows.listByTableId.invalidate({ tableId }),
        ]);
      })
      .catch(() => {
        updateTableById(tableId, (table) => ({
          ...table,
          fields: table.fields.map((field) =>
            field.id === editFieldId
              ? {
                  ...field,
                  label: currentField.label,
                  kind: currentField.kind,
                  defaultValue: currentField.defaultValue,
                  description: currentField.description,
                  numberConfig: currentField.numberConfig,
                }
              : field,
          ),
        }));
      });
  }, [
    editFieldId,
    activeTable,
    tableFields,
    buildUniqueFieldName,
    editFieldName,
    editFieldKind,
    editFieldDefaultValue,
    editFieldDescription,
    editNumberPreset,
    editNumberDecimalPlaces,
    editNumberSeparators,
    editNumberShowThousandsSeparator,
    editNumberAbbreviation,
    editNumberAllowNegative,
    updateColumnMutation,
    updateTableById,
    utils.tables.getBootstrap,
    utils.rows.listByTableId,
  ]);

  const handleDuplicateColumnField = useCallback(async () => {
    if (!activeTable || !columnFieldMenuField || columnFieldMenuFieldIndex < 0) return;
    const sourceField = columnFieldMenuField;
    const duplicateName = buildUniqueFieldName(`${sourceField.label} copy`);

    const createdColumn = await createColumnMutation.mutateAsync({
      tableId: activeTable.id,
      name: duplicateName,
      type: mapFieldKindToDbType(sourceField.kind),
      size: sourceField.size,
    });
    if (!createdColumn) return;

    const duplicatedCellUpdates = activeTable.data
      .flatMap((row) => {
        if (!row) return [];
        const serverId = resolveServerRowId(row.id);
        if (!serverId) return [];
        return [{ row, serverId }];
      })
      .map(({ row, serverId }) => ({
        rowId: serverId,
        columnId: createdColumn.id,
        value: row[sourceField.id] ?? sourceField.defaultValue,
      }));
    if (duplicatedCellUpdates.length > 0) {
      for (
        let startIndex = 0;
        startIndex < duplicatedCellUpdates.length;
        startIndex += BULK_CELL_UPDATE_BATCH_SIZE
      ) {
        await bulkUpdateCellsMutation.mutateAsync({
          tableId: activeTable.id,
          updates: duplicatedCellUpdates.slice(
            startIndex,
            startIndex + BULK_CELL_UPDATE_BATCH_SIZE,
          ),
        });
      }
    }

    const newField: TableField = {
      id: createdColumn.id,
      label: createdColumn.name,
      kind: sourceField.kind,
      size: sourceField.size,
      defaultValue: sourceField.defaultValue,
      description: sourceField.description,
      numberConfig: sourceField.numberConfig,
    };
    const nextFields = [...activeTable.fields];
    nextFields.splice(columnFieldMenuFieldIndex + 1, 0, newField);

    await reorderColumnsMutation.mutateAsync({
      tableId: activeTable.id,
      columnIds: nextFields.map((field) => field.id),
    });

    updateActiveTable((table) => ({
      ...table,
      fields: nextFields,
      columnVisibility: {
        ...table.columnVisibility,
        [newField.id]: true,
      },
      data: table.data.map((row) => {
        if (!row) return row;
        return {
          ...row,
          [newField.id]: row[sourceField.id] ?? sourceField.defaultValue,
        };
      }),
    }));

    await utils.tables.getBootstrap.invalidate({ tableId: activeTable.id });
    await utils.rows.listByTableId.invalidate({ tableId: activeTable.id });
    setIsColumnFieldMenuOpen(false);
  }, [
    activeTable,
    columnFieldMenuField,
    columnFieldMenuFieldIndex,
    buildUniqueFieldName,
    createColumnMutation,
    bulkUpdateCellsMutation,
    reorderColumnsMutation,
    resolveServerRowId,
    updateActiveTable,
    utils.tables.getBootstrap,
    utils.rows.listByTableId,
  ]);

  const handleInsertColumnField = useCallback(
    (direction: "left" | "right") => {
      if (!columnFieldMenuFieldId || columnFieldMenuFieldIndex < 0) return;
      if (direction === "left" && isColumnFieldPrimary) return;
      const insertionIndex =
        direction === "left" ? columnFieldMenuFieldIndex : columnFieldMenuFieldIndex + 1;
      setAddColumnInsertIndex(insertionIndex);
      setAddColumnAnchorFieldId(columnFieldMenuFieldId);
      setIsAddColumnMenuOpen(true);
      setIsColumnFieldMenuOpen(false);
    },
    [columnFieldMenuFieldId, columnFieldMenuFieldIndex, isColumnFieldPrimary],
  );

  const handleColumnFieldSort = useCallback(
    (desc: boolean) => {
      if (!columnFieldMenuFieldId) return;
      setSorting((prev) => {
        const existingIndex = prev.findIndex((rule) => rule.id === columnFieldMenuFieldId);
        if (existingIndex >= 0) {
          return prev.map((rule, index) =>
            index === existingIndex ? { ...rule, desc } : rule,
          );
        }
        return [{ id: columnFieldMenuFieldId, desc }, ...prev];
      });
      setIsColumnFieldMenuOpen(false);
      setIsSortMenuOpen(true);
    },
    [columnFieldMenuFieldId],
  );

  const handleHideColumnField = useCallback(() => {
    if (!columnFieldMenuFieldId || isColumnFieldPrimary) return;
    updateActiveTable((table) => ({
      ...table,
      columnVisibility: {
        ...table.columnVisibility,
        [columnFieldMenuFieldId]: false,
      },
    }));
    setIsColumnFieldMenuOpen(false);
  }, [columnFieldMenuFieldId, isColumnFieldPrimary, updateActiveTable]);

  const handleDeleteColumnField = useCallback(async () => {
    if (!activeTable || !columnFieldMenuField) return;
    if (isColumnFieldPrimary || tableFields.length <= 1) return;
    const tableId = activeTable.id;
    const deletedFieldId = columnFieldMenuField.id;
    const previousTable = activeTable;
    const previousSorting = sorting;

    updateTableById(tableId, (table) => ({
      ...table,
      fields: table.fields.filter((field) => field.id !== deletedFieldId),
      columnVisibility: Object.fromEntries(
        Object.entries(table.columnVisibility).filter(
          ([fieldId]) => fieldId !== deletedFieldId,
        ),
      ),
      data: table.data.map((row) => {
        if (!row) return row;
        const nextRow = { ...row };
        delete nextRow[deletedFieldId];
        return nextRow;
      }),
    }));
    setSorting((prev) => prev.filter((sortItem) => sortItem.id !== deletedFieldId));
    if (editingCell?.columnId === deletedFieldId) {
      resetEditingState();
    }
    clearActiveCell();
    setColumnFieldMenuFieldId(null);
    setIsColumnFieldMenuOpen(false);
    setIsEditFieldPopoverOpen(false);

    try {
      await deleteColumnMutation.mutateAsync({ id: deletedFieldId });
      void Promise.all([
        utils.tables.getBootstrap.invalidate({ tableId }),
        utils.rows.listByTableId.invalidate({ tableId }),
      ]);
    } catch {
      updateTableById(tableId, () => previousTable);
      setSorting(previousSorting);
    }
  }, [
    activeTable,
    columnFieldMenuField,
    isColumnFieldPrimary,
    tableFields.length,
    deleteColumnMutation,
    updateTableById,
    editingCell?.columnId,
    resetEditingState,
    sorting,
    clearActiveCell,
    utils.tables.getBootstrap,
    utils.rows.listByTableId,
  ]);

  const addColumn = () => {
    setAddColumnInsertIndex(null);
    setAddColumnAnchorFieldId(null);
    setIsAddColumnMenuOpen((prev) => !prev);
  };

  const closeAddColumnMenu = useCallback(() => {
    setIsAddColumnMenuOpen(false);
  }, []);

  const handleAddColumnCreate = useCallback(() => {
    if (!selectedAddColumnKind || !activeTable || createColumnMutation.isPending) return;

    const rawLabel = addColumnFieldName.trim();
    const label = rawLabel || ADD_COLUMN_KIND_CONFIG[selectedAddColumnKind].label;
    const fieldKind = selectedAddColumnKind;
    const numberConfig: NumberFieldConfig | undefined =
      fieldKind === "number"
        ? resolveNumberConfig({
            preset: numberPreset,
            decimalPlaces: String(clampNumberDecimals(numberDecimalPlaces)),
            separators: numberSeparators,
            showThousandsSeparator: numberShowThousandsSeparator,
            abbreviation: numberAbbreviation,
            allowNegative: numberAllowNegative,
          })
        : undefined;
    const defaultValue =
      fieldKind === "number" && numberConfig
        ? normalizeNumberValueForStorage(addColumnDefaultValue, numberConfig)
        : addColumnDefaultValue;
    const tableId = activeTable.id;
    const hasPersistedRows = activeTable.data.some(
      (row) => Boolean(row && resolveServerRowId(row.id)),
    );
    const optimisticColumnId = createOptimisticId("column");
    const insertionIndex =
      addColumnInsertIndex === null
        ? activeTable.fields.length
        : Math.min(Math.max(addColumnInsertIndex, 0), activeTable.fields.length);
    const description = addColumnDescription.trim();
    const optimisticField: TableField = {
      id: optimisticColumnId,
      label,
      kind: fieldKind,
      size: fieldKind === "number" ? 160 : 220,
      defaultValue,
      description: description || undefined,
      numberConfig,
    };
    const nextFields = [...activeTable.fields];
    nextFields.splice(insertionIndex, 0, optimisticField);
    const shouldReorder =
      addColumnInsertIndex !== null && insertionIndex < activeTable.fields.length;
    const nextFieldOrder = shouldReorder ? nextFields.map((field) => field.id) : null;

    closeAddColumnMenu();
    updateTableById(tableId, (table) => ({
      ...table,
      fields: nextFields,
      columnVisibility: {
        ...table.columnVisibility,
        [optimisticColumnId]: true,
      },
      data: table.data.map((row) => {
        if (!row) return row;
        return {
          ...row,
          [optimisticColumnId]: defaultValue,
        };
      }),
    }));

    void (async () => {
      try {
        const createdColumn = await createColumnMutation.mutateAsync({
          tableId,
          name: label,
          type: mapFieldKindToDbType(fieldKind),
          size: optimisticField.size,
        });
        if (!createdColumn) return;

        // Track mapping for resolving stale editingCell.columnId
        optimisticColumnIdToRealIdRef.current.set(optimisticColumnId, createdColumn.id);
        resolveDirtyOverridesForColumn(optimisticColumnId, createdColumn.id);

        suspendTableServerSync(tableId);
        try {
          const persistedRowsForNewColumn: Array<{ rowId: string; value: string }> = [];
          updateTableById(tableId, (table) => ({
            ...table,
            fields: table.fields.map((field) =>
              field.id === optimisticColumnId
                ? {
                    ...field,
                    id: createdColumn.id,
                    label: createdColumn.name,
                  }
                : field,
            ),
            columnVisibility: {
              ...Object.fromEntries(
                Object.entries(table.columnVisibility).filter(
                  ([fieldId]) => fieldId !== optimisticColumnId,
                ),
              ),
              [createdColumn.id]: true,
            },
            data: table.data.map((row) => {
              if (!row) return row;
              const rowValue = row[optimisticColumnId] ?? defaultValue;
              const serverRowId = resolveServerRowId(row.id);
              if (serverRowId) {
                persistedRowsForNewColumn.push({
                  rowId: serverRowId,
                  value: rowValue,
                });
              }
              const nextRow = {
                ...row,
                [createdColumn.id]: rowValue,
              };
              delete nextRow[optimisticColumnId];
              return nextRow;
            }),
          }));

          if (shouldReorder && nextFieldOrder) {
            const resolvedOrder = nextFieldOrder.map((fieldId) =>
              fieldId === optimisticColumnId ? createdColumn.id : fieldId,
            );
            await reorderColumnsMutation.mutateAsync({
              tableId,
              columnIds: resolvedOrder,
            });
          }

          const queuedOptimisticUpdatesByRowId = consumeOptimisticColumnCellUpdates(
            tableId,
            optimisticColumnId,
          );

          // Resolve optimistic row IDs to real IDs using the mapping
          const resolvedQueuedUpdates = new Map<string, string>();
          queuedOptimisticUpdatesByRowId.forEach((value, rowId) => {
            const resolvedId = resolveServerRowId(rowId);
            if (!resolvedId) return;
            resolvedQueuedUpdates.set(resolvedId, value);
            // If row is still optimistic, skip - it will be handled when row is persisted
          });

          const rowUpdatesByRowId = new Map<string, string>();
          persistedRowsForNewColumn.forEach(({ rowId, value }) => {
            rowUpdatesByRowId.set(
              rowId,
              resolvedQueuedUpdates.get(rowId) ?? value,
            );
          });
          resolvedQueuedUpdates.forEach((value, rowId) => {
            rowUpdatesByRowId.set(rowId, value);
          });

          if (!hasPersistedRows || rowUpdatesByRowId.size === 0) {
            void utils.tables.getBootstrap.invalidate({ tableId });
            return;
          }

          try {
            if (defaultValue !== "") {
              await setColumnValueMutation.mutateAsync({
                tableId,
                columnId: createdColumn.id,
                value: defaultValue,
              });
            }

            const rowUpdates = Array.from(rowUpdatesByRowId.entries())
              .filter(([, value]) => value !== defaultValue)
              .map(([rowId, value]) => ({
                rowId,
                columnId: createdColumn.id,
                value,
              }));

            for (
              let startIndex = 0;
              startIndex < rowUpdates.length;
              startIndex += BULK_CELL_UPDATE_BATCH_SIZE
            ) {
              await bulkUpdateCellsMutation.mutateAsync({
                tableId,
                updates: rowUpdates.slice(
                  startIndex,
                  startIndex + BULK_CELL_UPDATE_BATCH_SIZE,
                ),
              });
            }
          } finally {
            void Promise.all([
              utils.tables.getBootstrap.invalidate({ tableId }),
              utils.rows.listByTableId.invalidate({ tableId }),
            ]);
          }
        } finally {
          resumeTableServerSync(tableId);
        }
      } catch {
        clearOptimisticColumnCellUpdates(tableId, optimisticColumnId);
        updateTableById(tableId, (table) => ({
          ...table,
          fields: table.fields.filter((field) => field.id !== optimisticColumnId),
          columnVisibility: Object.fromEntries(
            Object.entries(table.columnVisibility).filter(
              ([fieldId]) => fieldId !== optimisticColumnId,
            ),
          ),
          data: table.data.map((row) => {
            if (!row) return row;
            const nextRow = { ...row };
            delete nextRow[optimisticColumnId];
            return nextRow;
          }),
        }));
      }
    })();
  }, [
    addColumnDefaultValue,
    addColumnDescription,
    addColumnFieldName,
    addColumnInsertIndex,
    activeTable,
    bulkUpdateCellsMutation,
    clearOptimisticColumnCellUpdates,
    closeAddColumnMenu,
    consumeOptimisticColumnCellUpdates,
    createColumnMutation,
    numberAbbreviation,
    numberDecimalPlaces,
    numberPreset,
    numberSeparators,
    numberShowThousandsSeparator,
    numberAllowNegative,
    reorderColumnsMutation,
    resolveDirtyOverridesForColumn,
    resolveServerRowId,
    selectedAddColumnKind,
    setColumnValueMutation,
    suspendTableServerSync,
    resumeTableServerSync,
    updateTableById,
    utils.rows.listByTableId,
    utils.tables.getBootstrap,
  ]);

  useEffect(() => {
    if (!isBaseMenuOpen) return;
    const updatePosition = () => {
      if (!baseMenuButtonRef.current) return;
      const rect = baseMenuButtonRef.current.getBoundingClientRect();
      const popoverWidth = 400;
      const horizontalPadding = 12;
      const left = Math.max(
        horizontalPadding,
        Math.min(rect.left, window.innerWidth - popoverWidth - horizontalPadding),
      );
      const top = rect.bottom + 8;
      setBaseMenuPosition({ top, left });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isBaseMenuOpen]);

  useEffect(() => {
    if (!isBaseMenuOpen) {
      setIsBaseMenuMoreOpen(false);
    }
  }, [isBaseMenuOpen]);

  useEffect(() => {
    setRowSelection({});
    resetEditingState();
    setActiveCellId(null);
    setActiveCellRowIndex(null);
    setActiveCellColumnIndex(null);
    setActiveRowId(null);
    setDropTargetRow(null);
    setIsColumnFieldMenuOpen(false);
    setColumnFieldMenuFieldId(null);
    setDraggingColumnId(null);
    setColumnDropTargetIndex(null);
    setColumnDropAnchorId(null);
    setColumnDropIndicatorLeft(null);
    setIsEditFieldPopoverOpen(false);
    setEditFieldId(null);
    setIsEditingViewName(false);
    setIsViewMenuOpen(false);
    setIsCreateViewMenuOpen(false);
    setIsBottomAddRecordMenuOpen(false);
    setIsDebugAddRowsOpen(false);
    setIsBottomQuickAddOpen(false);
    setBottomQuickAddRowId(null);
    setFilterGroups([]);
    setSidebarViewContextMenu(null);
    fillDragStateRef.current = null;
    setFillDragState(null);
  }, [activeTableId]);

  useEffect(() => {
    if (!draggingColumnId) return;
    if (visibleFieldIds.includes(draggingColumnId)) return;
    setDraggingColumnId(null);
    setColumnDropTargetIndex(null);
    setColumnDropAnchorId(null);
    setColumnDropIndicatorLeft(null);
  }, [draggingColumnId, visibleFieldIds]);

  useEffect(() => {
    if (!isBottomQuickAddOpen || !bottomQuickAddRowId) return;
    if (data.some((row) => row?.id === bottomQuickAddRowId)) return;
    setIsBottomQuickAddOpen(false);
    setBottomQuickAddRowId(null);
  }, [bottomQuickAddRowId, data, isBottomQuickAddOpen]);

  useEffect(() => {
    if (!isBaseMenuMoreOpen) return;
    const handlePointerDown = (event: globalThis.MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (baseMenuMoreMenuRef.current?.contains(target)) return;
      if (baseMenuMoreButtonRef.current?.contains(target)) return;
      setIsBaseMenuMoreOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [isBaseMenuMoreOpen]);

  useEffect(() => {
    if (!isCreateViewMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (createViewMenuRef.current?.contains(target)) return;
      if (createViewButtonRef.current?.contains(target)) return;
      setIsCreateViewMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCreateViewMenuOpen(false);
        flashEscapeHighlight(createViewButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCreateViewMenuOpen]);

  useEffect(() => {
    if (!isCreateViewDialogOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (createViewDialogRef.current?.contains(target)) return;
      setIsCreateViewDialogOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCreateViewDialogOpen(false);
        flashEscapeHighlight(createViewButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCreateViewDialogOpen]);

  useEffect(() => {
    if (!isCreateViewDialogOpen) return;
    const updatePosition = () => {
      const trigger = createViewButtonRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const dialogWidth = 360;
      const gap = 8;
      const left = Math.max(gap, Math.min(rect.left, window.innerWidth - dialogWidth - gap));
      const top = rect.bottom + 8;
      setCreateViewDialogPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isCreateViewDialogOpen]);

  useEffect(() => {
    if (!isCreateViewDialogOpen) return;
    requestAnimationFrame(() => {
      createViewDialogInputRef.current?.focus();
      createViewDialogInputRef.current?.select();
    });
  }, [isCreateViewDialogOpen]);

  useEffect(() => {
    if (!isCreateViewMenuOpen) return;
    const updatePosition = () => {
      const trigger = createViewButtonRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 230;
      const gap = 12;
      const left = Math.max(
        gap,
        Math.min(rect.right + gap, window.innerWidth - menuWidth - gap),
      );
      const top = rect.top;
      setCreateViewMenuPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isCreateViewMenuOpen]);

  useEffect(() => {
    if (!isViewMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (viewMenuRef.current?.contains(target)) return;
      if (viewMenuButtonRef.current?.contains(target)) return;
      setIsViewMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsViewMenuOpen(false);
        flashEscapeHighlight(viewMenuButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isViewMenuOpen]);

  useEffect(() => {
    if (!isBottomAddRecordMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (bottomAddRecordMenuRef.current?.contains(target)) return;
      if (bottomAddRecordButtonRef.current?.contains(target)) return;
      if (bottomAddRecordPlusButtonRef.current?.contains(target)) return;
      setIsBottomAddRecordMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsBottomAddRecordMenuOpen(false);
        flashEscapeHighlight(bottomAddRecordButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBottomAddRecordMenuOpen]);

  useEffect(() => {
    if (!isDebugAddRowsOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (debugAddRowsPopoverRef.current?.contains(target)) return;
      if (debugAddRowsButtonRef.current?.contains(target)) return;
      setIsDebugAddRowsOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDebugAddRowsOpen(false);
        flashEscapeHighlight(debugAddRowsButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDebugAddRowsOpen]);

  useEffect(() => {
    if (!sidebarViewContextMenu) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (sidebarViewContextMenuRef.current?.contains(target)) return;
      if (target instanceof Element) {
        const keepTarget = target.closest('[data-context-menu-keep="true"]');
        if (keepTarget) {
          const viewTarget = keepTarget.closest(
            `[data-view-id="${sidebarViewContextMenu.viewId}"]`,
          );
          if (viewTarget) return;
        }
      }
      setSidebarViewContextMenu(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarViewContextMenu(null);
        flashEscapeHighlight(sidebarViewContextMenuAnchorRef.current);
      }
    };
    const handleViewportUpdate = () => {
      setSidebarViewContextMenu(null);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleViewportUpdate);
    window.addEventListener("scroll", handleViewportUpdate, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleViewportUpdate);
      window.removeEventListener("scroll", handleViewportUpdate, true);
    };
  }, [sidebarViewContextMenu]);

  useEffect(() => {
    if (!isHideFieldsMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (hideFieldsMenuRef.current?.contains(target)) return;
      if (hideFieldsButtonRef.current?.contains(target)) return;
      setIsHideFieldsMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsHideFieldsMenuOpen(false);
        flashEscapeHighlight(hideFieldsButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isHideFieldsMenuOpen]);

  useEffect(() => {
    if (!isHideFieldsMenuOpen) {
      resetHideFieldDragState();
    }
  }, [isHideFieldsMenuOpen, resetHideFieldDragState]);

  useLayoutEffect(() => {
    if (!isHideFieldsMenuOpen) return;
    const nextTopById = new Map<string, number>();
    filteredHideFields.forEach((field) => {
      const rowElement = hideFieldRowRefs.current.get(field.id);
      if (!rowElement) return;
      const nextTop = rowElement.getBoundingClientRect().top;
      nextTopById.set(field.id, nextTop);
      const previousTop = hideFieldRowTopByIdRef.current.get(field.id);
      if (previousTop === undefined) return;
      const deltaY = previousTop - nextTop;
      if (Math.abs(deltaY) < 0.5) return;

      rowElement.style.transition = "none";
      rowElement.style.transform = `translateY(${deltaY}px)`;
      requestAnimationFrame(() => {
        rowElement.style.transition = "transform 180ms cubic-bezier(0.2, 0, 0, 1)";
        rowElement.style.transform = "";
      });
    });
    hideFieldRowTopByIdRef.current = nextTopById;
  }, [filteredHideFields, isHideFieldsMenuOpen]);

  useEffect(() => {
    if (!hideFieldDragActiveId) return;
    // Update preview position when drag starts
    const previewElement = hideFieldDragPreviewRef.current;
    if (previewElement) {
      const { x, y } = hideFieldDragPointerRef.current;
      previewElement.style.transform = `translate3d(${x + 12}px, ${y + 12}px, 0)`;
    }
  }, [hideFieldDragActiveId]);

  useEffect(() => {
    if (!hideFieldDragActiveId) return;
    const handleGlobalDragOver = (event: DragEvent) => {
      updateHideFieldDragFromPointer(event.clientX, event.clientY);
    };
    window.addEventListener("dragover", handleGlobalDragOver);
    return () => {
      window.removeEventListener("dragover", handleGlobalDragOver);
    };
  }, [hideFieldDragActiveId, updateHideFieldDragFromPointer]);

  useEffect(() => {
    if (!isSearchMenuOpen) return;
    const timeoutId = window.setTimeout(() => {
      setSearchQuery(searchInputValue.trim());
    }, 180);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isSearchMenuOpen, searchInputValue]);

  useEffect(() => {
    if (!isSearchMenuOpen) return;
    setSearchQuery(searchInputValue.trim());
    const focusTimeoutId = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);
    return () => {
      window.clearTimeout(focusTimeoutId);
    };
  }, [isSearchMenuOpen]);

  useEffect(() => {
    const handleFindShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== "f") return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, [contenteditable='true']")
      ) {
        return;
      }
      event.preventDefault();
      setIsSearchMenuOpen(true);
      setSearchInputValue((current) => current);
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      });
    };
    window.addEventListener("keydown", handleFindShortcut);
    return () => {
      window.removeEventListener("keydown", handleFindShortcut);
    };
  }, []);

  const updateSearchMenuPosition = useCallback(() => {
    const position = getToolbarMenuPosition(
      searchButtonRef.current,
      searchMenuRef.current,
      320,
    );
    if (!position) return;
    setSearchMenuPosition(position);
  }, []);

  useEffect(() => {
    if (!isSearchMenuOpen) return;
    updateSearchMenuPosition();
    window.addEventListener("resize", updateSearchMenuPosition);
    window.addEventListener("scroll", updateSearchMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateSearchMenuPosition);
      window.removeEventListener("scroll", updateSearchMenuPosition, true);
    };
  }, [isSearchMenuOpen, updateSearchMenuPosition]);

  const totalFilterConditions = useMemo(
    () => filterGroups.reduce((count, group) => count + group.conditions.length, 0),
    [filterGroups],
  );

  const activeFilterSelectData = useMemo(() => {
    if (!filterSelectMenu) return null;
    const group = filterGroups.find((candidate) => candidate.id === filterSelectMenu.groupId);
    const condition = group?.conditions.find(
      (candidate) => candidate.id === filterSelectMenu.conditionId,
    );
    if (!condition) return null;
    const selectedField = tableFields.find((field) => field.id === condition.columnId);
    const operatorItems = getFilterOperatorItemsForField(selectedField?.kind);
    return {
      groupId: filterSelectMenu.groupId,
      condition,
      selectedField,
      operatorItems,
    };
  }, [filterGroups, filterSelectMenu, tableFields]);

  const normalizedFilterSelectSearch = useMemo(
    () => filterSelectSearch.trim().toLowerCase(),
    [filterSelectSearch],
  );

  const filterSelectFieldItems = useMemo(() => {
    if (!normalizedFilterSelectSearch) return tableFields;
    return tableFields.filter((field) =>
      field.label.toLowerCase().includes(normalizedFilterSelectSearch),
    );
  }, [normalizedFilterSelectSearch, tableFields]);

  const filterSelectOperatorItems = useMemo(() => {
    if (!activeFilterSelectData) return [];
    if (!normalizedFilterSelectSearch) return activeFilterSelectData.operatorItems;
    return activeFilterSelectData.operatorItems.filter((item) =>
      item.label.toLowerCase().includes(normalizedFilterSelectSearch),
    );
  }, [activeFilterSelectData, normalizedFilterSelectSearch]);

  const getFilterSelectMenuPosition = useCallback(
    (anchor: HTMLElement, menu: HTMLElement | null, fallbackWidth: number) => {
      const rect = anchor.getBoundingClientRect();
      const gap = 8;
      const viewportWidth = window.innerWidth;
      const maxWidth = Math.max(0, viewportWidth - gap * 2);
      const measuredWidth = menu?.getBoundingClientRect().width ?? 0;
      const resolvedWidth = measuredWidth > 0 ? measuredWidth : fallbackWidth;
      const menuWidth = Math.min(resolvedWidth, maxWidth);
      let left = rect.left;
      left = Math.max(gap, Math.min(left, viewportWidth - menuWidth - gap));
      const top = rect.bottom + 6;
      return { top, left };
    },
    [],
  );

  const updateFilterSelectMenuPosition = useCallback(() => {
    if (!filterSelectMenu?.anchor) return;
    const fallbackWidth = filterSelectMenu.type === "field" ? 240 : 200;
    const position = getFilterSelectMenuPosition(
      filterSelectMenu.anchor,
      filterSelectMenuRef.current,
      fallbackWidth,
    );
    setFilterSelectMenuPosition(position);
  }, [filterSelectMenu, getFilterSelectMenuPosition]);

  const closeFilterSelectMenu = useCallback(() => {
    setFilterSelectMenu(null);
    setActiveFilterSelect(null);
    setFilterSelectSearch("");
  }, []);

  const openFilterSelectMenu = useCallback(
    (
      event: ReactMouseEvent<HTMLButtonElement>,
      type: "field" | "operator",
      groupId: string,
      conditionId: string,
    ) => {
      if (
        filterSelectMenu?.type === type &&
        filterSelectMenu.conditionId === conditionId
      ) {
        closeFilterSelectMenu();
        return;
      }
      const anchor = event.currentTarget as HTMLElement;
      setFilterSelectMenu({ type, groupId, conditionId, anchor });
      setFilterSelectSearch("");
      setActiveFilterSelect({ type, conditionId });
      const fallbackWidth = type === "field" ? 240 : 200;
      setFilterSelectMenuPosition(
        getFilterSelectMenuPosition(anchor, null, fallbackWidth),
      );
    },
    [closeFilterSelectMenu, filterSelectMenu, getFilterSelectMenuPosition],
  );

  const updateFilterMenuPosition = useCallback(() => {
    const fallbackWidth =
      totalFilterConditions === 1 ? 590 : totalFilterConditions > 0 ? 589 : 242;
    const position = getToolbarMenuPosition(
      filterButtonRef.current,
      filterMenuRef.current,
      fallbackWidth,
    );
    if (!position) return;
    setFilterMenuPosition({
      top: position.top - 4,
      left: position.left - 5,
    });
  }, [totalFilterConditions]);

  const handleFilterMenuToggle = useCallback(() => {
    if (isFilterMenuOpen) {
      setIsFilterMenuOpen(false);
      closeFilterSelectMenu();
      return;
    }
    updateFilterMenuPosition();
    setFilterMenuActiveAction("condition");
    setIsFilterMenuOpen(true);
  }, [closeFilterSelectMenu, isFilterMenuOpen, updateFilterMenuPosition]);

  const openFilterMenuForField = useCallback(
    (fieldId: string) => {
      if (!fieldId) return;
      const nextCondition: FilterCondition = {
        id: createOptimisticId("filter"),
        columnId: fieldId,
        operator: getDefaultFilterOperatorForField(
          tableFields.find((field) => field.id === fieldId)?.kind,
        ),
        value: "",
        join: "and",
      };
      const nextGroup: FilterConditionGroup = {
        id: createOptimisticId("filter-group"),
        mode: "single",
        join: "and",
        conditions: [nextCondition],
      };

      setFilterGroups((prev) => {
        if (prev.length === 0) return [nextGroup];
        return prev.map((group, index) => {
          if (index !== 0) return group;
          return { ...group, conditions: [nextCondition] };
        });
      });

      updateFilterMenuPosition();
      setFilterMenuActiveAction("condition");
      closeFilterSelectMenu();
      setIsFilterMenuOpen(true);
    },
    [closeFilterSelectMenu, tableFields, updateFilterMenuPosition],
  );

  useEffect(() => {
    if (!isFilterMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (filterMenuRef.current?.contains(target)) return;
      if (filterSelectMenuRef.current?.contains(target)) return;
      if (filterButtonRef.current?.contains(target)) return;
      setIsFilterMenuOpen(false);
      closeFilterSelectMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterMenuOpen(false);
        closeFilterSelectMenu();
        flashEscapeHighlight(filterButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeFilterSelectMenu, isFilterMenuOpen]);

  useEffect(() => {
    if (!isFilterMenuOpen) return;
    updateFilterMenuPosition();
    window.addEventListener("resize", updateFilterMenuPosition);
    window.addEventListener("scroll", updateFilterMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateFilterMenuPosition);
      window.removeEventListener("scroll", updateFilterMenuPosition, true);
    };
  }, [isFilterMenuOpen, updateFilterMenuPosition]);

  useEffect(() => {
    if (!isFilterMenuOpen) return;
    updateFilterMenuPosition();
  }, [totalFilterConditions, isFilterMenuOpen, updateFilterMenuPosition]);

  useEffect(() => {
    if (!filterSelectMenu) return;
    updateFilterSelectMenuPosition();
    window.addEventListener("resize", updateFilterSelectMenuPosition);
    window.addEventListener("scroll", updateFilterSelectMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateFilterSelectMenuPosition);
      window.removeEventListener("scroll", updateFilterSelectMenuPosition, true);
    };
  }, [filterSelectMenu, updateFilterSelectMenuPosition]);

  useEffect(() => {
    if (!filterSelectMenu) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (filterSelectMenuRef.current?.contains(target)) return;
      if (filterSelectMenu.anchor?.contains(target)) return;
      closeFilterSelectMenu();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFilterSelectMenu();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeFilterSelectMenu, filterSelectMenu]);

  useEffect(() => {
    if (!filterSelectMenu) return;
    filterSelectSearchInputRef.current?.focus();
  }, [filterSelectMenu]);

  useEffect(() => {
    if (!filterSelectMenu) return;
    if (activeFilterSelectData) return;
    closeFilterSelectMenu();
  }, [activeFilterSelectData, closeFilterSelectMenu, filterSelectMenu]);

  useEffect(() => {
    if (!isGroupMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (groupMenuRef.current?.contains(target)) return;
      if (groupButtonRef.current?.contains(target)) return;
      setIsGroupMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsGroupMenuOpen(false);
        flashEscapeHighlight(groupButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGroupMenuOpen]);

  useEffect(() => {
    if (!isGroupMenuOpen) return;
    const updatePosition = () => {
      const trigger = groupButtonRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 280;
      const gap = 12;
      const left = Math.max(
        gap,
        Math.min(rect.left, window.innerWidth - menuWidth - gap),
      );
      const top = rect.bottom + 6;
      setGroupMenuPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isGroupMenuOpen]);

  useEffect(() => {
    if (!isSortMenuOpen) return;
    setSortMenuView(isSortActive ? "editor" : "picker");
    setSortFieldSearch("");
    setIsSortFieldSearchFocused(false);
  }, [isSortMenuOpen, isSortActive]);

  useEffect(() => {
    if (!isSortMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (sortMenuRef.current?.contains(target)) return;
      if (sortButtonRef.current?.contains(target)) return;
      setIsSortMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSortMenuOpen(false);
        flashEscapeHighlight(sortButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isSortMenuOpen]);

  useEffect(() => {
    if (!isSortMenuOpen) return;
    const updatePosition = () => {
      const position = getToolbarMenuPosition(
        sortButtonRef.current,
        sortMenuRef.current,
        452,
      );
      if (!position) return;
      setSortMenuPosition(position);
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isSortMenuOpen]);

  useEffect(() => {
    if (!isColorMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (colorMenuRef.current?.contains(target)) return;
      if (colorButtonRef.current?.contains(target)) return;
      setIsColorMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsColorMenuOpen(false);
        flashEscapeHighlight(colorButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isColorMenuOpen]);

  useEffect(() => {
    if (!isColorMenuOpen) return;
    const updatePosition = () => {
      const trigger = colorButtonRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 320;
      const gap = 12;
      const left = Math.max(
        gap,
        Math.min(rect.left, window.innerWidth - menuWidth - gap),
      );
      const top = rect.bottom + 6;
      setColorMenuPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isColorMenuOpen]);

  useEffect(() => {
    if (!isRowHeightMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rowHeightMenuRef.current?.contains(target)) return;
      if (rowHeightButtonRef.current?.contains(target)) return;
      setIsRowHeightMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsRowHeightMenuOpen(false);
        flashEscapeHighlight(rowHeightButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRowHeightMenuOpen]);

  useEffect(() => {
    if (!isRowHeightMenuOpen) return;
    const updatePosition = () => {
      const position = getToolbarMenuPosition(
        rowHeightButtonRef.current,
        rowHeightMenuRef.current,
        220,
      );
      if (!position) return;
      setRowHeightMenuPosition(position);
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isRowHeightMenuOpen]);

  useEffect(() => {
    if (!isShareSyncMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (shareSyncMenuRef.current?.contains(target)) return;
      if (shareSyncButtonRef.current?.contains(target)) return;
      setIsShareSyncMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsShareSyncMenuOpen(false);
        flashEscapeHighlight(shareSyncButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isShareSyncMenuOpen]);

  useEffect(() => {
    if (!isShareSyncMenuOpen) return;
    const updatePosition = () => {
      const trigger = shareSyncButtonRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 424;
      const gap = 12;
      const left = Math.max(
        gap,
        Math.min(rect.left, window.innerWidth - menuWidth - gap),
      );
      const top = rect.bottom + 6;
      setShareSyncMenuPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isShareSyncMenuOpen]);

  useEffect(() => {
    if (!isAddColumnMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (addColumnMenuRef.current?.contains(target)) return;
      if (addColumnButtonRef.current?.contains(target)) return;
      setIsAddColumnMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAddColumnMenuOpen(false);
        flashEscapeHighlight(addColumnButtonRef.current);
      }
      if (event.key === "Enter") {
        if (!selectedAddColumnKindRef.current) return;
        event.preventDefault();
        addColumnCreateRef.current();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAddColumnMenuOpen]);

  useEffect(() => {
    if (!isAddColumnMenuOpen) return;
    const updatePosition = () => {
      const menuWidth = 400;
      const gap = 12;
      const anchor =
        addColumnAnchorFieldId
          ? columnHeaderRefs.current.get(addColumnAnchorFieldId)
          : null;
      const trigger = anchor ?? addColumnButtonRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const left = anchor
        ? Math.max(
            gap,
            Math.min(rect.left, window.innerWidth - menuWidth - gap),
          )
        : Math.max(
            gap,
            Math.min(rect.right + gap, window.innerWidth - menuWidth - gap),
          );
      const top = rect.bottom + 6;
      setAddColumnMenuPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isAddColumnMenuOpen, addColumnAnchorFieldId]);

  useEffect(() => {
    if (isAddColumnMenuOpen) return;
    setSelectedAddColumnKind(null);
    setAddColumnSearch("");
    setAddColumnFieldName("");
    setAddColumnDefaultValue("");
    setIsAddColumnDescriptionOpen(false);
    setAddColumnDescription("");
    setNumberPreset("none");
    setNumberDecimalPlaces("1");
    setNumberSeparators("local");
    setNumberShowThousandsSeparator(true);
    setNumberAbbreviation("none");
    setNumberAllowNegative(false);
    setAddColumnInsertIndex(null);
    setAddColumnAnchorFieldId(null);
  }, [isAddColumnMenuOpen]);

  useEffect(() => {
    if (numberPreset === "none") return;
    if (numberPreset === "decimal4") {
      setNumberDecimalPlaces("4");
      setNumberShowThousandsSeparator(false);
      setNumberAbbreviation("none");
      return;
    }
    if (numberPreset === "integer") {
      setNumberDecimalPlaces("0");
      setNumberShowThousandsSeparator(false);
      setNumberAbbreviation("none");
      return;
    }
    if (numberPreset === "million1") {
      setNumberDecimalPlaces("1");
      setNumberShowThousandsSeparator(false);
      setNumberAbbreviation("million");
    }
  }, [numberPreset]);

  useEffect(() => {
    if (editNumberPreset === "none") return;
    if (editNumberPreset === "decimal4") {
      setEditNumberDecimalPlaces("4");
      setEditNumberShowThousandsSeparator(false);
      setEditNumberAbbreviation("none");
      return;
    }
    if (editNumberPreset === "integer") {
      setEditNumberDecimalPlaces("0");
      setEditNumberShowThousandsSeparator(false);
      setEditNumberAbbreviation("none");
      return;
    }
    if (editNumberPreset === "million1") {
      setEditNumberDecimalPlaces("1");
      setEditNumberShowThousandsSeparator(false);
      setEditNumberAbbreviation("million");
    }
  }, [editNumberPreset]);

  useEffect(() => {
    if (!isColumnFieldMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (columnFieldMenuRef.current?.contains(target)) return;
      setIsColumnFieldMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsColumnFieldMenuOpen(false);
        flashEscapeHighlight(columnFieldMenuAnchorRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isColumnFieldMenuOpen]);

  useEffect(() => {
    if (!isColumnFieldMenuOpen) return;
    if (!columnFieldMenuFieldId) {
      setIsColumnFieldMenuOpen(false);
      return;
    }
    const fieldExists = tableFields.some((field) => field.id === columnFieldMenuFieldId);
    if (!fieldExists) {
      setIsColumnFieldMenuOpen(false);
      setColumnFieldMenuFieldId(null);
    }
  }, [isColumnFieldMenuOpen, columnFieldMenuFieldId, tableFields]);

  useEffect(() => {
    if (!isColumnFieldMenuOpen) return;
    const closeMenu = () => {
      setIsColumnFieldMenuOpen(false);
    };
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [isColumnFieldMenuOpen]);

  useEffect(() => {
    if (!rowContextMenu) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rowContextMenuRef.current?.contains(target)) return;
      setRowContextMenu(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setRowContextMenu(null);
        flashEscapeHighlight(rowContextMenuAnchorRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [rowContextMenu]);

  useEffect(() => {
    if (!rowContextMenu) return;
    const closeMenu = () => setRowContextMenu(null);
    window.addEventListener("resize", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("resize", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, [rowContextMenu]);

  useEffect(() => {
    if (!isEditFieldPopoverOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (editFieldPopoverRef.current?.contains(target)) return;
      setIsEditFieldPopoverOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsEditFieldPopoverOpen(false);
        if (editFieldId) {
          flashEscapeHighlight(document.querySelector<HTMLElement>(`[data-column-field-id="${editFieldId}"]`));
        }
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditFieldPopoverOpen, editFieldId]);

  useEffect(() => {
    if (!isEditFieldPopoverOpen) return;
    if (!editFieldId) {
      setIsEditFieldPopoverOpen(false);
      return;
    }
    const fieldExists = tableFields.some((field) => field.id === editFieldId);
    if (!fieldExists) {
      setIsEditFieldPopoverOpen(false);
      setEditFieldId(null);
    }
  }, [isEditFieldPopoverOpen, editFieldId, tableFields]);

  useEffect(() => {
    if (!isEditFieldPopoverOpen) return;
    requestAnimationFrame(() => {
      editFieldNameInputRef.current?.focus();
      editFieldNameInputRef.current?.select();
    });
  }, [isEditFieldPopoverOpen]);

  useEffect(() => {
    if (!isHideFieldsMenuOpen) return;
    const updatePosition = () => {
      const position = getToolbarMenuPosition(
        hideFieldsButtonRef.current,
        hideFieldsMenuRef.current,
        320,
      );
      if (!position) return;
      setHideFieldsMenuPosition(position);
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isHideFieldsMenuOpen]);

  useEffect(() => {
    if (!isViewMenuOpen) return;
    const updatePosition = () => {
      const trigger = viewMenuButtonRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 260;
      const gap = 12;
      const left = Math.max(
        gap,
        Math.min(rect.left, window.innerWidth - menuWidth - gap),
      );
      const top = rect.bottom + 6;
      setViewMenuPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isViewMenuOpen]);

  useEffect(() => {
    if (!isBaseMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (baseMenuRef.current?.contains(target)) return;
      if (baseMenuButtonRef.current?.contains(target)) return;
      setIsBaseMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsBaseMenuOpen(false);
        flashEscapeHighlight(baseMenuButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBaseMenuOpen]);

  useEffect(() => {
    if (!isAddMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (addMenuRef.current?.contains(target)) return;
      if (addMenuFromTables && tablesMenuRef.current?.contains(target)) return;
      if (addMenuButtonRef.current?.contains(target)) return;
      setIsAddMenuOpen(false);
      setAddMenuFromTables(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAddMenuOpen(false);
        flashEscapeHighlight(addMenuFromTables ? tablesMenuAddRef.current : addMenuButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isAddMenuOpen, addMenuFromTables]);

  useEffect(() => {
    if (!isTablesMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (addMenuFromTables && isAddMenuOpen) {
        const clickedOutsideBoth =
          !addMenuRef.current?.contains(target) &&
          !tablesMenuRef.current?.contains(target) &&
          !tablesMenuButtonRef.current?.contains(target) &&
          !addMenuButtonRef.current?.contains(target);
        if (clickedOutsideBoth) {
          return;
        }
      }
      if (tablesMenuRef.current?.contains(target)) return;
      if (tablesMenuButtonRef.current?.contains(target)) return;
      if (addMenuFromTables && addMenuRef.current?.contains(target)) return;
      setIsTablesMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTablesMenuOpen(false);
        flashEscapeHighlight(tablesMenuButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTablesMenuOpen, addMenuFromTables, isAddMenuOpen]);

  useEffect(() => {
    if (!isHiddenTablesMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (hiddenTablesMenuRef.current?.contains(target)) return;
      if (hiddenTablesButtonRef.current?.contains(target)) return;
      setIsHiddenTablesMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsHiddenTablesMenuOpen(false);
        flashEscapeHighlight(hiddenTablesButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isHiddenTablesMenuOpen]);

  useEffect(() => {
    if (hiddenTables.length > 0) return;
    setIsHiddenTablesMenuOpen(false);
  }, [hiddenTables.length]);

  useEffect(() => {
    if (!isTableTabMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (tableTabMenuRef.current?.contains(target)) return;
      if (tableTabMenuButtonRef.current?.contains(target)) return;
      setIsTableTabMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsTableTabMenuOpen(false);
        flashEscapeHighlight(tableTabMenuButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTableTabMenuOpen]);

  useEffect(() => {
    if (!isRenameTablePopoverOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (renameTablePopoverRef.current?.contains(target)) return;
      handleRenameTableCancel();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleRenameTableCancel();
        if (renameTableId) {
          flashEscapeHighlight(document.querySelector<HTMLElement>(`[data-table-tab-id="${renameTableId}"]`));
        }
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRenameTablePopoverOpen, handleRenameTableCancel, renameTableId]);

  useEffect(() => {
    if (!isDeleteTableConfirmOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (deleteTableConfirmRef.current?.contains(target)) return;
      closeDeleteTableConfirm();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDeleteTableConfirm();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDeleteTableConfirmOpen, closeDeleteTableConfirm]);

  useEffect(() => {
    if (!isDeleteTableConfirmOpen) return;
    if (!deleteTableConfirmTableId) return;
    if (deleteTableConfirmTableId !== activeTableId) {
      closeDeleteTableConfirm();
      return;
    }
    positionDeleteTableConfirmForTable(deleteTableConfirmTableId);
  }, [
    activeTableId,
    deleteTableConfirmTableId,
    isDeleteTableConfirmOpen,
    closeDeleteTableConfirm,
    positionDeleteTableConfirmForTable,
  ]);

  useEffect(() => {
    if (!isToolsMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (toolsMenuRef.current?.contains(target)) return;
      if (toolsMenuButtonRef.current?.contains(target)) return;
      setIsToolsMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsToolsMenuOpen(false);
        flashEscapeHighlight(toolsMenuButtonRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isToolsMenuOpen]);

  useEffect(() => {
    if (!isToolsMenuOpen) return;
    const updatePosition = () => {
      const trigger = toolsMenuButtonRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 320;
      const gap = 12;
      const left = Math.max(
        gap,
        Math.min(rect.left, window.innerWidth - menuWidth - gap),
      );
      const top = rect.bottom + 8;
      setToolsMenuPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isToolsMenuOpen]);

  useEffect(() => {
    if (!isTableTabMenuOpen) return;
    const updatePosition = () => {
      const trigger = tableTabMenuButtonRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 260;
      const gap = 8;
      const left = Math.max(
        gap,
        Math.min(rect.left - 18, window.innerWidth - menuWidth - gap),
      );
      const top = rect.bottom + 8;
      setTableTabMenuPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isTableTabMenuOpen]);

  useEffect(() => {
    if (!isRenameTablePopoverOpen || !renameTableId) return;
    const updatePosition = () => {
      updateRenameTablePopoverPosition(renameTableId);
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isRenameTablePopoverOpen, renameTableId, updateRenameTablePopoverPosition]);

  useEffect(() => {
    if (!isRenameTablePopoverOpen) return;
    requestAnimationFrame(() => {
      renameTableInputRef.current?.focus();
      renameTableInputRef.current?.select();
    });
  }, [isRenameTablePopoverOpen]);

  useEffect(() => {
    setIsTableTabMenuOpen(false);
  }, [activeTableId]);

  useEffect(() => {
    if (!isResizingSidebar) return;
    const handleMouseMove = (event: MouseEvent) => {
      if (!leftNavRef.current) return;
      const rect = leftNavRef.current.getBoundingClientRect();
      const nextWidth = event.clientX - rect.left;
      const clampedWidth = Math.min(720, Math.max(280, nextWidth));
      setSidebarWidth(clampedWidth);
    };
    const handleMouseUp = () => {
      setIsResizingSidebar(false);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingSidebar]);

  useEffect(() => {
    if (!addMenuFromTables || !isAddMenuOpen) return;
    const updatePosition = () => {
      const trigger = tablesMenuAddRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 260;
      const gap = 12;
      const topOffset = 6;
      const left = Math.max(
        gap,
        Math.min(rect.right + gap, window.innerWidth - menuWidth - gap),
      );
      const top = rect.top + topOffset;
      setAddMenuPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [addMenuFromTables, isAddMenuOpen]);

  useEffect(() => {
    if (isTablesMenuOpen) return;
    if (addMenuFromTables) {
      setIsAddMenuOpen(false);
      setAddMenuFromTables(false);
    }
  }, [isTablesMenuOpen, addMenuFromTables]);

  useEffect(() => {
    if (!isBaseGuideEditing) return;
    requestAnimationFrame(() => {
      baseGuideTextRef.current?.focus();
    });
  }, [isBaseGuideEditing]);

  useEffect(() => {
    return () => {
      if (!rowHeightTransitionTimeoutRef.current) return;
      window.clearTimeout(rowHeightTransitionTimeoutRef.current);
      rowHeightTransitionTimeoutRef.current = null;
    };
  }, []);

  const handleRowHeightChange = useCallback(
    (nextHeight: RowHeightOption) => {
      if (nextHeight === rowHeight) return;

      const currentHeightPx = Number.parseInt(ROW_HEIGHT_SETTINGS[rowHeight].row, 10);
      const nextHeightPx = Number.parseInt(ROW_HEIGHT_SETTINGS[nextHeight].row, 10);
      const isCollapsing =
        Number.isFinite(currentHeightPx) && Number.isFinite(nextHeightPx)
          ? nextHeightPx < currentHeightPx
          : false;

      // Calculate the gap based on height difference (capped for visual appeal)
      const heightDiff = isCollapsing ? currentHeightPx - nextHeightPx : 0;
      const collapseGap = Math.min(heightDiff * 0.4, 16); // 40% of diff, max 16px

      setRowHeight(nextHeight);
      setIsRowHeightCollapsing(isCollapsing);
      setRowHeightCollapseGap(collapseGap);
      setIsRowHeightAnimating(true);

      if (rowHeightTransitionTimeoutRef.current) {
        window.clearTimeout(rowHeightTransitionTimeoutRef.current);
      }

      rowHeightTransitionTimeoutRef.current = window.setTimeout(() => {
        setIsRowHeightAnimating(false);
        setIsRowHeightCollapsing(false);
        setRowHeightCollapseGap(0);
        rowHeightTransitionTimeoutRef.current = null;
      }, ROW_HEIGHT_TRANSITION_MS + 40);
    },
    [rowHeight],
  );

  const resizeBaseGuideText = useCallback(() => {
    const textarea = baseGuideTextRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, []);

  useEffect(() => {
    if (!baseMenuSections.guide) return;
    resizeBaseGuideText();
  }, [baseGuideText, baseMenuSections.guide, resizeBaseGuideText]);

  const toggleBaseMenuSection = (section: keyof BaseMenuSections) => {
    setBaseMenuSections((current) => {
      const nextValue = !current[section];
      if (section === "guide" && !nextValue) {
        setIsBaseGuideEditing(false);
      }
      return { ...current, [section]: nextValue };
    });
  };

  useEffect(() => {
    addColumnCreateRef.current = handleAddColumnCreate;
    selectedAddColumnKindRef.current = selectedAddColumnKind;
  }, [handleAddColumnCreate, selectedAddColumnKind]);

  // Keyboard navigation effect is added after handleKeyboardNavigation definition

  const tableData = useMemo(() => {
    return logPerf("[table] window slice", () => {
      const source = (() => {
        if (isBottomQuickAddOpen && bottomQuickAddRowId) {
          const hiddenIndex = data.findIndex((row) => row?.id === bottomQuickAddRowId);
          if (hiddenIndex === -1) return data;
          const nextData = [...data];
          nextData[hiddenIndex] = undefined;
          return nextData;
        }
        return data;
      })();

      const cappedStart = Math.max(0, renderWindowStart);
      const cappedEnd = Math.max(renderWindowEnd, bottomQuickAddRowIndex);
      if (cappedEnd < 0) return source;
      if (cappedStart >= source.length) return [];
      const nextEnd = Math.min(source.length - 1, cappedEnd);
      const slice = source.slice(cappedStart, nextEnd + 1);
      if (isDev) {
        // eslint-disable-next-line no-console
        console.log(
          `[perf] table window slice rows=${slice.length} start=${cappedStart} end=${nextEnd} ` +
            `data=${source.length}`
        );
      }
      return slice;
    });
  }, [
    bottomQuickAddRowId,
    bottomQuickAddRowIndex,
    data,
    isBottomQuickAddOpen,
    logPerf,
    renderWindowEnd,
    renderWindowStart,
  ]);

  const table = useReactTable({
    data: tableData as TableRow[],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row, index) =>
      row?.id ?? `placeholder-${renderWindowStart + index}`,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    manualSorting: true,
    enableMultiSort: false,
    onColumnSizingChange: setColumnSizing,
    onSortingChange: (updater) => {
      setSorting((previous) => {
        const next =
          typeof updater === "function" ? updater(previous) : updater;
        return next.slice(0, 1);
      });
    },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      columnSizing,
    },
  });

  const visibleLeafColumns = table.getVisibleLeafColumns();
  const tableWidth = table.getTotalSize() + ADD_COLUMN_CELL_WIDTH;
  const freezeDividerStops = useMemo(() => {
    const stops: Array<{ left: number; frozenCount: number }> = [
      { left: ROW_NUMBER_COLUMN_WIDTH, frozenCount: 0 },
    ];
    let runningLeft = ROW_NUMBER_COLUMN_WIDTH;
    for (let columnIndex = 1; columnIndex < visibleLeafColumns.length; columnIndex += 1) {
      runningLeft += visibleLeafColumns[columnIndex]?.getSize() ?? 0;
      stops.push({ left: Math.round(runningLeft), frozenCount: columnIndex });
    }
    return stops;
  }, [visibleLeafColumns]);
  const maxFrozenDataColumnCount = Math.max(0, visibleLeafColumns.length - 1);
  const freezeTooltipFrozenCount = freezePreviewFrozenCount ?? frozenDataColumnCount;
  const freezeTooltipLabel = `Freeze ${freezeTooltipFrozenCount} column${
    freezeTooltipFrozenCount === 1 ? "" : "s"
  }`;
  const frozenColumnLeftByIndex = useMemo(() => {
    const offsetMap = new Map<number, number>();
    let runningLeft = ROW_NUMBER_COLUMN_WIDTH;
    const lastFrozenIndex = Math.min(maxFrozenDataColumnCount, frozenDataColumnCount);
    for (let columnIndex = 1; columnIndex <= lastFrozenIndex; columnIndex += 1) {
      offsetMap.set(columnIndex, Math.round(runningLeft));
      runningLeft += visibleLeafColumns[columnIndex]?.getSize() ?? 0;
    }
    return offsetMap;
  }, [visibleLeafColumns, frozenDataColumnCount, maxFrozenDataColumnCount]);
  const frozenDividerLeft =
    freezeDividerStops.find((entry) => entry.frozenCount === frozenDataColumnCount)?.left ??
    ROW_NUMBER_COLUMN_WIDTH;
  const getNearestFreezeStop = useCallback(
    (leftValue: number) => {
      let nearest = freezeDividerStops[0] ?? {
        left: ROW_NUMBER_COLUMN_WIDTH,
        frozenCount: 0,
      };
      for (const stop of freezeDividerStops) {
        if (Math.abs(stop.left - leftValue) < Math.abs(nearest.left - leftValue)) {
          nearest = stop;
        }
      }
      return nearest;
    },
    [freezeDividerStops],
  );
  const visibleColumnSizeSignature = useMemo(
    () =>
      visibleLeafColumns
        .map((column) => `${column.id}:${column.getSize()}`)
        .join("|"),
    [visibleLeafColumns],
  );
  const frozenBoundaryColumnId =
    frozenDataColumnCount > 0
      ? visibleLeafColumns[Math.min(maxFrozenDataColumnCount, frozenDataColumnCount)]?.id ?? null
      : null;

  useEffect(() => {
    setFrozenDataColumnCount((previous) =>
      Math.min(maxFrozenDataColumnCount, Math.max(0, previous)),
    );
  }, [maxFrozenDataColumnCount]);

  useEffect(() => {
    renderWindowStartRef.current = renderWindowStart;
  }, [renderWindowStart]);

  useLayoutEffect(() => {
    if (isDraggingFreezeDivider) return;
    const container = tableContainerRef.current;
    const boundaryHeader = frozenBoundaryColumnId
      ? columnHeaderRefs.current.get(frozenBoundaryColumnId) ?? null
      : null;
    const nextBoundaryLeft =
      container && boundaryHeader
        ? boundaryHeader.getBoundingClientRect().right - container.getBoundingClientRect().left
        : frozenDividerLeft;
    setFrozenBoundaryLeft((previous) =>
      Math.abs(previous - nextBoundaryLeft) < 0.5 ? previous : nextBoundaryLeft,
    );
    if (container) {
      container.style.setProperty("--freeze-boundary-left", `${nextBoundaryLeft}px`);
      container.style.setProperty("--freeze-snap-left", `${nextBoundaryLeft}px`);
    }
  }, [
    isDraggingFreezeDivider,
    frozenBoundaryColumnId,
    frozenDividerLeft,
    visibleColumnSizeSignature,
  ]);

  const alignScrollToFullColumn = useCallback(
    (targetFrozenCount: number) => {
      const container = tableContainerRef.current;
      if (!container) return;

      const boundaryLeft =
        freezeDividerStops.find((entry) => entry.frozenCount === targetFrozenCount)?.left ??
        ROW_NUMBER_COLUMN_WIDTH;
      const snapStops = [0];

      for (
        let columnIndex = targetFrozenCount + 1;
        columnIndex < visibleLeafColumns.length;
        columnIndex += 1
      ) {
        const columnStartLeft = freezeDividerStops[columnIndex - 1]?.left;
        if (columnStartLeft === undefined) continue;
        const snapValue = Math.max(0, Math.round(columnStartLeft - boundaryLeft));
        if (snapStops[snapStops.length - 1] !== snapValue) {
          snapStops.push(snapValue);
        }
      }

      let nextScrollLeft = 0;
      const currentScrollLeft = container.scrollLeft;
      for (const stop of snapStops) {
        if (stop <= currentScrollLeft + 0.5) {
          nextScrollLeft = stop;
        } else {
          break;
        }
      }

      if (Math.abs(currentScrollLeft - nextScrollLeft) > 0.5) {
        container.scrollLeft = nextScrollLeft;
      }
    },
    [freezeDividerStops, visibleLeafColumns],
  );

  const updateFreezeHoverPosition = useCallback((clientY: number) => {
    const container = tableContainerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const hoverY = Math.min(
      containerRect.height,
      Math.max(0, clientY - containerRect.top),
    );
    container.style.setProperty("--freeze-hover-y", `${Math.round(hoverY)}px`);
  }, []);
  const updateFreezePreviewFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const container = tableContainerRef.current;
      if (!container || freezeDividerStops.length === 0) return;
      const containerRect = container.getBoundingClientRect();
      const minLeft = freezeDividerStops[0]?.left ?? ROW_NUMBER_COLUMN_WIDTH;
      const maxLeft =
        freezeDividerStops[freezeDividerStops.length - 1]?.left ?? ROW_NUMBER_COLUMN_WIDTH;
      const viewportX = clientX - containerRect.left;
      const contentLeft = Math.min(maxLeft, Math.max(minLeft, viewportX));
      updateFreezeHoverPosition(clientY);
      const nearestStop = getNearestFreezeStop(contentLeft);
      setFreezePreviewFrozenCount((previous) =>
        previous === nearestStop.frozenCount ? previous : nearestStop.frozenCount,
      );
    },
    [freezeDividerStops, getNearestFreezeStop, updateFreezeHoverPosition],
  );

  const startFreezeDividerDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!tableContainerRef.current || freezeDividerStops.length === 0) return;
      alignScrollToFullColumn(frozenDataColumnCount);
      const container = tableContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const minLeft = freezeDividerStops[0]?.left ?? ROW_NUMBER_COLUMN_WIDTH;
      const maxLeft =
        freezeDividerStops[freezeDividerStops.length - 1]?.left ?? ROW_NUMBER_COLUMN_WIDTH;
      const viewportX = clientX - containerRect.left;
      const nextLeft = Math.min(maxLeft, Math.max(minLeft, viewportX));
      freezeDividerDragStateRef.current = {
        containerLeft: containerRect.left,
        minLeft,
        maxLeft,
        latestLeft: nextLeft,
      };
      updateFreezeHoverPosition(clientY);
      const nearestStop = getNearestFreezeStop(nextLeft);
      container.style.setProperty("--freeze-boundary-left", `${nextLeft}px`);
      container.style.setProperty("--freeze-snap-left", `${nearestStop.left}px`);
      setFreezePreviewFrozenCount(nearestStop.frozenCount);
      setIsDraggingFreezeDivider(true);
    },
    [
      freezeDividerStops,
      alignScrollToFullColumn,
      frozenDataColumnCount,
      getNearestFreezeStop,
      updateFreezeHoverPosition,
    ],
  );

  useEffect(() => {
    if (!isDraggingFreezeDivider) return;
    const clampFreezeLeft = (value: number, minLeft: number, maxLeft: number) =>
      Math.min(maxLeft, Math.max(minLeft, value));
    const handlePointerMove = (event: PointerEvent) => {
      const dragState = freezeDividerDragStateRef.current;
      const container = tableContainerRef.current;
      if (!dragState || !container) return;
      const viewportX = event.clientX - dragState.containerLeft;
      const contentLeft = clampFreezeLeft(
        viewportX,
        dragState.minLeft,
        dragState.maxLeft,
      );
      dragState.latestLeft = contentLeft;
      updateFreezeHoverPosition(event.clientY);
      const nearestStop = getNearestFreezeStop(contentLeft);
      container.style.setProperty("--freeze-boundary-left", `${contentLeft}px`);
      container.style.setProperty("--freeze-snap-left", `${nearestStop.left}px`);
      setFreezePreviewFrozenCount((previous) =>
        previous === nearestStop.frozenCount ? previous : nearestStop.frozenCount,
      );
    };
    const handlePointerUp = () => {
      const container = tableContainerRef.current;
      const dragState = freezeDividerDragStateRef.current;
      const nearestStop = getNearestFreezeStop(dragState?.latestLeft ?? frozenBoundaryLeft);
      setFrozenDataColumnCount(nearestStop.frozenCount);
      alignScrollToFullColumn(nearestStop.frozenCount);
      if (container) {
        container.style.setProperty("--freeze-boundary-left", `${nearestStop.left}px`);
        container.style.setProperty("--freeze-snap-left", `${nearestStop.left}px`);
      }
      freezeDividerDragStateRef.current = null;
      setFreezePreviewFrozenCount(null);
      setIsDraggingFreezeDivider(false);
    };
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [
    isDraggingFreezeDivider,
    freezeDividerStops,
    frozenBoundaryLeft,
    alignScrollToFullColumn,
    getNearestFreezeStop,
    updateFreezeHoverPosition,
  ]);

  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) < Math.abs(event.deltaY)) return;
      const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth);
      const atLeftEdge = container.scrollLeft <= 0;
      const atRightEdge = container.scrollLeft >= maxScrollLeft;
      if (
        (event.deltaX < 0 && atLeftEdge) ||
        (event.deltaX > 0 && atRightEdge)
      ) {
        event.preventDefault();
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const tableRows = table.getRowModel().rows;
  useLayoutEffect(() => {
    const elements = rowRefs.current;
    if (elements.size === 0) return;

    const nextTopById = new Map<string, number>();
    elements.forEach((element, rowId) => {
      const nextTop = element.getBoundingClientRect().top;
      nextTopById.set(rowId, nextTop);
      const previousTop = rowTopByIdRef.current.get(rowId);
      if (!shouldAnimateRowPositionsRef.current || previousTop === undefined) return;
      const deltaY = previousTop - nextTop;
      if (Math.abs(deltaY) < 0.5) return;

      element.style.transition = "none";
      element.style.transform = `translateY(${deltaY}px)`;
      if (typeof window !== "undefined") {
        window.requestAnimationFrame(() => {
          element.style.transition = "transform 180ms cubic-bezier(0.2, 0, 0, 1)";
          element.style.transform = "";
        });
      } else {
        element.style.transition = "transform 180ms cubic-bezier(0.2, 0, 0, 1)";
        element.style.transform = "";
      }
    });

    rowTopByIdRef.current = nextTopById;
    if (shouldAnimateRowPositionsRef.current) {
      shouldAnimateRowPositionsRef.current = false;
    }
  }, [renderWindowEnd, renderWindowStart, tableRows]);
  const getRowAtIndex = useCallback(
    (rowIndex: number) => {
      const localIndex = rowIndex - renderWindowStart;
      if (localIndex < 0 || localIndex >= tableRows.length) return undefined;
      return tableRows[localIndex];
    },
    [renderWindowStart, tableRows],
  );
  const updateRowSelectionRange = useCallback(
    (rowIndex: number) => {
      const dragState = rowSelectDragRef.current;
      if (!dragState) return;
      if (dragState.lastRowIndex === rowIndex) return;
      dragState.lastRowIndex = rowIndex;
      const minRow = Math.min(dragState.anchorRowIndex, rowIndex);
      const maxRow = Math.max(dragState.anchorRowIndex, rowIndex);
      const nextSelection: RowSelectionState = {};
      for (let r = minRow; r <= maxRow; r += 1) {
        const row = getRowAtIndex(r);
        if (!row || isPlaceholderRow(row.original)) continue;
        nextSelection[row.id] = true;
      }
      setRowSelection(nextSelection);
    },
    [getRowAtIndex, isPlaceholderRow],
  );

  const startRowSelectionDrag = useCallback(
    (event: React.MouseEvent | React.PointerEvent, rowIndex: number) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      clearSelection();
      const row = getRowAtIndex(rowIndex);
      if (!row || isPlaceholderRow(row.original)) return;
      rowSelectDragRef.current = { anchorRowIndex: rowIndex, lastRowIndex: rowIndex };
      setIsRowSelectDragging(true);
      setRowSelection({ [row.id]: true });
    },
    [clearSelection, getRowAtIndex, isPlaceholderRow],
  );

  useEffect(() => {
    if (!isRowSelectDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      const rowIndex = getRowIndexFromPoint(event.clientX, event.clientY);
      if (rowIndex === null) return;
      updateRowSelectionRange(rowIndex);
    };

    const handleMouseUp = () => {
      rowSelectDragRef.current = null;
      setIsRowSelectDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "ns-resize";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
    };
  }, [getRowIndexFromPoint, isRowSelectDragging, updateRowSelectionRange]);
  const getCellDisplayText = useCallback(
    (cellValue: unknown, columnId: string) => {
      const rawText =
        typeof cellValue === "string"
          ? cellValue
          : typeof cellValue === "number"
            ? String(cellValue)
            : "";
      const field = tableFieldById.get(columnId);
      if (field?.kind === "number") {
        return formatNumberCellValue(rawText, field.numberConfig);
      }
      return rawText;
    },
    [tableFieldById],
  );
  const searchMatches = useMemo(() => {
    if (!normalizedSearchQuery) return [];
    const matches: Array<{ rowIndex: number; columnIndex: number }> = [];
    tableRows.forEach((row, localIndex) => {
      if (isPlaceholderRow(row.original)) return;
      const rowIndex = localIndex + renderWindowStart;
      row.getVisibleCells().forEach((cell, columnIndex) => {
        if (cell.column.id === "rowNumber") return;
        const displayText = getCellDisplayText(cell.getValue(), cell.column.id);
        if (!displayText) return;
        if (displayText.toLowerCase().includes(normalizedSearchQuery)) {
          matches.push({ rowIndex, columnIndex });
        }
      });
    });
    return matches;
  }, [getCellDisplayText, isPlaceholderRow, normalizedSearchQuery, renderWindowStart, tableRows]);

  useEffect(() => {
    const pending = pendingScrollToCellRef.current;
    if (!pending) return;
    if (pending.rowIndex < 0) return;
    if (!getRowAtIndex(pending.rowIndex)) return;
    pendingScrollToCellRef.current = null;
    requestAnimationFrame(() => {
      scrollToCellRef.current(pending.rowIndex, pending.columnIndex, pending.align);
      requestAnimationFrame(() => {
        scrollToCellRef.current(pending.rowIndex, pending.columnIndex, pending.align);
      });
    });
  }, [getRowAtIndex]);
  const searchMatchRowIndexSet = useMemo(() => {
    const next = new Set<number>();
    searchMatches.forEach((match) => {
      next.add(match.rowIndex);
    });
    return next;
  }, [searchMatches]);
  const activeSearchMatch = useMemo(() => {
    // When using server-provided indices, find the first local match for the
    // target row so highlighting picks it up correctly.
    if (serverSearchIndices.length > 0 && serverSearchNavIndex >= 0) {
      const targetRowIndex = serverSearchIndices[serverSearchNavIndex];
      if (targetRowIndex !== undefined) {
        const localMatch = searchMatches.find((m) => m.rowIndex === targetRowIndex);
        if (localMatch) return localMatch;
      }
      return null;
    }
    return activeSearchMatchIndex >= 0
      ? searchMatches[activeSearchMatchIndex] ?? null
      : null;
  }, [activeSearchMatchIndex, searchMatches, serverSearchIndices, serverSearchNavIndex]);
  const hasSearchMatches = normalizedSearchQuery.length > 0 && searchMatches.length > 0;
  const searchMatchTotalCount = searchMatchTotal ?? searchMatches.length;
  const hasSearchMatchesInTable =
    normalizedSearchQuery.length > 0 && searchMatchTotalCount > 0;
  const canUseLocalFallbackNavigation =
    !isSearchCountLoading &&
    searchMatchTotal !== null &&
    searchMatchTotal <= searchMatches.length;
  const needsGlobalServerNavigation =
    normalizedSearchQuery.length > 0 && !canUseLocalFallbackNavigation;
  const canUseServerNavigation =
    serverSearchIndices.length > 0 || canUseLocalFallbackNavigation;
  const isSearchNavigationLoading =
    isSearchCountLoading || (needsGlobalServerNavigation && isSearchIndicesLoading);
  const searchMatchLabel = (() => {
    if (normalizedSearchQuery.length === 0) return "";
    if (!hasSearchMatchesInTable) return "No results";
    // When server indices are loaded, use them for the "N of M" label.
    if (serverSearchIndices.length > 0) {
      const activeIndex = Math.max(1, serverSearchNavIndex + 1);
      return `${activeIndex} of ${searchMatchTotalCount}`;
    }
    if (searchMatches.length === 0) {
      return `0 of ${searchMatchTotalCount}`;
    }
    const activeIndex = Math.max(1, activeSearchMatchIndex + 1);
    return `${activeIndex} of ${searchMatchTotalCount}`;
  })();
  const renderSearchHighlightedText = (
    text: string,
    query: string,
    isActive: boolean,
  ): ReactNode => {
    if (!query) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    if (!lowerText.includes(lowerQuery)) return text;
    const parts: React.ReactNode[] = [];
    let startIndex = 0;
    let matchIndex = lowerText.indexOf(lowerQuery, startIndex);
    let matchCount = 0;
    while (matchIndex !== -1) {
      if (matchIndex > startIndex) {
        parts.push(text.slice(startIndex, matchIndex));
      }
      const matchText = text.slice(matchIndex, matchIndex + lowerQuery.length);
      parts.push(
        <span
          key={`${matchIndex}-${matchCount}`}
          className={`${styles.searchMatchText} ${isActive ? styles.searchMatchTextActive : ""}`}
        >
          {matchText}
        </span>,
      );
      matchCount += 1;
      startIndex = matchIndex + lowerQuery.length;
      matchIndex = lowerText.indexOf(lowerQuery, startIndex);
    }
    if (startIndex < text.length) {
      parts.push(text.slice(startIndex));
    }
    return parts;
  };
  const rowHeightPx = useMemo(() => {
    const rawValue = Number.parseInt(ROW_HEIGHT_SETTINGS[rowHeight].row, 10);
    return Number.isFinite(rawValue) ? rawValue : 32;
  }, [rowHeight]);

  useEffect(() => {
    if (normalizedSearchQuery !== lastSearchQueryRef.current) {
      lastSearchQueryRef.current = normalizedSearchQuery;
      searchNavTargetRef.current = null;
      setActiveSearchMatchIndex(searchMatches.length > 0 ? 0 : -1);
      return;
    }
    // When navigating, re-locate the target match in the (potentially shifted) matches array
    const target = searchNavTargetRef.current;
    if (target && searchMatches.length > 0) {
      const idx = searchMatches.findIndex(
        (m) => m.rowIndex === target.rowIndex && m.columnIndex === target.columnIndex,
      );
      if (idx >= 0) {
        setActiveSearchMatchIndex(idx);
        return;
      }
    }
    setActiveSearchMatchIndex((previous) => {
      if (!normalizedSearchQuery || searchMatches.length === 0) return -1;
      if (previous < 0) return 0;
      if (previous >= searchMatches.length) return searchMatches.length - 1;
      return previous;
    });
  }, [normalizedSearchQuery, searchMatches]);

  // Dynamic overscan based on scroll velocity — use MORE overscan when scrolling fast
  const dynamicOverscan = isFastScrolling
    ? ROWS_FAST_SCROLL_OVERSCAN
    : ROWS_VIRTUAL_OVERSCAN;

  // Use the larger of server total and local rows so optimistic inserts render immediately.
  const virtualizerCount = Math.max(
    activeTableTotalRows,
    renderWindowStart + tableRows.length,
  );

  const rowVirtualizer = useVirtualizer({
    count: virtualizerCount,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => rowHeightPx,
    overscan: dynamicOverscan,
  });

  useEffect(() => {
    if (typeof window === "undefined") {
      rowVirtualizer.measure();
      return;
    }
    const raf = window.requestAnimationFrame(() => {
      rowVirtualizer.measure();
    });
    return () => {
      window.cancelAnimationFrame(raf);
    };
  }, [rowVirtualizer, rowHeightPx]);
  const virtualRows = rowVirtualizer.getVirtualItems();
  const virtualPaddingTop = virtualRows[0]?.start ?? 0;
  const virtualPaddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;

  useEffect(() => {
    if (!activeCellFollowEnabledRef.current) return;
    if (activeCellRowIndex === null) {
      activeCellFollowEnabledRef.current = false;
      return;
    }
    if (virtualRows.length === 0) return;
    const startIndex = virtualRows[0]?.index ?? 0;
    const endIndex = virtualRows[virtualRows.length - 1]?.index ?? 0;
    if (activeCellRowIndex < startIndex || activeCellRowIndex > endIndex) {
      if (typeof window === "undefined") {
        rowVirtualizer.scrollToIndex(activeCellRowIndex, { align: "end" });
      } else {
        window.requestAnimationFrame(() => {
          rowVirtualizer.scrollToIndex(activeCellRowIndex, { align: "end" });
        });
      }
      return;
    }
    activeCellFollowEnabledRef.current = false;
  }, [activeCellRowIndex, virtualRows, rowVirtualizer]);

  useEffect(() => {
    if (virtualRows.length === 0) return;
    const firstIndex = virtualRows[0]?.index ?? 0;
    const lastIndex = virtualRows[virtualRows.length - 1]?.index ?? 0;
    // During fast scroll, use a tiny buffer so the window shifts immediately
    const windowBuffer = isFastScrolling
      ? Math.max(dynamicOverscan, 50)
      : Math.max(dynamicOverscan * 2, ROWS_PAGE_SIZE / 4);
    const windowPageCount = isFastScrolling ? 5 : 2;
    const windowSize = Math.max(
      ROWS_PAGE_SIZE * windowPageCount,
      windowBuffer * 4,
    );
    const lowerBound = renderWindowStart + windowBuffer;
    const upperBound = renderWindowEnd - windowBuffer;
    const shouldShift = firstIndex < lowerBound || lastIndex > upperBound;
    if (!shouldShift) return;
    const desiredStart = Math.max(0, firstIndex - windowBuffer);
    const desiredEnd = Math.max(
      desiredStart + windowSize - 1,
      lastIndex + windowBuffer,
      bottomQuickAddRowIndex,
    );
    setRenderWindowStart(desiredStart);
    setRenderWindowEnd(desiredEnd);
  }, [
    bottomQuickAddRowIndex,
    dynamicOverscan,
    isFastScrolling,
    renderWindowEnd,
    renderWindowStart,
    virtualRows,
  ]);
  const tableBodyColSpan = visibleLeafColumns.length + 1;
  const isRowWindowFetching = rowWindowFetchCount > 0;
  const suppressLoadingRows = sorting.length > 0;
  const hasLoadedAnyRows = (activeRowStore?.maxLoadedIndex ?? -1) >= 0;
  const isInitialTablesLoading =
    tablesQuery.isLoading || (tablesQuery.isFetching && tables.length === 0);
  const isInitialViewsLoading =
    Boolean(activeTableId) &&
    activeTableBootstrapQuery.isLoading &&
    !activeTableBootstrapQuery.data;
  const shouldShowLoadingOverlay = isInitialTablesLoading || isInitialViewsLoading;
  const isInitialRowsLoading =
    Boolean(activeTableId) &&
    !isBottomQuickAddOpen &&
    !hasLoadedAnyRows &&
    (activeTableBootstrapQuery.isLoading ||
      (isRowWindowFetching && tableRows.length === 0));
  const isFooterQuickAddActive = isBottomQuickAddOpen && bottomQuickAddRowId !== null;
  const shouldHideTableChrome = !activeTable;
  const shouldRenderTableBody =
    !isInitialRowsLoading || hasLoadedAnyRows || activeTableTotalRows > 0;

  useEffect(() => {
    if (!activeTableId) return;
    if (!activeTableBootstrapQuery.data) return;
    const store = rowStoreRef.current;
    if (!store || store.fetchedRanges.length > 0) return;
    void ensureRowRange(0, ROWS_PAGE_SIZE - 1);
  }, [activeTableBootstrapQuery.data, activeTableId, ensureRowRange, rowStoreVersion]);

  // Re-map rows in the store when fields become available after rows were already
  // fetched with stale (empty) field closures. This fixes a race condition where
  // the async row fetch resolves before bootstrapFieldsForRows/tableFields are
  // populated, resulting in rows stored without cell values.
  useEffect(() => {
    const fieldsCount = tableFields.length + bootstrapFieldsForRows.length;
    const prevFieldsCount = lastRowMapFieldsCountRef.current;
    lastRowMapFieldsCountRef.current = fieldsCount;
    if (prevFieldsCount > 0 || fieldsCount === 0) return;
    // Fields just transitioned from 0 → non-zero
    if (!activeTableId) return;
    const store = rowStoreRef.current;
    if (!store || store.rowsByUiId.size === 0 || store.rawCellsByUiId.size === 0) return;
    // Check if existing rows are missing cell values (mapped with empty fields)
    const fields = tableFields.length > 0 ? tableFields : bootstrapFieldsForRows;
    if (fields.length === 0) return;
    const sampleUiId = store.rowsByUiId.keys().next().value;
    if (!sampleUiId) return;
    const sampleRow = store.rowsByUiId.get(sampleUiId);
    if (!sampleRow) return;
    const hasCellValues = fields.some((field) => field.id in sampleRow);
    if (hasCellValues) return;
    // Re-map all rows from preserved raw cells
    let didRemap = false;
    store.rowsByUiId.forEach((existingRow, uiId) => {
      const rawCells = store.rawCellsByUiId.get(uiId);
      if (!rawCells) return;
      const serverId = existingRow.serverId ?? uiId.replace(/^s_/, "");
      const remapped = mapDbRowToTableRow({ id: serverId, cells: rawCells });
      store.rowsByUiId.set(uiId, remapped);
      didRemap = true;
    });
    if (didRemap) {
      // Rebuild table data from the updated store
      updateTableById(activeTableId, (table) => buildTableDataFromRowStore(table, store));
      setRowStoreVersion((prev) => prev + 1);
    }
  }, [activeTableId, bootstrapFieldsForRows, tableFields, mapDbRowToTableRow, updateTableById, buildTableDataFromRowStore]);

  useEffect(() => {
    if (!activeTableId) return;
    if (!activeTableBootstrapQuery.data) return;
    if (preparedTableIndexesRef.current.has(activeTableId)) return;
    preparedTableIndexesRef.current.add(activeTableId);
    void prepareIndexesMutation.mutateAsync({ tableId: activeTableId }).catch(() => {
      // Allow retry on failure.
      preparedTableIndexesRef.current.delete(activeTableId);
    });
  }, [activeTableBootstrapQuery.data, activeTableId, prepareIndexesMutation]);

  // Scroll to ensure cell is visible
  const scrollToCell = useCallback(
    (rowIndex: number, columnIndex: number, align: "auto" | "start" | "center" | "end" = "auto") => {
      // Scroll row into view using virtualizer
      rowVirtualizer.scrollToIndex(rowIndex, { align });

      // Scroll column into view (horizontal scroll)
      const cellKey = getCellRefKey(rowIndex, columnIndex);
      const cellElement = cellRefs.current.get(cellKey);
      if (cellElement && tableContainerRef.current) {
        const container = tableContainerRef.current;
        const cellRect = cellElement.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        // Account for sticky row number + frozen columns.
        const stickyColumnWidth = frozenBoundaryLeft;

        if (cellRect.left < containerRect.left + stickyColumnWidth) {
          container.scrollLeft -= containerRect.left + stickyColumnWidth - cellRect.left;
        } else if (cellRect.right > containerRect.right) {
          container.scrollLeft += cellRect.right - containerRect.right;
        }
      }
    },
    [rowVirtualizer, getCellRefKey, frozenBoundaryLeft]
  );

  // Avoid TDZ issues for callbacks defined earlier in this file.
  scrollToCellRef.current = scrollToCell;

  const startActiveCellFollow = useCallback(
    (rowIndexOverride?: number, columnIndexOverride?: number) => {
      activeCellFollowEnabledRef.current = true;
      if (activeCellFollowTimeoutRef.current) {
        window.clearTimeout(activeCellFollowTimeoutRef.current);
        activeCellFollowTimeoutRef.current = null;
      }
      activeCellFollowAttemptsRef.current = 0;

      const container = tableContainerRef.current;
      if (!container) return;

      const followStep = () => {
        const rowIndex =
          typeof rowIndexOverride === "number"
            ? rowIndexOverride
            : activeCellRowIndexRef.current;
        const columnIndex =
          typeof columnIndexOverride === "number"
            ? columnIndexOverride
            : activeCellColumnIndexRef.current;
        if (rowIndex === null || columnIndex === null) {
          activeCellFollowEnabledRef.current = false;
          return;
        }

        const cellKey = getCellRefKey(rowIndex, columnIndex);
        const cellElement = cellRefs.current.get(cellKey);
        const containerRect = container.getBoundingClientRect();
        const isVisible =
          cellElement &&
          (() => {
            const rect = cellElement.getBoundingClientRect();
            return rect.top >= containerRect.top && rect.bottom <= containerRect.bottom;
          })();

        if (!isVisible) {
          rowVirtualizer.scrollToIndex(rowIndex, { align: "end" });
          scrollToCellRef.current(rowIndex, columnIndex, "end");
        }

        if (isVisible) {
          activeCellFollowEnabledRef.current = false;
          return;
        }

        activeCellFollowAttemptsRef.current += 1;
        if (activeCellFollowAttemptsRef.current >= 20) {
          activeCellFollowEnabledRef.current = false;
          return;
        }
        activeCellFollowTimeoutRef.current = window.setTimeout(followStep, 80);
      };

      requestAnimationFrame(() => {
        followStep();
      });
    },
    [getCellRefKey, rowVirtualizer]
  );

  useEffect(() => {
    if (activeCellRowIndex === null || activeCellColumnIndex === null) return;
    if (activeCellScrollTimeoutRef.current) {
      window.clearTimeout(activeCellScrollTimeoutRef.current);
      activeCellScrollTimeoutRef.current = null;
    }

    const container = tableContainerRef.current;
    const cellKey = getCellRefKey(activeCellRowIndex, activeCellColumnIndex);
    const isCellVisible = () => {
      if (!container) return false;
      const cellElement = cellRefs.current.get(cellKey);
      if (!cellElement) return false;
      const rect = cellElement.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return rect.top >= containerRect.top && rect.bottom <= containerRect.bottom;
    };

    if (isCellVisible()) return;

    const attemptScroll = (attempt: number) => {
      rowVirtualizer.scrollToIndex(activeCellRowIndex, { align: "end" });
      scrollToCellRef.current(activeCellRowIndex, activeCellColumnIndex, "end");
      if (attempt >= 2) return;
      activeCellScrollTimeoutRef.current = window.setTimeout(() => {
        if (isCellVisible()) {
          activeCellScrollTimeoutRef.current = null;
          return;
        }
        attemptScroll(attempt + 1);
      }, 120);
    };

    requestAnimationFrame(() => {
      attemptScroll(0);
    });
  }, [
    activeCellColumnIndex,
    activeCellRowIndex,
    getCellRefKey,
    rowVirtualizer,
  ]);

  const handleSearchNavigate = useCallback(
    (direction: "prev" | "next") => {
      // Use server-provided indices when available (covers ALL rows in the table).
      // Fall back to client-side searchMatches (windowed only) otherwise.
      const indices = serverSearchIndicesRef.current;
      if (indices.length > 0) {
        const now = Date.now();
        lastSearchNavigateAtRef.current = now;
        // Set a long suppression window – the .then() callback will extend it
        // further after data loads, but never shorten it.
        suppressSearchViewportSyncUntilRef.current = now + 3000;
        const step = direction === "next" ? 1 : -1;
        const currentNav = serverSearchNavIndexRef.current >= 0 ? serverSearchNavIndexRef.current : 0;
        const nextNav =
          step > 0
            ? (currentNav + 1) % indices.length
            : currentNav <= 0
              ? indices.length - 1
              : currentNav - 1;
        serverSearchNavIndexRef.current = nextNav;
        setServerSearchNavIndex(nextNav);
        const targetRowIndex = indices[nextNav]!;
        const navigationRequestId = searchNavigateRequestIdRef.current + 1;
        searchNavigateRequestIdRef.current = navigationRequestId;
        // Ensure the target row page is loaded, then scroll to it.
        const pageStart =
          Math.floor(targetRowIndex / ROWS_PAGE_SIZE) * ROWS_PAGE_SIZE;
        void ensureRowRange(pageStart, pageStart + ROWS_PAGE_SIZE - 1).then(() => {
          if (searchNavigateRequestIdRef.current !== navigationRequestId) return;
          // Extend suppression — never shorten it from the initial 3s window.
          const extendedSuppression = Date.now() + 1500;
          if (extendedSuppression > suppressSearchViewportSyncUntilRef.current) {
            suppressSearchViewportSyncUntilRef.current = extendedSuppression;
          }
          // Also refresh the navigate timestamp so the viewport sync effect
          // continues to recognize this as a recent navigation.
          lastSearchNavigateAtRef.current = Date.now();
          searchNavTargetRef.current = { rowIndex: targetRowIndex, columnIndex: 1 };
          scrollToCellRef.current(targetRowIndex, 1, "center");
        });
        // Update the legacy activeSearchMatchIndex when the row is within
        // the current window so highlighting picks it up.
        const localMatch = searchMatches.find((m) => m.rowIndex === targetRowIndex);
        if (localMatch) {
          setActiveSearchMatchIndex(searchMatches.indexOf(localMatch));
        }
        return;
      }
      if (needsGlobalServerNavigation || isSearchIndicesLoading || !canUseLocalFallbackNavigation) {
        return;
      }
      // Fallback: client-side matches only
      if (searchMatches.length === 0) return;
      const now = Date.now();
      lastSearchNavigateAtRef.current = now;
      suppressSearchViewportSyncUntilRef.current = now + 700;
      const step = direction === "next" ? 1 : -1;
      const nextIndex =
        (activeSearchMatchIndex + step + searchMatches.length) % searchMatches.length;
      setActiveSearchMatchIndex(nextIndex);
      searchNavigateRequestIdRef.current += 1;
      const match = searchMatches[nextIndex];
      if (match) {
        searchNavTargetRef.current = { rowIndex: match.rowIndex, columnIndex: match.columnIndex };
        scrollToCellRef.current(match.rowIndex, match.columnIndex, "center");
      }
    },
    [
      activeSearchMatchIndex,
      ensureRowRange,
      canUseLocalFallbackNavigation,
      isSearchIndicesLoading,
      needsGlobalServerNavigation,
      searchMatches,
    ],
  );

  // Insert row below specified index
  const handleInsertRowBelow = useCallback(
    (
      afterRowIndex: number,
      anchorRowId?: string,
      focusColumnIndex?: number,
      scrollAlign: "auto" | "start" | "center" | "end" = "auto",
    ) => {
      if (!activeTable) return;

      const tableId = activeTable.id;
      const resolvedAnchorId = anchorRowId ? resolveServerRowId(anchorRowId) : null;
      if (resolvedAnchorId) {
        insertRowRelativeRef.current({
          anchorRowId: resolvedAnchorId,
          anchorRowIndex: afterRowIndex,
          position: "below",
          focusColumnIndex,
          scrollAlign,
        });
        return;
      }
      const fieldsSnapshot = activeTable.fields;
      const cells: Record<string, string> = {};

      fieldsSnapshot.forEach((field) => {
        cells[field.id] =
          field.defaultValue && field.defaultValue.length > 0
            ? field.defaultValue
            : getFakerCellValue(field);
      });

      const optimisticRowId = createClientRowId();
      const optimisticRow: TableRow = { id: optimisticRowId, ...cells };

      // Insert at specific position in local state
      updateTableById(tableId, (tbl) => {
        const newData = [...tbl.data];
        newData.splice(afterRowIndex + 1, 0, optimisticRow);
        return { ...tbl, data: newData };
      });
      applyRowInsertionToRowStore(afterRowIndex + 1);

      if (anchorRowId) {
        suspendTableServerSync(tableId);
        queuePendingRelativeInsert(anchorRowId, {
          tableId,
          anchorRowId,
          position: "below",
          optimisticRowId,
          cells,
          fieldsSnapshot,
        });
        return;
      }

      // API call to create row
      createRowMutation.mutate(
        { tableId, cells, clientUiId: optimisticRowId },
        {
          onSuccess: (createdRow) => {
            if (!createdRow?.id) return;
            // Track mapping for resolving queued cell updates in optimistic columns
            const createdRowId = createdRow.id;
            optimisticRowIdToRealIdRef.current.set(optimisticRowId, createdRowId);
            resolveOptimisticRowId(optimisticRowId, createdRowId);
            void flushPendingRelativeInserts(optimisticRowId, createdRowId);
            const nextRow: TableRow = { id: optimisticRowId, serverId: createdRowId };
            for (const [cellColumnId, cellValue] of Object.entries((createdRow.cells ?? {}) as Record<string, string>)) {
              nextRow[cellColumnId] = cellValue;
            }
            const queuedUpdates = consumeOptimisticRowCellUpdates(optimisticRowId);
            queuedUpdates.forEach((value, columnId) => {
              nextRow[columnId] = value;
            });
            updateTableById(tableId, (tbl) => ({
              ...tbl,
              data: (() => {
                const nextData = tbl.data.map((row) =>
                  row?.id === optimisticRowId ? nextRow : row,
                );
                const firstIndex = nextData.findIndex((row) => row?.id === nextRow.id);
                if (firstIndex !== -1) {
                  for (let index = 0; index < nextData.length; index += 1) {
                    if (index !== firstIndex && nextData[index]?.id === nextRow.id) {
                      nextData[index] = undefined;
                    }
                  }
                }
                return nextData;
              })(),
            }));
            if (queuedUpdates.size > 0) {
              commitBulkCellUpdates(
                tableId,
                Array.from(queuedUpdates.entries()).map(([columnId, value]) => ({
                  rowId: optimisticRowId,
                  columnId,
                  value,
                })),
              );
            }
            void utils.rows.listByTableId.invalidate({ tableId });
          },
          onError: () => {
            clearOptimisticRowCellUpdates(optimisticRowId);
            clearPendingRelativeInsertsForAnchor(optimisticRowId);
            updateTableById(tableId, (tbl) => {
              const index = tbl.data.findIndex((row) => row?.id === optimisticRowId);
              if (index !== -1) {
                applyRowDeletionToRowStore(index);
              }
              return {
                ...tbl,
                data: removeRowByIdFromData(tbl.data, optimisticRowId),
              };
            });
          },
        }
      );
    },
    [
      activeTable,
      applyRowDeletionToRowStore,
      applyRowInsertionToRowStore,
      clearPendingRelativeInsertsForAnchor,
      clearOptimisticRowCellUpdates,
      commitBulkCellUpdates,
      consumeOptimisticRowCellUpdates,
      createRowMutation,
      flushPendingRelativeInserts,
      getFakerCellValue,
      queuePendingRelativeInsert,
      removeRowByIdFromData,
      resolveServerRowId,
      resolveOptimisticRowId,
      suspendTableServerSync,
      updateTableById,
      utils,
    ]
  );

  // Clear content of selected cells
  const handleClearSelectedCells = useCallback(() => {
    if (!activeTable) return;

    const range =
      selectionRange ??
      (activeCellRowIndex !== null && activeCellColumnIndex !== null
        ? {
            minRowIndex: activeCellRowIndex,
            maxRowIndex: activeCellRowIndex,
            minColumnIndex: activeCellColumnIndex,
            maxColumnIndex: activeCellColumnIndex,
          }
        : null);

    if (!range) return;

    const visibleColumns = table.getVisibleLeafColumns();
    const localPatchesByRowIndex = new Map<number, Record<string, string>>();
    const serverUpdates: Array<{ rowId: string; columnId: string; value: string }> = [];

    for (let r = range.minRowIndex; r <= range.maxRowIndex; r++) {
      const row = getRowAtIndex(r);
      if (!row || isPlaceholderRow(row.original)) continue;
      for (let c = range.minColumnIndex; c <= range.maxColumnIndex; c++) {
        const column = visibleColumns[c];
        if (!column || column.id === "rowNumber") continue;

        const rowPatch = localPatchesByRowIndex.get(r) ?? {};
        rowPatch[column.id] = "";
        localPatchesByRowIndex.set(r, rowPatch);

        const rowId = row.original.id;
        if (isUuid(column.id)) {
          serverUpdates.push({
            rowId,
            columnId: column.id,
            value: "",
          });
        }
      }
    }

    applyLocalCellPatches(localPatchesByRowIndex);
    commitBulkCellUpdates(activeTable.id, serverUpdates);
  }, [
    activeTable,
    selectionRange,
    activeCellRowIndex,
    activeCellColumnIndex,
    table,
    isPlaceholderRow,
    applyLocalCellPatches,
    commitBulkCellUpdates,
  ]);

  // Copy selected cells to clipboard
  const handleCopy = useCallback(async () => {
    if (!activeTable) return;

    const range = selectionRange ?? (activeCellRowIndex !== null && activeCellColumnIndex !== null
      ? {
          minRowIndex: activeCellRowIndex,
          maxRowIndex: activeCellRowIndex,
          minColumnIndex: activeCellColumnIndex,
          maxColumnIndex: activeCellColumnIndex,
        }
      : null);

    if (!range) return;

    const visibleColumns = table.getVisibleLeafColumns();

    // Build 2D array of cell values
    const cellData: string[][] = [];
    const cellDataWithIds: Array<Array<{ value: string; columnId: string }>> = [];

    for (let r = range.minRowIndex; r <= range.maxRowIndex; r++) {
      const rowData: string[] = [];
      const rowDataWithIds: Array<{ value: string; columnId: string }> = [];
      const row = getRowAtIndex(r);
      if (!row || isPlaceholderRow(row.original)) {
        continue;
      }
      for (let c = range.minColumnIndex; c <= range.maxColumnIndex; c++) {
        const cell = row.getVisibleCells()[c];
        const column = visibleColumns[c];
        const value = cell?.getValue();
        const valueStr =
          typeof value === "string"
            ? value
            : typeof value === "number" || typeof value === "boolean" || typeof value === "bigint"
              ? String(value)
              : "";
        rowData.push(valueStr);
        rowDataWithIds.push({ value: valueStr, columnId: column?.id ?? "" });
      }

      cellData.push(rowData);
      cellDataWithIds.push(rowDataWithIds);
    }

    // Store internally for paste
    setClipboardData({
      cells: cellDataWithIds,
      isCut: false,
      sourceRange: {
        minRow: range.minRowIndex,
        maxRow: range.maxRowIndex,
        minCol: range.minColumnIndex,
        maxCol: range.maxColumnIndex,
      },
    });

    // Copy to system clipboard as TSV (tab-separated)
    const tsvText = cellData.map((row) => row.join("\t")).join("\n");
    try {
      await navigator.clipboard.writeText(tsvText);
    } catch {
      // Clipboard API may fail in some contexts
    }
  }, [
    activeTable,
    selectionRange,
    activeCellRowIndex,
    activeCellColumnIndex,
    table,
    isPlaceholderRow,
  ]);

  // Cut selected cells
  const handleCut = useCallback(async () => {
    await handleCopy();
    // Mark as cut (will show dashed border)
    setClipboardData((prev) => (prev ? { ...prev, isCut: true } : null));
  }, [handleCopy]);

  // Paste from clipboard
  const handlePaste = useCallback(async () => {
    if (!activeTable || activeCellRowIndex === null || activeCellColumnIndex === null) return;

    try {
      let pasteData: string[][] | null = null;

      try {
        // Read from system clipboard first.
        const text = await navigator.clipboard.readText();
        const normalizedText = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
        const lines = normalizedText.split("\n");
        if (lines.length > 1 && lines[lines.length - 1] === "") {
          lines.pop();
        }
        pasteData = lines.map((line) => line.split("\t"));
      } catch {
        // Clipboard API can fail in some contexts.
      }

      // Fallback to internal clipboard data (keeps multi-cell copy/paste reliable).
      if ((!pasteData || pasteData.length === 0) && clipboardData?.cells.length) {
        pasteData = clipboardData.cells.map((row) => row.map((cell) => cell.value));
      }

      if (!pasteData || pasteData.length === 0) return;

      const visibleColumns = table.getVisibleLeafColumns();
      const sourceRowCount = pasteData.length;
      const sourceColCount = Math.max(
        0,
        ...pasteData.map((row) => row.length),
      );
      if (sourceRowCount === 0 || sourceColCount === 0) return;
      const localPatchesByRowIndex = new Map<number, Record<string, string>>();
      const serverUpdatesByCell = new Map<
        string,
        { rowId: string; columnId: string; value: string }
      >();

      const queueCellUpdate = (
        rowIndex: number,
        rowId: string,
        columnId: string,
        value: string,
      ) => {
        const rowPatch = localPatchesByRowIndex.get(rowIndex) ?? {};
        rowPatch[columnId] = value;
        localPatchesByRowIndex.set(rowIndex, rowPatch);

        if (isUuid(columnId)) {
          serverUpdatesByCell.set(`${rowId}:${columnId}`, {
            rowId,
            columnId,
            value,
          });
        }
      };

      let targetMinRow = activeCellRowIndex;
      let targetMinCol = activeCellColumnIndex;
      let targetRowCount = sourceRowCount;
      let targetColCount = sourceColCount;

      if (selectionRange) {
        targetMinRow = selectionRange.minRowIndex;
        targetMinCol = selectionRange.minColumnIndex;
        targetRowCount = Math.max(1, selectionRange.maxRowIndex - selectionRange.minRowIndex + 1);
        targetColCount = Math.max(
          1,
          Math.min(
            selectionRange.maxColumnIndex - selectionRange.minColumnIndex + 1,
            sourceColCount,
          ),
        );

        const nextMaxCol = Math.min(
          visibleColumns.length - 1,
          targetMinCol + targetColCount - 1,
        );
        setSelectionRange({
          minRowIndex: selectionRange.minRowIndex,
          maxRowIndex: selectionRange.maxRowIndex,
          minColumnIndex: selectionRange.minColumnIndex,
          maxColumnIndex: nextMaxCol,
        });
      }

      for (let dr = 0; dr < targetRowCount; dr++) {
        const targetRowIndex = targetMinRow + dr;
        const row = getRowAtIndex(targetRowIndex);
        if (!row) break;
        if (!row || isPlaceholderRow(row.original)) continue;

        const sourceRow = pasteData[dr % sourceRowCount] ?? [];

        for (let dc = 0; dc < targetColCount; dc++) {
          const targetColIndex = targetMinCol + dc;
          if (targetColIndex >= visibleColumns.length) break;
          const column = visibleColumns[targetColIndex];
          if (!column || column.id === "rowNumber") continue;

          const newValue = sourceRow[dc] ?? "";
          queueCellUpdate(targetRowIndex, row.original.id, column.id, newValue);
        }
      }

      // If this was a cut operation, clear source cells
      if (clipboardData?.isCut) {
        const { sourceRange } = clipboardData;
        for (let r = sourceRange.minRow; r <= sourceRange.maxRow; r++) {
          const row = getRowAtIndex(r);
          if (!row || isPlaceholderRow(row.original)) continue;
          for (let c = sourceRange.minCol; c <= sourceRange.maxCol; c++) {
            const column = visibleColumns[c];
            if (!column || column.id === "rowNumber") continue;
            queueCellUpdate(r, row.original.id, column.id, "");
          }
        }
        setClipboardData(null);
      }

      applyLocalCellPatches(localPatchesByRowIndex);
      commitBulkCellUpdates(activeTable.id, Array.from(serverUpdatesByCell.values()));
    } catch {
      // Clipboard API may fail
    }
  }, [
    activeTable,
    activeCellRowIndex,
    activeCellColumnIndex,
    table,
    clipboardData,
    selectionRange,
    applyLocalCellPatches,
    commitBulkCellUpdates,
    isPlaceholderRow,
  ]);

  // Handle keyboard navigation
  const handleKeyboardNavigation = useCallback(
    (event: KeyboardEvent) => {
      const targetElement = event.target as HTMLElement | null;
      const isTypingIntoFormControl = Boolean(
        targetElement &&
          (targetElement.tagName === "INPUT" ||
            targetElement.tagName === "TEXTAREA" ||
            targetElement.tagName === "SELECT" ||
            targetElement.isContentEditable),
      );
      if (isTypingIntoFormControl) {
        return;
      }

      // Don't handle if we're editing (except Escape)
      if (editingCell && event.key !== "Escape") return;

      // Handle Escape during editing
      if (editingCell && event.key === "Escape") {
        cancelEdit();
        event.preventDefault();
        return;
      }

      // Don't handle if no active cell (except for global shortcuts)
      if (activeCellRowIndex === null || activeCellColumnIndex === null) return;

      const isTypingKey =
        event.key.length === 1 &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey;

      // Fast path: start editing immediately on typing without running the rest of navigation logic.
      if (isTypingKey) {
        const row = getRowAtIndex(activeCellRowIndex);
        if (row && !isPlaceholderRow(row.original)) {
          const cell = row.getVisibleCells()[activeCellColumnIndex];
          if (cell && cell.column.id !== "rowNumber") {
            const cellValue = cell.getValue();
            const cellValueText =
              typeof cellValue === "string"
                ? cellValue
                : typeof cellValue === "number"
                  ? String(cellValue)
                  : "";
            startEditing(
              activeCellRowIndex,
              row.original.id,
              cell.column.id,
              event.key,
              cellValueText,
            );
            event.preventDefault();
          }
        }
        return;
      }

      const columns = table.getAllColumns();
      const totalRows = Math.max(
        activeTableTotalRows,
        renderWindowStart + tableRows.length,
      );
      const maxRowIndex = Math.max(0, totalRows - 1);
      const totalColumns = columns.length;

      const isMeta = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;

      const baseRowIndex = isShift && selectionFocus ? selectionFocus.rowIndex : activeCellRowIndex;
      const baseColumnIndex =
        isShift && selectionFocus ? selectionFocus.columnIndex : activeCellColumnIndex;

      let newRowIndex = baseRowIndex;
      let newColumnIndex = baseColumnIndex;
      let handled = false;
      let shouldExtendSelection = false;

      switch (event.key) {
        // === ARROW KEY NAVIGATION ===
        case "ArrowUp":
          if (isMeta) {
            // Cmd+Up: Jump to first row
            newRowIndex = 0;
          } else {
            newRowIndex = Math.max(0, baseRowIndex - 1);
          }
          shouldExtendSelection = isShift;
          handled = true;
          break;

        case "ArrowDown":
          if (isMeta) {
            // Cmd+Down: Jump to last row
            newRowIndex = maxRowIndex;
          } else {
            newRowIndex = Math.min(maxRowIndex, baseRowIndex + 1);
          }
          shouldExtendSelection = isShift;
          handled = true;
          break;

        case "ArrowLeft":
          if (isMeta) {
            // Cmd+Left: Jump to first column (after row number)
            newColumnIndex = 1;
          } else if (baseColumnIndex > 1) {
            newColumnIndex = baseColumnIndex - 1;
          }
          shouldExtendSelection = isShift;
          handled = newColumnIndex !== baseColumnIndex || isMeta;
          break;

        case "ArrowRight":
          if (isMeta) {
            // Cmd+Right: Jump to last column
            newColumnIndex = totalColumns - 1;
          } else if (baseColumnIndex < totalColumns - 1) {
            newColumnIndex = baseColumnIndex + 1;
          }
          shouldExtendSelection = isShift;
          handled = newColumnIndex !== baseColumnIndex || isMeta;
          break;

        // === TAB NAVIGATION ===
        case "Tab":
          event.preventDefault();
          // Clear any range selection when tabbing
          setSelectionAnchor(null);
          setSelectionFocus(null);
          setSelectionRange(null);

          if (isShift) {
            // Shift+Tab: move left within the same row only (no row wrapping).
            if (baseColumnIndex > 1) {
              newColumnIndex = baseColumnIndex - 1;
            }
          } else {
            // Tab: move right within the same row only (no row wrapping).
            if (baseColumnIndex < totalColumns - 1) {
              newColumnIndex = baseColumnIndex + 1;
            }
          }
          handled = true;
          break;

        // === ENTER KEY ===
        case "Enter":
          if (isShift) {
            if (isBottomQuickAddOpen && bottomQuickAddRowId) {
              addRow({ scrollAlign: "end" });
              event.preventDefault();
              return;
            }
            // Shift+Enter: insert row below and move the active highlight to it.
            const insertedRowIndex = Math.min(totalRows, activeCellRowIndex + 1);
            const anchorRow = getRowAtIndex(activeCellRowIndex);
            handleInsertRowBelow(
              activeCellRowIndex,
              anchorRow ? anchorRow.original.id : undefined,
              activeCellColumnIndex,
              "center",
            );
            setActiveCellId(null);
            setActiveCellRowIndex(insertedRowIndex);
            setActiveCellColumnIndex(activeCellColumnIndex);
            setSelectedHeaderColumnIndex(null);
            setSelectionAnchor({
              rowIndex: insertedRowIndex,
              columnIndex: activeCellColumnIndex,
            });
            setSelectionFocus({
              rowIndex: insertedRowIndex,
              columnIndex: activeCellColumnIndex,
            });
            setSelectionRange(null);
            pendingScrollToCellRef.current = {
              rowIndex: insertedRowIndex,
              columnIndex: activeCellColumnIndex,
              align: "center",
            };
            startActiveCellFollow(insertedRowIndex, activeCellColumnIndex);
            event.preventDefault();
            return;
          }
          // Regular Enter: Start editing current cell
          {
            const row = getRowAtIndex(activeCellRowIndex);
            if (row && !isPlaceholderRow(row.original)) {
              const cell = row.getVisibleCells()[activeCellColumnIndex];
              if (cell && cell.column.id !== "rowNumber") {
                const cellValue = cell.getValue();
                const cellValueText =
                  typeof cellValue === "string" ? cellValue : typeof cellValue === "number" ? String(cellValue) : "";
                startEditing(activeCellRowIndex, row.original.id, cell.column.id, cellValueText);
                event.preventDefault();
              }
            }
          }
          return;

        case "Delete":
        case "Backspace":
          if (isMeta || event.ctrlKey) {
            const row = getRowAtIndex(activeCellRowIndex);
            if (row && !isPlaceholderRow(row.original)) {
              void handleDeleteRow(row.original.id);
            }
            event.preventDefault();
          }
          return;

        // === F2 - START EDITING ===
        case "F2":
          {
            const row = getRowAtIndex(activeCellRowIndex);
            if (row && !isPlaceholderRow(row.original)) {
              const cell = row.getVisibleCells()[activeCellColumnIndex];
              if (cell && cell.column.id !== "rowNumber") {
                const cellValue = cell.getValue();
                const cellValueText =
                  typeof cellValue === "string" ? cellValue : typeof cellValue === "number" ? String(cellValue) : "";
                startEditing(activeCellRowIndex, row.original.id, cell.column.id, cellValueText);
                event.preventDefault();
              }
            }
          }
          return;

        // === ESCAPE - CLEAR SELECTION ===
        case "Escape":
          clearSelection();
          event.preventDefault();
          return;

        // === DELETE / BACKSPACE ===
        case "Backspace":
        case "Delete":
          // Clear selected cells content
          handleClearSelectedCells();
          event.preventDefault();
          return;

        // === CLIPBOARD OPERATIONS ===
        case "c":
          if (isMeta) {
            void handleCopy();
            event.preventDefault();
          }
          return;

        case "x":
          if (isMeta) {
            void handleCut();
            event.preventDefault();
          }
          return;

        case "v":
          if (isMeta) {
            void handlePaste();
            event.preventDefault();
          }
          return;

        default:
          return;
      }

      if (handled) {
        event.preventDefault();

        if (shouldExtendSelection) {
          extendSelection(newRowIndex, newColumnIndex, { preserveActiveCell: true });
        } else {
          // Regular navigation - start new selection at target cell
          const row = getRowAtIndex(newRowIndex);
          if (row && !isPlaceholderRow(row.original)) {
            const cell = row.getVisibleCells()[newColumnIndex];
            if (cell && cell.column.id !== "rowNumber") {
              startSelection(cell.id, newRowIndex, newColumnIndex);
            }
          }
        }

        scrollToCell(newRowIndex, newColumnIndex);
      }
    },
    [
      activeCellRowIndex,
      activeCellColumnIndex,
      activeTableTotalRows,
      editingCell,
      getRowAtIndex,
      renderWindowStart,
      tableRows.length,
      table,
      startSelection,
      extendSelection,
      selectionFocus,
      clearSelection,
      startEditing,
      cancelEdit,
      scrollToCell,
      startActiveCellFollow,
      handleInsertRowBelow,
      handleDeleteRow,
      handleClearSelectedCells,
      handleCopy,
      handleCut,
      handlePaste,
      isPlaceholderRow,
    ]
  );

  // Keyboard navigation effect
  useEffect(() => {
    document.addEventListener("keydown", handleKeyboardNavigation);
    return () => {
      document.removeEventListener("keydown", handleKeyboardNavigation);
    };
  }, [handleKeyboardNavigation]);

  // Fast scroll detection - monitors scroll velocity to detect scrollbar dragging
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    let fastScrollTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      const now = Date.now();
      const currentScrollTop = container.scrollTop;
      const timeDelta = now - lastScrollTimeRef.current;
      const scrollDelta = Math.abs(currentScrollTop - lastScrollTopRef.current);

      // Calculate scroll velocity (rows per 100ms)
      const velocity = timeDelta > 0 ? (scrollDelta / rowHeightPx) / (timeDelta / 100) : 0;
      scrollVelocityRef.current = velocity;

      // Update tracking refs
      lastScrollTopRef.current = currentScrollTop;
      lastScrollTimeRef.current = now;

      // Detect fast scrolling (likely scrollbar dragging)
      const isFast = velocity > ROWS_FAST_SCROLL_THRESHOLD;
      isFastScrollingRef.current = isFast;
      if (isFast !== isFastScrolling) {
        setIsFastScrolling(isFast);
      }

      // Reset fast scrolling flag after scroll stops
      if (fastScrollTimeoutId) {
        clearTimeout(fastScrollTimeoutId);
      }
      fastScrollTimeoutId = setTimeout(() => {
        isFastScrollingRef.current = false;
        setIsFastScrolling(false);
        flushRowWindowPatches();
      }, 300);
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      if (fastScrollTimeoutId) {
        clearTimeout(fastScrollTimeoutId);
      }
    };
  }, [flushRowWindowPatches, rowHeightPx, isFastScrolling]);

  useEffect(() => {
    if (!activeTableId) return;
    if (virtualRows.length === 0) return;

    const firstVisibleIndex = virtualRows[0]?.index ?? 0;
    const lastVisibleIndex = virtualRows[virtualRows.length - 1]?.index ?? 0;
    const prefetchPages = isFastScrolling
      ? ROWS_FAST_SCROLL_PREFETCH_PAGES
      : 1;
    const prefetchDistance = ROWS_PAGE_SIZE * prefetchPages;
    const estimatedTotal = Math.max(activeTableTotalRows, lastVisibleIndex + 1);
    const needStart = Math.max(0, firstVisibleIndex - prefetchDistance);
    const needEnd = Math.min(estimatedTotal - 1, lastVisibleIndex + prefetchDistance);
    if (needEnd < needStart) return;

    pendingRowRangeRef.current = { start: needStart, end: needEnd };
    if (rowRangeDebounceTimeoutRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(rowRangeDebounceTimeoutRef.current);
      rowRangeDebounceTimeoutRef.current = null;
    }

    if (typeof window === "undefined" || isFastScrolling) {
      // During fast scroll or SSR, fetch immediately with no debounce
      void ensureRowRange(needStart, needEnd);
      return;
    }

    rowRangeDebounceTimeoutRef.current = window.setTimeout(() => {
      rowRangeDebounceTimeoutRef.current = null;
      const pending = pendingRowRangeRef.current;
      if (!pending) return;
      void ensureRowRange(pending.start, pending.end);
    }, 40);
  }, [
    activeTableId,
    activeTableTotalRows,
    ensureRowRange,
    isFastScrolling,
    virtualRows,
  ]);

  const renderSidebarViewIcon = (kind: SidebarViewKind) => {
    if (kind === "form") {
      return (
        <span
          className={`${styles.viewKindIconMask} ${styles.viewKindIconForm}`}
          aria-hidden="true"
        />
      );
    }
    return (
      <span
        className={`${styles.viewKindIconMask} ${styles.viewKindIconGrid}`}
        aria-hidden="true"
      />
    );
  };

  const renderHideFieldIcon = (icon: FieldMenuIcon) => {
    switch (icon) {
      case "name":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3 12h1.2l.68-2h2.24l.68 2H9L6.86 4H5.14L3 12zm2.3-3.02L6 6.9l.7 2.08H5.3zM10 5h3v1h-1v5h-1V6h-1V5z" />
          </svg>
        );
      case "user":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 1.5c-2.76 0-5 1.79-5 4v.5h10v-.5c0-2.21-2.24-4-5-4z" />
          </svg>
        );
      case "status":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1.5a6.5 6.5 0 106.5 6.5A6.5 6.5 0 008 1.5zm0 11.5A5 5 0 118 3a5 5 0 010 10z" />
          </svg>
        );
      case "number":
        return (
          <svg width="16" height="16" viewBox="0 0 48 48" fill="currentColor">
            <path d="M16,0c-.53,0-1.04.21-1.41.59-.38.38-.59.88-.59,1.41v12H2c-.53,0-1.04.21-1.41.59-.38.38-.59.88-.59,1.41s.21,1.04.59,1.41c.38.38.88.59,1.41.59h12v12H2c-.53,0-1.04.21-1.41.59-.38.38-.59.88-.59,1.41s.21,1.04.59,1.41c.38.37.88.59,1.41.59h12v12c0,.53.21,1.04.59,1.41.38.37.88.59,1.41.59s1.04-.21,1.41-.59c.38-.38.59-.88.59-1.41v-12h12v12c0,.53.21,1.04.59,1.41.38.37.88.59,1.41.59s1.04-.21,1.41-.59c.37-.38.59-.88.59-1.41v-12h12c.53,0,1.04-.21,1.41-.59.37-.38.59-.88.59-1.41s-.21-1.04-.59-1.41c-.38-.38-.88-.59-1.41-.59h-12v-12h12c.53,0,1.04-.21,1.41-.59.37-.38.59-.88.59-1.41s-.21-1.04-.59-1.41c-.38-.38-.88-.59-1.41-.59h-12V2c0-.53-.21-1.04-.59-1.41-.38-.38-.88-.59-1.41-.59s-1.04.21-1.41.59c-.38.38-.59.88-.59,1.41v12h-12V2c0-.53-.21-1.04-.59-1.41-.38-.38-.88-.59-1.41-.59ZM18,18h12v12h-12v-12Z" />
          </svg>
        );
      case "file":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 1h5l3 3v11H4V1zm4.5 1.5V5H11L8.5 2.5z" />
          </svg>
        );
      case "ai":
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3 3h10v2H3V3zm0 4h10v2H3V7zm0 4h6v2H3v-2z" />
          </svg>
        );
      case "paragraph":
      default:
        return (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3 3h10v2H3V3zm0 4h10v2H3V7zm0 4h6v2H3v-2z" />
          </svg>
        );
    }
  };

  const renderFieldGlyphIcon = (field: TableField) => {
    const glyphClass =
      field.kind === "number" ? styles.headerGlyphNumber : styles.headerGlyphText;
    return <span className={`${styles.headerGlyph} ${glyphClass}`} aria-hidden="true" />;
  };

  const renderColumnFieldMenuIcon = (icon: ColumnFieldMenuIcon) => {
    const iconMap: Record<ColumnFieldMenuIcon, string> = {
      edit: "/SVG/Asset%20141Airtable.svg",
      duplicate: "/SVG/Asset%20320Airtable.svg",
      insertLeft: "/SVG/Asset%20437Airtable.svg",
      insertRight: "/SVG/Asset%20434Airtable.svg",
      primary: "/SVG/Asset%20436Airtable.svg",
      copyUrl: "/SVG/Asset%20190Airtable.svg",
      description: "/SVG/Asset%2011Airtable.svg",
      permissions: "/SVG/Asset%20181Airtable.svg",
      sortAsc: "/SVG/Asset%2079Airtable.svg",
      sortDesc: "/SVG/Asset%2078Airtable.svg",
      filter: "/SVG/Asset%20255Airtable.svg",
      group: "/SVG/Asset%20232Airtable.svg",
      dependencies: "/SVG/Asset%20282Airtable.svg",
      hide: "/SVG/Asset%20283Airtable.svg",
      delete: "/SVG/Asset%2032Airtable.svg",
    };

    return <Image src={iconMap[icon]} alt="" width={16} height={16} aria-hidden="true" />;
  };

  const renderRowHeightIcon = (option: RowHeightOption) => {
    if (option === "short") {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 5.25h10v1.5H3v-1.5zm0 4h10v1.5H3v-1.5z" />
        </svg>
      );
    }
    if (option === "medium") {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 4h10v1.5H3V4zm0 3.25h10v1.5H3v-1.5zm0 3.25h10V12H3v-1.5z" />
        </svg>
      );
    }
    if (option === "tall") {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 3.5h10V5H3V3.5zm0 3h10V8H3V6.5zm0 3h10V11H3V9.5zm0 3h10V14H3v-1.5z" />
        </svg>
      );
    }
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
        <path d="M3 2.5h10V4H3V2.5zm0 2.6h10v1.5H3V5.1zm0 2.6h10v1.5H3V7.7zm0 2.6h10v1.5H3v-1.5zm0 2.6h10v1.5H3v-1.5z" />
      </svg>
    );
  };

  const renderAddColumnIcon = (
    icon:
      | (typeof ADD_COLUMN_STANDARD_FIELDS)[number]["icon"]
      | (typeof ADD_COLUMN_FIELD_AGENTS)[number]["icon"],
  ) => {
    const sharedProps = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "currentColor" as const };
    switch (icon) {
      case "asset273":
        return <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuAgentAsset273}`} />;
      case "asset381":
        return <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuAgentAsset381}`} />;
      case "asset213":
        return <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuAgentAsset213}`} />;
      case "asset308":
        return <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuAgentAsset308}`} />;
      case "asset71":
        return <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuAgentAsset71}`} />;
      case "asset433":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset433}`} />
        );
      case "asset51":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset51}`} />
        );
      case "asset279":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset279}`} />
        );
      case "asset356":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset356}`} />
        );
      case "asset185":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset185}`} />
        );
      case "asset372":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset372}`} />
        );
      case "asset19":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset19}`} />
        );
      case "asset375":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset375}`} />
        );
      case "asset137":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset137}`} />
        );
      case "asset289":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset289}`} />
        );
      case "asset190":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset190}`} />
        );
      case "asset313":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset313}`} />
        );
      case "asset140":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset140}`} />
        );
      case "asset335":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset335}`} />
        );
      case "asset70":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset70}`} />
        );
      case "asset258":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset258}`} />
        );
      case "asset270":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset270}`} />
        );
      case "asset379":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset379}`} />
        );
      case "asset187":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset187}`} />
        );
      case "asset378":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset378}`} />
        );
      case "asset183":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset183}`} />
        );
      case "asset405":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset405}`} />
        );
      case "asset155":
        return (
          <span className={`${styles.addColumnMenuAgentAssetIcon} ${styles.addColumnMenuStandardAsset155}`} />
        );
      case "imageGlobe":
        return (
          <svg {...sharedProps}>
            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm0 1.5a5 5 0 014.84 3.75H9.6l-.9 1.2-1.2-1.2H3.18A5 5 0 018 3zm0 10a5 5 0 01-4.9-4h4.05l1.35 1.35L9.95 9h3.03A5 5 0 018 13z" />
          </svg>
        );
      case "files":
        return (
          <svg {...sharedProps}>
            <path d="M3 3h6l2 2v8H3V3zm1.5 1.5v7h5V6.5H8V4.5H4.5zm5.5-1h2l2 2v7h-2V5.5h-2V3.5z" />
          </svg>
        );
      case "agent":
        return (
          <svg {...sharedProps}>
            <path d="M3 3h10v10H3V3zm2 2v2h2V5H5zm4 0v2h2V5H9zm-4 4v2h6V9H5z" />
          </svg>
        );
      case "text":
        return <Image src="/SVG/Asset%2053Airtable.svg" alt="" width={16} height={16} aria-hidden="true" />;
      case "number":
        return <Image src="/SVG/Asset%20228Airtable.svg" alt="" width={16} height={16} aria-hidden="true" />;
      default:
        return (
          <svg {...sharedProps}>
            <path d="M3 3h10v10H3V3z" />
          </svg>
        );
    }
  };

  return (
    <div
      className={[
        styles.hyperbaseContainer,
        wrapHeaders ? styles.wrapHeadersEnabled : "",
        isRowHeightAnimating ? styles.rowHeightAnimating : "",
        isRowHeightCollapsing ? styles.rowHeightCollapsing : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={{
        ["--base-accent" as keyof React.CSSProperties]: baseAccent,
        ["--base-accent-soft" as keyof React.CSSProperties]: baseAccentSoft,
        ["--base-accent-hover" as keyof React.CSSProperties]: baseAccentHover,
        ["--base-accent-contrast" as keyof React.CSSProperties]: baseAccentContrast,
        ["--tanstack-row-height" as keyof React.CSSProperties]: ROW_HEIGHT_SETTINGS[rowHeight].row,
        ["--tanstack-header-height" as keyof React.CSSProperties]: TABLE_HEADER_HEIGHT,
        ["--tanstack-row-height-transition-duration" as keyof React.CSSProperties]:
          `${ROW_HEIGHT_TRANSITION_MS}ms`,
        ["--tanstack-row-collapse-gap" as keyof React.CSSProperties]: `${rowHeightCollapseGap}px`,
      }}
    >
      {/* App Sidebar - Left navigation */}
      <aside id="bases-sidebar" className={styles.appSidebar}>
        <SidebarContent
          userName={session?.user?.name}
          userEmail={session?.user?.email}
          isSidebarAccountMenuOpen={isSidebarAccountMenuOpen}
          onToggleSidebarAccountMenu={() => setIsSidebarAccountMenuOpen((prev) => !prev)}
          onSignOut={() => {
            setIsSidebarAccountMenuOpen(false);
            void signOut({ callbackUrl: "/login" });
          }}
          onNavigateHome={() => router.push("/bases")}
          omniBitPath={OMNI_BIT_PATH}
          omniRotations={OMNI_ROTATIONS}
          sidebarAccountDisabledItems={SIDEBAR_ACCOUNT_DISABLED_ITEMS}
        />
      </aside>

      {/* Main App Content */}
      <div className={styles.mainAppContent}>
        {/* Base Header - Top navigation bar */}
        <BaseHeader
          baseName={baseName}
          baseMenuButtonRef={baseMenuButtonRef}
          isBaseMenuOpen={isBaseMenuOpen}
          onToggleBaseMenu={() => setIsBaseMenuOpen((prev) => !prev)}
          isSaving={isSaving}
        />

      {isBaseMenuOpen ? (
        <div
          id="base-menu-popover"
          ref={baseMenuRef}
          className={styles.baseMenuPopover}
          style={{ top: baseMenuPosition.top, left: baseMenuPosition.left }}
          role="dialog"
          aria-label="Base options"
        >
          <div className={styles.baseMenuHeader}>
            <input
              className={styles.baseNameInput}
              value={baseName}
              onChange={(event) => {
                isBaseNameDirtyRef.current = true;
                setBaseName(event.target.value);
              }}
              aria-label="Base name"
            />
            <div className={styles.baseMenuHeaderActions}>
              <button
                type="button"
                className={`${styles.baseMenuIconButton} ${
                  isBaseStarred ? styles.baseMenuIconButtonActive : ""
                }`}
                aria-label="Favorite base"
                aria-pressed={isBaseStarred}
                onClick={() => setIsBaseStarred((prev) => !prev)}
              >
                <svg
                  viewBox="0 0 24 24"
                  className={styles.baseMenuStarIcon}
                  aria-hidden="true"
                >
                  {isBaseStarred ? (
                    <path
                      d="M12 3.5l2.68 5.42 5.98.87-4.33 4.22 1.02 5.96L12 17.9l-5.35 2.77 1.02-5.96L3.34 9.79l5.98-.87L12 3.5z"
                      fill="currentColor"
                    />
                  ) : (
                    <path
                      d="M12 4.9l2.17 4.39 4.85.71-3.51 3.43.83 4.83L12 15.91l-4.34 2.25.83-4.83-3.51-3.43 4.85-.71L12 4.9z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>
              </button>
              <div className={styles.baseMenuMore}>
                <button
                  ref={baseMenuMoreButtonRef}
                  type="button"
                  className={`${styles.baseMenuIconButton} ${styles.baseMenuMoreButton}`}
                  aria-label="More options"
                  aria-expanded={isBaseMenuMoreOpen}
                  aria-controls="base-menu-more"
                  onClick={() => setIsBaseMenuMoreOpen((prev) => !prev)}
                >
                  <span className={styles.baseMenuMoreDots}>…</span>
                </button>
                {isBaseMenuMoreOpen ? (
                  <div
                    id="base-menu-more"
                    ref={baseMenuMoreMenuRef}
                    className={styles.baseMenuMoreMenu}
                    role="menu"
                  >
                    <button type="button" className={styles.baseMenuMoreItem} role="menuitem">
                      <span className={styles.baseMenuMoreIcon} aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M6 2h7a1 1 0 011 1v9h-1V3H6V2z"
                            stroke="currentColor"
                            strokeWidth="1.2"
                          />
                          <rect
                            x="2.5"
                            y="5.5"
                            width="8"
                            height="8"
                            rx="1"
                            stroke="currentColor"
                            strokeWidth="1.2"
                          />
                        </svg>
                      </span>
                      Duplicate base
                    </button>
                    <button type="button" className={styles.baseMenuMoreItem} role="menuitem">
                      <span className={styles.baseMenuMoreIcon} aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M6 2v12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          <path d="M10 2v12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          <path d="M2 6h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          <path d="M2 10h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </span>
                      Slack notifications
                    </button>
                    <button
                      type="button"
                      className={`${styles.baseMenuMoreItem} ${styles.baseMenuMoreItemDanger}`}
                      role="menuitem"
                    >
                      <span className={styles.baseMenuMoreIcon} aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M3 5h10"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                          <path
                            d="M6 5V3h4v2"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            strokeLinecap="round"
                          />
                          <path
                            d="M5 6v7h6V6"
                            stroke="currentColor"
                            strokeWidth="1.2"
                            strokeLinecap="round"
                          />
                        </svg>
                      </span>
                      Delete base
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className={styles.baseMenuContent}>
            <div className={styles.baseMenuSection}>
              <button
                type="button"
                className={styles.baseMenuSectionToggle}
                aria-expanded={baseMenuSections.appearance}
                onClick={() => toggleBaseMenuSection("appearance")}
              >
                <span
                  className={`${styles.baseMenuSectionChevron} ${
                    baseMenuSections.appearance ? styles.baseMenuSectionChevronOpen : ""
                  }`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    className={styles.baseMenuSectionChevronIcon}
                    aria-hidden="true"
                  >
                    <use
                      fill="currentColor"
                      href="/icons/icon_definitions.svg?v=82dd88e01ec1ba6abd8b693d8c8c068b#ChevronDown"
                    ></use>
                  </svg>
                </span>
                <span className={styles.baseMenuSectionLabel}>Appearance</span>
              </button>
              <div
                className={`${styles.baseMenuSectionContent} ${styles.animate} ${
                  baseMenuSections.appearance
                    ? styles.baseMenuSectionContentOpen
                    : styles.baseMenuSectionContentClosed
                }`}
                aria-hidden={!baseMenuSections.appearance}
              >
                <div className={styles.baseMenuAppearanceHeader}>
                  <div className={styles.baseMenuAppearanceTabs}>
                    <button
                      type="button"
                      className={`${styles.baseMenuAppearanceTab} ${
                        appearanceTab === "color" ? styles.baseMenuAppearanceTabActive : ""
                      }`}
                      onClick={() => setAppearanceTab("color")}
                    >
                      Color
                    </button>
                    <button
                      type="button"
                      className={`${styles.baseMenuAppearanceTab} ${
                        appearanceTab === "icon" ? styles.baseMenuAppearanceTabActive : ""
                      }`}
                      onClick={() => setAppearanceTab("icon")}
                    >
                      Icon
                    </button>
                  </div>
                </div>
                {appearanceTab === "color" ? (
                  <div className={styles.baseMenuAppearancePalette}>
                      {[
                        ["#f8d7da", "#fbd4b4", "#ffe7a3", "#c9f0c1", "#c8f1ee", "#c9e2ff", "#c8d7ff", "#f0c9ff", "#d7d1ff", "#e5e7eb"],
                        ["#d90429", "#f15a00", "#ffb703", "#2ca02c", "#00c2c7", "#27b6f6", "#2563eb", "#c112a1", "#6d28d9", "#5b5f66"],
                        ["#8d4655", "#b45309", "#996515", "#3f6f43", "#0f766e", "#0e7490", "#2f4b8f", "#7a3c8f", "#4a2c6b", "#3f3f46"],
                      ].map((row, rowIndex) => (
                        <div key={`palette-row-${rowIndex}`} className={styles.baseMenuAppearanceRow}>
                          {row.map((color) => (
                            (() => {
                              const isSelected =
                                baseAccent.toLowerCase() === color.toLowerCase();
                              const borderColor = adjustColor(color, -28);
                              const checkColor = getContrastColor(color);
                              return (
                            <button
                              key={color}
                              type="button"
                              className={`${styles.baseMenuAppearanceSwatch} ${
                                isSelected ? styles.baseMenuAppearanceSwatchSelected : ""
                              }`}
                              style={{ backgroundColor: color, borderColor }}
                              onClick={() => handleBaseAccentSelect(color)}
                              aria-label={`Select ${color}`}
                            >
                              {isSelected ? (
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  className={styles.baseMenuAppearanceCheck}
                                  aria-hidden="true"
                                >
                                  <path
                                    d="M3.2 8.4l2.8 2.9 6-6.3"
                                    fill="none"
                                    stroke={checkColor}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                              ) : null}
                            </button>
                              );
                            })()
                          ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.baseMenuAppearancePalette}>
                    <div className={styles.baseMenuAppearanceRow}>
                      <div className={styles.baseMenuAppearancePlaceholder}>Icon picker placeholder</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className={`${styles.baseMenuSection} ${styles.baseMenuSectionGuide}`}>
              <button
                type="button"
                className={styles.baseMenuSectionToggle}
                aria-expanded={baseMenuSections.guide}
                onClick={() => toggleBaseMenuSection("guide")}
              >
                <span
                  className={`${styles.baseMenuSectionChevron} ${
                    baseMenuSections.guide ? styles.baseMenuSectionChevronOpen : ""
                  }`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    className={styles.baseMenuSectionChevronIcon}
                    aria-hidden="true"
                  >
                    <use
                      fill="currentColor"
                      href="/icons/icon_definitions.svg?v=82dd88e01ec1ba6abd8b693d8c8c068b#ChevronDown"
                    ></use>
                  </svg>
                </span>
                <span className={styles.baseMenuSectionLabel}>Base guide</span>
              </button>
              <div
                className={`${styles.baseMenuGuideContent} ${styles.animate} ${
                  baseMenuSections.guide
                    ? styles.baseMenuSectionContentOpen
                    : styles.baseMenuSectionContentClosed
                }`}
                aria-hidden={!baseMenuSections.guide}
              >
                <textarea
                  ref={baseGuideTextRef}
                  className={styles.baseGuideTextBox}
                  value={baseGuideText}
                  readOnly={!isBaseGuideEditing}
                  onChange={(event) => {
                    setBaseGuideText(event.target.value);
                    requestAnimationFrame(resizeBaseGuideText);
                  }}
                  onFocus={() => setIsBaseGuideEditing(true)}
                  onClick={() => setIsBaseGuideEditing(true)}
                  onBlur={() => setIsBaseGuideEditing(false)}
                  aria-label="Base guide text"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Tables Tab Bar - Top bar with table tabs */}
      <TablesTabHeader>
        <div className={styles.tablesTabBarLeft}>
          <div
            className={styles.tablesTabBarTabs}
            onDragOver={(event) => {
              if (!draggingTableId) return;
              event.preventDefault();
              const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
              const tableTab = target?.closest?.("[data-table-tab-id]") as HTMLElement | null;
              const tableId = tableTab?.getAttribute("data-table-tab-id");
              if (!tableId || tableId === draggingTableId) {
                setTableDragOverId(null);
                setTableDragOverSide(null);
                return;
              }
              handleTableDragOver(event, tableId, tableTab);
            }}
            onDrop={handleTableTabsDrop}
          >
            {visibleTables.map((tableItem) => {
              const isActive = tableItem.id === activeTableId;
              const isDeleting = pendingDeletedTableIds.has(tableItem.id);
              const isDragging = draggingTableId === tableItem.id;
              const isDragOver =
                tableDragOverId === tableItem.id && Boolean(draggingTableId) && draggingTableId !== tableItem.id;
              const isDragOverRight = isDragOver && tableDragOverSide === "right";
              return (
                <div
                  key={tableItem.id}
                  data-table-tab-id={tableItem.id}
                  role="tab"
                  aria-selected={isActive}
                  aria-disabled={isDeleting ? "true" : undefined}
                  tabIndex={0}
                  className={`${styles.tableTab} ${
                    isActive ? styles.tableTabActive : styles.tableTabInactive
                  } ${isDragging ? styles.tableTabDragging : ""} ${isDragOver ? styles.tableTabDragOver : ""} ${isDragOverRight ? styles.tableTabDragOverRight : ""}`}
                  onClick={() => {
                    if (isDeleting) return;
                    switchActiveTable(tableItem.id);
                  }}
                  onDoubleClick={(event) => {
                    if (isDeleting) return;
                    event.preventDefault();
                    event.stopPropagation();
                    openRenameTablePopover(tableItem.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      if (isDeleting) return;
                      switchActiveTable(tableItem.id);
                    }
                  }}
                  draggable={!isDeleting}
                  onDragStart={(event) => {
                    if (isDeleting) {
                      event.preventDefault();
                      return;
                    }
                    handleTableDragStart(event, tableItem.id);
                  }}
                  onDragOver={(event) => handleTableDragOver(event, tableItem.id)}
                  onDrop={(event) => {
                    event.stopPropagation();
                    handleTableDrop(event, tableItem.id);
                  }}
                  onDragEnd={handleTableDragEnd}
                >
                  {!isActive && (
                    <div className={styles.tableTabHighlight} aria-hidden="true" />
                  )}
                  <span className={styles.tableTabName}>{tableItem.name}</span>
                  {isActive ? (
                    <div
                      ref={tableTabMenuButtonRef}
                      className={styles.tableTabDropdown}
                      role="button"
                      data-table-tab-menu-trigger="true"
                      tabIndex={0}
                      aria-haspopup="menu"
                      aria-expanded={isTableTabMenuOpen}
                      onClick={(event) => {
                        event.stopPropagation();
                        setIsTableTabMenuOpen((prev) => !prev);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          setIsTableTabMenuOpen((prev) => !prev);
                        }
                      }}
                    >
                      <span className={styles.tablesDropdownIcon} aria-hidden="true" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          {hiddenTables.length > 0 ? (
            <div className={styles.hiddenTablesWrapper}>
              <button
                ref={hiddenTablesButtonRef}
                type="button"
                className={styles.hiddenTablesButton}
                aria-expanded={isHiddenTablesMenuOpen}
                aria-controls="hidden-tables-menu"
                onClick={() => setIsHiddenTablesMenuOpen((prev) => !prev)}
              >
                <span>
                  {hiddenTables.length} hidden {hiddenTables.length === 1 ? "table" : "tables"}
                </span>
                <span className={styles.hiddenTablesButtonChevron} aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z" />
                  </svg>
                </span>
              </button>
              {isHiddenTablesMenuOpen ? (
                <div
                  id="hidden-tables-menu"
                  ref={hiddenTablesMenuRef}
                  className={styles.hiddenTablesMenu}
                  role="menu"
                >
                  {hiddenTables.map((hiddenTable) => (
                    <button
                      key={hiddenTable.id}
                      type="button"
                      className={styles.hiddenTablesMenuItem}
                      onClick={() => handleUnhideTable(hiddenTable.id, true)}
                    >
                      <span className={styles.hiddenTablesMenuItemLabel}>{hiddenTable.name}</span>
                      <span className={styles.hiddenTablesMenuItemAction}>Unhide</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className={styles.tablesMenuWrapper}>
            <button
              ref={tablesMenuButtonRef}
              type="button"
              className={styles.allTablesDropdown}
              aria-expanded={isTablesMenuOpen}
              aria-controls="tables-menu"
              onClick={() => setIsTablesMenuOpen((prev) => !prev)}
            >
              <span className={styles.tablesDropdownIcon} aria-hidden="true" />
            </button>
            {isTablesMenuOpen ? (
              <div
                id="tables-menu"
                ref={tablesMenuRef}
                className={styles.tablesMenu}
                role="menu"
              >
                <div className={styles.tablesMenuSearch}>
                  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                    <path
                      d="M11.742 10.344l3.387 3.387-1.398 1.398-3.387-3.387a6 6 0 111.398-1.398zM6.5 11a4.5 4.5 0 100-9 4.5 4.5 0 000 9z"
                      fill="currentColor"
                    />
                  </svg>
                  <input
                    className={styles.tablesMenuSearchInput}
                    value={tableSearch}
                    onChange={(event) => setTableSearch(event.target.value)}
                    placeholder="Find a table"
                  />
                </div>
                <div className={styles.tablesMenuList}>
                  {filteredTables.map((tableItem) => {
                    const isActive = tableItem.id === activeTableId;
                    const isDeleting = pendingDeletedTableIds.has(tableItem.id);
                    return (
                      <button
                        key={tableItem.id}
                        type="button"
                        className={`${styles.tablesMenuItem} ${
                          isActive ? styles.tablesMenuItemActive : ""
                        }`}
                        role="menuitem"
                        disabled={isDeleting}
                        onClick={() => {
                          if (isDeleting) return;
                          setHiddenTableIds((prev) =>
                            prev.includes(tableItem.id)
                              ? prev.filter((id) => id !== tableItem.id)
                              : prev,
                          );
                          switchActiveTable(tableItem.id);
                          setIsTablesMenuOpen(false);
                        }}
                      >
                        <span className={styles.tablesMenuItemIcon} aria-hidden="true">
                          {isActive ? "✓" : ""}
                        </span>
                        <span className={styles.tablesMenuItemLabel}>{tableItem.name}</span>
                      </button>
                    );
                  })}
                </div>
                <div className={styles.tablesMenuDivider} />
                <button
                  ref={tablesMenuAddRef}
                  type="button"
                  className={styles.tablesMenuAdd}
                  onClick={() => {
                    setAddMenuFromTables(true);
                    setIsAddMenuOpen((prev) => !prev);
                  }}
                >
                  <span className={styles.tablesMenuAddIcon} aria-hidden="true">
                    +
                  </span>
                  <span>Add table</span>
                  <span className={styles.tablesMenuAddArrow} aria-hidden="true">
                    ›
                  </span>
                </button>
              </div>
            ) : null}
          </div>

          {isTableTabMenuOpen ? (
            <div
              ref={tableTabMenuRef}
              className={styles.tableTabMenu}
              role="menu"
              style={tableTabMenuPosition}
            >
              <button type="button" className={styles.tableTabMenuItem} disabled>
                <span className={styles.tableTabMenuItemIcon} aria-hidden="true">
                  <Image
                    src="/SVG/Asset%20444Airtable.svg"
                    alt=""
                    width={14}
                    height={14}
                    aria-hidden="true"
                  />
                </span>
                <span className={styles.tableTabMenuItemLabel}>Import data</span>
                <span className={styles.tableTabMenuItemChevron} aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M6 4l4 4-4 4" />
                  </svg>
                </span>
              </button>
              <div className={styles.tableTabMenuDivider} />
              <button
                type="button"
                className={styles.tableTabMenuItem}
                onClick={() => openRenameTablePopover(activeTableId)}
                disabled={isTableTabActionPending}
              >
                <span className={styles.tableTabMenuItemIcon} aria-hidden="true">
                  <Image
                    src="/SVG/Asset%20141Airtable.svg"
                    alt=""
                    width={14}
                    height={14}
                    aria-hidden="true"
                  />
                </span>
                <span className={styles.tableTabMenuItemLabel}>Rename table</span>
              </button>
              <button
                type="button"
                className={styles.tableTabMenuItem}
                onClick={handleHideActiveTable}
                disabled={!canHideActiveTable || isTableTabActionPending}
              >
                <span className={styles.tableTabMenuItemIcon} aria-hidden="true">
                  <Image
                    src="/SVG/Asset%20283Airtable.svg"
                    alt=""
                    width={14}
                    height={14}
                    aria-hidden="true"
                  />
                </span>
                <span className={styles.tableTabMenuItemLabel}>Hide table</span>
              </button>
              <button type="button" className={styles.tableTabMenuItem} disabled>
                <span className={styles.tableTabMenuItemIcon} aria-hidden="true">
                  <Image
                    src="/SVG/Asset%20282Airtable.svg"
                    alt=""
                    width={14}
                    height={14}
                    aria-hidden="true"
                  />
                </span>
                <span className={styles.tableTabMenuItemLabel}>Manage fields</span>
              </button>
              <button
                type="button"
                className={styles.tableTabMenuItem}
                onClick={() => {
                  void handleDuplicateActiveTable();
                }}
                disabled={isTableTabActionPending}
              >
                <span className={styles.tableTabMenuItemIcon} aria-hidden="true">
                  <Image
                    src="/SVG/Asset%20320Airtable.svg"
                    alt=""
                    width={14}
                    height={14}
                    aria-hidden="true"
                  />
                </span>
                <span className={styles.tableTabMenuItemLabel}>Duplicate table</span>
              </button>
              <div className={styles.tableTabMenuDivider} />
              <button type="button" className={styles.tableTabMenuItem} disabled>
                <span className={styles.tableTabMenuItemIcon} aria-hidden="true">
                  <Image
                    src="/SVG/Asset%20252Airtable.svg"
                    alt=""
                    width={14}
                    height={14}
                    aria-hidden="true"
                  />
                </span>
                <span className={styles.tableTabMenuItemLabel}>
                  Configure date dependencies
                </span>
              </button>
              <div className={styles.tableTabMenuDivider} />
              <button type="button" className={styles.tableTabMenuItem} disabled>
                <span className={styles.tableTabMenuItemIcon} aria-hidden="true">
                  <Image
                    src="/SVG/Asset%2011Airtable.svg"
                    alt=""
                    width={14}
                    height={14}
                    aria-hidden="true"
                  />
                </span>
                <span className={styles.tableTabMenuItemLabel}>
                  Edit table description
                </span>
              </button>
              <button type="button" className={styles.tableTabMenuItem} disabled>
                <span className={styles.tableTabMenuItemIcon} aria-hidden="true">
                  <Image
                    src="/SVG/Asset%20181Airtable.svg"
                    alt=""
                    width={14}
                    height={14}
                    aria-hidden="true"
                  />
                </span>
                <span className={styles.tableTabMenuItemLabel}>
                  Edit table permissions
                </span>
              </button>
              <div className={styles.tableTabMenuDivider} />
              <button
                type="button"
                className={styles.tableTabMenuItem}
                onClick={() => {
                  void handleClearActiveTableData();
                }}
                disabled={!canClearActiveTableData || isTableTabActionPending}
              >
                <span className={styles.tableTabMenuItemIcon} aria-hidden="true">
                  <Image
                    src="/SVG/Asset%205Airtable.svg"
                    alt=""
                    width={14}
                    height={14}
                    aria-hidden="true"
                  />
                </span>
                <span className={styles.tableTabMenuItemLabel}>Clear data</span>
              </button>
              <button
                type="button"
                className={`${styles.tableTabMenuItem} ${styles.tableTabMenuItemDanger}`}
                onClick={openDeleteTableConfirm}
                disabled={isTableTabActionPending}
              >
                <span className={styles.tableTabMenuItemIcon} aria-hidden="true">
                  <Image
                    src="/SVG/Asset%2032Airtable.svg"
                    alt=""
                    width={14}
                    height={14}
                    aria-hidden="true"
                  />
                </span>
                <span className={styles.tableTabMenuItemLabel}>Delete table</span>
              </button>
            </div>
          ) : null}

          {isDeleteTableConfirmOpen && deleteTableConfirmTableId ? (
            <div
              ref={deleteTableConfirmRef}
              className={styles.tableDeleteConfirmPopover}
              role="dialog"
              aria-label="Confirm delete table"
              style={deleteTableConfirmPosition}
            >
              <div className={styles.tableDeleteConfirmTitle}>
                Are you sure you want to delete this table?
              </div>
              <div className={styles.tableDeleteConfirmDesc}>
                <span>Recently deleted tables can be restored from trash.</span>
                <span className={styles.tableDeleteConfirmHelp} aria-hidden="true">
                  ?
                </span>
              </div>
              <div className={styles.tableDeleteConfirmActions}>
                <button
                  type="button"
                  className={styles.tableDeleteConfirmCancel}
                  onClick={closeDeleteTableConfirm}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.tableDeleteConfirmDelete}
                  onClick={() => {
                    closeDeleteTableConfirm();
                    void handleDeleteActiveTable();
                  }}
                  disabled={isTableTabActionPending}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : null}

          {isRenameTablePopoverOpen ? (
            <div
              ref={renameTablePopoverRef}
              className={styles.renameTablePopover}
              role="dialog"
              aria-label="Rename table"
              style={renameTablePopoverPosition}
            >
              <form
                className={styles.renameTablePopoverForm}
                onSubmit={(event) => {
                  event.preventDefault();
                  handleRenameTableSave();
                }}
              >
                <input
                  ref={renameTableInputRef}
                  type="text"
                  className={styles.renameTableInput}
                  value={renameTableValue}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setRenameTableValue(nextValue);
                    if (!renameTableId) {
                      pendingCreateTableNameRef.current = nextValue;
                    }
                  }}
                  aria-label="Table name"
                />
                <div className={styles.renameTableSubLabelRow}>
                  <span className={styles.renameTableSubLabel}>
                    What should each record be called?
                  </span>
                  <span className={styles.renameTableInfoIcon} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zm0 2a1 1 0 00-.93.64.75.75 0 11-1.4-.55A2.5 2.5 0 018 2.75a2.5 2.5 0 011.66 4.38c-.56.5-.91.89-.91 1.62a.75.75 0 01-1.5 0c0-1.45.84-2.2 1.42-2.72A1 1 0 008 4.25zm0 6.25a.9.9 0 100 1.8.9.9 0 000-1.8z" />
                    </svg>
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.renameTableRecordType}
                  aria-label="Record type"
                >
                  <span>Record</span>
                  <span className={styles.renameTableRecordTypeChevron} aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M4.427 6.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 6H4.604a.25.25 0 00-.177.427z" />
                    </svg>
                  </span>
                </button>
                <div className={styles.renameTableExamples}>
                  <span>Examples:</span>
                  <span className={styles.renameTableExampleItem}>
                    <span aria-hidden="true">+</span>
                    <span>Add record</span>
                  </span>
                  <span className={styles.renameTableExampleItem}>
                    <span aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M1.5 3.5A1.5 1.5 0 013 2h10a1.5 1.5 0 011.5 1.5v9A1.5 1.5 0 0113 14H3a1.5 1.5 0 01-1.5-1.5v-9zM3 3a.5.5 0 00-.5.5V4l5.5 3.6L13.5 4v-.5a.5.5 0 00-.5-.5H3zm10.5 2.2L8.27 8.58a.5.5 0 01-.54 0L2.5 5.2v7.3a.5.5 0 00.5.5h10a.5.5 0 00.5-.5V5.2z" />
                      </svg>
                    </span>
                    <span>Send records</span>
                  </span>
                </div>
                <div className={styles.renameTableActions}>
                  <button
                    type="button"
                    className={styles.renameTableCancel}
                    onClick={handleRenameTableCancel}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.renameTableSave}>
                    Save
                  </button>
                </div>
              </form>
            </div>
          ) : null}

          <div className={styles.tablesTabBarDivider} aria-hidden="true" />

          {/* Add or Import Button */}
          <div className={styles.addOrImportWrapper}>
            <button
              ref={addMenuButtonRef}
              type="button"
              className={styles.addOrImportButton}
              aria-expanded={isAddMenuOpen}
              aria-controls="add-or-import-menu"
              onClick={() => {
                setAddMenuFromTables(false);
                setIsAddMenuOpen((prev) => !prev);
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z"/>
              </svg>
              <span>Add or import</span>
            </button>
            {isAddMenuOpen ? (
              <div
                id="add-or-import-menu"
                ref={addMenuRef}
                className={`${styles.addOrImportMenu} ${
                  addMenuFromTables ? styles.addOrImportMenuFloating : ""
                }`}
                style={addMenuFromTables ? addMenuPosition : undefined}
                role="menu"
              >
                <div className={styles.addOrImportSectionLabel}>Add a blank table</div>
                <button
                  type="button"
                  className={styles.addOrImportItem}
                  role="menuitem"
                  onClick={handleStartFromScratch}
                >
                  Start from scratch
                </button>
                <div className={styles.addOrImportDivider} />
                <div className={styles.addOrImportSectionLabel}>Build with Omni</div>
                <button
                  type="button"
                  className={`${styles.addOrImportItem} ${styles.addOrImportItemDisabled}`}
                  role="menuitem"
                  disabled
                >
                  New table
                </button>
                <button
                  type="button"
                  className={`${styles.addOrImportItem} ${styles.addOrImportItemDisabled}`}
                  role="menuitem"
                  disabled
                >
                  <span>New table with web data</span>
                  <span className={`${styles.addOrImportTag} ${styles.addOrImportTagBeta}`}>Beta</span>
                </button>
                <div className={styles.addOrImportDivider} />
                <div className={styles.addOrImportSectionLabel}>Add from other sources</div>
                <button
                  type="button"
                  className={`${styles.addOrImportItem} ${styles.addOrImportItemDisabled}`}
                  role="menuitem"
                  disabled
                >
                  Airtable base
                </button>
                <button
                  type="button"
                  className={`${styles.addOrImportItem} ${styles.addOrImportItemDisabled}`}
                  role="menuitem"
                  disabled
                >
                  CSV file
                </button>
                <button
                  type="button"
                  className={`${styles.addOrImportItem} ${styles.addOrImportItemDisabled}`}
                  role="menuitem"
                  disabled
                >
                  Google Calendar
                </button>
                <button
                  type="button"
                  className={`${styles.addOrImportItem} ${styles.addOrImportItemDisabled}`}
                  role="menuitem"
                  disabled
                >
                  Google Sheets
                </button>
                <button
                  type="button"
                  className={`${styles.addOrImportItem} ${styles.addOrImportItemDisabled}`}
                  role="menuitem"
                  disabled
                >
                  Microsoft Excel
                </button>
                <button
                  type="button"
                  className={`${styles.addOrImportItem} ${styles.addOrImportItemDisabled}`}
                  role="menuitem"
                  disabled
                >
                  <span>Salesforce</span>
                  <span className={`${styles.addOrImportTag} ${styles.addOrImportTagBusiness}`}>
                    Business
                  </span>
                </button>
                <button
                  type="button"
                  className={`${styles.addOrImportItem} ${styles.addOrImportItemDisabled}`}
                  role="menuitem"
                  disabled
                >
                  Smartsheet
                </button>
                <button
                  type="button"
                  className={`${styles.addOrImportItem} ${styles.addOrImportItemDisabled}`}
                  role="menuitem"
                  disabled
                >
                  <span>26 more sources...</span>
                  <span className={styles.addOrImportMoreArrow}>›</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.tablesTabBarCorner} aria-hidden="true"></div>

        <div className={styles.tablesTabBarRight}>
          {/* Tools Dropdown */}
          <button
            ref={toolsMenuButtonRef}
            type="button"
            className={`${styles.toolsDropdown} ${styles.toolbarButtonDisabled}`}
            aria-expanded={isToolsMenuOpen}
            aria-controls="tools-menu"
            disabled
            onClick={() => setIsToolsMenuOpen((prev) => !prev)}
          >
            <span>Tools</span>
            <span className={styles.toolsCaret} aria-hidden="true" />
          </button>
          {isToolsMenuOpen ? (
            <div
              id="tools-menu"
              ref={toolsMenuRef}
              className={styles.toolsMenu}
              role="menu"
              style={toolsMenuPosition}
            >
              <div className={styles.toolsMenuItems}>
                <button type="button" className={styles.toolsMenuItem}>
                  <span className={styles.toolsMenuIcon} aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3 3h4v4H3V3zm6 0h4v4H9V3zM3 9h4v4H3V9zm6 0h4v4H9V9z" />
                    </svg>
                  </span>
                  <span className={styles.toolsMenuText}>
                    <span className={styles.toolsMenuTitle}>Extensions</span>
                    <span className={styles.toolsMenuDesc}>
                      Extend the functionality of your base
                    </span>
                  </span>
                </button>
                <button type="button" className={styles.toolsMenuItem}>
                  <span className={styles.toolsMenuIcon} aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3 13h10v1H3v-1zm2-2h6V3H5v8zm1-7h4v6H6V4z" />
                    </svg>
                  </span>
                  <span className={styles.toolsMenuText}>
                    <span className={styles.toolsMenuTitle}>Manage fields</span>
                    <span className={styles.toolsMenuDesc}>
                      Edit fields and inspect dependencies
                    </span>
                  </span>
                </button>
                <button type="button" className={styles.toolsMenuItem}>
                  <span className={styles.toolsMenuIcon} aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M4 2h6l2 2v10H4V2zm6 1.5V4h1.5L10 3.5zM6 6h4v1H6V6zm0 3h4v1H6V9z" />
                    </svg>
                  </span>
                  <span className={styles.toolsMenuText}>
                    <span className={styles.toolsMenuTitle}>Record templates</span>
                    <span className={styles.toolsMenuDesc}>
                      Create records from a template
                    </span>
                  </span>
                </button>
                <button type="button" className={styles.toolsMenuItem}>
                  <span className={styles.toolsMenuIcon} aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 4h12v2H2V4zm0 4h8v2H2V8zm0 4h12v2H2v-2z" />
                    </svg>
                  </span>
                  <span className={styles.toolsMenuText}>
                    <span className={styles.toolsMenuTitle}>Date dependencies</span>
                    <span className={styles.toolsMenuDesc}>
                      Configure date shifting between dependent records
                    </span>
                  </span>
                </button>
                <button type="button" className={styles.toolsMenuItem}>
                  <span className={styles.toolsMenuIcon} aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3 12h2V7H3v5zm4 0h2V4H7v8zm4 0h2V2h-2v10z" />
                    </svg>
                  </span>
                  <span className={styles.toolsMenuText}>
                    <span className={styles.toolsMenuTitle}>
                      Insights{" "}
                      <span
                        className={`${styles.addOrImportTag} ${styles.addOrImportTagBusiness}`}
                      >
                        Business
                      </span>
                    </span>
                    <span className={styles.toolsMenuDesc}>
                      Understand and improve base health
                    </span>
                  </span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </TablesTabHeader>

      <div
        className={`${styles.table} ${!isViewsSidebarOpen ? styles.tableCollapsed : ""} ${
          isResizingSidebar ? styles.tableResizing : ""
        }`}
        style={{
          ["--views-sidebar-width" as keyof React.CSSProperties]: `${sidebarWidth}px`,
          gridTemplateColumns: `${isViewsSidebarOpen ? sidebarWidth : 0}px 1fr`,
        }}
      >
        {shouldShowLoadingOverlay ? (
          <div className={styles.tableLoadingOverlay} aria-live="polite">
            <div className={styles.tableLoadingSpinner} aria-hidden="true" />
          </div>
        ) : null}
        {/* View Bar - Top Toolbar */}
        <ViewBar>
            <div className={styles.viewBarLeft}>
            <button
              type="button"
              className={styles.sidebarToggle}
              aria-expanded={isViewsSidebarOpen}
              aria-label={isViewsSidebarOpen ? "Collapse views sidebar" : "Expand views sidebar"}
              onClick={() => setIsViewsSidebarOpen((prev) => !prev)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 2.75A.75.75 0 011.75 2h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 2.75zm0 5A.75.75 0 011.75 7h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 7.75zm0 5a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H1.75a.75.75 0 01-.75-.75z"/>
              </svg>
            </button>
            <div
              className={`${styles.viewName} ${
                isEditingViewName ? styles.viewNameEditing : ""
              }`}
            >
              <div
                ref={viewMenuButtonRef}
                className={styles.viewNameInner}
                role="button"
                tabIndex={0}
                aria-expanded={isViewMenuOpen}
                aria-controls="view-menu"
                onClick={(event) => {
                  if (isEditingViewName) return;
                  if (event.detail > 1) return;
                  setIsViewMenuOpen((prev) => !prev);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    if (isEditingViewName) return;
                    setIsViewMenuOpen((prev) => !prev);
                  }
                }}
              >
                {!isEditingViewName && (
                  <div className={styles.viewNameIcon}>
                    {renderSidebarViewIcon(activeViewKind)}
                  </div>
                )}
                {isEditingViewName ? (
                  <input
                    ref={viewNameInputRef}
                    className={styles.viewNameInput}
                    value={viewName}
                    onChange={(event) => setViewName(event.target.value)}
                    onBlur={commitViewName}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        commitViewName();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        cancelViewNameEdit();
                      }
                    }}
                  />
                ) : (
                  <span
                    className={styles.viewNameText}
                    onMouseDown={(event) => {
                      if (event.detail > 1) {
                        event.preventDefault();
                      }
                    }}
                    onDoubleClick={() => {
                      setIsViewMenuOpen(false);
                      startEditingViewName();
                    }}
                  >
                    {activeView?.name ?? DEFAULT_GRID_VIEW_NAME}
                  </span>
                )}
                {!isEditingViewName && (
                  <span className={styles.viewNameDropdownIcon} aria-hidden="true" />
                )}
              </div>
              {isViewMenuOpen ? (
                <div
                  id="view-menu"
                  ref={viewMenuRef}
                  className={styles.viewMenu}
                  role="menu"
                  style={viewMenuPosition}
                >
                  <button type="button" className={`${styles.viewMenuItem} ${styles.viewMenuItemMuted}`}>
                    <span className={styles.viewMenuItemIcon} aria-hidden="true">
                      <span className={`${styles.viewMenuIconMask} ${styles.viewMenuIconCollaborative}`} />
                    </span>
                    <span className={styles.viewMenuItemContent}>
                      <span className={styles.viewMenuItemTitle}>Collaborative view</span>
                      <span className={styles.viewMenuItemDesc}>
                        Editors and up can edit the view configuration
                      </span>
                    </span>
                    <span className={styles.viewMenuItemChevron} aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M6 4l4 4-4 4" />
                      </svg>
                    </span>
                  </button>
                  <div className={styles.viewMenuDivider} />
                  <button
                    type="button"
                    className={styles.viewMenuItem}
                    onMouseDown={(event) => {
                      // Use mousedown so we enter edit mode before focus/click handlers on the parent run.
                      event.preventDefault();
                      event.stopPropagation();
                      setIsViewMenuOpen(false);
                      startEditingViewName();
                    }}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                    }}
                    disabled={!activeView || isViewActionPending}
                  >
                    <span className={styles.viewMenuItemIcon} aria-hidden="true">
                      <span className={`${styles.viewMenuIconMask} ${styles.viewMenuIconRename}`} />
                    </span>
                    <span className={styles.viewMenuItemLabel}>Rename view</span>
                  </button>
                  <button type="button" className={`${styles.viewMenuItem} ${styles.viewMenuItemMuted}`}>
                    <span className={styles.viewMenuItemIcon} aria-hidden="true">
                      <span className={`${styles.viewMenuIconMask} ${styles.viewMenuIconEditDescription}`} />
                    </span>
                    <span className={styles.viewMenuItemLabel}>Edit view description</span>
                  </button>
                  <div className={styles.viewMenuDivider} />
                  <button
                    type="button"
                    className={styles.viewMenuItem}
                    onClick={handleDuplicateActiveView}
                    disabled={!activeView || isViewActionPending}
                  >
                    <span className={styles.viewMenuItemIcon} aria-hidden="true">
                      <span className={`${styles.viewMenuIconMask} ${styles.viewMenuIconDuplicate}`} />
                    </span>
                    <span className={styles.viewMenuItemLabel}>Duplicate view</span>
                  </button>
                  <div className={styles.viewMenuDivider} />
                  <button type="button" className={`${styles.viewMenuItem} ${styles.viewMenuItemMuted}`}>
                    <span className={styles.viewMenuItemIcon} aria-hidden="true">
                      <span className={`${styles.viewMenuIconMask} ${styles.viewMenuIconDownload}`} />
                    </span>
                    <span className={styles.viewMenuItemLabel}>Download CSV</span>
                  </button>
                  <button type="button" className={`${styles.viewMenuItem} ${styles.viewMenuItemMuted}`}>
                    <span className={styles.viewMenuItemIcon} aria-hidden="true">
                      <span className={`${styles.viewMenuIconMask} ${styles.viewMenuIconPrint}`} />
                    </span>
                    <span className={styles.viewMenuItemLabel}>Print view</span>
                  </button>
                  <div className={styles.viewMenuDivider} />
                  <button
                    type="button"
                    className={`${styles.viewMenuItem} ${styles.viewMenuItemDanger}`}
                    onClick={() => {
                      if (!canDeleteActiveView || isViewActionPending) return;
                      handleDeleteActiveView();
                    }}
                    aria-disabled={!canDeleteActiveView || isViewActionPending}
                    data-tooltip={!canDeleteActiveView ? deleteViewTooltip : undefined}
                  >
                    <span className={styles.viewMenuItemIcon} aria-hidden="true">
                      <span className={`${styles.viewMenuIconMask} ${styles.viewMenuIconDelete}`} />
                    </span>
                    <span className={styles.viewMenuItemLabel}>Delete view</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <div className={styles.viewBarRight}>
            <div className={styles.toolbarButtons}>
              <div className={styles.hideFieldsWrapper}>
                <button
                  ref={hideFieldsButtonRef}
                  type="button"
                  className={`${styles.toolbarButton} ${
                    hiddenFieldsCount > 0 ? styles.toolbarButtonHighlighted : ""
                  }`}
                  data-toolbar-item="hide-fields"
                  aria-expanded={isHideFieldsMenuOpen}
                  aria-controls="hide-fields-menu"
                  onClick={() => setIsHideFieldsMenuOpen((prev) => !prev)}
                >
                  <span
                    className={styles.toolbarIconWrap}
                    data-toolbar-icon="hide-fields"
                    aria-hidden="true"
                  >
                    <span
                      className={`${styles.toolbarButtonIcon} ${styles.toolbarIconMask} ${styles.toolbarIconHideFields}`}
                    />
                  </span>
                  {hiddenFieldsCount > 0
                    ? `${hiddenFieldsCount} hidden field${hiddenFieldsCount === 1 ? "" : "s"}`
                    : "Hide fields"}
                </button>
                {isHideFieldsMenuOpen ? (
                  <div
                    id="hide-fields-menu"
                    ref={hideFieldsMenuRef}
                    className={styles.hideFieldsMenu}
                    role="menu"
                    style={hideFieldsMenuPosition}
                  >
                    <div className={styles.hideFieldsMenuSearch}>
                      <input
                        className={styles.hideFieldsMenuSearchInput}
                        placeholder="Find a field"
                        value={hideFieldSearch}
                        onChange={(event) => setHideFieldSearch(event.target.value)}
                      />
                    </div>
                    <ul
                      ref={hideFieldListRef}
                      className={styles.hideFieldsMenuList}
                      onDragOver={handleHideFieldListDragOver}
                      onDrop={handleHideFieldListDrop}
                    >
                      <div
                        ref={hideFieldDropIndicatorRef}
                        className={styles.hideFieldsMenuDropIndicator}
                        aria-hidden="true"
                      />
                      {filteredHideFields.map((field) => {
                        const isVisible = columnVisibility[field.id] !== false;
                        const isDragging = hideFieldDragActiveId === field.id;
                        const tableField = tableFields.find(
                          (activeField) => activeField.id === field.id,
                        );
                        return (
                          <li
                            key={field.id}
                            ref={(element) => {
                              if (element) {
                                hideFieldRowRefs.current.set(field.id, element);
                                return;
                              }
                              hideFieldRowRefs.current.delete(field.id);
                            }}
                            className={`${styles.hideFieldsMenuItemRow} ${
                              isDragging ? styles.hideFieldsMenuItemRowDragging : ""
                            }`}
                          >
                            <button
                              type="button"
                              className={styles.hideFieldsMenuItem}
                              role="checkbox"
                              aria-checked={isVisible}
                              aria-label={field.label}
                              onClick={() =>
                                updateActiveTable((table) => ({
                                  ...table,
                                  columnVisibility: {
                                    ...table.columnVisibility,
                                    [field.id]: table.columnVisibility[field.id] === false,
                                  },
                                }))
                              }
                            >
                              <span
                                className={`${styles.hideFieldsMenuSwitch} ${
                                  isVisible ? styles.hideFieldsMenuSwitchOn : ""
                                }`}
                                aria-hidden="true"
                              >
                                <span className={styles.hideFieldsMenuSwitchKnob} />
                              </span>
                              <span className={styles.hideFieldsMenuItemIcon} aria-hidden="true">
                                {tableField
                                  ? renderFieldGlyphIcon(tableField)
                                  : renderHideFieldIcon(field.icon)}
                              </span>
                              <span className={styles.hideFieldsMenuField}>{field.label}</span>
                            </button>
                            <div
                              role="button"
                              tabIndex={reorderColumnsMutation.isPending ? -1 : 0}
                              className={`${styles.hideFieldsMenuDrag} ${
                                reorderColumnsMutation.isPending
                                  ? styles.hideFieldsMenuDragDisabled
                                  : ""
                              }`}
                              aria-label={`Reorder ${field.label}`}
                              aria-disabled={reorderColumnsMutation.isPending}
                              draggable={!reorderColumnsMutation.isPending}
                              onDragStart={(event) => handleHideFieldDragStart(event, field.id)}
                              onDragEnd={handleHideFieldDragEnd}
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5 3h2v2H5V3zm0 4h2v2H5V7zm0 4h2v2H5v-2zm4-8h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2z" />
                              </svg>
                            </div>
                          </li>
                        );
                      })}
                      {filteredHideFields.length === 0 ? (
                        <li className={styles.hideFieldsMenuEmpty}>No matching fields</li>
                      ) : null}
                    </ul>
                    <div className={styles.hideFieldsMenuFooter}>
                      <button
                        type="button"
                        className={styles.hideFieldsMenuAction}
                        onClick={() =>
                          updateActiveTable((table) => ({
                            ...table,
                            columnVisibility: Object.fromEntries(
                              table.fields.map((field) => [field.id, false]),
                            ),
                          }))
                        }
                      >
                        Hide all
                      </button>
                      <button
                        type="button"
                        className={styles.hideFieldsMenuAction}
                        onClick={() =>
                          updateActiveTable((table) => ({
                            ...table,
                            columnVisibility: Object.fromEntries(
                              table.fields.map((field) => [field.id, true]),
                            ),
                          }))
                        }
                      >
                        Show all
                      </button>
                    </div>
                  </div>
                ) : null}
                {isHideFieldsMenuOpen && draggedHideField && hideFieldDragActiveId ? (
                  <div
                    className={styles.hideFieldsDragPreview}
                    ref={hideFieldDragPreviewRef}
                    style={{
                      transform: `translate3d(${hideFieldDragPointerRef.current.x + 12}px, ${
                        hideFieldDragPointerRef.current.y + 12
                      }px, 0)`,
                    }}
                    aria-hidden="true"
                  >
                    <div className={styles.hideFieldsDragPreviewItem}>
                      <span
                        className={`${styles.hideFieldsMenuSwitch} ${
                          isDraggedHideFieldVisible ? styles.hideFieldsMenuSwitchOn : ""
                        }`}
                      >
                        <span className={styles.hideFieldsMenuSwitchKnob} />
                      </span>
                      <span className={styles.hideFieldsMenuItemIcon}>
                        {draggedHideTableField
                          ? renderFieldGlyphIcon(draggedHideTableField)
                          : renderHideFieldIcon(draggedHideField.icon)}
                      </span>
                      <span className={styles.hideFieldsMenuField}>
                        {draggedHideField.label}
                      </span>
                      <span className={styles.hideFieldsDragPreviewGrip}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M5 3h2v2H5V3zm0 4h2v2H5V7zm0 4h2v2H5v-2zm4-8h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2z" />
                        </svg>
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className={styles.searchWrapper}>
                <button
                  ref={searchButtonRef}
                  type="button"
                  className={`${styles.toolbarButton} ${styles.toolbarButtonIconOnly} ${
                    searchQuery ? styles.toolbarButtonHighlighted : ""
                  }`}
                  data-toolbar-item="search"
                  aria-label={searchQuery ? "Search (active)" : "Search"}
                  aria-expanded={isSearchMenuOpen}
                  aria-controls="search-menu"
                  onClick={() => setIsSearchMenuOpen((prev) => !prev)}
                >
                  <span
                    className={styles.toolbarIconWrap}
                    data-toolbar-icon="search"
                    aria-hidden="true"
                  >
                    <Image
                      src="/SVG/Asset%20175Airtable.svg"
                      alt=""
                      width={16}
                      height={16}
                      aria-hidden="true"
                    />
                  </span>
                </button>
                {isSearchMenuOpen ? (
                  <div
                    id="search-menu"
                    ref={searchMenuRef}
                    className={styles.searchMenu}
                    role="search"
                    aria-label="Find in view"
                    style={searchMenuPosition}
                  >
                    <div className={styles.searchMenuInputWrap}>
                      <input
                        ref={searchInputRef}
                        className={styles.searchMenuInput}
                        value={searchInputValue}
                        onChange={(event) => setSearchInputValue(event.target.value)}
                        placeholder="Find in view..."
                        onFocus={() => clearGridSelectionState()}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            event.preventDefault();
                            setIsSearchMenuOpen(false);
                            setSearchQuery("");
                            setActiveSearchMatchIndex(-1);
                            searchNavTargetRef.current = null;
                            return;
                          }
                          if (event.key !== "Enter") return;
                          event.preventDefault();
                          handleSearchNavigate(event.shiftKey ? "prev" : "next");
                        }}
                      />
                    </div>
                    {normalizedSearchQuery.length > 0 ? (
                      <div className={styles.searchMenuNav} aria-label="Search navigation">
                        <span className={styles.searchMenuCount}>
                          {isSearchNavigationLoading ? (
                            <span className={styles.searchMenuSpinner} aria-hidden="true" />
                          ) : (
                            searchMatchLabel
                          )}
                        </span>
                        {!isSearchNavigationLoading && hasSearchMatchesInTable ? (
                          <div className={styles.searchMenuNavButtons}>
                            <button
                              type="button"
                              className={styles.searchMenuNavButton}
                              onClick={() => handleSearchNavigate("prev")}
                              aria-label="Previous match"
                              disabled={
                                isSearchNavigationLoading ||
                                !canUseServerNavigation ||
                                (serverSearchIndices.length > 0
                                  ? serverSearchIndices.length <= 1
                                  : searchMatches.length <= 1)
                              }
                            >
                              <Image
                                src="/SVG/Asset%20343Airtable.svg"
                                alt=""
                                width={12}
                                height={12}
                                aria-hidden="true"
                                className={styles.searchNavArrowIcon}
                              />
                            </button>
                            <button
                              type="button"
                              className={styles.searchMenuNavButton}
                              onClick={() => handleSearchNavigate("next")}
                              aria-label="Next match"
                              disabled={
                                isSearchNavigationLoading ||
                                !canUseServerNavigation ||
                                (serverSearchIndices.length > 0
                                  ? serverSearchIndices.length <= 1
                                  : searchMatches.length <= 1)
                              }
                            >
                              <Image
                                src="/SVG/Asset%20349Airtable.svg"
                                alt=""
                                width={12}
                                height={12}
                                aria-hidden="true"
                                className={styles.searchNavArrowIcon}
                              />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    <button type="button" className={styles.searchMenuOmni}>
                      Ask Omni
                    </button>
                  <button
                      type="button"
                    className={styles.searchMenuClear}
                    onClick={() => {
                      setSearchInputValue("");
                      setSearchQuery("");
                      setActiveSearchMatchIndex(-1);
                      setIsSearchMenuOpen(false);
                      searchNavTargetRef.current = null;
                    }}
                    aria-label="Clear search"
                    disabled={!searchInputValue}
                  >
                    <Image
                      src="/SVG/Asset%205Airtable.svg"
                      alt=""
                      width={12}
                      height={12}
                      aria-hidden="true"
                      className={styles.searchNavClearIcon}
                    />
                  </button>
                </div>
                ) : null}
              </div>
              <div className={styles.filterWrapper}>
                <button
                  ref={filterButtonRef}
                  type="button"
                  className={`${styles.toolbarButton} ${
                    activeFilterCount > 0 ? styles.toolbarButtonFiltered : ""
                  }`}
                  data-toolbar-item="filter"
                  aria-expanded={isFilterMenuOpen}
                  aria-controls="filter-menu"
                  onClick={handleFilterMenuToggle}
                >
                  <span
                    className={styles.toolbarIconWrap}
                    data-toolbar-icon="filter"
                    aria-hidden="true"
                  >
                    <span
                      className={`${styles.toolbarButtonIcon} ${styles.toolbarIconMask} ${styles.toolbarIconFilter}`}
                    />
                  </span>
                  {activeFilterCount > 0
                    ? `Filtered by ${filteredColumnSummary || `${activeFilterCount} condition${activeFilterCount === 1 ? "" : "s"}`}`
                    : "Filter"}
                </button>
                {isFilterMenuOpen ? (
                  <div
                    id="filter-menu"
                    ref={filterMenuRef}
                    className={`${styles.filterMenu} ${
                      totalFilterConditions > 0 ? styles.filterMenuExpanded : ""
                    } ${
                      totalFilterConditions === 1 ? styles.filterMenuSingle : ""
                    }`}
                    role="dialog"
                    aria-label="Filter rows"
                    style={filterMenuPosition}
                    onMouseDown={(event) => {
                      const target = event.target as HTMLElement | null;
                      if (!target) return;
                      if (target.closest("[data-filter-action-button]")) return;
                      if (target.closest("[data-filter-select-trigger]")) return;
                      setFilterMenuActiveAction(null);
                      setActiveFilterSelect(null);
                    }}
                  >
                    <div className={styles.filterMenuHeader}>
                      <h3 className={styles.filterMenuTitle}>Filter</h3>
                    </div>
                    <button
                      type="button"
                      className={styles.filterOmniPrompt}
                      disabled
                      aria-disabled="true"
                    >
                      <svg
                        className={`${styles.omniIcon} ${styles.filterOmniPromptIcon}`}
                        height="16"
                        viewBox="0 0 160 160"
                        width="16"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        <g transform="scale(0.9090909090909091)" className={styles.omniRoot}>
                          <g className={`${styles.omniRing} ${styles.omniRingInner}`}>
                            {OMNI_ROTATIONS.map((rotation) => (
                              <g
                                key={`filter-omni-inner-${rotation}`}
                                className={styles.omniSpoke}
                                transform={`rotate(${rotation})`}
                              >
                                <g className={styles.omniBitContainer} transform="translate(72, 0)">
                                  <path className={styles.omniBit} d={OMNI_BIT_PATH} fill="currentColor" />
                                </g>
                              </g>
                            ))}
                          </g>
                          <g className={`${styles.omniRing} ${styles.omniRingMiddle}`}>
                            {OMNI_ROTATIONS.map((rotation) => (
                              <g
                                key={`filter-omni-middle-${rotation}`}
                                className={styles.omniSpoke}
                                transform={`rotate(${rotation})`}
                              >
                                <g className={styles.omniBitContainer} transform="translate(72, 0)">
                                  <path className={styles.omniBit} d={OMNI_BIT_PATH} fill="currentColor" />
                                </g>
                              </g>
                            ))}
                          </g>
                          <g className={`${styles.omniRing} ${styles.omniRingOuter}`}>
                            {OMNI_ROTATIONS.map((rotation) => (
                              <g
                                key={`filter-omni-outer-${rotation}`}
                                className={styles.omniSpoke}
                                transform={`rotate(${rotation})`}
                              >
                                <g className={styles.omniBitContainer} transform="translate(72, 0)">
                                  <path className={styles.omniBit} d={OMNI_BIT_PATH} fill="currentColor" />
                                </g>
                              </g>
                            ))}
                          </g>
                          <g className={styles.eyes}>
                            <g className={styles.omniEyeContainer} transform="translate(48, 72)">
                              <path className={styles.omniEye} d={OMNI_BIT_PATH} fill="currentColor" />
                            </g>
                            <g className={styles.omniEyeContainer} transform="translate(96, 72)">
                              <path className={styles.omniEye} d={OMNI_BIT_PATH} fill="currentColor" />
                            </g>
                          </g>
                        </g>
                      </svg>
                      <span className={styles.filterOmniPromptText}>Describe what you want to</span>
                    </button>
                    <div className={styles.filterMenuSubhead}>In this view, show records</div>
                    <DndContext
                      sensors={filterSensors}
                      collisionDetection={filterCollisionDetection}
                      onDragStart={handleFilterDragStart}
                      onDragOver={handleFilterDragOver}
                      onDragEnd={handleFilterDragEnd}
                      autoScroll
                    >
                      <div className={styles.filterMenuConditions}>
                        {filterGroups.length === 0 ? (
                          <div className={styles.filterMenuEmpty}>
                            No filter conditions are applied.
                          </div>
                        ) : null}
                        <SortableContext
                          items={filterGroupDragIds}
                          strategy={verticalListSortingStrategy}
                        >
                          {filterGroups.map((group, groupIndex) => {
                            const standaloneCondition = group.conditions[0];
                            const isGroupDragEnabled = filterGroups.length > 1;
                            return (
                              <Fragment key={group.id}>
                                <FilterRootDropZone index={groupIndex} />
                                <SortableFilterGroupRow
                                key={group.id}
                                groupId={group.id}
                                groupMode={group.mode}
                                conditionId={standaloneCondition?.id}
                                dragId={getFilterGroupDragId(group.id)}
                                isDragEnabled={isGroupDragEnabled}
                              >
                                {(groupHandleProps, isGroupDragging) => (
                                  <>
                                    <div className={styles.filterConditionPrefix}>
                                      {groupIndex === 0 ? (
                                        <span>Where</span>
                                      ) : groupIndex === 1 ? (
                                        <select
                                          className={styles.filterConditionJoinSelect}
                                          value={topLevelJoinValue}
                                          onChange={(event) =>
                                            setFilterGroups((prev) =>
                                              prev.map((candidate, index) =>
                                                index === 0
                                                  ? candidate
                                                  : {
                                                      ...candidate,
                                                      join: event.target.value as FilterJoin,
                                                    },
                                              ),
                                            )
                                          }
                                        >
                                          {FILTER_JOIN_ITEMS.map((item) => (
                                            <option key={item.id} value={item.id}>
                                              {item.label}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <span className={styles.filterConditionJoinText}>
                                          {topLevelJoinLabel}
                                        </span>
                                      )}
                                    </div>
                                    {group.mode === "single" && standaloneCondition ? (
                                      (() => {
                                        const selectedField = tableFields.find(
                                          (field) => field.id === standaloneCondition.columnId,
                                        );
                                        const operatorItems = getFilterOperatorItemsForField(
                                          selectedField?.kind,
                                        );
                                        const isNumberField = selectedField?.kind === "number";
                                        const selectedOperatorItem = operatorItems.find(
                                          (item) => item.id === standaloneCondition.operator,
                                        );
                                        const selectedOperatorLabel =
                                          selectedOperatorItem?.label ?? "Select";
                                        const selectedFieldLabel =
                                          selectedField?.label ?? "Select field";
                                        return (
                                          <div className={styles.filterStandaloneConditionRow}>
                                            <div
                                              className={`${styles.filterConditionBox} ${
                                                isGroupDragging ? styles.filterDragItemDragging : ""
                                              }`}
                                            >
                                              <button
                                                type="button"
                                                className={`${styles.filterConditionFieldSelect} ${
                                                  activeFilterSelect?.type === "field" &&
                                                  activeFilterSelect.conditionId ===
                                                    standaloneCondition.id
                                                    ? styles.filterSelectSelected
                                                    : ""
                                                }`}
                                                data-filter-select-trigger="field"
                                                onClick={(event) =>
                                                  openFilterSelectMenu(
                                                    event,
                                                    "field",
                                                    group.id,
                                                    standaloneCondition.id,
                                                  )
                                                }
                                              >
                                                {selectedFieldLabel}
                                              </button>
                                              <button
                                                type="button"
                                                className={`${styles.filterConditionOperatorSelect} ${
                                                  activeFilterSelect?.type === "operator" &&
                                                  activeFilterSelect.conditionId ===
                                                    standaloneCondition.id
                                                    ? styles.filterSelectSelected
                                                    : ""
                                                }`}
                                                data-filter-select-trigger="operator"
                                                onClick={(event) =>
                                                  openFilterSelectMenu(
                                                    event,
                                                    "operator",
                                                    group.id,
                                                    standaloneCondition.id,
                                                  )
                                                }
                                              >
                                                {selectedOperatorLabel}
                                              </button>
                                              {operatorRequiresValue(standaloneCondition.operator) ? (
                                                <input
                                                  type={isNumberField ? "number" : "text"}
                                                  className={styles.filterConditionValueInput}
                                                  value={standaloneCondition.value}
                                                  onChange={(event) =>
                                                    updateFilterCondition(
                                                      group.id,
                                                      standaloneCondition.id,
                                                      (current) => ({
                                                        ...current,
                                                        value: event.target.value,
                                                      }),
                                                    )
                                                  }
                                                  placeholder={
                                                    isNumberField
                                                      ? "Enter a number"
                                                      : "Enter a value"
                                                  }
                                                />
                                              ) : (
                                                <div className={styles.filterConditionValueDisabled}>
                                                  No value
                                                </div>
                                              )}
                                              <button
                                                type="button"
                                                className={styles.filterConditionDelete}
                                                onClick={() =>
                                                  removeFilterCondition(
                                                    group.id,
                                                    standaloneCondition.id,
                                                  )
                                                }
                                                aria-label="Remove filter condition"
                                              >
                                                <span
                                                  className={styles.filterConditionDeleteIcon}
                                                  aria-hidden="true"
                                                />
                                              </button>
                                              <button
                                                type="button"
                                                className={styles.filterConditionDrag}
                                                aria-label="Reorder filter condition"
                                                ref={groupHandleProps.setActivatorNodeRef}
                                                {...groupHandleProps.attributes}
                                                {...groupHandleProps.listeners}
                                              >
                                                <span
                                                  className={styles.filterConditionDragIcon}
                                                  aria-hidden="true"
                                                />
                                              </button>
                                            </div>
                                          </div>
                                        );
                                      })()
                                    ) : (
                                    <div
                                      className={`${styles.filterGroupCard} ${
                                        isGroupDragging ? styles.filterDragItemDragging : ""
                                      }`}
                                    >
                                      {(() => {
                                        const groupJoinValue = group.conditions[1]?.join ?? "and";
                                        const groupJoinLabel =
                                          FILTER_JOIN_ITEMS.find(
                                            (item) => item.id === groupJoinValue,
                                          )?.label ?? groupJoinValue;
                                        const groupRuleLabel =
                                          groupJoinValue === "and"
                                            ? "All of the following are true..."
                                            : "Any of the following are true...";
                                        return (
                                          <>
                                            <div className={styles.filterGroupHeader}>
                                              <span className={styles.filterGroupHeaderLabel}>
                                                {groupRuleLabel}
                                              </span>
                                              <div className={styles.filterGroupHeaderActions}>
                                                <button
                                                  type="button"
                                                  className={styles.filterGroupActionButton}
                                                  onClick={() =>
                                                    setFilterGroups((prev) =>
                                                      prev.map((candidate) =>
                                                        candidate.id === group.id
                                                          ? {
                                                              ...candidate,
                                                              conditions: [
                                                                ...candidate.conditions,
                                                                createFilterCondition(
                                                                  candidate.conditions[1]?.join ?? "and",
                                                                ),
                                                              ],
                                                            }
                                                          : candidate,
                                                      ),
                                                    )
                                                  }
                                                  disabled={tableFields.length === 0}
                                                  aria-label="Add condition"
                                                >
                                                  <svg
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 16 16"
                                                    fill="currentColor"
                                                    aria-hidden="true"
                                                  >
                                                    <path d="M7.25 2.5h1.5v4.75H13.5v1.5H8.75v4.75h-1.5V8.75H2.5v-1.5h4.75V2.5z" />
                                                  </svg>
                                                </button>
                                                <button
                                                  type="button"
                                                  className={styles.filterGroupActionButton}
                                                  onClick={() => removeFilterGroup(group.id)}
                                                  aria-label="Delete group"
                                                >
                                                  <span
                                                    className={styles.filterConditionDeleteIcon}
                                                    aria-hidden="true"
                                                  />
                                                </button>
                                                <button
                                                  type="button"
                                                  className={styles.filterGroupActionButton}
                                                  aria-label="Reorder filter group"
                                                  ref={groupHandleProps.setActivatorNodeRef}
                                                  {...groupHandleProps.attributes}
                                                  {...groupHandleProps.listeners}
                                                >
                                                  <span
                                                    className={styles.filterConditionDragIcon}
                                                    aria-hidden="true"
                                                  />
                                                </button>
                                              </div>
                                            </div>
                                            <FilterGroupDropZone groupId={group.id}>
                                              <SortableContext
                                                items={group.conditions.map((condition) =>
                                                  getFilterConditionDragId(condition.id),
                                                )}
                                                strategy={verticalListSortingStrategy}
                                              >
                                                {group.conditions.map((condition, conditionIndex) => {
                                                  const selectedField = tableFields.find(
                                                    (field) => field.id === condition.columnId,
                                                  );
                                                  const operatorItems = getFilterOperatorItemsForField(
                                                    selectedField?.kind,
                                                  );
                                                  const isNumberField = selectedField?.kind === "number";
                                                  const selectedOperatorItem = operatorItems.find(
                                                    (item) => item.id === condition.operator,
                                                  );
                                                  const selectedOperatorLabel =
                                                    selectedOperatorItem?.label ?? "Select";
                                                  const selectedFieldLabel =
                                                    selectedField?.label ?? "Select field";
                                                  const isConditionDragEnabled = true;
                                                  return (
                                                    <SortableFilterConditionRow
                                                      key={condition.id}
                                                      groupId={group.id}
                                                      conditionId={condition.id}
                                                      dragId={getFilterConditionDragId(condition.id)}
                                                      isDragEnabled={isConditionDragEnabled}
                                                    >
                                                      {(conditionHandleProps, isConditionDragging) => (
                                                        <>
                                                          <div className={styles.filterConditionPrefix}>
                                                            {conditionIndex === 0 ? (
                                                              <span>Where</span>
                                                            ) : conditionIndex === 1 ? (
                                                              <select
                                                                className={styles.filterConditionJoinSelect}
                                                                value={groupJoinValue}
                                                                onChange={(event) =>
                                                                  setFilterGroups((prev) =>
                                                                    prev.map((candidate) => {
                                                                      if (candidate.id !== group.id)
                                                                        return candidate;
                                                                      const nextJoin =
                                                                        event.target.value as FilterJoin;
                                                                      return {
                                                                        ...candidate,
                                                                        conditions:
                                                                          candidate.conditions.map(
                                                                            (entry, index) =>
                                                                              index === 0
                                                                                ? entry
                                                                                : {
                                                                                    ...entry,
                                                                                    join: nextJoin,
                                                                                  },
                                                                          ),
                                                                      };
                                                                    }),
                                                                  )
                                                                }
                                                              >
                                                                {FILTER_JOIN_ITEMS.map((item) => (
                                                                  <option key={item.id} value={item.id}>
                                                                    {item.label}
                                                                  </option>
                                                                ))}
                                                              </select>
                                                            ) : (
                                                              <span
                                                                className={styles.filterConditionJoinText}
                                                              >
                                                                {groupJoinLabel}
                                                              </span>
                                                            )}
                                                          </div>
                                                          <div
                                                            className={`${styles.filterConditionBox} ${
                                                              isConditionDragging
                                                                ? styles.filterDragItemDragging
                                                                : ""
                                                            }`}
                                                          >
                                                              <button
                                                                type="button"
                                                                className={`${styles.filterConditionFieldSelect} ${
                                                                  activeFilterSelect?.type ===
                                                                    "field" &&
                                                                  activeFilterSelect.conditionId ===
                                                                    condition.id
                                                                    ? styles.filterSelectSelected
                                                                    : ""
                                                                }`}
                                                                data-filter-select-trigger="field"
                                                                onClick={(event) =>
                                                                  openFilterSelectMenu(
                                                                    event,
                                                                    "field",
                                                                    group.id,
                                                                    condition.id,
                                                                  )
                                                                }
                                                              >
                                                                {selectedFieldLabel}
                                                              </button>
                                                              <button
                                                                type="button"
                                                                className={`${styles.filterConditionOperatorSelect} ${
                                                                  activeFilterSelect?.type ===
                                                                    "operator" &&
                                                                  activeFilterSelect.conditionId ===
                                                                    condition.id
                                                                    ? styles.filterSelectSelected
                                                                    : ""
                                                                }`}
                                                                data-filter-select-trigger="operator"
                                                                onClick={(event) =>
                                                                  openFilterSelectMenu(
                                                                    event,
                                                                    "operator",
                                                                    group.id,
                                                                    condition.id,
                                                                  )
                                                                }
                                                            >
                                                              {selectedOperatorLabel}
                                                            </button>
                                                            {operatorRequiresValue(condition.operator) ? (
                                                              <input
                                                                type={isNumberField ? "number" : "text"}
                                                                className={styles.filterConditionValueInput}
                                                                value={condition.value}
                                                                onChange={(event) =>
                                                                  updateFilterCondition(
                                                                    group.id,
                                                                    condition.id,
                                                                    (current) => ({
                                                                      ...current,
                                                                      value: event.target.value,
                                                                    }),
                                                                  )
                                                                }
                                                                placeholder={
                                                                  isNumberField
                                                                    ? "Enter a number"
                                                                    : "Enter a value"
                                                                }
                                                              />
                                                            ) : (
                                                              <div
                                                                className={styles.filterConditionValueDisabled}
                                                              >
                                                                No value
                                                              </div>
                                                            )}
                                                            <button
                                                              type="button"
                                                              className={styles.filterConditionDelete}
                                                              onClick={() =>
                                                                removeFilterCondition(group.id, condition.id)
                                                              }
                                                              aria-label="Remove filter condition"
                                                            >
                                                              <span
                                                                className={styles.filterConditionDeleteIcon}
                                                                aria-hidden="true"
                                                              />
                                                            </button>
                                                            <button
                                                              type="button"
                                                              className={styles.filterConditionDrag}
                                                              aria-label="Reorder filter condition"
                                                              ref={conditionHandleProps.setActivatorNodeRef}
                                                              {...conditionHandleProps.attributes}
                                                              {...conditionHandleProps.listeners}
                                                            >
                                                              <span
                                                                className={styles.filterConditionDragIcon}
                                                                aria-hidden="true"
                                                              />
                                                            </button>
                                                          </div>
                                                        </>
                                                      )}
                                                    </SortableFilterConditionRow>
                                                  );
                                                })}
                                              </SortableContext>
                                            </FilterGroupDropZone>
                                          </>
                                        );
                                      })()}
                                    </div>
                                    )}
                                  </>
                                )}
                              </SortableFilterGroupRow>
                              </Fragment>
                            );
                          })}
                          <FilterRootDropZone index={filterGroups.length} />
                        </SortableContext>
                      </div>
                    </DndContext>
                    <div className={styles.filterMenuActions}>
                      <button
                        type="button"
                        className={`${styles.filterMenuActionPrimary} ${
                          filterMenuActiveAction === "condition"
                            ? styles.filterMenuActionActive
                            : ""
                        }`}
                        data-filter-action-button="condition"
                        onClick={() => {
                          setFilterMenuActiveAction("condition");
                          addFilterCondition();
                        }}
                        disabled={tableFields.length === 0}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                          <path d="M7.25 2.5h1.5v4.75H13.5v1.5H8.75v4.75h-1.5V8.75H2.5v-1.5h4.75V2.5z" />
                        </svg>
                        Add condition
                      </button>
                      <button
                        type="button"
                        className={`${styles.filterMenuActionSecondary} ${
                          filterMenuActiveAction === "group"
                            ? styles.filterMenuActionActive
                            : ""
                        }`}
                        data-filter-action-button="group"
                        onClick={() => {
                          setFilterMenuActiveAction("group");
                          addFilterConditionGroup();
                        }}
                        disabled={tableFields.length === 0}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                          <path d="M7.25 2.5h1.5v4.75H13.5v1.5H8.75v4.75h-1.5V8.75H2.5v-1.5h4.75V2.5z" />
                        </svg>
                        Add condition group
                      </button>
                    </div>
                  </div>
                ) : null}
                {filterSelectMenu && activeFilterSelectData ? (
                  <div
                    ref={filterSelectMenuRef}
                    className={styles.filterSelectMenu}
                    role="menu"
                    aria-label={
                      filterSelectMenu.type === "field"
                        ? "Select a field"
                        : "Select an operator"
                    }
                    style={filterSelectMenuPosition}
                    data-filter-select-menu
                  >
                    <div className={styles.filterSelectMenuSearch}>
                      <input
                        ref={filterSelectSearchInputRef}
                        className={styles.filterSelectMenuSearchInput}
                        placeholder={
                          filterSelectMenu.type === "field"
                            ? "Find a field"
                            : "Find an operator"
                        }
                        value={filterSelectSearch}
                        onChange={(event) => setFilterSelectSearch(event.target.value)}
                      />
                    </div>
                    <div className={styles.filterSelectMenuList}>
                      {filterSelectMenu.type === "field"
                        ? filterSelectFieldItems.map((field) => {
                            const isActive =
                              field.id === activeFilterSelectData.condition.columnId;
                            return (
                              <button
                                key={field.id}
                                type="button"
                                className={`${styles.filterSelectMenuItem} ${
                                  isActive ? styles.filterSelectMenuItemActive : ""
                                }`}
                                onClick={() => {
                                  handleFilterFieldSelect(
                                    activeFilterSelectData.groupId,
                                    activeFilterSelectData.condition.id,
                                    field.id,
                                  );
                                  closeFilterSelectMenu();
                                }}
                              >
                                <span
                                  className={styles.filterSelectMenuItemIcon}
                                  aria-hidden="true"
                                >
                                  {renderFieldGlyphIcon(field)}
                                </span>
                                <span className={styles.filterSelectMenuItemLabel}>
                                  {field.label}
                                </span>
                              </button>
                            );
                          })
                        : filterSelectOperatorItems.map((item) => {
                            const isActive =
                              item.id === activeFilterSelectData.condition.operator;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                className={`${styles.filterSelectMenuItem} ${
                                  isActive ? styles.filterSelectMenuItemActive : ""
                                }`}
                                onClick={() => {
                                  handleFilterOperatorSelect(
                                    activeFilterSelectData.groupId,
                                    activeFilterSelectData.condition.id,
                                    item.id,
                                  );
                                  closeFilterSelectMenu();
                                }}
                              >
                                <span className={styles.filterSelectMenuItemLabel}>
                                  {item.label}
                                </span>
                              </button>
                            );
                          })}
                      {filterSelectMenu.type === "field" &&
                      filterSelectFieldItems.length === 0 ? (
                        <div className={styles.filterSelectMenuEmpty}>No fields found.</div>
                      ) : null}
                      {filterSelectMenu.type === "operator" &&
                      filterSelectOperatorItems.length === 0 ? (
                        <div className={styles.filterSelectMenuEmpty}>No operators found.</div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className={styles.groupWrapper}>
                <button
                  ref={groupButtonRef}
                  type="button"
                  className={`${styles.toolbarButton} ${styles.toolbarButtonDisabled}`}
                  data-toolbar-item="group"
                  aria-expanded={isGroupMenuOpen}
                  aria-controls="group-menu"
                  disabled
                  onClick={() => setIsGroupMenuOpen((prev) => !prev)}
                >
                  <span
                    className={styles.toolbarIconWrap}
                    data-toolbar-icon="group"
                    aria-hidden="true"
                  >
                    <span
                      className={`${styles.toolbarButtonIcon} ${styles.toolbarIconMask} ${styles.toolbarIconGroup}`}
                    />
                  </span>
                  Group
                </button>
                {isGroupMenuOpen ? (
                  <div
                    id="group-menu"
                    ref={groupMenuRef}
                    className={styles.groupMenu}
                    role="menu"
                    style={groupMenuPosition}
                  >
                    <div className={styles.groupMenuHeader}>
                      <h3 className={styles.groupMenuTitle}>Group by</h3>
                      <button
                        type="button"
                        className={styles.groupMenuHelp}
                        aria-label="Learn more about grouping"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                          <path d="M8 1.25a6.75 6.75 0 110 13.5 6.75 6.75 0 010-13.5zm0 1.5a5.25 5.25 0 100 10.5 5.25 5.25 0 000-10.5zm-.04 6.79a.76.76 0 01.75.75v.08a.75.75 0 01-1.5 0v-.08a.75.75 0 01.75-.75zm.4-4.57c.97 0 1.68.58 1.68 1.5 0 .69-.34 1.16-.91 1.53-.39.26-.56.46-.56.81v.11H7.13v-.17c0-.9.42-1.37.97-1.72.34-.22.5-.4.5-.65 0-.3-.22-.53-.58-.53-.4 0-.64.22-.66.62H5.94c.04-1.03.89-1.5 1.92-1.5z" />
                        </svg>
                      </button>
                    </div>
                    <div className={styles.groupMenuDivider} />
                    <div className={styles.groupMenuHint}>Pick a field to group by</div>
                    <button type="button" className={styles.groupMenuField}>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path d="M8 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zm0 1.5a5 5 0 100 10 5 5 0 000-10zm0 6.69L5.4 7.08l-1.06 1.06L8 11.8l3.66-3.66-1.06-1.06L8 9.69z" />
                      </svg>
                      <span>Status</span>
                    </button>
                    <div className={styles.groupMenuDivider} />
                    <button type="button" className={styles.groupMenuSeeAll}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                        <path d="M4.47 6.47a.75.75 0 011.06 0L8 8.94l2.47-2.47a.75.75 0 111.06 1.06L8.53 10.53a.75.75 0 01-1.06 0L4.47 7.53a.75.75 0 010-1.06z" />
                      </svg>
                      <span>See all fields</span>
                    </button>
                  </div>
                ) : null}
              </div>
              <div className={styles.sortWrapper}>
                <button
                  ref={sortButtonRef}
                  type="button"
                  className={`${styles.toolbarButton} ${
                    isSortActive ? styles.toolbarButtonHighlighted : ""
                  }`}
                  data-toolbar-item="sort"
                  aria-expanded={isSortMenuOpen}
                  aria-controls="sort-menu"
                  onClick={() => setIsSortMenuOpen((prev) => !prev)}
                >
                  <span
                    className={styles.toolbarIconWrap}
                    data-toolbar-icon="sort"
                    aria-hidden="true"
                  >
                    <span
                      className={`${styles.toolbarButtonIcon} ${styles.toolbarIconMask} ${styles.toolbarIconSort}`}
                    />
                  </span>
                  {isSortActive
                    ? `Sorted by ${sorting.length} field${sorting.length === 1 ? "" : "s"}`
                    : "Sort"}
                </button>
                {isSortMenuOpen ? (
                  <div
                    id="sort-menu"
                    ref={sortMenuRef}
                    className={styles.sortMenu}
                    role="menu"
                    style={sortMenuPosition}
                  >
                    <div className={styles.sortMenuInner}>
                      {sortMenuView === "picker" ? (
                        <>
                          <div className={styles.sortMenuHeader}>
                            <div className={styles.sortMenuHeaderRow}>
                              <p className={styles.sortMenuTitle}>Sort by</p>
                            </div>
                          </div>
                          <div className={styles.sortMenuDivider} />
                          <div
                            className={`${styles.sortMenuSearch} ${
                              isSortFieldSearchActive ? styles.sortMenuSearchActive : ""
                            }`}
                          >
                            <span
                              className={styles.sortMenuSearchIcon}
                              aria-hidden="true"
                            />
                            <input
                              className={styles.sortMenuSearchInput}
                              placeholder="Find a field"
                              value={sortFieldSearch}
                              onChange={(event) => setSortFieldSearch(event.target.value)}
                              onFocus={() => setIsSortFieldSearchFocused(true)}
                              onBlur={() => setIsSortFieldSearchFocused(false)}
                            />
                            {sortFieldSearch ? (
                              <button
                                type="button"
                                className={styles.sortMenuSearchClear}
                                aria-label="Clear search"
                                onClick={() => setSortFieldSearch("")}
                              >
                                <span
                                  className={styles.sortMenuSearchClearIcon}
                                  aria-hidden="true"
                                />
                              </button>
                            ) : null}
                          </div>
                          <div className={styles.sortMenuList}>
                            {filteredSortFields.length === 0 ? (
                              <div className={styles.sortMenuEmpty}>No matching fields</div>
                            ) : (
                              filteredSortFields.map((field) => {
                                const isActive = activeSortFieldId === field.id;
                                return (
                                  <button
                                    key={field.id}
                                    type="button"
                                    className={`${styles.sortMenuItem} ${
                                      isActive ? styles.sortMenuItemActive : ""
                                    }`}
                                    onClick={() => handleSelectSortField(field.id)}
                                  >
                                    <span className={styles.sortMenuItemIcon} aria-hidden="true">
                                      {renderFieldGlyphIcon(field)}
                                    </span>
                                    <span>{field.label}</span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={styles.sortMenuHeader}>
                            <div className={styles.sortMenuTitleWrap}>
                              <p className={styles.sortMenuTitle}>Sort by</p>
                              <button
                                type="button"
                                className={styles.sortMenuHelp}
                                aria-label="Learn more about sorting"
                              >
                                <svg
                                  width="16"
                                  height="16"
                                  viewBox="0 0 16 16"
                                  fill="currentColor"
                                  aria-hidden="true"
                                >
                                  <path d="M8 1.25a6.75 6.75 0 110 13.5 6.75 6.75 0 010-13.5zm0 1.5a5.25 5.25 0 100 10.5 5.25 5.25 0 000-10.5zm-.04 6.79a.76.76 0 01.75.75v.08a.75.75 0 01-1.5 0v-.08a.75.75 0 01.75-.75zm.4-4.57c.97 0 1.68.58 1.68 1.5 0 .69-.34 1.16-.91 1.53-.39.26-.56.46-.56.81v.11H7.13v-.17c0-.9.42-1.37.97-1.72.34-.22.5-.4.5-.65 0-.3-.22-.53-.58-.53-.4 0-.64.22-.66.62H5.94c.04-1.03.89-1.5 1.92-1.5z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                          <div className={styles.sortMenuDivider} />
                          {sortableFields.length === 0 ? (
                            <div className={styles.sortMenuEmpty}>No sortable fields</div>
                          ) : (
                            <>
                              {displayedSortRules.map((sortRule, sortIndex) => {
                                const sortField = sortableFields.find(
                                  (field) => field.id === sortRule.id,
                                );
                                const sortDirectionLabels = getSortDirectionLabelsForField(
                                  sortField?.kind,
                                );
                                return (
                                  <div
                                    className={styles.sortRuleRow}
                                    key={`${sortRule.id}-${sortIndex}`}
                                  >
                                    <select
                                      className={styles.sortRuleSelect}
                                      value={sortRule.id}
                                      onChange={(event) =>
                                        handleSortRuleFieldChange(sortIndex, event.target.value)
                                      }
                                    >
                                      {sortableFields.map((field) => (
                                        <option key={field.id} value={field.id}>
                                          {getFieldDisplayLabel(field)}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      className={styles.sortRuleSelect}
                                      value={sortRule.desc ? "desc" : "asc"}
                                      onChange={(event) =>
                                        handleSortRuleDirectionChange(
                                          sortIndex,
                                          event.target.value === "desc" ? "desc" : "asc",
                                        )
                                      }
                                    >
                                      <option value="asc">{sortDirectionLabels.asc}</option>
                                      <option value="desc">{sortDirectionLabels.desc}</option>
                                    </select>
                                    <button
                                      type="button"
                                      className={styles.sortRuleRemove}
                                      onClick={() => handleRemoveSortRule(sortIndex)}
                                      aria-label={`Remove sort ${sortIndex + 1}`}
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              })}
                              <button
                                type="button"
                                className={styles.sortMenuAddRule}
                                onClick={handleAddSortRule}
                              >
                                + Add another sort
                              </button>
                              <div className={styles.sortMenuFooter}>
                                <div className={styles.sortMenuFooterRow}>
                                  <button
                                    type="button"
                                    className={styles.addColumnNumberToggleRow}
                                    onClick={() => {
                                      const nextEnabled = !isAutoSortEnabled;
                                      setIsAutoSortEnabled(nextEnabled);
                                      if (nextEnabled) {
                                        const rulesToApply = pendingSortRules ?? sorting;
                                        if (rulesToApply.length > 0) {
                                          setSorting(rulesToApply);
                                        }
                                        setPendingSortRules(null);
                                      } else {
                                        setPendingSortRules(null);
                                      }
                                    }}
                                  >
                                    <span
                                      className={`${styles.addColumnNumberToggle} ${
                                        isAutoSortEnabled ? styles.addColumnNumberToggleOn : ""
                                      }`}
                                      aria-hidden="true"
                                    >
                                      <span className={styles.addColumnNumberToggleKnob} />
                                    </span>
                                    <span>Automatically sort records</span>
                                  </button>
                                  {!isAutoSortEnabled && (
                                    <div className={styles.sortMenuFooterActions}>
                                      <button
                                        type="button"
                                        className={styles.sortMenuCancelButton}
                                        onClick={handleCancelSort}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        className={styles.sortMenuApplyButton}
                                        onClick={handleApplySort}
                                      >
                                        Sort
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className={styles.colorWrapper}>
                <button
                  ref={colorButtonRef}
                  type="button"
                  className={`${styles.toolbarButton} ${styles.toolbarButtonDisabled}`}
                  data-toolbar-item="color"
                  aria-expanded={isColorMenuOpen}
                  aria-controls="color-menu"
                  disabled
                  onClick={() => setIsColorMenuOpen((prev) => !prev)}
                >
                  <span
                    className={styles.toolbarIconWrap}
                    data-toolbar-icon="color"
                    aria-hidden="true"
                  >
                    <span
                      className={`${styles.toolbarButtonIcon} ${styles.toolbarIconMask} ${styles.toolbarIconColor}`}
                    />
                  </span>
                  Color
                </button>
                {isColorMenuOpen ? (
                  <div
                    id="color-menu"
                    ref={colorMenuRef}
                    className={styles.colorMenu}
                    role="menu"
                    style={colorMenuPosition}
                  >
                    <button type="button" className={styles.colorMenuOption}>
                      <div className={styles.colorMenuOptionTitle}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                          <path d="M8 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zm0 1.5a5 5 0 100 10 5 5 0 000-10zm0 6.69L5.4 7.08l-1.06 1.06L8 11.8l3.66-3.66-1.06-1.06L8 9.69z" />
                        </svg>
                        <span>Select field</span>
                      </div>
                      <div className={styles.colorMenuOptionDesc}>
                        Color records the same as a single select field
                      </div>
                    </button>
                    <button type="button" className={styles.colorMenuOption}>
                      <div className={styles.colorMenuOptionTitle}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                          <path d="M6.5 3a.75.75 0 01.75.75V6h6.5a.75.75 0 010 1.5h-1v4a.75.75 0 01-1.5 0v-4h-5v4a.75.75 0 01-1.5 0v-4h-1a.75.75 0 010-1.5h2V3.75A.75.75 0 016.5 3zm5 0a.75.75 0 01.75.75V5h1.5a.75.75 0 010 1.5h-3a.75.75 0 010-1.5h1V3.75A.75.75 0 0111.5 3zM3 10.75a.75.75 0 01.75-.75h3a.75.75 0 010 1.5h-3A.75.75 0 013 10.75z" />
                        </svg>
                        <span>Conditions</span>
                      </div>
                      <div className={styles.colorMenuOptionDesc}>
                        Color records based on conditions
                      </div>
                    </button>
                  </div>
                ) : null}
              </div>
              <div className={styles.rowHeightWrapper}>
                <button
                  ref={rowHeightButtonRef}
                  type="button"
                  className={styles.toolbarButton}
                  data-toolbar-item="row-height"
                  aria-expanded={isRowHeightMenuOpen}
                  aria-controls="row-height-menu"
                  onClick={() => setIsRowHeightMenuOpen((prev) => !prev)}
                >
                  <span
                    className={styles.toolbarIconWrap}
                    data-toolbar-icon="row-height"
                    aria-hidden="true"
                  >
                    <span
                      className={`${styles.toolbarButtonIcon} ${styles.toolbarIconMask} ${styles.toolbarIconRowHeight}`}
                    />
                  </span>
                </button>
                {isRowHeightMenuOpen ? (
                  <div
                    id="row-height-menu"
                    ref={rowHeightMenuRef}
                    className={styles.rowHeightMenu}
                    role="menu"
                    style={rowHeightMenuPosition}
                  >
                    <div className={styles.rowHeightMenuTitle}>Select a row height</div>
                    <ul className={styles.rowHeightMenuList} role="menu">
                      {ROW_HEIGHT_ITEMS.map((item) => {
                        const isActive = rowHeight === item.id;
                        return (
                          <li key={item.id} role="none">
                            <button
                              type="button"
                              role="menuitem"
                              className={`${styles.rowHeightMenuItem} ${isActive ? styles.rowHeightMenuItemActive : ""}`}
                              onClick={() => handleRowHeightChange(item.id)}
                            >
                              <span className={styles.rowHeightMenuItemIcon}>
                                {renderRowHeightIcon(item.id)}
                              </span>
                              <span className={styles.rowHeightMenuItemText}>{item.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <div className={styles.rowHeightMenuDivider} />
                    <button
                      type="button"
                      className={`${styles.rowHeightMenuWrap} ${wrapHeaders ? styles.rowHeightMenuWrapActive : ""}`}
                      onClick={() => setWrapHeaders((prev) => !prev)}
                    >
                      <span className={styles.rowHeightMenuItemIcon}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                          <path d="M2 3h12v1.5H2V3zm0 3h7v1.5H2V6zm0 3h6v1.5H2V9zm0 3h5v1.5H2V12z" />
                        </svg>
                      </span>
                      <span className={styles.rowHeightMenuItemText}>Wrap headers</span>
                    </button>
                  </div>
                ) : null}
              </div>
              <div className={styles.shareSyncWrapper}>
                <button
                  ref={shareSyncButtonRef}
                  type="button"
                  className={`${styles.toolbarButton} ${styles.toolbarButtonDisabled}`}
                  data-toolbar-item="share-sync"
                  aria-expanded={isShareSyncMenuOpen}
                  aria-controls="share-sync-menu"
                  disabled
                  onClick={() => setIsShareSyncMenuOpen((prev) => !prev)}
                >
                  <span
                    className={styles.toolbarIconWrap}
                    data-toolbar-icon="share-sync"
                    aria-hidden="true"
                  >
                    <span
                      className={`${styles.toolbarButtonIcon} ${styles.toolbarIconMask} ${styles.toolbarIconShareSync}`}
                    />
                  </span>
                  Share and sync
                </button>
                {isShareSyncMenuOpen ? (
                  <div
                    id="share-sync-menu"
                    ref={shareSyncMenuRef}
                    className={styles.shareSyncMenu}
                    role="dialog"
                    aria-label="Share view"
                    style={shareSyncMenuPosition}
                  >
                    <div className={styles.shareSyncMenuInner}>
                      <button type="button" className={styles.shareSyncMenuItem}>
                        <span className={styles.shareSyncMenuItemIcon}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M7.25 4.5a3.25 3.25 0 114.6 4.6l-2.1 2.1a3.25 3.25 0 11-4.6-4.6l.7-.7a.75.75 0 111.06 1.06l-.7.7a1.75 1.75 0 002.48 2.48l2.1-2.1a1.75 1.75 0 00-2.48-2.48l-.7.7a.75.75 0 01-1.06-1.06l.7-.7zM6.24 4.8a.75.75 0 010 1.06l-2.1 2.1a1.75 1.75 0 002.48 2.48l.7-.7a.75.75 0 011.06 1.06l-.7.7a3.25 3.25 0 11-4.6-4.6l2.1-2.1a.75.75 0 011.06 0z" />
                          </svg>
                        </span>
                        <span className={styles.shareSyncMenuItemLabel}>Create link to view</span>
                      </button>
                      <div className={styles.shareSyncMenuDivider} />
                      <button type="button" className={styles.shareSyncMenuItem}>
                        <span className={styles.shareSyncMenuItemIcon}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M8.7 1.83a.75.75 0 00-1.4.3v3.22H4.56a.75.75 0 00-.62 1.17l3.43 5.03a.75.75 0 001.35-.42V7.9h2.72a.75.75 0 00.61-1.18L8.7 1.83zM3.75 12.5a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z" />
                          </svg>
                        </span>
                        <span className={styles.shareSyncMenuItemLabel}>Sync data to another base</span>
                        <span className={styles.shareSyncMenuItemChevron}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M6.47 3.47a.75.75 0 011.06 0L11.53 7.47a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06-1.06L9.94 8 6.47 4.53a.75.75 0 010-1.06z" />
                          </svg>
                        </span>
                      </button>
                      <button type="button" className={styles.shareSyncMenuItem}>
                        <span className={styles.shareSyncMenuItemIcon}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M3 3h10v2H3V3zm0 4h2v2H3V7zm4 0h2v2H7V7zm4 0h2v2h-2V7zM3 11h10v2H3v-2z" />
                          </svg>
                        </span>
                        <span className={styles.shareSyncMenuItemLabel}>Embed this view</span>
                      </button>
                      <div className={styles.shareSyncMenuDivider} />
                      <button type="button" className={styles.shareSyncMenuItem}>
                        <span className={styles.shareSyncMenuItemIcon}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M3 2h10v12H3V2zm1.5 1.5v9h7v-9h-7zM6 6h4v1.5H6V6zm0 3h4v1.5H6V9z" />
                          </svg>
                        </span>
                        <span className={styles.shareSyncMenuItemLabel}>Create a form view</span>
                      </button>
                    </div>
                    {showShareSyncInfo ? (
                      <div className={styles.shareSyncInfoCard}>
                        <div className={styles.shareSyncInfoIcon}>
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                            <path d="M8 1.25a6.75 6.75 0 110 13.5 6.75 6.75 0 010-13.5zm0 1.5a5.25 5.25 0 100 10.5 5.25 5.25 0 000-10.5zm.75 3.5h-1.5v1.5h1.5v-1.5zm0 3h-1.5V12h1.5V9.25z" />
                          </svg>
                        </div>
                        <div className={styles.shareSyncInfoContent}>
                          <p className={styles.shareSyncInfoText}>
                            <strong>Interface pages can now be shared publicly.</strong> Instead of a
                            shared view, create and share customizable layouts with interface designer.
                            <button type="button" className={styles.shareSyncInfoLink}>Learn more</button>
                          </p>
                          <div className={styles.shareSyncInfoActions}>
                            <button
                              type="button"
                              className={styles.shareSyncInfoButtonGhost}
                              onClick={() => setShowShareSyncInfo(false)}
                            >
                              Dismiss
                            </button>
                            <button type="button" className={styles.shareSyncInfoButtonPrimary}>
                              Go to interfaces
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </ViewBar>

        {/* Left Sidebar - Navigation */}
        <nav ref={leftNavRef} className={styles.leftNav}>
          <LeftNavContent
            createViewButtonRef={createViewButtonRef}
            isCreateViewMenuOpen={isCreateViewMenuOpen}
            onToggleCreateViewMenu={() => setIsCreateViewMenuOpen((prev) => !prev)}
            createViewMenuRef={createViewMenuRef}
            createViewMenuPosition={createViewMenuPosition}
            handleCreateGridView={handleCreateGridView}
            activeTableId={activeTableId}
            handleCreateFormView={handleCreateFormView}
            isCreateViewDialogOpen={isCreateViewDialogOpen}
            createViewDialogRef={createViewDialogRef}
            createViewDialogPosition={createViewDialogPosition}
            createViewDialogInputRef={createViewDialogInputRef}
            createViewDialogName={createViewDialogName}
            setCreateViewDialogName={setCreateViewDialogName}
            handleCreateViewDialogSubmit={handleCreateViewDialogSubmit}
            handleCreateViewDialogCancel={handleCreateViewDialogCancel}
            favoriteViews={filteredFavoriteViews}
            orderedTableViews={filteredOrderedTableViews}
            resolveSidebarViewKind={resolveSidebarViewKind}
            activeView={activeView}
            sidebarViewContextMenu={sidebarViewContextMenu}
            sidebarContextView={sidebarContextView}
            sidebarContextViewKindLabel={sidebarContextViewKindLabel}
            draggingViewId={draggingViewId}
            viewDragOverId={viewDragOverId}
            viewDragOverSide={viewDragOverSide}
            selectView={selectView}
            openSidebarViewContextMenu={openSidebarViewContextMenu}
            handleViewDragOver={handleViewDragOver}
            handleViewDrop={handleViewDrop}
            handleViewListDrop={handleViewListDrop}
            armViewDragHandle={armViewDragHandle}
            handleViewDragStart={handleViewDragStart}
            handleViewDrag={handleViewDrag}
            handleViewDragEnd={handleViewDragEnd}
            toggleViewFavorite={toggleViewFavorite}
            setSidebarViewContextMenu={setSidebarViewContextMenu}
            favoriteViewIdSet={favoriteViewIdSet}
            activeTableBootstrapQuery={activeTableBootstrapQuery}
            tableViews={tableViews}
            sidebarViewContextMenuRef={sidebarViewContextMenuRef}
            handleRenameViewById={handleRenameViewById}
            handleDuplicateViewById={handleDuplicateViewById}
            handleDeleteViewById={handleDeleteViewById}
            isViewActionPending={isViewActionPending}
            viewSearchValue={viewSearch}
            onViewSearchChange={setViewSearch}
            hasViewSearch={hasViewSearch}
          />
          {isViewsSidebarOpen ? (
            <div
              className={`${styles.sidebarResizer} ${
                isResizingSidebar ? styles.sidebarResizerActive : ""
              }`}
              onMouseDown={(event) => {
                event.preventDefault();
                setIsResizingSidebar(true);
              }}
            />
          ) : null}
        </nav>

        {/* Main Content - TanStack Table */}
        <main className={styles.mainContent}>
          <div
            className={styles.tanstackTableContainer}
            ref={tableContainerRef}
            style={{
              ["--freeze-boundary-left" as string]: `${frozenBoundaryLeft}px`,
              ["--freeze-snap-left" as string]: `${frozenBoundaryLeft}px`,
              ["--freeze-hover-y" as string]: "50vh",
            }}
            data-freeze-dragging={isDraggingFreezeDivider ? "true" : undefined}
          >
            {visibleLeafColumns.length > 1 ? (
              <div
                className={`${styles.freezeDividerOverlay} ${
                  isDraggingFreezeDivider ? styles.freezeDividerOverlayDragging : ""
                }`}
              >
                <span className={styles.freezeDividerSnapLine} aria-hidden="true" />
                <span className={styles.freezeDividerLine} aria-hidden="true" />
                <div
                  className={styles.freezeDividerHitArea}
                  onPointerMove={(event) => {
                    updateFreezePreviewFromPointer(event.clientX, event.clientY);
                  }}
                  onPointerLeave={() => {
                    if (!isDraggingFreezeDivider) {
                      setFreezePreviewFrozenCount(null);
                    }
                  }}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    startFreezeDividerDrag(event.clientX, event.clientY);
                  }}
                  role="separator"
                  aria-label={freezeTooltipLabel}
                  aria-orientation="vertical"
                />
                <span className={styles.freezeDividerKnob} aria-hidden="true" />
                <div className={styles.freezeDividerTooltip} aria-hidden="true">
                  Freeze{" "}
                  <span className={styles.freezeDividerTooltipCount}>
                    {freezeTooltipFrozenCount}
                  </span>{" "}
                  column{freezeTooltipFrozenCount === 1 ? "" : "s"}
                </div>
              </div>
            ) : null}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={isRowDragEnabled ? rowIds : []}
                strategy={verticalListSortingStrategy}
              >
            <TanstackTable
              onDragOver={handleColumnHeaderDragOver}
              onDrop={handleColumnHeaderDrop}
              data-initial-loading={
                shouldHideTableChrome ? "true" : undefined
              }
              style={{ width: tableWidth }}
            >
              <thead className={styles.tanstackHeader}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className={styles.tanstackHeaderRow}>
                    {headerGroup.headers.map((header) => {
                      const isRowNumber = header.column.id === "rowNumber";
                      const headerColumnIndex = visibleLeafColumns.findIndex(
                        (column) => column.id === header.column.id,
                      );
                      const isFrozenDataColumn =
                        headerColumnIndex > 0 && headerColumnIndex <= frozenDataColumnCount;
                      const frozenHeaderLeft = isFrozenDataColumn
                        ? (frozenColumnLeftByIndex.get(headerColumnIndex) ?? ROW_NUMBER_COLUMN_WIDTH)
                        : null;
                      const isFreezeBoundaryColumn =
                        isFrozenDataColumn && headerColumnIndex === frozenDataColumnCount;
                      const headerField =
                        tableFields.find((field) => field.id === header.column.id) ?? null;
                      const headerDescription = headerField?.description?.trim() ?? "";
                      const canResize = header.column.getCanResize();
                      const isDraggableColumn = !isRowNumber;
                      const isDraggingColumnHeader = draggingColumnId === header.column.id;
                      const isDropAnchorColumnHeader = columnDropAnchorId === header.column.id;
                      const sortState = header.column.getIsSorted();
                      const isSortedColumnHeader =
                        isSortActive && (sortState === "asc" || sortState === "desc");
                      const isAllSelected = table.getIsAllRowsSelected();
                      const isSomeSelected = table.getIsSomeRowsSelected();
                      const isIndeterminate = isSomeSelected && !isAllSelected;

                      // Render row number header with select all checkbox
                      if (isRowNumber) {
                        return (
                          <th
                            key={header.id}
                            className={`${styles.tanstackHeaderCell} ${styles.tanstackRowNumberHeader}`}
                            style={{ width: header.getSize() }}
                          >
                            <div className={styles.selectAllContainer}>
                              <label
                                className={`${styles.rowCheckbox} ${
                                  isAllSelected || isIndeterminate ? styles.rowCheckboxSelected : ""
                                } ${isIndeterminate ? styles.selectAllCheckboxIndeterminate : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  className={styles.rowCheckboxInput}
                                  checked={isAllSelected}
                                  ref={(el) => {
                                    if (el) {
                                      el.indeterminate = isIndeterminate;
                                    }
                                  }}
                                  onChange={toggleAllRowsSelection}
                                  aria-label="Select all rows"
                                />
                                {isIndeterminate ? (
                                  <svg
                                    width="9"
                                    height="9"
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
                                    className={styles.rowCheckboxIcon}
                                    aria-hidden="true"
                                  >
                                    <path d="M3 8h10v1.5H3V8z" />
                                  </svg>
                                ) : (
                                  <svg
                                    width="9"
                                    height="9"
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
                                    className={styles.rowCheckboxIcon}
                                    aria-hidden="true"
                                  >
                                    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 111.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                                  </svg>
                                )}
                              </label>
                            </div>
                          </th>
                        );
                      }

                      return (
                        <th
                          key={header.id}
                          ref={(element) => registerColumnHeaderRef(header.column.id, element)}
                          className={`${styles.tanstackHeaderCell} ${
                            isDraggableColumn ? styles.tanstackHeaderCellDraggable : ""
                          } ${
                            isDraggingColumnHeader ? styles.tanstackHeaderCellDragging : ""
                          } ${isDropAnchorColumnHeader ? styles.tanstackHeaderCellDropAnchor : ""} ${
                            selectedHeaderColumnIndex === headerColumnIndex
                              ? styles.tanstackHeaderCellSelected
                              : ""
                          } ${
                            filteredColumnIdSet.has(header.column.id)
                              ? styles.tanstackHeaderCellFiltered
                              : ""
                          } ${isSortedColumnHeader ? styles.tanstackHeaderCellSorted : ""} ${
                            isFrozenDataColumn ? styles.tanstackFrozenHeaderCell : ""
                          } ${
                            isFreezeBoundaryColumn ? styles.tanstackFrozenBoundaryCell : ""
                          }`}
                          style={{
                            width: header.getSize(),
                            ...(frozenHeaderLeft !== null ? { left: frozenHeaderLeft } : {}),
                          }}
                          data-column-field-id={header.column.id}
                          draggable={isDraggableColumn}
                          onDragStart={
                            isDraggableColumn
                              ? (event) =>
                                  handleColumnHeaderDragStart(event, header.column.id)
                              : undefined
                          }
                          onDragEnd={isDraggableColumn ? handleColumnHeaderDragEnd : undefined}
                          onDragOver={isDraggableColumn ? handleColumnHeaderDragOver : undefined}
                          onDrop={isDraggableColumn ? handleColumnHeaderDrop : undefined}
                          onClick={() => {
                            if (isRowNumber || headerColumnIndex < 0 || isColumnDragging) return;
                            setSelectedHeaderColumnIndex(headerColumnIndex);
                            if (tableRows.length <= 0) return;
                            const topRowIndex = renderWindowStart;
                            const topRow = getRowAtIndex(topRowIndex);
                            const topCell = topRow
                              ?.getVisibleCells()
                              .find((cell) => cell.column.id === header.column.id);
                            const maxRowIndex = Math.max(
                              topRowIndex,
                              renderWindowStart + tableRows.length - 1,
                            );
                            setSelectionAnchor({
                              rowIndex: topRowIndex,
                              columnIndex: headerColumnIndex,
                            });
                            setSelectionRange({
                              minRowIndex: topRowIndex,
                              maxRowIndex,
                              minColumnIndex: headerColumnIndex,
                              maxColumnIndex: headerColumnIndex,
                            });
                            setActiveCellId(topCell?.id ?? null);
                            setActiveCellRowIndex(topRowIndex);
                            setActiveCellColumnIndex(headerColumnIndex);
                          }}
                          onDoubleClick={() => {
                            if (isRowNumber) return;
                            openEditFieldPopover(header.column.id);
                          }}
                          onContextMenu={(event) => openColumnFieldMenu(event, header.column.id)}
                          aria-sort={
                            sortState === "asc"
                              ? "ascending"
                              : sortState === "desc"
                                ? "descending"
                                : "none"
                          }
                        >
                          {header.isPlaceholder ? null : (
                            <div className={styles.tanstackHeaderContent}>
                              <span className={styles.tanstackHeaderLabel}>
                                {headerField ? (
                                  <>
                                    {headerField.kind === "singleLineText" ? (
                                      <span
                                        className={`${styles.headerGlyph} ${styles.headerGlyphText}`}
                                        aria-hidden
                                      />
                                    ) : headerField.kind === "number" ? (
                                      <span
                                        className={`${styles.headerGlyph} ${styles.headerGlyphNumber}`}
                                        aria-hidden
                                      />
                                    ) : null}
                                    <span>{headerField.label}</span>
                                  </>
                                ) : (
                                  flexRender(
                                    header.column.columnDef.header,
                                    header.getContext(),
                                  )
                                )}
                              </span>
                              {headerDescription ? (
                                <span
                                  className={styles.fieldDescriptionInfo}
                                  onMouseDown={(event) => event.stopPropagation()}
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <span
                                    className={styles.fieldDescriptionInfoIcon}
                                    aria-label="Field description"
                                  >
                                    i
                                  </span>
                                  <span className={styles.fieldDescriptionTooltip}>
                                    {headerDescription}
                                  </span>
                                </span>
                              ) : null}
                            </div>
                          )}
                          {canResize ? (
                            <div
                              className={`${styles.columnResizer} ${
                                header.column.getIsResizing() ? styles.columnResizerActive : ""
                              }`}
                              data-column-resizer="true"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                header.getResizeHandler()(event);
                              }}
                              onTouchStart={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                header.getResizeHandler()(event);
                              }}
                              onClick={(event) => event.stopPropagation()}
                              aria-hidden="true"
                            />
                          ) : null}
                        </th>
                      );
                    })}
                    <th className={styles.addColumnHeader}>
                      <button
                        ref={addColumnButtonRef}
                        type="button"
                        onClick={addColumn}
                        className={`${styles.addColumnButton} ${
                          isAddColumnMenuOpen ? styles.addColumnButtonActive : ""
                        }`}
                        aria-label="Add column"
                        aria-expanded={isAddColumnMenuOpen}
                        aria-controls="add-column-menu"
                      >
                        +
                      </button>
                      {isAddColumnMenuOpen ? (
                        <div
                          id="add-column-menu"
                          ref={addColumnMenuRef}
                          className={styles.addColumnMenu}
                          role="dialog"
                          aria-label="Create field"
                          style={addColumnMenuPosition}
                        >
                          <div className={styles.addColumnMenuBody}>
                            {selectedAddColumnConfig ? (
                              <div className={styles.addColumnConfig}>
                                <input
                                  type="text"
                                  className={styles.addColumnConfigFieldName}
                                  placeholder="Field name (optional)"
                                  value={addColumnFieldName}
                                  onChange={(event) => setAddColumnFieldName(event.target.value)}
                                />
                                <button
                                  type="button"
                                  className={styles.addColumnConfigTypeButton}
                                  onClick={() => setSelectedAddColumnKind(null)}
                                  aria-label="Choose field type"
                                >
                                  <span className={styles.addColumnConfigTypeIcon} aria-hidden="true">
                                    {renderAddColumnIcon(selectedAddColumnConfig.icon)}
                                  </span>
                                  <span className={styles.addColumnConfigTypeLabel}>
                                    {selectedAddColumnConfig.label}
                                  </span>
                                  <span className={styles.addColumnConfigTypeChevron} aria-hidden="true">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                      <path d="M4.8 6.3L8 9.5l3.2-3.2 1 1L8 11.5 3.8 7.3l1-1z" />
                                    </svg>
                                  </span>
                                </button>
                                <p className={styles.addColumnConfigHelper}>
                                  {selectedAddColumnConfig.helperText}
                                </p>
                                {selectedAddColumnKind === "number" ? (
                                  <>
                                    <p className={styles.addColumnConfigSectionTitle}>Formatting</p>
                                    <div className={styles.addColumnNumberField}>
                                      <label className={styles.addColumnNumberLabel}>Presets</label>
                                      <NumberConfigPicker
                                        value={numberPreset}
                                        options={NUMBER_PRESET_OPTIONS}
                                        onChange={(next) => setNumberPreset(next)}
                                      />
                                    </div>
                                    <div className={styles.addColumnNumberField}>
                                      <label className={styles.addColumnNumberLabel}>Decimal places</label>
                                      <NumberConfigPicker
                                        value={numberDecimalPlaces}
                                        options={NUMBER_DECIMAL_OPTIONS}
                                        onChange={(next) => {
                                          setNumberPreset("none");
                                          setNumberDecimalPlaces(next);
                                        }}
                                      />
                                    </div>
                                    <div className={styles.addColumnNumberField}>
                                      <label className={styles.addColumnNumberLabel}>
                                        Thousands and decimal separators
                                      </label>
                                      <NumberConfigPicker
                                        value={numberSeparators}
                                        options={NUMBER_SEPARATOR_OPTIONS}
                                        onChange={(next) => {
                                          setNumberPreset("none");
                                          setNumberSeparators(next);
                                        }}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      className={styles.addColumnNumberToggleRow}
                                      onClick={() =>
                                        setNumberShowThousandsSeparator((current) => {
                                          setNumberPreset("none");
                                          return !current;
                                        })
                                      }
                                    >
                                      <span
                                        className={`${styles.addColumnNumberToggle} ${
                                          numberShowThousandsSeparator
                                            ? styles.addColumnNumberToggleOn
                                            : ""
                                        }`}
                                        aria-hidden="true"
                                      >
                                        <span className={styles.addColumnNumberToggleKnob} />
                                      </span>
                                      <span>Show thousands separator</span>
                                    </button>
                                    <div className={styles.addColumnNumberField}>
                                      <label className={styles.addColumnNumberLabel}>
                                        Large number abbreviation
                                      </label>
                                      <NumberConfigPicker
                                        value={numberAbbreviation}
                                        options={NUMBER_ABBREVIATION_OPTIONS}
                                        onChange={(next) => {
                                          setNumberPreset("none");
                                          setNumberAbbreviation(next);
                                        }}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      className={styles.addColumnNumberToggleRow}
                                      onClick={() =>
                                        setNumberAllowNegative((current) => {
                                          setNumberPreset("none");
                                          return !current;
                                        })
                                      }
                                    >
                                      <span
                                        className={`${styles.addColumnNumberToggle} ${
                                          numberAllowNegative ? styles.addColumnNumberToggleOn : ""
                                        }`}
                                        aria-hidden="true"
                                      >
                                        <span className={styles.addColumnNumberToggleKnob} />
                                      </span>
                                      <span>Allow negative numbers</span>
                                    </button>
                                    <p className={styles.addColumnNumberExample}>
                                      Example: {numberFieldExample}
                                    </p>
                                    <div className={styles.addColumnNumberDivider} />
                                  </>
                                ) : null}
                                <p className={styles.addColumnConfigSectionTitle}>Default</p>
                                <input
                                  type={selectedAddColumnKind === "number" ? "number" : "text"}
                                  className={styles.addColumnConfigDefaultInput}
                                  placeholder={selectedAddColumnConfig.defaultPlaceholder}
                                  value={addColumnDefaultValue}
                                  step={
                                    selectedAddColumnKind === "number"
                                      ? numberDecimalPlaces === "0"
                                        ? "1"
                                        : `0.${"0".repeat(Math.max(0, clampNumberDecimals(numberDecimalPlaces) - 1))}1`
                                      : undefined
                                  }
                                  min={
                                    selectedAddColumnKind === "number" && !numberAllowNegative
                                      ? "0"
                                      : undefined
                                  }
                                  onChange={(event) => setAddColumnDefaultValue(event.target.value)}
                                />
                                {isAddColumnDescriptionOpen ? (
                                  <>
                                    <p className={styles.addColumnConfigSectionTitle}>Description</p>
                                    <input
                                      type="text"
                                      className={styles.addColumnConfigDefaultInput}
                                      placeholder="Describe this field (optional)"
                                      value={addColumnDescription}
                                      onChange={(event) =>
                                        setAddColumnDescription(event.target.value)
                                      }
                                    />
                                  </>
                                ) : null}
                                <div className={styles.addColumnConfigActions}>
                                  {!isAddColumnDescriptionOpen ? (
                                    <button
                                      type="button"
                                      className={styles.addColumnConfigAddDescription}
                                      onClick={() => setIsAddColumnDescriptionOpen(true)}
                                    >
                                      <span aria-hidden="true">+</span>
                                      <span>Add description</span>
                                    </button>
                                  ) : null}
                                  <button
                                    type="button"
                                    className={styles.addColumnConfigCancel}
                                    onClick={closeAddColumnMenu}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.addColumnConfigCreate}
                                    onClick={handleAddColumnCreate}
                                    disabled={createColumnMutation.isPending}
                                  >
                                    {createColumnMutation.isPending ? "Creating..." : "Create field"}
                                  </button>
                                </div>
                                <div className={`${styles.addColumnConfigFooter} ${styles.addColumnConfigFooterDisabled}`}>
                                  <div className={styles.addColumnConfigFooterLabel}>
                                    <span className={styles.addColumnConfigFooterAgentIcon} aria-hidden="true">
                                      {renderAddColumnIcon("agent")}
                                    </span>
                                    <span>Automate this field with an agent</span>
                                    <span className={styles.addColumnConfigFooterInfo} aria-hidden="true">
                                      i
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    className={styles.addColumnConfigConvert}
                                    disabled
                                  >
                                    Convert
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className={styles.addColumnMenuSticky}>
                                  <div className={styles.addColumnMenuSearchRow}>
                                    <div className={styles.addColumnMenuSearchBox}>
                                      <span className={styles.addColumnMenuSearchIcon} aria-hidden="true">
                                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                          <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z" />
                                        </svg>
                                      </span>
                                      <input
                                        type="text"
                                        className={styles.addColumnMenuSearchInput}
                                        placeholder="Find a field type"
                                        value={addColumnSearch}
                                        onChange={(event) => setAddColumnSearch(event.target.value)}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      className={styles.addColumnMenuHelp}
                                      aria-label="Learn more about field types"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                        <path d="M8 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zm0 2a1 1 0 00-.93.64.75.75 0 11-1.4-.55A2.5 2.5 0 018 2.75a2.5 2.5 0 011.66 4.38c-.56.5-.91.89-.91 1.62a.75.75 0 01-1.5 0c0-1.45.84-2.2 1.42-2.72A1 1 0 008 4.25zm0 6.25a.9.9 0 100 1.8.9.9 0 000-1.8z" />
                                      </svg>
                                    </button>
                                  </div>
                                  <div className={styles.addColumnMenuDivider} />
                                </div>
                                {filteredAddColumnAgents.length > 0 ? (
                                  <>
                                    <p className={styles.addColumnMenuSectionTitle}>Field agents</p>
                                    <div className={styles.addColumnMenuAgentsGrid}>
                                      {filteredAddColumnAgents.map((item) => (
                                        <button
                                          key={item.id}
                                          type="button"
                                          className={`${styles.addColumnMenuAgentItem} ${
                                            item.featured ? styles.addColumnMenuAgentItemFeatured : ""
                                          } ${
                                            isRestrictedAddColumnMode ? styles.addColumnMenuItemStruck : ""
                                          }`}
                                          onClick={() => {
                                            if (isRestrictedAddColumnMode) return;
                                            closeAddColumnMenu();
                                          }}
                                        >
                                          <span
                                            className={styles.addColumnMenuAgentIcon}
                                            style={
                                              isRestrictedAddColumnMode
                                                ? undefined
                                                : { color: item.color }
                                            }
                                            aria-hidden="true"
                                          >
                                            {renderAddColumnIcon(item.icon)}
                                          </span>
                                          <span className={styles.addColumnMenuAgentLabel}>{item.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                    <div className={styles.addColumnMenuDivider} />
                                  </>
                                ) : null}
                                {filteredAddColumnStandardFields.length > 0 ? (
                                  <>
                                    <p className={styles.addColumnMenuSectionTitle}>Standard fields</p>
                                    <div className={styles.addColumnMenuStandardList}>
                                      {filteredAddColumnStandardFields.map((item) => (
                                        <button
                                          key={item.id}
                                          type="button"
                                          className={`${styles.addColumnMenuStandardItem} ${
                                            isRestrictedAddColumnMode &&
                                            item.id !== "singleLineText" &&
                                            item.id !== "number"
                                              ? styles.addColumnMenuItemStruck
                                              : ""
                                          } ${
                                            (item.id === "singleLineText" || item.id === "number") &&
                                            selectedAddColumnKind === item.id
                                              ? styles.addColumnMenuStandardItemSelected
                                              : ""
                                          }`}
                                          onClick={() => {
                                            if (item.id === "singleLineText" || item.id === "number") {
                                              setSelectedAddColumnKind(item.id);
                                              return;
                                            }
                                            if (isRestrictedAddColumnMode) return;
                                            closeAddColumnMenu();
                                          }}
                                        >
                                          <span className={styles.addColumnMenuStandardIcon} aria-hidden="true">
                                            {renderAddColumnIcon(item.icon)}
                                          </span>
                                          <span className={styles.addColumnMenuStandardLabel}>{item.label}</span>
                                          {item.hasChevron ? (
                                            <span className={styles.addColumnMenuStandardChevron} aria-hidden="true">
                                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M6 3l5 5-5 5-1.1-1.1L8.8 8 4.9 4.1 6 3z" />
                                              </svg>
                                            </span>
                                          ) : null}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                ) : null}
                                {filteredAddColumnAgents.length === 0 &&
                                filteredAddColumnStandardFields.length === 0 ? (
                                  <p className={styles.addColumnMenuEmpty}>No matching field types</p>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </th>
                  </tr>
                ))}
              </thead>
              <tbody className={styles.tanstackBody}>
                {shouldRenderTableBody ? (
                  <Fragment>
                    {virtualPaddingTop > 0 ? (
                      <tr className={styles.tanstackVirtualSpacerRow} aria-hidden="true">
                        <td
                          colSpan={tableBodyColSpan}
                          className={styles.tanstackVirtualSpacerCell}
                          style={{ height: `${virtualPaddingTop}px` }}
                        />
                      </tr>
                    ) : null}
                    {virtualRows.map((virtualRow) => {
                      const rowIndex = virtualRow.index;
                      const row = getRowAtIndex(rowIndex);
                      const isQuickAddPlaceholderRow =
                        isFooterQuickAddActive && bottomQuickAddRowIndex === rowIndex;

                      // If row hasn't been loaded yet (scrollbar dragged beyond loaded data), show loading skeleton
                      if (!row || isPlaceholderRow(row.original)) {
                        const skeletonSpan = Math.max(1, tableBodyColSpan - 1);
                        if (isQuickAddPlaceholderRow) {
                          return null;
                        }
                        return (
                          <tr key={`loading-${rowIndex}`} className={styles.tanstackBodyRow}>
                            <td
                              colSpan={skeletonSpan}
                              className={
                                suppressLoadingRows
                                  ? styles.tanstackLoadingCellBlank
                                  : styles.tanstackLoadingCell
                              }
                            >
                              {suppressLoadingRows ? null : (
                                <div className={styles.loadingSkeletonCell} />
                              )}
                            </td>
                            <td className={styles.addColumnCell} aria-hidden="true" />
                          </tr>
                        );
                      }

                      const isRowSelected = row.getIsSelected();
                      const isRowActive = activeCellRowIndex === rowIndex;
                      const rowId = row.original.id;
                      const hasSearchMatchInRow = searchMatchRowIndexSet.has(rowIndex);

                      return (
                        <SortableTableRow
                          key={rowId}
                          rowId={rowId}
                          isRowSelected={isRowSelected}
                          isRowActive={isRowActive}
                          isDragEnabled={isRowDragEnabled}
                          hasSearchMatch={hasSearchMatchInRow}
                          onContextMenu={(event) => openRowContextMenu(event, rowId, rowIndex)}
                          rowRef={setRowElementRef(rowId)}
                        >
                          {(dragHandleProps) => (
                            <>
                              {row.getVisibleCells().map((cell, columnIndex) => {
                                const isRowNumber = cell.column.id === "rowNumber";
                                const isEditable = !isRowNumber;
                                const canActivate = !isRowNumber;
                                const isEditing =
                                  isEditable &&
                                  editingCell?.rowId === row.original.id &&
                                  editingCell.columnId === cell.column.id;
                                const isDraggingColumnCell = draggingColumnId === cell.column.id;
                                const isDropAnchorColumnCell = columnDropAnchorId === cell.column.id;
                                const isFilteredColumnCell = filteredColumnIdSet.has(cell.column.id);
                                const cellValue = cell.getValue();
                                const cellValueText =
                                  typeof cellValue === "string"
                                    ? cellValue
                                    : typeof cellValue === "number"
                                      ? String(cellValue)
                                      : "";
                                const cellDisplayText = getCellDisplayText(cellValue, cell.column.id);
                                const isSearchMatch =
                                  !isEditing &&
                                  isEditable &&
                                  normalizedSearchQuery.length > 0 &&
                                  cellDisplayText.toLowerCase().includes(normalizedSearchQuery);
                                const isActiveSearchMatch =
                                  isSearchMatch &&
                                  activeSearchMatch !== null &&
                                  activeSearchMatch.rowIndex === rowIndex &&
                                  activeSearchMatch.columnIndex === columnIndex;
                                const searchMatchClass = isActiveSearchMatch
                                  ? styles.tanstackCellSearchMatchActive
                                  : isSearchMatch
                                    ? styles.tanstackCellSearchMatch
                                    : "";
                                // Keep the dark-blue outline on the original anchor cell while
                                // shift-extending a range (active row/col tracks the moving edge).
                                const activeAnchor =
                                  selectionAnchor ??
                                  (activeCellRowIndex !== null && activeCellColumnIndex !== null
                                    ? {
                                        rowIndex: activeCellRowIndex,
                                        columnIndex: activeCellColumnIndex,
                                      }
                                    : null);
                                const isActive =
                                  activeAnchor !== null &&
                                  rowIndex === activeAnchor.rowIndex &&
                                  columnIndex === activeAnchor.columnIndex;

                                // Render row number cell with checkbox and drag handle
                                if (isRowNumber) {
                                  return (
                                    <SortableRowCell
                                      key={cell.id}
                                      cellId={cell.id}
                                      rowIndex={rowIndex}
                                      columnIndex={columnIndex}
                                      isRowSelected={isRowSelected}
                                      isDragEnabled={isRowDragEnabled}
                                      showDragHandle
                                      rowDisplayIndex={rowIndex + 1}
                                      registerCellRef={registerCellRef}
                                      toggleSelected={() => {
                                        clearSelection();
                                        row.toggleSelected();
                                      }}
                                      onExpandRow={() => {
                                        // TODO: implement row expansion modal
                                      }}
                                      cellWidth={cell.column.getSize()}
                                      dragHandleProps={dragHandleProps}
                                      onRowSelectDragStart={startRowSelectionDrag}
                                    />
                                  );
                                }

                                // Check selection state for this cell
                                const isFillPreview =
                                  fillDragRange !== null &&
                                  rowIndex >= fillDragRange.minRowIndex &&
                                  rowIndex <= fillDragRange.maxRowIndex &&
                                  columnIndex >= fillDragRange.minColumnIndex &&
                                  columnIndex <= fillDragRange.maxColumnIndex;
                                const isSelected = fillDragRange
                                  ? false
                                  : isCellInSelection(rowIndex, columnIndex);
                                const isSelTop = isSelectionEdge("top", rowIndex, columnIndex);
                                const isSelBottom = isSelectionEdge("bottom", rowIndex, columnIndex);
                                const isSelLeft = isSelectionEdge("left", rowIndex, columnIndex);
                                const isSelRight = isSelectionEdge("right", rowIndex, columnIndex);
                                const isCut = isCellInCutRange(rowIndex, columnIndex);
                                const isFillHandleCell =
                                  fillHandlePosition !== null &&
                                  rowIndex === fillHandlePosition.rowIndex &&
                                  columnIndex === fillHandlePosition.columnIndex;
                                const isFrozenDataColumn =
                                  columnIndex > 0 && columnIndex <= frozenDataColumnCount;
                                const frozenCellLeft = isFrozenDataColumn
                                  ? (frozenColumnLeftByIndex.get(columnIndex) ?? ROW_NUMBER_COLUMN_WIDTH)
                                  : null;
                                const isFreezeBoundaryColumn =
                                  isFrozenDataColumn && columnIndex === frozenDataColumnCount;
                                const isFirstUnfrozenColumn = columnIndex === frozenDataColumnCount + 1;
                                const isSortedColumnCell = sortedColumnIdSet.has(cell.column.id);
                                const renderedCellValue = flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                );
                                const highlightedCellValue =
                                  isSearchMatch &&
                                  (typeof renderedCellValue === "string" ||
                                    typeof renderedCellValue === "number")
                                    ? renderSearchHighlightedText(
                                        String(renderedCellValue),
                                        normalizedSearchQuery,
                                        isActiveSearchMatch,
                                      )
                                    : renderedCellValue;

                                return (
                                  <td
                                    key={cell.id}
                                    className={`${styles.tanstackCell} ${
                                      isEditing ? styles.tanstackCellEditing : ""
                                    } ${searchMatchClass} ${
                                      isDraggingColumnCell ? styles.tanstackCellDragging : ""
                                    } ${isDropAnchorColumnCell ? styles.tanstackCellDropAnchor : ""} ${
                                      isFilteredColumnCell ? styles.tanstackCellFiltered : ""
                                    } ${isSortedColumnCell ? styles.tanstackCellSorted : ""} ${
                                      isFrozenDataColumn ? styles.tanstackFrozenCell : ""
                                    } ${
                                      isFreezeBoundaryColumn ? styles.tanstackFrozenBoundaryCell : ""
                                    } ${
                                      isFirstUnfrozenColumn ? styles.tanstackFirstUnfrozenCell : ""
                                    }`}
                                    data-active={isActive ? "true" : undefined}
                                    data-selected={isSelected ? "true" : undefined}
                                    data-selection-top={isSelTop ? "true" : undefined}
                                    data-selection-bottom={isSelBottom ? "true" : undefined}
                                    data-selection-left={isSelLeft ? "true" : undefined}
                                    data-selection-right={isSelRight ? "true" : undefined}
                                    data-cut={isCut ? "true" : undefined}
                                    data-fill-preview={isFillPreview ? "true" : undefined}
                                    data-fill-handle={isFillHandleCell ? "true" : undefined}
                                    data-cell="true"
                                    data-row-index={rowIndex}
                                    data-column-index={columnIndex}
                                    style={{
                                      width: cell.column.getSize(),
                                      ...(frozenCellLeft !== null ? { left: frozenCellLeft } : {}),
                                    }}
                                    ref={(el) => registerCellRef(rowIndex, columnIndex, el)}
                                    onMouseDown={(event) => {
                                      if (!canActivate) return;
                                      suppressFocusSelectionRef.current = event.shiftKey;
                                    }}
                                    onClick={(event) => {
                                      if (!canActivate) return;
                                      if (table.getIsSomeRowsSelected() || table.getIsAllRowsSelected()) {
                                        setRowSelection({});
                                      }
                                      if (
                                        event.shiftKey &&
                                        activeCellRowIndex !== null &&
                                        activeCellColumnIndex !== null
                                      ) {
                                        // Shift+Click: Extend selection
                                        extendSelection(rowIndex, columnIndex);
                                      } else {
                                        // Regular click: Start new selection
                                        startSelection(cell.id, rowIndex, columnIndex);
                                      }
                                      suppressFocusSelectionRef.current = false;
                                    }}
                                    onFocus={() => {
                                      if (!canActivate) return;
                                      if (suppressFocusSelectionRef.current) return;
                                      startSelection(cell.id, rowIndex, columnIndex);
                                    }}
                                    onDoubleClick={() => {
                                      if (!isEditable) return;
                                      startEditing(
                                        rowIndex,
                                        row.original.id,
                                        cell.column.id,
                                        cellValueText,
                                      );
                                    }}
                                    tabIndex={0}
                                  >
                                    {isEditing ? (
                                      <input
                                        ref={editingInputRef}
                                        className={styles.tanstackCellEditor}
                                        defaultValue={editingValue}
                                        onChange={(event) =>
                                          handleEditingValueChange(event.target.value)
                                        }
                                        onBlur={commitEdit}
                                        onClick={(event) => event.stopPropagation()}
                                        onKeyDown={(event) => {
                                          if (event.key === "Enter" && event.shiftKey) {
                                            event.preventDefault();
                                            commitEdit();
                                            if (editingCell?.rowId === bottomQuickAddRowId) {
                                              addRow({ scrollAlign: "end" });
                                            } else {
                                              const insertedRowIndex = Math.min(
                                                activeTableTotalRows,
                                                rowIndex + 1,
                                              );
                                        handleInsertRowBelow(
                                          rowIndex,
                                          row.original.id,
                                          columnIndex,
                                          "center",
                                        );
                                              setActiveCellId(null);
                                              setActiveCellRowIndex(insertedRowIndex);
                                              setActiveCellColumnIndex(columnIndex);
                                              setSelectedHeaderColumnIndex(null);
                                              setSelectionAnchor({
                                                rowIndex: insertedRowIndex,
                                                columnIndex,
                                              });
                                              setSelectionFocus({
                                                rowIndex: insertedRowIndex,
                                                columnIndex,
                                              });
                                              setSelectionRange(null);
                                        pendingScrollToCellRef.current = {
                                          rowIndex: insertedRowIndex,
                                          columnIndex,
                                          align: "center",
                                        };
                                              startActiveCellFollow(insertedRowIndex, columnIndex);
                                            }
                                            return;
                                          }
                                          if (event.key === "Enter") {
                                            event.preventDefault();
                                            commitEdit();
                                          }
                                          if (event.key === "Escape") {
                                            event.preventDefault();
                                            cancelEdit();
                                          }
                                        }}
                                        autoFocus
                                      />
                                    ) : (
                                      <span
                                        className={
                                          isActive
                                            ? styles.tanstackCellActiveValue
                                            : styles.tanstackCellValue
                                        }
                                      >
                                        {highlightedCellValue}
                                      </span>
                                    )}
                                    {isFillHandleCell && !isEditing ? (
                                      <button
                                        type="button"
                                        className={styles.selectionFillHandle}
                                        aria-label="Drag to extend selection"
                                        onMouseDown={(event) =>
                                          handleFillHandleMouseDown(event, rowIndex, columnIndex)
                                        }
                                        onClick={(event) => {
                                          event.preventDefault();
                                          event.stopPropagation();
                                        }}
                                        tabIndex={-1}
                                      />
                                    ) : null}
                                  </td>
                                );
                              })}
                              <td className={styles.addColumnCell} aria-hidden="true"></td>
                            </>
                          )}
                        </SortableTableRow>
                      );
                    })}
                {virtualPaddingBottom > 0 ? (
                  <tr className={styles.tanstackVirtualSpacerRow} aria-hidden="true">
                    <td
                      colSpan={tableBodyColSpan}
                      className={styles.tanstackVirtualSpacerCell}
                      style={{ height: `${virtualPaddingBottom}px` }}
                    />
                  </tr>
                ) : null}
                <tr
                  className={styles.tanstackAddRowContainer}
                  role="button"
                  tabIndex={0}
                  onClick={() => addRow()}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      addRow();
                    }
                  }}
                >
                  <td className={`${styles.tanstackRowNumberCell} ${styles.addRowFirstCell}`}>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        addRow();
                      }}
                      className={styles.addRowPlusButton}
                      aria-label="Add row"
                    >
                      <span className={styles.tableBottomPlusIcon} aria-hidden="true">
                        <Image
                          src="/SVG/Asset%20127Airtable.svg"
                          alt=""
                          width={14}
                          height={14}
                          aria-hidden="true"
                        />
                      </span>
                    </button>
                  </td>
                  {visibleLeafColumns.length > 1 ? (
                    <td
                      colSpan={visibleLeafColumns.length - 1}
                      className={styles.addRowFillCell}
                      aria-hidden="true"
                    />
                  ) : null}
                  <td className={styles.addColumnCellAddRow}></td>
                </tr>
                {null}
                  </Fragment>
                ) : null}
              </tbody>
            </TanstackTable>
            {isColumnFieldMenuOpen && columnFieldMenuField ? (
              <div
                ref={columnFieldMenuRef}
                className={styles.fieldContextMenu}
                role="menu"
                aria-label={`Field options for ${columnFieldMenuField.label}`}
                style={columnFieldMenuPosition}
              >
                <div className={styles.fieldContextMenuSection}>
                  <button
                    type="button"
                    className={styles.fieldContextMenuItem}
                    onClick={() => openEditFieldPopover(columnFieldMenuField.id)}
                    disabled={isColumnFieldActionPending}
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("edit")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Edit field</span>
                  </button>
                  <button
                    type="button"
                    className={styles.fieldContextMenuItem}
                    onClick={() => {
                      void handleDuplicateColumnField();
                    }}
                    disabled={isColumnFieldActionPending}
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("duplicate")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Duplicate field</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.fieldContextMenuItem} ${
                      isColumnFieldPrimary ? styles.fieldContextMenuItemDisabled : ""
                    }`}
                    onClick={() => {
                      void handleInsertColumnField("left");
                    }}
                    disabled={isColumnFieldPrimary || isColumnFieldActionPending}
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("insertLeft")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Insert left</span>
                  </button>
                  <button
                    type="button"
                    className={styles.fieldContextMenuItem}
                    onClick={() => {
                      void handleInsertColumnField("right");
                    }}
                    disabled={isColumnFieldActionPending}
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("insertRight")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Insert right</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.fieldContextMenuItem} ${styles.fieldContextMenuItemDisabled}`}
                    onClick={closeColumnFieldMenu}
                    disabled
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("primary")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Change primary field</span>
                  </button>
                </div>
                <div className={styles.fieldContextMenuDivider} />
                <div className={styles.fieldContextMenuSection}>
                  <button
                    type="button"
                    className={`${styles.fieldContextMenuItem} ${styles.fieldContextMenuItemDisabled}`}
                    onClick={closeColumnFieldMenu}
                    disabled
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("copyUrl")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Copy field URL</span>
                  </button>
                  <button
                    type="button"
                    className={styles.fieldContextMenuItem}
                    onClick={() => {
                      if (!columnFieldMenuField) return;
                      openFilterMenuForField(columnFieldMenuField.id);
                      closeColumnFieldMenu();
                    }}
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("description")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Edit field description</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.fieldContextMenuItem} ${styles.fieldContextMenuItemDisabled}`}
                    onClick={closeColumnFieldMenu}
                    disabled
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("permissions")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Edit field permissions</span>
                  </button>
                </div>
                <div className={styles.fieldContextMenuDivider} />
                <div className={styles.fieldContextMenuSection}>
                  <button
                    type="button"
                    className={`${styles.fieldContextMenuItem} ${
                      columnFieldSortState === "asc" ? styles.fieldContextMenuItemActive : ""
                    }`}
                    onClick={() => handleColumnFieldSort(false)}
                    disabled={isColumnFieldActionPending}
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("sortAsc")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Sort A → Z</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.fieldContextMenuItem} ${
                      columnFieldSortState === "desc" ? styles.fieldContextMenuItemActive : ""
                    }`}
                    onClick={() => handleColumnFieldSort(true)}
                    disabled={isColumnFieldActionPending}
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("sortDesc")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Sort Z → A</span>
                  </button>
                </div>
                <div className={styles.fieldContextMenuDivider} />
                <div className={styles.fieldContextMenuSection}>
                  <button
                    type="button"
                    className={styles.fieldContextMenuItem}
                    onClick={() => {
                      if (!columnFieldMenuField) return;
                      openFilterMenuForField(columnFieldMenuField.id);
                      closeColumnFieldMenu();
                    }}
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("filter")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Filter by this field</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.fieldContextMenuItem} ${styles.fieldContextMenuItemDisabled}`}
                    onClick={closeColumnFieldMenu}
                    disabled
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("group")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Group by this field</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.fieldContextMenuItem} ${styles.fieldContextMenuItemDisabled}`}
                    onClick={closeColumnFieldMenu}
                    disabled
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("dependencies")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Show dependencies</span>
                  </button>
                </div>
                <div className={styles.fieldContextMenuDivider} />
                <div className={styles.fieldContextMenuSection}>
                  <button
                    type="button"
                    className={`${styles.fieldContextMenuItem} ${
                      isColumnFieldPrimary ? styles.fieldContextMenuItemDisabled : ""
                    }`}
                    onClick={handleHideColumnField}
                    disabled={isColumnFieldPrimary || isColumnFieldActionPending}
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("hide")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Hide field</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.fieldContextMenuItem} ${styles.fieldContextMenuItemDestructive} ${
                      isColumnFieldPrimary || tableFields.length <= 1
                        ? styles.fieldContextMenuItemDisabled
                        : ""
                    }`}
                    onClick={() => {
                      void handleDeleteColumnField();
                    }}
                    disabled={
                      isColumnFieldPrimary ||
                      tableFields.length <= 1 ||
                      isColumnFieldActionPending
                    }
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("delete")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Delete field</span>
                  </button>
                </div>
              </div>
            ) : null}
            <RowContextMenu
              state={rowContextMenu}
              menuRef={rowContextMenuRef}
              onInsertAbove={() => {
                if (!rowContextMenu) return;
                insertRowRelative({
                  anchorRowId: rowContextMenu.rowId,
                  anchorRowIndex: rowContextMenu.rowIndex,
                  position: "above",
                });
                closeRowContextMenu();
              }}
              onInsertBelow={() => {
                if (!rowContextMenu) return;
                insertRowRelative({
                  anchorRowId: rowContextMenu.rowId,
                  anchorRowIndex: rowContextMenu.rowIndex,
                  position: "below",
                });
                closeRowContextMenu();
              }}
              onDuplicate={() => {
                if (!rowContextMenu) return;
                const sourceRow = activeTable?.data.find(
                  (row) => row?.id === rowContextMenu.rowId,
                );
                const overrideCells: Record<string, string> = {};
                (activeTable?.fields ?? []).forEach((field) => {
                  const value = sourceRow?.[field.id];
                  overrideCells[field.id] =
                    typeof value === "string" ? value : field.defaultValue ?? "";
                });
                insertRowRelative({
                  anchorRowId: rowContextMenu.rowId,
                  anchorRowIndex: rowContextMenu.rowIndex,
                  position: "below",
                  overrideCells,
                });
                closeRowContextMenu();
              }}
              onDelete={() => {
                if (!rowContextMenu) return;
                void handleDeleteRow(rowContextMenu.rowId);
                closeRowContextMenu();
              }}
            />
            {isEditFieldPopoverOpen && editFieldId ? (
              <div
                ref={editFieldPopoverRef}
                className={styles.editFieldPopover}
                role="dialog"
                aria-label="Edit field"
                style={editFieldPopoverPosition}
              >
                <form
                  className={styles.editFieldPopoverBody}
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleEditFieldSave();
                  }}
                >
                  <input
                    ref={editFieldNameInputRef}
                    type="text"
                    className={styles.editFieldNameInput}
                    value={editFieldName}
                    onChange={(event) => setEditFieldName(event.target.value)}
                    placeholder="Field name"
                  />
                  <button
                    type="button"
                    className={styles.addColumnConfigTypeButton}
                    aria-label="Choose field type"
                  >
                    <span className={styles.addColumnConfigTypeIcon} aria-hidden="true">
                      {renderAddColumnIcon(editFieldKind === "number" ? "number" : "text")}
                    </span>
                    <span className={styles.addColumnConfigTypeLabel}>
                      {editFieldKind === "number" ? "Number" : "Single line text"}
                    </span>
                    <span className={styles.addColumnConfigTypeChevron} aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4.8 6.3L8 9.5l3.2-3.2 1 1L8 11.5 3.8 7.3l1-1z" />
                      </svg>
                    </span>
                  </button>
                  {editFieldKind === "number" ? (
                    <>
                      <p className={styles.addColumnConfigHelper}>
                        Enter a number, or prefill each new cell with a default value.
                      </p>
                      <p className={styles.addColumnConfigSectionTitle}>Formatting</p>
                      <div className={styles.addColumnNumberField}>
                        <label className={styles.addColumnNumberLabel}>Presets</label>
                        <NumberConfigPicker
                          value={editNumberPreset}
                          options={NUMBER_PRESET_OPTIONS}
                          onChange={(next) => setEditNumberPreset(next)}
                        />
                      </div>
                      <div className={styles.addColumnNumberField}>
                        <label className={styles.addColumnNumberLabel}>Decimal places</label>
                        <NumberConfigPicker
                          value={editNumberDecimalPlaces}
                          options={NUMBER_DECIMAL_OPTIONS}
                          onChange={(next) => {
                            setEditNumberPreset("none");
                            setEditNumberDecimalPlaces(next);
                          }}
                        />
                      </div>
                      <div className={styles.addColumnNumberField}>
                        <label className={styles.addColumnNumberLabel}>
                          Thousands and decimal separators
                        </label>
                        <NumberConfigPicker
                          value={editNumberSeparators}
                          options={NUMBER_SEPARATOR_OPTIONS}
                          onChange={(next) => {
                            setEditNumberPreset("none");
                            setEditNumberSeparators(next);
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        className={styles.addColumnNumberToggleRow}
                        onClick={() =>
                          setEditNumberShowThousandsSeparator((current) => {
                            setEditNumberPreset("none");
                            return !current;
                          })
                        }
                      >
                        <span
                          className={`${styles.addColumnNumberToggle} ${
                            editNumberShowThousandsSeparator ? styles.addColumnNumberToggleOn : ""
                          }`}
                          aria-hidden="true"
                        >
                          <span className={styles.addColumnNumberToggleKnob} />
                        </span>
                        <span>Show thousands separator</span>
                      </button>
                      <div className={styles.addColumnNumberField}>
                        <label className={styles.addColumnNumberLabel}>Large number abbreviation</label>
                        <NumberConfigPicker
                          value={editNumberAbbreviation}
                          options={NUMBER_ABBREVIATION_OPTIONS}
                          onChange={(next) => {
                            setEditNumberPreset("none");
                            setEditNumberAbbreviation(next);
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        className={styles.addColumnNumberToggleRow}
                        onClick={() =>
                          setEditNumberAllowNegative((current) => {
                            setEditNumberPreset("none");
                            return !current;
                          })
                        }
                      >
                        <span
                          className={`${styles.addColumnNumberToggle} ${
                            editNumberAllowNegative ? styles.addColumnNumberToggleOn : ""
                          }`}
                          aria-hidden="true"
                        >
                          <span className={styles.addColumnNumberToggleKnob} />
                        </span>
                        <span>Allow negative numbers</span>
                      </button>
                      <p className={styles.addColumnNumberExample}>
                        Example: {editNumberFieldExample}
                      </p>
                      <div className={styles.addColumnNumberDivider} />
                    </>
                  ) : (
                    <p className={styles.addColumnConfigHelper}>
                      Enter text.
                    </p>
                  )}
                  {editFieldKind === "number" ? (
                    <>
                      <p className={styles.addColumnConfigSectionTitle}>Default</p>
                      <input
                        type="number"
                        className={styles.addColumnConfigDefaultInput}
                        placeholder="Enter default number (optional)"
                        value={editFieldDefaultValue}
                        step={
                          editNumberDecimalPlaces === "0"
                            ? "1"
                            : `0.${"0".repeat(
                                Math.max(0, clampNumberDecimals(editNumberDecimalPlaces) - 1),
                              )}1`
                        }
                        min={!editNumberAllowNegative ? "0" : undefined}
                        onChange={(event) => setEditFieldDefaultValue(event.target.value)}
                      />
                    </>
                  ) : null}
                  {isEditFieldDescriptionOpen ? (
                    <>
                      <p className={styles.addColumnConfigSectionTitle}>Description</p>
                      <input
                        type="text"
                        className={styles.addColumnConfigDefaultInput}
                        value={editFieldDescription}
                        onChange={(event) => setEditFieldDescription(event.target.value)}
                        placeholder="Describe this field (optional)"
                      />
                    </>
                  ) : null}
                  <div className={styles.editFieldActions}>
                    <button
                      type="button"
                      className={styles.editFieldAddDescription}
                      onClick={() =>
                        setIsEditFieldDescriptionOpen((current) => !current)
                      }
                    >
                      <span aria-hidden="true">+</span>
                      <span>
                        {isEditFieldDescriptionOpen ? "Hide description" : "Add description"}
                      </span>
                    </button>
                    <button
                      type="button"
                      className={styles.editFieldCancel}
                      onClick={closeEditFieldPopover}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={styles.editFieldSave}
                      disabled={updateColumnMutation.isPending}
                    >
                      Save
                    </button>
                  </div>
                  {editFieldKind === "number" ? (
                    <div className={`${styles.addColumnConfigFooter} ${styles.addColumnConfigFooterDisabled}`}>
                      <div className={styles.addColumnConfigFooterLabel}>
                        <span className={styles.addColumnConfigFooterAgentIcon} aria-hidden="true">
                          {renderAddColumnIcon("agent")}
                        </span>
                        <span>Automate this field with an agent</span>
                        <span className={styles.addColumnConfigFooterInfo} aria-hidden="true">
                          i
                        </span>
                      </div>
                      <button type="button" className={styles.addColumnConfigConvert} disabled>
                        Convert
                      </button>
                    </div>
                  ) : null}
                </form>
              </div>
            ) : null}
              </SortableContext>
              <DragOverlay>
                {activeRowId ? (
                  <div className={styles.dragOverlay}>
                    <div className={styles.dragOverlayContent}>
                      {(() => {
                        const activeRow = data.find((row) => row?.id === activeRowId);
                        if (!activeRow) return null;
                        return tableFields.map((field) => {
                          const value = activeRow[field.id];
                          const displayValue =
                            value !== null && value !== undefined && value !== ""
                              ? String(value)
                              : "\u2014";
                          return (
                            <div key={field.id} className={styles.dragOverlayCell}>
                              <span className={styles.dragOverlayCellLabel}>{field.label}</span>
                              <span className={styles.dragOverlayCellValue}>{displayValue}</span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
          <div className={styles.tableBottomControls}>
            {!isBottomQuickAddOpen ? (
              <div className={styles.tableBottomActions}>
                <div className={styles.tableBottomAddGroup}>
                  <button
                    type="button"
                    className={styles.tableBottomPlusButton}
                    ref={bottomAddRecordPlusButtonRef}
                    onClick={() => {
                      setIsBottomAddRecordMenuOpen(true);
                      setIsDebugAddRowsOpen(false);
                    }}
                    aria-label="Add record"
                  >
                    <span className={styles.tableBottomPlusIcon} aria-hidden="true">
                      <Image
                        src="/SVG/Asset%20127Airtable.svg"
                        alt=""
                        width={14}
                        height={14}
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                  <button
                    ref={bottomAddRecordButtonRef}
                    type="button"
                    className={styles.tableBottomAddButton}
                    aria-expanded={isBottomAddRecordMenuOpen}
                    aria-controls="bottom-add-record-menu"
                    onClick={() => {
                      setIsDebugAddRowsOpen(false);
                      setIsBottomAddRecordMenuOpen((prev) => !prev);
                    }}
                  >
                    <span className={styles.tableBottomAddButtonIcon} aria-hidden="true">
                      <Image
                        src="/SVG/Asset%20177Airtable.svg"
                        alt=""
                        width={14}
                        height={14}
                        aria-hidden="true"
                      />
                    </span>
                    <span className={styles.tableBottomAddButtonLabel}>Add...</span>
                  </button>
                  {isBottomAddRecordMenuOpen ? (
                    <div
                      id="bottom-add-record-menu"
                      ref={bottomAddRecordMenuRef}
                      className={styles.tableBottomAddMenu}
                      role="menu"
                    >
                      <button
                        type="button"
                        className={styles.tableBottomAddMenuItem}
                        onClick={() => {
                          const newRowId = addRow({
                            scrollToTableBottomIfNeeded: true,
                          });
                          if (newRowId) {
                            setBottomQuickAddRowId(newRowId);
                            setIsBottomQuickAddOpen(true);
                          }
                          setIsBottomAddRecordMenuOpen(false);
                        }}
                      >
                        <span
                          className={`${styles.tableBottomAddMenuItemIcon} ${styles.tableBottomAddMenuItemIconAdd}`}
                          aria-hidden="true"
                        >
                          <Image
                            src="/SVG/Asset%20127Airtable.svg"
                            alt=""
                            width={14}
                            height={14}
                            aria-hidden="true"
                          />
                        </span>
                        <span
                          className={`${styles.tableBottomAddMenuItemLabel} ${styles.tableBottomAddMenuItemLabelAdd}`}
                        >
                          Add a record
                        </span>
                      </button>
                      <button
                        type="button"
                        className={`${styles.tableBottomAddMenuItem} ${styles.tableBottomAddMenuItemDisabled}`}
                        disabled
                      >
                        <span
                          className={`${styles.tableBottomAddMenuItemIcon} ${styles.tableBottomAddMenuItemIconCreate}`}
                          aria-hidden="true"
                        >
                          <Image
                            src="/SVG/Asset%20444Airtable.svg"
                            alt=""
                            width={14}
                            height={14}
                            aria-hidden="true"
                          />
                        </span>
                        <span
                          className={`${styles.tableBottomAddMenuItemLabel} ${styles.tableBottomAddMenuItemLabelCreate}`}
                        >
                          Create records from attachments
                        </span>
                      </button>
                    </div>
                  ) : null}
                </div>
                <button
                  ref={debugAddRowsButtonRef}
                  type="button"
                  className={styles.tableBottomDebugButton}
                  disabled={isAddingHundredThousandRows || createRowsGeneratedMutation.isPending}
                  onClick={() => {
                    setIsBottomAddRecordMenuOpen(false);
                    setIsDebugAddRowsOpen((prev) => !prev);
                  }}
                  style={{ display: "none" }}
                >
                  Debug
                </button>
                <button
                  type="button"
                  className={styles.tableBottomBulkButton}
                  onClick={handleAddOneHundredThousandRows}
                  disabled={isAddingHundredThousandRows || createRowsGeneratedMutation.isPending}
                >
                  {isAddingHundredThousandRows || createRowsGeneratedMutation.isPending
                    ? "Adding 100k..."
                    : "Add 100k rows"}
                </button>
                {isDebugAddRowsOpen ? (
                  <form
                    ref={debugAddRowsPopoverRef}
                    className={styles.tableBottomDebugPopover}
                    onSubmit={handleDebugAddRowsSubmit}
                  >
                    <label className={styles.tableBottomDebugLabel} htmlFor="debug-add-rows-input">
                      Add rows
                    </label>
                    <input
                      id="debug-add-rows-input"
                      type="number"
                      min={1}
                      max={DEBUG_MAX_ROWS_PER_ADD}
                      step={1}
                      className={styles.tableBottomDebugInput}
                      value={debugAddRowsCount}
                      onChange={(event) => setDebugAddRowsCount(event.target.value)}
                    />
                    <button type="submit" className={styles.tableBottomDebugSubmit}>
                      Add
                    </button>
                  </form>
                ) : null}
              </div>
            ) : (
              <div className={styles.tableBottomQuickAddRow}>
                <div
                  className={`${styles.tableBottomQuickAddRowInner} ${
                    bottomQuickAddRowIndex >= 0 &&
                    activeCellRowIndex === bottomQuickAddRowIndex
                      ? styles.tableBottomQuickAddRowInnerActive
                      : ""
                  }`}
                >
                  <div
                    className={styles.tableBottomQuickAddRowNumberCell}
                    style={{ width: visibleLeafColumns[0]?.getSize() ?? 84 }}
                  >
                    <div className={styles.rowNumberContent}>
                      <div className={styles.rowNumberBox}>
                        <button
                          type="button"
                          className={styles.dragHandle}
                          aria-label="Drag to reorder row"
                          disabled
                        >
                          <svg width="12" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <circle cx="5" cy="3" r="1.5" />
                            <circle cx="11" cy="3" r="1.5" />
                            <circle cx="5" cy="8" r="1.5" />
                            <circle cx="11" cy="8" r="1.5" />
                            <circle cx="5" cy="13" r="1.5" />
                            <circle cx="11" cy="13" r="1.5" />
                          </svg>
                        </button>
                        <span className={`${styles.rowNumberText} ${styles.rowNumberHidden}`}>
                          0
                        </span>
                        <label className={styles.rowCheckbox} aria-label="Select row">
                          <input
                            type="checkbox"
                            className={styles.rowCheckboxInput}
                            checked={false}
                            onChange={() => {
                              const rowId = bottomQuickAddRowId;
                              setIsBottomQuickAddOpen(false);
                              setBottomQuickAddRowId(null);
                              if (rowId) {
                                setRowSelection((prev) => ({ ...prev, [rowId]: true }));
                                setActiveRowId(rowId);
                              }
                            }}
                            onClick={(event) => event.stopPropagation()}
                            aria-label="Select row"
                          />
                          <svg
                            width="9"
                            height="9"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            className={styles.rowCheckboxIcon}
                            aria-hidden="true"
                          >
                            <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 111.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
                          </svg>
                        </label>
                      </div>
                      <div className={styles.expandButtonContainer}>
                        <button
                          type="button"
                          className={styles.expandRowButton}
                          onClick={(event) => event.stopPropagation()}
                          aria-label="Expand row"
                        >
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M9.5 2.75a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0V4.06l-2.72 2.72a.75.75 0 01-1.06-1.06L11.44 3H10.25a.75.75 0 01-.75-.75zM6.5 13.25a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-3a.75.75 0 011.5 0v1.69l2.72-2.72a.75.75 0 111.06 1.06L4.56 13h1.19a.75.75 0 01.75.75z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  {visibleLeafColumns.map((column, columnIndex) => {
                    if (column.id === "rowNumber") return null;
                    const cellValue =
                      bottomQuickAddRow && column.id in bottomQuickAddRow
                        ? String(bottomQuickAddRow[column.id] ?? "")
                        : "";
                    const isEditingQuickAdd =
                      editingCell?.rowId === bottomQuickAddRow?.id &&
                      editingCell?.columnId === column.id;
                    const isActiveQuickAdd =
                      bottomQuickAddRowIndex >= 0 &&
                      activeCellRowIndex === bottomQuickAddRowIndex &&
                      activeCellColumnIndex === columnIndex;
                    return (
                      <div
                        key={column.id}
                        className={`${styles.tableBottomQuickAddCell} ${
                          isEditingQuickAdd || isActiveQuickAdd
                            ? styles.tableBottomQuickAddCellActive
                            : ""
                        }`}
                        style={{
                          width: column.getSize(),
                          background: isActiveQuickAdd ? "#ffffff" : undefined,
                        }}
                        onClick={() => {
                          if (!bottomQuickAddRow || bottomQuickAddRowIndex < 0) return;
                          clearGridSelectionState();
                          startEditing(
                            bottomQuickAddRowIndex,
                            bottomQuickAddRow.id,
                            column.id,
                            cellValue,
                          );
                          setActiveCellRowIndex(bottomQuickAddRowIndex);
                          setActiveCellColumnIndex(columnIndex);
                          setSelectedHeaderColumnIndex(null);
                          setSelectionAnchor({
                            rowIndex: bottomQuickAddRowIndex,
                            columnIndex,
                          });
                          setSelectionFocus({
                            rowIndex: bottomQuickAddRowIndex,
                            columnIndex,
                          });
                        }}
                      >
                        {isEditingQuickAdd ? (
                          <input
                            ref={editingInputRef}
                            className={styles.tableBottomQuickAddInput}
                            defaultValue={editingValue}
                            onChange={(event) =>
                              handleEditingValueChange(event.target.value)
                            }
                            onBlur={commitEdit}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" && event.shiftKey) {
                                event.preventDefault();
                                commitEdit();
                                const rowId = bottomQuickAddRowId;
                                setIsBottomQuickAddOpen(false);
                                setBottomQuickAddRowId(null);
                                if (rowId) {
                                  setActiveRowId(rowId);
                                }
                                return;
                              }
                              if (event.key === "Enter") {
                                event.preventDefault();
                                commitEdit();
                                return;
                              }
                              if (event.key === "Escape") {
                                event.preventDefault();
                                cancelEdit();
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <span className={styles.tableBottomQuickAddValue}>
                            {cellValue}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <div className={styles.tableBottomRecordCount}>
              {displayedRecordCount.toLocaleString()}{" "}
              {displayedRecordCount === 1 ? "record" : "records"}
              {isAddingHundredThousandRows
                ? ` \u00b7 adding ${bulkAddProgressCount.toLocaleString()} / ${BULK_ADD_100K_ROWS_COUNT.toLocaleString()}`
                : ""}
            </div>
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}
