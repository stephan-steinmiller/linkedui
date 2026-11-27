/**
 * linkedui - enhance.js
 * =====================
 * Progressive enhancement for the linkedui CSS library (about 6 KB gzipped, no build tools,
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
 * 11. {@link bindAutogrow} - `textarea[data-lui-autogrow]` grows with content
 *     (fallback for browsers without CSS `field-sizing: content`)
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
    // Backdrop = the dialog element itself AND the click lies outside its box.
    // (`e.target === dlg` alone also matches clicks on the dialog's own padding.)
    document.querySelectorAll("dialog").forEach((dlg) => {
      dlg.addEventListener("click", (e) => {
        if (e.target !== dlg) return;
        const r = dlg.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) dlg.close();
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
        // Close every open popover; focus returns to its trigger if focus was inside.
        document.querySelectorAll("details.popover[open]").forEach((d) => {
          const hadFocus = d.contains(document.activeElement);
          d.removeAttribute("open");
          if (hadFocus) d.querySelector(":scope > summary")?.focus();
        });
        return;
      }
      // Arrow keys on the trigger open the menu and move focus into it (APG menu button).
      const trigger = e.target.closest?.("details.popover > summary");
      if (trigger && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        const d = trigger.parentElement;
        e.preventDefault();
        d.open = true;
        const entries = [...d.querySelectorAll('[role="menuitem"]')].filter((el) => !el.disabled);
        (e.key === "ArrowDown" ? entries[0] : entries[entries.length - 1])?.focus();
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
    // Danger interrupts (assertive alert); other tones are polite status updates.
    el.setAttribute("role", tone === "danger" ? "alert" : "status");
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
    if (ms > 0) {
      // Auto-dismiss, but hold while hovered or focused: reading time and keyboard users.
      let timer = null, left = ms, t0 = 0, holds = 0;
      const run = () => { if (timer || holds) return; t0 = Date.now(); timer = setTimeout(() => el.remove(), left); };
      const halt = () => { if (!timer) return; clearTimeout(timer); timer = null; left -= Date.now() - t0; };
      const hold = () => { holds++; halt(); };
      const release = () => { holds = Math.max(0, holds - 1); if (!holds) run(); };
      el.addEventListener("pointerenter", hold);
      el.addEventListener("pointerleave", release);
      el.addEventListener("focusin", hold);
      el.addEventListener("focusout", release);
      run();
    }
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
   * Autogrowing textareas (composer fields). CSS `field-sizing: content`
   * handles it where supported — this keeps older browsers in sync and
   * re-fits after programmatic value changes (event delegation, so it
   * also covers textareas injected later, e.g. streamed chat apps).
   * `<textarea data-lui-autogrow rows="1">`
   */
  function bindAutogrow() {
    const fit = (el) => {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 192) + "px";
    };
    document.addEventListener("input", (e) => {
      const el = e.target.closest?.("textarea[data-lui-autogrow]");
      if (el) fit(el);
    });
    document.querySelectorAll("textarea[data-lui-autogrow]").forEach(fit);
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
   * plus token spans (.tok-kw/.tok-str/.tok-com/.tok-num).
   * Language via closest [data-lang] (default "vba"): "html" highlights
   * tags/attrs/strings/comments, "css" properties/selectors/values,
   * "vba"/"vb" VBA keywords, anything else gets line numbers only.
   * Line numbers are CSS counters, never part of textContent, so copy
   * stays clean. No-JS fallback: raw text stays readable.
   * Dynamic blocks (theme builder export) re-run via `window.luiHighlight`.
   * @returns {void}
   */
  const VBA_KEYWORDS = ["attribute", "dim", "as", "redim", "preserve", "const", "public", "private", "friend", "static", "sub", "function", "property", "end", "if", "then", "else", "elseif", "select", "case", "for", "each", "next", "do", "loop", "while", "wend", "with", "on", "error", "goto", "resume", "call", "set", "new", "let", "get", "option", "explicit", "compare", "exit", "stop", "debug", "print", "true", "false", "nothing", "null", "empty", "to", "step", "until", "is", "not", "and", "or", "xor", "eqv", "imp", "mod", "byval", "byref", "optional", "paramarray", "declare", "lib", "alias", "like"];
  const VBA_TOKEN_RE = new RegExp(
    '("(?:[^"]|"")*")' + "|('.*$)" + "|(\\b\\d+(?:\\.\\d+)?\\b)" +
    "|\\b(" + VBA_KEYWORDS.join("|") + ")\\b",
    "gi"
  );
  /** @param {string} s raw text @returns {string} HTML-escaped */
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function highlightVBA(line) {
    return line.replace(VBA_TOKEN_RE, (m, str, com, num, kw) => {
      const cls = str ? "tok-str" : com ? "tok-com" : num ? "tok-num" : kw ? "tok-kw" : null;
      const t = esc(m);
      return cls ? `<span class="${cls}">${t}</span>` : t;
    });
  }
  /**
   * Highlight one HTML source line: comments, tags, attribute values.
   * Operates on raw text (entities decoded in textContent); output is
   * escaped. Multi-line comments are NOT tracked — a line starting
   * inside a comment highlights from its `-->` on (documented limit).
   * @param {string} line raw source line
   * @returns {string} HTML with token spans
   */
  function highlightHTMLLine(line) {
    let out = "";
    let rest = line;
    while (rest) {
      const lt = rest.indexOf("<");
      if (lt < 0) { out += esc(rest); break; }
      // Comment?
      if (rest.startsWith("<!--", lt)) {
        out += esc(rest.slice(0, lt));
        const end = rest.indexOf("-->", lt + 4);
        const com = end < 0 ? rest.slice(lt) : rest.slice(lt, end + 3);
        out += `<span class="tok-com">${esc(com)}</span>`;
        rest = end < 0 ? "" : rest.slice(end + 3);
        continue;
      }
      // Tag?
      const tag = /^<\/?[a-zA-Z!][^<>]*/.exec(rest.slice(lt));
      if (!tag) { out += esc(rest.slice(0, lt + 1)); rest = rest.slice(lt + 1); continue; }
      out += esc(rest.slice(0, lt));
      let body = tag[0];
      if (rest[lt + body.length] === ">") body += ">";
      out += highlightTag(body);
      rest = rest.slice(lt + body.length);
    }
    return out;
  }
  /**
   * Highlight one raw tag (no surrounding text).
   * @param {string} body raw tag including angle brackets
   * @returns {string} HTML with token spans
   */
  function highlightTag(body) {
    const m = /^(<\/?)([a-zA-Z!][^\s/>]*)([\s\S]*?)(\/?>)$/.exec(body);
    if (!m) return esc(body);
    const [, open, name, attrs, close] = m;
    let mid = attrs.replace(/([\w-]+)(=)("[^"]*"|'[^']*')/g,
      (_, n, eq, v) => `${esc(n)}${eq}<span class="tok-str">${esc(v)}</span>`);
    return `${esc(open)}<span class="tok-kw">${esc(name)}</span>${mid}${esc(close)}`;
  }
  /**
   * Highlight one CSS source line: selectors/at-rules, properties, strings,
   * numbers, comments. Operates on raw text; output is escaped.
   * Block comments span lines via st.comment (per-block state object).
   * Hex colors (#abc…) never highlight their digits (lookahead guard).
   * @param {string} line raw source line
   * @param {{comment: boolean}} st per-block comment state
   * @returns {string} HTML with token spans
   */
  function highlightCSSLine(line, st) {
    let out = "";
    let rest = line;
    // Continuation of a block comment from a previous line.
    if (st.comment) {
      const end = rest.indexOf("*/");
      if (end < 0) return `<span class="tok-com">${esc(rest)}</span>`;
      out += `<span class="tok-com">${esc(rest.slice(0, end + 2))}</span>`;
      rest = rest.slice(end + 2);
      st.comment = false;
    }
    while (rest) {
      const c = rest.indexOf("/*");
      out += c < 0 ? highlightCSSSeg(rest) : highlightCSSSeg(rest.slice(0, c));
      if (c < 0) break;
      const end = rest.indexOf("*/", c + 2);
      if (end < 0) {
        out += `<span class="tok-com">${esc(rest.slice(c))}</span>`;
        st.comment = true;
        break;
      }
      out += `<span class="tok-com">${esc(rest.slice(c, end + 2))}</span>`;
      rest = rest.slice(end + 2);
    }
    return out;
  }
  /**
   * Highlight one comment-free CSS segment: at-rules/selectors, properties,
   * strings, numbers. At-rules and plain selector openers are handled whole
   * (so strings inside selectors keep their tint); the rest splits on
   * strings first so neither the property split nor the number pass can
   * match inside them.
   * @param {string} seg comment-free raw segment
   * @returns {string} HTML with token spans
   */
  const CSS_STR_RE = /("[^"\n]*"|'[^'\n]*')/g;
  function highlightCSSSeg(seg) {
    // At-rule opener (@media, @supports …): tint the @word only.
    const at = /^(\s*@[-\w]+)([\s\S]*)$/.exec(seg);
    if (at) return `<span class="tok-kw">${esc(at[1])}</span>${highlightCSSRest(at[2])}`;
    // Plain selector opener (no bare colon outside strings/brackets —
    // declarations and pseudo-classes keep the default face): tint text.
    const brace = seg.indexOf("{");
    if (brace >= 0) {
      const bare = seg.slice(0, brace).replace(CSS_STR_RE, "");
      if (!/:(?![^\[\(]*[\]\)])/.test(bare)) {
        return seg.slice(0, brace).split(CSS_STR_RE).map((part, i) =>
          i % 2 === 1 ? `<span class="tok-str">${esc(part)}</span>`
          : part ? `<span class="tok-kw">${esc(part)}</span>` : ""
        ).join("") + esc(seg.slice(brace));
      }
    }
    return highlightCSSRest(seg);
  }
  /**
   * Highlight a CSS fragment without selectors: declaration properties,
   * strings, numbers with units.
   * @param {string} seg raw fragment
   * @returns {string} HTML with token spans
   */
  function highlightCSSRest(seg) {
    return seg.split(CSS_STR_RE).map((part, i) => {
      if (i % 2 === 1) return `<span class="tok-str">${esc(part)}</span>`;
      const colon = part.indexOf(":");
      if (colon >= 0 && /^\s*-{0,2}[a-zA-Z_][\w-]*\s*$/.test(part.slice(0, colon))) {
        return `<span class="tok-kw">${esc(part.slice(0, colon))}</span>:${highlightCSSNums(part.slice(colon + 1))}`;
      }
      return highlightCSSNums(part);
    }).join("");
  }
  /**
   * Tint numbers with optional units, skipping hex-color digits (#abc…).
   * @param {string} s raw fragment
   * @returns {string} HTML with token spans
   */
  function highlightCSSNums(s) {
    return s.replace(/(-?\d*\.?\d+)(%|[a-zA-Z]+)?/g, (m, _n, _u, off, full) =>
      off > 0 && full[off - 1] === "#" ? esc(m) : `<span class="tok-num">${esc(m)}</span>`);
  }
  function highlightCodeBlocks() {
    document.querySelectorAll(".code-block pre > code:not([data-lui-hl])").forEach((code) => {
      const lang = (code.closest("[data-lang]")?.dataset.lang || "vba").toLowerCase();
      if (lang === "css") {
        // Stateful (block comments span lines): track open comments per block.
        const st = { comment: false };
        const lines = code.textContent.replace(/\n$/, "").split("\n");
        code.innerHTML = lines.map((l) => `<span class="ln">${l ? highlightCSSLine(l, st) : ""}</span>`).join("");
        code.setAttribute("data-lui-hl", lang);
        return;
      }
      const highlight = lang === "html" ? highlightHTMLLine
        : (lang === "vba" || lang === "vb") ? highlightVBA : null;
      if (!highlight) {
        // Unknown language: line numbers only, copy stays clean.
        const lines = code.textContent.replace(/\n$/, "").split("\n");
        code.innerHTML = lines.map((l) => `<span class="ln">${esc(l)}</span>`).join("");
        code.setAttribute("data-lui-hl", "lines");
        return;
      }
      const lines = code.textContent.replace(/\n$/, "").split("\n");
      code.innerHTML = lines.map((l) => `<span class="ln">${l ? highlight(l) : ""}</span>`).join("");
      code.setAttribute("data-lui-hl", lang);
    });
  }
  // Re-runnable for dynamic blocks (theme builder export rewrites its text
  // on every input, wiping spans — the builder clears [data-lui-hl] first).
  window.luiHighlight = highlightCodeBlocks;

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
  bindAutogrow();
  highlightCodeBlocks();
})();
