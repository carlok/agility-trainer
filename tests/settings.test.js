import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  normalizeSettings,
  parseStoredSettings,
  serializeSettings,
} from "../js/settings.js";

describe("normalizeSettings", () => {
  it("fills defaults for garbage input", () => {
    const s = normalizeSettings(null);
    expect(s.paceSec).toBe(DEFAULT_SETTINGS.paceSec);
    expect(s.language).toBe("en");
  });

  it("clamps pace and respects language", () => {
    const s = normalizeSettings({ paceSec: 99, language: "it", voiceEnabled: false });
    expect(s.paceSec).toBe(15);
    expect(s.language).toBe("it");
    expect(s.voiceEnabled).toBe(false);
  });

  it("merges category toggles", () => {
    const s = normalizeSettings({
      categories: { arms: false, shoulders: true },
    });
    expect(s.categories.arms).toBe(false);
    expect(s.categories.shoulders).toBe(true);
    expect(s.categories.jumps).toBe(true);
  });
});

describe("parseStoredSettings", () => {
  it("round-trips serialize", () => {
    const s = { ...DEFAULT_SETTINGS, categories: { ...DEFAULT_SETTINGS.categories } };
    s.paceSec = 7;
    s.sessionUnlimited = false;
    s.language = "it";
    const back = parseStoredSettings(serializeSettings(s));
    expect(back.paceSec).toBe(7);
    expect(back.sessionUnlimited).toBe(false);
    expect(back.language).toBe("it");
  });

  it("handles invalid JSON", () => {
    const s = parseStoredSettings("{");
    expect(s.language).toBe("en");
  });
});
