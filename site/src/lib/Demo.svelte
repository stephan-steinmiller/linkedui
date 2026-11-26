<script lang="ts">
  import type { DemoStrings } from '$lib/i18n';

  let { demo }: { demo: DemoStrings } = $props();
</script>

<div class="cluster">
  <button class="btn" type="button">Primary</button>
  <button class="btn" data-variant="secondary" type="button">Secondary</button>
  <button class="btn" data-variant="accent" type="button">Accent</button>
  <button class="btn" data-variant="ghost" type="button">Ghost</button>
  <button class="btn" data-variant="outline" type="button">Outline</button>
  <button class="btn" data-variant="destructive" type="button">Destructive</button>
  <button class="btn" type="button" disabled>Disabled</button>
  <button class="btn" type="button" data-loading="true">Loading</button>
  <button class="btn" type="button" data-size="sm">Small</button>
  <button class="btn" type="button" data-size="lg">Large</button>
  <button class="btn" type="button" data-icon="true" aria-label={demo.searchAria}>⌕</button>
  <span class="badge">Badge</span>
  <span class="badge" data-tone="success">Live</span>
  <span class="badge" data-tone="warning">Beta</span>
  <span class="badge" data-tone="danger">3</span>
  <span class="badge" data-tone="accent">Pro</span>
  <!-- Tooltip trigger must be focusable for keyboard users (shows on :focus-visible). -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <span data-tooltip={demo.tooltipTitle} tabindex="0">{demo.tooltipText}</span>
</div>
<div class="lui-grid">
  <article class="card"><h3>{demo.cardH}</h3><p>{demo.cardP}</p></article>
  <div class="alert" data-tone="success"><span>{demo.alertText}</span></div>
</div>
<div class="cluster">
  <input placeholder={demo.inputPh} aria-label={demo.inputAria} />
  <select aria-label={demo.selectAria}><option>{demo.opt1}</option><option>{demo.opt2}</option></select>
  <label class="check"><input type="checkbox" checked /> {demo.checkboxOn}</label>
  <label class="check"><input type="checkbox" /> {demo.checkboxOff}</label>
  <label class="check"><input type="radio" name="demo-radio" checked /> {demo.radioOn}</label>
  <label class="check"><input type="radio" name="demo-radio" /> {demo.radioOff}</label>
  <div class="stepper">
    <button type="button" class="btn" aria-label={demo.stepDec}>−</button>
    <input type="number" value="1" aria-label={demo.stepQty} />
    <button type="button" class="btn" aria-label={demo.stepInc}>+</button>
  </div>
</div>
<details><summary>{demo.accordionSum}</summary><p>{demo.accordionP}</p></details>
<div class="cluster">
  <label class="switch"><input type="checkbox" role="switch" checked /> {demo.switchOn}</label>
  <label class="switch"><input type="checkbox" role="switch" /> {demo.switchOff}</label>
  <label class="switch"><input type="checkbox" role="switch" disabled /> {demo.switchDisabled}</label>
</div>
<div class="field"><span>{demo.volumeLabel}</span><input type="range" min="0" max="100" value="60" aria-label={demo.volumeLabel} /></div>
<div class="lui-grid">
  <label class="field"
    ><span>{demo.userLabel}</span><input
      placeholder={demo.userPh}
      aria-describedby="demo-hint"
    /><small class="hint" id="demo-hint">{demo.userHint}</small></label
  >
  <label class="field" data-invalid="true"
    ><span>{demo.emailLabel}</span><input value={demo.emailVal} aria-describedby="demo-err" /><small
      class="hint"
      id="demo-err">{demo.emailHint}</small
    ></label
  >
</div>
<div class="lui-grid">
  <div class="field">
    <span>{demo.diskLabel}</span><meter value="0.8" min="0" max="1" low="0.3" high="0.75" optimum="0.9"
      >{demo.meterText}</meter
    >
  </div>
  <div class="field">
    <span>{demo.inviteLabel}</span><div class="input-group">
      <input aria-label={demo.inviteAria} placeholder={demo.invitePh} /><button class="btn" type="button"
        >{demo.joinBtn}</button
      >
    </div>
  </div>
</div>
<div class="cluster">
  <span class="chip"
    >{demo.chipFilter}<button type="button" data-lui-chip-close aria-label={demo.chipFilterAria}>×</button></span
  >
  <span class="chip"
    >{demo.chipPro}<button type="button" data-lui-chip-close aria-label={demo.chipProAria}>×</button></span
  >
</div>
<div class="table-wrap">
  <table data-stripes="true" data-hover="true">
    <caption>{demo.tableCaption}</caption>
    <thead><tr><th>{demo.planTH}</th><th data-numeric="true">{demo.mrrTH}</th></tr></thead>
    <tbody>
      <tr><td>{demo.rowStarter}</td><td data-numeric="true">{demo.rowStarterNum}</td></tr>
      <tr><td>{demo.rowPro}</td><td data-numeric="true">{demo.rowProNum}</td></tr>
    </tbody>
  </table>
</div>
<div class="cluster">
  <div class="segmented" role="group" aria-label={demo.segAria}>
    <input type="radio" name="demo-range" id="demo-r-1d" /><label for="demo-r-1d">{demo.segLabels[0]}</label>
    <input type="radio" name="demo-range" id="demo-r-7d" checked /><label for="demo-r-7d">{demo.segLabels[1]}</label>
    <input type="radio" name="demo-range" id="demo-r-1m" /><label for="demo-r-1m">{demo.segLabels[2]}</label>
    <input type="radio" name="demo-range" id="demo-r-1y" /><label for="demo-r-1y">{demo.segLabels[3]}</label>
    <input type="radio" name="demo-range" id="demo-r-all" /><label for="demo-r-all">{demo.segLabels[4]}</label>
  </div>
  <div class="segmented" data-variant="secondary" role="group" aria-label={demo.segAria}>
    <input type="radio" name="demo-range-s" id="demo-r-s-1d" /><label for="demo-r-s-1d">{demo.segLabels[0]}</label>
    <input type="radio" name="demo-range-s" id="demo-r-s-7d" checked /><label for="demo-r-s-7d">{demo.segLabels[1]}</label>
    <input type="radio" name="demo-range-s" id="demo-r-s-1m" /><label for="demo-r-s-1m">{demo.segLabels[2]}</label>
  </div>
  <div class="segmented" data-variant="accent" role="group" aria-label={demo.segAria}>
    <input type="radio" name="demo-range-a" id="demo-r-a-1d" /><label for="demo-r-a-1d">{demo.segLabels[0]}</label>
    <input type="radio" name="demo-range-a" id="demo-r-a-7d" checked /><label for="demo-r-a-7d">{demo.segLabels[1]}</label>
    <input type="radio" name="demo-range-a" id="demo-r-a-1m" /><label for="demo-r-a-1m">{demo.segLabels[2]}</label>
  </div>
</div>
<article class="card">
  <h3>{demo.verifyH}</h3>
  <p><small>{demo.verifyNote}</small></p>
  <div class="otp" role="group" aria-label={demo.otpAria}>
    <input inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" aria-label={demo.digitAria(1)} />
    <input inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" aria-label={demo.digitAria(2)} />
    <input inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" aria-label={demo.digitAria(3)} />
    <span aria-hidden="true">–</span>
    <input inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" aria-label={demo.digitAria(4)} />
    <input inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" aria-label={demo.digitAria(5)} />
    <input inputmode="numeric" pattern="[0-9]*" autocomplete="one-time-code" aria-label={demo.digitAria(6)} />
  </div>
</article>
<div class="cluster">
  <button class="btn" data-variant="secondary" type="button" data-lui-open="demo-dialog">{demo.dialogBtn}</button>
  <button
    class="btn"
    data-variant="ghost"
    type="button"
    data-lui-toast="success"
    data-lui-toast-title={demo.toastTitle}
    data-lui-toast-message={demo.toastMsg}>{demo.toastBtn}</button
  >
</div>
<div class="lui-grid">
  {#each demo.staticToasts as toast}
    <div class="toast" data-tone={toast.tone} role="status">
      <div><strong>{toast.title}</strong><p>{toast.message}</p></div>
    </div>
  {/each}
</div>
