import styles from "../tables.module.css";
import layoutStyles from "./SidebarContent.module.css";

type Props = {
  userName?: string | null;
  userEmail?: string | null;
  isSidebarAccountMenuOpen: boolean;
  onToggleSidebarAccountMenu: () => void;
  onSignOut: () => void;
  onNavigateHome: () => void;
  omniBitPath: string;
  omniRotations: readonly number[];
  sidebarAccountDisabledItems: readonly string[];
};

export const SidebarContent = ({
  userName,
  userEmail,
  isSidebarAccountMenuOpen,
  onToggleSidebarAccountMenu,
  onSignOut,
  onNavigateHome,
  omniBitPath,
  omniRotations,
  sidebarAccountDisabledItems,
}: Props) => (
  <div className={layoutStyles.sidebarContent}>
    <div className={styles.sidebarTop}>
      <button
        type="button"
        className={styles.homeButton}
        aria-label="Go to bases home"
        onClick={onNavigateHome}
      >
        <svg width="24" height="20.4" viewBox="0 0 200 170" xmlns="http://www.w3.org/2000/svg">
          <g>
            <path
              fill="currentColor"
              d="M90.0389,12.3675 L24.0799,39.6605 C20.4119,41.1785 20.4499,46.3885 24.1409,47.8515 L90.3759,74.1175 C96.1959,76.4255 102.6769,76.4255 108.4959,74.1175 L174.7319,47.8515 C178.4219,46.3885 178.4609,41.1785 174.7919,39.6605 L108.8339,12.3675 C102.8159,9.8775 96.0559,9.8775 90.0389,12.3675"
            ></path>
            <path
              fill="currentColor"
              d="M105.3122,88.4608 L105.3122,154.0768 C105.3122,157.1978 108.4592,159.3348 111.3602,158.1848 L185.1662,129.5368 C186.8512,128.8688 187.9562,127.2408 187.9562,125.4288 L187.9562,59.8128 C187.9562,56.6918 184.8092,54.5548 181.9082,55.7048 L108.1022,84.3528 C106.4182,85.0208 105.3122,86.6488 105.3122,88.4608"
            ></path>
            <path
              fill="currentColor"
              d="M88.0781,91.8464 L66.1741,102.4224 L63.9501,103.4974 L17.7121,125.6524 C14.7811,127.0664 11.0401,124.9304 11.0401,121.6744 L11.0401,60.0884 C11.0401,58.9104 11.6441,57.8934 12.4541,57.1274 C12.7921,56.7884 13.1751,56.5094 13.5731,56.2884 C14.6781,55.6254 16.2541,55.4484 17.5941,55.9784 L87.7101,83.7594 C91.2741,85.1734 91.5541,90.1674 88.0781,91.8464"
            ></path>
          </g>
        </svg>
      </button>

      <button
        type="button"
        className={styles.omniButton}
        aria-label="Open Omni"
        title="Open Omni"
      >
        <svg
          className={styles.omniIcon}
          height="36"
          viewBox="0 0 160 160"
          width="36"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g transform="scale(0.9090909090909091)" className={styles.omniRoot}>
            <g className={`${styles.omniRing} ${styles.omniRingInner}`}>
              {omniRotations.map((rotation) => (
                <g key={`inner-${rotation}`} className={styles.omniSpoke} transform={`rotate(${rotation})`}>
                  <g className={styles.omniBitContainer} transform="translate(72, 0)">
                    <path className={styles.omniBit} d={omniBitPath} fill="currentColor" />
                  </g>
                </g>
              ))}
            </g>
            <g className={`${styles.omniRing} ${styles.omniRingMiddle}`}>
              {omniRotations.map((rotation) => (
                <g key={`middle-${rotation}`} className={styles.omniSpoke} transform={`rotate(${rotation})`}>
                  <g className={styles.omniBitContainer} transform="translate(72, 0)">
                    <path className={styles.omniBit} d={omniBitPath} fill="currentColor" />
                  </g>
                </g>
              ))}
            </g>
            <g className={`${styles.omniRing} ${styles.omniRingOuter}`}>
              {omniRotations.map((rotation) => (
                <g key={`outer-${rotation}`} className={styles.omniSpoke} transform={`rotate(${rotation})`}>
                  <g className={styles.omniBitContainer} transform="translate(72, 0)">
                    <path className={styles.omniBit} d={omniBitPath} fill="currentColor" />
                  </g>
                </g>
              ))}
            </g>
            <g className={styles.eyes}>
              <g className={styles.omniEyeContainer} transform="translate(48, 72)">
                <path className={styles.omniEye} d={omniBitPath} fill="currentColor" />
              </g>
              <g className={styles.omniEyeContainer} transform="translate(96, 72)">
                <path className={styles.omniEye} d={omniBitPath} fill="currentColor" />
              </g>
            </g>
          </g>
        </svg>
      </button>
    </div>

    <div className={styles.sidebarBottom}>
      <button type="button" className={styles.sidebarIconButton} aria-label="Help">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm6.5-.25A1.75 1.75 0 018.25 6h.5a1.75 1.75 0 01.75 3.333v.917a.75.75 0 01-1.5 0v-1.625a.75.75 0 01.75-.75.25.25 0 00.25-.25.25.25 0 00-.25-.25h-.5a.25.25 0 00-.25.25.75.75 0 01-1.5 0zM9 11a1 1 0 11-2 0 1 1 0 012 0z"
          />
        </svg>
      </button>

      <button type="button" className={styles.sidebarIconButton} aria-label="Notifications">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 16a2 2 0 001.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 008 16z" />
          <path
            fillRule="evenodd"
            d="M8 1.5A3.5 3.5 0 004.5 5v2.947c0 .346-.102.683-.294.97l-1.703 2.556a.018.018 0 00-.003.01l.001.006c0 .002.002.004.004.006a.017.017 0 00.006.004l.007.001h10.964l.007-.001a.016.016 0 00.006-.004.016.016 0 00.004-.006l.001-.007a.017.017 0 00-.003-.01l-1.703-2.554a1.75 1.75 0 01-.294-.97V5A3.5 3.5 0 008 1.5zM3 5a5 5 0 0110 0v2.947c0 .05.015.098.042.139l1.703 2.555A1.518 1.518 0 0113.482 13H2.518a1.518 1.518 0 01-1.263-2.36l1.703-2.554A.25.25 0 003 7.947V5z"
          />
        </svg>
      </button>

      <div className={styles.sidebarAccountWrap}>
        <button
          type="button"
          className={styles.userAvatar}
          aria-label="Account"
          aria-expanded={isSidebarAccountMenuOpen}
          data-sidebar-account-menu-trigger
          onClick={onToggleSidebarAccountMenu}
        >
          <div className={styles.userAvatarInner}>
            {userName?.slice(0, 1).toUpperCase() ?? "U"}
          </div>
        </button>
        {isSidebarAccountMenuOpen ? (
          <div className={styles.sidebarAccountMenu} data-sidebar-account-menu>
            <div className={styles.sidebarAccountMenuUser}>
              <strong>{userName ?? "Account"}</strong>
              <span>{userEmail ?? "No email"}</span>
            </div>
            <div className={styles.sidebarAccountMenuDivider} />
            {sidebarAccountDisabledItems.map((item) => (
              <button
                key={item}
                type="button"
                className={`${styles.sidebarAccountMenuItem} ${styles.sidebarAccountMenuItemDisabled}`}
                disabled
              >
                <span className={styles.sidebarAccountMenuItemIcon} aria-hidden="true" />
                {item}
              </button>
            ))}
            <div className={styles.sidebarAccountMenuDivider} />
            <button type="button" className={styles.sidebarAccountMenuItem} onClick={onSignOut}>
              <span className={styles.sidebarAccountMenuLogoutIcon} aria-hidden="true">
                -&gt;
              </span>
              Log out
            </button>
          </div>
        ) : null}
      </div>
    </div>
  </div>
);
