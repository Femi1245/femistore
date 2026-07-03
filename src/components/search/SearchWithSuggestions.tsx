"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import {
  fetchSearchSuggestions,
  type SearchSuggestion,
  type SearchSuggestionScope,
} from "@/lib/search-suggestions";

type Props = {
  scope: SearchSuggestionScope;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  conversationId?: string;
  excludeUserId?: string;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  minChars?: number;
  debounceMs?: number;
  showIcon?: boolean;
  name?: string;
  id?: string;
  type?: string;
  autoComplete?: string;
};

export function SearchWithSuggestions({
  scope,
  value,
  onChange,
  placeholder = "Search…",
  className = "",
  inputClassName = "",
  conversationId,
  excludeUserId,
  onSuggestionSelect,
  minChars = 2,
  debounceMs = 280,
  showIcon = true,
  name,
  id: idProp,
  type = "search",
  autoComplete = "off",
}: Props) {
  const router = useRouter();
  const autoId = useId();
  const inputId = idProp ?? autoId;
  const listboxId = `${inputId}-suggestions`;

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);

  const loadSuggestions = useCallback(
    async (query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < minChars) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const results = await fetchSearchSuggestions(trimmed, scope, {
        conversationId,
        excludeUserId,
      });
      setSuggestions(results);
      setLoading(false);
      setActiveIndex(results.length > 0 ? 0 : -1);
    },
    [scope, conversationId, excludeUserId, minChars],
  );

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      void loadSuggestions(value);
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [value, open, debounceMs, loadSuggestions]);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function pickSuggestion(suggestion: SearchSuggestion) {
    setOpen(false);
    setSuggestions([]);

    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
      return;
    }

    if (suggestion.href?.startsWith("#")) {
      document
        .getElementById(suggestion.href.slice(1))
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (suggestion.href) {
      router.push(suggestion.href);
      return;
    }

    onChange(suggestion.label);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp") && suggestions.length) {
      setOpen(true);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      pickSuggestion(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown =
    open && value.trim().length >= minChars && (loading || suggestions.length > 0);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {showIcon && (
        <Search
          className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-vintage-rust"
          aria-hidden
        />
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        autoComplete={autoComplete}
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim().length >= minChars) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className={`vintage-input w-full text-sm ${showIcon ? "py-2.5 pl-10 pr-4" : "px-3 py-2.5"} ${inputClassName}`}
      />

      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-72 overflow-y-auto rounded-xl border border-vintage-border bg-vintage-paper py-1 shadow-lg"
        >
          {loading && suggestions.length === 0 && (
            <li className="flex items-center gap-2 px-3 py-2.5 text-sm text-vintage-ink-muted">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </li>
          )}

          {!loading &&
            suggestions.length === 0 &&
            value.trim().length >= minChars && (
              <li className="px-3 py-2.5 text-sm text-vintage-ink-muted">No matches yet</li>
            )}

          {suggestions.map((suggestion, index) => {
            const active = index === activeIndex;
            const inner = (
              <>
                {suggestion.kind === "videos" && suggestion.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={suggestion.avatarUrl}
                    alt=""
                    className="h-9 w-12 shrink-0 rounded object-cover"
                  />
                ) : suggestion.kind !== "messages" ? (
                  <Avatar
                    name={suggestion.label}
                    avatarUrl={suggestion.avatarUrl ?? null}
                    size="sm"
                  />
                ) : null}
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-vintage-ink">
                    {suggestion.label}
                  </p>
                  {suggestion.sublabel && (
                    <p className="truncate text-xs text-vintage-ink-muted">
                      {suggestion.sublabel}
                    </p>
                  )}
                </div>
              </>
            );

            const rowClass = `flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition ${
              active ? "bg-vintage-rust/12" : "hover:bg-vintage-paper-dark/60"
            }`;

            if (
              suggestion.href &&
              !suggestion.href.startsWith("#") &&
              !onSuggestionSelect
            ) {
              return (
                <li key={`${suggestion.kind}-${suggestion.id}`} role="option" aria-selected={active}>
                  <Link
                    href={suggestion.href}
                    className={rowClass}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActiveIndex(index)}
                  >
                    {inner}
                  </Link>
                </li>
              );
            }

            return (
              <li key={`${suggestion.kind}-${suggestion.id}`} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={rowClass}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pickSuggestion(suggestion)}
                >
                  {inner}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
