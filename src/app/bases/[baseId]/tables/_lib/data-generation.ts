import { faker } from "@faker-js/faker";
import { DEFAULT_TABLE_ROW_COUNT, DEFAULT_TABLE_STATUS_OPTIONS, DEFAULT_TABLE_NOTES_PREFIXES, DEFAULT_TABLE_FIELDS } from "./constants";

export const createAttachmentLabel = () => {
  const filesCount = faker.number.int({ min: 0, max: 3 });
  if (filesCount <= 0) return "—";
  return `${filesCount} file${filesCount === 1 ? "" : "s"}`;
};

export const createDefaultRows = (): Array<Record<string, string>> =>
  Array.from({ length: DEFAULT_TABLE_ROW_COUNT }, () => {
    const notePrefix = faker.helpers.arrayElement(DEFAULT_TABLE_NOTES_PREFIXES);
    return {
      name: faker.company.buzzPhrase(),
      notes: `${notePrefix} ${faker.commerce.productAdjective().toLowerCase()}`,
      assignee: faker.person.firstName(),
      status: faker.helpers.arrayElement(DEFAULT_TABLE_STATUS_OPTIONS),
      attachments: createAttachmentLabel(),
    };
  });

export const createSingleBlankRow = () =>
  Object.fromEntries(DEFAULT_TABLE_FIELDS.map((field) => [field.id, ""])) as Record<string, string>;
