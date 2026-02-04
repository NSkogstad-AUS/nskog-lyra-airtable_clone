"use client";

import Link from "next/link";
import { useState } from "react";
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

const recentCards = [
  { title: "hello", opened: "Opened 8 hours ago", initials: "He", accent: styles.blueAccent },
  {
    title: "UniMelb Project Tracker",
    opened: "Opened 4 days ago",
    initials: "✧",
    accent: styles.purpleAccent,
  },
];

export default function BasesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <div className={styles.topbarLeft}>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.sidebarToggleButton}`}
            aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
            aria-expanded={isSidebarOpen}
            onClick={() => setIsSidebarOpen((prev) => !prev)}
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
            🔔
          </button>
          <button type="button" className={styles.avatar} aria-label="Account">
            N
          </button>
        </div>
      </header>

      <div
        className={`${styles.content} ${!isSidebarOpen ? styles.contentSidebarHidden : ""}`.trim()}
      >
        <aside
          className={`${styles.sidebarArea} ${!isSidebarOpen ? styles.sidebarAreaHidden : ""}`.trim()}
        >
          <div className={styles.sidebarRail}>
            <span>🏠</span>
            <span>☆</span>
            <span>↗</span>
            <span>👥</span>
          </div>

          <nav className={styles.sidebar}>
            <a className={`${styles.navItem} ${styles.navItemActive}`} href="#">
              Home
            </a>
            <a className={styles.navItem} href="#">
              Starred
            </a>
            <p className={styles.sidebarHint}>
              Your starred bases, interfaces, and workspaces will appear here
            </p>
            <a className={styles.navItem} href="#">
              Shared
            </a>
            <a className={styles.navItem} href="#">
              Workspaces
            </a>

            <div className={styles.sidebarFooter}>
              <a className={styles.footerLink} href="#">
                Templates and apps
              </a>
              <a className={styles.footerLink} href="#">
                Marketplace
              </a>
              <a className={styles.footerLink} href="#">
                Import
              </a>
              <button type="button" className={styles.createButton}>
                + Create
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
              <button type="button" className={styles.iconButton}>
                ☷
              </button>
              <button type="button" className={styles.iconButton}>
                ⊞
              </button>
            </div>
          </div>

          <div className={styles.recentGroup}>
            <h3>Today</h3>
            <Link href="/bases/demo-base/tables" className={styles.recentCard}>
              <span className={`${styles.recentIcon} ${recentCards[0]?.accent}`}>{recentCards[0]?.initials}</span>
              <span className={styles.recentMeta}>
                <strong>{recentCards[0]?.title}</strong>
                <small>{recentCards[0]?.opened}</small>
              </span>
            </Link>
          </div>

          <div className={styles.recentGroup}>
            <h3>Past 7 days</h3>
            <Link href="/bases/demo-base/tables" className={styles.recentCard}>
              <span className={`${styles.recentIcon} ${recentCards[1]?.accent}`}>{recentCards[1]?.initials}</span>
              <span className={styles.recentMeta}>
                <strong>{recentCards[1]?.title}</strong>
                <small>{recentCards[1]?.opened}</small>
              </span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
