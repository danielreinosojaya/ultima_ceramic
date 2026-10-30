import { randomUUID } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { rejectIfBootBlocked } from './shared/runtimeGuard.js';
import {
  balanceDue,
  derivePaymentStatus,
  normalizePaymentAmount,
  normalizePaymentEntries,
  normalizePrivateCustomEventInput,
  sumPaymentEntries,
  type PrivateCustomEvent,
  type PrivateCustomEventInput,
  type PrivateCustomPaymentEntry,
} from '../utils/privateCustomEvent.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let tableReady: Promise<void> | null = null;

function ensurePrivateEventsTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS private_custom_events (
          id UUID PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          event_date DATE NOT NULL,
          start_time VARCHAR(5) NOT NULL,
          end_time VARCHAR(5) NOT NULL,
          participants INTEGER NOT NULL DEFAULT 0,
          contact_name VARCHAR(255) NOT NULL DEFAULT '',
          phone VARCHAR(50) NOT NULL DEFAULT '',
          email VARCHAR(255) NOT NULL DEFAULT '',
          agreed_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
          amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
          payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
          payment_method VARCHAR(40) NOT NULL DEFAULT '',
          payment_notes TEXT NOT NULL DEFAULT '',
          payment_entries JSONB NOT NULL DEFAULT '[]'::jsonb,
          status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
          internal_notes TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_private_custom_events_date ON private_custom_events(event_date)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_private_custom_events_status ON private_custom_events(status)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_private_custom_events_payment ON private_custom_events(payment_status)`;
    })().catch((error) => {
      tableReady = null;
      throw error;
    });
  }
  return tableReady;
}

function iso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return value == null ? '' : String(value);
}

function mapRow(row: Record<string, unknown>): PrivateCustomEvent {
  const agreedPrice = Number(row.agreed_price ?? 0);
  const amountPaid = Number(row.amount_paid ?? 0);
  let entriesRaw = row.payment_entries;
  if (typeof entriesRaw === 'string') {
    try {
      entriesRaw = JSON.parse(entriesRaw);
    } catch {
      entriesRaw = [];
    }
  }
  const paymentEntries = normalizePaymentEntries(entriesRaw);
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    eventDate: String(row.event_date ?? '').slice(0, 10),
    startTime: String(row.start_time ?? ''),
    endTime: String(row.end_time ?? ''),
    participants: Number(row.participants ?? 0) || 0,
    contactName: String(row.contact_name ?? ''),
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    agreedPrice,
    amountPaid,
    balanceDue: balanceDue(agreedPrice, amountPaid),
    paymentStatus: (row.payment_status as PrivateCustomEvent['paymentStatus']) || derivePaymentStatus(agreedPrice, amountPaid),
    paymentMethod: String(row.payment_method ?? ''),
    paymentNotes: String(row.payment_notes ?? ''),
    paymentEntries,
    status: row.status as PrivateCustomEvent['status'],
    internalNotes: String(row.internal_notes ?? ''),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

async function listAll(from?: string, to?: string): Promise<PrivateCustomEvent[]> {
  if (from && to) {
    const { rows } = await sql`
      SELECT
        id,
        title,
        to_char(event_date, 'YYYY-MM-DD') AS event_date,
        start_time,
        end_time,
        participants,
        contact_name,
        phone,
        email,
        agreed_price,
        amount_paid,
        payment_status,
        payment_method,
        payment_notes,
        payment_entries,
        status,
        internal_notes,
        created_at,
        updated_at
      FROM private_custom_events
      WHERE event_date >= ${from}::date
        AND event_date <= ${to}::date
      ORDER BY event_date ASC, start_time ASC, title ASC
    `;
    return rows.map((row) => mapRow(row as Record<string, unknown>));
  }

  const { rows } = await sql`
    SELECT
      id,
      title,
      to_char(event_date, 'YYYY-MM-DD') AS event_date,
      start_time,
      end_time,
      participants,
      contact_name,
      phone,
      email,
      agreed_price,
      amount_paid,
      payment_status,
      payment_method,
      payment_notes,
      payment_entries,
      status,
      internal_notes,
      created_at,
      updated_at
    FROM private_custom_events
    ORDER BY event_date ASC, start_time ASC, title ASC
  `;
  return rows.map((row) => mapRow(row as Record<string, unknown>));
}

async function getById(id: string): Promise<PrivateCustomEvent | null> {
  const { rows } = await sql`
    SELECT
      id,
      title,
      to_char(event_date, 'YYYY-MM-DD') AS event_date,
      start_time,
      end_time,
      participants,
      contact_name,
      phone,
      email,
      agreed_price,
      amount_paid,
      payment_status,
      payment_method,
      payment_notes,
      payment_entries,
      status,
      internal_notes,
      created_at,
      updated_at
    FROM private_custom_events
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ? mapRow(rows[0] as Record<string, unknown>) : null;
}

function entriesJson(entries: PrivateCustomPaymentEntry[]): string {
  return JSON.stringify(entries);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (rejectIfBootBlocked(res)) return;

  const action = String(req.query.action || '');

  try {
    await ensurePrivateEventsTable();

    if (action === 'list') {
      const from = typeof req.query.from === 'string' ? req.query.from.trim() : '';
      const to = typeof req.query.to === 'string' ? req.query.to.trim() : '';
      const data = await listAll(from || undefined, to || undefined);
      return res.status(200).json({ success: true, data });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Método no permitido.' });
    }

    if (action === 'save') {
      const body = (req.body || {}) as PrivateCustomEventInput & { id?: string };
      const existingId = typeof body.id === 'string' ? body.id.trim() : '';

      // Al editar, preservar historial de abonos si no viene en el body
      if (existingId && UUID_RE.test(existingId) && body.paymentEntries == null) {
        const current = await getById(existingId);
        if (current) {
          body.paymentEntries = current.paymentEntries;
          if (body.amountPaid == null || body.amountPaid === '') {
            body.amountPaid = current.amountPaid;
          }
        }
      }

      // Si hay abono inicial sin historial, crear primera entrada
      const parsedPreview = normalizePrivateCustomEventInput(body);
      if (parsedPreview.ok === false) {
        return res.status(400).json({ success: false, error: parsedPreview.error });
      }

      if (
        !existingId &&
        parsedPreview.value.amountPaid > 0 &&
        parsedPreview.value.paymentEntries.length === 0
      ) {
        body.paymentEntries = [
          {
            id: randomUUID(),
            amount: parsedPreview.value.amountPaid,
            paidAt: new Date().toISOString(),
            method: parsedPreview.value.paymentMethod || '',
            note: 'Abono inicial',
          },
        ];
      }

      const parsed = normalizePrivateCustomEventInput(body);
      if (parsed.ok === false) {
        return res.status(400).json({ success: false, error: parsed.error });
      }

      if (existingId && !UUID_RE.test(existingId)) {
        return res.status(400).json({ success: false, error: 'No se encontró ese evento.' });
      }

      const v = parsed.value;
      const entriesPayload = entriesJson(v.paymentEntries);

      if (existingId) {
        const current = await getById(existingId);
        if (!current) return res.status(404).json({ success: false, error: 'No se encontró ese evento.' });
        await sql`
          UPDATE private_custom_events SET
            title = ${v.title},
            event_date = ${v.eventDate},
            start_time = ${v.startTime},
            end_time = ${v.endTime},
            participants = ${v.participants},
            contact_name = ${v.contactName},
            phone = ${v.phone},
            email = ${v.email},
            agreed_price = ${v.agreedPrice},
            amount_paid = ${v.amountPaid},
            payment_status = ${v.paymentStatus},
            payment_method = ${v.paymentMethod},
            payment_notes = ${v.paymentNotes},
            payment_entries = ${entriesPayload}::jsonb,
            status = ${v.status},
            internal_notes = ${v.internalNotes},
            updated_at = NOW()
          WHERE id = ${existingId}
        `;
        const data = await getById(existingId);
        return res.status(200).json({ success: true, data });
      }

      const id = randomUUID();
      await sql`
        INSERT INTO private_custom_events (
          id, title, event_date, start_time, end_time, participants,
          contact_name, phone, email, agreed_price, amount_paid, payment_status,
          payment_method, payment_notes, payment_entries, status, internal_notes
        ) VALUES (
          ${id},
          ${v.title},
          ${v.eventDate},
          ${v.startTime},
          ${v.endTime},
          ${v.participants},
          ${v.contactName},
          ${v.phone},
          ${v.email},
          ${v.agreedPrice},
          ${v.amountPaid},
          ${v.paymentStatus},
          ${v.paymentMethod},
          ${v.paymentNotes},
          ${entriesPayload}::jsonb,
          ${v.status},
          ${v.internalNotes}
        )
      `;
      const data = await getById(id);
      return res.status(200).json({ success: true, data });
    }

    if (action === 'add-payment') {
      const body = (req.body || {}) as {
        id?: string;
        amount?: number | string;
        method?: string;
        note?: string;
      };
      const id = String(body.id || '').trim();
      if (!UUID_RE.test(id)) {
        return res.status(400).json({ success: false, error: 'No se encontró ese evento.' });
      }
      const current = await getById(id);
      if (!current) return res.status(404).json({ success: false, error: 'No se encontró ese evento.' });
      if (current.status === 'cancelled') {
        return res.status(400).json({ success: false, error: 'No se puede registrar un abono en un evento cancelado.' });
      }

      const amount = normalizePaymentAmount(body.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ success: false, error: 'Escribe un monto de abono válido.' });
      }

      const method = String(body.method || '').trim().slice(0, 40);
      const note = String(body.note || '').trim().slice(0, 500);
      const entry: PrivateCustomPaymentEntry = {
        id: randomUUID(),
        amount,
        paidAt: new Date().toISOString(),
        method,
        note,
      };
      const paymentEntries = [...current.paymentEntries, entry];
      const amountPaid = sumPaymentEntries(paymentEntries);
      const paymentStatus = derivePaymentStatus(current.agreedPrice, amountPaid);
      const entriesPayload = entriesJson(paymentEntries);

      await sql`
        UPDATE private_custom_events SET
          amount_paid = ${amountPaid},
          payment_status = ${paymentStatus},
          payment_method = ${method || current.paymentMethod},
          payment_entries = ${entriesPayload}::jsonb,
          updated_at = NOW()
        WHERE id = ${id}
      `;
      const data = await getById(id);
      return res.status(200).json({ success: true, data });
    }

    if (action === 'cancel') {
      const id = String((req.body || {}).id || '').trim();
      if (!UUID_RE.test(id)) {
        return res.status(400).json({ success: false, error: 'No se encontró ese evento.' });
      }
      const current = await getById(id);
      if (!current) return res.status(404).json({ success: false, error: 'No se encontró ese evento.' });
      await sql`
        UPDATE private_custom_events
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = ${id}
      `;
      const data = await getById(id);
      return res.status(200).json({ success: true, data });
    }

    return res.status(400).json({ success: false, error: 'Acción no reconocida.' });
  } catch (error) {
    console.error('[private-events]', action, error);
    return res.status(500).json({ success: false, error: 'No se pudo guardar el evento personalizado.' });
  }
}
