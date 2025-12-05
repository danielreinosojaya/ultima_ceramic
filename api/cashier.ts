import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

interface CashierEntryBody {
  date: string;
  initialBalance: number;
  previousSystemBalance: number;
  cashDenominations: Record<string, number>;
  salesTC: number;
  transfers: number;
  manualValueFromSystem: number;
  notes?: string;
}

function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  const camelCased: any = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
    camelCased[camelKey] = toCamelCase(obj[key]);
  }
  return camelCased;
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    // CREATE - Save cashier entry
    if (action === 'create' && req.method === 'POST') {
      const body: CashierEntryBody = req.body;

      if (!body.date || !body.cashDenominations) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: date, cashDenominations',
        });
      }

      // Calculate total cash
      let totalCash = 0;
      const denominationValues: Record<string, number> = {
        '50_BILL': 50,
        '20_BILL': 20,
        '10_BILL': 10,
        '5_BILL': 5,
        '1_BILL': 1,
        '0_50_COIN': 0.5,
        '0_25_COIN': 0.25,
        '0_10_COIN': 0.1,
        '0_05_COIN': 0.05,
        '0_01_COIN': 0.01,
      };

      for (const [denom, count] of Object.entries(body.cashDenominations)) {
        const countNum = typeof count === 'number' ? count : 0;
        totalCash += (denominationValues[denom] || 0) * countNum;
      }

      // Calculate expected total
      const expectedTotal =
        body.initialBalance +
        totalCash +
        body.salesTC +
        body.transfers;

      // Calculate difference
      const difference = expectedTotal - body.manualValueFromSystem;
      const discrepancy = Math.abs(difference) > 0.01; // Allow small floating point errors

      // Ensure table exists
      await sql`
        CREATE TABLE IF NOT EXISTS cashier_entries (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          initial_balance DECIMAL NOT NULL,
          previous_system_balance DECIMAL NOT NULL,
          cash_denominations JSONB NOT NULL,
          total_cash DECIMAL NOT NULL,
          sales_tc DECIMAL NOT NULL,
          transfers DECIMAL NOT NULL,
          expected_total DECIMAL NOT NULL,
          manual_value_from_system DECIMAL NOT NULL,
          difference DECIMAL NOT NULL,
          discrepancy BOOLEAN NOT NULL,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      const id = `cashier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const result = await sql`
        INSERT INTO cashier_entries (
          id, date, initial_balance, previous_system_balance,
          cash_denominations, total_cash, sales_tc, transfers,
          expected_total, manual_value_from_system, difference, discrepancy, notes
        )
        VALUES (
          ${id}, ${body.date}, ${body.initialBalance}, ${body.previousSystemBalance},
          ${JSON.stringify(body.cashDenominations)}, ${totalCash}, ${body.salesTC}, ${body.transfers},
          ${expectedTotal}, ${body.manualValueFromSystem}, ${difference}, ${discrepancy}, ${body.notes || null}
        )
        RETURNING *
      `;

      return res.status(201).json({
        success: true,
        data: toCamelCase(result.rows[0]),
      });
    }

    // GET - Fetch all entries or by date
    if (action === 'list' && req.method === 'GET') {
      const { date } = req.query;

      const query =
        date && date !== 'all'
          ? sql`SELECT * FROM cashier_entries WHERE date = ${date} ORDER BY created_at DESC`
          : sql`SELECT * FROM cashier_entries ORDER BY date DESC, created_at DESC`;

      try {
        const result = await query;
        return res.status(200).json({
          success: true,
          data: result.rows.map(toCamelCase),
        });
      } catch (error: any) {
        // Table doesn't exist yet
        if (error.message.includes('does not exist')) {
          return res.status(200).json({
            success: true,
            data: [],
          });
        }
        throw error;
      }
    }

    // GET - Single entry
    if (action === 'get' && req.method === 'GET') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Missing id parameter',
        });
      }

      const result = await sql`SELECT * FROM cashier_entries WHERE id = ${id}`;

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Entry not found',
        });
      }

      return res.status(200).json({
        success: true,
        data: toCamelCase(result.rows[0]),
      });
    }

    // UPDATE - Update entry
    if (action === 'update' && req.method === 'PUT') {
      const { id } = req.query;
      const body: Partial<CashierEntryBody> = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Missing id parameter',
        });
      }

      // Recalculate if needed
      let totalCash = null;
      let expectedTotal = null;
      let difference = null;
      let discrepancy = null;

      if (body.cashDenominations || body.initialBalance !== undefined || body.salesTC !== undefined || body.transfers !== undefined) {
        // Fetch current entry
        const current = await sql`SELECT * FROM cashier_entries WHERE id = ${id}`;
        if (current.rows.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Entry not found',
          });
        }

        const currentData = current.rows[0];
        const denominations = body.cashDenominations || JSON.parse(currentData.cash_denominations);
        const initialBalance = body.initialBalance ?? currentData.initial_balance;
        const salesTC = body.salesTC ?? currentData.sales_tc;
        const transfers = body.transfers ?? currentData.transfers;
        const manualValue = body.manualValueFromSystem ?? currentData.manual_value_from_system;

        // Recalculate cash
        const denominationValues: Record<string, number> = {
          '50_BILL': 50,
          '20_BILL': 20,
          '10_BILL': 10,
          '5_BILL': 5,
          '1_BILL': 1,
          '0_50_COIN': 0.5,
          '0_25_COIN': 0.25,
          '0_10_COIN': 0.1,
          '0_05_COIN': 0.05,
          '0_01_COIN': 0.01,
        };

        totalCash = 0;
        for (const [denom, count] of Object.entries(denominations)) {
          totalCash += (denominationValues[denom] || 0) * (typeof count === 'number' ? count : 0);
        }

        expectedTotal = initialBalance + totalCash + salesTC + transfers;
        difference = expectedTotal - manualValue;
        discrepancy = Math.abs(difference) > 0.01;
      }

      const updateParts = [];
      const params = [];

      if (body.date) {
        updateParts.push(`date = $${updateParts.length + 1}`);
        params.push(body.date);
      }
      if (body.initialBalance !== undefined) {
        updateParts.push(`initial_balance = $${updateParts.length + 1}`);
        params.push(body.initialBalance);
      }
      if (body.cashDenominations) {
        updateParts.push(`cash_denominations = $${updateParts.length + 1}`);
        params.push(JSON.stringify(body.cashDenominations));
      }
      if (body.salesTC !== undefined) {
        updateParts.push(`sales_tc = $${updateParts.length + 1}`);
        params.push(body.salesTC);
      }
      if (body.transfers !== undefined) {
        updateParts.push(`transfers = $${updateParts.length + 1}`);
        params.push(body.transfers);
      }
      if (body.manualValueFromSystem !== undefined) {
        updateParts.push(`manual_value_from_system = $${updateParts.length + 1}`);
        params.push(body.manualValueFromSystem);
      }
      if (body.notes !== undefined) {
        updateParts.push(`notes = $${updateParts.length + 1}`);
        params.push(body.notes);
      }

      if (totalCash !== null) {
        updateParts.push(`total_cash = $${updateParts.length + 1}`);
        params.push(totalCash);
      }
      if (expectedTotal !== null) {
        updateParts.push(`expected_total = $${updateParts.length + 1}`);
        params.push(expectedTotal);
      }
      if (difference !== null) {
        updateParts.push(`difference = $${updateParts.length + 1}`);
        params.push(difference);
      }
      if (discrepancy !== null) {
        updateParts.push(`discrepancy = $${updateParts.length + 1}`);
        params.push(discrepancy);
      }

      updateParts.push(`updated_at = NOW()`);

      if (updateParts.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No fields to update',
        });
      }

      const query = `UPDATE cashier_entries SET ${updateParts.join(', ')} WHERE id = $${updateParts.length + 1} RETURNING *`;
      params.push(id);

      const result = await sql.query(query, params);

      return res.status(200).json({
        success: true,
        data: toCamelCase(result.rows[0]),
      });
    }

    // DELETE - Remove entry
    if (action === 'delete' && req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({
          success: false,
          error: 'Missing id parameter',
        });
      }

      await sql`DELETE FROM cashier_entries WHERE id = ${id}`;

      return res.status(200).json({
        success: true,
        message: 'Entry deleted',
      });
    }

    return res.status(400).json({
      success: false,
      error: `Unknown action: ${action}`,
    });
  } catch (error: any) {
    console.error('Cashier API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
}
