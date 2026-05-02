/**
 * @param {import('./exercises.js').Exercise[]} exercises
 * @param {Record<string, boolean>} categoryEnabled
 * @returns {import('./exercises.js').Exercise[]}
 */
export function filterByCategories(exercises, categoryEnabled) {
  return exercises.filter((e) => categoryEnabled[e.categoryId] === true);
}

/**
 * @param {import('./exercises.js').Exercise[]} pool
 * @param {string | null} lastExerciseId
 * @param {() => number} random01 — returns value in [0, 1)
 * @returns {import('./exercises.js').Exercise | null}
 */
export function pickNextExercise(pool, lastExerciseId, random01) {
  if (!pool.length) return null;
  const eligible =
    lastExerciseId == null
      ? pool
      : pool.filter((e) => e.id !== lastExerciseId);
  const pickFrom = eligible.length ? eligible : pool;
  const idx = Math.floor(random01() * pickFrom.length);
  return pickFrom[idx];
}

/**
 * @param {number | string | undefined} paceSec
 * @returns {number}
 */
export function clampPaceSec(paceSec) {
  const n = Number(paceSec);
  if (!Number.isFinite(n)) return 15;
  return Math.min(15, Math.max(2, Math.round(n)));
}

/**
 * @param {boolean} unlimited
 * @param {number | string | undefined} count
 * @returns {number | null} null means unlimited
 */
export function normalizeSessionLimit(unlimited, count) {
  if (unlimited) return null;
  const n = Number(count);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(500, Math.floor(n));
}
