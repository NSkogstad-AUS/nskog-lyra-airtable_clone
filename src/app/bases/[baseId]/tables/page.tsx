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
// CSS import removed - not using transforms for static row behavior
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./tables.module.css";

type TableRow = {
  id: string;
  name: string;
  notes: string;
  assignee: string;
  status: string;
  attachments: string;
};

type EditableColumnId = Exclude<keyof TableRow, "id">;
type EditingCell = {
  rowIndex: number;
  columnId: EditableColumnId;
};

type BaseMenuSections = {
  appearance: boolean;
  guide: boolean;
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
  const [viewName, setViewName] = useState("Grid view");
  const [isEditingViewName, setIsEditingViewName] = useState(false);
  const viewNameInputRef = useRef<HTMLInputElement | null>(null);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [overRowId, setOverRowId] = useState<string | null>(null);
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
  const baseMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const baseMenuRef = useRef<HTMLDivElement | null>(null);
  const baseGuideTextRef = useRef<HTMLTextAreaElement | null>(null);
  const [baseMenuPosition, setBaseMenuPosition] = useState({ top: 0, left: 0 });
  const [data, setData] = useState<TableRow[]>([
    {
      id: "row-1",
      name: "Launch plan",
      notes: "Kickoff notes",
      assignee: "Nicolai",
      status: "In progress",
      attachments: "2 files",
    },
    {
      id: "row-2",
      name: "Homepage refresh",
      notes: "Needs review",
      assignee: "Alex",
      status: "Review",
      attachments: "—",
    },
    {
      id: "row-3",
      name: "Q2 roadmap",
      notes: "Draft",
      assignee: "Sam",
      status: "Planned",
      attachments: "1 file",
    },
    {
      id: "row-4",
      name: "Customer follow-up",
      notes: "Waiting on reply",
      assignee: "Jamie",
      status: "Blocked",
      attachments: "—",
    },
  ]);
  const [nextRowId, setNextRowId] = useState(5);

  const columns = useMemo<ColumnDef<TableRow>[]>(
    () => [
      {
        id: "rowNumber",
        header: "",
        size: 56,
        enableSorting: false,
        cell: ({ row }) => row.index + 1,
      },
      { accessorKey: "name", header: "Name", size: 220 },
      { accessorKey: "notes", header: "Notes", size: 260 },
      { accessorKey: "assignee", header: "Assignee", size: 160 },
      { accessorKey: "status", header: "Status", size: 140 },
      { accessorKey: "attachments", header: "Attachments", size: 140 },
    ],
    [],
  );

  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [activeCellId, setActiveCellId] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [activeCellRowIndex, setActiveCellRowIndex] = useState<number | null>(
    null,
  );
  const [activeCellColumnIndex, setActiveCellColumnIndex] = useState<number | null>(null);
  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const cellRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());

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
    setData((prev) =>
      prev.map((row, index) =>
        index === editingCell.rowIndex
          ? { ...row, [editingCell.columnId]: editingValue }
          : row,
      ),
    );
    setEditingCell(null);
  };

  const startEditingViewName = () => {
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
  };

  const cancelViewNameEdit = () => {
    setIsEditingViewName(false);
    clearTextSelection();
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
            startEditing(row.index, cell.column.id as EditableColumnId, cellValueText);
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
    const newRow: TableRow = {
      id: `row-${nextRowId}`,
      name: "",
      notes: "",
      assignee: "",
      status: "",
      attachments: "—",
    };
    setNextRowId((prev) => prev + 1);
    setData((prev) => [...prev, newRow]);
  };

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
      setData((items) => {
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

  const addColumn = () => {
    // This will be implemented when we connect to the API
    // For now, we'll show an alert since we need to modify the TableRow type
    alert("Add column functionality will be implemented with API integration");
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
    if (!isBaseGuideEditing) return;
    requestAnimationFrame(() => {
      baseGuideTextRef.current?.focus();
    });
  }, [isBaseGuideEditing]);

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
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    state: {
      sorting,
      rowSelection,
    },
  });

  return (
    <div className={styles.hyperbaseContainer}>
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
            <span className={styles.baseNameText}>Untitled Base</span>
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
          <button type="button" className={styles.navTab}>
            Automations
          </button>
          <button type="button" className={styles.navTab}>
            Interfaces
          </button>
          <button type="button" className={styles.navTab}>
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
          <div className={styles.trialBadge}>
            Trial: 13 days left
          </div>

          {/* Launch Button */}
          <button type="button" className={styles.launchButton}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1a.5.5 0 01.5.5v11.793l3.146-3.147a.5.5 0 01.708.708l-4 4a.5.5 0 01-.708 0l-4-4a.5.5 0 01.708-.708L7.5 13.293V1.5A.5.5 0 018 1z"/>
            </svg>
            Launch
          </button>

          {/* Share Button */}
          <button type="button" className={styles.shareButton}>
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
            <div className={styles.baseMenuTitle}>Untitled Base</div>
            <div className={styles.baseMenuHeaderActions}>
              <button type="button" className={styles.baseMenuIconButton} aria-label="Favorite base">
                ☆
              </button>
              <button type="button" className={styles.baseMenuIconButton} aria-label="More options">
                …
              </button>
            </div>
          </div>

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
            {baseMenuSections.appearance ? (
              <div
                className={`${styles.baseMenuSectionContent} ${styles.animate} ${styles.baseMenuSectionContentOpen}`}
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
                          <button
                            key={color}
                            type="button"
                            className={styles.baseMenuAppearanceSwatch}
                            style={{ backgroundColor: color }}
                            aria-label={`Select ${color}`}
                          ></button>
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
            ) : (
              <div
                className={`${styles.baseMenuSectionContent} ${styles.animate} ${styles.baseMenuSectionContentClosed}`}
                aria-hidden="true"
              ></div>
            )}
          </div>

          <div className={styles.baseMenuSection}>
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
            {baseMenuSections.guide ? (
              <div
                className={`${styles.baseMenuGuideContent} ${styles.animate} ${styles.baseMenuSectionContentOpen}`}
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
            ) : (
              <div
                className={`${styles.baseMenuGuideContent} ${styles.animate} ${styles.baseMenuSectionContentClosed}`}
                aria-hidden="true"
              ></div>
            )}
          </div>
        </div>
      ) : null}

      {/* Tables Tab Bar - Top bar with table tabs */}
      <div className={styles.tablesTabBar}>
        <div className={styles.tablesTabBarLeft}>
          {/* Active Table Tab */}
          <div className={styles.tableTab}>
            <span>Table 1</span>
            <div className={styles.tableTabDropdown}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
              </svg>
            </div>
          </div>

          {/* All Tables Dropdown */}
          <div className={styles.allTablesDropdown}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
            </svg>
          </div>

          {/* Add or Import Button */}
          <button type="button" className={styles.addOrImportButton}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z"/>
            </svg>
            <span>Add or import</span>
          </button>
        </div>

        <div className={styles.tablesTabBarCorner} aria-hidden="true"></div>

        <div className={styles.tablesTabBarRight}>
          {/* Tools Dropdown */}
          <button type="button" className={styles.toolsDropdown}>
            <span>Tools</span>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.table}>
        {/* View Bar - Top Toolbar */}
        <div className={styles.viewBar}>
            <div className={styles.viewBarLeft}>
            <div className={styles.sidebarToggle}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 2.75A.75.75 0 011.75 2h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 2.75zm0 5A.75.75 0 011.75 7h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 7.75zm0 5a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H1.75a.75.75 0 01-.75-.75z"/>
              </svg>
            </div>
            <div
              className={`${styles.viewName} ${
                isEditingViewName ? styles.viewNameEditing : ""
              }`}
            >
              <div className={styles.viewNameInner}>
                {!isEditingViewName && (
                  <div className={styles.viewNameIcon}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v3.585a.746.746 0 010 .83v8.085c0 .966-.784 1.75-1.75 1.75H1.75A1.75 1.75 0 010 14.25V6.165a.746.746 0 010-.83V1.75zM1.5 6.5v7.75c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V6.5h-13zM14.5 5V1.75a.25.25 0 00-.25-.25H1.75a.25.25 0 00-.25.25V5h13z"/>
                    </svg>
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
                    onDoubleClick={startEditingViewName}
                  >
                    {viewName}
                  </span>
                )}
                {!isEditingViewName && (
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={styles.dropdownIcon}>
                    <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
                  </svg>
                )}
              </div>
            </div>
          </div>
          <div className={styles.viewBarRight}>
            <div className={styles.toolbarButtons}>
              <button type="button" className={styles.toolbarButton}>
                <span>👁️</span> Hide fields
              </button>
              <button type="button" className={styles.toolbarButton}>
                <span>⚡</span> Filter
              </button>
              <button type="button" className={styles.toolbarButton}>
                <span>⊞</span> Group
              </button>
              <button type="button" className={styles.toolbarButton}>
                <span>⇅</span> Sort
              </button>
              <button type="button" className={styles.toolbarButton}>
                <span>●</span> Color
              </button>
              <button type="button" className={styles.toolbarButton}>
                <span>⎘</span> Share and sync
              </button>
            </div>
            <button type="button" className={styles.searchButton} aria-label="Search">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Left Sidebar - Navigation */}
        <nav className={styles.leftNav}>
          <div className={styles.leftNavContent}>
            <button type="button" className={styles.createViewButton}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z"/>
              </svg>
              Create new...
            </button>
            <div className={styles.viewSearch}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z"/>
              </svg>
              <span>Find a view</span>
            </div>
            <div className={styles.viewList}>
              <div className={`${styles.viewListItem} ${styles.viewListItemActive}`}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v3.585a.746.746 0 010 .83v8.085c0 .966-.784 1.75-1.75 1.75H1.75A1.75 1.75 0 010 14.25V6.165a.746.746 0 010-.83V1.75zM1.5 6.5v7.75c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V6.5h-13zM14.5 5V1.75a.25.25 0 00-.25-.25H1.75a.25.25 0 00-.25.25V5h13z"/>
                </svg>
                <span>Grid view</span>
              </div>
            </div>
          </div>
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
            <table className={styles.tanstackTable}>
              <thead className={styles.tanstackHeader}>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className={styles.tanstackHeaderRow}>
                    {headerGroup.headers.map((header) => {
                      const isRowNumber = header.column.id === "rowNumber";
                      const canSort = header.column.getCanSort();
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
                          className={`${styles.tanstackHeaderCell} ${canSort ? styles.tanstackHeaderCellSortable : ""}`}
                          style={{ width: header.getSize() }}
                          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
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
                        </th>
                      );
                    })}
                    <th className={styles.addColumnHeader}>
                      <button
                        type="button"
                        onClick={addColumn}
                        className={styles.addColumnButton}
                        aria-label="Add column"
                      >
                        +
                      </button>
                    </th>
                  </tr>
                ))}
              </thead>
              <tbody className={styles.tanstackBody}>
                {table.getRowModel().rows.map((row, rowIndex) => {
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
                              className={`${styles.tanstackCell} ${isEditing ? styles.tanstackCellEditing : ""} ${isDropTarget ? styles.tanstackCellDropTarget : ""}`}
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
                                  cell.column.id as EditableColumnId,
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
                <tr className={styles.tanstackAddRowContainer}>
                  <td colSpan={table.getAllColumns().length}>
                    <button
                      type="button"
                      onClick={addRow}
                      className={styles.addRowButton}
                      aria-label="Add row"
                    >
                      + Add row
                    </button>
                  </td>
                  <td className={styles.addColumnCellAddRow}></td>
                </tr>
              </tbody>
            </table>
              </SortableContext>
              <DragOverlay>
                {activeRowId ? (
                  <div className={styles.dragOverlay}>
                    <div className={styles.dragOverlayContent}>
                      {(() => {
                        const activeRow = data.find((row) => row.id === activeRowId);
                        if (!activeRow) return null;
                        return (
                          <>
                            <span className={styles.dragOverlayName}>{activeRow.name || "Untitled"}</span>
                            {activeRow.status && (
                              <span className={styles.dragOverlayStatus}>{activeRow.status}</span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}
