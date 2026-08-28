import { sql } from '@vercel/postgres';
import { slotDateKey } from '../../utils/formatters.js';

export { slotDateKey };

/** Past days of occupancy to keep in the admin calendar dump. */
export const DEFAULT_OCCUPANCY_LOOKBEHIND_DAYS = 60;
/** Future days of occupancy — group experiences are often booked months ahead. */
export const DEFAULT_OCCUPANCY_LOOKAHEAD_DAYS = 365;
/** Pre-reservas without slots (or occupancy not yet backfilled) stay visible if recently created. */
export const SLOTLESS_CREATED_LOOKBEHIND_DAYS = 30;

const ISO_DATE_RE = /^(\d{4}-\d{2}-\d{2})/;

let occupancySchemaReady = false;
let occupancySchemaPromise: Promise<boolean> | null = null;

export function ymdLocal(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function addDaysYmd(base: Date, days: number): string {
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    d.setDate(d.getDate() + days);
    return ymdLocal(d);
}

export function occupancyDatesFromSlots(slots: unknown): { first: string | null; last: string | null } {
    if (!Array.isArray(slots) || slots.length === 0) {
        return { first: null, last: null };
    }
    const dates = slots
        .map((s: any) => slotDateKey(s?.date))
        .filter((d) => ISO_DATE_RE.test(d))
        .sort();
    if (dates.length === 0) return { first: null, last: null };
    return { first: dates[0], last: dates[dates.length - 1] };
}

export function resolveOccupancyWindow(opts?: { from?: string; to?: string }): {
    from: string;
    to: string;
    slotlessSince: string;
} {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const from = opts?.from && ISO_DATE_RE.test(opts.from) ? opts.from.slice(0, 10) : addDaysYmd(today, -DEFAULT_OCCUPANCY_LOOKBEHIND_DAYS);
    const to = opts?.to && ISO_DATE_RE.test(opts.to) ? opts.to.slice(0, 10) : addDaysYmd(today, DEFAULT_OCCUPANCY_LOOKAHEAD_DAYS);
    return {
        from,
        to,
        slotlessSince: addDaysYmd(today, -SLOTLESS_CREATED_LOOKBEHIND_DAYS),
    };
}

const CREATE_SYNC_FN = `
CREATE OR REPLACE FUNCTION bookings_sync_occupancy_dates()
RETURNS trigger AS $fn$
DECLARE
  first_d date;
  last_d date;
BEGIN
  SELECT MIN(d), MAX(d)
  INTO first_d, last_d
  FROM (
    SELECT LEFT(elem->>'date', 10)::date AS d
    FROM jsonb_array_elements(COALESCE(NEW.slots, '[]'::jsonb)) elem
    WHERE (elem->>'date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
  ) dates;

  NEW.first_slot_date := first_d;
  NEW.last_slot_date := last_d;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;
`;

/**
 * Ensures occupancy columns, trigger, index, and a one-shot backfill.
 * Safe to call on every request; after the first success it is a no-op in-process.
 */
export async function ensureOccupancySchema(): Promise<boolean> {
    if (occupancySchemaReady) return true;
    if (occupancySchemaPromise) return occupancySchemaPromise;

    occupancySchemaPromise = (async () => {
        await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS first_slot_date DATE`;
        await sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_slot_date DATE`;

        await sql.query(CREATE_SYNC_FN);

        await sql.query(`DROP TRIGGER IF EXISTS trg_bookings_occupancy_dates ON bookings`);
        try {
            await sql.query(`
                CREATE TRIGGER trg_bookings_occupancy_dates
                BEFORE INSERT OR UPDATE OF slots ON bookings
                FOR EACH ROW
                EXECUTE FUNCTION bookings_sync_occupancy_dates()
            `);
        } catch (fnErr) {
            // PG < 14 uses EXECUTE PROCEDURE for functions.
            console.warn('[occupancy] EXECUTE FUNCTION failed, trying PROCEDURE:', fnErr);
            await sql.query(`
                CREATE TRIGGER trg_bookings_occupancy_dates
                BEFORE INSERT OR UPDATE OF slots ON bookings
                FOR EACH ROW
                EXECUTE PROCEDURE bookings_sync_occupancy_dates()
            `);
        }

        await sql.query(`
            CREATE INDEX IF NOT EXISTS idx_bookings_occupancy
            ON bookings (last_slot_date, first_slot_date)
            WHERE first_slot_date IS NOT NULL
        `);

        await sql.query(`
            UPDATE bookings b
            SET first_slot_date = sub.first_d,
                last_slot_date = sub.last_d
            FROM (
                SELECT
                    b2.id,
                    MIN(LEFT(s->>'date', 10)::date) FILTER (
                        WHERE (s->>'date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
                    ) AS first_d,
                    MAX(LEFT(s->>'date', 10)::date) FILTER (
                        WHERE (s->>'date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
                    ) AS last_d
                FROM bookings b2
                LEFT JOIN LATERAL jsonb_array_elements(COALESCE(b2.slots, '[]'::jsonb)) s ON TRUE
                WHERE b2.first_slot_date IS NULL
                GROUP BY b2.id
            ) sub
            WHERE b.id = sub.id
              AND sub.first_d IS NOT NULL
        `);

        occupancySchemaReady = true;
        console.log('[occupancy] schema ready (first_slot_date / last_slot_date)');
        return true;
    })().catch((err) => {
        occupancySchemaPromise = null;
        occupancySchemaReady = false;
        console.warn('[occupancy] schema ensure failed, will use jsonb fallback:', err);
        return false;
    });

    return occupancySchemaPromise;
}

const CALENDAR_SELECT = `
    b.id,
    b.product_id,
    b.product_type,
    p.name AS product_name,
    b.product->>'technique' AS product_technique,
    b.slots,
    b.user_info,
    b.created_at,
    b.is_paid,
    b.price,
    b.booking_mode,
    b.booking_code,
    b.booking_date,
    b.attendance,
    b.status,
    b.expires_at,
    b.participants,
    b.group_metadata AS group_class_metadata,
    b.technique,
    b.payment_proof_url,
    b.client_note
`;

function occupancyWhereSql(hasColumns: boolean, includeCreatedSince: boolean): string {
    const occupancy = hasColumns
        ? `(
            (b.first_slot_date IS NOT NULL
              AND b.last_slot_date >= $1::date
              AND b.first_slot_date <= $2::date)
            OR (
              b.first_slot_date IS NULL
              AND EXISTS (
                SELECT 1 FROM jsonb_array_elements(COALESCE(b.slots, '[]'::jsonb)) s
                WHERE (s->>'date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
                  AND LEFT(s->>'date', 10) >= $1
                  AND LEFT(s->>'date', 10) <= $2
              )
            )
          )`
        : `EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(b.slots, '[]'::jsonb)) s
            WHERE (s->>'date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
              AND LEFT(s->>'date', 10) >= $1
              AND LEFT(s->>'date', 10) <= $2
          )`;

    if (!includeCreatedSince) return occupancy;
    return `(${occupancy} OR b.created_at >= $3::timestamptz)`;
}

/**
 * Admin calendar dump: classes that OCCUR in [from, to], plus recently created
 * pre-reservas (no slots yet). Not filtered by created_at of the class itself.
 */
export async function fetchCalendarOccupancyRows(from: string, to: string, slotlessSince: string): Promise<any[]> {
    const hasColumns = await ensureOccupancySchema();
    const where = occupancyWhereSql(hasColumns, true);
    const params = [from, to, `${slotlessSince}T00:00:00.000Z`];

    const run = async (selectList: string) => {
        const text = `
            SELECT ${selectList}
            FROM bookings b
            LEFT JOIN products p ON p.id = b.product_id
            WHERE ${where}
            ORDER BY b.created_at DESC
        `;
        return sql.query(text, params);
    };

    try {
        const { rows } = await run(CALENDAR_SELECT);
        return rows;
    } catch (err: any) {
        const msg = String(err?.message || '');
        const missingOptional =
            msg.includes('group_class_metadata') ||
            msg.includes('technique') ||
            msg.includes('participants') ||
            msg.includes('payment_proof_url') ||
            msg.includes('client_note');
        if (!missingOptional) throw err;

        console.warn('[occupancy] calendar select fallback due to missing column(s):', msg);
        const { rows } = await run(`
            b.id,
            b.product_id,
            b.product_type,
            p.name AS product_name,
            b.product->>'technique' AS product_technique,
            b.slots,
            b.user_info,
            b.created_at,
            b.is_paid,
            b.price,
            b.booking_mode,
            b.booking_code,
            b.booking_date,
            b.attendance,
            b.status,
            b.expires_at
        `);
        return rows.map((row: any) => ({
            ...row,
            participants: 1,
            group_class_metadata: null,
            technique: null,
            payment_proof_url: null,
            client_note: null,
        }));
    }
}

/**
 * Capacity / overlap checks for a single calendar day.
 * Excludes expired/cancelled so they do not occupy seats.
 */
export async function fetchBookingsOverlappingDate(
    date: string,
    opts?: { excludeExpired?: boolean }
): Promise<any[]> {
    const hasColumns = await ensureOccupancySchema();
    const excludeExpired = opts?.excludeExpired !== false;
    const occupancy = occupancyWhereSql(hasColumns, false);
    const statusClause = excludeExpired
        ? `AND COALESCE(b.status, 'active') NOT IN ('expired', 'cancelled')`
        : '';
    const text = `
        SELECT b.*
        FROM bookings b
        WHERE ${occupancy}
        ${statusClause}
        ORDER BY b.created_at DESC
    `;
    const { rows } = await sql.query(text, [date, date]);
    return rows;
}

/**
 * Occupancy for an inclusive date range (availability search, group-class slots).
 */
export async function fetchBookingsOverlappingRange(
    from: string,
    to: string,
    opts?: { excludeExpired?: boolean }
): Promise<any[]> {
    const hasColumns = await ensureOccupancySchema();
    const excludeExpired = opts?.excludeExpired !== false;
    const occupancy = occupancyWhereSql(hasColumns, false);
    const statusClause = excludeExpired
        ? `AND COALESCE(b.status, 'active') NOT IN ('expired', 'cancelled')`
        : '';
    const text = `
        SELECT b.*
        FROM bookings b
        WHERE ${occupancy}
        ${statusClause}
        ORDER BY b.created_at DESC
    `;
    const { rows } = await sql.query(text, [from, to]);
    return rows;
}

/**
 * Admin calendar search: by booking code, email or name. No created_at / occupancy window.
 */
export async function searchCalendarOccupancyRows(rawQuery: string): Promise<any[]> {
    const term = rawQuery.trim();
    if (term.length < 2) return [];
    const pattern = `%${term}%`;
    const text = `
        SELECT ${CALENDAR_SELECT}
        FROM bookings b
        LEFT JOIN products p ON p.id = b.product_id
        WHERE LOWER(COALESCE(b.booking_code, '')) LIKE LOWER($1)
           OR LOWER(COALESCE(b.user_info->>'email', '')) LIKE LOWER($1)
           OR LOWER(COALESCE(b.user_info->>'firstName', '')) LIKE LOWER($1)
           OR LOWER(COALESCE(b.user_info->>'lastName', '')) LIKE LOWER($1)
           OR LOWER(CONCAT(
                COALESCE(b.user_info->>'firstName', ''),
                ' ',
                COALESCE(b.user_info->>'lastName', '')
           )) LIKE LOWER($1)
        ORDER BY b.created_at DESC
        LIMIT 40
    `;
    const { rows } = await sql.query(text, [pattern]);
    return rows;
}
