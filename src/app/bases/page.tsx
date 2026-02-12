"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { api } from "~/trpc/react";
import styles from "./bases.module.css";

const startBuildingCards = [
  {
    title: "Start with Omni",
    description: "Use AI to build a custom app tailored to your workflow.",
    icon: "/SVG/Asset%20336Airtable.svg",
    iconClass: "startCardIconOmni",
  },
  {
    title: "Start with templates",
    description: "Select a template to get started and customize as you go.",
    icon: "/SVG/Asset%20389Airtable.svg",
    iconClass: "startCardIconTemplates",
  },
  {
    title: "Quickly upload",
    description: "Easily migrate your existing projects in just a few minutes.",
    icon: "/SVG/Asset%20190Airtable.svg",
    iconClass: "startCardIconUpload",
  },
  {
    title: "Build an app on your own",
    description: "Start with a blank app and build your ideal workflow.",
    icon: "/SVG/Asset%20234Airtable.svg",
    iconClass: "startCardIconBuild",
  },
];

type HomeBaseGroup = "today" | "past7days" | "earlier";
type BaseViewMode = "grid" | "list";

type HomeBaseCard = {
  id: string;
  title: string;
  opened: string;
  initials: string;
  accentColor: string;
  group: HomeBaseGroup;
  starred: boolean;
};

const BASE_GROUP_LABELS: Record<HomeBaseGroup, string> = {
  today: "Today",
  past7days: "Past 7 days",
  earlier: "Earlier",
};

const BASE_GROUP_ORDER: HomeBaseGroup[] = ["today", "past7days", "earlier"];

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
  const formatInitials = (value: string) =>
    `${value.slice(0, 1).toUpperCase()}${value.slice(1, 2).toLowerCase()}`;
  const compact = trimmed.replace(/\s+/g, "");
  return formatInitials(compact.slice(0, 2) || "Ba");
};

const hashValue = (input: string) => {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const FALLBACK_BASE_ACCENTS = ["#2b71d7", "#8e4b88"] as const;

const resolveBaseAccent = (baseId: string, accent?: string | null) => {
  if (accent) return accent;
  return (
    FALLBACK_BASE_ACCENTS[hashValue(baseId) % FALLBACK_BASE_ACCENTS.length] ?? "#2b71d7"
  );
};

const getContrastColor = (hex: string) => {
  const normalized = hex.replace("#", "");
  const isShort = normalized.length === 3;
  const fullHex = isShort
    ? normalized
        .split("")
        .map((char) => char + char)
        .join("")
    : normalized;
  const value = Number.parseInt(fullHex, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 160 ? "#1d1f25" : "#ffffff";
};

const getAccentStyle = (accentColor: string) => {
  const contrast = getContrastColor(accentColor);
  return {
    backgroundColor: accentColor,
    color: contrast,
    ["--base-accent-contrast" as keyof CSSProperties]: contrast,
  };
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
  const [deleteConfirmBaseId, setDeleteConfirmBaseId] = useState<string | null>(null);
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
    if (!deleteConfirmBaseId) return;
    const handleGlobalPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (
        target?.closest("[data-delete-confirm]") ||
        target?.closest("[data-delete-confirm-trigger]")
      ) {
        return;
      }
      setDeleteConfirmBaseId(null);
    };
    window.addEventListener("pointerdown", handleGlobalPointerDown);
    return () => {
      window.removeEventListener("pointerdown", handleGlobalPointerDown);
    };
  }, [deleteConfirmBaseId]);

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
        accentColor: resolveBaseAccent(base.id, base.accent),
        group: getBaseGroup(openedAt),
        starred: starredBaseIds.includes(base.id),
      };
    });
  }, [basesQuery.data, starredBaseIds]);
  const baseListSections = useMemo(() => {
    const grouped: Record<HomeBaseGroup, HomeBaseCard[]> = {
      today: [],
      past7days: [],
      earlier: [],
    };
    homeBases.forEach((base) => {
      grouped[base.group].push(base);
    });
    return BASE_GROUP_ORDER.map((group) => ({
      id: group,
      label: BASE_GROUP_LABELS[group],
      items: grouped[group],
    })).filter((section) => section.items.length > 0);
  }, [homeBases]);
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
      setDeleteConfirmBaseId(null);
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
  const openDeleteConfirm = useCallback((baseId: string) => {
    setOpenBaseMenuId(null);
    setDeleteConfirmBaseId(baseId);
  }, []);
  const deleteBase = useCallback(
    async (baseId: string) => {
      setOpenBaseMenuId(null);
      setDeleteConfirmBaseId(null);
      const base = homeBases.find((candidate) => candidate.id === baseId);
      if (!base) return;
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
      const isDeleteConfirmOpen = deleteConfirmBaseId === base.id;
      return (
        <article key={base.id} className={styles.recentCardShell}>
          <button
            type="button"
            className={styles.recentCard}
            onClick={() => openBase(base.id)}
          >
            <div className={styles.recentIconWrap}>
              <span className={styles.recentIcon} style={getAccentStyle(base.accentColor)}>
                {base.initials}
              </span>
            </div>
            <span className={styles.recentMeta}>
              <strong>{base.title}</strong>
              <small className={styles.recentMetaOpened}>{base.opened}</small>
              <span className={styles.recentMetaHover}>
                <Image
                  src="/SVG/Asset%20306Airtable.svg"
                  alt="Open data"
                  width={12}
                  height={12}
                  className={styles.recentMetaHoverIcon}
                />
                <span>Open Data</span>
              </span>
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
                setDeleteConfirmBaseId(null);
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
                <Image
                  src="/SVG/Asset%20141Airtable.svg"
                  alt=""
                  width={16}
                  height={16}
                  aria-hidden="true"
                  className={styles.cardMenuItemIcon}
                />
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
                <Image
                  src="/SVG/Asset%20320Airtable.svg"
                  alt=""
                  width={16}
                  height={16}
                  aria-hidden="true"
                  className={styles.cardMenuItemIcon}
                />
                Duplicate
              </button>
              <button
                type="button"
                className={`${styles.cardMenuItem} ${styles.cardMenuItemDisabled}`}
                disabled
              >
                <Image
                  src="/SVG/Asset%20434Airtable.svg"
                  alt=""
                  width={16}
                  height={16}
                  aria-hidden="true"
                  className={styles.cardMenuItemIcon}
                />
                Move
              </button>
              <button
                type="button"
                className={`${styles.cardMenuItem} ${styles.cardMenuItemDisabled}`}
                disabled
              >
                <Image
                  src="/SVG/Asset%2014Airtable.svg"
                  alt=""
                  width={16}
                  height={16}
                  aria-hidden="true"
                  className={styles.cardMenuItemIcon}
                />
                Go to workspace
              </button>
              <button
                type="button"
                className={`${styles.cardMenuItem} ${styles.cardMenuItemDisabled}`}
                disabled
              >
                <Image
                  src="/SVG/Asset%20150Airtable.svg"
                  alt=""
                  width={16}
                  height={16}
                  aria-hidden="true"
                  className={styles.cardMenuItemIcon}
                />
                Customize appearance
              </button>
              <div className={styles.cardMenuDivider} />
              <button
                type="button"
                className={styles.cardMenuItem}
                onClick={(event) => {
                  event.stopPropagation();
                  openDeleteConfirm(base.id);
                }}
                data-delete-confirm-trigger
                disabled={isBaseMutationPending}
              >
                <Image
                  src="/SVG/Asset%2032Airtable.svg"
                  alt=""
                  width={16}
                  height={16}
                  aria-hidden="true"
                  className={styles.cardMenuItemIcon}
                />
                Delete
              </button>
            </div>
          ) : null}
          {isDeleteConfirmOpen ? (
            <div className={styles.deleteConfirmMenu} data-delete-confirm>
              <div className={styles.deleteConfirmTitle}>
                Are you sure you want to delete {base.title}?
              </div>
              <div className={styles.deleteConfirmDesc}>
                Recently deleted apps can be restored from trash.
                <span className={styles.deleteConfirmHelp} aria-hidden="true">
                  ?
                </span>
              </div>
              <div className={styles.deleteConfirmActions}>
                <button
                  type="button"
                  className={styles.deleteConfirmCancel}
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteConfirmBaseId(null);
                  }}
                  disabled={isBaseMutationPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.deleteConfirmDelete}
                  onClick={(event) => {
                    event.stopPropagation();
                    void deleteBase(base.id);
                  }}
                  disabled={isBaseMutationPending}
                >
                  Delete
                </button>
              </div>
            </div>
          ) : null}
        </article>
      );
    },
    [
      deleteBase,
      deleteConfirmBaseId,
      duplicateBase,
      isBaseMutationPending,
      openBase,
      openBaseMenuId,
      openDeleteConfirm,
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
          <span className={styles.baseListIcon} style={getAccentStyle(base.accentColor)}>
            {base.initials}
          </span>
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
            <span className={`${styles.iconMask} ${styles.sidebarToggleIcon}`} aria-hidden="true" />
          </button>
          <Image
            src="/SVG/AirtableLogo.svg"
            alt="Airtable"
            width={104}
            height={24}
            className={styles.logoWrap}
          />
        </div>
        <button type="button" className={styles.searchButton}>
          <Image
            src="/SVG/Asset%20175Airtable.svg"
            alt="search"
            width={16}
            height={16}
            aria-hidden="true"
            className={`${styles.searchIcon} ${styles.topbarIcon} ${styles.iconSearch}`}
          />
          <span className={styles.searchText}>Search...</span>
          <span className={styles.searchKbd} aria-hidden="true">⌘ K</span>
        </button>
        <div className={styles.topbarRight}>
          <button type="button" className={styles.topbarTextButton}>
            <Image
              src="/SVG/Asset%20118Airtable.svg"
              alt=""
              width={16}
              height={16}
              aria-hidden="true"
              className={`${styles.helpIcon} ${styles.topbarIcon} ${styles.iconHelp}`}
            />
            <div className={styles.helpText}>Help</div>
          </button>
          <button type="button" className={styles.iconCircle} aria-label="Notifications">
            <Image
              src="/SVG/Asset%20402Airtable.svg"
              alt=""
              width={16}
              height={16}
              aria-hidden="true"
              className={`${styles.iconCircleIcon} ${styles.topbarIcon} ${styles.iconNotifications}`}
            />
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
                <Image
                  src="/SVG/Asset%20217Airtable.svg"
                  alt=""
                  width={20}
                  height={20}
                  aria-hidden="true"
                  className={`${styles.sidebarIcon} ${styles.iconHome}`}
                />
              </button>
              <button type="button" className={styles.sidebarRailButton} aria-label="Starred">
                <Image
                  src="/SVG/Asset%2070Airtable.svg"
                  alt=""
                  width={20}
                  height={20}
                  aria-hidden="true"
                  className={`${styles.sidebarIcon} ${styles.iconStar}`}
                />
              </button>
              <button type="button" className={styles.sidebarRailButton} aria-label="Shared">
                <Image
                  src="/SVG/Asset%2096Airtable.svg"
                  alt=""
                  width={20}
                  height={20}
                  aria-hidden="true"
                  className={`${styles.sidebarIcon} ${styles.iconShared}`}
                />
              </button>
              <button type="button" className={styles.sidebarRailButton} aria-label="Workspaces">
                <Image
                  src="/SVG/Asset%2014Airtable.svg"
                  alt=""
                  width={20}
                  height={20}
                  aria-hidden="true"
                  className={`${styles.sidebarIcon} ${styles.iconWorkspaces}`}
                />
              </button>
            </div>
            <div className={styles.sidebarRailBottom}>
              <button type="button" className={styles.sidebarRailButton} aria-label="Templates">
                <Image
                  src="/SVG/Asset%20389Airtable.svg"
                  alt=""
                  width={16}
                  height={16}
                  aria-hidden="true"
                  className={`${styles.sidebarIcon} ${styles.iconTemplates} ${styles.sidebarRailIconTemplates}`}
                />
              </button>
              <button type="button" className={styles.sidebarRailButton} aria-label="Marketplace">
                <Image
                  src="/SVG/Asset%2091Airtable.svg"
                  alt=""
                  width={16}
                  height={16}
                  aria-hidden="true"
                  className={`${styles.sidebarIcon} ${styles.iconMarketplace} ${styles.sidebarRailIconMarketplace}`}
                />
              </button>
              <button type="button" className={styles.sidebarRailButton} aria-label="Global access">
                <Image
                  src="/SVG/Asset%20242Airtable.svg"
                  alt=""
                  width={16}
                  height={16}
                  aria-hidden="true"
                  className={`${styles.sidebarIcon} ${styles.sidebarRailIconGlobal}`}
                />
              </button>
              <button
                type="button"
                className={`${styles.sidebarRailButton} ${styles.sidebarRailCreateButton}`}
                aria-label="Create"
                onClick={openCreateModal}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden="true"
                  className={styles.sidebarRailIconCreate}
                >
                  <path d="M8 3.2v9.6M3.2 8h9.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          <nav className={styles.sidebar}>
            <a className={`${styles.navRow} ${styles.navRowActive} ${styles.navRowHome}`} href="#">
              <span className={`${styles.navRowIcon} ${styles.navRowIconHome}`} aria-hidden="true">
                  <Image
                    src="/SVG/Asset%20217Airtable.svg"
                    alt=""
                    width={20}
                    height={20}
                    aria-hidden="true"
                    className={`${styles.navIcon} ${styles.iconHome} ${styles.navIconHomeImage}`}
                  />
              </span>
              <span className={styles.navRowLabel}>Home</span>
            </a>
            <div className={`${styles.navRowGroup} ${styles.navRowGroupStarred}`}>
              <a className={`${styles.navRow} ${styles.navRowStarred}`} href="#">
                <span className={`${styles.navRowIcon} ${styles.navRowIconStar}`} aria-hidden="true">
                    <Image
                      src="/SVG/Asset%2070Airtable.svg"
                      alt=""
                      width={20}
                      height={20}
                      aria-hidden="true"
                      className={`${styles.navIcon} ${styles.iconStar} ${styles.navIconStarImage}`}
                    />
                </span>
                <span className={styles.navRowLabel}>Starred</span>
              </a>
              <button
                type="button"
                className={`${styles.navRowControl} ${styles.navRowControlStarred}`}
                aria-label="Collapse starred"
              >
                <Image
                  src="/SVG/Asset%20345Airtable.svg"
                  alt=""
                  width={16}
                  height={16}
                  aria-hidden="true"
                  className={`${styles.navIcon} ${styles.navArrowStarred}`}
                />
              </button>
            </div>
            <a className={`${styles.navRow} ${styles.navRowShared}`} href="#">
              <span className={`${styles.navRowIcon} ${styles.navRowIconShared}`} aria-hidden="true">
                  <Image
                    src="/SVG/Asset%2096Airtable.svg"
                    alt=""
                    width={20}
                    height={20}
                    aria-hidden="true"
                    className={`${styles.navIcon} ${styles.iconShared} ${styles.navIconSharedImage}`}
                  />
              </span>
              <span className={styles.navRowLabel}>Shared</span>
            </a>
            <div className={`${styles.navRowGroup} ${styles.navRowGroupWorkspaces}`}>
              <a className={`${styles.navRow} ${styles.navRowWorkspaces}`} href="#">
                <span className={`${styles.navRowIcon} ${styles.navRowIconWorkspaces}`} aria-hidden="true">
                    <Image
                      src="/SVG/Asset%2014Airtable.svg"
                      alt=""
                      width={20}
                      height={20}
                      aria-hidden="true"
                      className={`${styles.navIcon} ${styles.iconWorkspaces} ${styles.navIconWorkspacesImage}`}
                    />
                </span>
                <span className={styles.navRowLabel}>Workspaces</span>
              </a>
              <div className={styles.navRowActions}>
                <button
                  type="button"
                  className={`${styles.navRowControl} ${styles.navRowControlWorkspacesPlus}`}
                  aria-label="Create workspace"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 3.2v9.6M3.2 8h9.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`${styles.navRowControl} ${styles.navRowControlWorkspacesArrow}`}
                  aria-label="Expand workspaces"
                >
                  <Image
                    src="/SVG/Asset%20345Airtable.svg"
                    alt=""
                    width={16}
                    height={16}
                    aria-hidden="true"
                    className={`${styles.navIcon} ${styles.navArrowWorkspaces}`}
                  />
                </button>
              </div>
            </div>

            <div className={styles.sidebarFooterWrap}>
              <div className={styles.sidebarDivider} aria-hidden="true" />
              <div className={styles.sidebarFooter}>
                <a className={`${styles.footerLink} ${styles.footerLinkTemplates}`} href="#">
                  <Image
                    src="/SVG/Asset%20389Airtable.svg"
                    alt=""
                    width={16}
                    height={16}
                    aria-hidden="true"
                  />
                  <span className={styles.footerLinkText}>Templates and apps</span>
                </a>
                <a className={`${styles.footerLink} ${styles.footerLinkMarketplace}`} href="#">
                  <Image src="/SVG/Asset%2091Airtable.svg" alt="" width={16} height={16} aria-hidden="true" />
                  <span className={styles.footerLinkText}>Marketplace</span>
                </a>
                <a className={`${styles.footerLink} ${styles.footerLinkImport}`} href="#">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 10.8V4.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M5.5 6.8L8 4.2l2.5 2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3.2 12.8h9.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <span className={styles.footerLinkText}>Import</span>
                </a>
                <button type="button" className={styles.createButton} onClick={openCreateModal}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M8 3.2v9.6M3.2 8h9.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  <span>Create</span>
                </button>
              </div>
            </div>
          </nav>
        </aside>

        <section className={styles.main}>
          <h1 className={styles.title}>Home</h1>

          <div className={styles.startSectionColumn}>
            <div className={styles.startBuildingBox}>
              <div className={styles.startBuildingGrid}>
                {startBuildingCards.map((card) => (
                  <button key={card.title} type="button" className={styles.startCard}>
                    <span className={styles.startCardTitleRow}>
                      <Image
                        src={card.icon}
                        alt=""
                        width={20}
                        height={20}
                        aria-hidden="true"
                        className={`${styles.startCardIcon} ${
                          styles[card.iconClass as keyof typeof styles] ?? ""
                        }`}
                      />
                      <strong>{card.title}</strong>
                    </span>
                    <span className={styles.startCardText}>{card.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterRow}>
              <button type="button" className={styles.filterButton}>
                <span className={styles.filterLabel}>Opened anytime</span>
                <Image
                  src="/SVG/Asset%20348Airtable.svg"
                  alt=""
                  width={12}
                  height={12}
                  aria-hidden="true"
                  className={styles.filterCaret}
                />
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
                  <span className={styles.viewSwitchIcon} aria-hidden="true">☰</span>
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
                  <span className={styles.viewSwitchIcon} aria-hidden="true">⊞</span>
                </button>
              </div>
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
                  <div className={styles.baseListBody}>
                    {baseListSections.map((section) => (
                      <div key={section.id} className={styles.baseListSection}>
                        <div className={styles.baseListSectionTitle}>{section.label}</div>
                        <div className={styles.baseListSectionRows}>
                          {section.items.map(renderBaseListRow)}
                        </div>
                      </div>
                    ))}
                  </div>
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
