"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { NumberPickerOption } from "../../_lib/types";
import styles from "../../tables.module.css";

type NumberConfigPickerProps<T extends string> = {
  value: T;
  options: ReadonlyArray<NumberPickerOption<T>>;
  onChange: (next: T) => void;
  searchPlaceholder?: string;
  onEscapeHighlight?: (element: HTMLElement | null) => void;
};

export const NumberConfigPicker = <T extends string>({
  value,
  options,
  onChange,
  searchPlaceholder = "Find...",
  onEscapeHighlight,
}: NumberConfigPickerProps<T>) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === value) ?? options[0],
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.triggerLabel ?? ""} ${option.description ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      setIsOpen(false);
      setQuery("");
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setQuery("");
        onEscapeHighlight?.(triggerRef.current);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onEscapeHighlight]);

  useEffect(() => {
    if (!isOpen) return;
    searchInputRef.current?.focus();
  }, [isOpen]);

  return (
    <div className={styles.addColumnNumberPicker} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.addColumnNumberPickerTrigger}
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
      >
        <span>{selectedOption?.triggerLabel ?? selectedOption?.label ?? ""}</span>
        <span className={styles.addColumnNumberPickerChevron} aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4.8 6.3L8 9.5l3.2-3.2 1 1L8 11.5 3.8 7.3l1-1z" />
          </svg>
        </span>
      </button>
      {isOpen ? (
        <div className={styles.addColumnNumberPickerMenu}>
          <div className={styles.addColumnNumberPickerSearchRow}>
            <input
              ref={searchInputRef}
              type="text"
              className={styles.addColumnNumberPickerSearchInput}
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className={styles.addColumnNumberPickerOptions}>
            {filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`${styles.addColumnNumberPickerOption} ${
                  option.id === value ? styles.addColumnNumberPickerOptionActive : ""
                }`}
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                  setQuery("");
                }}
              >
                <span>{option.label}</span>
                {option.description ? (
                  <span className={styles.addColumnNumberPickerOptionDescription}>
                    {option.description}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
