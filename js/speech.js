/**
 * @param {string} text
 * @param {'en' | 'it'} lang
 */
export function speakInstruction(text, lang) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "it" ? "it-IT" : "en-US";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

export function cancelSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
