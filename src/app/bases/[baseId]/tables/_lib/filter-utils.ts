import type { FilterCondition, FilterConditionGroup, FilterJoin, FilterOperator, TableFieldKind } from "./types";
import { FILTER_NUMBER_OPERATOR_ITEMS, FILTER_TEXT_OPERATOR_ITEMS } from "./constants";

// Filter drag-drop ID prefixes
export const FILTER_GROUP_DRAG_PREFIX = "filter-group::";
export const FILTER_CONDITION_DRAG_PREFIX = "filter-condition::";
export const FILTER_GROUP_DROP_PREFIX = "filter-group-drop::";
export const FILTER_ROOT_DROP_PREFIX = "filter-root-drop::";

export const getFilterGroupDragId = (groupId: string) => `${FILTER_GROUP_DRAG_PREFIX}${groupId}`;
export const getFilterConditionDragId = (conditionId: string) =>
  `${FILTER_CONDITION_DRAG_PREFIX}${conditionId}`;
export const getFilterGroupDropId = (groupId: string) => `${FILTER_GROUP_DROP_PREFIX}${groupId}`;
export const getFilterRootDropId = (index: number) => `${FILTER_ROOT_DROP_PREFIX}${index}`;

export const operatorRequiresValue = (operator: FilterOperator) =>
  operator !== "isEmpty" && operator !== "isNotEmpty";

export const getFilterOperatorItemsForField = (fieldKind?: TableFieldKind) =>
  fieldKind === "number" ? FILTER_NUMBER_OPERATOR_ITEMS : FILTER_TEXT_OPERATOR_ITEMS;

export const getDefaultFilterOperatorForField = (fieldKind?: TableFieldKind): FilterOperator =>
  getFilterOperatorItemsForField(fieldKind)[0]?.id ?? "contains";

export const normalizeFilterGroupsForQuery = (groups: FilterConditionGroup[]) =>
  groups.reduce<
    Array<{
      join: FilterJoin;
      conditions: Array<{
        columnId: string;
        operator: FilterOperator;
        join: FilterJoin;
        value?: string;
      }>;
    }>
  >((groupAccumulator, group, groupIndex) => {
    const normalizedConditions = group.conditions.reduce<
      Array<{
        columnId: string;
        operator: FilterOperator;
        join: FilterJoin;
        value?: string;
      }>
    >((conditionAccumulator, condition, conditionIndex) => {
      if (!condition.columnId) return conditionAccumulator;
      const value = condition.value.trim();
      if (operatorRequiresValue(condition.operator) && !value) return conditionAccumulator;

      const nextCondition: {
        columnId: string;
        operator: FilterOperator;
        join: FilterJoin;
        value?: string;
      } = {
        columnId: condition.columnId,
        operator: condition.operator,
        join: conditionIndex === 0 ? "and" : condition.join,
      };
      if (operatorRequiresValue(condition.operator)) {
        nextCondition.value = value;
      }
      conditionAccumulator.push(nextCondition);
      return conditionAccumulator;
    }, []);

    if (normalizedConditions.length === 0) return groupAccumulator;
    groupAccumulator.push({
      join: groupIndex === 0 ? "and" : group.join,
      conditions: normalizedConditions,
    });
    return groupAccumulator;
  }, []);

export const cloneFilterGroups = (groups: FilterConditionGroup[]): FilterConditionGroup[] =>
  groups.map((group) => ({
    ...group,
    conditions: group.conditions.map((condition) => ({ ...condition })),
  }));

export const normalizeFilterGroups = (value: unknown): FilterConditionGroup[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((group, groupIndex) => {
      if (!group || typeof group !== "object" || Array.isArray(group)) return null;
      const obj = group as Record<string, unknown>;
      const rawConditions = Array.isArray(obj.conditions) ? obj.conditions : [];
      const conditions = rawConditions
        .map((condition, conditionIndex) => {
          if (!condition || typeof condition !== "object" || Array.isArray(condition)) return null;
          const conditionObj = condition as Record<string, unknown>;
          const columnId = conditionObj.columnId;
          const operator = conditionObj.operator;
          const value = conditionObj.value;
          const join = conditionObj.join;
          if (typeof columnId !== "string" || typeof operator !== "string") return null;
          return {
            id:
              typeof conditionObj.id === "string" && conditionObj.id.trim() !== ""
                ? conditionObj.id
                : `condition-${groupIndex}-${conditionIndex}`,
            columnId,
            operator: operator as FilterOperator,
            value: typeof value === "string" ? value : "",
            join: join === "or" ? "or" : "and",
          } satisfies FilterCondition;
        })
        .filter((condition): condition is FilterCondition => Boolean(condition));
      if (conditions.length === 0) return null;
      return {
        id:
          typeof obj.id === "string" && obj.id.trim() !== ""
            ? obj.id
            : `group-${groupIndex}`,
        mode: obj.mode === "single" ? "single" : "group",
        join: obj.join === "or" ? "or" : "and",
        conditions,
      } satisfies FilterConditionGroup;
    })
    .filter((group): group is FilterConditionGroup => Boolean(group));
};
