import Link from "next/link";
import styles from "./bases-page.module.css";

export default function BasesCssPage() {
  return (
    <main className={styles.hyperbaseContainer}>
      <div className={styles.mainAppContent}>
        <header className={`${styles.baseHeader} ${styles.baseHeaderAirtableTheme}`}>
          <nav className={styles.baseHeaderNav}>
            <div className={styles.baseHeaderLeft}>
              <button type="button" className={styles.headerIconButton} aria-label="Collapse sidebar">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M2.5 4.25a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5a.75.75 0 0 1-.75-.75Zm0 3.75a.75.75 0 0 1 .75-.75h9.5a.75.75 0 0 1 0 1.5h-9.5A.75.75 0 0 1 2.5 8Zm.75 3a.75.75 0 0 0 0 1.5h9.5a.75.75 0 0 0 0-1.5h-9.5Z" />
                </svg>
              </button>

              <Link href="/" className={styles.headerHomeLink} aria-label="Airtable home">
                <svg width="22" height="19" viewBox="0 0 200 170" aria-hidden="true">
                  <g>
                    <path fill="#ffba05" d="M78.9992,1.8675 L13.0402,29.1605 C9.3722,30.6785 9.4102,35.8885 13.1012,37.3515 L79.3362,63.6175 C85.1562,65.9255 91.6372,65.9255 97.4562,63.6175 L163.6922,37.3515 C167.3822,35.8885 167.4212,30.6785 163.7522,29.1605 L97.7942,1.8675 C91.7762,-0.6225 85.0162,-0.6225 78.9992,1.8675" />
                    <path fill="#18bfff" d="M94.2726,77.9608 L94.2726,143.5768 C94.2726,146.6978 97.4196,148.8348 100.3206,147.6848 L174.1266,119.0368 C175.8116,118.3688 176.9166,116.7408 176.9166,114.9288 L176.9166,49.3128 C176.9166,46.1918 173.7696,44.0548 170.8686,45.2048 L97.0626,73.8528 C95.3786,74.5208 94.2726,76.1488 94.2726,77.9608" />
                    <path fill="#f82b60" d="M77.0384,81.3464 L55.1344,91.9224 L52.9104,92.9974 L6.6724,115.1524 C3.7414,116.5664 0.0004,114.4304 0.0004,111.1744 L0.0004,49.5884 C0.0004,48.4104 0.6044,47.3934 1.4144,46.6274 C1.7524,46.2884 2.1354,46.0094 2.5334,45.7884 C3.6384,45.1254 5.2144,44.9484 6.5544,45.4784 L76.6704,73.2594 C80.2344,74.6734 80.5144,79.6674 77.0384,81.3464" />
                  </g>
                </svg>
                <span className={styles.headerHomeText}>Airtable</span>
              </Link>
            </div>

            <div className={styles.baseHeaderCenter}>
              <button type="button" className={styles.headerSearchButton} aria-label="Search">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M7 2.5a4.5 4.5 0 1 0 2.804 8.02l2.338 2.337a.75.75 0 1 0 1.06-1.06L10.865 9.46A4.5 4.5 0 0 0 7 2.5ZM4 7a3 3 0 1 1 6 0 3 3 0 0 1-6 0Z" />
                </svg>
                <span className={styles.headerSearchText}>Search...</span>
                <span className={styles.headerSearchShortcut}>⌘ K</span>
              </button>
            </div>

            <div className={styles.baseHeaderRight}>
              <button type="button" className={styles.headerIconButton} aria-label="Help menu">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A1.75 1.75 0 018.25 6h.5a1.75 1.75 0 01.75 3.333v.917a.75.75 0 01-1.5 0v-1.625a.75.75 0 01.75-.75.25.25 0 00.25-.25.25.25 0 00-.25-.25h-.5a.25.25 0 00-.25.25.75.75 0 01-1.5 0zM9 11a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>

              <button
                type="button"
                className={`${styles.headerIconButton} ${styles.headerNotificationButton}`}
                aria-label="No unseen notifications"
              >
                <span className={styles.headerNotificationBadge}>0</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M8 16a2 2 0 001.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 008 16z" />
                  <path fillRule="evenodd" d="M8 1.5A3.5 3.5 0 004.5 5v2.947c0 .346-.102.683-.294.97l-1.703 2.556a.018.018 0 00-.003.01l.001.006c0 .002.002.004.004.006a.017.017 0 00.006.004l.007.001h10.964l.007-.001a.016.016 0 00.006-.004.016.016 0 00.004-.006l.001-.007a.017.017 0 00-.003-.01l-1.703-2.554a1.75 1.75 0 01-.294-.97V5A3.5 3.5 0 008 1.5zM3 5a5 5 0 0110 0v2.947c0 .05.015.098.042.139l1.703 2.555A1.518 1.518 0 0113.482 13H2.518a1.518 1.518 0 01-1.263-2.36l1.703-2.554A.25.25 0 003 7.947V5z" />
                </svg>
              </button>

              <button type="button" className={styles.headerAccountButton} aria-label="Account">
                <span className={styles.headerAccountInitial}>N</span>
              </button>
            </div>
          </nav>
        </header>
      </div>
    </main>
  );
}
