"use client";

import type { MouseEvent, PointerEvent } from "react";
import type { SortableHandleProps } from "./TableRowComponents";
import styles from "../../tables.module.css";

export function SortableRowCell({
  cellId,
  rowIndex,
  columnIndex,
  isRowSelected,
  isDragEnabled,
  showDragHandle,
  rowDisplayIndex,
  registerCellRef,
  toggleSelected,
  onExpandRow,
  cellWidth,
  dragHandleProps,
  onRowSelectDragStart,
}: {
  cellId: string;
  rowIndex: number;
  columnIndex: number;
  isRowSelected: boolean;
  isDragEnabled: boolean;
  showDragHandle: boolean;
  rowDisplayIndex: number;
  registerCellRef: (rowIndex: number, columnIndex: number, element: HTMLTableCellElement | null) => void;
  toggleSelected: () => void;
  onExpandRow: () => void;
  cellWidth: number;
  dragHandleProps: SortableHandleProps;
  onRowSelectDragStart: (event: MouseEvent<HTMLDivElement> | PointerEvent<HTMLDivElement>, rowIndex: number) => void;
}) {
  const { attributes, listeners, setActivatorNodeRef, isDragging } = dragHandleProps;

  return (
    <td
      key={cellId}
      className={`${styles.tanstackCell} ${styles.tanstackRowNumberCell}`}
      data-cell="true"
      data-row-index={rowIndex}
      data-column-index={columnIndex}
      style={{ width: cellWidth }}
      ref={(el) => registerCellRef(rowIndex, columnIndex, el)}
    >
      <div className={styles.rowNumberContent}>
        {/* Left box: drag handle, row number, checkbox */}
        <div
          className={styles.rowNumberBox}
          ref={isDragEnabled ? setActivatorNodeRef : undefined}
          {...(isDragEnabled ? listeners : undefined)}
          {...(isDragEnabled ? attributes : undefined)}
          onPointerDownCapture={(event) => {
            const target = event.target as HTMLElement | null;
            if (
              target?.closest(`.${styles.dragHandle}`) ||
              target?.closest(`.${styles.rowCheckbox}`) ||
              target?.closest(`.${styles.rowCheckboxInput}`)
            ) {
              return;
            }
            const shouldSelect = !isDragEnabled || event.shiftKey;
            if (!shouldSelect) return;
            onRowSelectDragStart(event, rowIndex);
          }}
        >
          {showDragHandle ? (
            <button
              type="button"
              className={`${styles.dragHandle} ${isDragging ? styles.dragHandleActive : ""}`}
              aria-hidden="true"
              tabIndex={-1}
              disabled={!isDragEnabled}
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
          ) : null}
          <span className={`${styles.rowNumberText} ${isRowSelected ? styles.rowNumberHidden : ""}`}>
            {rowDisplayIndex}
          </span>
          <label className={`${styles.rowCheckbox} ${isRowSelected ? styles.rowCheckboxSelected : ""}`}>
            <input
              type="checkbox"
              className={styles.rowCheckboxInput}
              checked={isRowSelected}
              onChange={(e) => {
                e.stopPropagation();
                toggleSelected();
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select row ${rowDisplayIndex}`}
            />
            <svg width="9" height="9" viewBox="0 0 16 16" fill="currentColor" className={styles.rowCheckboxIcon}>
              <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 111.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
            </svg>
          </label>
        </div>
        {/* Right box: expand row button */}
        <div className={styles.expandButtonContainer}>
          <button
            type="button"
            className={styles.expandRowButton}
            onClick={(e) => {
              e.stopPropagation();
              onExpandRow();
            }}
            aria-label="Expand row"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M9.5 2.75a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0V4.06l-2.72 2.72a.75.75 0 01-1.06-1.06L11.44 3H10.25a.75.75 0 01-.75-.75zM6.5 13.25a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-3a.75.75 0 011.5 0v1.69l2.72-2.72a.75.75 0 111.06 1.06L4.56 13h1.19a.75.75 0 01.75.75z" />
            </svg>
          </button>
        </div>
      </div>
    </td>
  );
}
