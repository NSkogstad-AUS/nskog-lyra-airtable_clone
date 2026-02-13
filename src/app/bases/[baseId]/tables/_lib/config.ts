// UUID validation
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const EMPTY_UUID = "00000000-0000-0000-0000-000000000000";

// Default names
export const DEFAULT_BASE_NAME = "Untitled Base";
export const DEFAULT_GRID_VIEW_NAME = "Grid view";
export const DEFAULT_FORM_VIEW_NAME = "Form";

// Debounce and timing
export const BASE_NAME_SAVE_DEBOUNCE_MS = 350;

// Row operations
export const DEBUG_MAX_ROWS_PER_ADD = 1000;
export const ROWS_PAGE_SIZE = 200; // Smaller page size to reduce query/parse latency
export const ROWS_FETCH_AHEAD_THRESHOLD = 120; // Keep prefetching responsive with smaller pages
export const ROWS_VIRTUAL_OVERSCAN = 20; // Overscan during normal scrolling
export const ROWS_FAST_SCROLL_OVERSCAN = 50; // Generous overscan during scrollbar dragging
export const ROWS_FAST_SCROLL_THRESHOLD = 100; // rows/100ms to detect fast scrolling
export const ROWS_FAST_SCROLL_PREFETCH_PAGES = 5; // Pages to prefetch ahead during fast scroll
export const BULK_ADD_100K_ROWS_COUNT = 100000;
export const BULK_ADD_PROGRESS_BATCH_SIZE = 2000;
export const BULK_CELL_UPDATE_BATCH_SIZE = 1000;
export const ROW_DND_MAX_ROWS = 300;

// View-scoped state filter keys
export const VIEW_KIND_FILTER_KEY = "__viewKind";
export const VIEW_SEARCH_QUERY_FILTER_KEY = "__viewSearchQuery";
export const VIEW_SORTING_FILTER_KEY = "__viewSorting";
export const VIEW_FILTER_GROUPS_FILTER_KEY = "__viewFilterGroups";
export const VIEW_HIDDEN_FIELDS_FILTER_KEY = "__viewHiddenFields";

// Column widths
export const ROW_NUMBER_COLUMN_WIDTH = 84;
export const ADD_COLUMN_CELL_WIDTH = 94;

// Auto-created views tracking (mutable set for runtime state)
export const AUTO_CREATED_INITIAL_VIEW_TABLE_IDS = new Set<string>();
