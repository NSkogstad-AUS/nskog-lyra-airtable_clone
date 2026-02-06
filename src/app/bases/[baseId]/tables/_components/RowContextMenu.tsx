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
  const sharedProps = { width: 16, height: 16, viewBox: "0 0 16 16", fill: "currentColor" as const };
  switch (icon) {
    case "askOmni":
      return (
        <svg {...sharedProps}>
          <path d="M8 1.5l.9 2.7 2.7.9-2.7.9L8 8.7l-.9-2.7-2.7-.9 2.7-.9L8 1.5zm4.2 5.3l.5 1.6 1.6.5-1.6.5-.5 1.6-.5-1.6-1.6-.5 1.6-.5.5-1.6zM4.2 10.3l.5 1.6 1.6.5-1.6.5-.5 1.6-.5-1.6-1.6-.5 1.6-.5.5-1.6z" />
        </svg>
      );
    case "insertAbove":
      return (
        <svg {...sharedProps}>
          <path d="M8 3l3 3-1.06 1.06L8.75 5.88V14h-1.5V5.88L6.06 7.06 5 6l3-3zM2 2h12v1.5H2V2z" />
        </svg>
      );
    case "insertBelow":
      return (
        <svg {...sharedProps}>
          <path d="M8 13l-3-3 1.06-1.06 1.19 1.18V2h1.5v8.12l1.19-1.18L11 10l-3 3zM2 12.5h12V14H2v-1.5z" />
        </svg>
      );
    case "duplicate":
      return (
        <svg {...sharedProps}>
          <path d="M4 2h8a2 2 0 012 2v8h-2V4H4V2zm-2 4h8a2 2 0 012 2v6H2a2 2 0 01-2-2V6h2z" />
        </svg>
      );
    case "template":
      return (
        <svg {...sharedProps}>
          <path d="M3 2h10v12H3V2zm2 3h6v1.5H5V5zm0 3h6v1.5H5V8zm0 3h4v1.5H5V11z" />
        </svg>
      );
    case "expand":
      return (
        <svg {...sharedProps}>
          <path d="M9.5 2.75a.75.75 0 01.75-.75h3a.75.75 0 01.75.75v3a.75.75 0 01-1.5 0V4.06l-2.72 2.72a.75.75 0 01-1.06-1.06L11.44 3H10.25a.75.75 0 01-.75-.75zM6.5 13.25a.75.75 0 01-.75.75h-3a.75.75 0 01-.75-.75v-3a.75.75 0 011.5 0v1.69l2.72-2.72a.75.75 0 111.06 1.06L4.56 13h1.19a.75.75 0 01.75.75z" />
        </svg>
      );
    case "agent":
      return (
        <svg {...sharedProps}>
          <path d="M6 2.5a2 2 0 014 0V4h2a1 1 0 011 1v6a3 3 0 01-3 3H6a3 3 0 01-3-3V5a1 1 0 011-1h2V2.5zm1.5 0V4h1V2.5a.5.5 0 00-1 0zM5.25 8a.75.75 0 100 1.5.75.75 0 000-1.5zm5.5 0a.75.75 0 100 1.5.75.75 0 000-1.5z" />
        </svg>
      );
    case "comment":
      return (
        <svg {...sharedProps}>
          <path d="M3 3h10a1 1 0 011 1v6a1 1 0 01-1 1H7l-3.2 2.4a.5.5 0 01-.8-.4V11H3a1 1 0 01-1-1V4a1 1 0 011-1z" />
        </svg>
      );
    case "copyUrl":
      return (
        <svg {...sharedProps}>
          <path d="M7.25 4.5a3.25 3.25 0 114.6 4.6l-2.1 2.1a3.25 3.25 0 11-4.6-4.6l.7-.7a.75.75 0 111.06 1.06l-.7.7a1.75 1.75 0 002.48 2.48l2.1-2.1a1.75 1.75 0 00-2.48-2.48l-.7.7a.75.75 0 01-1.06-1.06l.7-.7z" />
        </svg>
      );
    case "send":
      return (
        <svg {...sharedProps}>
          <path d="M2.5 3h11A1.5 1.5 0 0115 4.5v7A1.5 1.5 0 0113.5 13h-11A1.5 1.5 0 011 11.5v-7A1.5 1.5 0 012.5 3zm0 1.5v.3l5.1 3.2a1 1 0 001.08 0l5.1-3.2V4.5h-11z" />
        </svg>
      );
    case "delete":
      return (
        <svg {...sharedProps}>
          <path d="M6 2h4l.5 1H14v1.5H2V3h3.5L6 2zm-2 3h8l-.7 9.5H4.7L4 5zm3 1.5v7H5.5v-7H7zm3 0v7H8.5v-7H10z" />
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
