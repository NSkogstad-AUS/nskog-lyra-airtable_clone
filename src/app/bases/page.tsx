"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";
import styles from "./bases.module.css";

const startBuildingCards = [
  {
    title: "Assignment Workflow",
    description: "Streamline assignment submissions and grading.",
  },
  {
    title: "Student Directory",
    description: "Centralize student profiles and programming skills.",
  },
  {
    title: "Project Tracker",
    description: "Monitor programming projects from proposal to completion.",
  },
];

type HomeBaseGroup = "today" | "past7days" | "earlier";
type BaseViewMode = "grid" | "list";

type HomeBaseCard = {
  id: string;
  title: string;
  opened: string;
  initials: string;
  accent: string;
  group: HomeBaseGroup;
  starred: boolean;
};

const getDefaultBaseName = (existingCount: number) =>
  existingCount > 0 ? `Untitled Base ${existingCount + 1}` : "Untitled Base";

const toDate = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isSameLocalDay = (left: Date, right: Date) =>
  left.getFullYear() === right.getFullYear() &&
  left.getMonth() === right.getMonth() &&
  left.getDate() === right.getDate();

const getOpenedLabel = (date: Date | null) => {
  if (!date) return "Opened recently";
  const nowMs = Date.now();
  const diffMs = Math.max(0, nowMs - date.getTime());
  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (diffMs < minuteMs) return "Opened just now";
  if (diffMs < hourMs) {
    const minutes = Math.max(1, Math.floor(diffMs / minuteMs));
    return `Opened ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (diffMs < dayMs) {
    const hours = Math.max(1, Math.floor(diffMs / hourMs));
    return `Opened ${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  const days = Math.max(1, Math.floor(diffMs / dayMs));
  return `Opened ${days} day${days === 1 ? "" : "s"} ago`;
};

const getBaseGroup = (date: Date | null): HomeBaseGroup => {
  if (!date) return "earlier";
  const now = new Date();
  if (isSameLocalDay(now, date)) return "today";
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const dayMs = 24 * 60 * 60 * 1000;
  if (diffMs < 7 * dayMs) return "past7days";
  return "earlier";
};

const getBaseInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return "Ba";
  const words = trimmed.split(/\s+/).filter(Boolean);
  const formatInitials = (value: string) =>
    `${value.slice(0, 1).toUpperCase()}${value.slice(1, 2).toLowerCase()}`;
  if (words.length === 1) {
    return formatInitials(words[0]?.slice(0, 2) ?? "Ba");
  }
  const first = words[0]?.[0] ?? "";
  const second = words[1]?.[0] ?? "";
  const initials = `${first}${second}`;
  return formatInitials(initials || "Ba");
};

const hashValue = (input: string) => {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const getAccentClass = (baseId: string) => {
  const accents = [styles.blueAccent, styles.purpleAccent].filter(
    (accent): accent is string => Boolean(accent),
  );
  if (accents.length <= 0) return "";
  return accents[hashValue(baseId) % accents.length] ?? "";
};

export default function BasesPage() {
  const router = useRouter();
  const { status: authStatus, data: session } = useSession();
  const utils = api.useUtils();
  const isAuthenticated = authStatus === "authenticated";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsedSidebarPinnedOpen, setIsCollapsedSidebarPinnedOpen] = useState(false);
  const [isCollapsedSidebarHoverOpen, setIsCollapsedSidebarHoverOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [starredBaseIds, setStarredBaseIds] = useState<string[]>([]);
  const [openBaseMenuId, setOpenBaseMenuId] = useState<string | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [baseViewMode, setBaseViewMode] = useState<BaseViewMode>("grid");
  const basesQuery = api.bases.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });
  const createBaseMutation = api.bases.create.useMutation();
  const updateBaseMutation = api.bases.update.useMutation();
  const deleteBaseMutation = api.bases.delete.useMutation();

  const isCollapsedSidebarOverlayOpen =
    isCollapsedSidebarPinnedOpen || isCollapsedSidebarHoverOpen;
  const isSidebarPushingContent = isSidebarOpen || isCollapsedSidebarPinnedOpen;
  const isBaseMutationPending =
    createBaseMutation.isPending ||
    updateBaseMutation.isPending ||
    deleteBaseMutation.isPending;
  const openCreateModal = () => setIsCreateModalOpen(true);
  const openBase = useCallback(
    (baseId: string) => {
      router.push(`/bases/${baseId}/tables`);
    },
    [router],
  );
  const createBase = useCallback(
    async (name: string) => {
      const createdBase = await createBaseMutation.mutateAsync({ name });
      await utils.bases.list.invalidate();
      return createdBase ?? null;
    },
    [createBaseMutation, utils.bases.list],
  );
  const handleBuildOnYourOwn = useCallback(async () => {
    if (isBaseMutationPending) return;
    try {
      const existingCount = basesQuery.data?.length ?? 0;
      const createdBase = await createBase(getDefaultBaseName(existingCount));
      if (!createdBase) return;
      setIsCreateModalOpen(false);
      setOpenBaseMenuId(null);
      openBase(createdBase.id);
    } catch {
      // Intentionally ignore create errors to keep the page usable.
    }
  }, [isBaseMutationPending, basesQuery.data, createBase, openBase]);
  const toggleBaseStar = useCallback((baseId: string) => {
    setStarredBaseIds((prev) =>
      prev.includes(baseId)
        ? prev.filter((id) => id !== baseId)
        : [...prev, baseId],
    );
  }, []);

  useEffect(() => {
    if (!isCreateModalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isCreateModalOpen]);

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.replace("/login");
    }
  }, [authStatus, router]);

  useEffect(() => {
    if (!openBaseMenuId) return;
    const handleGlobalPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (
        target?.closest("[data-base-menu]") ||
        target?.closest("[data-base-menu-trigger]")
      ) {
        return;
      }
      setOpenBaseMenuId(null);
    };
    window.addEventListener("pointerdown", handleGlobalPointerDown);
    return () => {
      window.removeEventListener("pointerdown", handleGlobalPointerDown);
    };
  }, [openBaseMenuId]);

  useEffect(() => {
    if (!isAccountMenuOpen) return;
    const handleGlobalPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (
        target?.closest("[data-account-menu]") ||
        target?.closest("[data-account-menu-trigger]")
      ) {
        return;
      }
      setIsAccountMenuOpen(false);
    };
    window.addEventListener("pointerdown", handleGlobalPointerDown);
    return () => {
      window.removeEventListener("pointerdown", handleGlobalPointerDown);
    };
  }, [isAccountMenuOpen]);

  const homeBases = useMemo<HomeBaseCard[]>(() => {
    const sourceBases = basesQuery.data ?? [];
    const sortedBases = [...sourceBases].sort((left, right) => {
      const leftOpenedAt = toDate(left.updatedAt) ?? toDate(left.createdAt);
      const rightOpenedAt = toDate(right.updatedAt) ?? toDate(right.createdAt);
      const leftTime = leftOpenedAt?.getTime() ?? 0;
      const rightTime = rightOpenedAt?.getTime() ?? 0;
      return rightTime - leftTime;
    });
    return sortedBases.map((base) => {
      const openedAt = toDate(base.updatedAt) ?? toDate(base.createdAt);
      return {
        id: base.id,
        title: base.name,
        opened: getOpenedLabel(openedAt),
        initials: getBaseInitials(base.name),
        accent: getAccentClass(base.id),
        group: getBaseGroup(openedAt),
        starred: starredBaseIds.includes(base.id),
      };
    });
  }, [basesQuery.data, starredBaseIds]);
  const renameBase = useCallback(
    async (baseId: string) => {
      setOpenBaseMenuId(null);
      const base = homeBases.find((candidate) => candidate.id === baseId);
      if (!base) return;
      const nextTitle = window.prompt("Rename base", base.title)?.trim();
      if (!nextTitle || nextTitle === base.title) return;
      try {
        await updateBaseMutation.mutateAsync({ id: baseId, name: nextTitle });
        await utils.bases.list.invalidate();
      } catch {
        // Intentionally ignore rename errors to keep the page usable.
      }
    },
    [homeBases, updateBaseMutation, utils.bases.list],
  );
  const duplicateBase = useCallback(
    async (baseId: string) => {
      setOpenBaseMenuId(null);
      const base = homeBases.find((candidate) => candidate.id === baseId);
      if (!base) return;
      const copyName = `${base.title} copy`;
      try {
        await createBase(copyName);
      } catch {
        // Intentionally ignore duplicate errors to keep the page usable.
      }
    },
    [createBase, homeBases],
  );
  const deleteBase = useCallback(
    async (baseId: string) => {
      setOpenBaseMenuId(null);
      const base = homeBases.find((candidate) => candidate.id === baseId);
      if (!base) return;
      if (!window.confirm(`Delete "${base.title}"?`)) return;
      try {
        await deleteBaseMutation.mutateAsync({ id: baseId });
        await utils.bases.list.invalidate();
        setStarredBaseIds((prev) => prev.filter((id) => id !== baseId));
      } catch {
        // Intentionally ignore delete errors to keep the page usable.
      }
    },
    [deleteBaseMutation, homeBases, utils.bases.list],
  );
  const renderBaseCard = useCallback(
    (base: HomeBaseCard) => {
      const isMenuOpen = openBaseMenuId === base.id;
      return (
        <article key={base.id} className={styles.recentCardShell}>
          <button
            type="button"
            className={styles.recentCard}
            onClick={() => openBase(base.id)}
          >
            <span className={`${styles.recentIcon} ${base.accent}`}>{base.initials}</span>
            <span className={styles.recentMeta}>
              <strong>{base.title}</strong>
              <small>{base.opened}</small>
            </span>
          </button>
          <div
            className={`${styles.cardActions} ${
              isMenuOpen ? styles.cardActionsVisible : ""
            }`.trim()}
          >
            <button
              type="button"
              className={styles.cardActionButton}
              aria-label={base.starred ? "Remove star" : "Star base"}
              data-base-menu-trigger
              onClick={(event) => {
                event.stopPropagation();
                toggleBaseStar(base.id);
              }}
            >
              {base.starred ? "★" : "☆"}
            </button>
            <button
              type="button"
              className={styles.cardActionButton}
              aria-label="Open base menu"
              data-base-menu-trigger
              onClick={(event) => {
                event.stopPropagation();
                setOpenBaseMenuId((prev) => (prev === base.id ? null : base.id));
              }}
            >
              ⋯
            </button>
          </div>
          {isMenuOpen ? (
            <div className={styles.cardMenu} data-base-menu>
              <button
                type="button"
                className={styles.cardMenuItem}
                onClick={(event) => {
                  event.stopPropagation();
                  void renameBase(base.id);
                }}
                disabled={isBaseMutationPending}
              >
                <span className={styles.cardMenuItemIcon}>✎</span>
                Rename
              </button>
              <button
                type="button"
                className={styles.cardMenuItem}
                onClick={(event) => {
                  event.stopPropagation();
                  void duplicateBase(base.id);
                }}
                disabled={isBaseMutationPending}
              >
                <span className={styles.cardMenuItemIcon}>⧉</span>
                Duplicate
              </button>
              <button
                type="button"
                className={`${styles.cardMenuItem} ${styles.cardMenuItemDisabled}`}
                disabled
              >
                <span className={styles.cardMenuItemIcon}>→</span>
                Move
              </button>
              <button
                type="button"
                className={`${styles.cardMenuItem} ${styles.cardMenuItemDisabled}`}
                disabled
              >
                <span className={styles.cardMenuItemIcon}>⎔</span>
                Go to workspace
              </button>
              <button
                type="button"
                className={`${styles.cardMenuItem} ${styles.cardMenuItemDisabled}`}
                disabled
              >
                <span className={styles.cardMenuItemIcon}>🎨</span>
                Customize appearance
              </button>
              <div className={styles.cardMenuDivider} />
              <button
                type="button"
                className={styles.cardMenuItem}
                onClick={(event) => {
                  event.stopPropagation();
                  void deleteBase(base.id);
                }}
                disabled={isBaseMutationPending}
              >
                <span className={styles.cardMenuItemIcon}>🗑</span>
                Delete
              </button>
            </div>
          ) : null}
        </article>
      );
    },
    [
      deleteBase,
      duplicateBase,
      isBaseMutationPending,
      openBase,
      openBaseMenuId,
      renameBase,
      toggleBaseStar,
    ],
  );
  const renderBaseListRow = useCallback(
    (base: HomeBaseCard) => (
      <button
        key={base.id}
        type="button"
        className={styles.baseListRow}
        onClick={() => openBase(base.id)}
      >
        <span className={styles.baseListNameCell}>
          <span className={`${styles.baseListIcon} ${base.accent}`}>{base.initials}</span>
          <span className={styles.baseListNameText}>{base.title}</span>
        </span>
        <span className={styles.baseListMetaGrid}>
          <span className={styles.baseListOpenedCell}>{base.opened}</span>
          <span className={styles.baseListWorkspaceCell}>My First Workspace</span>
          <span className={styles.baseListTrailingSlot} aria-hidden="true" />
        </span>
      </button>
    ),
    [openBase],
  );

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.sidebarToggleButton}`}
            aria-label={isSidebarPushingContent ? "Hide sidebar" : "Show sidebar"}
            aria-expanded={isSidebarPushingContent}
            onClick={() => {
              if (isSidebarOpen) {
                setIsSidebarOpen(false);
                setIsCollapsedSidebarPinnedOpen(false);
                setIsCollapsedSidebarHoverOpen(false);
                return;
              }
              setIsCollapsedSidebarPinnedOpen((prev) => !prev);
            }}
          >
            ☰
          </button>
          <div className={styles.logoWrap}>
            <span className={styles.logoMark} aria-hidden="true" />
            <span className={styles.logoText}>Airtable</span>
          </div>
        </div>
        <button type="button" className={styles.searchButton}>
          <span>Search...</span>
          <kbd>⌘ K</kbd>
        </button>
        <div className={styles.topbarRight}>
          <button type="button" className={styles.topbarTextButton}>
            Help
          </button>
          <button type="button" className={styles.iconCircle} aria-label="Notifications">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className={styles.iconCircleIcon}
            >
              <path
                d="M8 2.6a3 3 0 00-3 3v2.1c0 .5-.16.98-.47 1.38L3.4 10.7c-.23.32-.04.77.35.77h8.5c.39 0 .58-.45.35-.77l-1.12-1.62A2.38 2.38 0 0111 7.7V5.6a3 3 0 00-3-3z"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />
              <path
                d="M6.6 12.4a1.4 1.4 0 002.8 0"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <div className={styles.accountMenuWrap}>
            <button
              type="button"
              className={styles.avatar}
              aria-label="Account"
              aria-expanded={isAccountMenuOpen}
              data-account-menu-trigger
              onClick={() => setIsAccountMenuOpen((prev) => !prev)}
            >
              {session?.user?.name?.slice(0, 1).toUpperCase() ?? "N"}
            </button>
            {isAccountMenuOpen ? (
              <div className={styles.accountMenu} data-account-menu>
                <div className={styles.accountMenuUser}>
                  <strong>{session?.user?.name ?? "Account"}</strong>
                  <span>{session?.user?.email ?? "No email"}</span>
                </div>
                <div className={styles.accountMenuDivider} />
                <button
                  type="button"
                  className={`${styles.accountMenuItem} ${styles.accountMenuItemDisabled}`}
                  disabled
                >
                  <span className={styles.accountMenuItemIcon}>◦</span>
                  Account
                </button>
                <button
                  type="button"
                  className={`${styles.accountMenuItem} ${styles.accountMenuItemDisabled}`}
                  disabled
                >
                  <span className={styles.accountMenuItemIcon}>◦</span>
                  Manage groups
                </button>
                <button
                  type="button"
                  className={`${styles.accountMenuItem} ${styles.accountMenuItemDisabled}`}
                  disabled
                >
                  <span className={styles.accountMenuItemIcon}>◦</span>
                  Notification preferences
                </button>
                <button
                  type="button"
                  className={`${styles.accountMenuItem} ${styles.accountMenuItemDisabled}`}
                  disabled
                >
                  <span className={styles.accountMenuItemIcon}>◦</span>
                  Language preferences
                </button>
                <button
                  type="button"
                  className={`${styles.accountMenuItem} ${styles.accountMenuItemDisabled}`}
                  disabled
                >
                  <span className={styles.accountMenuItemIcon}>◦</span>
                  Appearance
                </button>
                <div className={styles.accountMenuDivider} />
                <button
                  type="button"
                  className={styles.accountMenuItem}
                  onClick={() => {
                    setIsAccountMenuOpen(false);
                    void signOut({ callbackUrl: "/login" });
                  }}
                >
                  <span className={styles.accountMenuItemIcon}>↪</span>
                  Log out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div
        className={`${styles.content} ${!isSidebarPushingContent ? styles.contentSidebarHidden : ""}`.trim()}
      >
        <aside
          className={`${styles.sidebarArea} ${!isSidebarOpen ? styles.sidebarAreaCollapsed : ""} ${
            !isSidebarOpen && isCollapsedSidebarOverlayOpen ? styles.sidebarAreaCollapsedOpen : ""
          }`.trim()}
          onMouseEnter={() => {
            if (!isSidebarOpen && !isCollapsedSidebarPinnedOpen) {
              setIsCollapsedSidebarHoverOpen(true);
            }
          }}
          onMouseLeave={() => {
            if (!isSidebarOpen) {
              setIsCollapsedSidebarHoverOpen(false);
            }
          }}
        >
          <div className={styles.sidebarRail}>
            <div className={styles.sidebarRailTop}>
              <button type="button" className={styles.sidebarRailButton} aria-label="Home">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M2.6 7.2L8 2.8l5.4 4.4V13a.7.7 0 01-.7.7H3.3a.7.7 0 01-.7-.7V7.2z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                  <path d="M6.2 13V9.7h3.6V13" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </button>
              <button type="button" className={styles.sidebarRailButton} aria-label="Starred">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M8 2.2l1.5 3.1 3.4.5-2.5 2.4.6 3.4L8 10.1 5 11.6l.6-3.4L3 5.8l3.4-.5L8 2.2z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button type="button" className={styles.sidebarRailButton} aria-label="Shared">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M5 11l6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M7.5 5H11v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
              <button type="button" className={styles.sidebarRailButton} aria-label="Workspaces">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="5.2" cy="5.2" r="1.8" stroke="currentColor" strokeWidth="1.3" />
                  <circle cx="10.8" cy="5.2" r="1.8" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M2.8 11.8C3.4 10.5 4.2 9.9 5.2 9.9c1 0 1.8.6 2.4 1.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <path d="M8.4 11.8c.6-1.3 1.4-1.9 2.4-1.9 1 0 1.8.6 2.4 1.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className={styles.sidebarRailBottom}>
              <button type="button" className={styles.sidebarRailButton} aria-label="Templates">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="2.5" y="3" width="11" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M8 3v10" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </button>
              <button type="button" className={styles.sidebarRailButton} aria-label="Marketplace">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="2.8" y="2.8" width="10.4" height="10.4" rx="1.4" stroke="currentColor" strokeWidth="1.3" />
                  <circle cx="8" cy="8" r="1.6" fill="currentColor" />
                </svg>
              </button>
              <button type="button" className={styles.sidebarRailButton} aria-label="Global access">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="5.8" stroke="currentColor" strokeWidth="1.3" />
                  <ellipse cx="8" cy="8" rx="2.6" ry="5.8" stroke="currentColor" strokeWidth="1.3" />
                  <path d="M2.2 8h11.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </button>
              <button
                type="button"
                className={`${styles.sidebarRailButton} ${styles.sidebarRailCreateButton}`}
                aria-label="Create"
                onClick={openCreateModal}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 3.2v9.6M3.2 8h9.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          <nav className={styles.sidebar}>
            <a className={`${styles.navRow} ${styles.navRowActive}`} href="#">
              <span className={styles.navRowIcon} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M2.6 7.2L8 2.8l5.4 4.4V13a.7.7 0 01-.7.7H3.3a.7.7 0 01-.7-.7V7.2z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                  <path d="M6.2 13V9.7h3.6V13" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </span>
              <span className={styles.navRowLabel}>Home</span>
            </a>
            <div className={styles.navRowGroup}>
              <a className={styles.navRow} href="#">
                <span className={styles.navRowIcon} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 2.2l1.5 3.1 3.4.5-2.5 2.4.6 3.4L8 10.1 5 11.6l.6-3.4L3 5.8l3.4-.5L8 2.2z"
                      stroke="currentColor"
                      strokeWidth="1.3"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className={styles.navRowLabel}>Starred</span>
              </a>
              <button type="button" className={styles.navRowControl} aria-label="Collapse starred">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <div className={styles.sidebarHintRow}>
              <div className={styles.sidebarHintIcon} aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M8 2.2l1.5 3.1 3.4.5-2.5 2.4.6 3.4L8 10.1 5 11.6l.6-3.4L3 5.8l3.4-.5L8 2.2z"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className={styles.sidebarHint}>
                Your starred bases, interfaces, and workspaces will appear here
              </p>
            </div>
            <a className={styles.navRow} href="#">
              <span className={styles.navRowIcon} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                  <path d="M5 11l6-6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M7.5 5H11v3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </span>
              <span className={styles.navRowLabel}>Shared</span>
            </a>
            <div className={styles.navRowGroup}>
              <a className={styles.navRow} href="#">
                <span className={styles.navRowIcon} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                    <circle cx="5.2" cy="5.2" r="1.8" stroke="currentColor" strokeWidth="1.3" />
                    <circle cx="10.8" cy="5.2" r="1.8" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M2.8 11.8C3.4 10.5 4.2 9.9 5.2 9.9c1 0 1.8.6 2.4 1.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    <path d="M8.4 11.8c.6-1.3 1.4-1.9 2.4-1.9 1 0 1.8.6 2.4 1.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </span>
                <span className={styles.navRowLabel}>Workspaces</span>
              </a>
              <div className={styles.navRowActions}>
                <button type="button" className={styles.navRowControl} aria-label="Create workspace">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 3.2v9.6M3.2 8h9.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
                <button type="button" className={styles.navRowControl} aria-label="Expand workspaces">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className={styles.sidebarFooter}>
              <a className={styles.footerLink} href="#">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M2.5 3.2h4.1c1 0 1.8.8 1.8 1.8v7.1c-.4-.5-1-.8-1.8-.8H2.5V3.2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M13.5 3.2H9.4c-1 0-1.8.8-1.8 1.8v7.1c.4-.5 1-.8 1.8-.8h4.1V3.2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
                <span>Templates and apps</span>
              </a>
              <a className={styles.footerLink} href="#">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3.3 6.2h9.4l-.8 6.1H4.1L3.3 6.2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  <path d="M6 6.2V4.9a2 2 0 014 0v1.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
                <span>Marketplace</span>
              </a>
              <a className={styles.footerLink} href="#">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 10.8V4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <path d="M5.5 6.8L8 4.2l2.5 2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M3.2 12.8h9.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span>Import</span>
              </a>
              <button type="button" className={styles.createButton} onClick={openCreateModal}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M8 3.2v9.6M3.2 8h9.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <span>Create</span>
              </button>
            </div>
          </nav>
        </aside>

        <section className={styles.main}>
          <h1 className={styles.title}>Home</h1>

          <div className={styles.sectionHeader}>
            <h2>Start building</h2>
            <p>Create apps instantly with AI</p>
          </div>

          <div className={styles.startBuildingGrid}>
            {startBuildingCards.map((card) => (
              <button key={card.title} type="button" className={styles.startCard}>
                <strong>{card.title}</strong>
                <span>{card.description}</span>
              </button>
            ))}
          </div>

          <div className={styles.filterRow}>
            <button type="button" className={styles.filterButton}>
              Opened anytime ▾
            </button>
            <div className={styles.viewSwitch}>
              <button
                type="button"
                className={`${styles.viewSwitchButton} ${
                  baseViewMode === "list" ? styles.viewSwitchButtonActive : ""
                }`}
                aria-label="View items in a list"
                title="View items in a list"
                aria-pressed={baseViewMode === "list"}
                onClick={() => setBaseViewMode("list")}
              >
                ☰
              </button>
              <button
                type="button"
                className={`${styles.viewSwitchButton} ${
                  baseViewMode === "grid" ? styles.viewSwitchButtonActive : ""
                }`}
                aria-label="View items in a grid"
                title="View items in a grid"
                aria-pressed={baseViewMode === "grid"}
                onClick={() => setBaseViewMode("grid")}
              >
                ⊞
              </button>
            </div>
          </div>

          {authStatus === "loading" || (isAuthenticated && basesQuery.isLoading) ? (
            <div className={styles.recentGroup}>
              <h3>Loading bases...</h3>
            </div>
          ) : null}

          {isAuthenticated && !basesQuery.isLoading ? (
            <>
              {homeBases.length <= 0 ? (
                <div className={styles.recentGroup}>
                  <h3>No bases yet</h3>
                </div>
              ) : null}
              {homeBases.length > 0 && baseViewMode === "grid" ? (
                <div className={styles.recentCardsList}>{homeBases.map(renderBaseCard)}</div>
              ) : null}
              {homeBases.length > 0 && baseViewMode === "list" ? (
                <div className={styles.baseListWrap}>
                  <div className={styles.baseListHeaderWrap}>
                    <div className={styles.baseListHeader}>
                      <span>Name</span>
                      <span className={`${styles.baseListMetaGrid} ${styles.baseListHeaderMeta}`}>
                        <span>Last opened</span>
                        <span>Workspace</span>
                        <span aria-hidden="true" />
                      </span>
                    </div>
                    <hr className={styles.baseListDivider} />
                  </div>
                  <div className={styles.baseListBody}>{homeBases.map(renderBaseListRow)}</div>
                </div>
              ) : null}
            </>
          ) : null}
        </section>
      </div>
      {isCreateModalOpen ? (
        <div className={styles.createModalBackdrop} onClick={() => setIsCreateModalOpen(false)}>
          <div
            className={styles.createModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.createModalHeader}>
              <h3 id="create-modal-title">How do you want to start?</h3>
              <button
                type="button"
                className={styles.createModalClose}
                aria-label="Close create modal"
                onClick={() => setIsCreateModalOpen(false)}
              >
                ×
              </button>
            </div>
            <div className={styles.createModalOptions}>
              <button
                type="button"
                className={`${styles.createModalOption} ${styles.createModalOptionDisabled}`}
                disabled
                aria-disabled="true"
              >
                <div className={`${styles.createOptionImageWrap} ${styles.createOptionImageWrapOmni}`}>
                  <Image
                    src="/assets/im-buildwithomni.png"
                    alt="Build an app with Omni"
                    width={688}
                    height={400}
                    className={styles.createOptionImage}
                  />
                </div>
                <div className={styles.createOptionBody}>
                  <p className={styles.createOptionTitle}>
                    Build an app with Omni <span className={styles.createOptionBadge}>New</span>
                  </p>
                  <p className={styles.createOptionText}>
                    Use AI to build a custom app tailored to your workflow.
                  </p>
                </div>
              </button>
              <button
                type="button"
                className={styles.createModalOption}
                onClick={handleBuildOnYourOwn}
                disabled={isBaseMutationPending}
              >
                <div className={`${styles.createOptionImageWrap} ${styles.createOptionImageWrapCustom}`}>
                  <Image
                    src="/assets/im-buildyourown.png"
                    alt="Build an app on your own"
                    width={1032}
                    height={600}
                    className={styles.createOptionImage}
                  />
                </div>
                <div className={styles.createOptionBody}>
                  <p className={styles.createOptionTitle}>Build an app on your own</p>
                  <p className={styles.createOptionText}>
                    {isBaseMutationPending
                      ? "Creating your base..."
                      : "Start with a blank app and build your ideal workflow."}
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
