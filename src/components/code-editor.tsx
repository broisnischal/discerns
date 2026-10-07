import {
  defaultHighlightStyle,
  LanguageDescription,
  syntaxHighlighting,
} from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import type { Extension } from "@codemirror/state";
import { oneDarkHighlightStyle } from "@codemirror/theme-one-dark";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useEffect, useState } from "react";

import { useTheme } from "#/components/theme-provider.tsx";
import type { ItemKind } from "#/lib/db/schema/types.ts";
import { cn } from "#/lib/utils.ts";

/** Names CodeMirror can highlight, for the language picker. */
export const LANGUAGE_NAMES = languages.map((l) => l.name).sort((a, b) => a.localeCompare(b));

/** Which CodeMirror language a kind gets; `code` items use their own `language` field. */
export function languageFor(kind: ItemKind, language?: string | null) {
  if (kind === "code") return language || null;
  if (kind === "env") return "shell";
  if (kind === "log") return null;
  return "markdown";
}

// Draws on the project's tokens so the editor is one surface with the card around it.
const surface = (dark: boolean) =>
  EditorView.theme(
    {
      "&": { backgroundColor: "transparent", fontSize: "13px", color: "var(--foreground)" },
      "&.cm-focused": { outline: "none" },
      ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.65" },
      ".cm-content": { padding: "12px 0", caretColor: "var(--foreground)" },
      ".cm-line": { padding: "0 16px" },
      ".cm-gutters": {
        backgroundColor: "transparent",
        border: "none",
        color: "var(--muted-foreground)",
        opacity: "0.6",
        paddingInlineStart: "8px",
      },
      ".cm-activeLine": {
        backgroundColor: "color-mix(in oklch, var(--foreground) 4%, transparent)",
      },
      ".cm-activeLineGutter": { backgroundColor: "transparent" },
      ".cm-foldGutter .cm-gutterElement": { cursor: "pointer" },
      ".cm-matchingBracket": {
        backgroundColor: "color-mix(in oklch, var(--primary) 22%, transparent)",
        outline: "none",
      },
      ".cm-selectionMatch": {
        backgroundColor: "color-mix(in oklch, var(--primary) 14%, transparent)",
      },
      ".cm-tooltip": {
        backgroundColor: "var(--popover)",
        color: "var(--popover-foreground)",
        border: "none",
        borderRadius: "12px",
        boxShadow: "var(--shadow-border), 0 8px 24px oklch(0 0 0 / 0.25)",
        overflow: "hidden",
      },
      ".cm-tooltip-autocomplete ul li[aria-selected]": {
        backgroundColor: "var(--accent)",
        color: "var(--accent-foreground)",
      },
      ".cm-panels": { backgroundColor: "var(--card)", color: "var(--foreground)", border: "none" },
      ".cm-panel.cm-search input, .cm-panel.cm-search button": {
        borderRadius: "8px",
        border: "1px solid var(--border)",
        background: "var(--input)",
        color: "inherit",
      },
      ".cm-placeholder": { color: "var(--muted-foreground)", fontStyle: "normal" },
      ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
        backgroundColor: "color-mix(in oklch, var(--primary) 28%, transparent)",
      },
      ".cm-cursor": { borderInlineStartColor: "var(--foreground)" },
    },
    { dark },
  );

function useResolvedTheme() {
  const { theme } = useTheme();
  const [dark, setDark] = useState(theme === "dark");
  useEffect(() => {
    if (theme !== "system") {
      // oxlint-disable-next-line react/set-state-in-effect
      setDark(theme === "dark");
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(media.matches);
    const onChange = () => setDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);
  return dark ? "dark" : "light";
}

function useLanguage(name: string | null) {
  const [extension, setExtension] = useState<Extension | null>(null);
  useEffect(() => {
    let cancelled = false;
    const description = name ? LanguageDescription.matchLanguageName(languages, name, true) : null;
    if (!description) {
      // oxlint-disable-next-line react/set-state-in-effect
      setExtension(null);
      return;
    }
    description.load().then((support) => {
      if (!cancelled) setExtension(support);
    });
    return () => {
      cancelled = true;
    };
  }, [name]);
  return extension;
}

export function CodeEditor({
  value,
  onChange,
  language,
  placeholder,
  readOnly = false,
  lineNumbers = true,
  spellCheck = false,
  minHeight = "14rem",
  className,
  ariaLabel,
}: {
  value: string;
  onChange?: (value: string) => void;
  language: string | null;
  placeholder?: string;
  readOnly?: boolean;
  lineNumbers?: boolean;
  spellCheck?: boolean;
  minHeight?: string;
  className?: string;
  ariaLabel: string;
}) {
  const resolved = useResolvedTheme();
  const lang = useLanguage(language);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      theme="none"
      readOnly={readOnly}
      editable={!readOnly}
      placeholder={placeholder}
      minHeight={minHeight}
      spellCheck={spellCheck}
      aria-label={ariaLabel}
      className={cn("text-[13px] [&_.cm-editor]:rounded-[inherit]", className)}
      basicSetup={{
        lineNumbers,
        foldGutter: lineNumbers && !readOnly,
        highlightActiveLine: !readOnly,
        highlightActiveLineGutter: false,
        autocompletion: !readOnly,
        bracketMatching: true,
        closeBrackets: !readOnly,
        highlightSelectionMatches: true,
        indentOnInput: !readOnly,
        searchKeymap: true,
        tabSize: 2,
      }}
      extensions={[
        surface(resolved === "dark"),
        syntaxHighlighting(resolved === "dark" ? oneDarkHighlightStyle : defaultHighlightStyle),
        EditorView.lineWrapping,
        ...(lang ? [lang] : []),
      ]}
    />
  );
}
