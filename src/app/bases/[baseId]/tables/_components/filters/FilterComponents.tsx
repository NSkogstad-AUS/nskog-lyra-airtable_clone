"use client";

import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { ReactNode } from "react";
import type { FilterConditionDragData, FilterGroupDragData, FilterGroupDropData, FilterRootDropData } from "../../_lib/types";
import { getFilterGroupDropId, getFilterRootDropId } from "../../_lib/filter-utils";
import type { SortableHandleProps } from "../table/TableRowComponents";
import styles from "../../tables.module.css";

export function SortableFilterGroupRow({
  groupId,
  groupMode,
  conditionId,
  dragId,
  isDragEnabled,
  children,
}: {
  groupId: string;
  groupMode: "group" | "single";
  conditionId?: string;
  dragId: string;
  isDragEnabled: boolean;
  children: (handleProps: SortableHandleProps, isDragging: boolean) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dragId,
    data: {
      type: "filter-group",
      groupId,
      mode: groupMode,
      conditionId,
    } satisfies FilterGroupDragData,
    disabled: !isDragEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleProps = { attributes, listeners, setActivatorNodeRef, isDragging };

  return (
    <div ref={setNodeRef} style={style} className={`${styles.filterGroupRow} ${styles.filterDragItem}`}>
      {children(handleProps, isDragging)}
    </div>
  );
}

export function SortableFilterConditionRow({
  groupId,
  conditionId,
  dragId,
  isDragEnabled,
  children,
}: {
  groupId: string;
  conditionId: string;
  dragId: string;
  isDragEnabled: boolean;
  children: (handleProps: SortableHandleProps, isDragging: boolean) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: dragId,
    data: {
      type: "filter-condition",
      groupId,
      conditionId,
    } satisfies FilterConditionDragData,
    disabled: !isDragEnabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleProps = { attributes, listeners, setActivatorNodeRef, isDragging };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.filterConditionRow} ${styles.filterDragItem}`}
    >
      {children(handleProps, isDragging)}
    </div>
  );
}

export function FilterGroupDropZone({
  groupId,
  children,
}: {
  groupId: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: getFilterGroupDropId(groupId),
    data: {
      type: "filter-group-drop",
      groupId,
    } satisfies FilterGroupDropData,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.filterGroupBody} ${
        isOver ? styles.filterGroupBodyOver : ""
      }`}
    >
      {children}
    </div>
  );
}

export function FilterRootDropZone({
  index,
}: {
  index: number;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: getFilterRootDropId(index),
    data: {
      type: "filter-root-drop",
      index,
    } satisfies FilterRootDropData,
  });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.filterRootDropZone} ${
        isOver ? styles.filterRootDropZoneOver : ""
      }`}
    />
  );
}
