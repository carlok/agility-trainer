import { describe, expect, it } from "vitest";
import {
  filterByCategories,
  pickNextExercise,
  clampPaceSec,
  normalizeSessionLimit,
} from "../js/engine.js";
import { EXERCISES } from "../js/exercises.js";

describe("filterByCategories", () => {
  it("returns only exercises whose category is enabled", () => {
    const enabled = {
      arms: true,
      shoulders: false,
      jumps: false,
      knees: false,
      fullBody: false,
      dodgeBox: false,
    };
    const got = filterByCategories(EXERCISES, enabled);
    expect(got.every((e) => e.categoryId === "arms")).toBe(true);
    expect(got.length).toBeGreaterThan(0);
  });
});

describe("pickNextExercise", () => {
  const pool = EXERCISES.slice(0, 4);

  it("returns null for empty pool", () => {
    expect(pickNextExercise([], null, () => 0)).toBe(null);
  });

  it("never picks same id as last when pool has alternatives", () => {
    const first = pool[0];
    const next = pickNextExercise(pool, first.id, () => 0.99);
    expect(next).not.toBeNull();
    expect(next.id).not.toBe(first.id);
  });

  it("allows repeat when pool size is 1", () => {
    const one = [pool[0]];
    const a = pickNextExercise(one, pool[0].id, () => 0);
    expect(a.id).toBe(pool[0].id);
  });
});

describe("clampPaceSec", () => {
  it("clamps to 2–15 and rounds", () => {
    expect(clampPaceSec(1)).toBe(2);
    expect(clampPaceSec(20)).toBe(15);
    expect(clampPaceSec(5.4)).toBe(5);
  });
});

describe("normalizeSessionLimit", () => {
  it("returns null when unlimited", () => {
    expect(normalizeSessionLimit(true, 10)).toBe(null);
  });

  it("returns positive int when limited", () => {
    expect(normalizeSessionLimit(false, 12)).toBe(12);
    expect(normalizeSessionLimit(false, 0)).toBe(1);
    expect(normalizeSessionLimit(false, 9999)).toBe(500);
  });
});
