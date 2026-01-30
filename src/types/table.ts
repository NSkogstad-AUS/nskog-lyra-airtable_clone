import type { BaseId } from "./base";

export type TableId = string;

export type Table = {
  id: TableId;
  baseId: BaseId;
  name: string;
};
