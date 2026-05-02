import { EXERCISES, CATEGORY_ORDER } from "./exercises.js";
import { filterByCategories, pickNextExercise, clampPaceSec, normalizeSessionLimit } from "./engine.js";
import {
  STORAGE_KEY,
  DEFAULT_SETTINGS,
  parseStoredSettings,
  serializeSettings,
} from "./settings.js";
import { ensureAudioReady, playBeep } from "./audio.js";
import { speakInstruction, cancelSpeech } from "./speech.js";

/** @typedef {'idle' | 'running' | 'paused'} RunState */

/** Source repository (GitHub user + repo). */
const REPO_URL = "https://github.com/carlok/agility-trainer";

/** Public static deploy (Surge). */
const LIVE_URL = "https://efficacious-fold.surge.sh/";

const UI = {
  en: {
    setupHeading: "Session setup",
    paceLabel: "Pace per exercise:",
    paceSuffix: "s",
    paceHint: "2–15 seconds",
    sessionLegend: "Session length",
    unlimited: "Unlimited",
    sessionCountLabel: "Or number of exercises",
    categoriesLegend: "Categories",
    categoryHint: "Enable at least one category.",
    languageLabel: "Language",
    languageHint: "Instructions and labels follow this setting.",
    voiceLabel: "Speak each exercise (browser voice)",
    start: "Start",
    pause: "Pause",
    resume: "Resume",
    stop: "Stop",
    ready: "Ready",
    sessionComplete: "Session complete",
    singleExerciseWarn: "Only one exercise in the pool — repeats may occur.",
    noCategoryWarn: "Enable at least one category to start.",
    progressUnlimited: "Open session",
    howToTitle: "How to do it",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    menuAriaSite: "Site menu",
    navHome: "Home",
    navGithub: "GitHub · agility-trainer",
    navAbout: "About",
    navCredits: "Credits",
    aboutTitle: "About",
    aboutBody:
      "Agility Trainer is a solo, no-equipment workout helper: random bodyweight agility drills, optional voice cues, English or Italian. It is for general movement guidance only—not medical advice. Stop if you feel pain, dizziness, or shortness of breath.",
    aboutLive: "Live app:",
    creditsTitle: "Credits",
    creditsBody:
      "Built with HTML, CSS, and JavaScript (no app framework). Fonts: Barlow & Barlow Condensed (Google Fonts). Repository: github.com/carlok/agility-trainer — issues and contributions welcome.",
    creditsLive: "Public demo:",
    dialogClose: "Close",
  },
  it: {
    setupHeading: "Impostazioni sessione",
    paceLabel: "Ritmo per esercizio:",
    paceSuffix: "s",
    paceHint: "2–15 secondi",
    sessionLegend: "Durata sessione",
    unlimited: "Illimitata",
    sessionCountLabel: "Oppure numero di esercizi",
    categoriesLegend: "Categorie",
    categoryHint: "Attiva almeno una categoria.",
    languageLabel: "Lingua",
    languageHint: "Testi e istruzioni seguono questa impostazione.",
    voiceLabel: "Leggi ogni esercizio (voce del browser)",
    start: "Inizia",
    pause: "Pausa",
    resume: "Riprendi",
    stop: "Stop",
    ready: "Pronto",
    sessionComplete: "Sessione completata",
    singleExerciseWarn: "Un solo esercizio nel pool — possibili ripetizioni.",
    noCategoryWarn: "Attiva almeno una categoria per iniziare.",
    progressUnlimited: "Sessione libera",
    howToTitle: "Come fare",
    menuOpen: "Apri menu",
    menuClose: "Chiudi menu",
    menuAriaSite: "Menu sito",
    navHome: "Home",
    navGithub: "GitHub · agility-trainer",
    navAbout: "Informazioni",
    navCredits: "Crediti",
    aboutTitle: "Informazioni",
    aboutBody:
      "Agility Trainer ti aiuta ad allenare agilità a corpo libero, da solo: esercizi casuali, voce opzionale, italiano o inglese. È solo orientamento generale al movimento—non è consulenza medica. Interrompi in caso di dolore, vertigini o affanno.",
    aboutLive: "Versione online:",
    creditsTitle: "Crediti",
    creditsBody:
      "Realizzato con HTML, CSS e JavaScript (senza framework). Font: Barlow e Barlow Condensed (Google Fonts). Repository: github.com/carlok/agility-trainer — segnalazioni e contributi benvenuti.",
    creditsLive: "Demo pubblica:",
    dialogClose: "Chiudi",
  },
};

function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id}`);
  return el;
}

const els = {
  setupScreen: $("setup-screen"),
  workoutScreen: $("workout-screen"),
  setupHeading: $("setup-heading"),
  paceRange: $("pace-range"),
  paceValue: $("pace-value"),
  sessionUnlimited: $("session-unlimited"),
  sessionCount: $("session-count"),
  categoryToggles: $("category-toggles"),
  categoryHint: $("category-hint"),
  languageSelect: $("language-select"),
  voiceToggle: $("voice-toggle"),
  setupWarning: $("setup-warning"),
  btnStart: $("btn-start"),
  exerciseDisplay: $("exercise-display"),
  exerciseLabel: () => document.querySelector(".exercise-label"),
  exerciseHowto: $("exercise-howto"),
  exerciseHowtoTitle: $("exercise-howto-title"),
  exerciseDesc: $("exercise-desc"),
  sessionProgress: $("session-progress"),
  countdownDisplay: $("countdown-display"),
  btnPause: $("btn-pause"),
  pauseLabel: $("pause-label"),
  btnStop: $("btn-stop"),
  mainPanel: $("main-panel"),
  navMenuToggle: $("nav-menu-toggle"),
  navDrawerBackdrop: $("nav-drawer-backdrop"),
  navDrawerMenu: $("nav-drawer-menu"),
  navActionHome: $("nav-action-home"),
  navGithubLink: $("nav-github-link"),
  navActionAbout: $("nav-action-about"),
  navActionCredits: $("nav-action-credits"),
  dialogAbout: /** @type {HTMLDialogElement} */ ($("dialog-about")),
  dialogCredits: /** @type {HTMLDialogElement} */ ($("dialog-credits")),
  aboutHeading: $("about-heading"),
  aboutText: $("about-text"),
  aboutDismiss: $("about-dismiss"),
  creditsHeading: $("credits-heading"),
  creditsText: $("credits-text"),
  creditsDismiss: $("credits-dismiss"),
};

/** @type {typeof DEFAULT_SETTINGS} */
let settings = { ...DEFAULT_SETTINGS, categories: { ...DEFAULT_SETTINGS.categories } };

/** @type {RunState} */
let runState = "idle";

let tickHandle = null;
let deadlineMs = 0;
/** Remaining segment duration when paused (ms). */
let pauseRemainMs = 0;
let lastExerciseId = null;
let exercisesCompleted = 0;
/** @type {number | null} */
let sessionLimit = null;

function currentLang() {
  return settings.language === "it" ? "it" : "en";
}

function t() {
  return UI[currentLang()];
}

function labelForExercise(ex) {
  return currentLang() === "it" ? ex.labelIt : ex.labelEn;
}

function descForExercise(ex) {
  return currentLang() === "it" ? ex.descIt : ex.descEn;
}

/** Spoken line: short title, then how-to (voice only). */
function voiceLineForExercise(ex) {
  return `${labelForExercise(ex)}. ${descForExercise(ex)}`;
}

function categoryLabel(catId) {
  const row = CATEGORY_ORDER.find((c) => c.id === catId);
  if (!row) return catId;
  return currentLang() === "it" ? row.labelIt : row.labelEn;
}

function eligiblePool() {
  return filterByCategories(EXERCISES, settings.categories);
}

function persistSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, serializeSettings(settings));
  } catch {
    /* ignore quota */
  }
}

function loadSettings() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    raw = null;
  }
  settings = parseStoredSettings(raw);
}

function applySettingsToForm() {
  els.paceRange.value = String(settings.paceSec);
  els.paceValue.textContent = String(settings.paceSec);
  els.sessionUnlimited.checked = settings.sessionUnlimited;
  els.sessionCount.value = String(settings.sessionCount);
  els.sessionCount.disabled = settings.sessionUnlimited;
  els.languageSelect.value = settings.language;
  els.voiceToggle.checked = settings.voiceEnabled;
  renderCategoryToggles();
  translateSetupChrome();
  validateSetup();
}

function renderCategoryToggles() {
  els.categoryToggles.innerHTML = "";
  for (const cat of CATEGORY_ORDER) {
    const id = `cat-${cat.id}`;
    const wrap = document.createElement("label");
    wrap.className = "check-row";
    wrap.htmlFor = id;
    const input = document.createElement("input");
    input.type = "checkbox";
    input.id = id;
    input.checked = settings.categories[cat.id] === true;
    input.addEventListener("change", () => {
      settings.categories[cat.id] = input.checked;
      persistSettings();
      validateSetup();
    });
    const span = document.createElement("span");
    span.textContent = categoryLabel(cat.id);
    wrap.append(input, span);
    els.categoryToggles.appendChild(wrap);
  }
}

function translateSetupChrome() {
  const txt = t();
  els.setupHeading.textContent = txt.setupHeading;
  const paceLead = document.getElementById("pace-label-lead");
  const paceTail = document.getElementById("pace-label-tail");
  if (paceLead) paceLead.textContent = txt.paceLabel;
  if (paceTail) paceTail.textContent = txt.paceSuffix;
  const paceHint = els.setupScreen.querySelector("#pace-range + .hint");
  if (paceHint) paceHint.textContent = txt.paceHint;
  const fs = els.setupScreen.querySelectorAll("fieldset.fieldset");
  if (fs[0]) {
    const leg = fs[0].querySelector("legend");
    if (leg) leg.textContent = txt.sessionLegend;
    const ul = document.getElementById("session-unlimited-label");
    if (ul) ul.textContent = txt.unlimited;
    const lbl = fs[0].querySelector('label[for="session-count"]');
    if (lbl) lbl.textContent = txt.sessionCountLabel;
  }
  if (fs[1]) {
    const leg = fs[1].querySelector("legend");
    if (leg) leg.textContent = txt.categoriesLegend;
  }
  els.categoryHint.textContent = txt.categoryHint;
  const langLbl = els.setupScreen.querySelector('label[for="language-select"]');
  if (langLbl) langLbl.textContent = txt.languageLabel;
  const langHint = document.getElementById("lang-hint");
  if (langHint) langHint.textContent = txt.languageHint;
  const voiceSpan = document.getElementById("voice-toggle-label");
  if (voiceSpan) voiceSpan.textContent = txt.voiceLabel;
  const startLbl = document.getElementById("btn-start-label");
  const stopLbl = document.getElementById("btn-stop-label");
  if (startLbl) startLbl.textContent = txt.start;
  if (stopLbl) stopLbl.textContent = txt.stop;
  translateNavChrome();
}

function navDrawerIsOpen() {
  return !els.navDrawerMenu.hidden;
}

function translateNavChrome() {
  const txt = t();
  els.navDrawerMenu.setAttribute("aria-label", txt.menuAriaSite);
  els.navActionHome.textContent = txt.navHome;
  els.navGithubLink.textContent = txt.navGithub;
  els.navGithubLink.href = REPO_URL;
  els.navActionAbout.textContent = txt.navAbout;
  els.navActionCredits.textContent = txt.navCredits;
  els.aboutHeading.textContent = txt.aboutTitle;
  els.aboutText.textContent = `${txt.aboutBody}\n\n${txt.aboutLive} ${LIVE_URL}`;
  els.creditsHeading.textContent = txt.creditsTitle;
  els.creditsText.textContent = `${txt.creditsBody}\n\n${txt.creditsLive} ${LIVE_URL}`;
  els.aboutDismiss.textContent = txt.dialogClose;
  els.creditsDismiss.textContent = txt.dialogClose;
  const toggleLabel = els.navMenuToggle.querySelector(".nav-menu-toggle-text");
  if (toggleLabel) {
    toggleLabel.textContent = navDrawerIsOpen() ? txt.menuClose : txt.menuOpen;
  }
}

function openNavDrawer() {
  els.navDrawerBackdrop.hidden = false;
  els.navDrawerMenu.hidden = false;
  els.navMenuToggle.setAttribute("aria-expanded", "true");
  document.body.classList.add("nav-open");
  translateNavChrome();
  els.navActionHome.focus();
}

function closeNavDrawer() {
  els.navDrawerBackdrop.hidden = true;
  els.navDrawerMenu.hidden = true;
  els.navMenuToggle.setAttribute("aria-expanded", "false");
  document.body.classList.remove("nav-open");
  translateNavChrome();
  els.navMenuToggle.focus();
}

function goHomeFromMenu() {
  closeNavDrawer();
  cancelSpeech();
  stopWorkout(true);
  applySettingsToForm();
  window.scrollTo({ top: 0, behavior: "smooth" });
  requestAnimationFrame(() => {
    els.mainPanel.focus({ preventScroll: true });
  });
}

function wireNavEvents() {
  els.navMenuToggle.addEventListener("click", () => {
    if (navDrawerIsOpen()) closeNavDrawer();
    else openNavDrawer();
  });
  els.navDrawerBackdrop.addEventListener("click", () => closeNavDrawer());
  els.navActionHome.addEventListener("click", () => goHomeFromMenu());
  els.navGithubLink.addEventListener("click", () => closeNavDrawer());
  els.navActionAbout.addEventListener("click", () => {
    closeNavDrawer();
    els.dialogAbout.showModal();
  });
  els.navActionCredits.addEventListener("click", () => {
    closeNavDrawer();
    els.dialogCredits.showModal();
  });
  els.aboutDismiss.addEventListener("click", () => els.dialogAbout.close());
  els.creditsDismiss.addEventListener("click", () => els.dialogCredits.close());
  els.dialogAbout.addEventListener("click", (e) => {
    if (e.target === els.dialogAbout) els.dialogAbout.close();
  });
  els.dialogCredits.addEventListener("click", (e) => {
    if (e.target === els.dialogCredits) els.dialogCredits.close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && navDrawerIsOpen()) {
      closeNavDrawer();
    }
  });
}

function validateSetup() {
  const pool = eligiblePool();
  const txt = t();
  els.setupWarning.hidden = true;
  els.setupWarning.textContent = "";

  const enabledCount = CATEGORY_ORDER.filter((c) => settings.categories[c.id]).length;
  if (enabledCount === 0) {
    els.btnStart.disabled = true;
    els.setupWarning.hidden = false;
    els.setupWarning.textContent = txt.noCategoryWarn;
    return;
  }

  els.btnStart.disabled = false;
  if (pool.length === 1) {
    els.setupWarning.hidden = false;
    els.setupWarning.textContent = txt.singleExerciseWarn;
  }
}

function clearTick() {
  if (tickHandle != null) {
    clearInterval(tickHandle);
    tickHandle = null;
  }
}

function flashExerciseDisplay() {
  els.exerciseDisplay.classList.remove("is-flash");
  // reflow
  void els.exerciseDisplay.offsetWidth;
  els.exerciseDisplay.classList.add("is-flash");
}

function updateProgressLabel() {
  const txt = t();
  if (sessionLimit == null) {
    els.sessionProgress.textContent = txt.progressUnlimited;
    return;
  }
  els.sessionProgress.textContent = `${Math.min(exercisesCompleted + 1, sessionLimit)} / ${sessionLimit}`;
}

function showExercise(ex) {
  const labelEl = els.exerciseLabel();
  if (!labelEl) return;
  labelEl.textContent = labelForExercise(ex);
  const d = String(descForExercise(ex) ?? "").trim();
  els.exerciseDesc.textContent = d;
  if (d) {
    els.exerciseHowtoTitle.textContent = t().howToTitle;
    els.exerciseHowto.hidden = false;
    els.exerciseHowto.removeAttribute("hidden");
  } else {
    els.exerciseHowto.hidden = true;
  }
  flashExerciseDisplay();
  els.exerciseDisplay.focus({ preventScroll: true });
  if (d) {
    requestAnimationFrame(() => {
      els.exerciseHowto.scrollIntoView({ block: "start", behavior: "auto" });
      els.exerciseHowto.focus({ preventScroll: true });
    });
  }
}

function announceAndCue(ex) {
  playBeep();
  if (settings.voiceEnabled) {
    speakInstruction(voiceLineForExercise(ex), currentLang());
  }
}

function pickAndShowNext(isInitial) {
  const pool = eligiblePool();
  const next = pickNextExercise(pool, lastExerciseId, Math.random);
  if (!next) {
    stopWorkout();
    return;
  }
  lastExerciseId = next.id;
  showExercise(next);
  if (!isInitial) {
    announceAndCue(next);
  } else if (settings.voiceEnabled) {
    speakInstruction(voiceLineForExercise(next), currentLang());
  }
}

function tick() {
  if (runState !== "running") return;
  const msLeft = deadlineMs - Date.now();
  const secLeft = Math.max(0, Math.ceil(msLeft / 1000));
  els.countdownDisplay.textContent = String(secLeft);
  if (msLeft <= 0) {
    exercisesCompleted += 1;
    if (sessionLimit != null && exercisesCompleted >= sessionLimit) {
      playBeep();
      cancelSpeech();
      const labelEl = els.exerciseLabel();
      if (labelEl) labelEl.textContent = t().sessionComplete;
      els.exerciseDesc.textContent = "";
      els.exerciseHowto.hidden = true;
      stopWorkout(false);
      return;
    }
    deadlineMs = Date.now() + settings.paceSec * 1000;
    pickAndShowNext(false);
    updateProgressLabel();
  }
}

function startWorkout() {
  runState = "running";
  document.body.classList.add("workout-active");
  els.setupScreen.hidden = true;
  els.workoutScreen.hidden = false;
  exercisesCompleted = 0;
  lastExerciseId = null;
  pauseRemainMs = 0;
  sessionLimit = normalizeSessionLimit(settings.sessionUnlimited, settings.sessionCount);
  updateProgressLabel();
  deadlineMs = Date.now() + settings.paceSec * 1000;
  els.countdownDisplay.textContent = String(settings.paceSec);
  pickAndShowNext(true);
  els.pauseLabel.textContent = t().pause;
  clearTick();
  tickHandle = setInterval(tick, 125);
}

/**
 * @param {boolean} [showSetup=true]
 */
function stopWorkout(showSetup = true) {
  clearTick();
  cancelSpeech();
  runState = "idle";
  document.body.classList.remove("workout-active");
  if (showSetup) {
    els.workoutScreen.hidden = true;
    els.setupScreen.hidden = false;
  }
  els.pauseLabel.textContent = t().pause;
}

function pauseWorkout() {
  if (runState !== "running") return;
  runState = "paused";
  clearTick();
  cancelSpeech();
  pauseRemainMs = Math.max(0, deadlineMs - Date.now());
  els.pauseLabel.textContent = t().resume;
}

function resumeWorkout() {
  if (runState !== "paused") return;
  runState = "running";
  deadlineMs = Date.now() + pauseRemainMs;
  els.pauseLabel.textContent = t().pause;
  clearTick();
  tickHandle = setInterval(tick, 125);
}

function wireEvents() {
  els.paceRange.addEventListener("input", () => {
    const v = clampPaceSec(Number(els.paceRange.value));
    settings.paceSec = v;
    els.paceValue.textContent = String(v);
    persistSettings();
  });

  els.sessionUnlimited.addEventListener("change", () => {
    settings.sessionUnlimited = els.sessionUnlimited.checked;
    els.sessionCount.disabled = settings.sessionUnlimited;
    persistSettings();
  });

  els.sessionCount.addEventListener("change", () => {
    const n = Number(els.sessionCount.value);
    settings.sessionCount = Number.isFinite(n) ? Math.min(500, Math.max(1, Math.floor(n))) : 30;
    els.sessionCount.value = String(settings.sessionCount);
    persistSettings();
  });

  els.languageSelect.addEventListener("change", () => {
    const v = els.languageSelect.value === "it" ? "it" : "en";
    settings.language = v;
    document.documentElement.lang = v === "it" ? "it" : "en";
    persistSettings();
    renderCategoryToggles();
    translateSetupChrome();
    validateSetup();
    if (!els.workoutScreen.hidden && !els.exerciseHowto.hidden) {
      els.exerciseHowtoTitle.textContent = t().howToTitle;
    }
  });

  els.voiceToggle.addEventListener("change", () => {
    settings.voiceEnabled = els.voiceToggle.checked;
    persistSettings();
  });

  els.btnStart.addEventListener("click", async () => {
    validateSetup();
    if (els.btnStart.disabled) return;
    await ensureAudioReady();
    persistSettings();
    startWorkout();
  });

  els.btnPause.addEventListener("click", () => {
    if (runState === "running") pauseWorkout();
    else if (runState === "paused") resumeWorkout();
  });

  els.btnStop.addEventListener("click", () => {
    stopWorkout(true);
    applySettingsToForm();
  });
}

function init() {
  loadSettings();
  applySettingsToForm();
  document.documentElement.lang = currentLang() === "it" ? "it" : "en";
  wireEvents();
  wireNavEvents();
}

init();
