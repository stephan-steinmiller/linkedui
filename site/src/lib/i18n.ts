/**
 * linkedui site — UI strings for the builder pages (EN + DE).
 * Wiki page content lives in wiki-src.html / wiki-src-de.html;
 * the wiki directory on the builder pages renders from that data.
 */

export type SiteLang = 'en' | 'de';

export interface DemoStrings {
  searchAria: string;
  tooltipTitle: string;
  tooltipText: string;
  cardH: string;
  cardP: string;
  alertText: string;
  inputPh: string;
  inputAria: string;
  selectAria: string;
  opt1: string;
  opt2: string;
  checkboxOn: string;
  checkboxOff: string;
  radioOn: string;
  radioOff: string;
  stepDec: string;
  stepInc: string;
  stepQty: string;
  accordionSum: string;
  accordionP: string;
  switchOn: string;
  switchOff: string;
  switchDisabled: string;
  volumeLabel: string;
  userLabel: string;
  userPh: string;
  userHint: string;
  emailLabel: string;
  emailVal: string;
  emailHint: string;
  diskLabel: string;
  inviteLabel: string;
  invitePh: string;
  inviteAria: string;
  joinBtn: string;
  chipFilter: string;
  chipFilterAria: string;
  chipPro: string;
  chipProAria: string;
  tableCaption: string;
  planTH: string;
  mrrTH: string;
  rowStarter: string;
  rowPro: string;
  rowStarterNum: string;
  rowProNum: string;
  meterText: string;
  segLabels: string[];
  segAria: string;
  otpNote: string;
  otpAria: string;
  digitAria: (i: number) => string;
  dialogBtn: string;
  toastBtn: string;
  toastTitle: string;
  toastMsg: string;
  verifyH: string;
  verifyNote: string;
  staticToasts: { tone: string; title: string; message: string }[];
}

export interface SiteStrings {
  lang: SiteLang;
  otherBuilderHref: string;
  otherBuilderLabel: string;
  otherBuilderLang: string;
  skip: string;
  navAria: string;
  builderLink: string;
  componentsLink: string;
  componentsHref: string;
  wikiHref: string;
  themeLabel: string;
  modeLabel: string;
  modeAuto: string;
  modeLight: string;
  modeDark: string;
  heroTitle: string;
  heroP1: string;
  heroP2: string;
  badges: string[];
  builderAria: string;
  builderH2: string;
  noscriptNote: string;
  nameLabel: string;
  defaultName: string;
  primaryLabel: string;
  secondaryLabel: string;
  accentLabel: string;
  bgLabel: string;
  warnText: (bad: string[]) => string;
  contrastLabel: string;
  contrastAria: string;
  radiusLabel: string;
  radiusAria: string;
  densYLabel: string;
  densYAria: string;
  densXLabel: string;
  densXAria: string;
  shapeLabel: string;
  shapeRounded: string;
  shapeSharp: string;
  shapePill: string;
  shapeSquircle: string;
  curveLabel: string;
  curveAria: string;
  livePageLabel: string;
  resetBtn: string;
  previewAria: string;
  exportH: string;
  copyBtn: string;
  downloadBtn: string;
  shareBtn: string;
  exportNote: string;
  dirAria: string;
  dirId: string;
  dirH: string;
  dirP: string;
  footerNote: string;
  dialogTitle: string;
  dialogText: string;
  dialogClose: string;
  drawerTitle: string;
  drawerText: string;
  drawerClose: string;
  demo: DemoStrings;
}

const demoEn: DemoStrings = {
  searchAria: 'Search',
  tooltipTitle: 'Pure CSS',
  tooltipText: 'Hover or focus me for tooltip',
  cardH: 'Card',
  cardP: 'Consistent heights, radius + density come from the theme.',
  alertText: 'Settings saved successfully.',
  inputPh: 'Input (same height as button)',
  inputAria: 'Demo input',
  selectAria: 'Demo select',
  opt1: 'Select',
  opt2: 'Second option',
  checkboxOn: 'Checkbox on',
  checkboxOff: 'Checkbox off',
  radioOn: 'Radio on',
  radioOff: 'Radio off',
  stepDec: 'Decrease',
  stepInc: 'Increase',
  stepQty: 'Quantity',
  accordionSum: 'Accordion (no JS)',
  accordionP: 'Content via details/summary.',
  switchOn: 'On',
  switchOff: 'Off',
  switchDisabled: 'Disabled',
  volumeLabel: 'Volume',
  userLabel: 'Username',
  userPh: 'ada_lovelace',
  userHint: 'Lowercase letters, numbers and _ only.',
  emailLabel: 'Email',
  emailVal: 'not-an-email',
  emailHint: 'Enter a valid email address.',
  diskLabel: 'Disk usage',
  inviteLabel: 'Invite',
  invitePh: 'you@example.com',
  inviteAria: 'Email address',
  joinBtn: 'Join',
  chipFilter: 'Filter',
  chipFilterAria: 'Remove filter',
  chipPro: 'Pro',
  chipProAria: 'Remove pro',
  tableCaption: 'Preview data follows the theme',
  planTH: 'Plan',
  mrrTH: 'MRR',
  rowStarter: 'Starter',
  rowPro: 'Pro',
  rowStarterNum: '4,120',
  rowProNum: '12,400',
  meterText: '80%',
  segLabels: ['1D', '7D', '1M', '1Y', 'All'],
  segAria: 'Time range',
  otpNote: "We've sent a code to a*****@gmail.com — pasting fills all boxes at once.",
  otpAria: 'One-time code, 6 digits',
  digitAria: (i: number) => `Digit ${i} of 6`,
  dialogBtn: 'Open dialog (JS enhanced)',
  toastBtn: 'Toast it',
  toastTitle: 'Changes saved',
  toastMsg: 'Your profile has been updated.',
  verifyH: 'Verify account',
  verifyNote: "We've sent a code to a*****@gmail.com — pasting fills all boxes at once.",
  staticToasts: [
    { tone: 'info', title: 'Update available', message: 'Version 2.4.1 is ready.' },
    { tone: 'success', title: 'Changes saved', message: 'Profile updated successfully.' },
    { tone: 'warning', title: 'Storage almost full', message: '90% of your storage used.' },
    { tone: 'danger', title: 'Build failed', message: '3 tests did not pass.' }
  ]
};

const demoDe: DemoStrings = {
  searchAria: 'Suchen',
  tooltipTitle: 'Rein CSS',
  tooltipText: 'Tooltip per Hover oder Fokus',
  cardH: 'Card',
  cardP: 'Konsistente Höhen, Radius + Density kommen aus dem Theme.',
  alertText: 'Einstellungen erfolgreich gespeichert.',
  inputPh: 'Input (gleiche Höhe wie Button)',
  inputAria: 'Demo-Input',
  selectAria: 'Demo-Select',
  opt1: 'Select',
  opt2: 'Zweite Option',
  checkboxOn: 'Checkbox an',
  checkboxOff: 'Checkbox aus',
  radioOn: 'Radio an',
  radioOff: 'Radio aus',
  stepDec: 'Verringern',
  stepInc: 'Erhöhen',
  stepQty: 'Menge',
  accordionSum: 'Accordion (ohne JS)',
  accordionP: 'Inhalt via details/summary.',
  switchOn: 'An',
  switchOff: 'Aus',
  switchDisabled: 'Deaktiviert',
  volumeLabel: 'Lautstärke',
  userLabel: 'Benutzername',
  userPh: 'ada_lovelace',
  userHint: 'Nur Kleinbuchstaben, Zahlen und _.',
  emailLabel: 'E-Mail',
  emailVal: 'keine-email',
  emailHint: 'Gültige E-Mail-Adresse eingeben.',
  diskLabel: 'Speicher',
  inviteLabel: 'Einladen',
  invitePh: 'du@beispiel.de',
  inviteAria: 'E-Mail-Adresse',
  joinBtn: 'Join',
  chipFilter: 'Filter',
  chipFilterAria: 'Filter entfernen',
  chipPro: 'Pro',
  chipProAria: 'Pro entfernen',
  tableCaption: 'Vorschau-Daten folgen dem Theme',
  planTH: 'Plan',
  mrrTH: 'MRR',
  rowStarter: 'Starter',
  rowPro: 'Pro',
  rowStarterNum: '4.120',
  rowProNum: '12.400',
  meterText: '80 %',
  segLabels: ['1T', '7T', '1M', '1J', 'Alle'],
  segAria: 'Zeitraum',
  otpNote: "We've sent a code to a*****@gmail.com — Einfügen füllt alle Felder auf einmal.",
  otpAria: 'Einmal-Code, 6 Ziffern',
  digitAria: (i: number) => `Ziffer ${i} von 6`,
  dialogBtn: 'Dialog öffnen (mit JS enhanced)',
  toastBtn: 'Toast zeigen',
  toastTitle: 'Gespeichert',
  toastMsg: 'Profil wurde aktualisiert.',
  verifyH: 'Verify account',
  verifyNote: "We've sent a code to a*****@gmail.com — Einfügen füllt alle Felder auf einmal.",
  staticToasts: [
    { tone: 'info', title: 'Update verfügbar', message: 'Version 2.4.1 ist da.' },
    { tone: 'success', title: 'Gespeichert', message: 'Profil erfolgreich aktualisiert.' },
    { tone: 'warning', title: 'Speicher fast voll', message: '90 % deines Speichers belegt.' },
    { tone: 'danger', title: 'Build fehlgeschlagen', message: '3 Tests sind durchgefallen.' }
  ]
};

export const STRINGS: Record<SiteLang, SiteStrings> = {
  en: {
    lang: 'en',
    otherBuilderHref: '/de',
    otherBuilderLabel: 'Deutsch',
    otherBuilderLang: 'de',
    skip: 'Skip to content',
    navAria: 'Main navigation',
    builderLink: 'Builder',
    componentsLink: 'Components',
    componentsHref: '#components',
    wikiHref: '/wiki',
    themeLabel: 'Theme',
    modeLabel: 'Mode',
    modeAuto: 'auto (system)',
    modeLight: 'light',
    modeDark: 'dark',
    heroTitle: 'linkedui — CSS-first, classless base, themes via variables',
    heroP1: 'Without JS: system theme (light/dark), all content, details accordion/dropdown and dialog[open] work.',
    heroP2: 'With JS: persistent theme switch, modal helper, live builder with copy/download.',
    badges: ['OKLCH + color-mix', 'one themes.css', 'data-theme + data-mode', 'vanilla, no build'],
    builderAria: 'Theme builder',
    builderH2: 'Theme Builder (dogfoods the lib)',
    noscriptNote: 'without JS you see defaults + the export snippet for manual copying. With JS everything goes live.',
    nameLabel: 'Name',
    defaultName: 'my-theme',
    primaryLabel: 'Primary',
    secondaryLabel: 'Secondary',
    accentLabel: 'Accent',
    bgLabel: 'Background',
    warnText: (bad: string[]) =>
      `Contrast below 4.5: ${bad.join(', ')} — darken the color or pick a darker shade.`,
    contrastLabel: 'Contrast (separation):',
    contrastAria: 'Exact contrast in percent',
    radiusLabel: 'Radius (boxes):',
    radiusAria: 'Exact radius in pixels',
    densYLabel: 'Padding/density vertical:',
    densYAria: 'Exact vertical density',
    densXLabel: 'Padding/density horizontal:',
    densXAria: 'Exact horizontal density',
    shapeLabel: 'Shape',
    shapeRounded: 'rounded',
    shapeSharp: 'sharp',
    shapePill: 'pill',
    shapeSquircle: 'squircle (superellipse)',
    curveLabel: 'Squircle curve:',
    curveAria: 'Exact squircle curve',
    livePageLabel: 'Apply live to the whole page',
    resetBtn: 'Reset',
    previewAria: 'Live preview',
    exportH: 'Export',
    copyBtn: 'Copy',
    downloadBtn: 'Download themes.css',
    shareBtn: 'Copy link',
    exportNote:
      'Paste into <code>src/themes.css</code> → use via <code>&lt;html data-theme="my-theme" data-mode="auto"&gt;</code>. The builder generates the dark variant too (see full export after download).',
    dirAria: 'Component directory',
    dirId: 'components',
    dirH: 'Components',
    dirP: 'One page per component in the <a href="/wiki">wiki</a> — every demo live. This page keeps the builder; the wiki keeps the reference.',
    footerNote: '<code>src/linkedui.css</code> + <code>src/enhance.js</code> · Local: <code>npm run dev</code> / <code>npm run preview</code> in <code>site/</code>.',
    dialogTitle: 'Dialog',
    dialogText: 'Native with ::backdrop, closes via ESC + backdrop click (JS enhanced, usable without JS via the open attribute).',
    dialogClose: 'Close',
    drawerTitle: 'Drawer',
    drawerText: 'Side sheet via &lt;dialog&gt; — same plumbing as modal (data-lui-open, ESC, backdrop). data-side: left | right | bottom.',
    drawerClose: 'Close',
    demo: demoEn
  },
  de: {
    lang: 'de',
    otherBuilderHref: '/',
    otherBuilderLabel: 'English',
    otherBuilderLang: 'en',
    skip: 'Zum Inhalt springen',
    navAria: 'Hauptnavigation',
    builderLink: 'Builder',
    componentsLink: 'Komponenten',
    componentsHref: '#komponenten',
    wikiHref: '/wiki-de',
    themeLabel: 'Theme',
    modeLabel: 'Modus',
    modeAuto: 'auto (System)',
    modeLight: 'hell',
    modeDark: 'dunkel',
    heroTitle: 'linkedui — CSS-first, classless Basis, Themes via Variablen',
    heroP1: 'Ohne JS: System-Theme (hell/dunkel), alle Inhalte, details-Accordion/Dropdown und dialog[open] funktionieren.',
    heroP2: 'Mit JS: persistenter Theme-Switch, Modal-Helper, Live-Builder mit Copy/Download.',
    badges: ['OKLCH + color-mix', 'eine themes.css', 'data-theme + data-mode', 'Vanilla, kein Build'],
    builderAria: 'Theme Builder',
    builderH2: 'Theme Builder (dogfoodet die Lib)',
    noscriptNote: 'Ohne JS siehst du hier Defaults + Export-Snippet zum manuellen Kopieren. Mit JS wird alles live.',
    nameLabel: 'Name',
    defaultName: 'mein-theme',
    primaryLabel: 'Primary',
    secondaryLabel: 'Secondary',
    accentLabel: 'Akzent',
    bgLabel: 'Hintergrund',
    warnText: (bad: string[]) =>
      `Kontrast unter 4,5: ${bad.join(', ')} — Farbe abdunkeln oder dunkleren Ton wählen.`,
    contrastLabel: 'Kontrast (Abhebung):',
    contrastAria: 'Kontrast exakt in Prozent',
    radiusLabel: 'Radius (Boxen):',
    radiusAria: 'Radius exakt in Pixel',
    densYLabel: 'Padding/Dichte vertikal:',
    densYAria: 'Vertikale Dichte exakt',
    densXLabel: 'Padding/Dichte horizontal:',
    densXAria: 'Horizontale Dichte exakt',
    shapeLabel: 'Shape',
    shapeRounded: 'rounded',
    shapeSharp: 'sharp',
    shapePill: 'pill',
    shapeSquircle: 'squircle (superellipse)',
    curveLabel: 'Squircle-Kurve:',
    curveAria: 'Squircle-Kurve exakt',
    livePageLabel: 'Live auf ganze Seite anwenden',
    resetBtn: 'Zurücksetzen',
    previewAria: 'Live-Vorschau',
    exportH: 'Export',
    copyBtn: 'Kopieren',
    downloadBtn: 'themes.css herunterladen',
    shareBtn: 'Link kopieren',
    exportNote:
      'In <code>src/themes.css</code> einfügen → per <code>&lt;html data-theme="mein-theme" data-mode="auto"&gt;</code> nutzbar. Dark-Variante generiert der Builder mit (siehe Voll-Export nach Download).',
    dirAria: 'Komponenten-Verzeichnis',
    dirId: 'komponenten',
    dirH: 'Komponenten',
    dirP: 'Eine Seite pro Komponente im <a href="/wiki-de">Wiki</a> — alle Demos live. Diese Seite behält den Builder; das Wiki behält die Referenz.',
    footerNote: '<code>src/linkedui.css</code> + <code>src/enhance.js</code> · Lokal: <code>npm run dev</code> / <code>npm run preview</code> in <code>site/</code>.',
    dialogTitle: 'Dialog',
    dialogText: 'Nativ mit <code>::backdrop</code>, ESC + Backdrop-Klick schließen (JS enhanced, ohne JS via <code>open</code>-Attribut nutzbar).',
    dialogClose: 'Schließen',
    drawerTitle: 'Drawer',
    drawerText: 'Side-Sheet via <code>&lt;dialog&gt;</code> — gleiche Mechanik wie Modal (<code>data-lui-open</code>, ESC, Backdrop). <code>data-side</code>: left | right | bottom.',
    drawerClose: 'Schließen',
    demo: demoDe
  }
};
