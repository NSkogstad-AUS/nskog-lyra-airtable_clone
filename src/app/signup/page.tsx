"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./signup.module.css";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [activePrivacyTab, setActivePrivacyTab] = useState("privacy");
  const [performanceCookies, setPerformanceCookies] = useState(true);
  const [functionalCookies, setFunctionalCookies] = useState(true);
  const [targetingCookies, setTargetingCookies] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const showEmailError = emailTouched && !isValidEmail;

  // Check if all optional cookies are enabled
  const allCookiesEnabled = performanceCookies && functionalCookies && targetingCookies;

  const handleAllowAll = () => {
    closePrivacyModal(() => {
      setPerformanceCookies(true);
      setFunctionalCookies(true);
      setTargetingCookies(true);
    });
  };

  const handleRejectAll = () => {
    closePrivacyModal(() => {
      setPerformanceCookies(false);
      setFunctionalCookies(false);
      setTargetingCookies(false);
    });
  };

  const handleConfirmChoices = () => {
    closePrivacyModal();
  };

  const closePrivacyModal = (callback?: () => void) => {
    setIsFadingOut(true);
    setTimeout(() => {
      if (callback) {
        callback();
      }
      setIsPrivacyOpen(false);
      setIsFadingOut(false);
    }, 400);
  };

  const privacyTabs = [
    { id: "privacy", label: "Your Privacy" },
    { id: "necessary", label: "Strictly Necessary Cookies" },
    { id: "performance", label: "Performance Cookies" },
    { id: "functional", label: "Functional Cookies" },
    { id: "targeting", label: "Targeting Cookies" },
  ];

  const privacyContent = {
    privacy: (
      <>
        <h3>Your Privacy</h3>
        <p>
          When you visit our website, we store cookies on your browser to
          collect information. The information collected might relate to you,
          your preferences or your device, and is mostly used to make the site
          work as you expect it to and to provide a more personalized web
          experience.
        </p>
        <p>
          However, you can choose not to allow certain types of cookies, which
          may impact your experience of the site and the services we are able to
          offer. Click on the different category headings to find out more and
          change our default settings according to your preference. You cannot
          opt-out of our Strictly Necessary Cookies as they are deployed in
          order to ensure the proper functioning of our website (such as
          remembering your cookie settings, to log into your account, to
          redirect you when you log out, etc.).
        </p>
        <p>
          For more information about the First and Third Party Cookies used
          please follow this link.
        </p>
        <a href="#" className={styles.privacyLink}>
          More information
        </a>
        <p className={styles.privacyUserId}>
          <span className={styles.privacyMetaLabel}>User ID:</span>{" "}
          dff998ba-4fa9-4dd6-8ab9-5411fa2b4384
        </p>
        <p className={`${styles.privacyMeta} ${styles.privacyMetaItalic}`}>
          This User ID will be used as a unique identifier while storing and
          accessing your preferences for future.
        </p>
        <p className={styles.privacyMeta}>
          <span className={styles.privacyMetaLabel}>Timestamp:</span>{" "}
          2026-01-31 5:25:49
        </p>
      </>
    ),
    necessary: (
      <>
        <div className={styles.privacySectionHeader}>
          <h3 className={styles.privacySectionTitle}>
            Strictly Necessary Cookies
          </h3>
          <span className={styles.privacySectionStatus}>Always Active</span>
        </div>
        <p>
          These cookies are required for the website to function and cannot be
          switched off in our systems. They are usually only set in response to
          actions made by you which amount to a request for services.
        </p>
      </>
    ),
    performance: (
      <>
        <div className={styles.privacySectionHeader}>
          <h3 className={styles.privacySectionTitle}>Performance Cookies</h3>
          <button
            type="button"
            className={`${styles.privacyToggle} ${performanceCookies ? styles.privacyToggleOn : ''}`}
            onClick={() => setPerformanceCookies(!performanceCookies)}
            aria-label="Toggle performance cookies"
            aria-pressed={performanceCookies}
          >
            <span className={styles.privacyToggleThumb} />
          </button>
        </div>
        <p>
          These cookies allow us to count visits and traffic sources so we can
          measure and improve the performance of our site. They help us know
          which pages are the most and least popular.
        </p>
      </>
    ),
    functional: (
      <>
        <div className={styles.privacySectionHeader}>
          <h3 className={styles.privacySectionTitle}>Functional Cookies</h3>
          <button
            type="button"
            className={`${styles.privacyToggle} ${functionalCookies ? styles.privacyToggleOn : ''}`}
            onClick={() => setFunctionalCookies(!functionalCookies)}
            aria-label="Toggle functional cookies"
            aria-pressed={functionalCookies}
          >
            <span className={styles.privacyToggleThumb} />
          </button>
        </div>
        <p>
          These cookies enable the website to provide enhanced functionality and
          personalization. They may be set by us or by third‑party providers.
        </p>
      </>
    ),
    targeting: (
      <>
        <div className={styles.privacySectionHeader}>
          <h3 className={styles.privacySectionTitle}>Targeting Cookies</h3>
          <button
            type="button"
            className={`${styles.privacyToggle} ${targetingCookies ? styles.privacyToggleOn : ''}`}
            onClick={() => setTargetingCookies(!targetingCookies)}
            aria-label="Toggle targeting cookies"
            aria-pressed={targetingCookies}
          >
            <span className={styles.privacyToggleThumb} />
          </button>
        </div>
        <p>
          These cookies may be set through our site by our advertising partners.
          They may be used to build a profile of your interests and show you
          relevant ads on other sites.
        </p>
      </>
    ),
  };

  useEffect(() => {
    document.body.style.overflow = isPrivacyOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isPrivacyOpen]);

  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <section className={styles.left}>
          <div className={styles.logoRow}>
            <span className={styles.logoIcon}>
              <svg
                viewBox="0 0 200 170"
                className={styles.logoSvg}
                aria-hidden
              >
                <g>
                  <path
                    fill="rgb(255, 186, 5)"
                    d="M90.0389,12.3675 L24.0799,39.6605 C20.4119,41.1785 20.4499,46.3885 24.1409,47.8515 L90.3759,74.1175 C96.1959,76.4255 102.6769,76.4255 108.4959,74.1175 L174.7319,47.8515 C178.4219,46.3885 178.4609,41.1785 174.7919,39.6605 L108.8339,12.3675 C102.8159,9.8775 96.0559,9.8775 90.0389,12.3675"
                  />
                  <path
                    fill="rgb(57, 202, 255)"
                    d="M105.3122,88.4608 L105.3122,154.0768 C105.3122,157.1978 108.4592,159.3348 111.3602,158.1848 L185.1662,129.5368 C186.8512,128.8688 187.9562,127.2408 187.9562,125.4288 L187.9562,59.8128 C187.9562,56.6918 184.8092,54.5548 181.9082,55.7048 L108.1022,84.3528 C106.4182,85.0208 105.3122,86.6488 105.3122,88.4608"
                  />
                  <path
                    fill="rgb(220, 4, 59)"
                    d="M88.0781,91.8464 L66.1741,102.4224 L63.9501,103.4974 L17.7121,125.6524 C14.7811,127.0664 11.0401,124.9304 11.0401,121.6744 L11.0401,60.0884 C11.0401,58.9104 11.6441,57.8934 12.4541,57.1274 C12.7921,56.7884 13.1751,56.5094 13.5731,56.2884 C14.6781,55.6254 16.2541,55.4484 17.5941,55.9784 L87.7101,83.7594 C91.2741,85.1734 91.5541,90.1674 88.0781,91.8464"
                  />
                  <path
                    fill="rgba(0, 0, 0, 0.25)"
                    d="M88.0781,91.8464 L66.1741,102.4224 L12.4541,57.1274 C12.7921,56.7884 13.1751,56.5094 13.5731,56.2884 C14.6781,55.6254 16.2541,55.4484 17.5941,55.9784 L87.7101,83.7594 C91.2741,85.1734 91.5541,90.1674 88.0781,91.8464"
                  />
                </g>
              </svg>
            </span>
          </div>

          <h1 className={styles.title}>Welcome to Airtable</h1>

          <form className={styles.form}>
            <div>
              <label className={styles.inputLabel} htmlFor="signup-email">
                Work email
              </label>
              <input
                id="signup-email"
                type="email"
                name="email"
                placeholder="name@company.com"
                className={`${styles.input} ${
                  showEmailError ? styles.inputInvalid : ""
                }`}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                onBlur={() => setEmailTouched(true)}
                aria-invalid={showEmailError}
                aria-describedby={showEmailError ? "email-error" : undefined}
              />
              {showEmailError && (
                <span id="email-error" className={styles.errorText} role="alert">
                  Invalid email
                </span>
              )}
            </div>
            <button
              type="button"
              className={`${styles.primaryButton} ${
                isValidEmail ? styles.primaryButtonActive : ""
              }`}
            >
              Continue with email
            </button>
          </form>

          <div className={styles.orRow}>
            <span className={styles.orLine} />
            or
            <span className={styles.orLine} />
          </div>

          <div className={styles.altButtons}>
            <button type="button" className={styles.secondaryButton}>
              Continue with{"\u00a0\u00a0"}
              <span className={styles.boldText}>Single Sign On</span>
            </button>
            <button
              type="button"
              className={styles.providerButton}
              onClick={() => void signIn("google", { callbackUrl: "/bases" })}
            >
              <span className={styles.iconWrap}>
                <svg viewBox="0 0 24 24" className={styles.googleIcon} aria-hidden>
                  <path
                    d="M21.8 12.25c0-.63-.06-1.23-.16-1.81H12v3.42h5.52a4.72 4.72 0 0 1-2.04 3.09v2.56h3.3c1.93-1.78 3.02-4.4 3.02-7.26Z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 22c2.7 0 4.97-.9 6.62-2.45l-3.3-2.56c-.92.62-2.1.98-3.32.98-2.55 0-4.71-1.72-5.49-4.03H3.09v2.6A9.99 9.99 0 0 0 12 22Z"
                    fill="#34A853"
                  />
                  <path
                    d="M6.51 13.94a5.98 5.98 0 0 1 0-3.88V7.46H3.09a10 10 0 0 0 0 9.08l3.42-2.6Z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 6.03c1.47 0 2.8.5 3.84 1.49l2.88-2.88C16.96 2.96 14.7 2 12 2A9.99 9.99 0 0 0 3.09 7.46l3.42 2.6C7.29 7.75 9.45 6.03 12 6.03Z"
                    fill="#EA4335"
                  />
                </svg>
              </span>
              Continue with{"\u00a0"}
              <span className={styles.boldText}>Google</span>
            </button>
            <button type="button" className={styles.providerButton}>
              <span className={styles.appleIcon}>
                <svg viewBox="0 0 24 24" className={styles.appleSvg} aria-hidden>
                  <path
                    d="M16.7 13.9c0 2.9 2.5 3.9 2.5 3.9s-1.9 5-4.4 5c-1.2 0-1.9-.8-3.1-.8-1.2 0-2 .8-3.1.8-2.4 0-5.3-4.8-5.3-8.7C3.3 11 5.1 8.8 7.4 8.8c1.2 0 2.3.8 3.1.8.8 0 2.2-.9 3.7-.8.6 0 2.5.2 3.7 1.8-.1.1-2.2 1.2-2.2 3.3ZM14.6 5.6c.8-1 1.3-2.3 1.2-3.6-1.2.1-2.6.8-3.4 1.8-.7.9-1.3 2.2-1.1 3.5 1.3.1 2.5-.7 3.3-1.7Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
              Continue with{"\u00a0"}
              <span className={styles.boldText}>Apple</span>
            </button>
          </div>

          <div className={styles.footer}>
            <div className={styles.footerGroup}>
              <p>
                By creating an account, you agree to the{" "}
                <a className={styles.footerLink} href="https://www.airtable.com/company/terms-of-service" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a className={styles.footerLink} href="https://www.airtable.com/company/privacy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>.
              </p>
              <p>
                Manage your cookie preferences{" "}
                <button
                  type="button"
                  className={styles.footerLink}
                  onClick={() => setIsPrivacyOpen(true)}
                >
                  here
                </button>
              </p>
            </div>
            <div className={styles.marketingOptIn}>
              <input
                className={styles.marketingCheckbox}
                type="checkbox"
                id="marketing-opt-in"
                checked={marketingOptIn}
                onChange={(e) => setMarketingOptIn(e.target.checked)}
              />
              <label
                className={styles.marketingLabel}
                htmlFor="marketing-opt-in"
              >
                By checking this box, you agree to receive marketing and sales communications about Airtable products, services, and events. You understand that you can manage your preferences at any time by following the instructions in the communications received.
              </label>
            </div>
            <p>
              Already have an account?{" "}
              <Link className={styles.footerLink} href="/login">
              Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>

      {isPrivacyOpen && (
        <div
          className={`${styles.privacyOverlay} ${isFadingOut ? styles.privacyOverlayFadeOut : ''}`}
          role="dialog"
          aria-modal="true"
        >
          <div className={styles.privacyModal}>
            <div className={styles.privacyHeader}>
              <span className={styles.privacyLogo}>
                <Image
                  src="/assets/lg-airtable_full_logo.png"
                  alt="Airtable"
                  width={120}
                  height={24}
                  className={styles.privacyLogoImage}
                  priority
                />
              </span>
              <h2 className={styles.privacyTitle}>Privacy Preference Center</h2>
              <button
                type="button"
                className={styles.privacyClose}
                onClick={() => setIsPrivacyOpen(false)}
                aria-label="Close privacy preferences"
              >
                ×
              </button>
            </div>


            <div className={styles.privacyBody}>
              <div className={styles.privacyBodyInner}>
                <div className={styles.privacyNotice}>
                  <span className={styles.privacyNoticeIcon} aria-hidden>
                    <svg
                      viewBox="0 0 24 24"
                      className={styles.noticeIcon}
                      aria-hidden
                    >
                      <path
                        d="M12 2 4 5v6c0 5.1 3.7 9.8 8 11 4.3-1.2 8-5.9 8-11V5l-8-3Z"
                        fill="#22a871"
                      />
                      <path
                        d="m10.5 12.6 3.2-3.2 1.1 1.1-4.3 4.3-2.2-2.2 1.1-1.1 1.1 1.1Z"
                        fill="#ffffff"
                      />
                    </svg>
                  </span>
                  <span className={styles.privacyNoticeText}>
                    Your Opt Out Preference Signal is Honored
                  </span>
                </div>

                <div className={styles.privacyGrid}>
                  <nav className={styles.privacyNav}>
                    {privacyTabs.map((tab) => {
                      const isActive = activePrivacyTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          className={
                            isActive
                              ? styles.privacyNavItemActive
                              : styles.privacyNavItem
                          }
                          onClick={() => setActivePrivacyTab(tab.id)}
                          aria-pressed={isActive}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </nav>

                  <section className={styles.privacyContent}>
                    {
                      privacyContent[
                        activePrivacyTab as keyof typeof privacyContent
                      ]
                    }
                  </section>
                </div>
              </div>
            </div>

            <div className={styles.privacyFooter}>
              {allCookiesEnabled ? (
                <>
                  <button
                    type="button"
                    className={styles.privacyButtonWide}
                    onClick={handleConfirmChoices}
                  >
                    Confirm My Choices
                  </button>
                  <button
                    type="button"
                    className={styles.privacyButtonWide}
                    onClick={handleRejectAll}
                  >
                    Reject All
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.privacyButtonSecondary}
                    onClick={handleConfirmChoices}
                  >
                    Confirm My Choices
                  </button>
                  <div className={styles.privacyFooterActions}>
                    <button
                      type="button"
                      className={styles.privacyButtonSecondary}
                      onClick={handleRejectAll}
                    >
                      Reject All
                    </button>
                    <button
                      type="button"
                      className={styles.privacyButtonPrimary}
                      onClick={handleAllowAll}
                    >
                      Allow All
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
