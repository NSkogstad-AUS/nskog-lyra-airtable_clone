import type { FieldMenuItem, TableField, TableFieldKind, FieldMenuIcon } from "./types";
import { UUID_REGEX, DEFAULT_BASE_NAME } from "./config";
import { DEFAULT_TABLE_FIELDS } from "./constants";
import { resolveNumberConfig } from "./number";

export const isUuid = (value: string) => UUID_REGEX.test(value);

export const normalizeBaseName = (value: string) => value.trim() || DEFAULT_BASE_NAME;

export const createOptimisticId = (prefix: string) => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `temp-${prefix}-${crypto.randomUUID()}`;
  }
  return `temp-${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
};

export const escapeXmlText = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export const getBaseInitials = (value: string) => {
  const compact = value.trim().replace(/\s+/g, "");
  const chars = Array.from(compact);
  const first = chars[0] ?? "B";
  const second = chars[1] ?? "";
  return `${first.toUpperCase()}${second.toLowerCase()}`;
};

export const createBaseFaviconDataUrl = (name: string, color: string, textColor: string) => {
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

export const getFieldKindPrefix = (fieldKind?: TableFieldKind) =>
  fieldKind === "number" ? "#" : "A";

export const getFieldDisplayLabel = (field: Pick<TableField, "kind" | "label">) =>
  `${getFieldKindPrefix(field.kind)} ${field.label}`;

export const createColumnVisibility = (fields: TableField[]) =>
  Object.fromEntries(fields.map((field) => [field.id, true])) as Record<string, boolean>;

export const moveFieldToDropIndex = (
  fields: FieldMenuItem[],
  activeFieldId: string,
  dropIndex: number,
) => {
  const sourceIndex = fields.findIndex((field) => field.id === activeFieldId);
  if (sourceIndex === -1) return fields;
  const nextFields = [...fields];
  const [movedField] = nextFields.splice(sourceIndex, 1);
  if (!movedField) return fields;
  const boundedDropIndex = Math.max(0, Math.min(dropIndex, nextFields.length));
  nextFields.splice(boundedDropIndex, 0, movedField);
  return nextFields;
};

const DEFAULT_FIELD_META_BY_NAME = new Map(
  DEFAULT_TABLE_FIELDS.map((field) => [field.label.toLowerCase(), field]),
);

export const mapDbColumnToField = (column: {
  id: string;
  name: string;
  type: "text" | "number";
  size?: number | null;
}): TableField => {
  const defaultMeta = DEFAULT_FIELD_META_BY_NAME.get(column.name.toLowerCase());
  const kind: TableFieldKind = column.type === "number" ? "number" : "singleLineText";
  const resolvedSize =
    typeof column.size === "number"
      ? column.size
      : defaultMeta?.size ?? (kind === "number" ? 160 : 220);
  return {
    id: column.id,
    label: column.name,
    kind,
    size: resolvedSize,
    defaultValue: defaultMeta?.defaultValue ?? "",
    numberConfig: kind === "number" ? resolveNumberConfig() : undefined,
  };
};

export const mapFieldKindToDbType = (kind: TableFieldKind): "text" | "number" =>
  kind === "number" ? "number" : "text";

export const resolveFieldMenuIcon = (field: TableField): FieldMenuIcon => {
  const normalizedLabel = field.label.toLowerCase();
  if (normalizedLabel === "name") return "name";
  if (normalizedLabel === "assignee") return "user";
  if (normalizedLabel === "status") return "status";
  if (normalizedLabel === "attachments") return "file";
  if (field.kind === "number") return "number";
  return "paragraph";
};
