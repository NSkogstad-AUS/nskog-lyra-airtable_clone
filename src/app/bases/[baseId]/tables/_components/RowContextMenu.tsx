import type { RefObject } from "react";
import type { RowContextMenuState } from "../_lib/types";
import styles from "../tables.module.css";

type Props = {
  state: RowContextMenuState | null;
  menuRef: RefObject<HTMLDivElement | null>;
  onInsertAbove: () => void;
  onInsertBelow: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const renderRowContextMenuIcon = (
  icon:
    | "askOmni"
    | "insertAbove"
    | "insertBelow"
    | "duplicate"
    | "template"
    | "expand"
    | "agent"
    | "comment"
    | "copyUrl"
    | "send"
    | "delete",
) => {
  const iconMap: Partial<Record<
    "insertAbove" | "insertBelow" | "duplicate" | "template" | "expand" | "comment" | "copyUrl" | "send" | "delete",
    string
  >> = {
    insertAbove: "/SVG/Asset%20427Airtable.svg",
    insertBelow: "/SVG/Asset%20441Airtable.svg",
    duplicate: "/SVG/Asset%20320Airtable.svg",
    template: "/SVG/Asset%20149Airtable.svg",
    expand: "/SVG/Asset%20417Airtable.svg",
    comment: "/SVG/Asset%20365Airtable.svg",
    copyUrl: "/SVG/Asset%20190Airtable.svg",
    send: "/SVG/Asset%20289Airtable.svg",
    delete: "/SVG/Asset%2032Airtable.svg",
  };

  if (icon in iconMap) {
    return <img src={iconMap[icon as keyof typeof iconMap]} alt="" width={16} height={16} aria-hidden="true" />;
  }

  const sharedProps = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "currentColor" as const };
  switch (icon) {
    case "askOmni":
      return (
        <svg {...sharedProps}>
          <path d="M8 1.5l.9 2.7 2.7.9-2.7.9L8 8.7l-.9-2.7-2.7-.9 2.7-.9L8 1.5zm4.2 5.3l.5 1.6 1.6.5-1.6.5-.5 1.6-.5-1.6-1.6-.5 1.6-.5.5-1.6zM4.2 10.3l.5 1.6 1.6.5-1.6.5-.5 1.6-.5-1.6-1.6-.5 1.6-.5.5-1.6z" />
        </svg>
      );
    case "agent":
      return (
        <svg {...sharedProps}>
          <path d="M6 2.5a2 2 0 014 0V4h2a1 1 0 011 1v6a3 3 0 01-3 3H6a3 3 0 01-3-3V5a1 1 0 011-1h2V2.5zm1.5 0V4h1V2.5a.5.5 0 00-1 0zM5.25 8a.75.75 0 100 1.5.75.75 0 000-1.5zm5.5 0a.75.75 0 100 1.5.75.75 0 000-1.5z" />
        </svg>
      );
    default:
      return null;
  }
};

export const RowContextMenu = ({
  state,
  menuRef,
  onInsertAbove,
  onInsertBelow,
  onDuplicate,
  onDelete,
}: Props) => {
  if (!state) return null;

  return (
    <div
      ref={menuRef}
      className={styles.rowContextMenu}
      role="menu"
      aria-label="Row options"
      style={{ top: state.top, left: state.left }}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className={styles.rowContextMenuSection}>
        <button
          type="button"
          className={`${styles.rowContextMenuItem} ${styles.rowContextMenuItemDisabled}`}
          disabled
        >
          <span className={styles.rowContextMenuItemIcon} aria-hidden="true">
            {renderRowContextMenuIcon("askOmni")}
          </span>
          <span className={styles.rowContextMenuItemLabel}>Ask Omni</span>
        </button>
      </div>
      <div className={styles.rowContextMenuDivider} />
      <div className={styles.rowContextMenuSection}>
        <button type="button" className={styles.rowContextMenuItem} onClick={onInsertAbove}>
          <span className={styles.rowContextMenuItemIcon} aria-hidden="true">
            {renderRowContextMenuIcon("insertAbove")}
          </span>
          <span className={styles.rowContextMenuItemLabel}>Insert record above</span>
        </button>
        <button type="button" className={styles.rowContextMenuItem} onClick={onInsertBelow}>
          <span className={styles.rowContextMenuItemIcon} aria-hidden="true">
            {renderRowContextMenuIcon("insertBelow")}
          </span>
          <span className={styles.rowContextMenuItemLabel}>Insert record below</span>
        </button>
      </div>
      <div className={styles.rowContextMenuDivider} />
      <div className={styles.rowContextMenuSection}>
        <button type="button" className={styles.rowContextMenuItem} onClick={onDuplicate}>
          <span className={styles.rowContextMenuItemIcon} aria-hidden="true">
            {renderRowContextMenuIcon("duplicate")}
          </span>
          <span className={styles.rowContextMenuItemLabel}>Duplicate record</span>
        </button>
        <button
          type="button"
          className={`${styles.rowContextMenuItem} ${styles.rowContextMenuItemDisabled}`}
          disabled
        >
          <span className={styles.rowContextMenuItemIcon} aria-hidden="true">
            {renderRowContextMenuIcon("template")}
          </span>
          <span className={styles.rowContextMenuItemLabel}>Apply template</span>
        </button>
      </div>
      <div className={styles.rowContextMenuDivider} />
      <div className={styles.rowContextMenuSection}>
        <button
          type="button"
          className={`${styles.rowContextMenuItem} ${styles.rowContextMenuItemDisabled}`}
          disabled
        >
          <span className={styles.rowContextMenuItemIcon} aria-hidden="true">
            {renderRowContextMenuIcon("expand")}
          </span>
          <span className={styles.rowContextMenuItemLabel}>Expand record</span>
        </button>
        <button
          type="button"
          className={`${styles.rowContextMenuItem} ${styles.rowContextMenuItemDisabled}`}
          disabled
        >
          <span className={styles.rowContextMenuItemIcon} aria-hidden="true">
            {renderRowContextMenuIcon("agent")}
          </span>
          <span className={styles.rowContextMenuItemLabel}>Run field agent</span>
          <span className={styles.rowContextMenuItemChevron} aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 3l5 5-5 5-1.1-1.1L8.8 8 4.9 4.1 6 3z" />
            </svg>
          </span>
        </button>
      </div>
      <div className={styles.rowContextMenuDivider} />
      <div className={styles.rowContextMenuSection}>
        <button
          type="button"
          className={`${styles.rowContextMenuItem} ${styles.rowContextMenuItemDisabled}`}
          disabled
        >
          <span className={styles.rowContextMenuItemIcon} aria-hidden="true">
            {renderRowContextMenuIcon("comment")}
          </span>
          <span className={styles.rowContextMenuItemLabel}>Add comment</span>
        </button>
        <button
          type="button"
          className={`${styles.rowContextMenuItem} ${styles.rowContextMenuItemDisabled}`}
          disabled
        >
          <span className={styles.rowContextMenuItemIcon} aria-hidden="true">
            {renderRowContextMenuIcon("copyUrl")}
          </span>
          <span className={styles.rowContextMenuItemLabel}>Copy record URL</span>
        </button>
        <button
          type="button"
          className={`${styles.rowContextMenuItem} ${styles.rowContextMenuItemDisabled}`}
          disabled
        >
          <span className={styles.rowContextMenuItemIcon} aria-hidden="true">
            {renderRowContextMenuIcon("send")}
          </span>
          <span className={styles.rowContextMenuItemLabel}>Send record</span>
        </button>
      </div>
      <div className={styles.rowContextMenuDivider} />
      <div className={styles.rowContextMenuSection}>
        <button
          type="button"
          className={`${styles.rowContextMenuItem} ${styles.rowContextMenuItemDanger}`}
          onClick={onDelete}
        >
          <span className={styles.rowContextMenuItemIcon} aria-hidden="true">
            {renderRowContextMenuIcon("delete")}
          </span>
          <span className={styles.rowContextMenuItemLabel}>Delete record</span>
        </button>
      </div>
    </div>
  );
};
