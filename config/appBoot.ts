/**
 * Runtime boot gate.
 * false → app shows a generic load failure (frontend + main APIs).
 * true  → normal operation.
 *
 * Flip this single value and redeploy to restore or cut access.
 */
export const APP_BOOT_OK = true;
