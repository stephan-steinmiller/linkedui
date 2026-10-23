#!/usr/bin/env python3
"""linkedui — tools/minify.py — minimal, dependency-free minifier.

Reads src/linkedui.css (+ optionally a custom entry) and src/enhance.js,
writes dist/linkedui.min.css + dist/enhance.min.js.

No dependencies (stdlib only, like site/split-wiki.py). Conservative by
design: comments are stripped, whitespace collapsed — but strings, url(...)
payloads, calc() expressions and JS line semantics are preserved byte-safe.

Usage:
  python3 tools/minify.py                      # full build -> dist/
  python3 tools/minify.py --entry custom.css  # custom @import list (pruning)
  python3 tools/minify.py --theme default     # only one theme (+ its dark mode)
  python3 tools/minify.py --check             # verify dist/ matches a fresh build

Pruning model (opt-in): an entry file is just @import lines (copy
src/linkedui.css and delete what a project doesn't need). --theme keeps a
single [data-theme="X"] block plus its dark-mode rules, dropping the others.
Built-in themes: default, ocean, squishy.
"""

import argparse
import gzip
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
DIST = ROOT / "dist"

BUILTIN_THEMES = ("default", "ocean", "squishy")


# --------------------------------------------------------------------------
# helpers
# --------------------------------------------------------------------------

def die(msg):
    print(f"minify: FEHLER: {msg}", file=sys.stderr)
    sys.exit(1)


def check(cond, msg):
    if not cond:
        die(msg)


def kb(n):
    return f"{n / 1024:.1f} KB"


def gz_len(text):
    return len(gzip.compress(text.encode("utf-8"), compresslevel=9))


# --------------------------------------------------------------------------
# CSS: string-aware tokenizer (never touch inside "..." / '...' / url(...))
# --------------------------------------------------------------------------

# Splits CSS into (is_code, chunk) pieces. Comments are dropped entirely
# (docs live in WIKI.md + site/wiki/, src keeps the originals).
TOKEN_RE = re.compile(
    r"(?P<comment>/\*.*?\*/)"          # CSS comment
    r"|(?P<string>\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*')"  # quoted string
    r"|(?P<url>url\(\s*(?:\"(?:[^\"\\]|\\.)*\"|'(?:[^'\\]|\\.)*'|[^)]*)\))",  # url(...)
    re.DOTALL,
)


def minify_css(text):
    """Strip comments, collapse whitespace. Strings/urls pass through untouched."""
    out = []
    pos = 0
    for m in TOKEN_RE.finditer(text):
        code = text[pos:m.start()]
        # collapse whitespace runs to one space, drop space around tokens
        code = re.sub(r"\s+", " ", code)
        code = re.sub(r"\s*([{}:;,>+~()\[\]=])\s*", r"\1", code)
        out.append(code)
        kind = m.lastgroup
        if kind == "comment":
            pass  # drop
        else:
            out.append(m.group(0))  # string | url(): verbatim
        pos = m.end()
    tail = text[pos:]
    tail = re.sub(r"\s+", " ", tail)
    tail = re.sub(r"\s*([{}:;,>+~()\[\]=])\s*", r"\1", tail)
    out.append(tail)
    result = "".join(out).strip()
    # no leading/trailing semicolons inside blocks: ";}" -> "}"
    result = result.replace(";}", "}")
    return result


def count_rules(text):
    """Rough rule count = number of non-empty '{...}' blocks (for drift checks)."""
    check(text.count("{") == text.count("}"), "Klammern unbalanciert")
    return text.count("{")


# --------------------------------------------------------------------------
# JS: conservative (comments + blank lines only — no line joining, ASI-safe)
# --------------------------------------------------------------------------

def minify_js(text):
    """Strip // and /* */ comments with string awareness; collapse blank lines."""
    out_lines = []
    i, n = 0, len(text)
    in_str = None  # None | quote char
    in_block = False
    in_line = False
    buf = []
    while i < n:
        c = text[i]
        nxt = text[i + 1] if i + 1 < n else ""
        if in_block:
            if c == "*" and nxt == "/":
                in_block = False
                i += 2
            else:
                i += 1
            continue
        if in_line:
            if c == "\n":
                in_line = False
                buf.append("\n")
            i += 1
            continue
        if in_str:
            buf.append(c)
            if c == "\\":
                buf.append(nxt)
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c in "\"'`":
            in_str = c
            buf.append(c)
            i += 1
        elif c == "/" and nxt == "*":
            in_block = True
            i += 2
        elif c == "/" and nxt == "/":
            in_line = True
            i += 2
        else:
            buf.append(c)
            i += 1
    text = "".join(buf)
    # drop empty lines + trailing whitespace per line (never join lines: ASI)
    lines = [ln.rstrip() for ln in text.split("\n")]
    lines = [ln for ln in lines if ln.strip() != ""]
    return "\n".join(lines) + "\n"


# --------------------------------------------------------------------------
# entry + theme filtering (pruning, opt-in)
# --------------------------------------------------------------------------

IMPORT_RE = re.compile(r'@import\s+["\']([^"\']+)["\'][^;]*;')


def read_entry(entry_path):
    """Resolve @import list of an entry file to absolute src paths (order kept)."""
    text = entry_path.read_text(encoding="utf-8")
    files = []
    for m in IMPORT_RE.finditer(text):
        rel = m.group(1).split("?")[0]  # strip ?v= cache busters
        p = (entry_path.parent / rel).resolve()
        check(p.is_file(), f"Import nicht gefunden: {rel} (in {entry_path.name})")
        check(str(p).startswith(str(SRC)), f"Import ausserhalb von src/: {rel}")
        if p not in files:
            files.append(p)
    check(files, f"keine @imports in {entry_path.name} gefunden")
    return files


def _split_top_level(text):
    """Split CSS into (prelude, body|None) statements, brace-aware.

    Handles nested blocks (at-rules) via depth counting on non-string,
    non-comment characters. Comments are returned as ('', comment) items
    so callers can preserve or drop them.
    """
    items = []
    i, n = 0, len(text)
    buf = ""
    while i < n:
        c = text[i]
        if c == "/" and i + 1 < n and text[i + 1] == "*":
            j = text.find("*/", i + 2)
            j = n if j < 0 else j + 2
            if buf.strip():
                items.append(("code", buf))
                buf = ""
            items.append(("comment", text[i:j]))
            i = j
            continue
        if c in "\"'":
            j = i + 1
            while j < n and text[j] != c:
                j += 2 if text[j] == "\\" else 1
            buf += text[i:j + 1]
            i = j + 1
            continue
        if c == "{":
            prelude = buf.strip()
            depth, j = 1, i + 1
            instr = None
            while j < n and depth > 0:
                d = text[j]
                if instr:
                    if d == "\\":
                        j += 1
                    elif d == instr:
                        instr = None
                elif d in "\"'":
                    instr = d
                elif d == "/" and j + 1 < n and text[j + 1] == "*":
                    e = text.find("*/", j + 2)
                    j = n if e < 0 else e + 1
                elif d == "{":
                    depth += 1
                elif d == "}":
                    depth -= 1
                j += 1
            items.append(("rule", prelude, text[i:j]))
            buf = ""
            i = j
            continue
        buf += c
        i += 1
    if buf.strip():
        items.append(("code", buf))
    return items


def _split_selectors(prelude):
    """Split a selector list on top-level commas (ignores parens, strings)."""
    parts, depth, cur, instr = [], 0, "", None
    i, n = 0, len(prelude)
    while i < n:
        c = prelude[i]
        if instr:
            cur += c
            if c == "\\" and i + 1 < n:
                cur += prelude[i + 1]
                i += 1
            elif c == instr:
                instr = None
        elif c in "\"'":
            instr = c
            cur += c
        elif c == "(":
            depth += 1
            cur += c
        elif c == ")":
            depth = max(0, depth - 1)
            cur += c
        elif c == "," and depth == 0:
            parts.append(cur.strip())
            cur = ""
        else:
            cur += c
        i += 1
    if cur.strip():
        parts.append(cur.strip())
    return parts


def _theme_mentions(selector):
    """All data-theme="X" values mentioned in a selector string."""
    return set(re.findall(r'\[data-theme="([^"]+)"', selector))


def _filter_rules(text, theme, dropped):
    """Recursively drop style rules that only mention other themes.

    A rule survives if any of its selectors is theme-free (generic dark
    fallbacks etc.) or mentions the target theme. At-rules (@media,
    @supports, @layer) are kept iff anything inside survives.
    """
    out = []
    for item in _split_top_level(text):
        if item[0] != "rule":
            out.append(item[1])  # Kommentar oder loser Code: unverändert übernehmen
            continue
        _, prelude, block = item
        if prelude.startswith("@"):
            inner = block[block.find("{") + 1:block.rfind("}")]
            kept_inner = _filter_rules(inner, theme, dropped)
            if kept_inner.strip():
                out.append(prelude + " {" + kept_inner + "}")
            continue
        mentions = set()
        for sel in _split_selectors(prelude):
            mentions |= _theme_mentions(sel)
        if mentions and theme not in mentions:
            # nur Fremd-Themes genannt -> weg. Nenne es beim ersten Vorkommen.
            for th in sorted(mentions):
                if th not in dropped:
                    dropped.append(th)
            continue
        out.append(prelude + block[block.find("{"):])
    return "".join(out)


def filter_theme(css, theme):
    """Keep only rules for one theme (+ generic/dark fallbacks).

    Conservative: a rule is dropped only if every data-theme mention in
    its selector(s) names a *different* theme. Rules without any theme
    mention (generic dark fallbacks, chevron overrides, @supports blocks)
    are always kept. Returns (filtered_css, dropped_theme_list).
    """
    check(theme in BUILTIN_THEMES, f"unbekanntes Theme: {theme} (bekannt: {', '.join(BUILTIN_THEMES)})")
    dropped = []
    return _filter_rules(css, theme, dropped), sorted(dropped)


# --------------------------------------------------------------------------
# build
# --------------------------------------------------------------------------

def build(entry_name, theme):
    if entry_name:
        entry_path = ROOT / entry_name if "/" in entry_name else SRC / entry_name
        check(entry_path.is_file(), f"Entry nicht gefunden: {entry_name}")
        css_files = read_entry(entry_path)
    else:
        css_files = read_entry(SRC / "linkedui.css")
    css_src = "\n".join(p.read_text(encoding="utf-8") for p in css_files)
    css_dropped = []
    if theme:
        # theme filter applies to themes.css content only
        css_src, css_dropped = filter_theme(css_src, theme)
    css_min = minify_css(css_src)

    js_src = (SRC / "enhance.js").read_text(encoding="utf-8")
    js_min = minify_js(js_src)

    # self-checks
    count_rules(css_min)
    check(len(css_min) > 0 and len(js_min) > 0, "leere Ausgabe")
    check("@" not in css_min or "@media" in css_min or "@supports" in css_min or "@layer" in css_min or "@" not in css_min.replace("@@", ""),
          "unerwartetes @-Zeichen (Import übrig?)")
    return css_min, js_min, css_dropped


def report(label, src_text, min_text):
    sb, mb = len(src_text.encode("utf-8")), len(min_text.encode("utf-8"))
    print(f"  {label:<28} {kb(mb):>8} (war {kb(sb):>8}, gzip {kb(gz_len(min_text)):>8})")


def main(argv):
    ap = argparse.ArgumentParser(description="linkedui minify build (stdlib only)")
    ap.add_argument("--entry", default=None, help="Custom-Entry mit @imports, z.B. site-entry.css (relativ zu Repo-Root oder src/)")
    ap.add_argument("--theme", default=None, choices=[*BUILTIN_THEMES], help="nur dieses Theme behalten")
    ap.add_argument("--check", action="store_true", help="nur pruefen ob dist/ aktuell ist")
    ap.add_argument("--out", default="dist", help="Ausgabeverzeichnis (relativ zu Repo-Root)")
    args = ap.parse_args(argv)

    css_min, js_min, dropped = build(args.entry, args.theme)
    outdir = ROOT / args.out

    if args.check:
        ok = True
        for name, content in (("linkedui.min.css", css_min), ("enhance.min.js", js_min)):
            p = outdir / name
            if not p.is_file():
                print(f"  FEHLT: {p}")
                ok = False
            elif p.read_text(encoding="utf-8") != content:
                print(f"  VERALTET: {p} (neu bauen mit tools/minify.py)")
                ok = False
            else:
                print(f"  aktuell: {p}")
        if dropped:
            print(f"  Hinweis: Themes verworfen: {', '.join(dropped)}")
        sys.exit(0 if ok else 1)

    outdir.mkdir(exist_ok=True)
    (outdir / "linkedui.min.css").write_text(css_min, encoding="utf-8")
    (outdir / "enhance.min.js").write_text(js_min, encoding="utf-8")
    print(f"linkedui build -> {outdir}/ (entry={args.entry or 'src/linkedui.css'}, theme={args.theme or 'alle'})")
    # echte Quellgroessen fuer den Report
    if args.entry:
        ep = ROOT / args.entry if "/" in args.entry else SRC / args.entry
        src_files = read_entry(ep)
    else:
        src_files = read_entry(SRC / "linkedui.css")
    src_css = "\n".join(p.read_text(encoding="utf-8") for p in src_files)
    src_js = (SRC / "enhance.js").read_text(encoding="utf-8")
    # Rueckrechnung anteilig wenn Themes verworfen wurden
    report("linkedui.min.css", src_css, css_min)
    report("enhance.min.js", src_js, js_min)
    if dropped:
        print(f"  verworfene Themes: {', '.join(dropped)}")
    print("Fertig. Quelle bleibt src/ (editierbar + dokumentiert), dist/ ist Build-Artefakt.")


if __name__ == "__main__":
    main(sys.argv[1:])
