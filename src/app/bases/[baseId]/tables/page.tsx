"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { faker } from "@faker-js/faker";
// CSS import removed - not using transforms for static row behavior
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "~/trpc/react";
import styles from "./tables.module.css";

type TableRow = {
  id: string;
} & Record<string, string>;

type EditableColumnId = string;
type EditingCell = {
  rowIndex: number;
  columnId: EditableColumnId;
};

type BaseMenuSections = {
  appearance: boolean;
  guide: boolean;
};

type TableDefinition = {
  id: string;
  name: string;
  data: TableRow[];
  fields: TableField[];
  columnVisibility: Record<string, boolean>;
  nextRowId: number;
};

type AddColumnKind = "singleLineText" | "number";
type TableFieldKind = AddColumnKind;
type FieldMenuIcon = "name" | "paragraph" | "user" | "status" | "file" | "ai" | "number";
type ColumnFieldMenuIcon =
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

type TableField = {
  id: string;
  label: string;
  kind: TableFieldKind;
  size: number;
  defaultValue: string;
};

type FieldMenuItem = {
  id: string;
  label: string;
  icon: FieldMenuIcon;
  sortId: string;
};

type FilterOperator =
  | "contains"
  | "doesNotContain"
  | "is"
  | "isNot"
  | "isEmpty"
  | "isNotEmpty";
type FilterJoin = "and" | "or";
type FilterCondition = {
  id: string;
  columnId: string;
  operator: FilterOperator;
  value: string;
  join: FilterJoin;
};

type SidebarViewKind = "grid" | "form";
type SidebarViewContextMenuState = {
  viewId: string;
  top: number;
  left: number;
};

const DEFAULT_TABLE_ROW_COUNT = 5;
const DEFAULT_TABLE_STATUS_OPTIONS = [
  "In progress",
  "Review",
  "Planned",
  "Blocked",
] as const;
const DEFAULT_TABLE_NOTES_PREFIXES = [
  "Kickoff notes",
  "Needs review",
  "Follow up",
  "Draft",
  "Waiting on",
  "Plan for",
] as const;

const createAttachmentLabel = () => {
  const filesCount = faker.number.int({ min: 0, max: 3 });
  if (filesCount <= 0) return "—";
  return `${filesCount} file${filesCount === 1 ? "" : "s"}`;
};

const createDefaultRows = () =>
  Array.from({ length: DEFAULT_TABLE_ROW_COUNT }, (_, index) => {
    const notePrefix = faker.helpers.arrayElement(DEFAULT_TABLE_NOTES_PREFIXES);
    return {
      id: `row-${index + 1}`,
      name: faker.company.buzzPhrase(),
      notes: `${notePrefix} ${faker.commerce.productAdjective().toLowerCase()}`,
      assignee: faker.person.firstName(),
      status: faker.helpers.arrayElement(DEFAULT_TABLE_STATUS_OPTIONS),
      attachments: createAttachmentLabel(),
    };
  });

const DEFAULT_TABLE_FIELDS: TableField[] = [
  { id: "name", label: "Name", kind: "singleLineText", size: 220, defaultValue: "" },
  { id: "notes", label: "Notes", kind: "singleLineText", size: 260, defaultValue: "" },
  { id: "assignee", label: "Assignee", kind: "singleLineText", size: 160, defaultValue: "" },
  { id: "status", label: "Status", kind: "singleLineText", size: 140, defaultValue: "" },
  { id: "attachments", label: "Attachments", kind: "singleLineText", size: 140, defaultValue: "—" },
];

type RowHeightOption = "short" | "medium" | "tall" | "extraTall";

const ROW_HEIGHT_ITEMS = [
  { id: "short", label: "Short" },
  { id: "medium", label: "Medium" },
  { id: "tall", label: "Tall" },
  { id: "extraTall", label: "Extra Tall" },
] as const satisfies ReadonlyArray<{ id: RowHeightOption; label: string }>;

const ROW_HEIGHT_SETTINGS: Record<RowHeightOption, { row: string }> = {
  short: { row: "32px" },
  medium: { row: "40px" },
  tall: { row: "56px" },
  extraTall: { row: "72px" },
};
const TABLE_HEADER_HEIGHT = "40px";
const ROW_HEIGHT_TRANSITION_MS = 300;

const FILTER_OPERATOR_ITEMS = [
  { id: "contains", label: "contains..." },
  { id: "doesNotContain", label: "does not contain..." },
  { id: "is", label: "is..." },
  { id: "isNot", label: "is not..." },
  { id: "isEmpty", label: "is empty" },
  { id: "isNotEmpty", label: "is not empty" },
] as const satisfies ReadonlyArray<{ id: FilterOperator; label: string }>;
const FILTER_JOIN_ITEMS = [
  { id: "and", label: "and" },
  { id: "or", label: "or" },
] as const satisfies ReadonlyArray<{ id: FilterJoin; label: string }>;
const operatorRequiresValue = (operator: FilterOperator) =>
  operator !== "isEmpty" && operator !== "isNotEmpty";

const ADD_COLUMN_FIELD_AGENTS = [
  { id: "analyze-attachment", label: "Analyze attachment", icon: "file", color: "#2f9e44", featured: false },
  { id: "research-companies", label: "Research companies", icon: "buildings", color: "#2563eb", featured: false },
  { id: "find-image-web", label: "Find image from web", icon: "imageGlobe", color: "#7c3aed", featured: false },
  { id: "generate-image", label: "Generate image", icon: "image", color: "#ea580c", featured: false },
  { id: "categorize-assets", label: "Categorize assets", icon: "files", color: "#f97316", featured: false },
  { id: "build-prototype", label: "Build prototype", icon: "cursor", color: "#7c3aed", featured: false },
  { id: "build-field-agent", label: "Build a field agent", icon: "agent", color: "#048a0e", featured: true },
  { id: "browse-catalog", label: "Browse catalog", icon: "squares", color: "#4b5563", featured: false },
] as const;

const ADD_COLUMN_STANDARD_FIELDS = [
  { id: "link", label: "Link to another record", icon: "linkList", hasChevron: true },
  { id: "singleLineText", label: "Single line text", icon: "text", hasChevron: false },
  { id: "longText", label: "Long text", icon: "paragraph", hasChevron: false },
  { id: "attachment", label: "Attachment", icon: "file", hasChevron: false },
  { id: "checkbox", label: "Checkbox", icon: "checkbox", hasChevron: false },
  { id: "multipleSelect", label: "Multiple select", icon: "multiSelect", hasChevron: false },
  { id: "singleSelect", label: "Single select", icon: "singleSelect", hasChevron: false },
  { id: "user", label: "User", icon: "user", hasChevron: false },
  { id: "date", label: "Date", icon: "calendar", hasChevron: false },
  { id: "phone", label: "Phone number", icon: "phone", hasChevron: false },
  { id: "email", label: "Email", icon: "email", hasChevron: false },
  { id: "url", label: "URL", icon: "link", hasChevron: false },
  { id: "number", label: "Number", icon: "number", hasChevron: false },
  { id: "currency", label: "Currency", icon: "currency", hasChevron: false },
  { id: "percent", label: "Percent", icon: "percent", hasChevron: false },
  { id: "duration", label: "Duration", icon: "clock", hasChevron: false },
  { id: "rating", label: "Rating", icon: "star", hasChevron: false },
  { id: "formula", label: "Formula", icon: "formula", hasChevron: false },
  { id: "rollup", label: "Rollup", icon: "rollup", hasChevron: false },
  { id: "count", label: "Count", icon: "count", hasChevron: false },
  { id: "lookup", label: "Lookup", icon: "lookup", hasChevron: false },
  { id: "createdTime", label: "Created time", icon: "calendarBolt", hasChevron: false },
  { id: "lastModifiedTime", label: "Last modified time", icon: "calendarBolt", hasChevron: false },
  { id: "createdBy", label: "Created by", icon: "userBolt", hasChevron: false },
  { id: "lastModifiedBy", label: "Last modified by", icon: "userBolt", hasChevron: false },
  { id: "autonumber", label: "Autonumber", icon: "autonumber", hasChevron: false },
  { id: "barcode", label: "Barcode", icon: "barcode", hasChevron: false },
  { id: "button", label: "Button", icon: "cursor", hasChevron: false },
] as const;

const ADD_COLUMN_KIND_CONFIG: Record<
  AddColumnKind,
  {
    label: string;
    icon: "text" | "number";
    helperText: string;
    defaultPlaceholder: string;
  }
> = {
  singleLineText: {
    label: "Single line text",
    icon: "text",
    helperText: "Enter text, or prefill each new cell with a default value.",
    defaultPlaceholder: "Enter default value (optional)",
  },
  number: {
    label: "Number",
    icon: "number",
    helperText: "Enter a number, or prefill each new cell with a default value.",
    defaultPlaceholder: "Enter default number (optional)",
  },
};

const createColumnVisibility = (fields: TableField[]) =>
  Object.fromEntries(fields.map((field) => [field.id, true])) as Record<string, boolean>;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";
const DEFAULT_BASE_NAME = "Untitled Base";
const DEFAULT_GRID_VIEW_NAME = "Grid view";
const DEFAULT_FORM_VIEW_NAME = "Form";
const BASE_NAME_SAVE_DEBOUNCE_MS = 350;
const DEBUG_MAX_ROWS_PER_ADD = 1000;
const ROWS_PAGE_SIZE = 500;
const ROWS_FETCH_AHEAD_THRESHOLD = 60;
const BULK_ADD_100K_ROWS_COUNT = 100000;
const AUTO_CREATED_INITIAL_VIEW_TABLE_IDS = new Set<string>();
const VIEW_KIND_FILTER_KEY = "__viewKind";

const isUuid = (value: string) => UUID_REGEX.test(value);
const normalizeBaseName = (value: string) => value.trim() || DEFAULT_BASE_NAME;
const normalizeViewName = (value: string) => value.trim() || DEFAULT_GRID_VIEW_NAME;
const getViewKindFromFilters = (filters: unknown): SidebarViewKind | null => {
  if (!filters || typeof filters !== "object" || Array.isArray(filters)) return null;
  const value = (filters as Record<string, unknown>)[VIEW_KIND_FILTER_KEY];
  return value === "form" || value === "grid" ? value : null;
};
const resolveSidebarViewKind = (view: { name: string; filters: unknown }): SidebarViewKind => {
  const kindFromFilters = getViewKindFromFilters(view.filters);
  if (kindFromFilters) return kindFromFilters;
  return view.name.trim().toLowerCase().startsWith("form") ? "form" : "grid";
};
const getViewKindLabel = (kind: SidebarViewKind) =>
  kind === "form" ? "form" : "grid view";
const createOptimisticId = (prefix: string) => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `temp-${prefix}-${crypto.randomUUID()}`;
  }
  return `temp-${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};
const escapeXmlText = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const getBaseInitials = (value: string) => {
  const compact = value.trim().replace(/\s+/g, "");
  const chars = Array.from(compact);
  const first = chars[0] ?? "B";
  const second = chars[1] ?? "";
  return `${first.toUpperCase()}${second.toLowerCase()}`;
};
const createBaseFaviconDataUrl = (name: string, color: string, textColor: string) => {
  const initials = escapeXmlText(getBaseInitials(name));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="${color}" />
      <text
        x="32"
        y="39"
        text-anchor="middle"
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
        font-size="25"
        font-weight="700"
        fill="${textColor}"
      >${initials}</text>
    </svg>
  `;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

const DEFAULT_FIELD_META_BY_NAME = new Map(
  DEFAULT_TABLE_FIELDS.map((field) => [field.label.toLowerCase(), field]),
);

const mapDbColumnToField = (column: { id: string; name: string; type: "text" | "number" }): TableField => {
  const defaultMeta = DEFAULT_FIELD_META_BY_NAME.get(column.name.toLowerCase());
  const kind: TableFieldKind = column.type === "number" ? "number" : "singleLineText";
  return {
    id: column.id,
    label: column.name,
    kind,
    size: defaultMeta?.size ?? (kind === "number" ? 160 : 220),
    defaultValue: defaultMeta?.defaultValue ?? "",
  };
};

const mapFieldKindToDbType = (kind: TableFieldKind): "text" | "number" =>
  kind === "number" ? "number" : "text";

const toCellText = (value: unknown, fallback: string) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  return fallback;
};

const resolveFieldMenuIcon = (field: TableField): FieldMenuIcon => {
  const normalizedLabel = field.label.toLowerCase();
  if (normalizedLabel === "name") return "name";
  if (normalizedLabel === "assignee") return "user";
  if (normalizedLabel === "status") return "status";
  if (normalizedLabel === "attachments") return "file";
  if (field.kind === "number") return "number";
  return "paragraph";
};

// Sortable Table Row component
type SortableHandleProps = Pick<
  ReturnType<typeof useSortable>,
  "attributes" | "listeners" | "setActivatorNodeRef" | "isDragging"
>;

function SortableTableRow({
  rowId,
  isRowSelected,
  children,
}: {
  rowId: string;
  isRowSelected: boolean;
  children: (handleProps: SortableHandleProps) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    isDragging,
  } = useSortable({ id: rowId });

  const style = {
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${styles.tanstackRow} ${isRowSelected ? styles.tanstackRowSelected : ""} ${isDragging ? styles.tanstackRowDragging : ""}`}
      data-selected={isRowSelected ? "true" : undefined}
      aria-selected={isRowSelected}
    >
      {children({ attributes, listeners, setActivatorNodeRef, isDragging })}
    </tr>
  );
}

// Sortable Row Cell (for row number column with drag handle)
function SortableRowCell({
  cellId,
  rowIndex,
  columnIndex,
  isRowSelected,
  rowDisplayIndex,
  registerCellRef,
  toggleSelected,
  cellWidth,
  dragHandleProps,
}: {
  cellId: string;
  rowIndex: number;
  columnIndex: number;
  isRowSelected: boolean;
  rowDisplayIndex: number;
  registerCellRef: (rowIndex: number, columnIndex: number, element: HTMLTableCellElement | null) => void;
  toggleSelected: () => void;
  cellWidth: number;
  dragHandleProps: SortableHandleProps;
}) {
  const { attributes, listeners, setActivatorNodeRef, isDragging } = dragHandleProps;

  return (
    <td
      key={cellId}
      className={`${styles.tanstackCell} ${styles.tanstackRowNumberCell}`}
      data-cell="true"
      data-row-index={rowIndex}
      style={{ width: cellWidth }}
      ref={(el) => registerCellRef(rowIndex, columnIndex, el)}
    >
      <div className={styles.rowNumberContent}>
        <button
          type="button"
          className={`${styles.dragHandle} ${isDragging ? styles.dragHandleActive : ""}`}
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          aria-label="Drag to reorder row"
        >
          <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
            <circle cx="2" cy="2" r="1.5" />
            <circle cx="8" cy="2" r="1.5" />
            <circle cx="2" cy="8" r="1.5" />
            <circle cx="8" cy="8" r="1.5" />
            <circle cx="2" cy="14" r="1.5" />
            <circle cx="8" cy="14" r="1.5" />
          </svg>
        </button>
        <input
          type="checkbox"
          className={`${styles.rowCheckbox} ${isRowSelected ? styles.rowCheckboxVisible : ""}`}
          checked={isRowSelected}
          onChange={(e) => {
            e.stopPropagation();
            toggleSelected();
          }}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select row ${rowDisplayIndex}`}
        />
        <span className={`${styles.rowNumberText} ${isRowSelected ? styles.rowNumberHidden : ""}`}>
          {rowDisplayIndex}
        </span>
      </div>
    </td>
  );
}

export default function TablesPage() {
  const params = useParams<{ baseId?: string | string[] }>();
  const router = useRouter();
  const utils = api.useUtils();
  const routeBaseIdParam = params?.baseId;
  const routeBaseId = Array.isArray(routeBaseIdParam)
    ? (routeBaseIdParam[0] ?? "")
    : (routeBaseIdParam ?? "");

  const [viewName, setViewName] = useState(DEFAULT_GRID_VIEW_NAME);
  const [isEditingViewName, setIsEditingViewName] = useState(false);
  const viewNameInputRef = useRef<HTMLInputElement | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [overRowId, setOverRowId] = useState<string | null>(null);
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
  const [baseAccent, setBaseAccent] = useState("#944d37");
  const [isBaseMenuMoreOpen, setIsBaseMenuMoreOpen] = useState(false);
  const [isBaseStarred, setIsBaseStarred] = useState(false);
  const [isViewsSidebarOpen, setIsViewsSidebarOpen] = useState(true);
  const [isCreateViewMenuOpen, setIsCreateViewMenuOpen] = useState(false);
  const [createViewMenuPosition, setCreateViewMenuPosition] = useState({ top: 0, left: 0 });
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isViewMenuOpen, setIsViewMenuOpen] = useState(false);
  const [viewMenuPosition, setViewMenuPosition] = useState({ top: 0, left: 0 });
  const [favoriteViewIds, setFavoriteViewIds] = useState<string[]>([]);
  const [sidebarViewContextMenu, setSidebarViewContextMenu] =
    useState<SidebarViewContextMenuState | null>(null);
  const [isHideFieldsMenuOpen, setIsHideFieldsMenuOpen] = useState(false);
  const [hideFieldsMenuPosition, setHideFieldsMenuPosition] = useState({ top: 0, left: 0 });
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [filterMenuPosition, setFilterMenuPosition] = useState({ top: 0, left: 0 });
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [groupMenuPosition, setGroupMenuPosition] = useState({ top: 0, left: 0 });
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [sortMenuPosition, setSortMenuPosition] = useState({ top: 0, left: 0 });
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [colorMenuPosition, setColorMenuPosition] = useState({ top: 0, left: 0 });
  const [isRowHeightMenuOpen, setIsRowHeightMenuOpen] = useState(false);
  const [rowHeightMenuPosition, setRowHeightMenuPosition] = useState({ top: 0, left: 0 });
  const [isShareSyncMenuOpen, setIsShareSyncMenuOpen] = useState(false);
  const [shareSyncMenuPosition, setShareSyncMenuPosition] = useState({ top: 0, left: 0 });
  const [isBottomAddRecordMenuOpen, setIsBottomAddRecordMenuOpen] = useState(false);
  const [isDebugAddRowsOpen, setIsDebugAddRowsOpen] = useState(false);
  const [debugAddRowsCount, setDebugAddRowsCount] = useState("10");
  const [isAddColumnMenuOpen, setIsAddColumnMenuOpen] = useState(false);
  const [addColumnMenuPosition, setAddColumnMenuPosition] = useState({ top: 0, left: 0 });
  const [isColumnFieldMenuOpen, setIsColumnFieldMenuOpen] = useState(false);
  const [columnFieldMenuPosition, setColumnFieldMenuPosition] = useState({ top: 0, left: 0 });
  const [columnFieldMenuFieldId, setColumnFieldMenuFieldId] = useState<string | null>(null);
  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [columnDropTargetIndex, setColumnDropTargetIndex] = useState<number | null>(null);
  const [columnDropAnchorId, setColumnDropAnchorId] = useState<string | null>(null);
  const [columnDropIndicatorLeft, setColumnDropIndicatorLeft] = useState<number | null>(null);
  const [isEditFieldPopoverOpen, setIsEditFieldPopoverOpen] = useState(false);
  const [editFieldPopoverPosition, setEditFieldPopoverPosition] = useState({ top: 0, left: 0 });
  const [editFieldId, setEditFieldId] = useState<string | null>(null);
  const [editFieldName, setEditFieldName] = useState("");
  const [editFieldKind, setEditFieldKind] = useState<TableFieldKind>("singleLineText");
  const [editFieldAllowMultipleUsers, setEditFieldAllowMultipleUsers] = useState(false);
  const [editFieldNotifyUsers, setEditFieldNotifyUsers] = useState(true);
  const [isEditFieldDescriptionOpen, setIsEditFieldDescriptionOpen] = useState(false);
  const [editFieldDescription, setEditFieldDescription] = useState("");
  const [addColumnSearch, setAddColumnSearch] = useState("");
  const [selectedAddColumnKind, setSelectedAddColumnKind] = useState<AddColumnKind | null>(null);
  const [addColumnFieldName, setAddColumnFieldName] = useState("");
  const [addColumnDefaultValue, setAddColumnDefaultValue] = useState("");
  const [showShareSyncInfo, setShowShareSyncInfo] = useState(true);
  const [rowHeight, setRowHeight] = useState<RowHeightOption>("short");
  const [isRowHeightAnimating, setIsRowHeightAnimating] = useState(false);
  const [isRowHeightCollapsing, setIsRowHeightCollapsing] = useState(false);
  const [rowHeightCollapseGap, setRowHeightCollapseGap] = useState(0);
  const [wrapHeaders, setWrapHeaders] = useState(false);
  const [sortFieldSearch, setSortFieldSearch] = useState("");
  const [hideFieldSearch, setHideFieldSearch] = useState("");
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isTablesMenuOpen, setIsTablesMenuOpen] = useState(false);
  const [hiddenTableIds, setHiddenTableIds] = useState<string[]>([]);
  const [isHiddenTablesMenuOpen, setIsHiddenTablesMenuOpen] = useState(false);
  const [tableSearch, setTableSearch] = useState("");
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [isTableTabMenuOpen, setIsTableTabMenuOpen] = useState(false);
  const [tableTabMenuPosition, setTableTabMenuPosition] = useState({ top: 0, left: 0 });
  const [isRenameTablePopoverOpen, setIsRenameTablePopoverOpen] = useState(false);
  const [renameTablePopoverPosition, setRenameTablePopoverPosition] = useState({
    top: 0,
    left: 0,
  });
  const [renameTableId, setRenameTableId] = useState<string | null>(null);
  const [renameTableValue, setRenameTableValue] = useState("");
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [toolsMenuPosition, setToolsMenuPosition] = useState({ top: 0, left: 0 });
  const [addMenuFromTables, setAddMenuFromTables] = useState(false);
  const [addMenuPosition, setAddMenuPosition] = useState({ top: 0, left: 0 });
  const baseMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const baseMenuRef = useRef<HTMLDivElement | null>(null);
  const baseMenuMoreButtonRef = useRef<HTMLButtonElement | null>(null);
  const baseMenuMoreMenuRef = useRef<HTMLDivElement | null>(null);
  const createViewButtonRef = useRef<HTMLButtonElement | null>(null);
  const createViewMenuRef = useRef<HTMLDivElement | null>(null);
  const viewMenuButtonRef = useRef<HTMLDivElement | null>(null);
  const viewMenuRef = useRef<HTMLDivElement | null>(null);
  const sidebarViewContextMenuRef = useRef<HTMLDivElement | null>(null);
  const hideFieldsButtonRef = useRef<HTMLButtonElement | null>(null);
  const hideFieldsMenuRef = useRef<HTMLDivElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
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
  const debugAddRowsButtonRef = useRef<HTMLButtonElement | null>(null);
  const debugAddRowsPopoverRef = useRef<HTMLFormElement | null>(null);
  const addColumnButtonRef = useRef<HTMLButtonElement | null>(null);
  const addColumnMenuRef = useRef<HTMLDivElement | null>(null);
  const columnFieldMenuRef = useRef<HTMLDivElement | null>(null);
  const columnHeaderRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());
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
  const renameTablePopoverRef = useRef<HTMLDivElement | null>(null);
  const renameTableInputRef = useRef<HTMLInputElement | null>(null);
  const toolsMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const toolsMenuRef = useRef<HTMLDivElement | null>(null);
  const rowHeightTransitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialDocumentTitleRef = useRef<string | null>(null);
  const lastLoadedBaseIdRef = useRef<string | null>(null);
  const lastSyncedBaseNameRef = useRef<string | null>(null);
  const isBaseNameDirtyRef = useRef(false);
  const baseNameSaveRequestIdRef = useRef(0);
  const leftNavRef = useRef<HTMLDivElement | null>(null);
  const baseGuideTextRef = useRef<HTMLTextAreaElement | null>(null);
  const [baseMenuPosition, setBaseMenuPosition] = useState({ top: 0, left: 0 });
  const [resolvedBaseId, setResolvedBaseId] = useState<string | null>(null);
  const [tables, setTables] = useState<TableDefinition[]>([]);
  const [activeTableId, setActiveTableId] = useState("");
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const hasAutoCreatedBaseRef = useRef(false);
  const hasAutoCreatedInitialTableRef = useRef(false);

  const basesQuery = api.bases.list.useQuery();
  const createBaseMutation = api.bases.create.useMutation();
  const updateBaseMutation = api.bases.update.useMutation();
  const tablesQuery = api.tables.listByBaseId.useQuery(
    { baseId: resolvedBaseId ?? EMPTY_UUID },
    { enabled: Boolean(resolvedBaseId) },
  );
  const activeTableColumnsQuery = api.columns.listByTableId.useQuery(
    { tableId: activeTableId || EMPTY_UUID },
    { enabled: Boolean(activeTableId) },
  );
  const activeTableRowsInfiniteQuery = api.rows.listByTableId.useInfiniteQuery(
    {
      tableId: activeTableId || EMPTY_UUID,
      limit: ROWS_PAGE_SIZE,
      filters: filterConditions.reduce<
        Array<{
          columnId: string;
          operator: FilterOperator;
          join: FilterJoin;
          value?: string;
        }>
      >((acc, condition, index) => {
        if (!condition.columnId) return acc;
        const value = condition.value.trim();
        if (operatorRequiresValue(condition.operator) && !value) return acc;
        const nextFilter: {
          columnId: string;
          operator: FilterOperator;
          join: FilterJoin;
          value?: string;
        } = {
          columnId: condition.columnId,
          operator: condition.operator,
          join: index === 0 ? "and" : condition.join,
        };
        if (operatorRequiresValue(condition.operator)) {
          nextFilter.value = value;
        }
        acc.push(nextFilter);
        return acc;
      }, []),
    },
    {
      enabled: Boolean(activeTableId),
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      refetchOnWindowFocus: false,
    },
  );
  const viewsQuery = api.views.listByTableId.useQuery(
    { tableId: activeTableId || EMPTY_UUID },
    { enabled: Boolean(activeTableId) },
  );
  const createTableMutation = api.tables.create.useMutation();
  const deleteTableMutation = api.tables.delete.useMutation();
  const updateTableMutation = api.tables.update.useMutation();
  const createViewMutation = api.views.create.useMutation();
  const updateViewMutation = api.views.update.useMutation();
  const deleteViewMutation = api.views.delete.useMutation();
  const createColumnMutation = api.columns.create.useMutation();
  const createColumnsBulkMutation = api.columns.bulkCreate.useMutation();
  const updateColumnMutation = api.columns.update.useMutation();
  const deleteColumnMutation = api.columns.delete.useMutation();
  const reorderColumnsMutation = api.columns.reorder.useMutation();
  const createRowMutation = api.rows.create.useMutation();
  const createRowsBulkMutation = api.rows.bulkCreate.useMutation();
  const createRowsGeneratedMutation = api.rows.bulkCreateGenerated.useMutation();
  const clearRowsByTableMutation = api.rows.clearByTableId.useMutation();
  const setColumnValueMutation = api.rows.setColumnValue.useMutation();
  const updateCellMutation = api.rows.updateCell.useMutation();

  const activeBase = useMemo(() => {
    if (!resolvedBaseId) return null;
    return (basesQuery.data ?? []).find((base) => base.id === resolvedBaseId) ?? null;
  }, [basesQuery.data, resolvedBaseId]);

  const hiddenTableIdSet = useMemo(() => new Set(hiddenTableIds), [hiddenTableIds]);
  const visibleTables = useMemo(
    () => tables.filter((table) => !hiddenTableIdSet.has(table.id)),
    [tables, hiddenTableIdSet],
  );
  const hiddenTables = useMemo(
    () => tables.filter((table) => hiddenTableIdSet.has(table.id)),
    [tables, hiddenTableIdSet],
  );

  const activeTable = useMemo(
    () =>
      tables.find((table) => table.id === activeTableId) ??
      visibleTables[0] ??
      tables[0],
    [tables, activeTableId, visibleTables],
  );
  const tableViews = useMemo(() => viewsQuery.data ?? [], [viewsQuery.data]);
  const activeView = useMemo(
    () =>
      tableViews.find((view) => view.id === activeViewId) ??
      tableViews[0] ??
      null,
    [tableViews, activeViewId],
  );
  const favoriteViewIdSet = useMemo(() => new Set(favoriteViewIds), [favoriteViewIds]);
  const favoriteViews = useMemo(
    () => tableViews.filter((view) => favoriteViewIdSet.has(view.id)),
    [tableViews, favoriteViewIdSet],
  );
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
  const activeTableRowsPages = useMemo(
    () => activeTableRowsInfiniteQuery.data?.pages ?? [],
    [activeTableRowsInfiniteQuery.data],
  );
  const activeTableRowsFromServer = useMemo(
    () => activeTableRowsPages.flatMap((page) => page.rows),
    [activeTableRowsPages],
  );
  const activeTableTotalRows = activeTableRowsPages[0]?.total ?? 0;
  const data = useMemo(() => activeTable?.data ?? [], [activeTable]);
  const totalRecordCount = Math.max(activeTableTotalRows, data.length);
  const tableFields = useMemo(() => activeTable?.fields ?? [], [activeTable]);
  const normalizedFilterConditions = useMemo(
    () =>
      filterConditions.reduce<
        Array<{
          columnId: string;
          operator: FilterOperator;
          join: FilterJoin;
          value?: string;
        }>
      >((acc, condition, index) => {
        if (!condition.columnId) return acc;
        const value = condition.value.trim();
        if (operatorRequiresValue(condition.operator) && !value) return acc;
        const nextFilter: {
          columnId: string;
          operator: FilterOperator;
          join: FilterJoin;
          value?: string;
        } = {
          columnId: condition.columnId,
          operator: condition.operator,
          join: index === 0 ? "and" : condition.join,
        };
        if (operatorRequiresValue(condition.operator)) {
          nextFilter.value = value;
        }
        acc.push(nextFilter);
        return acc;
      }, []),
    [filterConditions],
  );
  const activeFilterCount = normalizedFilterConditions.length;
  const activeFilterSignature = useMemo(
    () => JSON.stringify(normalizedFilterConditions),
    [normalizedFilterConditions],
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
  const sortFieldItems = hideFieldItems;
  const filteredTables = useMemo(() => {
    const query = tableSearch.trim().toLowerCase();
    if (!query) return tables;
    return tables.filter((table) => table.name.toLowerCase().includes(query));
  }, [tables, tableSearch]);
  const filteredHideFields = useMemo(() => {
    const query = hideFieldSearch.trim().toLowerCase();
    if (!query) return hideFieldItems;
    return hideFieldItems.filter((field) =>
      field.label.toLowerCase().includes(query),
    );
  }, [hideFieldSearch, hideFieldItems]);
  const filteredSortFields = useMemo(() => {
    const query = sortFieldSearch.trim().toLowerCase();
    if (!query) return sortFieldItems;
    return sortFieldItems.filter((field) =>
      field.label.toLowerCase().includes(query),
    );
  }, [sortFieldSearch, sortFieldItems]);
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
  const columnVisibility = useMemo(() => activeTable?.columnVisibility ?? {}, [activeTable]);
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
        header: field.label,
        size: field.size,
      }));
      return [
        {
          id: "rowNumber",
          header: "",
          size: 56,
          enableResizing: false,
          enableSorting: false,
          cell: ({ row }) => row.index + 1,
        },
        ...dynamicColumns,
      ];
    },
    [tableFields],
  );

  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
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
    deleteTableMutation.isPending;
  const isViewActionPending =
    createViewMutation.isPending ||
    updateViewMutation.isPending ||
    deleteViewMutation.isPending;
  const canDeleteActiveView = Boolean(activeView) && tableViews.length > 1;
  const canHideActiveTable = Boolean(activeTableId) && visibleTables.length > 1;
  const canClearActiveTableData = Boolean(activeTable && activeTable.data.length > 0);
  const columnFieldSortState = useMemo<"asc" | "desc" | null>(() => {
    if (!columnFieldMenuFieldId) return null;
    const rule = sorting.find((entry) => entry.id === columnFieldMenuFieldId);
    if (!rule) return null;
    return rule.desc ? "desc" : "asc";
  }, [sorting, columnFieldMenuFieldId]);
  const isColumnDragging = draggingColumnId !== null;
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [activeCellRowIndex, setActiveCellRowIndex] = useState<number | null>(
    null,
  );
  const [activeCellColumnIndex, setActiveCellColumnIndex] = useState<number | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());

  useEffect(() => {
    setEditingCell(null);
    setActiveCellId(null);
    setActiveCellRowIndex(null);
    setActiveCellColumnIndex(null);
    setRowSelection({});
  }, [activeFilterSignature]);

  const getRgb = (hex: string) => {
    const normalized = hex.replace("#", "");
    const isShort = normalized.length === 3;
    const fullHex = isShort
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;
    const value = Number.parseInt(fullHex, 16);
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
    };
  };

  const toRgba = (hex: string, alpha: number) => {
    const { r, g, b } = getRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const adjustColor = (hex: string, amount: number) => {
    const { r, g, b } = getRgb(hex);
    const clamp = (value: number) => Math.max(0, Math.min(255, value));
    return `rgb(${clamp(r + amount)}, ${clamp(g + amount)}, ${clamp(b + amount)})`;
  };

  const getContrastColor = (hex: string) => {
    const { r, g, b } = getRgb(hex);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 160 ? "#1d1f25" : "#ffffff";
  };

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
    (updater: (rows: TableRow[]) => TableRow[]) => {
      updateActiveTable((table) => ({ ...table, data: updater(table.data) }));
    },
    [updateActiveTable],
  );

  const updateTableById = useCallback(
    (tableId: string, updater: (table: TableDefinition) => TableDefinition) => {
      setTables((prev) =>
        prev.map((table) => (table.id === tableId ? updater(table) : table)),
      );
    },
    [],
  );

  const createTableWithDefaultSchema = useCallback(
    async (name: string, seedRows: boolean) => {
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

          const rowsToCreate = createDefaultRows().map((rowTemplate) => {
            const cells: Record<string, string> = {};
            DEFAULT_TABLE_FIELDS.forEach((field) => {
              const columnId = columnIdByLegacyId.get(field.id);
              if (!columnId) return;
              const cellValue = rowTemplate[field.id as keyof typeof rowTemplate];
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
          const nextRow: TableRow = { id: row.id };
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

        void Promise.all([
          utils.tables.listByBaseId.invalidate({ baseId: resolvedBaseId }),
          utils.columns.listByTableId.invalidate({ tableId: createdTable.id }),
          utils.rows.listByTableId.invalidate({ tableId: createdTable.id }),
        ]);

        return nextTable;
      } catch {
        void Promise.all([
          utils.tables.listByBaseId.invalidate({ baseId: resolvedBaseId }),
          utils.columns.listByTableId.invalidate({ tableId: createdTable.id }),
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
      utils.columns.listByTableId,
      utils.rows.listByTableId,
    ],
  );

  useEffect(() => {
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
            hasAutoCreatedBaseRef.current = false;
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

  useEffect(() => {
    if (!tablesQuery.data) return;
    setTables((prev) => {
      const prevById = new Map(prev.map((table) => [table.id, table]));
      return tablesQuery.data.map((dbTable) => {
        const existing = prevById.get(dbTable.id);
        if (existing) {
          return {
            ...existing,
            name: dbTable.name,
          };
        }
        return {
          id: dbTable.id,
          name: dbTable.name,
          data: [],
          fields: [],
          columnVisibility: {},
          nextRowId: 1,
        };
      });
    });
  }, [tablesQuery.data]);

  useEffect(() => {
    setHiddenTableIds((prev) => {
      const existingIds = new Set(tables.map((table) => table.id));
      const next = prev.filter((tableId) => existingIds.has(tableId));
      return next.length === prev.length ? prev : next;
    });
  }, [tables]);

  useEffect(() => {
    if (!tables.length) {
      if (activeTableId) setActiveTableId("");
      return;
    }
    const activeIsVisible = visibleTables.some((table) => table.id === activeTableId);
    if (!activeIsVisible) {
      setActiveTableId(visibleTables[0]?.id ?? tables[0]?.id ?? "");
    }
  }, [tables, visibleTables, activeTableId]);

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

  useEffect(() => {
    if (!activeTableId || viewsQuery.isLoading) return;
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
          void utils.views.listByTableId.invalidate({ tableId });
        },
        onError: () => {
          AUTO_CREATED_INITIAL_VIEW_TABLE_IDS.delete(tableId);
        },
      },
    );
  }, [
    activeTableId,
    tableViews.length,
    viewsQuery.isLoading,
    createViewMutation,
    utils.views.listByTableId,
  ]);

  useEffect(() => {
    if (isEditingViewName) return;
    setViewName(activeView?.name ?? DEFAULT_GRID_VIEW_NAME);
  }, [activeView, isEditingViewName]);

  useEffect(() => {
    if (!activeTableId) {
      setFavoriteViewIds([]);
      return;
    }
    try {
      const stored = window.localStorage.getItem(
        `airtable-clone.favoriteViews.${activeTableId}`,
      );
      if (!stored) {
        setFavoriteViewIds([]);
        return;
      }
      const parsed = JSON.parse(stored) as unknown;
      if (!Array.isArray(parsed)) {
        setFavoriteViewIds([]);
        return;
      }
      setFavoriteViewIds(
        parsed.filter((value): value is string => typeof value === "string"),
      );
    } catch {
      setFavoriteViewIds([]);
    }
  }, [activeTableId]);

  useEffect(() => {
    if (!activeTableId) return;
    try {
      window.localStorage.setItem(
        `airtable-clone.favoriteViews.${activeTableId}`,
        JSON.stringify(favoriteViewIds),
      );
    } catch {
      // Ignore localStorage write errors.
    }
  }, [activeTableId, favoriteViewIds]);

  useEffect(() => {
    if (viewsQuery.isLoading) return;
    setFavoriteViewIds((prev) => {
      const existingIds = new Set(tableViews.map((view) => view.id));
      const next = prev.filter((viewId) => existingIds.has(viewId));
      return next.length === prev.length ? prev : next;
    });
  }, [tableViews, viewsQuery.isLoading]);

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
    if (!resolvedBaseId || tablesQuery.isLoading) return;
    if ((tablesQuery.data?.length ?? 0) > 0) {
      hasAutoCreatedInitialTableRef.current = false;
      return;
    }
    if (hasAutoCreatedInitialTableRef.current || createTableMutation.isPending) return;
    hasAutoCreatedInitialTableRef.current = true;
    void createTableWithDefaultSchema("Table 1", true)
      .catch(() => undefined)
      .finally(() => {
        hasAutoCreatedInitialTableRef.current = false;
      });
  }, [
    resolvedBaseId,
    tablesQuery.isLoading,
    tablesQuery.data,
    createTableMutation.isPending,
    createTableWithDefaultSchema,
  ]);

  useEffect(() => {
    if (
      !activeTableId ||
      !activeTableColumnsQuery.data ||
      activeTableRowsInfiniteQuery.isLoading
    ) {
      return;
    }

    const mappedFields = activeTableColumnsQuery.data.map(mapDbColumnToField);

    setTables((prev) =>
      prev.map((table) => {
        if (table.id !== activeTableId) return table;

        const nextRows = activeTableRowsFromServer.map((dbRow) => {
          const nextRow: TableRow = { id: dbRow.id };
          const cells = (dbRow.cells ?? {}) as Record<string, unknown>;
          mappedFields.forEach((field) => {
            const cellValue = cells[field.id];
            nextRow[field.id] = toCellText(cellValue, field.defaultValue);
          });
          return nextRow;
        });

        const nextVisibility = mappedFields.reduce<Record<string, boolean>>(
          (acc, field) => {
            acc[field.id] = table.columnVisibility[field.id] ?? true;
            return acc;
          },
          {},
        );

        return {
          ...table,
          fields: mappedFields,
          data: nextRows,
          columnVisibility: nextVisibility,
          nextRowId: Math.max(nextRows.length, activeTableTotalRows) + 1,
        };
      }),
    );
  }, [
    activeTableId,
    activeTableColumnsQuery.data,
    activeTableRowsFromServer,
    activeTableRowsInfiniteQuery.isLoading,
    activeTableTotalRows,
  ]);

  useEffect(() => {
    if (tableFields.length === 0) {
      setFilterConditions((prev) => (prev.length === 0 ? prev : []));
      return;
    }

    const fallbackColumnId = tableFields[0]?.id ?? "";
    setFilterConditions((prev) => {
      let changed = false;
      const next = prev.map((condition, index) => {
        const hasColumn = tableFields.some((field) => field.id === condition.columnId);
        const nextColumnId = hasColumn ? condition.columnId : fallbackColumnId;
        const nextJoin: FilterJoin = index === 0 ? "and" : condition.join;
        if (nextColumnId !== condition.columnId || nextJoin !== condition.join) {
          changed = true;
          return { ...condition, columnId: nextColumnId, join: nextJoin };
        }
        return condition;
      });
      return changed ? next : prev;
    });
  }, [tableFields]);

  const handleStartFromScratch = () => {
    const nextIndex = tables.length + 1;
    void createTableWithDefaultSchema(`Table ${nextIndex}`, true);
    setIsAddMenuOpen(false);
  };

  const closeRenameTablePopover = useCallback(() => {
    setIsRenameTablePopoverOpen(false);
    setRenameTableId(null);
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
    if (!renameTableId) return;
    const nextName = renameTableValue.trim();
    if (!nextName) {
      closeRenameTablePopover();
      return;
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

        const rowsToCreate = sourceTable.data.map((row) => {
          const cells: Record<string, string> = {};
          sourceFields.forEach((field) => {
            const nextColumnId = newColumnIdBySourceId.get(field.id);
            if (!nextColumnId) return;
            cells[nextColumnId] = row[field.id] ?? field.defaultValue;
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
        const nextRow: TableRow = { id: row.id };
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
        utils.columns.listByTableId.invalidate({ tableId: createdTable.id }),
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
    utils.columns.listByTableId,
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
    setEditingCell(null);
    setEditingValue("");
    setActiveCellId(null);
    setActiveCellRowIndex(null);
    setActiveCellColumnIndex(null);
    setActiveRowId(null);
    setOverRowId(null);

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
    updateTableById,
    utils.rows.listByTableId,
  ]);

  const handleDeleteActiveTable = useCallback(async () => {
    if (!activeTable || !resolvedBaseId) return;

    const tableId = activeTable.id;
    const nextActiveId =
      visibleTables.find((table) => table.id !== tableId)?.id ??
      tables.find((table) => table.id !== tableId)?.id ??
      "";

    setIsTableTabMenuOpen(false);
    closeRenameTablePopover();
    const previousTables = tables;
    const previousHiddenTableIds = hiddenTableIds;
    const previousActiveTableId = activeTableId;

    setTables((prev) => prev.filter((table) => table.id !== tableId));
    setHiddenTableIds((prev) => prev.filter((id) => id !== tableId));
    setActiveTableId(nextActiveId);

    try {
      await deleteTableMutation.mutateAsync({ id: tableId });
      void utils.tables.listByBaseId.invalidate({ baseId: resolvedBaseId });
    } catch {
      setTables(previousTables);
      setHiddenTableIds(previousHiddenTableIds);
      setActiveTableId(previousActiveTableId);
    }
  }, [
    activeTable,
    resolvedBaseId,
    visibleTables,
    tables,
    hiddenTableIds,
    activeTableId,
    closeRenameTablePopover,
    deleteTableMutation,
    utils.tables.listByBaseId,
  ]);

  const startEditing = (
    rowIndex: number,
    columnId: EditableColumnId,
    initialValue: string,
  ) => {
    setEditingCell({ rowIndex, columnId });
    setEditingValue(initialValue);
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const targetRowId = activeTable?.data[editingCell.rowIndex]?.id;
    const targetColumnId = editingCell.columnId;
    const nextValue = editingValue;
    updateActiveTableData((prev) =>
      prev.map((row, index) =>
        index === editingCell.rowIndex
          ? { ...row, [targetColumnId]: nextValue }
          : row,
      ),
    );
    if (targetRowId && isUuid(targetRowId) && isUuid(targetColumnId)) {
      updateCellMutation.mutate({
        rowId: targetRowId,
        columnId: targetColumnId,
        value: nextValue,
      });
    }
    setEditingCell(null);
  };

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
          void utils.views.listByTableId.invalidate({ tableId });
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
      createViewMutation.mutate(
        {
          tableId,
          name: nextName,
          filters: nextFilters,
        },
        {
          onSuccess: (createdView) => {
            if (!createdView) return;
            setActiveViewId(createdView.id);
            setViewName(createdView.name);
            void utils.views.listByTableId.invalidate({ tableId });
          },
        },
      );
    },
    [activeTableId, buildUniqueViewName, createViewMutation, tableViews, utils.views.listByTableId],
  );

  const handleCreateGridView = useCallback(() => {
    setIsCreateViewMenuOpen(false);
    createViewOfKind("grid");
  }, [createViewOfKind]);

  const handleCreateFormView = useCallback(() => {
    setIsCreateViewMenuOpen(false);
    createViewOfKind("form");
  }, [createViewOfKind]);

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
      const nextActiveId = tableViews.find((view) => view.id !== viewId)?.id ?? null;
      const tableId = activeTableId;
      setIsViewMenuOpen(false);
      setSidebarViewContextMenu(null);
      deleteViewMutation.mutate(
        { id: viewId },
        {
          onSuccess: () => {
            setFavoriteViewIds((prev) => prev.filter((id) => id !== viewId));
            setActiveViewId((prev) => (prev === viewId ? nextActiveId : prev));
            void utils.views.listByTableId.invalidate({ tableId });
          },
        },
      );
    },
    [activeTableId, tableViews, deleteViewMutation, utils.views.listByTableId],
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
  }, []);

  const toggleViewFavorite = useCallback((viewId: string) => {
    setFavoriteViewIds((prev) =>
      prev.includes(viewId) ? prev.filter((id) => id !== viewId) : [...prev, viewId],
    );
  }, []);

  const openSidebarViewContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>, viewId: string) => {
      event.preventDefault();
      const menuWidth = 260;
      const menuHeight = 220;
      const viewportPadding = 8;
      const left = Math.max(
        viewportPadding,
        Math.min(event.clientX, window.innerWidth - menuWidth - viewportPadding),
      );
      const top = Math.max(
        viewportPadding,
        Math.min(event.clientY, window.innerHeight - menuHeight - viewportPadding),
      );
      setSidebarViewContextMenu({ viewId, top, left });
    },
    [],
  );

  const handleRenameViewById = (viewId: string) => {
    const targetView = tableViews.find((view) => view.id === viewId);
    if (!targetView) return;
    setSidebarViewContextMenu(null);
    setIsViewMenuOpen(false);
    startEditingViewName({ id: targetView.id, name: targetView.name });
  };

  const cancelEdit = () => {
    setEditingCell(null);
  };

  const setActiveCell = (cellId: string, rowIndex: number, columnIndex: number) => {
    setActiveCellId(cellId);
    setActiveCellRowIndex(rowIndex);
    setActiveCellColumnIndex(columnIndex);
  };

  const clearActiveCell = () => {
    setActiveCellId(null);
    setActiveCellRowIndex(null);
    setActiveCellColumnIndex(null);
  };

  // Helper to get cell ref key
  const getCellRefKey = (rowIndex: number, columnIndex: number) =>
    `${rowIndex}-${columnIndex}`;

  // Register cell ref
  const registerCellRef = useCallback((rowIndex: number, columnIndex: number, element: HTMLTableCellElement | null) => {
    const key = getCellRefKey(rowIndex, columnIndex);
    if (element) {
      cellRefs.current.set(key, element);
    } else {
      cellRefs.current.delete(key);
    }
  }, []);

  // Navigate to a specific cell
  const navigateToCell = useCallback((rowIndex: number, columnIndex: number) => {
    const key = getCellRefKey(rowIndex, columnIndex);
    const cellElement = cellRefs.current.get(key);
    if (cellElement) {
      const row = table.getRowModel().rows[rowIndex];
      if (row) {
        const cell = row.getVisibleCells()[columnIndex];
        if (cell && cell.column.id !== "rowNumber") {
          setActiveCell(cell.id, rowIndex, columnIndex);
          cellElement.focus();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle keyboard navigation
  const handleKeyboardNavigation = useCallback((event: KeyboardEvent) => {
    // Don't handle if we're editing
    if (editingCell) return;

    // Don't handle if no active cell
    if (activeCellRowIndex === null || activeCellColumnIndex === null) return;

    const rows = table.getRowModel().rows;
    const columns = table.getAllColumns();
    const totalRows = rows.length;
    const totalColumns = columns.length;

    let newRowIndex = activeCellRowIndex;
    let newColumnIndex = activeCellColumnIndex;
    let handled = false;

    switch (event.key) {
      case "ArrowUp":
        if (activeCellRowIndex > 0) {
          newRowIndex = activeCellRowIndex - 1;
          handled = true;
        }
        break;
      case "ArrowDown":
        if (activeCellRowIndex < totalRows - 1) {
          newRowIndex = activeCellRowIndex + 1;
          handled = true;
        }
        break;
      case "ArrowLeft":
        if (activeCellColumnIndex > 1) { // Skip row number column (index 0)
          newColumnIndex = activeCellColumnIndex - 1;
          handled = true;
        }
        break;
      case "ArrowRight":
        if (activeCellColumnIndex < totalColumns - 1) {
          newColumnIndex = activeCellColumnIndex + 1;
          handled = true;
        }
        break;
      case "Tab":
        event.preventDefault();
        if (event.shiftKey) {
          // Shift+Tab: move left, or to previous row's last cell
          if (activeCellColumnIndex > 1) {
            newColumnIndex = activeCellColumnIndex - 1;
          } else if (activeCellRowIndex > 0) {
            newRowIndex = activeCellRowIndex - 1;
            newColumnIndex = totalColumns - 1;
          }
        } else {
          // Tab: move right, or to next row's first editable cell
          if (activeCellColumnIndex < totalColumns - 1) {
            newColumnIndex = activeCellColumnIndex + 1;
          } else if (activeCellRowIndex < totalRows - 1) {
            newRowIndex = activeCellRowIndex + 1;
            newColumnIndex = 1; // First editable column (skip row number)
          }
        }
        handled = true;
        break;
      case "Enter":
        // Start editing the current cell
        const row = rows[activeCellRowIndex];
        if (row) {
          const cell = row.getVisibleCells()[activeCellColumnIndex];
          if (cell && cell.column.id !== "rowNumber") {
            const cellValue = cell.getValue();
            const cellValueText = typeof cellValue === "string" ? cellValue :
                                  typeof cellValue === "number" ? String(cellValue) : "";
            startEditing(row.index, cell.column.id, cellValueText);
            event.preventDefault();
          }
        }
        return;
      case "Escape":
        clearActiveCell();
        return;
    }

    if (handled) {
      event.preventDefault();
      navigateToCell(newRowIndex, newColumnIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCellRowIndex, activeCellColumnIndex, editingCell, navigateToCell, startEditing, clearActiveCell]);

  // Toggle all rows selection
  const toggleAllRowsSelection = () => {
    const allSelected = table.getIsAllRowsSelected();
    table.toggleAllRowsSelected(!allSelected);
  };

  const addRow = () => {
    if (!activeTable) return;
    const tableId = activeTable.id;
    const fieldsSnapshot = activeTable.fields;
    const cells: Record<string, string> = {};
    fieldsSnapshot.forEach((field) => {
      cells[field.id] = field.defaultValue ?? "";
    });
    const optimisticRowId = createOptimisticId("row");
    const optimisticRow: TableRow = {
      id: optimisticRowId,
      ...cells,
    };

    updateTableById(tableId, (table) => ({
      ...table,
      nextRowId: table.nextRowId + 1,
      data: [...table.data, optimisticRow],
    }));

    createRowMutation.mutate(
      {
        tableId,
        cells,
      },
      {
        onSuccess: (createdRow) => {
          if (!createdRow) return;
          const nextRow: TableRow = { id: createdRow.id };
          const createdCells = (createdRow.cells ?? {}) as Record<string, unknown>;
          fieldsSnapshot.forEach((field) => {
            const value = createdCells[field.id];
            nextRow[field.id] = toCellText(value, field.defaultValue);
          });
          updateTableById(tableId, (table) => ({
            ...table,
            data: table.data.map((row) =>
              row.id === optimisticRowId ? nextRow : row,
            ),
          }));
          void utils.rows.listByTableId.invalidate({ tableId });
        },
        onError: () => {
          updateTableById(tableId, (table) => ({
            ...table,
            data: table.data.filter((row) => row.id !== optimisticRowId),
          }));
        },
      },
    );
  };

  const addRowsForDebug = useCallback(
    (requestedCount: number) => {
      if (!activeTable) return;
      const normalizedCount = Math.max(
        1,
        Math.min(DEBUG_MAX_ROWS_PER_ADD, Math.floor(requestedCount)),
      );
      if (!Number.isFinite(normalizedCount)) return;

      const tableId = activeTable.id;
      const fieldsSnapshot = activeTable.fields;
      const baseCells: Record<string, string> = {};
      fieldsSnapshot.forEach((field) => {
        baseCells[field.id] = field.defaultValue ?? "";
      });

      const optimisticRows: TableRow[] = Array.from({ length: normalizedCount }, () => ({
        id: createOptimisticId("row"),
        ...baseCells,
      }));
      const optimisticRowIds = optimisticRows.map((row) => row.id);

      updateTableById(tableId, (table) => ({
        ...table,
        nextRowId: table.nextRowId + normalizedCount,
        data: [...table.data, ...optimisticRows],
      }));

      void createRowsBulkMutation
        .mutateAsync({
          tableId,
          rows: Array.from({ length: normalizedCount }, () => ({
            cells: { ...baseCells },
          })),
        })
        .then((createdRows) => {
          const replacementByOptimisticId = new Map<string, TableRow>();
          for (let index = 0; index < optimisticRowIds.length; index += 1) {
            const optimisticId = optimisticRowIds[index];
            const createdRow = createdRows[index];
            if (!optimisticId || !createdRow) continue;
            const nextRow: TableRow = { id: createdRow.id };
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
            data: table.data
              .map((row) => replacementByOptimisticId.get(row.id) ?? row)
              .filter((row) => !unresolvedOptimisticIds.has(row.id)),
          }));

          void utils.rows.listByTableId.invalidate({ tableId });
        })
        .catch(() => {
          const optimisticIdSet = new Set(optimisticRowIds);
          updateTableById(tableId, (table) => ({
            ...table,
            data: table.data.filter((row) => !optimisticIdSet.has(row.id)),
          }));
        });
    },
    [activeTable, createRowsBulkMutation, updateTableById, utils.rows.listByTableId],
  );

  const handleDebugAddRowsSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const parsedCount = Number.parseInt(debugAddRowsCount, 10);
      if (!Number.isFinite(parsedCount) || parsedCount <= 0) return;
      addRowsForDebug(parsedCount);
      setIsDebugAddRowsOpen(false);
      setIsBottomAddRecordMenuOpen(false);
    },
    [debugAddRowsCount, addRowsForDebug],
  );

  const handleAddOneHundredThousandRows = useCallback(() => {
    if (!activeTable) return;

    const tableId = activeTable.id;
    const baseCells: Record<string, string> = {};
    activeTable.fields.forEach((field) => {
      baseCells[field.id] = field.defaultValue ?? "";
    });

    setIsBottomAddRecordMenuOpen(false);
    setIsDebugAddRowsOpen(false);

    void createRowsGeneratedMutation
      .mutateAsync({
        tableId,
        count: BULK_ADD_100K_ROWS_COUNT,
        cells: baseCells,
      })
      .then(() => {
        void utils.rows.listByTableId.invalidate({ tableId });
      })
      .catch(() => {
        // No-op: next successful query refresh will reconcile state.
      });
  }, [activeTable, createRowsGeneratedMutation, utils.rows.listByTableId]);

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
    setActiveRowId(event.active.id as string);
  };

  // Handle drag over to show drop indicator
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over && over.id !== activeRowId) {
      setOverRowId(over.id as string);
    } else {
      setOverRowId(null);
    }
  };

  // Handle drag end to reorder rows
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveRowId(null);
    setOverRowId(null);

    if (over && active.id !== over.id) {
      updateActiveTableData((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return items;

        const newItems = [...items];
        const movedItem = newItems[oldIndex]!;
        newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);

        return newItems;
      });
    }
  };

  // Get row IDs for sortable context
  const rowIds = useMemo(() => data.map((row) => row.id), [data]);

  const createFilterCondition = useCallback(
    (join: FilterJoin): FilterCondition => ({
      id: createOptimisticId("filter"),
      columnId: tableFields[0]?.id ?? "",
      operator: "contains",
      value: "",
      join,
    }),
    [tableFields],
  );

  const addFilterCondition = useCallback(() => {
    setFilterConditions((prev) => [...prev, createFilterCondition(prev.length === 0 ? "and" : "and")]);
  }, [createFilterCondition]);

  const updateFilterCondition = useCallback(
    (conditionId: string, updater: (condition: FilterCondition) => FilterCondition) => {
      setFilterConditions((prev) =>
        prev.map((condition) =>
          condition.id === conditionId ? updater(condition) : condition,
        ),
      );
    },
    [],
  );

  const removeFilterCondition = useCallback((conditionId: string) => {
    setFilterConditions((prev) => prev.filter((condition) => condition.id !== conditionId));
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
        await utils.columns.listByTableId.invalidate({ tableId: activeTable.id });
      }
    },
    [activeTable, visibleFieldIds, updateActiveTable, reorderColumnsMutation, utils.columns.listByTableId],
  );

  const handleColumnHeaderDragStart = useCallback(
    (event: React.DragEvent<HTMLTableCellElement>, columnId: string) => {
      const target = event.target as Element | null;
      if (target?.closest('[data-column-resizer="true"]')) {
        event.preventDefault();
        return;
      }
      setDraggingColumnId(columnId);
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

  const openColumnFieldMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>, fieldId: string) => {
      event.preventDefault();
      event.stopPropagation();
      const menuWidth = 320;
      const menuHeight = 620;
      const gap = 8;
      const left = Math.max(
        gap,
        Math.min(event.clientX, window.innerWidth - menuWidth - gap),
      );
      const top = Math.max(
        gap,
        Math.min(event.clientY, window.innerHeight - menuHeight - gap),
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
      setEditFieldAllowMultipleUsers(false);
      setEditFieldNotifyUsers(true);
      setIsEditFieldDescriptionOpen(false);
      setEditFieldDescription("");
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

    updateTableById(tableId, (table) => ({
      ...table,
      fields: table.fields.map((field) =>
        field.id === editFieldId
          ? {
              ...field,
              label: nextName,
              kind: nextKind,
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
          utils.columns.listByTableId.invalidate({ tableId }),
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
    updateColumnMutation,
    updateTableById,
    utils.columns.listByTableId,
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
    });
    if (!createdColumn) return;

    await Promise.all(
      activeTable.data.map((row) => {
        if (!isUuid(row.id)) return Promise.resolve(null);
        return updateCellMutation.mutateAsync({
          rowId: row.id,
          columnId: createdColumn.id,
          value: row[sourceField.id] ?? sourceField.defaultValue,
        });
      }),
    );

    const newField: TableField = {
      id: createdColumn.id,
      label: createdColumn.name,
      kind: sourceField.kind,
      size: sourceField.size,
      defaultValue: sourceField.defaultValue,
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
      data: table.data.map((row) => ({
        ...row,
        [newField.id]: row[sourceField.id] ?? sourceField.defaultValue,
      })),
    }));

    await utils.columns.listByTableId.invalidate({ tableId: activeTable.id });
    await utils.rows.listByTableId.invalidate({ tableId: activeTable.id });
    setIsColumnFieldMenuOpen(false);
  }, [
    activeTable,
    columnFieldMenuField,
    columnFieldMenuFieldIndex,
    buildUniqueFieldName,
    createColumnMutation,
    updateCellMutation,
    reorderColumnsMutation,
    updateActiveTable,
    utils.columns.listByTableId,
    utils.rows.listByTableId,
  ]);

  const handleInsertColumnField = useCallback(
    async (direction: "left" | "right") => {
      if (!activeTable || !columnFieldMenuField || columnFieldMenuFieldIndex < 0) return;
      if (direction === "left" && isColumnFieldPrimary) return;

      const createdColumn = await createColumnMutation.mutateAsync({
        tableId: activeTable.id,
        name: buildUniqueFieldName("New field"),
        type: "text",
      });
      if (!createdColumn) return;

      const insertedField: TableField = {
        id: createdColumn.id,
        label: createdColumn.name,
        kind: "singleLineText",
        size: 220,
        defaultValue: "",
      };

      const nextFields = [...activeTable.fields];
      const insertionIndex =
        direction === "left" ? columnFieldMenuFieldIndex : columnFieldMenuFieldIndex + 1;
      nextFields.splice(insertionIndex, 0, insertedField);

      await reorderColumnsMutation.mutateAsync({
        tableId: activeTable.id,
        columnIds: nextFields.map((field) => field.id),
      });

      updateActiveTable((table) => ({
        ...table,
        fields: nextFields,
        columnVisibility: {
          ...table.columnVisibility,
          [insertedField.id]: true,
        },
        data: table.data.map((row) => ({
          ...row,
          [insertedField.id]: "",
        })),
      }));

      await utils.columns.listByTableId.invalidate({ tableId: activeTable.id });
      setIsColumnFieldMenuOpen(false);
    },
    [
      activeTable,
      columnFieldMenuField,
      columnFieldMenuFieldIndex,
      isColumnFieldPrimary,
      createColumnMutation,
      buildUniqueFieldName,
      reorderColumnsMutation,
      updateActiveTable,
      utils.columns.listByTableId,
    ],
  );

  const handleColumnFieldSort = useCallback(
    (desc: boolean) => {
      if (!columnFieldMenuFieldId) return;
      setSorting([{ id: columnFieldMenuFieldId, desc }]);
      setIsColumnFieldMenuOpen(false);
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
        const nextRow = { ...row };
        delete nextRow[deletedFieldId];
        return nextRow;
      }),
    }));
    setSorting((prev) => prev.filter((sortItem) => sortItem.id !== deletedFieldId));
    if (editingCell?.columnId === deletedFieldId) {
      setEditingCell(null);
      setEditingValue("");
    }
    clearActiveCell();
    setColumnFieldMenuFieldId(null);
    setIsColumnFieldMenuOpen(false);
    setIsEditFieldPopoverOpen(false);

    try {
      await deleteColumnMutation.mutateAsync({ id: deletedFieldId });
      void Promise.all([
        utils.columns.listByTableId.invalidate({ tableId }),
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
    sorting,
    clearActiveCell,
    utils.columns.listByTableId,
    utils.rows.listByTableId,
  ]);

  const addColumn = () => {
    setIsAddColumnMenuOpen((prev) => !prev);
  };

  const closeAddColumnMenu = () => {
    setIsAddColumnMenuOpen(false);
  };

  const handleAddColumnCreate = () => {
    if (!selectedAddColumnKind || !activeTable || createColumnMutation.isPending) return;

    const rawLabel = addColumnFieldName.trim();
    const label = rawLabel || ADD_COLUMN_KIND_CONFIG[selectedAddColumnKind].label;
    const defaultValue = addColumnDefaultValue;
    const fieldKind = selectedAddColumnKind;
    const tableId = activeTable.id;
    const hasPersistedRows = activeTable.data.some((row) => isUuid(row.id));
    const optimisticColumnId = createOptimisticId("column");
    const optimisticField: TableField = {
      id: optimisticColumnId,
      label,
      kind: fieldKind,
      size: fieldKind === "number" ? 160 : 220,
      defaultValue,
    };

    closeAddColumnMenu();
    updateTableById(tableId, (table) => ({
      ...table,
      fields: [...table.fields, optimisticField],
      columnVisibility: {
        ...table.columnVisibility,
        [optimisticColumnId]: true,
      },
      data: table.data.map((row) => ({
        ...row,
        [optimisticColumnId]: defaultValue,
      })),
    }));

    void (async () => {
      try {
        const createdColumn = await createColumnMutation.mutateAsync({
          tableId,
          name: label,
          type: mapFieldKindToDbType(fieldKind),
        });
        if (!createdColumn) return;

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
            const nextRow = {
              ...row,
              [createdColumn.id]: row[optimisticColumnId] ?? defaultValue,
            };
            delete nextRow[optimisticColumnId];
            return nextRow;
          }),
        }));

        if (defaultValue === "" || !hasPersistedRows) {
          void utils.columns.listByTableId.invalidate({ tableId });
          return;
        }

        void setColumnValueMutation
          .mutateAsync({
            tableId,
            columnId: createdColumn.id,
            value: defaultValue,
          })
          .finally(() => {
            void Promise.all([
              utils.columns.listByTableId.invalidate({ tableId }),
              utils.rows.listByTableId.invalidate({ tableId }),
            ]);
          });
      } catch {
        updateTableById(tableId, (table) => ({
          ...table,
          fields: table.fields.filter((field) => field.id !== optimisticColumnId),
          columnVisibility: Object.fromEntries(
            Object.entries(table.columnVisibility).filter(
              ([fieldId]) => fieldId !== optimisticColumnId,
            ),
          ),
          data: table.data.map((row) => {
            const nextRow = { ...row };
            delete nextRow[optimisticColumnId];
            return nextRow;
          }),
        }));
      }
    })();
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        clearActiveCell();
        return;
      }

      if (!target.closest('[data-cell="true"]')) {
        clearActiveCell();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

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
    setEditingCell(null);
    setEditingValue("");
    setActiveCellId(null);
    setActiveCellRowIndex(null);
    setActiveCellColumnIndex(null);
    setActiveRowId(null);
    setOverRowId(null);
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
    setFilterConditions([]);
    setSidebarViewContextMenu(null);
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
    if (!isBaseMenuMoreOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
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
      setIsBottomAddRecordMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsBottomAddRecordMenuOpen(false);
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
      setSidebarViewContextMenu(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarViewContextMenu(null);
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
    if (!isFilterMenuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (filterMenuRef.current?.contains(target)) return;
      if (filterButtonRef.current?.contains(target)) return;
      setIsFilterMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterMenuOpen]);

  useEffect(() => {
    if (!isFilterMenuOpen) return;
    const updatePosition = () => {
      const trigger = filterButtonRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = Math.min(620, window.innerWidth - 24);
      const gap = 12;
      const left = Math.max(
        gap,
        Math.min(rect.left, window.innerWidth - menuWidth - gap),
      );
      const top = rect.bottom + 6;
      setFilterMenuPosition({ top, left });
    };
    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isFilterMenuOpen]);

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
      const trigger = sortButtonRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 320;
      const gap = 12;
      const left = Math.max(
        gap,
        Math.min(rect.left, window.innerWidth - menuWidth - gap),
      );
      const top = rect.bottom + 6;
      setSortMenuPosition({ top, left });
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
      const trigger = rowHeightButtonRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 220;
      const gap = 12;
      const left = Math.max(
        gap,
        Math.min(rect.left, window.innerWidth - menuWidth - gap),
      );
      const top = rect.bottom + 6;
      setRowHeightMenuPosition({ top, left });
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
      const trigger = addColumnButtonRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 400;
      const gap = 12;
      const left = Math.max(
        gap,
        Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - gap),
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
  }, [isAddColumnMenuOpen]);

  useEffect(() => {
    if (isAddColumnMenuOpen) return;
    setSelectedAddColumnKind(null);
    setAddColumnSearch("");
    setAddColumnFieldName("");
    setAddColumnDefaultValue("");
  }, [isAddColumnMenuOpen]);

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
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEditFieldPopoverOpen]);

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
      const trigger = hideFieldsButtonRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const menuWidth = 260;
      const gap = 12;
      const left = Math.max(
        gap,
        Math.min(rect.left, window.innerWidth - menuWidth - gap),
      );
      const top = rect.bottom + 6;
      setHideFieldsMenuPosition({ top, left });
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
      closeRenameTablePopover();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRenameTablePopover();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRenameTablePopoverOpen, closeRenameTablePopover]);

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
      clearTimeout(rowHeightTransitionTimeoutRef.current);
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
        clearTimeout(rowHeightTransitionTimeoutRef.current);
      }

      rowHeightTransitionTimeoutRef.current = setTimeout(() => {
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

  // Keyboard navigation effect
  useEffect(() => {
    document.addEventListener("keydown", handleKeyboardNavigation);
    return () => {
      document.removeEventListener("keydown", handleKeyboardNavigation);
    };
  }, [handleKeyboardNavigation]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
    },
  });

  const tableRows = table.getRowModel().rows;
  const rowHeightPx = useMemo(() => {
    const rawValue = Number.parseInt(ROW_HEIGHT_SETTINGS[rowHeight].row, 10);
    return Number.isFinite(rawValue) ? rawValue : 32;
  }, [rowHeight]);
  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => rowHeightPx,
    overscan: 14,
  });

  useEffect(() => {
    rowVirtualizer.measure();
  }, [rowVirtualizer, rowHeightPx]);
  const virtualRows = rowVirtualizer.getVirtualItems();
  const virtualPaddingTop = virtualRows[0]?.start ?? 0;
  const virtualPaddingBottom =
    virtualRows.length > 0
      ? rowVirtualizer.getTotalSize() - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;
  const tableBodyColSpan = table.getVisibleLeafColumns().length + 1;
  const hasMoreServerRows = activeTableRowsInfiniteQuery.hasNextPage ?? false;
  const isFetchingNextServerRows = activeTableRowsInfiniteQuery.isFetchingNextPage;
  const fetchNextServerRowsPage = activeTableRowsInfiniteQuery.fetchNextPage;

  useEffect(() => {
    const lastVisibleVirtualRow = virtualRows[virtualRows.length - 1];
    if (!lastVisibleVirtualRow) return;
    if (!hasMoreServerRows || isFetchingNextServerRows) return;

    const remainingRows = tableRows.length - 1 - lastVisibleVirtualRow.index;
    if (remainingRows > ROWS_FETCH_AHEAD_THRESHOLD) return;

    void fetchNextServerRowsPage();
  }, [
    virtualRows,
    tableRows.length,
    hasMoreServerRows,
    isFetchingNextServerRows,
    fetchNextServerRowsPage,
  ]);

  const renderSidebarViewIcon = (kind: SidebarViewKind) => {
    if (kind === "form") {
      return (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 2h10v12H3V2zm2 3h6v1H5V5zm0 3h6v1H5V8zm0 3h4v1H5v-1z" />
        </svg>
      );
    }
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v3.585a.746.746 0 010 .83v8.085c0 .966-.784 1.75-1.75 1.75H1.75A1.75 1.75 0 010 14.25V6.165a.746.746 0 010-.83V1.75zM1.5 6.5v7.75c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V6.5h-13zM14.5 5V1.75a.25.25 0 00-.25-.25H1.75a.25.25 0 00-.25.25V5h13z" />
      </svg>
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
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M6 2l-.7 3H3v1.5h1.9l-.5 3H2.5V11h1.6l-.7 3H5l.7-3h2.6l-.7 3h1.6l.7-3H12v-1.5h-1.9l.5-3H12V5h-1.6l.7-3H9.6l-.7 3H6.3l.7-3H6zm-.9 7.5l.5-3h2.6l-.5 3H5.1z" />
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

  const renderSortFieldIcon = (icon: FieldMenuIcon) => {
    if (icon === "name") {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M3 12h1.2l.68-2h2.24l.68 2H9L6.86 4H5.14L3 12zm2.3-3.02L6 6.9l.7 2.08H5.3zM10 5h3v1h-1v5h-1V6h-1V5z" />
        </svg>
      );
    }
    return renderHideFieldIcon(icon);
  };

  const renderColumnFieldMenuIcon = (icon: ColumnFieldMenuIcon) => {
    const sharedProps = {
      width: 16,
      height: 16,
      viewBox: "0 0 16 16",
      fill: "currentColor" as const,
    };
    switch (icon) {
      case "edit":
        return (
          <svg {...sharedProps}>
            <path d="M2 11.5V14h2.5l7.1-7.1-2.5-2.5L2 11.5zm10.7-7.2c.4-.4.4-1 0-1.4l-1.6-1.6c-.4-.4-1-.4-1.4 0l-1.2 1.2 2.5 2.5 1.7-1.7z" />
          </svg>
        );
      case "duplicate":
        return (
          <svg {...sharedProps}>
            <path d="M4 2h8a2 2 0 012 2v8h-2V4H4V2zm-2 4h8a2 2 0 012 2v6H2a2 2 0 01-2-2V6h2z" />
          </svg>
        );
      case "insertLeft":
        return (
          <svg {...sharedProps}>
            <path d="M3 2h1.5v12H3V2zm8.53 2.47a.75.75 0 010 1.06L8.06 9l3.47 3.47a.75.75 0 11-1.06 1.06l-4-4a.75.75 0 010-1.06l4-4a.75.75 0 011.06 0z" />
          </svg>
        );
      case "insertRight":
        return (
          <svg {...sharedProps}>
            <path d="M11.5 2H13v12h-1.5V2zM4.47 4.47a.75.75 0 011.06 0l4 4a.75.75 0 010 1.06l-4 4a.75.75 0 11-1.06-1.06L7.94 9 4.47 5.53a.75.75 0 010-1.06z" />
          </svg>
        );
      case "primary":
        return (
          <svg {...sharedProps}>
            <path d="M2.5 3h1.5v10H2.5V3zm11.03 2.47a.75.75 0 010 1.06L10.06 10l3.47 3.47a.75.75 0 11-1.06 1.06l-4-4a.75.75 0 010-1.06l4-4a.75.75 0 011.06 0zM6 9.25h-2V7.75h2v1.5z" />
          </svg>
        );
      case "copyUrl":
        return (
          <svg {...sharedProps}>
            <path d="M7.25 4.5a3.25 3.25 0 114.6 4.6l-2.1 2.1a3.25 3.25 0 11-4.6-4.6l.7-.7a.75.75 0 111.06 1.06l-.7.7a1.75 1.75 0 002.48 2.48l2.1-2.1a1.75 1.75 0 00-2.48-2.48l-.7.7a.75.75 0 01-1.06-1.06l.7-.7zM6.24 4.8a.75.75 0 010 1.06l-2.1 2.1a1.75 1.75 0 002.48 2.48l.7-.7a.75.75 0 011.06 1.06l-.7.7a3.25 3.25 0 11-4.6-4.6l2.1-2.1a.75.75 0 011.06 0z" />
          </svg>
        );
      case "description":
        return (
          <svg {...sharedProps}>
            <path d="M3 2h10v12H3V2zm2 3h6v1.5H5V5zm0 3h6v1.5H5V8zm0 3h4v1.5H5V11z" />
          </svg>
        );
      case "permissions":
        return (
          <svg {...sharedProps}>
            <path d="M8 1.5a3.5 3.5 0 013.5 3.5v1.5H14a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1v-5a1 1 0 011-1h2.5V5A3.5 3.5 0 018 1.5zm-2 5h4V5a2 2 0 00-4 0v1.5z" />
          </svg>
        );
      case "sortAsc":
        return (
          <svg {...sharedProps}>
            <path d="M3 4h6v1.5H3V4zm0 3h6v1.5H3V7zm0 3h6v1.5H3V10zm8-6l2.5-2.5L16 4h-1.75v8h-1.5V4H11z" />
          </svg>
        );
      case "sortDesc":
        return (
          <svg {...sharedProps}>
            <path d="M3 4h6v1.5H3V4zm0 3h6v1.5H3V7zm0 3h6v1.5H3V10zm3.75 2h1.5V4h1.75L7.5 1.5 5 4h1.75v8z" />
          </svg>
        );
      case "filter":
        return (
          <svg {...sharedProps}>
            <path d="M2 3h12v1.5H2V3zm2.25 3.75h7.5v1.5h-7.5v-1.5zm2.25 3.75h3v1.5h-3V10.5z" />
          </svg>
        );
      case "group":
        return (
          <svg {...sharedProps}>
            <path d="M2 3h5v4H2V3zm7 0h5v4H9V3zM2 9h12v4H2V9zm1.5 1.5v1h9v-1h-9z" />
          </svg>
        );
      case "dependencies":
        return (
          <svg {...sharedProps}>
            <path d="M3 4h10v1.5H3V4zm2 3.25h6v1.5H5v-1.5zm-2 3.25h10V12H3v-1.5zm0-4.5h1.5v1.5H3V6zm8.5 3.25H13v1.5h-1.5v-1.5z" />
          </svg>
        );
      case "hide":
        return (
          <svg {...sharedProps}>
            <path d="M8 3c3.73 0 6.37 3.35 7 4.25-.63.9-3.27 4.25-7 4.25S1.63 8.15 1 7.25C1.63 6.35 4.27 3 8 3zm0 1.5c-2.25 0-4.1 1.5-4.99 2.75.89 1.25 2.74 2.75 4.99 2.75s4.1-1.5 4.99-2.75C12.1 6 10.25 4.5 8 4.5zm0 1.25a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM2.03 1.97l12 12-1.06 1.06-12-12 1.06-1.06z" />
          </svg>
        );
      case "delete":
        return (
          <svg {...sharedProps}>
            <path d="M3 4h10v1H3V4zm1 2h8l-1 8H5L4 6zm2-3h4l1 1H5l1-1z" />
          </svg>
        );
      default:
        return null;
    }
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
      case "file":
        return (
          <svg {...sharedProps}>
            <path d="M4 1h5l3 3v11H4V1zm4.5 1.5V5H11L8.5 2.5z" />
          </svg>
        );
      case "buildings":
        return (
          <svg {...sharedProps}>
            <path d="M2 14V5h4v9H2zm5 0V2h7v12H7zM4 7h1v1H4V7zm0 2h1v1H4V9zm5-5h1v1H9V4zm2 0h1v1h-1V4zm-2 2h1v1H9V6zm2 0h1v1h-1V6z" />
          </svg>
        );
      case "imageGlobe":
        return (
          <svg {...sharedProps}>
            <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zm0 1.5a5 5 0 014.84 3.75H9.6l-.9 1.2-1.2-1.2H3.18A5 5 0 018 3zm0 10a5 5 0 01-4.9-4h4.05l1.35 1.35L9.95 9h3.03A5 5 0 018 13z" />
          </svg>
        );
      case "image":
        return (
          <svg {...sharedProps}>
            <path d="M2.5 3h11a1 1 0 011 1v8a1 1 0 01-1 1h-11a1 1 0 01-1-1V4a1 1 0 011-1zm0 1.5v6.1l2.9-2.9 2.1 2.1 3.1-3.1 2.9 2.9V4.5h-11zm2.3.7a1.2 1.2 0 100 2.4 1.2 1.2 0 000-2.4z" />
          </svg>
        );
      case "files":
        return (
          <svg {...sharedProps}>
            <path d="M3 3h6l2 2v8H3V3zm1.5 1.5v7h5V6.5H8V4.5H4.5zm5.5-1h2l2 2v7h-2V5.5h-2V3.5z" />
          </svg>
        );
      case "cursor":
        return (
          <svg {...sharedProps}>
            <path d="M3 2l9 5-4 1 2 5-1.5.6-2-5-3 2V2z" />
          </svg>
        );
      case "agent":
        return (
          <svg {...sharedProps}>
            <path d="M3 3h10v10H3V3zm2 2v2h2V5H5zm4 0v2h2V5H9zm-4 4v2h6V9H5z" />
          </svg>
        );
      case "squares":
        return (
          <svg {...sharedProps}>
            <path d="M2.5 2.5h4v4h-4v-4zm7 0h4v4h-4v-4zm-7 7h4v4h-4v-4zm7 0h4v4h-4v-4z" />
          </svg>
        );
      case "linkList":
        return (
          <svg {...sharedProps}>
            <path d="M2 4h6v1.5H2V4zm0 3h6v1.5H2V7zm0 3h6v1.5H2V10zm8.8-4.8L14 8.4l-3.2 3.2-1-1L12 8.4l-2.2-2.2 1-1z" />
          </svg>
        );
      case "text":
        return (
          <svg {...sharedProps}>
            <path d="M3 4h10v1.5H9v6H7v-6H3V4z" />
          </svg>
        );
      case "paragraph":
        return (
          <svg {...sharedProps}>
            <path d="M3 3h10v2H3V3zm0 4h10v2H3V7zm0 4h6v2H3v-2z" />
          </svg>
        );
      case "checkbox":
        return (
          <svg {...sharedProps}>
            <path d="M2 2h12v12H2V2zm2 6.2l2.2 2.2L12 4.6 10.9 3.5 6.2 8.2 5.1 7.1 4 8.2z" />
          </svg>
        );
      case "multiSelect":
        return (
          <svg {...sharedProps}>
            <path d="M2 4h2v2H2V4zm0 3h2v2H2V7zm0 3h2v2H2v-2zm3-6h9v1.5H5V4zm0 3h9v1.5H5V7zm0 3h9v1.5H5V10z" />
          </svg>
        );
      case "singleSelect":
        return (
          <svg {...sharedProps}>
            <path d="M8 2.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zm0 2a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
          </svg>
        );
      case "user":
        return (
          <svg {...sharedProps}>
            <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 1.5c-2.76 0-5 1.79-5 4v.5h10v-.5c0-2.21-2.24-4-5-4z" />
          </svg>
        );
      case "calendar":
        return (
          <svg {...sharedProps}>
            <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm0 3.5v7h10v-7H3zm2-2h1.5v2H5v-2zm4.5 0H11v2H9.5v-2z" />
          </svg>
        );
      case "phone":
        return (
          <svg {...sharedProps}>
            <path d="M5.2 2.5l1.9 2.1-.9 1.5c.7 1.4 1.9 2.6 3.3 3.3l1.5-.9 2.1 1.9-1.1 2.1c-.2.4-.7.6-1.1.5-4.3-1-7.6-4.3-8.6-8.6-.1-.4.1-.9.5-1.1l2.1-1.1z" />
          </svg>
        );
      case "email":
        return (
          <svg {...sharedProps}>
            <path d="M2 3h12v10H2V3zm1.5 1.5v.2L8 7.8l4.5-3.1v-.2h-9zM3.5 6.4v5.1h9V6.4L8 9.4 3.5 6.4z" />
          </svg>
        );
      case "link":
        return (
          <svg {...sharedProps}>
            <path d="M6.6 5.5l1.1 1.1-2.1 2.1a1.5 1.5 0 102.1 2.1l2.1-2.1 1.1 1.1-2.1 2.1a3 3 0 11-4.2-4.2l2.1-2.1zm2.8-1.4a3 3 0 014.2 4.2l-2.1 2.1-1.1-1.1 2.1-2.1a1.5 1.5 0 10-2.1-2.1L8.3 7.2 7.2 6.1l2.2-2z" />
          </svg>
        );
      case "number":
        return (
          <svg {...sharedProps}>
            <path d="M6 2l-.7 3H3v1.5h1.9l-.5 3H2.5V11h1.6l-.7 3H5l.7-3h2.6l-.7 3h1.6l.7-3H12v-1.5h-1.9l.5-3H12V5h-1.6l.7-3H9.6l-.7 3H6.3l.7-3H6zm-.9 7.5l.5-3h2.6l-.5 3H5.1z" />
          </svg>
        );
      case "currency":
        return (
          <svg {...sharedProps}>
            <path d="M8.8 2.2v1.4c1.7.2 2.8 1.2 3.1 2.7h-1.7c-.2-.7-.7-1.2-1.7-1.2-.9 0-1.5.4-1.5 1 0 .5.4.8 1.7 1.1 1.9.4 3.5 1 3.5 3 0 1.6-1.2 2.8-3.1 3v1.6H7.5v-1.6c-1.9-.2-3.2-1.4-3.4-3.2h1.7c.2.9.9 1.6 2 1.6s1.8-.5 1.8-1.2c0-.7-.6-1-2-1.3-1.8-.4-3.1-1-3.1-2.8 0-1.4 1-2.5 2.9-2.8V2.2h1.4z" />
          </svg>
        );
      case "percent":
        return (
          <svg {...sharedProps}>
            <path d="M4.5 4a1.5 1.5 0 110 3 1.5 1.5 0 010-3zm7 5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM12 3l1 1-9 9-1-1 9-9z" />
          </svg>
        );
      case "clock":
        return (
          <svg {...sharedProps}>
            <path d="M8 2.5a5.5 5.5 0 110 11 5.5 5.5 0 010-11zm.8 2.3H7.2v3.6l2.9 1.7.8-1.3-2.1-1.2V4.8z" />
          </svg>
        );
      case "star":
        return (
          <svg {...sharedProps}>
            <path d="M8 2l1.7 3.5 3.8.6-2.8 2.7.7 3.8L8 10.8 4.6 12.6l.7-3.8-2.8-2.7 3.8-.6L8 2z" />
          </svg>
        );
      case "formula":
        return (
          <svg {...sharedProps}>
            <path d="M3 4h5v1.5H5l2.2 2L5 9.5h3V11H3V9.5l2.2-2L3 5.5V4zm6.5 1h4V6h-4V5zm0 3h4v1h-4V8zm0 3h4v1h-4v-1z" />
          </svg>
        );
      case "rollup":
        return (
          <svg {...sharedProps}>
            <path d="M8 2.5a5.5 5.5 0 105.5 5.5h-1.5A4 4 0 118 4V2.5zm0 2.5A3 3 0 1011 8h1.5A4.5 4.5 0 118 3.5V5z" />
          </svg>
        );
      case "count":
        return (
          <svg {...sharedProps}>
            <path d="M3 2h10v12H3V2zm2 2v2h2V4H5zm3 0v2h3V4H8zM5 7v2h2V7H5zm3 0v2h3V7H8zm-3 3v2h6v-2H5z" />
          </svg>
        );
      case "lookup":
        return (
          <svg {...sharedProps}>
            <path d="M2 4h6v1.5H2V4zm0 3h6v1.5H2V7zm0 3h4v1.5H2V10zm8.8-2.2a2.8 2.8 0 100-5.6 2.8 2.8 0 000 5.6zm0-1.5a1.3 1.3 0 110-2.6 1.3 1.3 0 010 2.6zm1.9 2l1.8 1.8-1 1-1.8-1.8 1-1z" />
          </svg>
        );
      case "calendarBolt":
        return (
          <svg {...sharedProps}>
            <path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm0 3.5v7h10v-7H3zm5.4 1L6.8 9h1.1L7.4 11l1.8-2.5H8.1l.3-2z" />
          </svg>
        );
      case "userBolt":
        return (
          <svg {...sharedProps}>
            <path d="M6.8 7.5a2.3 2.3 0 100-4.6 2.3 2.3 0 000 4.6zm0 1.2c-2.1 0-3.8 1.2-3.8 2.8v.5h5.4l-.5-1H9l-.6 2.5 2.2-3h-1.1l.4-1.8h-1C8.6 8.7 7.7 8.7 6.8 8.7z" />
          </svg>
        );
      case "autonumber":
        return (
          <svg {...sharedProps}>
            <path d="M4 3h1.5v8H4V3zm6.5 0h1.5v8h-1.5V3zm-4 0l2.5 2H7.8v6H6.2V5H4l2.5-2zm0 10l2.5 2H4l2.5-2z" />
          </svg>
        );
      case "barcode":
        return (
          <svg {...sharedProps}>
            <path d="M2 3h1v10H2V3zm2 0h2v10H4V3zm3 0h1v10H7V3zm2 0h2v10H9V3zm3 0h1v10h-1V3z" />
          </svg>
        );
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
      <aside className={styles.appSidebar}>
        <div className={styles.sidebarContent}>
          <div className={styles.sidebarTop}>
            {/* Home Button */}
            <div className={styles.homeButton}>
            <svg width="24" height="20.4" viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg">
              <g>
                <path fill="currentColor" d="M90.0389,12.3675 L24.0799,39.6605 C20.4119,41.1785 20.4499,46.3885 24.1409,47.8515 L90.3759,74.1175 C96.1959,76.4255 102.6769,76.4255 108.4959,74.1175 L174.7319,47.8515 C178.4219,46.3885 178.4609,41.1785 174.7919,39.6605 L108.8339,12.3675 C102.8159,9.8775 96.0559,9.8775 90.0389,12.3675"></path>
                <path fill="currentColor" d="M105.3122,88.4608 L105.3122,154.0768 C105.3122,157.1978 108.4592,159.3348 111.3602,158.1848 L185.1662,129.5368 C186.8512,128.8688 187.9562,127.2408 187.9562,125.4288 L187.9562,59.8128 C187.9562,56.6918 184.8092,54.5548 181.9082,55.7048 L108.1022,84.3528 C106.4182,85.0208 105.3122,86.6488 105.3122,88.4608"></path>
                <path fill="currentColor" d="M88.0781,91.8464 L66.1741,102.4224 L63.9501,103.4974 L17.7121,125.6524 C14.7811,127.0664 11.0401,124.9304 11.0401,121.6744 L11.0401,60.0884 C11.0401,58.9104 11.6441,57.8934 12.4541,57.1274 C12.7921,56.7884 13.1751,56.5094 13.5731,56.2884 C14.6781,55.6254 16.2541,55.4484 17.5941,55.9784 L87.7101,83.7594 C91.2741,85.1734 91.5541,90.1674 88.0781,91.8464"></path>
              </g>
            </svg>
          </div>

          {/* Omni Button */}
          <div className={styles.omniButton}>
            <svg height="36" viewBox="0 0 160 160" width="36" xmlns="http://www.w3.org/2000/svg">
              <g transform="scale(0.9090909090909091)">
                <g className={styles.ringInner}>
                  {[0, 32.73, 65.45, 98.18, 130.91, 163.64, 196.36, 229.09, 261.82, 294.55, 327.27].map((rotation, i) => (
                    <g key={i} transform={`rotate(${rotation})`}>
                      <g transform="translate(72, 0)">
                        <path fill="currentColor" d="M0 7.68C0 4.99175 2.38419e-07 3.64762 0.523169 2.62085C0.983361 1.71767 1.71767 0.983361 2.62085 0.523169C3.64762 0 4.99175 0 7.68 0H8.32C11.0083 0 12.3524 0 13.3792 0.523169C14.2823 0.983361 15.0166 1.71767 15.4768 2.62085C16 3.64762 16 4.99175 16 7.68V8.32C16 11.0083 16 12.3524 15.4768 13.3792C15.0166 14.2823 14.2823 15.0166 13.3792 15.4768C12.3524 16 11.0083 16 8.32 16H7.68C4.99175 16 3.64762 16 2.62085 15.4768C1.71767 15.0166 0.983361 14.2823 0.523169 13.3792C2.38419e-07 12.3524 0 11.0083 0 8.32V7.68Z"></path>
                      </g>
                    </g>
                  ))}
                </g>
                <g className={styles.eyes}>
                  <g transform="translate(48, 72)">
                    <path fill="currentColor" d="M0 7.68C0 4.99175 2.38419e-07 3.64762 0.523169 2.62085C0.983361 1.71767 1.71767 0.983361 2.62085 0.523169C3.64762 0 4.99175 0 7.68 0H8.32C11.0083 0 12.3524 0 13.3792 0.523169C14.2823 0.983361 15.0166 1.71767 15.4768 2.62085C16 3.64762 16 4.99175 16 7.68V8.32C16 11.0083 16 12.3524 15.4768 13.3792C15.0166 14.2823 14.2823 15.0166 13.3792 15.4768C12.3524 16 11.0083 16 8.32 16H7.68C4.99175 16 3.64762 16 2.62085 15.4768C1.71767 15.0166 0.983361 14.2823 0.523169 13.3792C2.38419e-07 12.3524 0 11.0083 0 8.32V7.68Z"></path>
                  </g>
                  <g transform="translate(96, 72)">
                    <path fill="currentColor" d="M0 7.68C0 4.99175 2.38419e-07 3.64762 0.523169 2.62085C0.983361 1.71767 1.71767 0.983361 2.62085 0.523169C3.64762 0 4.99175 0 7.68 0H8.32C11.0083 0 12.3524 0 13.3792 0.523169C14.2823 0.983361 15.0166 1.71767 15.4768 2.62085C16 3.64762 16 4.99175 16 7.68V8.32C16 11.0083 16 12.3524 15.4768 13.3792C15.0166 14.2823 14.2823 15.0166 13.3792 15.4768C12.3524 16 11.0083 16 8.32 16H7.68C4.99175 16 3.64762 16 2.62085 15.4768C1.71767 15.0166 0.983361 14.2823 0.523169 13.3792C2.38419e-07 12.3524 0 11.0083 0 8.32V7.68Z"></path>
                  </g>
                </g>
              </g>
            </svg>
          </div>
        </div>

        <div className={styles.sidebarBottom}>
          {/* Help Button */}
          <div className={styles.sidebarIconButton}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A1.75 1.75 0 018.25 6h.5a1.75 1.75 0 01.75 3.333v.917a.75.75 0 01-1.5 0v-1.625a.75.75 0 01.75-.75.25.25 0 00.25-.25.25.25 0 00-.25-.25h-.5a.25.25 0 00-.25.25.75.75 0 01-1.5 0zM9 11a1 1 0 11-2 0 1 1 0 012 0z"/>
            </svg>
          </div>

          {/* Notification Button */}
          <div className={styles.sidebarIconButton}>
            <div className={styles.notificationBadge}>0</div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 16a2 2 0 001.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 008 16z"/>
              <path fillRule="evenodd" d="M8 1.5A3.5 3.5 0 004.5 5v2.947c0 .346-.102.683-.294.97l-1.703 2.556a.018.018 0 00-.003.01l.001.006c0 .002.002.004.004.006a.017.017 0 00.006.004l.007.001h10.964l.007-.001a.016.016 0 00.006-.004.016.016 0 00.004-.006l.001-.007a.017.017 0 00-.003-.01l-1.703-2.554a1.75 1.75 0 01-.294-.97V5A3.5 3.5 0 008 1.5zM3 5a5 5 0 0110 0v2.947c0 .05.015.098.042.139l1.703 2.555A1.518 1.518 0 0113.482 13H2.518a1.518 1.518 0 01-1.263-2.36l1.703-2.554A.25.25 0 003 7.947V5z"/>
            </svg>
          </div>

          {/* User Avatar */}
          <div className={styles.userAvatar}>
            <div className={styles.userAvatarInner}>U</div>
          </div>
        </div>
        </div>
      </aside>

      {/* Main App Content */}
      <div className={styles.mainAppContent}>
        {/* Base Header - Top navigation bar */}
        <header className={styles.baseHeader}>
        <div className={styles.baseHeaderLeft}>
          {/* Base Icon */}
          <div className={styles.baseIcon}>
            <svg width="20" height="17" viewBox="0 0 200 170" fill="white">
              <path d="M90.0389,12.3675 L24.0799,39.6605 C20.4119,41.1785 20.4499,46.3885 24.1409,47.8515 L90.3759,74.1175 C96.1959,76.4255 102.6769,76.4255 108.4959,74.1175 L174.7319,47.8515 C178.4219,46.3885 178.4609,41.1785 174.7919,39.6605 L108.8339,12.3675 C102.8159,9.8775 96.0559,9.8775 90.0389,12.3675"/>
              <path d="M105.3122,88.4608 L105.3122,154.0768 C105.3122,157.1978 108.4592,159.3348 111.3602,158.1848 L185.1662,129.5368 C186.8512,128.8688 187.9562,127.2408 187.9562,125.4288 L187.9562,59.8128 C187.9562,56.6918 184.8092,54.5548 181.9082,55.7048 L108.1022,84.3528 C106.4182,85.0208 105.3122,86.6488 105.3122,88.4608"/>
              <path d="M88.0781,91.8464 L66.1741,102.4224 L63.9501,103.4974 L17.7121,125.6524 C14.7811,127.0664 11.0401,124.9304 11.0401,121.6744 L11.0401,60.0884 C11.0401,58.9104 11.6441,57.8934 12.4541,57.1274 C12.7921,56.7884 13.1751,56.5094 13.5731,56.2884 C14.6781,55.6254 16.2541,55.4484 17.5941,55.9784 L87.7101,83.7594 C91.2741,85.1734 91.5541,90.1674 88.0781,91.8464"/>
            </svg>
          </div>

          {/* Base Name */}
          <button
            ref={baseMenuButtonRef}
            type="button"
            className={styles.baseNameButton}
            aria-expanded={isBaseMenuOpen}
            aria-controls="base-menu-popover"
            onClick={() => setIsBaseMenuOpen((prev) => !prev)}
          >
            <span className={styles.baseNameText}>{baseName}</span>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={styles.baseNameCaret}>
              <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
            </svg>
          </button>
        </div>

        {/* Center Navigation Tabs */}
        <nav className={styles.baseHeaderCenter}>
          <button type="button" className={`${styles.navTab} ${styles.navTabActive}`}>
            Data
            <div className={styles.navTabIndicator}></div>
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${styles.navTabDisabled}`}
            disabled
            aria-disabled="true"
          >
            Automations
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${styles.navTabDisabled}`}
            disabled
            aria-disabled="true"
          >
            Interfaces
          </button>
          <button
            type="button"
            className={`${styles.navTab} ${styles.navTabDisabled}`}
            disabled
            aria-disabled="true"
          >
            Forms
          </button>
        </nav>

        {/* Right Actions */}
        <div className={styles.baseHeaderRight}>
          {/* History Button */}
          <button type="button" className={styles.historyButton} aria-label="Base history">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 3a5 5 0 00-4.546 2.914.5.5 0 00.908.417 4 4 0 117.07 2.71.5.5 0 10-.632.782A5 5 0 108 3z"/>
              <path d="M8.5 1.5a.5.5 0 00-1 0v5a.5.5 0 00.5.5h3.5a.5.5 0 000-1h-3v-4.5z"/>
            </svg>
          </button>

          {/* Trial Badge */}
          <div className={`${styles.trialBadge} ${styles.topActionDisabled}`}>
            Trial: 13 days left
          </div>

          {/* Launch Button */}
          <button
            type="button"
            className={`${styles.launchButton} ${styles.topActionDisabled}`}
            disabled
            aria-disabled="true"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a.5.5 0 01.5.5v11.793l3.146-3.147a.5.5 0 01.708.708l-4 4a.5.5 0 01-.708 0l-4-4a.5.5 0 01.708-.708L7.5 13.293V1.5A.5.5 0 018 1z"/>
            </svg>
            Launch
          </button>

          {/* Share Button */}
          <button
            type="button"
            className={`${styles.shareButton} ${styles.topActionDisabled}`}
            disabled
            aria-disabled="true"
          >
            Share
          </button>
        </div>
      </header>

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
                              onClick={() => setBaseAccent(color)}
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
      <div className={styles.tablesTabBar}>
        <div className={styles.tablesTabBarLeft}>
          <div className={styles.tablesTabBarTabs}>
            {visibleTables.map((tableItem) => {
              const isActive = tableItem.id === activeTableId;
              return (
                <div
                  key={tableItem.id}
                  data-table-tab-id={tableItem.id}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={0}
                  className={`${styles.tableTab} ${
                    isActive ? styles.tableTabActive : styles.tableTabInactive
                  }`}
                  onClick={() => setActiveTableId(tableItem.id)}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openRenameTablePopover(tableItem.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setActiveTableId(tableItem.id);
                    }
                  }}
                >
                  {!isActive && (
                    <div className={styles.tableTabHighlight} aria-hidden="true" />
                  )}
                  <span>{tableItem.name}</span>
                  {isActive ? (
                    <div
                      ref={tableTabMenuButtonRef}
                      className={styles.tableTabDropdown}
                      role="button"
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
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z" />
                      </svg>
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
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
              </svg>
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
                    return (
                      <button
                        key={tableItem.id}
                        type="button"
                        className={`${styles.tablesMenuItem} ${
                          isActive ? styles.tablesMenuItemActive : ""
                        }`}
                        role="menuitem"
                        onClick={() => {
                          setHiddenTableIds((prev) =>
                            prev.includes(tableItem.id)
                              ? prev.filter((id) => id !== tableItem.id)
                              : prev,
                          );
                          setActiveTableId(tableItem.id);
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
              <button type="button" className={styles.tableTabMenuItem}>
                <span className={styles.tableTabMenuItemIcon} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 2a1 1 0 011-1h6l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V2zm7 0v2h2L10 2zM5 6h6v1H5V6zm0 3h6v1H5V9z" />
                  </svg>
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
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 11.5V14h2.5l7.1-7.1-2.5-2.5L2 11.5zm10.7-7.2c.4-.4.4-1 0-1.4l-1.6-1.6c-.4-.4-1-.4-1.4 0l-1.2 1.2 2.5 2.5 1.7-1.7z" />
                  </svg>
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
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 3C4 3 1.5 8 1.5 8S4 13 8 13s6.5-5 6.5-5S12 3 8 3zm0 8a3 3 0 110-6 3 3 0 010 6zm6.3 3.3l-2.2-2.2-1 1 2.2 2.2a.7.7 0 001 0 .7.7 0 000-1z" />
                  </svg>
                </span>
                <span className={styles.tableTabMenuItemLabel}>Hide table</span>
              </button>
              <button type="button" className={styles.tableTabMenuItem}>
                <span className={styles.tableTabMenuItemIcon} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 3h12v2H2V3zm0 4h8v2H2V7zm0 4h12v2H2v-2z" />
                  </svg>
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
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 2h8a2 2 0 012 2v8h-2V4H4V2zm-2 4h8a2 2 0 012 2v6H2a2 2 0 01-2-2V6h2z" />
                  </svg>
                </span>
                <span className={styles.tableTabMenuItemLabel}>Duplicate table</span>
              </button>
              <div className={styles.tableTabMenuDivider} />
              <button type="button" className={styles.tableTabMenuItem}>
                <span className={styles.tableTabMenuItemIcon} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 2a6 6 0 106 6A6 6 0 008 2zm1 3v3.2l2.3 1.3-.8 1.4L7 9V5z" />
                  </svg>
                </span>
                <span className={styles.tableTabMenuItemLabel}>
                  Configure date dependencies
                </span>
              </button>
              <div className={styles.tableTabMenuDivider} />
              <button type="button" className={styles.tableTabMenuItem}>
                <span className={styles.tableTabMenuItemIcon} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 3h12v10H2V3zm2 2v6h8V5H4z" />
                  </svg>
                </span>
                <span className={styles.tableTabMenuItemLabel}>
                  Edit table description
                </span>
              </button>
              <button type="button" className={styles.tableTabMenuItem}>
                <span className={styles.tableTabMenuItemIcon} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 1a3 3 0 013 3v2h1a2 2 0 012 2v5a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h1V4a3 3 0 013-3zm-1 5h2V4a1 1 0 00-2 0v2z" />
                  </svg>
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
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 4h10v1H3V4zm1 2h8l-1 8H5L4 6zm2-3h4l1 1H5l1-1z" />
                  </svg>
                </span>
                <span className={styles.tableTabMenuItemLabel}>Clear data</span>
              </button>
              <button
                type="button"
                className={`${styles.tableTabMenuItem} ${styles.tableTabMenuItemDanger}`}
                onClick={() => {
                  void handleDeleteActiveTable();
                }}
                disabled={isTableTabActionPending}
              >
                <span className={styles.tableTabMenuItemIcon} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M3 4h10v1H3V4zm1 2h8l-1 8H5L4 6zm2-3h4l1 1H5l1-1z" />
                  </svg>
                </span>
                <span className={styles.tableTabMenuItemLabel}>Delete table</span>
              </button>
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
                  onChange={(event) => setRenameTableValue(event.target.value)}
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
                    onClick={closeRenameTablePopover}
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
            className={styles.toolsDropdown}
            aria-expanded={isToolsMenuOpen}
            aria-controls="tools-menu"
            onClick={() => setIsToolsMenuOpen((prev) => !prev)}
          >
            <span>Tools</span>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
            </svg>
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
      </div>

      <div
        className={`${styles.table} ${!isViewsSidebarOpen ? styles.tableCollapsed : ""} ${
          isResizingSidebar ? styles.tableResizing : ""
        }`}
        style={{
          ["--views-sidebar-width" as keyof React.CSSProperties]: `${sidebarWidth}px`,
          gridTemplateColumns: `${isViewsSidebarOpen ? sidebarWidth : 0}px 1fr`,
        }}
      >
        {/* View Bar - Top Toolbar */}
        <div className={styles.viewBar}>
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
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={styles.dropdownIcon}>
                    <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
                  </svg>
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
                  <button type="button" className={styles.viewMenuItem}>
                    <span className={styles.viewMenuItemIcon} aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1.5a3.5 3.5 0 013.5 3.5v1.5H14a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1v-5a1 1 0 011-1h2.5V5A3.5 3.5 0 018 1.5zm-2 5h4V5a2 2 0 00-4 0v1.5z" />
                      </svg>
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
                    onClick={() => {
                      setIsViewMenuOpen(false);
                      startEditingViewName();
                    }}
                    disabled={!activeView || isViewActionPending}
                  >
                    <span className={styles.viewMenuItemIcon} aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2 11.5V14h2.5l7.1-7.1-2.5-2.5L2 11.5zm10.7-7.2c.4-.4.4-1 0-1.4l-1.6-1.6c-.4-.4-1-.4-1.4 0l-1.2 1.2 2.5 2.5 1.7-1.7z" />
                      </svg>
                    </span>
                    <span className={styles.viewMenuItemLabel}>Rename view</span>
                  </button>
                  <button type="button" className={styles.viewMenuItem}>
                    <span className={styles.viewMenuItemIcon} aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M2 3h12v10H2V3zm2 2v6h8V5H4z" />
                      </svg>
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
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M4 2h8a2 2 0 012 2v8h-2V4H4V2zm-2 4h8a2 2 0 012 2v6H2a2 2 0 01-2-2V6h2z" />
                      </svg>
                    </span>
                    <span className={styles.viewMenuItemLabel}>Duplicate view</span>
                  </button>
                  <div className={styles.viewMenuDivider} />
                  <button type="button" className={styles.viewMenuItem}>
                    <span className={styles.viewMenuItemIcon} aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M3 2h10v12H3V2zm2 3h6v1H5V5zm0 3h6v1H5V8zm0 3h4v1H5v-1z" />
                      </svg>
                    </span>
                    <span className={styles.viewMenuItemLabel}>Download CSV</span>
                  </button>
                  <button type="button" className={styles.viewMenuItem}>
                    <span className={styles.viewMenuItemIcon} aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M3 2h10v3H3V2zm0 4h10v6H3V6zm1 7h8v1H4v-1z" />
                      </svg>
                    </span>
                    <span className={styles.viewMenuItemLabel}>Print view</span>
                  </button>
                  <div className={styles.viewMenuDivider} />
                  <button
                    type="button"
                    className={`${styles.viewMenuItem} ${styles.viewMenuItemDanger}`}
                    onClick={handleDeleteActiveView}
                    disabled={!canDeleteActiveView || isViewActionPending}
                  >
                    <span className={styles.viewMenuItemIcon} aria-hidden="true">
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M3 4h10v1H3V4zm1 2h8l-1 8H5L4 6zm2-3h4l1 1H5l1-1z" />
                      </svg>
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
                  aria-expanded={isHideFieldsMenuOpen}
                  aria-controls="hide-fields-menu"
                  onClick={() => setIsHideFieldsMenuOpen((prev) => !prev)}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    shapeRendering="geometricPrecision"
                    className={styles.toolbarButtonIcon}
                    aria-hidden="true"
                  >
                    <path
                      d="M1.5 8s2.5-4 6.5-4 6.5 4 6.5 4-2.5 4-6.5 4-6.5-4-6.5-4z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <circle
                      cx="8"
                      cy="8"
                      r="2.25"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.25"
                    />
                    <path
                      d="M2.5 2.5l11 11"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                    />
                  </svg>
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
                      <button
                        type="button"
                        className={styles.hideFieldsMenuInfo}
                        aria-label="Learn more about hiding fields"
                      >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                          <path d="M8 1.5a6.5 6.5 0 110 13 6.5 6.5 0 010-13zm0 2a1 1 0 00-.93.64.75.75 0 11-1.4-.55A2.5 2.5 0 018 2.75a2.5 2.5 0 011.66 4.38c-.56.5-.91.89-.91 1.62a.75.75 0 01-1.5 0c0-1.45.84-2.2 1.42-2.72A1 1 0 008 4.25zm0 6.25a.9.9 0 100 1.8.9.9 0 000-1.8z" />
                        </svg>
                      </button>
                    </div>
                    <ul className={styles.hideFieldsMenuList}>
                      {filteredHideFields.map((field) => {
                        const isVisible = columnVisibility[field.id] !== false;
                        return (
                          <li key={field.id} className={styles.hideFieldsMenuItemRow}>
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
                                {renderHideFieldIcon(field.icon)}
                              </span>
                              <span className={styles.hideFieldsMenuField}>{field.label}</span>
                            </button>
                            <button
                              type="button"
                              className={styles.hideFieldsMenuDrag}
                              aria-label={`Reorder ${field.label}`}
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M5 3h2v2H5V3zm0 4h2v2H5V7zm0 4h2v2H5v-2zm4-8h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2z" />
                              </svg>
                            </button>
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
              </div>
              <div className={styles.filterWrapper}>
                <button
                  ref={filterButtonRef}
                  type="button"
                  className={`${styles.toolbarButton} ${
                    activeFilterCount > 0 ? styles.toolbarButtonHighlighted : ""
                  }`}
                  aria-expanded={isFilterMenuOpen}
                  aria-controls="filter-menu"
                  onClick={() => setIsFilterMenuOpen((prev) => !prev)}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M2 4.25h12v1.5H2v-1.5zm2.25 3.5h7.5v1.5h-7.5v-1.5zm2.5 3.5h2.5v1.5h-2.5v-1.5z" />
                  </svg>
                  {activeFilterCount > 0 ? `Filter (${activeFilterCount})` : "Filter"}
                </button>
                {isFilterMenuOpen ? (
                  <div
                    id="filter-menu"
                    ref={filterMenuRef}
                    className={styles.filterMenu}
                    role="dialog"
                    aria-label="Filter rows"
                    style={filterMenuPosition}
                  >
                    <div className={styles.filterMenuHeader}>
                      <h3 className={styles.filterMenuTitle}>Filter</h3>
                    </div>
                    <div className={styles.filterMenuSubhead}>In this view, show records</div>
                    <div className={styles.filterMenuConditions}>
                      {filterConditions.length === 0 ? (
                        <div className={styles.filterMenuEmpty}>
                          No filter conditions are applied.
                        </div>
                      ) : null}
                      {filterConditions.map((condition, index) => (
                        <div key={condition.id} className={styles.filterConditionRow}>
                          <div className={styles.filterConditionPrefix}>
                            {index === 0 ? (
                              <span>Where</span>
                            ) : (
                              <select
                                className={styles.filterConditionJoinSelect}
                                value={condition.join}
                                onChange={(event) =>
                                  updateFilterCondition(condition.id, (current) => ({
                                    ...current,
                                    join: event.target.value as FilterJoin,
                                  }))
                                }
                              >
                                {FILTER_JOIN_ITEMS.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                          <select
                            className={styles.filterConditionFieldSelect}
                            value={condition.columnId}
                            onChange={(event) =>
                              updateFilterCondition(condition.id, (current) => ({
                                ...current,
                                columnId: event.target.value,
                              }))
                            }
                          >
                            {tableFields.map((field) => (
                              <option key={field.id} value={field.id}>
                                {field.label}
                              </option>
                            ))}
                          </select>
                          <select
                            className={styles.filterConditionOperatorSelect}
                            value={condition.operator}
                            onChange={(event) =>
                              updateFilterCondition(condition.id, (current) => ({
                                ...current,
                                operator: event.target.value as FilterOperator,
                              }))
                            }
                          >
                            {FILTER_OPERATOR_ITEMS.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                          {operatorRequiresValue(condition.operator) ? (
                            <input
                              type="text"
                              className={styles.filterConditionValueInput}
                              value={condition.value}
                              onChange={(event) =>
                                updateFilterCondition(condition.id, (current) => ({
                                  ...current,
                                  value: event.target.value,
                                }))
                              }
                              placeholder="Enter a value"
                            />
                          ) : (
                            <div className={styles.filterConditionValueDisabled}>No value</div>
                          )}
                          <button
                            type="button"
                            className={styles.filterConditionDelete}
                            onClick={() => removeFilterCondition(condition.id)}
                            aria-label="Remove filter condition"
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                              <path d="M3 4h10v1H3V4zm1 2h8l-1 8H5L4 6zm2-3h4l1 1H5l1-1z" />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className={styles.filterMenuActions}>
                      <button
                        type="button"
                        className={styles.filterMenuActionPrimary}
                        onClick={addFilterCondition}
                        disabled={tableFields.length === 0}
                      >
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                          <path d="M7.25 2.5h1.5v4.75H13.5v1.5H8.75v4.75h-1.5V8.75H2.5v-1.5h4.75V2.5z" />
                        </svg>
                        Add condition
                      </button>
                      <button type="button" className={styles.filterMenuActionSecondary} disabled>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                          <path d="M7.25 2.5h1.5v4.75H13.5v1.5H8.75v4.75h-1.5V8.75H2.5v-1.5h4.75V2.5z" />
                        </svg>
                        Add condition group
                      </button>
                      <button
                        type="button"
                        className={styles.filterMenuActionClear}
                        onClick={() => setFilterConditions([])}
                        disabled={filterConditions.length === 0}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className={styles.groupWrapper}>
                <button
                  ref={groupButtonRef}
                  type="button"
                  className={styles.toolbarButton}
                  aria-expanded={isGroupMenuOpen}
                  aria-controls="group-menu"
                  onClick={() => setIsGroupMenuOpen((prev) => !prev)}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M2 3.5h12V5H2V3.5zm2.25 3.75h7.5v1.5h-7.5v-1.5zm2.25 3.75h3v1.5h-3V11z" />
                  </svg>
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
                  className={styles.toolbarButton}
                  aria-expanded={isSortMenuOpen}
                  aria-controls="sort-menu"
                  onClick={() => setIsSortMenuOpen((prev) => !prev)}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M8.75 2.5v8.19l2.22-2.22 1.06 1.06L8 13.56 3.97 9.53l1.06-1.06 2.22 2.22V2.5h1.5z" />
                  </svg>
                  Sort
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
                      <div className={styles.sortMenuHeader}>
                        <div className={styles.sortMenuTitleWrap}>
                          <p className={styles.sortMenuTitle}>Sort by</p>
                          <button
                            type="button"
                            className={styles.sortMenuHelp}
                            aria-label="Learn more about sorting"
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                              <path d="M8 1.25a6.75 6.75 0 110 13.5 6.75 6.75 0 010-13.5zm0 1.5a5.25 5.25 0 100 10.5 5.25 5.25 0 000-10.5zm-.04 6.79a.76.76 0 01.75.75v.08a.75.75 0 01-1.5 0v-.08a.75.75 0 01.75-.75zm.4-4.57c.97 0 1.68.58 1.68 1.5 0 .69-.34 1.16-.91 1.53-.39.26-.56.46-.56.81v.11H7.13v-.17c0-.9.42-1.37.97-1.72.34-.22.5-.4.5-.65 0-.3-.22-.53-.58-.53-.4 0-.64.22-.66.62H5.94c.04-1.03.89-1.5 1.92-1.5z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className={styles.sortMenuDivider} />
                      <div className={styles.sortMenuSearch}>
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                          <path d="M11.74 10.34a6.5 6.5 0 10-1.4 1.4l3.85 3.85a1 1 0 001.41-1.41l-3.86-3.84zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z" />
                        </svg>
                        <input
                          type="text"
                          className={styles.sortMenuSearchInput}
                          placeholder="Find a field"
                          value={sortFieldSearch}
                          onChange={(event) => setSortFieldSearch(event.target.value)}
                        />
                      </div>
                      <div className={styles.sortMenuList}>
                        {filteredSortFields.map((field) => {
                          const isActive = sorting[0]?.id === field.sortId;
                          return (
                            <button
                              key={field.id}
                              type="button"
                              className={`${styles.sortMenuItem} ${isActive ? styles.sortMenuItemActive : ""}`}
                              onClick={() => {
                                setSorting([{ id: field.sortId, desc: false }]);
                                setIsSortMenuOpen(false);
                              }}
                            >
                              <span className={styles.sortMenuItemIcon}>{renderSortFieldIcon(field.icon)}</span>
                              <span>{field.label}</span>
                            </button>
                          );
                        })}
                        {filteredSortFields.length === 0 ? (
                          <div className={styles.sortMenuEmpty}>No matching fields</div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className={styles.colorWrapper}>
                <button
                  ref={colorButtonRef}
                  type="button"
                  className={styles.toolbarButton}
                  aria-expanded={isColorMenuOpen}
                  aria-controls="color-menu"
                  onClick={() => setIsColorMenuOpen((prev) => !prev)}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M2.5 2.5h4l7 7-4 4-7-7v-4zm1.5 1.5v2.38l5.5 5.5 1.88-1.88-5.5-5.5H4zm1.25.75a.75.75 0 100 1.5.75.75 0 000-1.5z" />
                  </svg>
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
                  aria-expanded={isRowHeightMenuOpen}
                  aria-controls="row-height-menu"
                  onClick={() => setIsRowHeightMenuOpen((prev) => !prev)}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M2.5 3.25h11v1.5h-11v-1.5zm0 4h11v1.5h-11v-1.5zm0 4h11v1.5h-11v-1.5z" />
                  </svg>
                  Row height
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
                  className={styles.toolbarButton}
                  aria-expanded={isShareSyncMenuOpen}
                  aria-controls="share-sync-menu"
                  onClick={() => setIsShareSyncMenuOpen((prev) => !prev)}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M9.25 2.5a.75.75 0 011.28-.53l3.5 3.5-.53.53.53-.53a.75.75 0 010 1.06l-3.5 3.5a.75.75 0 11-1.06-1.06l2.22-2.22H5.75a2.25 2.25 0 00-2.25 2.25v3A2.25 2.25 0 005.75 14h6.5a2.25 2.25 0 002.25-2.25V11a.75.75 0 011.5 0v.75a3.75 3.75 0 01-3.75 3.75h-6.5A3.75 3.75 0 012 11.75v-3A3.75 3.75 0 015.75 5.5h5.94L9.47 3.28a.75.75 0 01-.22-.53z" />
                  </svg>
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
        </div>

        {/* Left Sidebar - Navigation */}
        <nav ref={leftNavRef} className={styles.leftNav}>
          <div className={styles.leftNavContent}>
            <button
              ref={createViewButtonRef}
              type="button"
              className={styles.createViewButton}
              aria-expanded={isCreateViewMenuOpen}
              aria-controls="create-view-menu"
              onClick={() => setIsCreateViewMenuOpen((prev) => !prev)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z"/>
              </svg>
              Create new...
            </button>
            {isCreateViewMenuOpen ? (
              <div
                id="create-view-menu"
                ref={createViewMenuRef}
                className={styles.createViewMenu}
                role="menu"
                style={createViewMenuPosition}
              >
                <button
                  type="button"
                  className={styles.createViewMenuItem}
                  onClick={handleCreateGridView}
                  disabled={!activeTableId || isViewActionPending}
                >
                  <span className={styles.createViewMenuIcon} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v3.585a.746.746 0 010 .83v8.085c0 .966-.784 1.75-1.75 1.75H1.75A1.75 1.75 0 010 14.25V6.165a.746.746 0 010-.83V1.75zM1.5 6.5v7.75c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V6.5h-13zM14.5 5V1.75a.25.25 0 00-.25-.25H1.75a.25.25 0 00-.25.25V5h13z"/>
                    </svg>
                  </span>
                  <span className={styles.createViewMenuLabel}>Grid</span>
                </button>
                <button type="button" className={styles.createViewMenuItem}>
                  <span className={styles.createViewMenuIcon} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 2h12v12H2V2zm2 3h8v2H4V5zm0 4h8v2H4V9z" />
                    </svg>
                  </span>
                  <span className={styles.createViewMenuLabel}>Calendar</span>
                </button>
                <button type="button" className={styles.createViewMenuItem}>
                  <span className={styles.createViewMenuIcon} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 3h12v10H2V3zm2 2h3v3H4V5zm5 0h3v3H9V5zM4 10h3v2H4v-2zm5 0h3v2H9v-2z" />
                    </svg>
                  </span>
                  <span className={styles.createViewMenuLabel}>Gallery</span>
                </button>
                <button type="button" className={styles.createViewMenuItem}>
                  <span className={styles.createViewMenuIcon} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 3h6v4H2V3zm0 6h6v4H2V9zm8-6h4v10h-4V3z" />
                    </svg>
                  </span>
                  <span className={styles.createViewMenuLabel}>Kanban</span>
                </button>
                <button type="button" className={styles.createViewMenuItem}>
                  <span className={styles.createViewMenuIcon} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 4h12v2H2V4zm0 4h8v2H2V8zm0 4h12v2H2v-2z" />
                    </svg>
                  </span>
                  <span className={styles.createViewMenuLabel}>Timeline</span>
                  <span className={styles.createViewMenuTag}>Team</span>
                </button>
                <button type="button" className={styles.createViewMenuItem}>
                  <span className={styles.createViewMenuIcon} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3 3h10v2H3V3zm0 4h10v2H3V7zm0 4h10v2H3v-2z" />
                    </svg>
                  </span>
                  <span className={styles.createViewMenuLabel}>List</span>
                </button>
                <button type="button" className={styles.createViewMenuItem}>
                  <span className={styles.createViewMenuIcon} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 3h12v3H2V3zm0 5h8v3H2V8zm0 5h12v3H2v-3z" />
                    </svg>
                  </span>
                  <span className={styles.createViewMenuLabel}>Gantt</span>
                  <span className={styles.createViewMenuTag}>Team</span>
                </button>
                <div className={styles.createViewMenuDivider} />
                <button
                  type="button"
                  className={styles.createViewMenuItem}
                  onClick={handleCreateFormView}
                  disabled={!activeTableId || isViewActionPending}
                >
                  <span className={styles.createViewMenuIcon} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3 2h10v12H3V2zm2 3h6v1H5V5zm0 3h6v1H5V8zm0 3h4v1H5v-1z" />
                    </svg>
                  </span>
                  <span className={styles.createViewMenuLabel}>Form</span>
                </button>
                <button type="button" className={styles.createViewMenuItem}>
                  <span className={styles.createViewMenuIcon} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 3h12v2H2V3zm0 4h12v2H2V7zm0 4h12v2H2v-2z" />
                    </svg>
                  </span>
                  <span className={styles.createViewMenuLabel}>Section</span>
                  <span className={styles.createViewMenuTag}>Team</span>
                </button>
              </div>
            ) : null}
            <div className={styles.viewSearch}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/>
              </svg>
              <span>Find a view</span>
            </div>
            <div className={styles.viewList}>
              {favoriteViews.length > 0 ? (
                <div className={styles.favoriteViewsSection}>
                  <div className={styles.favoriteViewsHeader}>
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className={styles.favoriteViewsStar}
                      aria-hidden="true"
                    >
                      <path d="M8 1.5l1.82 3.69 4.08.59-2.95 2.87.7 4.06L8 10.79l-3.65 1.92.7-4.06L2.1 5.78l4.08-.59L8 1.5z" />
                    </svg>
                    <span>My favorites</span>
                  </div>
                  <div className={styles.favoriteViewsList}>
                    {favoriteViews.map((view) => {
                      const viewKind = resolveSidebarViewKind(view);
                      const isActive = view.id === activeView?.id;
                      return (
                        <div
                          key={`favorite-${view.id}`}
                          className={`${styles.viewListItem} ${styles.favoriteViewListItem} ${
                            isActive ? styles.viewListItemActive : ""
                          } ${
                            sidebarViewContextMenu?.viewId === view.id
                              ? styles.viewListItemMenuTarget
                              : ""
                          }`}
                          role="button"
                          tabIndex={0}
                          onClick={() => selectView(view.id, view.name)}
                          onContextMenu={(event) =>
                            openSidebarViewContextMenu(event, view.id)
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              selectView(view.id, view.name);
                            }
                          }}
                        >
                          {renderSidebarViewIcon(viewKind)}
                          <span>{view.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {tableViews.map((view) => {
                const viewKind = resolveSidebarViewKind(view);
                const isActive = view.id === activeView?.id;
                return (
                  <div
                    key={view.id}
                    className={`${styles.viewListItem} ${
                      isActive ? styles.viewListItemActive : ""
                    } ${
                      sidebarViewContextMenu?.viewId === view.id
                        ? styles.viewListItemMenuTarget
                        : ""
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => selectView(view.id, view.name)}
                    onContextMenu={(event) => openSidebarViewContextMenu(event, view.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        selectView(view.id, view.name);
                      }
                    }}
                  >
                    {renderSidebarViewIcon(viewKind)}
                    <span>{view.name}</span>
                  </div>
                );
              })}
              {!viewsQuery.isLoading && tableViews.length === 0 ? (
                <div className={styles.viewListItem}>No views yet</div>
              ) : null}
            </div>
            {sidebarViewContextMenu && sidebarContextView ? (
              <div
                ref={sidebarViewContextMenuRef}
                className={styles.sidebarViewContextMenu}
                role="menu"
                style={{
                  top: sidebarViewContextMenu.top,
                  left: sidebarViewContextMenu.left,
                }}
                onContextMenu={(event) => event.preventDefault()}
              >
                <button
                  type="button"
                  className={styles.sidebarViewContextMenuItem}
                  onClick={() => {
                    toggleViewFavorite(sidebarContextView.id);
                    setSidebarViewContextMenu(null);
                  }}
                >
                  <span className={styles.sidebarViewContextMenuItemIcon} aria-hidden="true">
                    {favoriteViewIdSet.has(sidebarContextView.id) ? (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1.5l1.82 3.69 4.08.59-2.95 2.87.7 4.06L8 10.79l-3.65 1.92.7-4.06L2.1 5.78l4.08-.59L8 1.5z" />
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M8 1.5l1.82 3.69 4.08.59-2.95 2.87.7 4.06L8 10.79l-3.65 1.92.7-4.06L2.1 5.78l4.08-.59L8 1.5z"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </span>
                  <span className={styles.sidebarViewContextMenuItemLabel}>
                    {favoriteViewIdSet.has(sidebarContextView.id)
                      ? "Remove from 'My favorites'"
                      : "Add to 'My favorites'"}
                  </span>
                </button>
                <div className={styles.sidebarViewContextMenuDivider} />
                <button
                  type="button"
                  className={styles.sidebarViewContextMenuItem}
                  onClick={() => handleRenameViewById(sidebarContextView.id)}
                  disabled={isViewActionPending}
                >
                  <span className={styles.sidebarViewContextMenuItemIcon} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M2 11.5V14h2.5l7.1-7.1-2.5-2.5L2 11.5zm10.7-7.2c.4-.4.4-1 0-1.4l-1.6-1.6c-.4-.4-1-.4-1.4 0l-1.2 1.2 2.5 2.5 1.7-1.7z" />
                    </svg>
                  </span>
                  <span className={styles.sidebarViewContextMenuItemLabel}>
                    Rename {sidebarContextViewKindLabel}
                  </span>
                </button>
                <button
                  type="button"
                  className={styles.sidebarViewContextMenuItem}
                  onClick={() => handleDuplicateViewById(sidebarContextView.id)}
                  disabled={isViewActionPending}
                >
                  <span className={styles.sidebarViewContextMenuItemIcon} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M4 2h8a2 2 0 012 2v8h-2V4H4V2zm-2 4h8a2 2 0 012 2v6H2a2 2 0 01-2-2V6h2z" />
                    </svg>
                  </span>
                  <span className={styles.sidebarViewContextMenuItemLabel}>
                    Duplicate {sidebarContextViewKindLabel}
                  </span>
                </button>
                <button
                  type="button"
                  className={`${styles.sidebarViewContextMenuItem} ${styles.sidebarViewContextMenuItemDanger}`}
                  onClick={() => handleDeleteViewById(sidebarContextView.id)}
                  disabled={tableViews.length <= 1 || isViewActionPending}
                >
                  <span className={styles.sidebarViewContextMenuItemIcon} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3 4h10v1H3V4zm1 2h8l-1 8H5L4 6zm2-3h4l1 1H5l1-1z" />
                    </svg>
                  </span>
                  <span className={styles.sidebarViewContextMenuItemLabel}>
                    Delete {sidebarContextViewKindLabel}
                  </span>
                </button>
              </div>
            ) : null}
          </div>
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
            onMouseDown={(event) => {
              const target = event.target as Element | null;
              if (!target) {
                clearActiveCell();
                return;
              }
              if (!target.closest('[data-cell="true"]')) {
                clearActiveCell();
              }
            }}
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={rowIds} strategy={verticalListSortingStrategy}>
            <table
              className={styles.tanstackTable}
              onDragOver={handleColumnHeaderDragOver}
              onDrop={handleColumnHeaderDrop}
            >
              <thead className={styles.tanstackHeader}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className={styles.tanstackHeaderRow}>
                    {headerGroup.headers.map((header) => {
                      const isRowNumber = header.column.id === "rowNumber";
                      const canSort = header.column.getCanSort();
                      const canResize = header.column.getCanResize();
                      const isDraggableColumn = !isRowNumber;
                      const isDraggingColumnHeader = draggingColumnId === header.column.id;
                      const isDropAnchorColumnHeader = columnDropAnchorId === header.column.id;
                      const sortToggleHandler = canSort
                        ? header.column.getToggleSortingHandler()
                        : undefined;
                      const sortState = header.column.getIsSorted();
                      const isAllSelected = table.getIsAllRowsSelected();
                      const isSomeSelected = table.getIsSomeRowsSelected();

                      // Render row number header with select all checkbox
                      if (isRowNumber) {
                        return (
                          <th
                            key={header.id}
                            className={`${styles.tanstackHeaderCell} ${styles.tanstackRowNumberHeader}`}
                            style={{ width: header.getSize() }}
                          >
                            <div className={styles.selectAllContainer}>
                              <input
                                type="checkbox"
                                className={styles.selectAllCheckbox}
                                checked={isAllSelected}
                                ref={(el) => {
                                  if (el) {
                                    el.indeterminate = isSomeSelected && !isAllSelected;
                                  }
                                }}
                                onChange={toggleAllRowsSelection}
                                aria-label="Select all rows"
                              />
                            </div>
                          </th>
                        );
                      }

                      return (
                        <th
                          key={header.id}
                          ref={(element) => registerColumnHeaderRef(header.column.id, element)}
                          className={`${styles.tanstackHeaderCell} ${
                            canSort ? styles.tanstackHeaderCellSortable : ""
                          } ${isDraggableColumn ? styles.tanstackHeaderCellDraggable : ""} ${
                            isDraggingColumnHeader ? styles.tanstackHeaderCellDragging : ""
                          } ${isDropAnchorColumnHeader ? styles.tanstackHeaderCellDropAnchor : ""}`}
                          style={{ width: header.getSize() }}
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
                          onClick={
                            sortToggleHandler
                              ? (event) => {
                                  if (isColumnDragging) return;
                                  sortToggleHandler(event);
                                }
                              : undefined
                          }
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
                              <span>
                                {flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                              </span>
                              {canSort ? (
                                <span className={styles.tanstackSortIndicator}>
                                  {sortState === "asc"
                                    ? "▲"
                                    : sortState === "desc"
                                      ? "▼"
                                      : "↕"}
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
                              onMouseDown={header.getResizeHandler()}
                              onTouchStart={header.getResizeHandler()}
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
                                <p className={styles.addColumnConfigSectionTitle}>Default</p>
                                <input
                                  type="text"
                                  className={styles.addColumnConfigDefaultInput}
                                  placeholder={selectedAddColumnConfig.defaultPlaceholder}
                                  value={addColumnDefaultValue}
                                  onChange={(event) => setAddColumnDefaultValue(event.target.value)}
                                />
                                <div className={styles.addColumnConfigActions}>
                                  <button
                                    type="button"
                                    className={styles.addColumnConfigAddDescription}
                                  >
                                    <span aria-hidden="true">+</span>
                                    <span>Add description</span>
                                  </button>
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
                                <div className={styles.addColumnConfigFooter}>
                                  <div className={styles.addColumnConfigFooterLabel}>
                                    <span className={styles.addColumnConfigFooterAgentIcon} aria-hidden="true">
                                      {renderAddColumnIcon("agent")}
                                    </span>
                                    <span>Automate this field with an agent</span>
                                    <span className={styles.addColumnConfigFooterInfo} aria-hidden="true">
                                      i
                                    </span>
                                  </div>
                                  <button type="button" className={styles.addColumnConfigConvert}>
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
                                            style={{ color: item.color }}
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
                  const row = tableRows[virtualRow.index];
                  if (!row) return null;
                  const rowIndex = virtualRow.index;
                  const isRowSelected = row.getIsSelected();
                  const rowId = row.original.id;
                  const showDropIndicator = overRowId === rowId && activeRowId !== rowId;
                  return (
                  <SortableTableRow
                    key={rowId}
                    rowId={rowId}
                    isRowSelected={isRowSelected}
                  >
                    {(dragHandleProps) => (
                      <>
                        {row.getVisibleCells().map((cell, columnIndex) => {
                          const isRowNumber = cell.column.id === "rowNumber";
                      const isEditable = !isRowNumber;
                      const canActivate = !isRowNumber;
                      const isEditing =
                        isEditable &&
                        editingCell?.rowIndex === row.index &&
                        editingCell.columnId === cell.column.id;
                      const isDropTarget = showDropIndicator && !isRowNumber;
                      const isDraggingColumnCell = draggingColumnId === cell.column.id;
                      const isDropAnchorColumnCell = columnDropAnchorId === cell.column.id;
                      const cellValue = cell.getValue();
                      const cellValueText =
                        typeof cellValue === "string"
                          ? cellValue
                          : typeof cellValue === "number"
                            ? String(cellValue)
                            : "";
                          const isActive =
                            activeCellId === cell.id &&
                            activeCellRowIndex === rowIndex;

                          // Render row number cell with checkbox and drag handle
                          if (isRowNumber) {
                            return (
                              <SortableRowCell
                                key={cell.id}
                                cellId={cell.id}
                                rowIndex={rowIndex}
                                columnIndex={columnIndex}
                                isRowSelected={isRowSelected}
                                rowDisplayIndex={row.index + 1}
                                registerCellRef={registerCellRef}
                                toggleSelected={() => row.toggleSelected()}
                                cellWidth={cell.column.getSize()}
                                dragHandleProps={dragHandleProps}
                              />
                            );
                          }

                          return (
                            <td
                              key={cell.id}
                              className={`${styles.tanstackCell} ${
                                isEditing ? styles.tanstackCellEditing : ""
                              } ${isDropTarget ? styles.tanstackCellDropTarget : ""} ${
                                isDraggingColumnCell ? styles.tanstackCellDragging : ""
                              } ${isDropAnchorColumnCell ? styles.tanstackCellDropAnchor : ""}`}
                              data-active={isActive ? "true" : undefined}
                              data-cell="true"
                              data-row-index={rowIndex}
                              style={{ width: cell.column.getSize() }}
                              ref={(el) => registerCellRef(rowIndex, columnIndex, el)}
                              onClick={() => {
                                if (!canActivate) return;
                                setActiveCell(cell.id, rowIndex, columnIndex);
                              }}
                              onFocus={() => {
                                if (!canActivate) return;
                                setActiveCell(cell.id, rowIndex, columnIndex);
                              }}
                              onDoubleClick={() => {
                                if (!isEditable) return;
                                startEditing(
                                  row.index,
                                  cell.column.id,
                                  cellValueText,
                                );
                              }}
                              tabIndex={0}
                            >
                              {isEditing ? (
                                <input
                                  className={styles.tanstackCellEditor}
                                  value={editingValue}
                                  onChange={(event) => setEditingValue(event.target.value)}
                                  onBlur={commitEdit}
                                  onClick={(event) => event.stopPropagation()}
                                  onKeyDown={(event) => {
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
                                flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext(),
                                )
                              )}
                            </td>
                          );
                        })}
                        <td className={styles.addColumnCell} aria-hidden="true"></td>
                      </>
                    )}
                  </SortableTableRow>
                );})}
                {virtualPaddingBottom > 0 ? (
                  <tr className={styles.tanstackVirtualSpacerRow} aria-hidden="true">
                    <td
                      colSpan={tableBodyColSpan}
                      className={styles.tanstackVirtualSpacerCell}
                      style={{ height: `${virtualPaddingBottom}px` }}
                    />
                  </tr>
                ) : null}
                <tr className={styles.tanstackAddRowContainer}>
                  <td className={`${styles.tanstackRowNumberCell} ${styles.addRowFirstCell}`}>
                    <button
                      type="button"
                      onClick={addRow}
                      className={styles.addRowPlusButton}
                      aria-label="Add row"
                    >
                      +
                    </button>
                  </td>
                  {table.getVisibleLeafColumns().length > 1 ? (
                    <td
                      colSpan={table.getVisibleLeafColumns().length - 1}
                      className={styles.addRowFillCell}
                      aria-hidden="true"
                    />
                  ) : null}
                  <td className={styles.addColumnCellAddRow}></td>
                </tr>
                {isFetchingNextServerRows ? (
                  <tr className={styles.tanstackLoadingRow}>
                    <td colSpan={tableBodyColSpan} className={styles.tanstackLoadingCell}>
                      Loading more rows...
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            {isColumnDragging && columnDropIndicatorLeft !== null ? (
              <div
                className={styles.columnDropIndicator}
                style={{ left: columnDropIndicatorLeft }}
                aria-hidden="true"
              />
            ) : null}
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
                    className={styles.fieldContextMenuItem}
                    onClick={closeColumnFieldMenu}
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
                    className={styles.fieldContextMenuItem}
                    onClick={closeColumnFieldMenu}
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("copyUrl")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Copy field URL</span>
                  </button>
                  <button
                    type="button"
                    className={styles.fieldContextMenuItem}
                    onClick={closeColumnFieldMenu}
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("description")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Edit field description</span>
                  </button>
                  <button
                    type="button"
                    className={styles.fieldContextMenuItem}
                    onClick={closeColumnFieldMenu}
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
                    onClick={closeColumnFieldMenu}
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("filter")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Filter by this field</span>
                  </button>
                  <button
                    type="button"
                    className={styles.fieldContextMenuItem}
                    onClick={closeColumnFieldMenu}
                  >
                    <span className={styles.fieldContextMenuItemIcon} aria-hidden="true">
                      {renderColumnFieldMenuIcon("group")}
                    </span>
                    <span className={styles.fieldContextMenuItemLabel}>Group by this field</span>
                  </button>
                  <button
                    type="button"
                    className={styles.fieldContextMenuItem}
                    onClick={closeColumnFieldMenu}
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
                  <div className={styles.editFieldTypeSelectWrap}>
                    <span className={styles.editFieldTypeIcon} aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1.5a3.5 3.5 0 013.5 3.5v1.5H14a1 1 0 011 1v5a1 1 0 01-1 1H2a1 1 0 01-1-1v-5a1 1 0 011-1h2.5V5A3.5 3.5 0 018 1.5zm-2 5h4V5a2 2 0 00-4 0v1.5z" />
                      </svg>
                    </span>
                    <select
                      className={styles.editFieldTypeSelect}
                      value={editFieldKind}
                      onChange={(event) =>
                        setEditFieldKind(event.target.value as TableFieldKind)
                      }
                    >
                      <option value="singleLineText">Single line text</option>
                      <option value="number">Number</option>
                    </select>
                  </div>
                  <p className={styles.editFieldHelpText}>
                    {editFieldKind === "number"
                      ? "Store and format numeric values."
                      : "Add text values for this field."}
                  </p>
                  <button
                    type="button"
                    className={styles.editFieldToggleRow}
                    onClick={() =>
                      setEditFieldAllowMultipleUsers((current) => !current)
                    }
                  >
                    <span>Allow adding multiple users</span>
                    <span
                      className={`${styles.editFieldToggle} ${
                        editFieldAllowMultipleUsers ? styles.editFieldToggleOn : ""
                      }`}
                      aria-hidden="true"
                    >
                      <span className={styles.editFieldToggleKnob} />
                    </span>
                  </button>
                  <button
                    type="button"
                    className={styles.editFieldToggleRow}
                    onClick={() => setEditFieldNotifyUsers((current) => !current)}
                  >
                    <span>Notify users with base access when they are added</span>
                    <span
                      className={`${styles.editFieldToggle} ${
                        editFieldNotifyUsers ? styles.editFieldToggleOn : ""
                      }`}
                      aria-hidden="true"
                    >
                      <span className={styles.editFieldToggleKnob} />
                    </span>
                  </button>
                  <div className={styles.editFieldDivider} />
                  <label className={styles.editFieldDefaultLabel}>Default option</label>
                  <select className={styles.editFieldDefaultSelect}>
                    <option>Select an option</option>
                    <option>None</option>
                  </select>
                  {isEditFieldDescriptionOpen ? (
                    <textarea
                      className={styles.editFieldDescriptionInput}
                      value={editFieldDescription}
                      onChange={(event) => setEditFieldDescription(event.target.value)}
                      placeholder="Add description"
                    />
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
                </form>
              </div>
            ) : null}
              </SortableContext>
              <DragOverlay>
                {activeRowId ? (
                  <div className={styles.dragOverlay}>
                    <div className={styles.dragOverlayContent}>
                      {(() => {
                        const activeRow = data.find((row) => row.id === activeRowId);
                        if (!activeRow) return null;
                        const primaryField = tableFields[0];
                        const statusField = tableFields.find(
                          (field) => field.label.toLowerCase() === "status",
                        );
                        const primaryText = primaryField
                          ? activeRow[primaryField.id]
                          : "";
                        const statusText = statusField
                          ? activeRow[statusField.id]
                          : "";
                        return (
                          <>
                            <span className={styles.dragOverlayName}>{primaryText ?? "Untitled"}</span>
                            {statusText ? (
                              <span className={styles.dragOverlayStatus}>{statusText}</span>
                            ) : null}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
          <div className={styles.tableBottomControls}>
            <div className={styles.tableBottomActions}>
              <div className={styles.tableBottomAddGroup}>
                <button
                  type="button"
                  className={styles.tableBottomPlusButton}
                  onClick={addRow}
                  aria-label="Add record"
                >
                  +
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
                  <span>Add...</span>
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
                        addRow();
                        setIsBottomAddRecordMenuOpen(false);
                      }}
                    >
                      <span className={styles.tableBottomAddMenuItemIcon} aria-hidden="true">
                        +
                      </span>
                      <span>Add a record</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.tableBottomAddMenuItem} ${styles.tableBottomAddMenuItemDisabled}`}
                      disabled
                    >
                      <span className={styles.tableBottomAddMenuItemIcon} aria-hidden="true">
                        ↥
                      </span>
                      <span>Create records from attachments</span>
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                ref={debugAddRowsButtonRef}
                type="button"
                className={styles.tableBottomDebugButton}
                disabled={createRowsGeneratedMutation.isPending}
                onClick={() => {
                  setIsBottomAddRecordMenuOpen(false);
                  setIsDebugAddRowsOpen((prev) => !prev);
                }}
              >
                Debug
              </button>
              <button
                type="button"
                className={styles.tableBottomBulkButton}
                onClick={handleAddOneHundredThousandRows}
                disabled={createRowsGeneratedMutation.isPending}
              >
                {createRowsGeneratedMutation.isPending ? "Adding 100k..." : "Add 100k rows"}
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
            <div className={styles.tableBottomRecordCount}>
              {data.length !== totalRecordCount
                ? `${data.length.toLocaleString()} loaded of ${totalRecordCount.toLocaleString()} records`
                : `${totalRecordCount.toLocaleString()} ${
                    totalRecordCount === 1 ? "record" : "records"
                  }`}
            </div>
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}
