import type { RefObject } from "react";
import Image from "next/image";
import styles from "../tables.module.css";
import layoutStyles from "./BaseHeader.module.css";

type Props = {
  baseName: string;
  baseMenuButtonRef: RefObject<HTMLButtonElement | null>;
  isBaseMenuOpen: boolean;
  onToggleBaseMenu: () => void;
};

export const BaseHeader = ({
  baseName,
  baseMenuButtonRef,
  isBaseMenuOpen,
  onToggleBaseMenu,
}: Props) => (
  <header className={layoutStyles.baseHeader}>
    <div className={styles.baseHeaderLeft}>
      <div className={styles.baseIcon}>
        <svg width="20" height="17" viewBox="0 0 200 170" fill="white">
          <path d="M90.0389,12.3675 L24.0799,39.6605 C20.4119,41.1785 20.4499,46.3885 24.1409,47.8515 L90.3759,74.1175 C96.1959,76.4255 102.6769,76.4255 108.4959,74.1175 L174.7319,47.8515 C178.4219,46.3885 178.4609,41.1785 174.7919,39.6605 L108.8339,12.3675 C102.8159,9.8775 96.0559,9.8775 90.0389,12.3675" />
          <path d="M105.3122,88.4608 L105.3122,154.0768 C105.3122,157.1978 108.4592,159.3348 111.3602,158.1848 L185.1662,129.5368 C186.8512,128.8688 187.9562,127.2408 187.9562,125.4288 L187.9562,59.8128 C187.9562,56.6918 184.8092,54.5548 181.9082,55.7048 L108.1022,84.3528 C106.4182,85.0208 105.3122,86.6488 105.3122,88.4608" />
          <path d="M88.0781,91.8464 L66.1741,102.4224 L63.9501,103.4974 L17.7121,125.6524 C14.7811,127.0664 11.0401,124.9304 11.0401,121.6744 L11.0401,60.0884 C11.0401,58.9104 11.6441,57.8934 12.4541,57.1274 C12.7921,56.7884 13.1751,56.5094 13.5731,56.2884 C14.6781,55.6254 16.2541,55.4484 17.5941,55.9784 L87.7101,83.7594 C91.2741,85.1734 91.5541,90.1674 88.0781,91.8464" />
        </svg>
      </div>

      <button
        ref={baseMenuButtonRef}
        type="button"
        className={styles.baseNameButton}
        aria-expanded={isBaseMenuOpen}
        aria-controls="base-menu-popover"
        onClick={onToggleBaseMenu}
      >
        <span className={styles.baseNameText}>{baseName}</span>
        <span className={styles.baseNameCaret} aria-hidden="true" />
      </button>
    </div>

    <nav className={styles.baseHeaderCenter}>
      <button type="button" className={`${styles.navTab} ${styles.navTabActive}`}>
        Data
        <div className={styles.navTabIndicator}></div>
      </button>
      <button type="button" className={`${styles.navTab} ${styles.navTabDisabled}`} disabled aria-disabled="true">
        Automations
      </button>
      <button type="button" className={`${styles.navTab} ${styles.navTabDisabled}`} disabled aria-disabled="true">
        Interfaces
      </button>
      <button type="button" className={`${styles.navTab} ${styles.navTabDisabled}`} disabled aria-disabled="true">
        Forms
      </button>
    </nav>

    <div className={styles.baseHeaderRight}>
      <button type="button" className={styles.historyButton} aria-label="Base history">
        <span
          className={`${styles.toolbarButtonIcon} ${styles.toolbarIconMask} ${styles.toolbarIconBaseHistory}`}
          aria-hidden="true"
        />
      </button>

      <div className={`${styles.trialBadge} ${styles.topActionDisabled}`}>
        Trial: 13 days left
      </div>

      <button
        type="button"
        className={`${styles.launchButton} ${styles.topActionDisabled}`}
        disabled
        aria-disabled="true"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a.5.5 0 01.5.5v11.793l3.146-3.147a.5.5 0 01.708.708l-4 4a.5.5 0 01-.708 0l-4-4a.5.5 0 01.708-.708L7.5 13.293V1.5A.5.5 0 018 1z" />
        </svg>
        Launch
      </button>

      <button
        type="button"
        className={`${styles.airtableGhostButton} ${styles.topActionDisabled}`}
        disabled
        aria-disabled="true"
        aria-hidden="true"
        title="Airtable"
      >
        <Image
          src="/SVG/Asset%20190Airtable.svg"
          alt=""
          width={28}
          height={28}
          className={styles.airtableIconImg}
          aria-hidden="true"
        />
      </button>

      <button
        type="button"
        className={`${styles.shareButton} ${styles.topActionDisabled}`}
        disabled
        aria-disabled="true"
      >
        Share
      </button>
    </div>
  </header>
);
