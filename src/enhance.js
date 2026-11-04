/**
 * linkedui - enhance.js
 * =====================
 * Progressive enhancement for the linkedui CSS library (<3 KB, no build tools,
 * no dependencies). Everything works WITHOUT this script (system theme via CSS,
 * `dialog[open]`, `<details>` dropdowns/accordion, radio tabs) - with it things
 * become persistent, convenient, and more accessible.
 *
 * Modules (initialized in order):
 * 1. {@link restoreTheme} - apply the stored theme before first paint
 * 2. {@link bindThemeSwitchers} - `data-lui-theme` / `data-lui-mode` selects
  * 3. {@link bindDialogs} - `data-lui-open` / `data-lui-close` + backdrop click
  * 3b. {@link bindPopovers} - `.popover` ESC + outside-click to close
 * 4. {@link enhanceTabs} - `.tabs` as a real `tablist` (roles, roving tabindex)
 * 5. {@link enhanceOtp} - `.otp` boxes (advance, backspace, paste-split)
 * 6. {@link bindToasts} + {@link showToast} - toasts (also as `window.luiToast`)
 * 7. {@link bindCopyButtons} - `[data-lui-copy]` copies target text + toast
 * 8. {@link highlightCodeBlocks} - VBA highlighting for `.code-block` (line numbers, token colors)
 * 9. {@link bindActivationGuards} - `aria-disabled` widgets never activate
 * 10. {@link bindChipClose} - `data-lui-chip-close` removes its `.chip`
 *
 * Static DOM only (binds once at load): controls injected later are not
 * enhanced, except toasts/copy/activation-guards which use delegation.
 *
 * @example Include (deferred!) before `</body>`:
 * ```html
 * <html data-theme="default" data-mode="auto">
 * <script src="linkedui/src/enhance.js" defer></script>
 * ```
 *
 * @example Avoid FOUC - additionally, early in `<head>` (enhance.js does the same,
 * but only after parsing):
 * ```html
 * <script>
 * try {
 *   const t = localStorage.getItem("lui-theme"), m = localStorage.getItem("lui-mode");
 *   if (t) document.documentElement.dataset.theme = t;
 *   if (m) document.documentElement.dataset.mode = m;
 * } catch (e) {}
 * </script>
 * ```
 *
 * @module enhance
 */

(() => {
  // Single-init guard: a second <script> include must not double-bind.
  if (window.__luiEnhanced) return;
  window.__luiEnhanced = true;
  /** @type {HTMLElement} Root element - carries `data-theme` + `data-mode`. */
  const root = document.documentElement;
  /** @constant {string} localStorage key for the theme (`default|ocean|squishy|…`). */
  const LS_THEME = "lui-theme";
  /** @constant {string} localStorage key for the mode (`auto|light|dark`). */
  const LS_MODE = "lui-mode";

  /** Known themes/modes - anything else in storage is ignored. */
  const KNOWN_THEMES = ["default", "ocean", "squishy"];
  const KNOWN_MODES = ["auto", "light", "dark"];
  /**
   * Apply the stored theme choice early.
   * Fails silently in private mode - then `data-mode="auto"` (system) applies.
   * @returns {void}
   */
  function restoreTheme() {
    try {
      const q = new URLSearchParams(location.search);
      const t = localStorage.getItem(LS_THEME) || q.get("theme");
      const m = localStorage.getItem(LS_MODE) || q.get("mode");
      if (t && KNOWN_THEMES.includes(t)) root.dataset.theme = t;
      if (m && KNOWN_MODES.includes(m)) root.dataset.mode = m;
    } catch { /* private mode - doesn't matter, system auto applies */ }
  }

  /**
   * Bind theme/mode switchers.
   * Without JS the selects are decorative (the form submits `theme`/`mode`
   * params that nothing reads — system `auto` applies); with JS they set
   * `data-*` + localStorage without reload and keep multiple switchers
   * on the page in sync.
   *
   * @example
   * ```html
   * <select data-lui-theme>
   *   <option value="default">default</option>
   *   <option value="ocean">ocean</option>
   * </select>
   * <select data-lui-mode>
   *   <option value="auto">auto (system)</option>
   *   <option value="light">light</option>
   *   <option value="dark">dark</option>
   * </select>
   * ```
   * @returns {void}
   */
  function bindThemeSwitchers() {
    document.querySelectorAll("[data-lui-theme]").forEach((el) => {
      el.value = root.dataset.theme || "default";
      el.addEventListener("change", () => {
        root.dataset.theme = el.value;
        try { localStorage.setItem(LS_THEME, el.value); } catch {}
        document.querySelectorAll("[data-lui-theme]").forEach((o) => { if (o !== el) o.value = el.value; });
      });
    });
    document.querySelectorAll("[data-lui-mode]").forEach((el) => {
      el.value = root.dataset.mode || "auto";
      el.addEventListener("change", () => {
        root.dataset.mode = el.value;
        try { localStorage.setItem(LS_MODE, el.value); } catch {}
        document.querySelectorAll("[data-lui-mode]").forEach((o) => { if (o !== el) o.value = el.value; });
      });
    });
  }

  /**
   * Native `<dialog>` handling:
   * - `[data-lui-open="<dialog-id>"]` opens via `showModal()` (fallback: `open` attribute)
   * - `[data-lui-close]` inside a dialog closes it
   * - clicking the backdrop (`event.target === dialog`) also closes
   * - ESC closes natively (browser behavior, no code needed)
   *
   * @example
   * ```html
   * <button data-lui-open="info">Open</button>
   * <dialog id="info">
   *   <p>Hello</p>
   *   <button data-lui-close>Close</button>
   * </dialog>
   * ```
   * @returns {void}
   */
  function bindDialogs() {
    document.querySelectorAll("[data-lui-open]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dlg = document.getElementById(btn.dataset.luiOpen);
        if (!dlg) return;
        if (dlg.hasAttribute("open")) return; // already open - showModal() would throw
        try {
          if (typeof dlg.showModal === "function") dlg.showModal();
          else dlg.setAttribute("open", "");
        } catch { dlg.setAttribute("open", ""); }
      });
    });
    document.querySelectorAll("dialog [data-lui-close]").forEach((btn) => {
      btn.addEventListener("click", () => btn.closest("dialog")?.close());
    });
    document.querySelectorAll("dialog").forEach((dlg) => {
      dlg.addEventListener("click", (e) => {
        if (e.target === dlg) dlg.close();
      });
    });
  }

  /**
   * Popover niceties for `details.popover` (the toggle itself is native):
   * - ESC closes the open popover
   * - pointerdown outside closes it (native `<details>` has no light-dismiss)
   * - ArrowUp/Down/Home/End move focus between `menuitem`s (APG menu pattern)
   *
   * @example
   * ```html
   * <details class="popover" data-placement="bottom">
   *   <summary>Trigger</summary>
   *   <div role="menu"><a href="…" role="menuitem">Entry</a></div>
   * </details>
   * ```
   * @returns {void}
   */
  function bindPopovers() {
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        document.querySelectorAll("details.popover[open]").forEach((d) => d.removeAttribute("open"));
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Home" && e.key !== "End") return;
      const pop = e.target.closest?.("details.popover[open]");
      if (!pop) return;
      const items = [...pop.querySelectorAll('[role="menuitem"]')].filter((el) => !el.disabled);
      const i = items.indexOf(e.target.closest?.('[role="menuitem"]'));
      if (i < 0) return;
      e.preventDefault();
      let j = i;
      if (e.key === "ArrowDown") j = (i + 1) % items.length;
      else if (e.key === "ArrowUp") j = (i - 1 + items.length) % items.length;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = items.length - 1;
      items[j]?.focus();
    });
    document.addEventListener("pointerdown", (e) => {
      document.querySelectorAll("details.popover[open]").forEach((d) => {
        if (!d.contains(e.target)) d.removeAttribute("open");
      });
    });
  }

  /**
   * Upgrade `.tabs` groups to real tablists.
   * Without JS the native radio group remains (Tab + arrow keys work natively,
   * panels switch via the CSS `:checked` selector). With JS on top:
   * `tablist`/`tab`/`tabpanel` roles, `aria-selected` sync, roving tabindex
   * (only the active tab is reachable via Tab) plus arrow/Home/End navigation.
   * Radios leave the tab order but stay in the accessibility tree.
   *
   * Expected markup per tab: `input → label → section` as direct children of
   * `.tabs`, label linked via `for`/`id` (`CSS.escape` must exist,
   * otherwise native behavior remains).
   *
   * @example
   * ```html
   * <div class="tabs">
   *   <input type="radio" name="g" id="g1" checked />
   *   <label for="g1">Tab 1</label>
   *   <section><p>Panel 1</p></section>
   *   <input type="radio" name="g" id="g2" />
   *   <label for="g2">Tab 2</label>
   *   <section><p>Panel 2</p></section>
   * </div>
   * ```
   * @returns {void}
   */
  function enhanceTabs() {
    if (!window.CSS?.escape) return;
    /** @returns {void} Sync every enhanced group from radio state. */
    const syncAll = () => document.querySelectorAll('.tabs[data-lui-tabs]').forEach((group) => {
      group._luiSync?.();
    });
    document.querySelectorAll(".tabs").forEach((group) => {
      const items = [...group.querySelectorAll(":scope > input[type='radio']")]
        .map((radio) => ({
          radio,
          label: radio.id ? group.querySelector(`label[for="${CSS.escape(radio.id)}"]`) : null,
          panel: radio.nextElementSibling?.nextElementSibling ?? null,
        }))
        .filter((x) => x.label && x.panel && x.panel.tagName === "SECTION");
      if (!items.length) return;
      group.setAttribute("role", "tablist");
      if (group.dataset.orientation === "vertical") group.setAttribute("aria-orientation", "vertical");
      group.dataset.luiTabs = "";
      /** @returns {void} Sync `aria-selected` + tabindex from radio state. */
      const sync = () => items.forEach(({ radio, label, panel }) => {
        const on = radio.checked;
        label.setAttribute("role", "tab");
        label.setAttribute("aria-selected", String(on));
        label.setAttribute("aria-controls", panel.id);
        label.tabIndex = on ? 0 : -1;
        panel.tabIndex = on ? 0 : -1;
      });
      group._luiSync = sync;
      items.forEach(({ radio, label, panel }, i) => {
        if (!label.id) label.id = `${radio.id}-tab`;
        if (!panel.id) panel.id = `${radio.id}-panel`;
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", label.id);
        radio.tabIndex = -1;
        label.addEventListener("keydown", (e) => {
          let j = null;
          if (e.key === "ArrowRight" || e.key === "ArrowDown") j = (i + 1) % items.length;
          else if (e.key === "ArrowLeft" || e.key === "ArrowUp") j = (i - 1 + items.length) % items.length;
          else if (e.key === "Home") j = 0;
          else if (e.key === "End") j = items.length - 1;
          if (j === null) return;
          e.preventDefault();
          items[j].radio.checked = true;
          items[j].radio.dispatchEvent(new Event("change", { bubbles: true }));
          items[j].label.focus();
        });
      });
      sync();
    });
    // Document-level: two groups sharing one radio `name` stay in sync.
    document.addEventListener("change", (e) => {
      if (e.target?.closest?.(".tabs")) syncAll();
    });
  }

  /**
   * OTP groups (`.otp`): separate boxes with auto-advance on type,
   * backspace on empty deletes the previous digit and focuses it,
   * arrow/Home/End navigation and paste-split across boxes starting
   * at the focused box.
   * Overflow typed/pasted/autofilled into one box (e.g. SMS autofill dumping
   * the whole code) is distributed forward - pasting never lands on one digit.
   * Without JS: type one digit per box, Tab advances - fully usable.
   *
   * Expected markup: `.otp` wrapping plain `<input>`s (no maxlength on purpose,
   * see otp.css), optional `<span aria-hidden>` dash between groups.
   *
   * @example
   * ```html
   * <div class="otp" role="group" aria-label="One-time code, 6 digits">
   *   <input inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" aria-label="Digit 1 of 6" />
   *   <!-- … more inputs … -->
   * </div>
   * ```
   * @returns {void}
   */
  function enhanceOtp() {
    document.querySelectorAll(".otp").forEach((group) => {
      const boxes = [...group.querySelectorAll("input")];
      if (boxes.length < 2) return;
      /** @param {number} i target index @returns {void} focus clamped box */
      const go = (i) => boxes[Math.min(boxes.length - 1, Math.max(0, i))]?.focus();
      /** @param {string} v raw value @returns {string} digits only */
      const digits = (v) => (v || "").replace(/\D/g, "");
      /**
       * Fill boxes with digit chars starting at index `from`.
       * @param {string} text raw pasted/typed/autofilled text
       * @param {number} from start index
       * @returns {void}
       */
      const fill = (text, from) => {
        const chars = digits(text).split("");
        let last = from;
        chars.forEach((c, k) => {
          const j = from + k;
          if (j >= boxes.length) return;
          boxes[j].value = c;
          boxes[j].dispatchEvent(new Event("input", { bubbles: true }));
          last = j;
        });
        go(Math.min(last + 1, boxes.length - 1));
      };
      boxes.forEach((box, i) => {
        box.addEventListener("input", () => {
          const v = digits(box.value);
          if (!v) { box.value = ""; return; }
          if (v.length === 1 && box.value.length <= 1) {
            box.value = v;
            go(i + 1);
            return;
          }
          fill(v, i); // overflow (paste/autofill/IME): distribute forward
        });
        box.addEventListener("paste", (e) => {
          e.preventDefault();
          const text = e.clipboardData?.getData("text") ?? "";
          if (digits(text)) fill(text, i);
        });
        box.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" && box.value === "") {
            e.preventDefault();
            if (i === 0) return; // first box, nothing to delete
            const prev = i - 1;
            boxes[prev].value = ""; // delete previous digit so a new one can be typed right away
            go(prev);
          }
          else if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); }
          else if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); }
          else if (e.key === "Home") { e.preventDefault(); go(0); }
          else if (e.key === "End") { e.preventDefault(); go(boxes.length - 1); }
        });
      });
    });
  }

  /**
   * Show a toast notification (info | success | warning | danger).
   * Toasts stack in a `.toasts[data-placement]` tray (one tray per spot,
   * created if missing), auto-dismiss after `ms` (0 = sticky) and can be
   * closed via `[data-lui-toast-close]`.
   * Also exposed as `window.luiToast` for app code.
   *
   * Declarative demo trigger (no custom JS needed):
   * ```html
   * <button data-lui-toast="success" data-lui-toast-title="Done"
   *         data-lui-toast-message="Saved."
   *         data-lui-toast-placement="top-center">Show toast</button>
   * ```
   *
   * @param {object} [opts] options
   * @param {string} [opts.tone="info"] info | success | warning | danger
   * @param {string} [opts.title=""] bold title line
   * @param {string} [opts.message=""] message line
   * @param {number} [opts.ms=5000] auto-dismiss delay, 0 = sticky
   * @param {string} [opts.placement="bottom-right"] top-left | top-center | top-right
   *   | bottom-left | bottom-center | bottom-right
   * @returns {HTMLElement} the toast element
   */
  function showToast({ tone = "info", title = "", message = "", ms = 5000, placement = "bottom-right" } = {}) {
    // One tray per spot; a tray without the attribute counts as bottom-right
    // and is normalized so later calls find it by attribute.
    let tray = document.querySelector(`.toasts[data-placement="${placement}"]`);
    if (!tray && placement === "bottom-right") {
      tray = document.querySelector(".toasts:not([data-placement])");
      if (tray) tray.dataset.placement = "bottom-right";
    }
    if (!tray) {
      tray = document.createElement("div");
      tray.className = "toasts";
      tray.dataset.placement = placement;
      document.body.appendChild(tray);
    }
    const el = document.createElement("div");
    el.className = "toast";
    el.dataset.tone = tone;
    el.setAttribute("role", "status");
    const body = document.createElement("div");
    if (title) {
      const t = document.createElement("strong");
      t.textContent = title;
      body.appendChild(t);
    }
    if (message) {
      const p = document.createElement("p");
      p.textContent = message;
      body.appendChild(p);
    }
    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("data-lui-toast-close", "");
    close.setAttribute("aria-label", "Dismiss");
    close.textContent = "×";
    el.append(body, close);
    tray.appendChild(el);
    if (ms > 0) setTimeout(() => el.remove(), ms);
    return el;
  }

  /**
   * Toast wiring: close buttons (static + dynamic) and declarative
   * `[data-lui-toast="<tone>"]` demo triggers with optional
   * `data-lui-toast-title` / `data-lui-toast-message` /
   * `data-lui-toast-placement`.
   * @returns {void}
   */
  function bindToasts() {
    document.addEventListener("click", (e) => {
      const closer = e.target.closest?.("[data-lui-toast-close]");
      if (closer) closer.closest(".toast")?.remove();
      const trigger = e.target.closest?.("[data-lui-toast]");
      if (trigger) {
        showToast({
          tone: trigger.dataset.luiToast || "info",
          title: trigger.dataset.luiToastTitle || "",
          message: trigger.dataset.luiToastMessage || "",
          placement: trigger.dataset.luiToastPlacement || "bottom-right",
        });
      }
    });
    window.luiToast = showToast;
  }

  /**
   * Copy buttons: `[data-lui-copy="<target-id>"]` copies the text of the
   * target element (e.g. a code block) to the clipboard and confirms with
   * a success toast. Without clipboard API it selects the target instead.
   * @returns {void}
   */
  function bindCopyButtons() {
    const kopiert = root.lang === "de" ? "Kopiert" : "Copied";
    const markiert = root.lang === "de"
      ? ["Text markiert", "Mit Strg+C kopieren."]
      : ["Text selected", "Copy with Ctrl+C."];
    document.addEventListener("click", (e) => {
      const btn = e.target.closest?.("[data-lui-copy]");
      if (!btn) return;
      const target = document.getElementById(btn.dataset.luiCopy);
      if (!target) return;
      const text = target.textContent || "";
      const done = () => showToast({ tone: "success", title: kopiert, ms: 2000 });
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(done, () => fallbackSelect(target));
      } else {
        fallbackSelect(target);
      }
    });
    function fallbackSelect(target) {
      const range = document.createRange();
      range.selectNodeContents(target);
      const sel = getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
      showToast({ tone: "info", title: markiert[0], message: markiert[1], ms: 4000 });
    }
  }

  /**
   * Chip removal: `[data-lui-chip-close]` inside a `.chip` removes the chip.
   * Delegated (works for dynamically added chips); the button keeps its
   * accessible name via `aria-label`.
   * @returns {void}
   */
  function bindChipClose() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest?.("[data-lui-chip-close]");
      if (!btn) return;
      btn.closest(".chip")?.remove();
    });
  }

  /**
   * Activation guard: widgets marked `aria-disabled="true"` (e.g. loading
   * buttons, `<a class="btn">` that must not navigate) never activate via
   * mouse, touch, or keyboard. Native `disabled` needs no guard.
   * @returns {void}
   */
  function bindActivationGuards() {
    document.addEventListener("click", (e) => {
      if (e.target.closest?.('[aria-disabled="true"]')) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
    document.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.closest?.('[aria-disabled="true"]')) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }

  /**
   * Code highlighting: `.code-block pre > code` gets line spans (.ln)
   * plus VBA token spans (.tok-kw/.tok-str/.tok-com/.tok-num).
   * Language via closest [data-lang] (default "vba"). Line numbers are
   * CSS counters, never part of textContent, so copy stays clean.
   * No-JS fallback: raw text stays readable.
   * @returns {void}
   */
  const VBA_KEYWORDS = ["attribute", "dim", "as", "redim", "preserve", "const", "public", "private", "friend", "static", "sub", "function", "property", "end", "if", "then", "else", "elseif", "select", "case", "for", "each", "next", "do", "loop", "while", "wend", "with", "on", "error", "goto", "resume", "call", "set", "new", "let", "get", "option", "explicit", "compare", "exit", "stop", "debug", "print", "true", "false", "nothing", "null", "empty", "to", "step", "until", "is", "not", "and", "or", "xor", "eqv", "imp", "mod", "byval", "byref", "optional", "paramarray", "declare", "lib", "alias", "like"];
  const VBA_TOKEN_RE = new RegExp(
    '("(?:[^"]|"")*")' + "|('.*$)" + "|(\\b\\d+(?:\\.\\d+)?\\b)" +
    "|\\b(" + VBA_KEYWORDS.join("|") + ")\\b",
    "gi"
  );
  function highlightVBA(line) {
    return line.replace(VBA_TOKEN_RE, (m, str, com, num, kw) => {
      const cls = str ? "tok-str" : com ? "tok-com" : num ? "tok-num" : kw ? "tok-kw" : null;
      const t = m.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      return cls ? `<span class="${cls}">${t}</span>` : t;
    });
  }
  function highlightCodeBlocks() {
    document.querySelectorAll(".code-block pre > code:not([data-lui-hl])").forEach((code) => {
      const lang = (code.closest("[data-lang]")?.dataset.lang || "vba").toLowerCase();
      if (lang !== "vba" && lang !== "vb") return;
      const lines = code.textContent.replace(/\n$/, "").split("\n");
      code.innerHTML = lines.map((l) => `<span class="ln">${l ? highlightVBA(l) : ""}</span>`).join("");
      code.setAttribute("data-lui-hl", "vba");
    });
  }

  restoreTheme();
  bindThemeSwitchers();
  bindDialogs();
  bindPopovers();
  enhanceTabs();
  enhanceOtp();
  bindToasts();
  bindCopyButtons();
  bindActivationGuards();
  bindChipClose();
  highlightCodeBlocks();
})();
