import { randomUUID } from 'crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '@vercel/postgres';
import { rejectIfBootBlocked } from './shared/runtimeGuard.js';
import {
  balanceDue,
  findMezzanineOverlap,
  normalizeMezzanineInput,
  overlapMessage,
  type MezzanineRental,
  type MezzanineRentalInput,
  type MezzanineSlot,
} from '../utils/mezzanineRental.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

let tableReady: Promise<void> | null = null;

function ensureMezzanineTable(): Promise<void> {
  if (!tableReady) {
    tableReady = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS mezzanine_rentals (
          id UUID PRIMARY KEY,
          contact_name VARCHAR(255) NOT NULL,
          phone VARCHAR(50) NOT NULL DEFAULT '',
          email VARCHAR(255) NOT NULL DEFAULT '',
          rental_date DATE NOT NULL,
          start_time VARCHAR(5) NOT NULL,
          end_time VARCHAR(5) NOT NULL,
          purpose TEXT NOT NULL DEFAULT '',
          agreed_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
          amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
          payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
          payment_method VARCHAR(40) NOT NULL DEFAULT '',
          payment_notes TEXT NOT NULL DEFAULT '',
          status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
          internal_notes TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_mezzanine_rentals_date ON mezzanine_rentals(rental_date)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_mezzanine_rentals_status ON mezzanine_rentals(status)`;
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

function mapRow(row: Record<string, unknown>): MezzanineRental {
  const agreedPrice = Number(row.agreed_price ?? 0);
  const amountPaid = Number(row.amount_paid ?? 0);
  return {
    id: String(row.id),
    contactName: String(row.contact_name ?? ''),
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    rentalDate: String(row.rental_date ?? '').slice(0, 10),
    startTime: String(row.start_time ?? ''),
    endTime: String(row.end_time ?? ''),
    purpose: String(row.purpose ?? ''),
    agreedPrice,
    amountPaid,
    balanceDue: balanceDue(agreedPrice, amountPaid),
    paymentStatus: row.payment_status as MezzanineRental['paymentStatus'],
    paymentMethod: String(row.payment_method ?? ''),
    paymentNotes: String(row.payment_notes ?? ''),
    status: row.status as MezzanineRental['status'],
    internalNotes: String(row.internal_notes ?? ''),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

async function listAll(): Promise<MezzanineRental[]> {
  const { rows } = await sql`
    SELECT
      id,
      contact_name,
      phone,
      email,
      to_char(rental_date, 'YYYY-MM-DD') AS rental_date,
      start_time,
      end_time,
      purpose,
      agreed_price,
      amount_paid,
      payment_status,
      payment_method,
      payment_notes,
      status,
      internal_notes,
      created_at,
      updated_at
    FROM mezzanine_rentals
    ORDER BY rental_date ASC, start_time ASC, contact_name ASC
  `;
  return rows.map((row) => mapRow(row as Record<string, unknown>));
}

async function getById(id: string): Promise<MezzanineRental | null> {
  const { rows } = await sql`
    SELECT
      id,
      contact_name,
      phone,
      email,
      to_char(rental_date, 'YYYY-MM-DD') AS rental_date,
      start_time,
      end_time,
      purpose,
      agreed_price,
      amount_paid,
      payment_status,
      payment_method,
      payment_notes,
      status,
      internal_notes,
      created_at,
      updated_at
    FROM mezzanine_rentals
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ? mapRow(rows[0] as Record<string, unknown>) : null;
}

async function sameDaySlots(rentalDate: string): Promise<MezzanineSlot[]> {
  const { rows } = await sql`
    SELECT
      id,
      contact_name,
      to_char(rental_date, 'YYYY-MM-DD') AS rental_date,
      start_time,
      end_time,
      status
    FROM mezzanine_rentals
    WHERE rental_date = ${rentalDate}
      AND status <> 'cancelled'
  `;
  return rows.map((row) => ({
    id: String(row.id),
    contactName: String(row.contact_name ?? ''),
    rentalDate: String(row.rental_date ?? '').slice(0, 10),
    startTime: String(row.start_time ?? ''),
    endTime: String(row.end_time ?? ''),
    status: String(row.status ?? ''),
  }));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (rejectIfBootBlocked(res)) return;

  const action = String(req.query.action || '');

  try {
    await ensureMezzanineTable();

    if (action === 'list') {
      const data = await listAll();
      return res.status(200).json({ success: true, data });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ success: false, error: 'Método no permitido.' });
    }

    if (action === 'save') {
      const body = (req.body || {}) as MezzanineRentalInput & { id?: string };
      const parsed = normalizeMezzanineInput(body);
      if (!parsed.ok) return res.status(400).json({ success: false, error: parsed.error });

      const existingId = typeof body.id === 'string' ? body.id.trim() : '';
      if (existingId && !UUID_RE.test(existingId)) {
        return res.status(400).json({ success: false, error: 'No se encontró esa reserva.' });
      }

      const slots = await sameDaySlots(parsed.value.rentalDate);
      const conflict = findMezzanineOverlap(slots, parsed.value, existingId || undefined);
      if (conflict) {
        return res.status(409).json({ success: false, error: overlapMessage(conflict) });
      }

      const v = parsed.value;
      if (existingId) {
        const current = await getById(existingId);
        if (!current) return res.status(404).json({ success: false, error: 'No se encontró esa reserva.' });
        await sql`
          UPDATE mezzanine_rentals SET
            contact_name = ${v.contactName},
            phone = ${v.phone},
            email = ${v.email},
            rental_date = ${v.rentalDate},
            start_time = ${v.startTime},
            end_time = ${v.endTime},
            purpose = ${v.purpose},
            agreed_price = ${v.agreedPrice},
            amount_paid = ${v.amountPaid},
            payment_status = ${v.paymentStatus},
            payment_method = ${v.paymentMethod},
            payment_notes = ${v.paymentNotes},
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
        INSERT INTO mezzanine_rentals (
          id, contact_name, phone, email, rental_date, start_time, end_time,
          purpose, agreed_price, amount_paid, payment_status, payment_method,
          payment_notes, status, internal_notes
        ) VALUES (
          ${id},
          ${v.contactName},
          ${v.phone},
          ${v.email},
          ${v.rentalDate},
          ${v.startTime},
          ${v.endTime},
          ${v.purpose},
          ${v.agreedPrice},
          ${v.amountPaid},
          ${v.paymentStatus},
          ${v.paymentMethod},
          ${v.paymentNotes},
          ${v.status},
          ${v.internalNotes}
        )
      `;
      const data = await getById(id);
      return res.status(200).json({ success: true, data });
    }

    if (action === 'cancel') {
      const id = String((req.body || {}).id || '').trim();
      if (!UUID_RE.test(id)) {
        return res.status(400).json({ success: false, error: 'No se encontró esa reserva.' });
      }
      const current = await getById(id);
      if (!current) return res.status(404).json({ success: false, error: 'No se encontró esa reserva.' });
      await sql`
        UPDATE mezzanine_rentals
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = ${id}
      `;
      const data = await getById(id);
      return res.status(200).json({ success: true, data });
    }

    return res.status(400).json({ success: false, error: 'Acción no reconocida.' });
  } catch (error) {
    console.error('[mezzanine]', action, error);
    return res.status(500).json({ success: false, error: 'No se pudo guardar la agenda del mezzanine.' });
  }
}
