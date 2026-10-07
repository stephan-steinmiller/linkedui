#!/usr/bin/env python3
"""split-wiki.py — split the single-page wiki into one page per component.

Reads site/wiki-src.html (EN) and site/wiki-src-de.html (DE) — the canonical
component docs — splits them at every h2/h3 section, and writes
site/wiki/<slug>.html (+ -de.html) with a shared shell: top nav, sticky
sidebar (.with-sidebar + .menu, current page marked with aria-current),
prev/next links, footer, dialogs, enhance.js.

Also rewrites site/wiki.html / site/wiki-de.html as the docs home (intro +
full component directory + redirect map for old wiki.html#anchor links) and
fills the <!--WIKI-DIR-START/END--> block in site/index.html / site/index-de.html
with the same directory.

Usage:  python3 site/split-wiki.py   (run from the repo root)
No dependencies, stdlib only. Repeatable: edit the -src files (or the chrome
in this script), re-run, done. Never hand-edit site/wiki/* bodies — they are
regenerated. The index directory block is replaced between its markers.
NOTE: links inside bodies must be written relative to site/wiki/ (e.g.
../index.html), since that is where the pages end up.
"""

import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
WIKI = SITE / "wiki"
CSS_V = "79"  # bump when src/* changes
SITE_CSS_V = "2"  # bump when site/site.css changes
ENHANCE_V = "12"
DIR_START = "<!--WIKI-DIR-START-->"
DIR_END = "<!--WIKI-DIR-END-->"

import html
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
WIKI = SITE / "wiki"
CSS_V = "79"  # bump when src/* changes
SITE_CSS_V = "2"  # bump when site/site.css changes
ENHANCE_V = "12"

FOUC = """  <script>
    try {
      const t = localStorage.getItem("lui-theme"), m = localStorage.getItem("lui-mode");
      if (t) document.documentElement.dataset.theme = t;
      if (m) document.documentElement.dataset.mode = m;
    } catch (e) {}
  </script>"""

THEME_OPTIONS = """        <option value="default">default</option>
        <option value="ocean">ocean</option>
        <option value="squishy">squishy + squircle</option>"""

LANG = {
    "en": {
        "src": SITE / "wiki-src.html",
        "home": SITE / "wiki.html",
        "sfx": ".html",
        "lang": "en",
        "skip": "Skip to content",
        "nav_label": "Main navigation",
        "builder": "Builder",
        "wiki": "Wiki",
        "other": ("./{slug}-de.html", "Deutsch", "de"),
        "theme": "Theme",
        "mode": "Mode",
        "mode_auto": "auto (system)",
        "mode_light": "light",
        "mode_dark": "dark",
        "side_label": "Documentation",
        "home_title": "linkedui Wiki",
        "home_intro": ("CSS-first UI library: classless base, variants via classes, "
                       "theming via variables. Every component below has its own page "
                       "with live demos — this site uses only the library itself. "
                       "Full text: <code>WIKI.md</code> in the repo."),
        "home_desc": "linkedui docs: every component on its own page, with live demos.",
        "prev": "←",
        "next": "→",
        "footer_builder": "../index.html",
        "footer_note": "Full text: <code>WIKI.md</code>",
        "dir_lead": "One page per component — pick a topic in the sidebar.",
    },
    "de": {
        "src": SITE / "wiki-src-de.html",
        "home": SITE / "wiki-de.html",
        "sfx": "-de.html",
        "lang": "de",
        "skip": "Zum Inhalt springen",
        "nav_label": "Hauptnavigation",
        "builder": "Builder",
        "wiki": "Wiki",
        "other": ("./{slug}.html", "English", "en"),
        "theme": "Theme",
        "mode": "Modus",
        "mode_auto": "auto (System)",
        "mode_light": "hell",
        "mode_dark": "dunkel",
        "side_label": "Dokumentation",
        "home_title": "linkedui Wiki",
        "home_intro": ("CSS-first-UI-Bibliothek: classless Basis, Varianten via Klassen, "
                       "Theming via Variablen. Jede Komponente unten hat eine eigene Seite "
                       "mit Live-Demos — diese Site nutzt nur die Bibliothek selbst. "
                       "Volltext: <code>WIKI.md</code> im Repo (Englisch)."),
        "home_desc": "linkedui-Doku: jede Komponente auf eigener Seite, mit Live-Demos.",
        "prev": "←",
        "next": "→",
        "footer_builder": "../index-de.html",
        "footer_note": "Volltext: <code>WIKI.md</code> (Englisch)",
        "dir_lead": "Eine Seite pro Komponente — Thema in der Sidebar wählen.",
    },
}

HEADING_RE = re.compile(r'^    <h([23]) id="([^"]+)">(.*)$')
FOOTER_RE = re.compile(r'    <footer class="footer">.*?</footer>\n?', re.DOTALL)
NUM_RE = re.compile(r"^\d+\.\s+")
SMALL_RE = re.compile(r"\s*<small>(.*)</small>\s*$", re.DOTALL)


def split_source(path):
    """Return (dialogs_html, groups). groups = [(h2_id, label, pages)] where
    pages = [(slug, title, subtitle_or_None, body_html)]."""
    text = path.read_text()
    assert '<div class="with-sidebar">' not in text, \
        f"{path.name} is a generated file, not a source — edit wiki-src*.html instead"
    main = text.split("  </main>")[0]
    dialogs = text.split("  </main>")[1]
    dialogs = dialogs.split("<script src=")[0].strip() + "\n"
    lines = main.split("\n")
    # collect heading line indexes
    heads = []
    for i, line in enumerate(lines):
        m = HEADING_RE.match(line)
        if m:
            # strip the closing </h2>/</h3> — group(3) runs to end of line
            inner = re.sub(r"\s*</h[23]>\s*$", "", m.group(3))
            heads.append((i, m.group(1), m.group(2), inner))
    groups = []
    cur = None
    for idx, (i, level, hid, inner) in enumerate(heads):
        end = heads[idx + 1][0] if idx + 1 < len(heads) else len(lines)
        body = "\n".join(lines[i + 1:end])
        if level == "2":
            label = SMALL_RE.sub("", inner)
            label = NUM_RE.sub("", label).strip()
            # drop "(excerpt)"-style parentheticals from group labels
            label = re.sub(r"\s*\(.*?\)\s*$", "", label).strip()
            cur = {"id": hid, "label": label, "pages": [], "_h3": []}
            groups.append(cur)
        else:
            m = SMALL_RE.search(inner)
            subtitle = m.group(1).strip() if m else None
            title_main = SMALL_RE.sub("", inner).strip()
            cur["_h3"].append({"slug": hid, "title": title_main,
                               "subtitle": subtitle, "body": body,
                               "heading": inner.strip()})
    # finalize: h2 with h3 children = group shell only; h2 without = single page
    pages_flat = []
    for g in groups:
        if g["_h3"]:
            if len(g["_h3"]) == 1:
                p = g["_h3"][0]
                p["title"] = g["label"]  # "Variants" alone says nothing
                p["slug"] = g["id"]  # buttons.html, not btn.html
                p["keep_heading"] = True  # re-emit h3 as h2, keeps context
            else:
                for p in g["_h3"]:
                    p["keep_heading"] = False  # h1 already names the section
            g["pages"] = g["_h3"]
        else:
            # h2-only section: body runs to next h2 / footer
            i = next(i for (i, lv, hd, _) in
                     [(i, lv, hd, inn) for (i, lv, hd, inn) in heads]
                     if lv == "2" and hd == g["id"])
            nxt = next((i2 for (i2, lv, _, _) in heads
                        if lv == "2" and i2 > i), len(lines))
            body = "\n".join(lines[i + 1:nxt])
            body = FOOTER_RE.sub("", body).strip() + "\n"
            g["pages"] = [{"slug": g["id"], "title": g["label"],
                           "subtitle": None, "body": body,
                           "keep_heading": False}]
        pages_flat.extend(g["pages"])
    return dialogs, groups, pages_flat


def wrap_tables(body):
    """Wrap bare <table> blocks in .table-wrap (scroll frame) so wide
    tables scroll internally instead of blowing out the page. Tables
    already inside a .table-wrap (table.html source) are left alone."""
    lines = body.split("\n")
    out = []
    i = 0
    while i < len(lines):
        m = re.match(r"^(\s*)<table[ >]", lines[i])
        prev = out[-1] if out else ""
        if m and "table-wrap" not in prev:
            ind = m.group(1)
            out.append(f"{ind}<div class=\"table-wrap\">")
            while i < len(lines):
                out.append(lines[i])
                if "</table>" in lines[i]:
                    break
                i += 1
            out.append(f"{ind}</div>")
        else:
            out.append(lines[i])
        i += 1
    return "\n".join(out)


def sidebar(groups, lang, current, prefix="./"):
    L = LANG[lang]
    out = [f'          <nav class="menu" aria-label="{L["side_label"]}">']
    for g in groups:
        out.append(f'            <span>{g["label"]}</span>')
        for p in g["pages"]:
            cur = ' aria-current="page"' if p["slug"] == current else ""
            out.append(f'            <a href="{prefix}{p["slug"]}{L["sfx"]}"{cur}>'
                       f'{p["title"]}</a>')
    out.append("          </nav>")
    return "\n".join(out)


def page_shell(lang, groups, pages_flat, slug, title, subtitle, body,
               extra_head="", home=False):
    L = LANG[lang]
    asset = ".." if home else "../.."  # homes live in site/, pages in site/wiki/
    other_lang = "de" if lang == "en" else "en"
    if slug == "__home__":
        other_href = "./wiki" + LANG[other_lang]["sfx"]
    else:
        other_href = L["other"][0].format(slug=slug)
    slugs = [p["slug"] for p in pages_flat]
    nav_links = []
    if slug in slugs:
        idx = slugs.index(slug)
        if idx > 0:
            q = pages_flat[idx - 1]
            nav_links.append(
                f'            <a class="btn" data-variant="ghost" href="./{q["slug"]}{L["sfx"]}">'
                f'{L["prev"]} {q["title"]}</a>')
        if idx + 1 < len(pages_flat):
            q = pages_flat[idx + 1]
            nav_links.append(
                f'            <a class="btn" data-variant="ghost" href="./{q["slug"]}{L["sfx"]}">'
                f'{q["title"]} {L["next"]}</a>')
    prev_next = "\n".join(nav_links)
    if prev_next:
        prev_next = ("          <hr />\n"
                     "          <div class=\"cluster\">\n"
                     f"{prev_next}\n"
                     "          </div>\n")
    sub = f"\n          <p><small>{subtitle}</small></p>" if subtitle else ""
    return f"""<!doctype html>
<html lang="{L["lang"]}" data-theme="default" data-mode="auto">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{html.escape(title)}{"" if home else " — linkedui Wiki"}</title>
  <meta name="description" content="{L["home_desc"]}" />
  <link rel="stylesheet" href="{asset}/src/linkedui.css?v={CSS_V}" />
{FOUC}
{extra_head}</head>
<body>
  <a href="#main">{L["skip"]}</a>
  <nav class="nav" aria-label="{L["nav_label"]}">
    <strong>linkedui</strong>
    <a href="{L["footer_builder"]}">{L["builder"]}</a>
    <a href="../wiki{L["sfx"]}" aria-current="page">{L["wiki"]}</a>
    <a href="{other_href}" hreflang="{L["other"][2]}">{L["other"][1]}</a>
    <span style="flex:1"></span>
    <label class="visually-hidden" for="wiki-theme">{L["theme"]}</label>
    <select id="wiki-theme" data-lui-theme>
{THEME_OPTIONS}
    </select>
    <label class="visually-hidden" for="wiki-mode">{L["mode"]}</label>
    <select id="wiki-mode" data-lui-mode>
      <option value="auto">{L["mode_auto"]}</option>
      <option value="light">{L["mode_light"]}</option>
      <option value="dark">{L["mode_dark"]}</option>
    </select>
  </nav>

  <div class="lui-container">
    <div class="with-sidebar">
      <aside>
{sidebar(groups, lang, slug, "./wiki/" if home else "./")}
      </aside>
      <main id="main">
        <div class="stack">
          <div>
            <h1>{title}</h1>{sub}
          </div>
{body}{prev_next}        </div>
      </main>
    </div>

    <footer class="footer"><div>
      <span>linkedui</span><span style="flex:1"></span><span><a href="{L["footer_builder"]}">{L["builder"]}</a></span><span>{L["footer_note"]}</span>
    </div></footer>
  </div>

{{DIALOGS}}
  <script src="{asset}/src/enhance.js?v={ENHANCE_V}" defer></script>
</body>
</html>
"""


def directory(groups, lang, prefix):
    """Component directory: one card per group with page links. prefix is the
    href prefix to the wiki pages (./wiki/ from index, ./ from wiki home)."""
    L = LANG[lang]
    out = [f'      <div class="lui-grid">']
    for g in groups:
        out.append("        <article class=\"card\">")
        out.append(f"          <h3>{g['label']}</h3>")
        out.append("          <ul>")
        for p in g["pages"]:
            out.append(f'            <li><a href="{prefix}{p["slug"]}{L["sfx"]}">'
                       f'{p["title"]}</a></li>')
        out.append("          </ul>")
        out.append("        </article>")
    out.append("      </div>")
    return "\n".join(out)


def main():
    WIKI.mkdir(exist_ok=True)
    data = {}
    for lang in ("en", "de"):
        L = LANG[lang]
        dialogs, groups, flat = split_source(L["src"])
        data[lang] = (dialogs, groups, flat)
        n_h3 = sum(len(g["pages"]) for g in groups)
        print(f"{lang}: {len(groups)} groups, {len(flat)} pages")
        assert len(groups) == 12, f"{lang}: expected 12 groups"
        assert len(flat) == 53, f"{lang}: expected 53 pages, got {len(flat)}"
        # per-component pages
        for p in flat:
            if p.get("keep_heading"):
                # single-section group (e.g. Buttons): re-emit the original
                # h3 as an h2 — the h1 already carries the group title.
                body = (f'          <h2 id="{p["slug"]}">{p["heading"]}</h2>\n'
                        + p["body"])
                subtitle = None
            else:
                body = p["body"]
                subtitle = p["subtitle"]
            shell = page_shell(lang, groups, flat, p["slug"], p["title"],
                               subtitle, wrap_tables(body))
            shell = shell.replace("{DIALOGS}", dialogs.rstrip("\n"))
            (WIKI / f'{p["slug"]}{L["sfx"]}').write_text(shell)
    # cross-check EN/DE page order matches (same slugs, same order)
    en_slugs = [p["slug"] for p in data["en"][2]]
    de_slugs = [p["slug"] for p in data["de"][2]]
    assert en_slugs == de_slugs, "EN/DE page order diverged"
    # docs home: sidebar + intro + directory + old-anchor redirect map
    for lang in ("en", "de"):
        L = LANG[lang]
        dialogs, groups, flat = data[lang]
        redir = ", ".join(f'"{p["slug"]}": "{p["slug"]}{L["sfx"]}"'
                          for p in flat)
        extra = (f'  <script>\n    // Old wiki.html#anchor links → per-component pages.\n'
                 f'    (function () {{\n      var map = {{{redir}}};\n'
                 f'      var h = location.hash.slice(1);\n'
                 f'      if (map[h]) location.replace("./wiki/" + map[h] + "#" + h);\n'
                 f'    }})();\n  </script>\n')
        body = (f'          <div>\n            <p>{L["home_intro"]}</p>\n'
                f'            <p><small>{L["dir_lead"]}</small></p>\n'
                f'          </div>\n{directory(groups, lang, "./wiki/")}\n')
        shell = page_shell(lang, groups, flat, "__home__", L["home_title"],
                           None, body, extra_head=extra, home=True)
        shell = shell.replace("{DIALOGS}", dialogs.rstrip("\n"))
        # fix nav/footer paths (home lives one level up from pages)
        shell = shell.replace("../wiki" + L["sfx"], "./wiki" + L["sfx"])
        shell = shell.replace('href="../index', 'href="./index')
        L["home"].write_text(shell)
        print(f"{lang}: home rewritten ({L['home'].name})")
    # index directory markers (idempotent block replace)
    for lang, index in (("en", SITE / "index.html"), ("de", SITE / "index-de.html")):
        _, groups, _ = data[lang]
        text = index.read_text()
        assert DIR_START in text and DIR_END in text, \
            f"markers missing in {index.name}"
        start = text.index(DIR_START) + len(DIR_START)
        end = text.index(DIR_END)
        text = (text[:start] + "\n" + directory(groups, lang, "./wiki/")
                + "\n      " + text[end:])
        index.write_text(text)
        print(f"{lang}: directory inserted into {index.name}")


if __name__ == "__main__":
    sys.exit(main())
