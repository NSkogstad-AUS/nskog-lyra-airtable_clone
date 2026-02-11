import type {
  AddColumnKind,
  FilterJoin,
  FilterOperator,
  NumberAbbreviationId,
  NumberPickerOption,
  NumberPresetId,
  NumberSeparatorId,
  RowHeightOption,
  TableField,
} from "./types";

// Sidebar account menu disabled items
export const SIDEBAR_ACCOUNT_DISABLED_ITEMS = [
  "Account",
  "Manage groups",
  "Notification preferences",
  "Language preferences",
  "Appearance",
  "Contact sales",
  "Upgrade",
  "Tell a friend",
  "Integrations",
  "Builder hub",
  "Trash",
] as const;

// Omni visual constants
export const OMNI_BIT_PATH =
  "M0 7.68C0 4.99175 2.38419e-07 3.64762 0.523169 2.62085C0.983361 1.71767 1.71767 0.983361 2.62085 0.523169C3.64762 0 4.99175 0 7.68 0H8.32C11.0083 0 12.3524 0 13.3792 0.523169C14.2823 0.983361 15.0166 1.71767 15.4768 2.62085C16 3.64762 16 4.99175 16 7.68V8.32C16 11.0083 16 12.3524 15.4768 13.3792C15.0166 14.2823 14.2823 15.0166 13.3792 15.4768C12.3524 16 11.0083 16 8.32 16H7.68C4.99175 16 3.64762 16 2.62085 15.4768C1.71767 15.0166 0.983361 14.2823 0.523169 13.3792C2.38419e-07 12.3524 0 11.0083 0 8.32V7.68Z";

export const OMNI_ROTATIONS = [
  0, 32.72727272727273, 65.45454545454545, 98.18181818181819, 130.9090909090909,
  163.63636363636363, 196.36363636363637, 229.0909090909091, 261.8181818181818,
  294.54545454545456, 327.27272727272725,
] as const;

// Default table data
export const DEFAULT_TABLE_ROW_COUNT = 5;

export const DEFAULT_TABLE_STATUS_OPTIONS = [
  "In progress",
  "Review",
  "Planned",
  "Blocked",
] as const;

export const DEFAULT_TABLE_NOTES_PREFIXES = [
  "Kickoff notes",
  "Needs review",
  "Follow up",
  "Draft",
  "Waiting on",
  "Plan for",
] as const;

export const DEFAULT_TABLE_FIELDS: TableField[] = [
  { id: "name", label: "Name", kind: "singleLineText", size: 220, defaultValue: "" },
  { id: "notes", label: "Notes", kind: "singleLineText", size: 260, defaultValue: "" },
  { id: "assignee", label: "Assignee", kind: "singleLineText", size: 160, defaultValue: "" },
  { id: "status", label: "Status", kind: "singleLineText", size: 140, defaultValue: "" },
  { id: "attachments", label: "Attachments", kind: "singleLineText", size: 140, defaultValue: "—" },
];

// Row height options
export const ROW_HEIGHT_ITEMS = [
  { id: "short", label: "Short" },
  { id: "medium", label: "Medium" },
  { id: "tall", label: "Tall" },
  { id: "extraTall", label: "Extra Tall" },
] as const satisfies ReadonlyArray<{ id: RowHeightOption; label: string }>;

export const ROW_HEIGHT_SETTINGS: Record<RowHeightOption, { row: string }> = {
  short: { row: "32px" },
  medium: { row: "40px" },
  tall: { row: "56px" },
  extraTall: { row: "72px" },
};

export const TABLE_HEADER_HEIGHT = "32px";
export const ROW_HEIGHT_TRANSITION_MS = 300;
export const ESCAPE_HIGHLIGHT_DURATION = 650;

// Filter operators
export const FILTER_TEXT_OPERATOR_ITEMS = [
  { id: "contains", label: "contains..." },
  { id: "doesNotContain", label: "does not contain..." },
  { id: "is", label: "is..." },
  { id: "isNot", label: "is not..." },
  { id: "isEmpty", label: "is empty" },
  { id: "isNotEmpty", label: "is not empty" },
] as const satisfies ReadonlyArray<{ id: FilterOperator; label: string }>;

export const FILTER_NUMBER_OPERATOR_ITEMS = [
  { id: "is", label: "=" },
  { id: "isNot", label: "≠" },
  { id: "lessThan", label: "<" },
  { id: "greaterThan", label: ">" },
  { id: "lessThanOrEqual", label: "≤" },
  { id: "greaterThanOrEqual", label: "≥" },
  { id: "isEmpty", label: "is empty" },
  { id: "isNotEmpty", label: "is not empty" },
] as const satisfies ReadonlyArray<{ id: FilterOperator; label: string }>;

export const FILTER_JOIN_ITEMS = [
  { id: "and", label: "and" },
  { id: "or", label: "or" },
] as const satisfies ReadonlyArray<{ id: FilterJoin; label: string }>;

// Field agents
export const ADD_COLUMN_FIELD_AGENTS = [
  { id: "analyze-attachment", label: "Analyze attachment", icon: "asset273", color: "#2f9e44", featured: false },
  { id: "research-companies", label: "Research companies", icon: "asset381", color: "#2563eb", featured: false },
  { id: "find-image-web", label: "Find image from web", icon: "imageGlobe", color: "#7c3aed", featured: false },
  { id: "generate-image", label: "Generate image", icon: "asset213", color: "#ea580c", featured: false },
  { id: "categorize-assets", label: "Categorize assets", icon: "files", color: "#f97316", featured: false },
  { id: "build-prototype", label: "Build prototype", icon: "asset308", color: "#7c3aed", featured: false },
  { id: "build-field-agent", label: "Build a field agent", icon: "agent", color: "#048a0e", featured: true },
  { id: "browse-catalog", label: "Browse catalog", icon: "asset71", color: "#4b5563", featured: false },
] as const;

// Standard field types
export const ADD_COLUMN_STANDARD_FIELDS = [
  { id: "link", label: "Link to another record", icon: "asset433", hasChevron: true },
  { id: "singleLineText", label: "Single line text", icon: "text", hasChevron: false },
  { id: "longText", label: "Long text", icon: "asset51", hasChevron: false },
  { id: "attachment", label: "Attachment", icon: "asset279", hasChevron: false },
  { id: "checkbox", label: "Checkbox", icon: "asset356", hasChevron: false },
  { id: "multipleSelect", label: "Multiple select", icon: "asset185", hasChevron: false },
  { id: "singleSelect", label: "Single select", icon: "asset372", hasChevron: false },
  { id: "user", label: "User", icon: "asset19", hasChevron: false },
  { id: "date", label: "Date", icon: "asset375", hasChevron: false },
  { id: "phone", label: "Phone number", icon: "asset137", hasChevron: false },
  { id: "email", label: "Email", icon: "asset289", hasChevron: false },
  { id: "url", label: "URL", icon: "asset190", hasChevron: false },
  { id: "number", label: "Number", icon: "number", hasChevron: false },
  { id: "currency", label: "Currency", icon: "asset313", hasChevron: false },
  { id: "percent", label: "Percent", icon: "asset140", hasChevron: false },
  { id: "duration", label: "Duration", icon: "asset335", hasChevron: false },
  { id: "rating", label: "Rating", icon: "asset70", hasChevron: false },
  { id: "formula", label: "Formula", icon: "asset258", hasChevron: false },
  { id: "rollup", label: "Rollup", icon: "asset270", hasChevron: false },
  { id: "count", label: "Count", icon: "asset379", hasChevron: false },
  { id: "lookup", label: "Lookup", icon: "asset187", hasChevron: false },
  { id: "createdTime", label: "Created time", icon: "asset378", hasChevron: false },
  { id: "lastModifiedTime", label: "Last modified time", icon: "asset378", hasChevron: false },
  { id: "createdBy", label: "Created by", icon: "asset19", hasChevron: false },
  { id: "lastModifiedBy", label: "Last modified by", icon: "asset19", hasChevron: false },
  { id: "autonumber", label: "Autonumber", icon: "asset183", hasChevron: false },
  { id: "barcode", label: "Barcode", icon: "asset405", hasChevron: false },
  { id: "button", label: "Button", icon: "asset155", hasChevron: false },
] as const;

// Column configuration
export const ADD_COLUMN_KIND_CONFIG: Record<
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

// Number field configuration options
export const NUMBER_PRESET_OPTIONS = [
  { id: "none", label: "Select a preset" },
  { id: "decimal4", label: "1.2345" },
  { id: "integer", label: "3456" },
  { id: "million1", label: "34.0M" },
] as const satisfies ReadonlyArray<NumberPickerOption<NumberPresetId>>;

export const NUMBER_DECIMAL_OPTIONS = Array.from({ length: 9 }, (_, value) => ({
  id: String(value),
  label: String(value),
  triggerLabel: `${value} (${value === 0 ? "1" : `1.${"0".repeat(value)}`})`,
  description: value === 0 ? "1" : `1.${"0".repeat(value)}`,
})) as Array<NumberPickerOption<string>>;

export const NUMBER_SEPARATOR_OPTIONS = [
  {
    id: "local",
    label: "Local",
    triggerLabel: "Local (1,000,000.00)",
    description: "1,000,000.00",
  },
  {
    id: "commaPeriod",
    label: "Comma, period",
    triggerLabel: "Comma, period (1,000,000.00)",
    description: "1,000,000.00",
  },
  {
    id: "periodComma",
    label: "Period, comma",
    triggerLabel: "Period, comma (1.000.000,00)",
    description: "1.000.000,00",
  },
  {
    id: "spaceComma",
    label: "Space, comma",
    triggerLabel: "Space, comma (1 000 000,00)",
    description: "1 000 000,00",
  },
  {
    id: "spacePeriod",
    label: "Space, period",
    triggerLabel: "Space, period (1 000 000.00)",
    description: "1 000 000.00",
  },
] as const satisfies ReadonlyArray<NumberPickerOption<NumberSeparatorId>>;

export const NUMBER_ABBREVIATION_OPTIONS = [
  { id: "none", label: "None" },
  { id: "thousand", label: "Thousand", description: "K" },
  { id: "million", label: "Million", description: "M" },
  { id: "billion", label: "Billion", description: "B" },
] as const satisfies ReadonlyArray<NumberPickerOption<NumberAbbreviationId>>;
