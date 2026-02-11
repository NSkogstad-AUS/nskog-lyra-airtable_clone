import type { CSSProperties, DragEvent, MouseEvent, RefObject } from "react";
import type { SidebarViewContextMenuState, SidebarViewKind } from "../_lib/types";
import styles from "../tables.module.css";
import layoutStyles from "./LeftNavContent.module.css";

type ViewLike = { id: string; name: string } & Record<string, unknown>;

type Props = {
  createViewButtonRef: RefObject<HTMLButtonElement | null>;
  isCreateViewMenuOpen: boolean;
  onToggleCreateViewMenu: () => void;
  createViewMenuRef: RefObject<HTMLDivElement | null>;
  createViewMenuPosition: CSSProperties;
  handleCreateGridView: () => void;
  activeTableId: string | null;
  handleCreateFormView: () => void;
  isCreateViewDialogOpen: boolean;
  createViewDialogRef: RefObject<HTMLDivElement | null>;
  createViewDialogPosition: CSSProperties;
  createViewDialogInputRef: RefObject<HTMLInputElement | null>;
  createViewDialogName: string;
  setCreateViewDialogName: (value: string) => void;
  handleCreateViewDialogSubmit: () => void;
  handleCreateViewDialogCancel: () => void;
  favoriteViews: ViewLike[];
  orderedTableViews: ViewLike[];
  resolveSidebarViewKind: (view: ViewLike) => SidebarViewKind;
  activeView: ViewLike | null;
  sidebarViewContextMenu: SidebarViewContextMenuState | null;
  sidebarContextView: ViewLike | null;
  sidebarContextViewKindLabel: string;
  draggingViewId: string | null;
  viewDragOverId: string | null;
  selectView: (viewId: string, viewName: string) => void;
  openSidebarViewContextMenu: (event: MouseEvent<HTMLElement>, viewId: string) => void;
  handleViewDragOver: (event: DragEvent<HTMLElement>, viewId: string) => void;
  handleViewDrop: (event: DragEvent<HTMLElement>, viewId: string) => void;
  handleViewDragStart: (event: DragEvent<HTMLElement>, viewId: string) => void;
  handleViewDrag: (event: DragEvent<HTMLElement>, viewId: string) => void;
  handleViewDragEnd: (event: DragEvent<HTMLElement>) => void;
  toggleViewFavorite: (viewId: string) => void;
  setSidebarViewContextMenu: (state: SidebarViewContextMenuState | null) => void;
  favoriteViewIdSet: Set<string>;
  activeTableBootstrapQuery: { isLoading: boolean };
  tableViews: ViewLike[];
  sidebarViewContextMenuRef: RefObject<HTMLDivElement | null>;
  handleRenameViewById: (viewId: string) => void;
  handleDuplicateViewById: (viewId: string) => void;
  handleDeleteViewById: (viewId: string) => void;
  isViewActionPending: boolean;
  viewSearchValue: string;
  onViewSearchChange: (value: string) => void;
  hasViewSearch: boolean;
};

export const LeftNavContent = ({
  createViewButtonRef,
  isCreateViewMenuOpen,
  onToggleCreateViewMenu,
  createViewMenuRef,
  createViewMenuPosition,
  handleCreateGridView,
  activeTableId,
  handleCreateFormView,
  isCreateViewDialogOpen,
  createViewDialogRef,
  createViewDialogPosition,
  createViewDialogInputRef,
  createViewDialogName,
  setCreateViewDialogName,
  handleCreateViewDialogSubmit,
  handleCreateViewDialogCancel,
  favoriteViews,
  orderedTableViews,
  resolveSidebarViewKind,
  activeView,
  sidebarViewContextMenu,
  sidebarContextView,
  sidebarContextViewKindLabel,
  draggingViewId,
  viewDragOverId,
  selectView,
  openSidebarViewContextMenu,
  handleViewDragOver,
  handleViewDrop,
  handleViewDragStart,
  handleViewDrag,
  handleViewDragEnd,
  toggleViewFavorite,
  setSidebarViewContextMenu,
  favoriteViewIdSet,
  activeTableBootstrapQuery,
  tableViews,
  sidebarViewContextMenuRef,
  handleRenameViewById,
  handleDuplicateViewById,
  handleDeleteViewById,
  isViewActionPending,
  viewSearchValue,
  onViewSearchChange,
  hasViewSearch,
}: Props) => {
  const gridViewCount = tableViews.filter(
    (view) => resolveSidebarViewKind(view) === "grid",
  ).length;
  const canDeleteSidebarView =
    sidebarContextView != null
      ? resolveSidebarViewKind(sidebarContextView) !== "grid" ||
        gridViewCount > 1
      : false;
  const deleteViewTooltip =
    "You can't delete a view when it's the only grid view left in the table.";

  return (
    <div className={layoutStyles.leftNavContent}>
    <button
      ref={createViewButtonRef}
      type="button"
      className={styles.createViewButton}
      aria-expanded={isCreateViewMenuOpen}
      aria-controls="create-view-menu"
      onClick={onToggleCreateViewMenu}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z" />
      </svg>
      Create new...
    </button>
    {isCreateViewMenuOpen ? (
      <div
        id="create-view-menu"
        ref={createViewMenuRef}
        className={styles.createViewMenu}
        role="menu"
        style={createViewMenuPosition}
      >
        <button
          type="button"
          className={styles.createViewMenuItem}
          onClick={handleCreateGridView}
          disabled={!activeTableId}
        >
          <span className={styles.createViewMenuIcon} aria-hidden="true">
            <span className={`${styles.createViewMenuIconMask} ${styles.createViewMenuIconGrid}`} />
          </span>
          <span className={styles.createViewMenuLabel}>Grid</span>
        </button>
        <button
          type="button"
          className={`${styles.createViewMenuItem} ${styles.createViewMenuItemMuted}`}
          disabled
        >
          <span className={styles.createViewMenuIcon} aria-hidden="true">
            <span className={`${styles.createViewMenuIconMask} ${styles.createViewMenuIconCalendar}`} />
          </span>
          <span className={styles.createViewMenuLabel}>Calendar</span>
        </button>
        <button
          type="button"
          className={`${styles.createViewMenuItem} ${styles.createViewMenuItemMuted}`}
          disabled
        >
          <span className={styles.createViewMenuIcon} aria-hidden="true">
            <span className={`${styles.createViewMenuIconMask} ${styles.createViewMenuIconGallery}`} />
          </span>
          <span className={styles.createViewMenuLabel}>Gallery</span>
        </button>
        <button
          type="button"
          className={`${styles.createViewMenuItem} ${styles.createViewMenuItemMuted}`}
          disabled
        >
          <span className={styles.createViewMenuIcon} aria-hidden="true">
            <span className={`${styles.createViewMenuIconMask} ${styles.createViewMenuIconKanban}`} />
          </span>
          <span className={styles.createViewMenuLabel}>Kanban</span>
        </button>
        <button
          type="button"
          className={`${styles.createViewMenuItem} ${styles.createViewMenuItemMuted}`}
          disabled
        >
          <span className={styles.createViewMenuIcon} aria-hidden="true">
            <span className={`${styles.createViewMenuIconMask} ${styles.createViewMenuIconTimeline}`} />
          </span>
          <span className={styles.createViewMenuLabel}>
            Timeline
            <span className={styles.createViewMenuTag}>
              <span className={styles.createViewMenuTagIcon} aria-hidden="true" />
              <span className={styles.createViewMenuTagText}>Team</span>
            </span>
          </span>
        </button>
        <button
          type="button"
          className={`${styles.createViewMenuItem} ${styles.createViewMenuItemMuted}`}
          disabled
        >
          <span className={styles.createViewMenuIcon} aria-hidden="true">
            <span className={`${styles.createViewMenuIconMask} ${styles.createViewMenuIconList}`} />
          </span>
          <span className={styles.createViewMenuLabel}>List</span>
        </button>
        <button
          type="button"
          className={`${styles.createViewMenuItem} ${styles.createViewMenuItemMuted}`}
          disabled
        >
          <span className={styles.createViewMenuIcon} aria-hidden="true">
            <span className={`${styles.createViewMenuIconMask} ${styles.createViewMenuIconGantt}`} />
          </span>
          <span className={styles.createViewMenuLabel}>
            Gantt
            <span className={styles.createViewMenuTag}>
              <span className={styles.createViewMenuTagIcon} aria-hidden="true" />
              <span className={styles.createViewMenuTagText}>Team</span>
            </span>
          </span>
        </button>
        <div className={styles.createViewMenuDivider} />
        <button
          type="button"
          className={`${styles.createViewMenuItem} ${styles.createViewMenuItemMuted}`}
          onClick={handleCreateFormView}
          disabled
        >
          <span className={styles.createViewMenuIcon} aria-hidden="true">
            <span className={`${styles.createViewMenuIconMask} ${styles.createViewMenuIconForm}`} />
          </span>
          <span className={styles.createViewMenuLabel}>Form</span>
        </button>
        <div className={styles.createViewMenuDivider} />
        <button
          type="button"
          className={`${styles.createViewMenuItem} ${styles.createViewMenuItemMuted}`}
          disabled
        >
          <span className={styles.createViewMenuIcon} aria-hidden="true">
            <span className={`${styles.createViewMenuIconMask} ${styles.createViewMenuIconSection}`} />
          </span>
          <span className={styles.createViewMenuLabel}>
            Section
            <span className={styles.createViewMenuTag}>
              <span className={styles.createViewMenuTagIcon} aria-hidden="true" />
              <span className={styles.createViewMenuTagText}>Team</span>
            </span>
          </span>
        </button>
      </div>
    ) : null}
    {isCreateViewDialogOpen ? (
      <div
        id="create-view-dialog"
        ref={createViewDialogRef}
        className={styles.createViewDialog}
        role="dialog"
        aria-label="Create view"
        style={createViewDialogPosition}
      >
        <div className={styles.createViewDialogNameBlock}>
          <input
            ref={createViewDialogInputRef}
            aria-label="Update view name"
            type="text"
            className={styles.createViewDialogNameInput}
            maxLength={256}
            value={createViewDialogName}
            onChange={(event) => setCreateViewDialogName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleCreateViewDialogSubmit();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                handleCreateViewDialogCancel();
              }
            }}
          />
          <div className={styles.createViewDialogNameHint} aria-hidden="true" />
        </div>
        <div className={styles.createViewDialogSectionTitle}>Who can edit</div>
        <div className={styles.createViewDialogPermissions}>
          <ul role="radiogroup" aria-disabled="true" className={styles.createViewDialogRadioGroup}>
            <li className={styles.createViewDialogRadioOption} role="radio" aria-checked="true">
              <span className={styles.createViewDialogRadio}>
                <span className={styles.createViewDialogRadioDot} />
              </span>
              <span
                className={`${styles.createViewDialogOptionIcon} ${styles.createViewDialogOptionIconCollaborative}`}
                aria-hidden="true"
              />
              <span className={styles.createViewDialogOptionLabel}>Collaborative</span>
            </li>
            <li className={styles.createViewDialogRadioOption} role="radio" aria-checked="false">
              <span className={styles.createViewDialogRadio}>
                <span className={styles.createViewDialogRadioDot} />
              </span>
              <span
                className={`${styles.createViewDialogOptionIcon} ${styles.createViewDialogOptionIconPersonal}`}
                aria-hidden="true"
              />
              <span className={styles.createViewDialogOptionLabel}>Personal</span>
            </li>
            <li className={styles.createViewDialogRadioOption} role="radio" aria-checked="false">
              <span className={styles.createViewDialogRadio}>
                <span className={styles.createViewDialogRadioDot} />
              </span>
              <span
                className={`${styles.createViewDialogOptionIcon} ${styles.createViewDialogOptionIconLocked}`}
                aria-hidden="true"
              />
              <span className={styles.createViewDialogOptionLabel}>Locked</span>
            </li>
          </ul>
          <div className={styles.createViewDialogHint}>
            All collaborators can edit the configuration
          </div>
        </div>
        <div className={styles.createViewDialogActions}>
          <button type="button" className={styles.createViewDialogCancel} onClick={handleCreateViewDialogCancel}>
            <span className={styles.createViewDialogButtonLabel}>Cancel</span>
          </button>
          <button type="button" className={styles.createViewDialogCreate} onClick={handleCreateViewDialogSubmit}>
            <span className={styles.createViewDialogButtonLabel}>Create new view</span>
          </button>
        </div>
      </div>
    ) : null}
    <div className={styles.viewSearch}>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85a1.007 1.007 0 00-.115-.1zM12 6.5a5.5 5.5 0 11-11 0 5.5 5.5 0 0111 0z" />
      </svg>
      <input
        type="text"
        className={styles.viewSearchInput}
        placeholder="Find a view"
        value={viewSearchValue}
        onChange={(event) => onViewSearchChange(event.target.value)}
        aria-label="Find a view"
      />
    </div>
    <div className={styles.viewList}>
      {favoriteViews.length > 0 ? (
        <div className={styles.favoriteViewsSection}>
          <div className={styles.favoriteViewsHeader}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className={styles.favoriteViewsStar} aria-hidden="true">
              <path d="M8 1.5l1.82 3.69 4.08.59-2.95 2.87.7 4.06L8 10.79l-3.65 1.92.7-4.06L2.1 5.78l4.08-.59L8 1.5z" />
            </svg>
            <span>My favorites</span>
          </div>
          <div className={styles.favoriteViewsList}>
            {favoriteViews.map((view) => {
              const viewKind = resolveSidebarViewKind(view);
              const isActive = view.id === activeView?.id;
              const isMenuTarget = sidebarViewContextMenu?.viewId === view.id;
              const isDragging = draggingViewId === view.id;
              const isDragOver =
                viewDragOverId === view.id && Boolean(draggingViewId) && draggingViewId !== view.id;
              return (
                <div
                  key={`favorite-${view.id}`}
                  data-view-id={view.id}
                  className={`${styles.viewListItem} ${styles.favoriteViewListItem} ${
                    isActive ? styles.viewListItemActive : ""
                  } ${isMenuTarget ? styles.viewListItemMenuTarget : ""} ${
                    isDragging ? styles.viewListItemDragging : ""
                  } ${isDragOver ? styles.viewListItemDragOver : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectView(view.id, view.name)}
                  onContextMenu={(event) => openSidebarViewContextMenu(event, view.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectView(view.id, view.name);
                    }
                  }}
                  onDragOver={(event) => handleViewDragOver(event, view.id)}
                  onDrop={(event) => handleViewDrop(event, view.id)}
                >
                  <span
                    className={`${styles.viewListItemIconButton} ${styles.viewListItemIconButtonFavorite}`}
                    aria-hidden="true"
                  >
                    <span className={styles.viewListItemIconStack}>
                      <span
                        className={`${styles.viewListItemIconLayer} ${styles.viewListItemIconKind} ${styles.viewKindIconMask} ${
                          viewKind === "form" ? styles.viewKindIconForm : styles.viewKindIconGrid
                        }`}
                      />
                    </span>
                  </span>
                  <span className={styles.viewListItemLabel}>{view.name}</span>
                  <span className={styles.viewListItemActions}>
                    <button
                      type="button"
                      className={styles.viewListItemActionButton}
                      aria-label="Open view menu"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (sidebarViewContextMenu?.viewId === view.id) {
                          setSidebarViewContextMenu(null);
                          return;
                        }
                        openSidebarViewContextMenu(event, view.id);
                      }}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <span
                        className={`${styles.viewListItemActionIcon} ${styles.viewListItemMenuIcon}`}
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      type="button"
                      className={`${styles.viewListItemActionButton} ${styles.viewListItemDragHandle}`}
                      aria-label="Drag to reorder view"
                      data-context-menu-keep="true"
                      draggable
                      onDragStart={(event) => handleViewDragStart(event, view.id)}
                      onDrag={(event) => handleViewDrag(event, view.id)}
                      onDragEnd={handleViewDragEnd}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <span
                        className={`${styles.viewListItemActionIcon} ${styles.viewListItemDragIcon}`}
                        aria-hidden="true"
                      />
                    </button>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {orderedTableViews.map((view) => {
        const viewKind = resolveSidebarViewKind(view);
        const isActive = view.id === activeView?.id;
        const isFavorite = favoriteViewIdSet.has(view.id);
        const isMenuTarget = sidebarViewContextMenu?.viewId === view.id;
        const isDragging = draggingViewId === view.id;
        const isDragOver =
          viewDragOverId === view.id && Boolean(draggingViewId) && draggingViewId !== view.id;
        return (
          <div
            key={view.id}
            data-view-id={view.id}
            className={`${styles.viewListItem} ${isActive ? styles.viewListItemActive : ""} ${
              isMenuTarget ? styles.viewListItemMenuTarget : ""
            } ${isDragging ? styles.viewListItemDragging : ""} ${
              isDragOver ? styles.viewListItemDragOver : ""
            }`}
            role="button"
            tabIndex={0}
            onClick={() => selectView(view.id, view.name)}
            onContextMenu={(event) => openSidebarViewContextMenu(event, view.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectView(view.id, view.name);
              }
            }}
            onDragOver={(event) => handleViewDragOver(event, view.id)}
            onDrop={(event) => handleViewDrop(event, view.id)}
          >
            <button
              type="button"
              className={`${styles.viewListItemIconButton} ${
                isFavorite ? styles.viewListItemIconButtonFavorite : ""
              }`}
              aria-pressed={isFavorite}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              onClick={(event) => {
                event.stopPropagation();
                toggleViewFavorite(view.id);
              }}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <span className={styles.viewListItemIconStack} aria-hidden="true">
                <span
                  className={`${styles.viewListItemIconLayer} ${styles.viewListItemIconKind} ${styles.viewKindIconMask} ${
                    viewKind === "form" ? styles.viewKindIconForm : styles.viewKindIconGrid
                  }`}
                />
                <span className={`${styles.viewListItemIconLayer} ${styles.viewListItemStarEmpty}`} />
                <span className={`${styles.viewListItemIconLayer} ${styles.viewListItemStarFilled}`} />
              </span>
            </button>
            <span className={styles.viewListItemLabel}>{view.name}</span>
            <span className={styles.viewListItemActions}>
              <button
                type="button"
                className={styles.viewListItemActionButton}
                aria-label="Open view menu"
                onClick={(event) => {
                  event.stopPropagation();
                  if (sidebarViewContextMenu?.viewId === view.id) {
                    setSidebarViewContextMenu(null);
                    return;
                  }
                  openSidebarViewContextMenu(event, view.id);
                }}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <span
                  className={`${styles.viewListItemActionIcon} ${styles.viewListItemMenuIcon}`}
                  aria-hidden="true"
                />
              </button>
              <button
                type="button"
                className={`${styles.viewListItemActionButton} ${styles.viewListItemDragHandle}`}
                aria-label="Drag to reorder view"
                data-context-menu-keep="true"
                draggable
                onDragStart={(event) => handleViewDragStart(event, view.id)}
                onDrag={(event) => handleViewDrag(event, view.id)}
                onDragEnd={handleViewDragEnd}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <span
                  className={`${styles.viewListItemActionIcon} ${styles.viewListItemDragIcon}`}
                  aria-hidden="true"
                />
              </button>
            </span>
          </div>
        );
      })}
      {!activeTableBootstrapQuery.isLoading && favoriteViews.length === 0 && orderedTableViews.length === 0 ? (
        <div className={styles.viewListItem}>{hasViewSearch ? "No matching views" : "No views yet"}</div>
      ) : null}
    </div>
    {sidebarViewContextMenu && sidebarContextView ? (
      <div
        ref={sidebarViewContextMenuRef}
        className={styles.sidebarViewContextMenu}
        role="menu"
        style={{
          top: sidebarViewContextMenu.top,
          left: sidebarViewContextMenu.left,
        }}
        onContextMenu={(event) => event.preventDefault()}
      >
        <button
          type="button"
          className={styles.sidebarViewContextMenuItem}
          onClick={() => {
            toggleViewFavorite(sidebarContextView.id);
            setSidebarViewContextMenu(null);
          }}
        >
          <span className={styles.sidebarViewContextMenuItemIcon} aria-hidden="true">
            {favoriteViewIdSet.has(sidebarContextView.id) ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1.5l1.82 3.69 4.08.59-2.95 2.87.7 4.06L8 10.79l-3.65 1.92.7-4.06L2.1 5.78l4.08-.59L8 1.5z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1.5l1.82 3.69 4.08.59-2.95 2.87.7 4.06L8 10.79l-3.65 1.92.7-4.06L2.1 5.78l4.08-.59L8 1.5z"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span className={styles.sidebarViewContextMenuItemLabel}>
            {favoriteViewIdSet.has(sidebarContextView.id)
              ? "Remove from 'My favorites'"
              : "Add to 'My favorites'"}
          </span>
        </button>
        <div className={styles.sidebarViewContextMenuDivider} />
        <button
          type="button"
          className={styles.sidebarViewContextMenuItem}
          onClick={() => handleRenameViewById(sidebarContextView.id)}
          disabled={isViewActionPending}
        >
          <span className={styles.sidebarViewContextMenuItemIcon} aria-hidden="true">
            <span
              className={`${styles.sidebarViewContextMenuIconMask} ${styles.sidebarViewContextMenuIconRename}`}
            />
          </span>
          <span className={styles.sidebarViewContextMenuItemLabel}>
            Rename {sidebarContextViewKindLabel}
          </span>
        </button>
        <button
          type="button"
          className={styles.sidebarViewContextMenuItem}
          onClick={() => handleDuplicateViewById(sidebarContextView.id)}
          disabled={isViewActionPending}
        >
          <span className={styles.sidebarViewContextMenuItemIcon} aria-hidden="true">
            <span
              className={`${styles.sidebarViewContextMenuIconMask} ${styles.sidebarViewContextMenuIconDuplicate}`}
            />
          </span>
          <span className={styles.sidebarViewContextMenuItemLabel}>
            Duplicate {sidebarContextViewKindLabel}
          </span>
        </button>
        <button
          type="button"
          className={`${styles.sidebarViewContextMenuItem} ${styles.sidebarViewContextMenuItemDanger}`}
          onClick={() => {
            if (!canDeleteSidebarView || isViewActionPending) return;
            handleDeleteViewById(sidebarContextView.id);
          }}
          aria-disabled={!canDeleteSidebarView || isViewActionPending}
          data-tooltip={!canDeleteSidebarView ? deleteViewTooltip : undefined}
        >
          <span className={styles.sidebarViewContextMenuItemIcon} aria-hidden="true">
            <span
              className={`${styles.sidebarViewContextMenuIconMask} ${styles.sidebarViewContextMenuIconDelete}`}
            />
          </span>
          <span className={styles.sidebarViewContextMenuItemLabel}>
            Delete {sidebarContextViewKindLabel}
          </span>
        </button>
      </div>
    ) : null}
  </div>
  );
};
