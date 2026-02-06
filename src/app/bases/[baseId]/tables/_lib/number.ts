import type { NumberAbbreviationId, NumberFieldConfig, NumberSeparatorId } from "./types";

export const DEFAULT_NUMBER_FIELD_CONFIG: NumberFieldConfig = {
  preset: "none",
  decimalPlaces: "1",
  separators: "local",
  showThousandsSeparator: true,
  abbreviation: "none",
  allowNegative: false,
};

export const clampNumberDecimals = (value: string) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(0, Math.min(8, parsed));
};

export const resolveNumberSeparators = (separators: NumberSeparatorId) => {
  if (separators === "periodComma") return { thousandsSeparator: ".", decimalSeparator: "," };
  if (separators === "spaceComma") return { thousandsSeparator: " ", decimalSeparator: "," };
  if (separators === "spacePeriod") return { thousandsSeparator: " ", decimalSeparator: "." };
  return { thousandsSeparator: ",", decimalSeparator: "." };
};

export const formatNumberWithSeparators = (
  value: number,
  decimals: number,
  showThousandsSeparator: boolean,
  separators: NumberSeparatorId,
) => {
  const normalized = Number.isFinite(value) ? value : 0;
  const sign = normalized < 0 ? "-" : "";
  const absolute = Math.abs(normalized);
  const fixed = absolute.toFixed(decimals);
  const [integerPartRaw, decimalPart = ""] = fixed.split(".");
  const integerPart = integerPartRaw ?? "0";
  const { thousandsSeparator, decimalSeparator } = resolveNumberSeparators(separators);

  const groupedInteger = showThousandsSeparator
    ? integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator)
    : integerPart;

  if (decimals <= 0) {
    return `${sign}${groupedInteger}`;
  }

  return `${sign}${groupedInteger}${decimalSeparator}${decimalPart}`;
};

export const applyNumberAbbreviation = (value: number, abbreviation: NumberAbbreviationId) => {
  if (abbreviation === "thousand") return { value: value / 1_000, suffix: "K" };
  if (abbreviation === "million") return { value: value / 1_000_000, suffix: "M" };
  if (abbreviation === "billion") return { value: value / 1_000_000_000, suffix: "B" };
  return { value, suffix: "" };
};

export const parseConfiguredNumberValue = (rawValue: string, separators: NumberSeparatorId) => {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) return null;

  const directValue = Number(trimmed);
  if (Number.isFinite(directValue)) return directValue;

  const abbreviationMatch = /^([\s\S]*?)([kKmMbB])$/.exec(trimmed);
  const suffix = abbreviationMatch?.[2]?.toUpperCase();
  const multiplier =
    suffix === "K"
      ? 1_000
      : suffix === "M"
        ? 1_000_000
        : suffix === "B"
          ? 1_000_000_000
          : 1;
  let working = (abbreviationMatch?.[1] ?? trimmed).replace(/\s+/g, "");
  const { thousandsSeparator, decimalSeparator } = resolveNumberSeparators(separators);

  if (thousandsSeparator === " ") {
    working = working.replace(/\s+/g, "");
  } else {
    working = working.split(thousandsSeparator).join("");
  }
  if (decimalSeparator !== ".") {
    working = working.split(decimalSeparator).join(".");
  }

  if (/^[+-]?\d+(,\d+)?$/.test(working)) {
    working = working.replace(",", ".");
  }
  working = working.replace(/,/g, "");

  const signPrefix = working.startsWith("-") ? "-" : working.startsWith("+") ? "+" : "";
  let unsigned = signPrefix ? working.slice(1) : working;
  const lastDot = unsigned.lastIndexOf(".");
  if (lastDot >= 0) {
    unsigned = unsigned.slice(0, lastDot).replaceAll(".", "") + unsigned.slice(lastDot);
  } else {
    unsigned = unsigned.replaceAll(".", "");
  }
  unsigned = unsigned.replace(/[^0-9.]/g, "");
  const normalized = `${signPrefix}${unsigned}`;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return parsed * multiplier;
};

export const resolveNumberConfig = (config?: NumberFieldConfig): NumberFieldConfig => ({
  ...DEFAULT_NUMBER_FIELD_CONFIG,
  ...config,
  decimalPlaces: String(
    clampNumberDecimals(config?.decimalPlaces ?? DEFAULT_NUMBER_FIELD_CONFIG.decimalPlaces),
  ),
});

export const normalizeNumberValueForStorage = (rawValue: string, config: NumberFieldConfig) => {
  const trimmed = rawValue.trim();
  if (!trimmed) return "";
  const parsed = parseConfiguredNumberValue(trimmed, config.separators);
  if (parsed === null || !Number.isFinite(parsed)) return trimmed;
  const normalized = config.allowNegative ? parsed : Math.abs(parsed);
  const decimals = clampNumberDecimals(config.decimalPlaces);
  return normalized.toFixed(decimals);
};

export const formatNumberCellValue = (rawValue: string, config?: NumberFieldConfig) => {
  const trimmed = rawValue.trim();
  if (!trimmed) return "";
  const resolvedConfig = resolveNumberConfig(config);
  const parsed = parseConfiguredNumberValue(trimmed, resolvedConfig.separators);
  if (parsed === null || !Number.isFinite(parsed)) return rawValue;
  const normalized = resolvedConfig.allowNegative ? parsed : Math.abs(parsed);
  const abbreviated = applyNumberAbbreviation(normalized, resolvedConfig.abbreviation);
  const formatted = formatNumberWithSeparators(
    abbreviated.value,
    clampNumberDecimals(resolvedConfig.decimalPlaces),
    resolvedConfig.showThousandsSeparator,
    resolvedConfig.separators,
  );
  return `${formatted}${abbreviated.suffix}`;
};
