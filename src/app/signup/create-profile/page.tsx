"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "../signup.module.css";

export default function CreateProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams?.get("email") ?? "";

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

  const canSubmit = name.trim().length > 0 && password.length >= 8 && !isLoading;

  useEffect(() => {
    if (!email) {
      router.push("/signup");
    }
  }, [email, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit || !email) return;

    setIsLoading(true);
    setError(null);
    setPasswordErrors([]);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      const data = (await response.json()) as {
        error?: string;
        details?: string[];
        success?: boolean;
      };

      if (!response.ok) {
        if (data.details && Array.isArray(data.details)) {
          setPasswordErrors(data.details);
        } else {
          setError(data.error ?? "Failed to create account");
        }
        return;
      }

      // Automatically sign in the user after successful registration
      const result = await signIn("credentials", {
        email: email.toLowerCase(),
        password,
        redirect: false,
        callbackUrl: "/bases",
      });

      if (result?.error) {
        setError("Account created but failed to sign in. Please try logging in.");
        return;
      }

      if (result?.ok) {
        router.push("/bases");
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!email) {
    return null;
  }

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

          <h1 className={styles.title}>Create your profile</h1>

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

          <form className={styles.form} onSubmit={handleSubmit}>
            <div>
              <label className={styles.inputLabel} htmlFor="profile-name">
                Full name
              </label>
              <input
                id="profile-name"
                type="text"
                name="name"
                placeholder="First and last"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <label className={styles.inputLabel} htmlFor="profile-password">
                Password
              </label>
              <input
                id="profile-password"
                type="password"
                name="password"
                placeholder="Minimum 8 characters"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={8}
              />
              {passwordErrors.length > 0 && (
                <div className={styles.errorText} role="alert">
                  {passwordErrors.map((err, i) => (
                    <div key={i}>{err}</div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className={`${styles.primaryButton} ${
                canSubmit ? styles.primaryButtonActive : ""
              }`}
              disabled={!canSubmit}
            >
              {isLoading ? "Creating account..." : "Sign up"}
            </button>
          </form>

          <div className={styles.footer}>
            <p className={styles.footerText}>
              Signing up as {email}.{" "}
              <button
                type="button"
                className={styles.footerLink}
                onClick={() => router.push("/signup")}
              >
                Not you?
              </button>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
