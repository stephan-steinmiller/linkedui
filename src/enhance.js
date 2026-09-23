/**
 * linkedui — enhance.js
 * =====================
 * Progressive enhancement for the linkedui CSS library (<3 KB, no build tools,
 * no dependencies). Everything works WITHOUT this script (system theme via CSS,
 * `dialog[open]`, `<details>` dropdowns/accordion, radio tabs) — with it things
 * become persistent, convenient, and more accessible.
 *
 * Modules (initialized in order):
 * 1. {@link restoreTheme} — apply the stored theme before first paint
 * 2. {@link bindThemeSwitchers} — `data-lui-theme` / `data-lui-mode` selects
  * 3. {@link bindDialogs} — `data-lui-open` / `data-lui-close` + backdrop click
  * 3b. {@link bindPopovers} — `.popover` ESC + outside-click to close
 * 4. {@link enhanceTabs} — `.tabs` as a real `tablist` (roles, roving tabindex)
 * 5. {@link enhanceOtp} — `.otp` boxes (advance, backspace, paste-split)
 * 6. {@link bindToasts} + {@link showToast} — toasts (also as `window.luiToast`)
 *
 * @example Include (deferred!) before `</body>`:
 * ```html
 * <html data-theme="default" data-mode="auto">
 * <script src="linkedui/src/enhance.js" defer></script>
 * ```
 *
 * @example Avoid FOUC — additionally, early in `<head>` (enhance.js does the same,
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
  /** @type {HTMLElement} Root element — carries `data-theme` + `data-mode`. */
  const root = document.documentElement;
  /** @constant {string} localStorage key for the theme (`default|ocean|squishy|…`). */
  const LS_THEME = "lui-theme";
  /** @constant {string} localStorage key for the mode (`auto|light|dark`). */
  const LS_MODE = "lui-mode";

  /**
   * Apply the stored theme choice early.
   * Fails silently in private mode — then `data-mode="auto"` (system) applies.
   * @returns {void}
   */
  function restoreTheme() {
    try {
      const t = localStorage.getItem(LS_THEME);
      const m = localStorage.getItem(LS_MODE);
      if (t) root.dataset.theme = t;
      if (m) root.dataset.mode = m;
    } catch { /* private mode — doesn't matter, system auto applies */ }
  }

  /**
   * Bind theme/mode switchers.
   * Without JS these are plain `<select>`s in a form (with reload);
   * with JS they set `data-*` + localStorage without reload and keep
   * multiple switchers on the page in sync.
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
        if (dlg && typeof dlg.showModal === "function") dlg.showModal();
        else if (dlg) dlg.setAttribute("open", "");
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
      }
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
   * Radios are removed from tab order and the accessibility tree.
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
      /** @returns {void} Sync `aria-selected` + tabindex from radio state. */
      const sync = () => items.forEach(({ radio, label }) => {
        const on = radio.checked;
        label.setAttribute("role", "tab");
        label.setAttribute("aria-selected", String(on));
        label.tabIndex = on ? 0 : -1;
      });
      items.forEach(({ radio, label, panel }, i) => {
        if (!label.id) label.id = `${radio.id}-tab`;
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", label.id);
        panel.tabIndex = 0;
        radio.tabIndex = -1;
        radio.setAttribute("aria-hidden", "true");
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
      group.addEventListener("change", sync);
      sync();
    });
  }

  /**
   * OTP groups (`.otp`): separate boxes with auto-advance on type,
   * backspace on empty deletes the previous digit and focuses it,
   * arrow/Home/End navigation and paste-split across boxes starting
   * at the focused box.
   * Overflow typed/pasted/autofilled into one box (e.g. SMS autofill dumping
   * the whole code) is distributed forward — pasting never lands on one digit.
   * Without JS: type one digit per box, Tab advances — fully usable.
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
            const prev = Math.max(0, i - 1);
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
    // One tray per spot; a tray without the attribute counts as bottom-right.
    let tray = document.querySelector(`.toasts[data-placement="${placement}"]`);
    if (!tray && placement === "bottom-right") {
      tray = document.querySelector(".toasts:not([data-placement])");
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

  restoreTheme();
  bindThemeSwitchers();
  bindDialogs();
  bindPopovers();
  enhanceTabs();
  enhanceOtp();
  bindToasts();
})();
