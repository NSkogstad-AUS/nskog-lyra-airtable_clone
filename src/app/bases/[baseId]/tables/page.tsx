"use client";

import styles from "./tables.module.css";

export default function TablesPage() {
  return (
    <div className={styles.hyperbaseContainer}>
      {/* App Sidebar - Left navigation */}
      <aside className={styles.appSidebar}>
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
          <button type="button" className={styles.baseNameButton}>
            <span>Untitled Base</span>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
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
            <div className={styles.viewName}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v3.585a.746.746 0 010 .83v8.085c0 .966-.784 1.75-1.75 1.75H1.75A1.75 1.75 0 010 14.25V6.165a.746.746 0 010-.83V1.75zM1.5 6.5v7.75c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V6.5h-13zM14.5 5V1.75a.25.25 0 00-.25-.25H1.75a.25.25 0 00-.25.25V5h13z"/>
              </svg>
              <span>Grid view</span>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={styles.dropdownIcon}>
                <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z"/>
              </svg>
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

        {/* Main Content - Grid View */}
        <main className={styles.mainContent}>
          <div className={styles.viewContainer}>
            <div className={styles.gridView}>
              <div className={styles.paneContainer}>
                <div className={styles.headerAndDataRowContainer}>
                  {/* Left Pane - Frozen Column */}
                  <div className={styles.leftPaneWrapper}>
                    {/* Header */}
                    <div className={styles.headerLeftPane}>
                      <div className={styles.headerRow}>
                        <div className={styles.staticCellContainer}>
                          <div className={styles.rowNumber}></div>
                        </div>
                        <div className={styles.headerCell}>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={styles.fieldIcon}>
                            <path d="M1.75 1.5a.25.25 0 00-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V1.75a.25.25 0 00-.25-.25H1.75zM0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v12.5A1.75 1.75 0 0114.25 16H1.75A1.75 1.75 0 010 14.25V1.75zm3 3.5a.75.75 0 01.75-.75h8.5a.75.75 0 010 1.5h-8.5A.75.75 0 013 5.25zm.75 2.25a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5zm0 3a.75.75 0 000 1.5h8.5a.75.75 0 000-1.5h-8.5z"/>
                          </svg>
                          Name
                        </div>
                      </div>
                    </div>
                    {/* Data Rows */}
                    <div className={styles.dataLeftPane}>
                      <div className={styles.dataRow}>
                        <div className={styles.staticCellContainer}>
                          <div className={styles.rowNumber}>1</div>
                          <div className={styles.expandButton}>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
                            </svg>
                          </div>
                        </div>
                        <div className={styles.dataCell}></div>
                      </div>
                      <div className={styles.dataRow}>
                        <div className={styles.staticCellContainer}>
                          <div className={styles.rowNumber}>2</div>
                          <div className={styles.expandButton}>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
                            </svg>
                          </div>
                        </div>
                        <div className={styles.dataCell}></div>
                      </div>
                      <div className={styles.dataRow}>
                        <div className={styles.staticCellContainer}>
                          <div className={styles.rowNumber}>3</div>
                          <div className={styles.expandButton}>
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z"/>
                            </svg>
                          </div>
                        </div>
                        <div className={styles.dataCell}></div>
                      </div>
                      {/* Add new row */}
                      <div className={`${styles.dataRow} ${styles.addRow}`}>
                        <div className={styles.staticCellContainer}>
                          <div className={styles.rowNumber}></div>
                          <div className={styles.expandButton}>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                              <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z"/>
                            </svg>
                          </div>
                        </div>
                        <div className={styles.dataCell}></div>
                      </div>
                    </div>
                  </div>

                  {/* Right Pane - Scrollable Columns */}
                  <div className={styles.rightPaneWrapper}>
                    {/* Header */}
                    <div className={styles.headerRightPane}>
                      <div className={styles.headerRow}>
                        <div className={styles.headerCell}>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={styles.fieldIcon}>
                            <path d="M0 3.75C0 2.784.784 2 1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0114.25 14H1.75A1.75 1.75 0 010 12.25v-8.5zm1.75-.25a.25.25 0 00-.25.25v8.5c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25v-8.5a.25.25 0 00-.25-.25H1.75z"/>
                          </svg>
                          Notes
                        </div>
                        <div className={styles.headerCell}>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={styles.fieldIcon}>
                            <path d="M10.561 8.073a6.005 6.005 0 003.432-5.142.75.75 0 00-1.5 0 4.5 4.5 0 01-9 0 .75.75 0 00-1.5 0 6.005 6.005 0 003.431 5.142 3.5 3.5 0 00-1.989 3.158.75.75 0 001.5 0 2 2 0 013.999 0 .75.75 0 001.5 0 3.5 3.5 0 00-1.989-3.158h.116z"/>
                          </svg>
                          Assignee
                        </div>
                        <div className={styles.headerCell}>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={styles.fieldIcon}>
                            <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"/>
                            <path fillRule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z"/>
                          </svg>
                          Status
                        </div>
                        <div className={styles.headerCell}>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className={styles.fieldIcon}>
                            <path d="M1.75 2.5a.25.25 0 00-.25.25v10.5c0 .138.112.25.25.25h.94a.76.76 0 01-.03-.25v-9.5a.75.75 0 01.22-.53l8.25-8.25zm3 0L13 10.75v2.5a.25.25 0 01-.25.25H4.5a.75.75 0 01-.75-.75v-10c0-.138.112-.25.25-.25h.75zm9 0h1.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0115.25 16h-13A1.75 1.75 0 010 14.25V2.75C0 1.784.784 1 1.75 1h2.69l.78-.78a.75.75 0 011.06 0l8.72 8.72v4.31a.25.25 0 00.25.25h1.5a.25.25 0 00.25-.25v-10.5a.25.25 0 00-.25-.25h-1.5v.75z"/>
                          </svg>
                          Attachments
                        </div>
                        <div className={styles.addFieldButton}>
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M7.75 2a.75.75 0 01.75.75V7h4.25a.75.75 0 010 1.5H8.5v4.25a.75.75 0 01-1.5 0V8.5H2.75a.75.75 0 010-1.5H7V2.75A.75.75 0 017.75 2z"/>
                          </svg>
                        </div>
                      </div>
                    </div>
                    {/* Data Rows */}
                    <div className={styles.dataRightPane}>
                      <div className={styles.dataRow}>
                        <div className={styles.dataCell}></div>
                        <div className={styles.dataCell}></div>
                        <div className={styles.dataCell}></div>
                        <div className={styles.dataCell}></div>
                      </div>
                      <div className={styles.dataRow}>
                        <div className={styles.dataCell}></div>
                        <div className={styles.dataCell}></div>
                        <div className={styles.dataCell}></div>
                        <div className={styles.dataCell}></div>
                      </div>
                      <div className={styles.dataRow}>
                        <div className={styles.dataCell}></div>
                        <div className={styles.dataCell}></div>
                        <div className={styles.dataCell}></div>
                        <div className={styles.dataCell}></div>
                      </div>
                      {/* Add new row */}
                      <div className={`${styles.dataRow} ${styles.addRow}`}>
                        <div className={styles.dataCell}></div>
                        <div className={styles.dataCell}></div>
                        <div className={styles.dataCell}></div>
                        <div className={styles.dataCell}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      </div>
    </div>
  );
}
