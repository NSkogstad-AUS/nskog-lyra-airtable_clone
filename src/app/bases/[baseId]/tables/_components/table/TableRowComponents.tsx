"use client";

import { useSortable } from "@dnd-kit/sortable";
import type { ReactNode } from "react";
import styles from "../../tables.module.css";

// Sortable Table Row component types
export type SortableHandleProps = Pick<
  ReturnType<typeof useSortable>,
  "attributes" | "listeners" | "setActivatorNodeRef" | "isDragging"
>;

export const INERT_HANDLE_PROPS: SortableHandleProps = {
  attributes: {},
  listeners: undefined,
  setActivatorNodeRef: () => undefined,
  isDragging: false,
} as unknown as SortableHandleProps;

export function PlainTableRow({
  isRowSelected,
  isRowActive,
  hasSearchMatch = false,
  onContextMenu,
  children,
}: {
  isRowSelected: boolean;
  isRowActive: boolean;
  hasSearchMatch?: boolean;
  onContextMenu?: (event: React.MouseEvent<HTMLTableRowElement>) => void;
  children: (handleProps: SortableHandleProps) => ReactNode;
}) {
  return (
    <tr
      className={`${styles.tanstackRow} ${isRowActive && !isRowSelected ? styles.tanstackRowActive : ""} ${isRowSelected ? styles.tanstackRowSelected : ""}`}
      data-selected={isRowSelected ? "true" : undefined}
      data-has-search-match={hasSearchMatch ? "true" : undefined}
      aria-selected={isRowSelected}
      onContextMenu={onContextMenu}
    >
      {children(INERT_HANDLE_PROPS)}
    </tr>
  );
}

export function DraggableTableRow({
  rowId,
  isRowSelected,
  isRowActive,
  hasSearchMatch = false,
  onContextMenu,
  children,
}: {
  rowId: string;
  isRowSelected: boolean;
  isRowActive: boolean;
  hasSearchMatch?: boolean;
  onContextMenu?: (event: React.MouseEvent<HTMLTableRowElement>) => void;
  children: (handleProps: SortableHandleProps) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    isDragging,
  } = useSortable({ id: rowId });

  const handleProps = { attributes, listeners, setActivatorNodeRef, isDragging };

  const style = {
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${styles.tanstackRow} ${isRowActive && !isRowSelected ? styles.tanstackRowActive : ""} ${isRowSelected ? styles.tanstackRowSelected : ""} ${isDragging ? styles.tanstackRowDragging : ""}`}
      data-selected={isRowSelected ? "true" : undefined}
      data-has-search-match={hasSearchMatch ? "true" : undefined}
      aria-selected={isRowSelected}
      onContextMenu={onContextMenu}
    >
      {children(handleProps)}
    </tr>
  );
}

export function SortableTableRow({
  rowId,
  isRowSelected,
  isRowActive,
  isDragEnabled,
  hasSearchMatch = false,
  onContextMenu,
  children,
}: {
  rowId: string;
  isRowSelected: boolean;
  isRowActive: boolean;
  isDragEnabled: boolean;
  hasSearchMatch?: boolean;
  onContextMenu?: (event: React.MouseEvent<HTMLTableRowElement>) => void;
  children: (handleProps: SortableHandleProps) => ReactNode;
}) {
  if (!isDragEnabled) {
    return (
      <PlainTableRow
        isRowSelected={isRowSelected}
        isRowActive={isRowActive}
        hasSearchMatch={hasSearchMatch}
        onContextMenu={onContextMenu}
      >
        {children}
      </PlainTableRow>
    );
  }

  return (
    <DraggableTableRow
      rowId={rowId}
      isRowSelected={isRowSelected}
      isRowActive={isRowActive}
      hasSearchMatch={hasSearchMatch}
      onContextMenu={onContextMenu}
    >
      {children}
    </DraggableTableRow>
  );
}
