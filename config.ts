/**
 * Closed-beta settings. Edit this file, not the code that reads it.
 */
export const BETA = {
  channel: 'CLOSED BETA',
  version: '0.2.0-beta.1',
  /** Shown on the title screen and attached to every feedback report. */
  build: '2026-10-28',
  /** Hard cap on invited testers. `tools/make-invites.mjs` honours it. */
  maxTesters: 10,
  /** Where feedback reports are mailed. Leave empty to offer copy/download only. */
  feedbackEmail: '',
} as const;
