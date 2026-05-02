export const STORAGE_KEY = "agility-trainer-settings-v1";

/** @type {Record<string, boolean>} */
const DEFAULT_CATEGORIES = {
  arms: true,
  shoulders: true,
  jumps: true,
  knees: true,
  fullBody: true,
  dodgeBox: true,
  core: true,
  mobility: true,
  cardio: true,
};

export const DEFAULT_SETTINGS = {
  paceSec: 5,
  sessionUnlimited: true,
  sessionCount: 30,
  language: /** @type {'en' | 'it'} */ ("en"),
  voiceEnabled: true,
  categories: { ...DEFAULT_CATEGORIES },
};

/**
 * @param {unknown} raw
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function normalizeSettings(raw) {
  const base = {
    paceSec: DEFAULT_SETTINGS.paceSec,
    sessionUnlimited: DEFAULT_SETTINGS.sessionUnlimited,
    sessionCount: DEFAULT_SETTINGS.sessionCount,
    language: /** @type {'en' | 'it'} */ (DEFAULT_SETTINGS.language),
    voiceEnabled: DEFAULT_SETTINGS.voiceEnabled,
    categories: { ...DEFAULT_CATEGORIES },
  };
  if (!raw || typeof raw !== "object") return base;
  const o = /** @type {Record<string, unknown>} */ (raw);

  if (typeof o.paceSec === "number" && Number.isFinite(o.paceSec)) {
    base.paceSec = Math.min(15, Math.max(2, Math.round(o.paceSec)));
  }
  if (typeof o.sessionUnlimited === "boolean") {
    base.sessionUnlimited = o.sessionUnlimited;
  }
  if (typeof o.sessionCount === "number" && Number.isFinite(o.sessionCount)) {
    base.sessionCount = Math.min(500, Math.max(1, Math.floor(o.sessionCount)));
  }
  if (o.language === "en" || o.language === "it") {
    base.language = o.language;
  }
  if (typeof o.voiceEnabled === "boolean") {
    base.voiceEnabled = o.voiceEnabled;
  }
  if (o.categories && typeof o.categories === "object") {
    const c = /** @type {Record<string, unknown>} */ (o.categories);
    for (const key of Object.keys(DEFAULT_CATEGORIES)) {
      if (typeof c[key] === "boolean") {
        base.categories[key] = c[key];
      }
    }
  }
  return base;
}

/**
 * @param {string | null} json
 * @returns {typeof DEFAULT_SETTINGS}
 */
export function parseStoredSettings(json) {
  if (!json) return { ...DEFAULT_SETTINGS, categories: { ...DEFAULT_CATEGORIES } };
  try {
    const data = JSON.parse(json);
    return normalizeSettings(data);
  } catch {
    return { ...DEFAULT_SETTINGS, categories: { ...DEFAULT_CATEGORIES } };
  }
}

/**
 * @param {typeof DEFAULT_SETTINGS} settings
 * @returns {string}
 */
export function serializeSettings(settings) {
  return JSON.stringify(settings);
}
