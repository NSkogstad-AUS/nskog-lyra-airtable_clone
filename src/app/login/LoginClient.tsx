"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./login.module.css";

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [emailEdited, setEmailEdited] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [activePrivacyTab, setActivePrivacyTab] = useState("privacy");
  const [performanceCookies, setPerformanceCookies] = useState(true);
  const [functionalCookies, setFunctionalCookies] = useState(true);
  const [targetingCookies, setTargetingCookies] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const showEmailError = emailTouched && emailEdited && !isValidEmail;
  const canSubmit = isValidEmail && !isLoading;

  useEffect(() => {
    const errorParam = searchParams?.get("error");
    const registered = searchParams?.get("registered");

    if (errorParam === "NoAccount") {
      setError("No account found. Please create an account first.");
    } else if (errorParam === "CredentialsSignin") {
      setError("Invalid email or password. Please try again.");
    }

    if (registered === "true") {
      setSuccessMessage("Account created successfully! Please sign in.");
    }
  }, [searchParams]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check if user exists
      const response = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as {
        exists?: boolean;
        hasPassword?: boolean;
        error?: string;
      };

      if (!data.exists) {
        setError("No account found. Please create an account first.");
        return;
      }

      if (!data.hasPassword) {
        setError(
          "You have no password set; please sign in with a third-party provider, e.g. Google.",
        );
        return;
      }

      // Navigate to password entry page
      router.push(`/login/password?email=${encodeURIComponent(email)}`);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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
      <div id="ssrInnerContainer" className={styles.ssrInnerContainer}>
        <div className={styles.content}>
          <section className={styles.leftShell}>
          <div className={styles.left}>
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

            <h1 className={styles.title}>Sign in to Airtable</h1>

            {successMessage && (
              <div className={styles.successBanner} role="status">
                {successMessage}
              </div>
            )}

            {error && (
              <div className={styles.errorBanner} role="alert">
                <div className={styles.errorContent}>
                  <div className={styles.errorIcon}>
                    <svg
                      width="16"
                      height="20"
                      viewBox="0 0 16 20"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M8 0C3.6 0 0 3.6 0 8C0 12.4 3.6 16 8 16C12.4 16 16 12.4 16 8C16 3.6 12.4 0 8 0ZM9 12H7V10H9V12ZM9 8H7V4H9V8Z"
                        fill="#DC0453"
                      />
                    </svg>
                  </div>
                  <div className={styles.errorText}>{error}</div>
                </div>
              </div>
            )}

            <div className={styles.authBlock}>
              <form className={styles.form} onSubmit={handleEmailSubmit}>
                <div className={styles.inputGroup}>
                  <label htmlFor="emailLogin" className={styles.inputLabel}>
                    Email
                  </label>
                  <div className={styles.inputSpacer} />
                  <div className={styles.inputWrapper}>
                    <input
                      id="emailLogin"
                      type="email"
                      name="email"
                      placeholder="Email address"
                      className={`${styles.input} ${
                        showEmailError ? styles.inputInvalid : ""
                      }`}
                      value={email}
                      onChange={(event) => {
                        const value = event.target.value;
                        setEmail(value);
                        if (!emailEdited && value.trim() !== "") {
                          setEmailEdited(true);
                        }
                        setError(null);
                      }}
                      onBlur={() => setEmailTouched(true)}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  {showEmailError && (
                    <span id="email-error" className={styles.errorText} role="alert">
                      Invalid email
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className={`${styles.primaryButton} ${
                    canSubmit ? styles.primaryButtonActive : ""
                  }`}
                  disabled={!canSubmit}
                >
                  {isLoading ? "Checking..." : "Continue"}
                </button>
              </form>

              <div className={styles.orRow}>
                <span className={styles.orLine} />
                or
                <span className={styles.orLine} />
              </div>

              <div className={styles.altButtons}>
                <button type="button" className={styles.secondaryButton}>
                  <div className={styles.buttonText}>
                    Sign in with{"\u00A0"}<span className={styles.boldText}>Single Sign On</span>
                  </div>
                </button>
                <button
                  type="button"
                  className={styles.providerButton}
                  onClick={() =>
                    void signIn("google", { callbackUrl: "/bases" })
                  }
                >
                  <span className={styles.iconWrap}>
                    <svg viewBox="0 0 18 18" className={styles.googleIcon} aria-hidden>
                      <path
                        d="M17.64,9.20454545 C17.64,8.56636364 17.5827273,7.95272727 17.4763636,7.36363636 L9,7.36363636 L9,10.845 L13.8436364,10.845 C13.635,11.97 13.0009091,12.9231818 12.0477273,13.5613636 L12.0477273,15.8195455 L14.9563636,15.8195455 C16.6581818,14.2527273 17.64,11.9454545 17.64,9.20454545 L17.64,9.20454545 Z"
                        fill="#4285F4"
                      />
                      <path
                        d="M9,18 C11.43,18 13.4672727,17.1940909 14.9563636,15.8195455 L12.0477273,13.5613636 C11.2418182,14.1013636 10.2109091,14.4204545 9,14.4204545 C6.65590909,14.4204545 4.67181818,12.8372727 3.96409091,10.71 L0.957272727,10.71 L0.957272727,13.0418182 C2.43818182,15.9831818 5.48181818,18 9,18 L9,18 Z"
                        fill="#34A853"
                      />
                      <path
                        d="M3.96409091,10.71 C3.78409091,10.17 3.68181818,9.59318182 3.68181818,9 C3.68181818,8.40681818 3.78409091,7.83 3.96409091,7.29 L3.96409091,4.95818182 L0.957272727,4.95818182 C0.347727273,6.17318182 0,7.54772727 0,9 C0,10.4522727 0.347727273,11.8268182 0.957272727,13.0418182 L3.96409091,10.71 L3.96409091,10.71 Z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M9,3.57954545 C10.3213636,3.57954545 11.5077273,4.03363636 12.4404545,4.92545455 L15.0218182,2.34409091 C13.4631818,0.891818182 11.4259091,0 9,0 C5.48181818,0 2.43818182,2.01681818 0.957272727,4.95818182 L3.96409091,7.29 C4.67181818,5.16272727 6.65590909,3.57954545 9,3.57954545 L9,3.57954545 Z"
                        fill="#EA4335"
                      />
                    </svg>
                  </span>
                  <div className={styles.buttonText}>
                    Continue with{"\u00A0"}<span className={styles.boldText}>Google</span>
                  </div>
                </button>
                <button type="button" className={styles.providerButton}>
                  <span className={styles.appleIcon}>
                    <svg viewBox="20 16 16 20" className={styles.appleSvg} aria-hidden fill="none">
                      <path
                        d="M28.2226562,20.3846154 C29.0546875,20.3846154 30.0976562,19.8048315 30.71875,19.0317864 C31.28125,18.3312142 31.6914062,17.352829 31.6914062,16.3744437 C31.6914062,16.2415766 31.6796875,16.1087095 31.65625,16 C30.7304687,16.0362365 29.6171875,16.640178 28.9492187,17.4494596 C28.421875,18.06548 27.9414062,19.0317864 27.9414062,20.0222505 C27.9414062,20.1671964 27.9648438,20.3121424 27.9765625,20.3604577 C28.0351562,20.3725366 28.1289062,20.3846154 28.2226562,20.3846154 Z M25.2929688,35 C26.4296875,35 26.9335938,34.214876 28.3515625,34.214876 C29.7929688,34.214876 30.109375,34.9758423 31.375,34.9758423 C32.6171875,34.9758423 33.4492188,33.792117 34.234375,32.6325493 C35.1132812,31.3038779 35.4765625,29.9993643 35.5,29.9389701 C35.4179688,29.9148125 33.0390625,28.9122695 33.0390625,26.0979021 C33.0390625,23.6579784 34.9140625,22.5588048 35.0195312,22.474253 C33.7773438,20.6382708 31.890625,20.5899555 31.375,20.5899555 C29.9804688,20.5899555 28.84375,21.4596313 28.1289062,21.4596313 C27.3554688,21.4596313 26.3359375,20.6382708 25.1289062,20.6382708 C22.8320312,20.6382708 20.5,22.5950413 20.5,26.2911634 C20.5,28.5861411 21.3671875,31.013986 22.4335938,32.5842339 C23.3476562,33.9129053 24.1445312,35 25.2929688,35 Z"
                        fill="#000"
                        fillRule="nonzero"
                      />
                    </svg>
                  </span>
                  <div className={styles.buttonText}>
                    Continue with{"\u00A0"}<span className={styles.boldText}>Apple ID</span>
                  </div>
                </button>
              </div>
            </div>
            <div className={styles.footer}>
              <p>
                New to Airtable?{" "}
                <Link className={styles.footerLink} href="/signup">
                  Create an account
                </Link>{" "}
                instead
              </p>
              <p className={styles.footerIndented}>
                Manage your cookie preferences{"\u00A0"}
                <button
                  type="button"
                  className={styles.footerLink1}
                  onClick={() => setIsPrivacyOpen(true)}
                >
                  here
                </button>
              </p>
            </div>
          </div>
          </section>
          <aside className={styles.rightShell} aria-hidden>
            <a
              href="https://www.airtable.com/platform/app-building"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.right}
            >
              <div className={styles.rightPromo} />
            </a>
          </aside>
        </div>
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
