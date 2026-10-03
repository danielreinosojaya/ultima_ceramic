import { APP_BOOT_OK } from '../../config/appBoot.js';

/** Returns true if the response was already sent (caller should return). */
export function rejectIfBootBlocked(res: {
  status: (code: number) => { json: (body: unknown) => unknown };
}): boolean {
  if (APP_BOOT_OK) return false;
  res.status(503).json({ error: 'Service Unavailable' });
  return true;
}
