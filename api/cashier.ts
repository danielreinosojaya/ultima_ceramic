import { sql } from '@vercel/postgres';

export const runtime = 'nodejs';

interface CashierEntryBody {
  date: string;
  initialBalance: number;
  cashSales: number;
  cashDenominations: Record<string, number>;
  expenses: Array<{ id: string; description: string; amount: number }>;
  manualValueFromSystem: number;
  notes?: string;
  
  // Cuadre de Ventas Totales
  systemCashSales?: number;
  systemCardSales?: number;
  systemTransferSales?: number;
  myEffectiveSales?: number;
  myVouchersAccumulated?: number;
  myTransfersReceived?: number;
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

      // Calculate total cash counted (física)
      let totalCashCounted = 0;
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
        totalCashCounted += (denominationValues[denom] || 0) * countNum;
      }

      // Calculate total expenses
      const totalExpenses = (body.expenses || []).reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);

      // Calculate final cash balance: initialBalance + cashSales - totalExpenses
      // IMPORTANT: This is a CASH ONLY reconciliation
      const finalCashBalance =
        body.initialBalance +
        body.cashSales -
        totalExpenses;

      // Calculate difference for validation
      const difference = finalCashBalance - body.manualValueFromSystem;
      const discrepancy = Math.abs(difference) > 0.01; // Allow small floating point errors

      // Calculate sales totals
      const systemTotalSales = (body.systemCashSales || 0) + (body.systemCardSales || 0) + (body.systemTransferSales || 0);
      const myTotalSales = (body.myEffectiveSales || 0) + (body.myVouchersAccumulated || 0) + (body.myTransfersReceived || 0);
      const salesDifference = systemTotalSales - myTotalSales;
      const salesDiscrepancy = Math.abs(salesDifference) > 0.01;

      // Ensure table exists (simplified for cash only)
      await sql`
        CREATE TABLE IF NOT EXISTS cashier_entries (
          id TEXT PRIMARY KEY,
          date TEXT NOT NULL,
          initial_balance DECIMAL NOT NULL,
          cash_sales DECIMAL NOT NULL,
          cash_denominations JSONB NOT NULL,
          final_cash_balance DECIMAL NOT NULL,
          expenses JSONB DEFAULT '[]'::jsonb,
          total_expenses DECIMAL NOT NULL DEFAULT 0,
          manual_value_from_system DECIMAL NOT NULL,
          difference DECIMAL NOT NULL,
          discrepancy BOOLEAN NOT NULL,
          notes TEXT,
          system_cash_sales DECIMAL DEFAULT 0,
          system_card_sales DECIMAL DEFAULT 0,
          system_transfer_sales DECIMAL DEFAULT 0,
          system_total_sales DECIMAL DEFAULT 0,
          my_effective_sales DECIMAL DEFAULT 0,
          my_vouchers_accumulated DECIMAL DEFAULT 0,
          my_transfers_received DECIMAL DEFAULT 0,
          my_total_sales DECIMAL DEFAULT 0,
          sales_difference DECIMAL DEFAULT 0,
          sales_discrepancy BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;

      const id = `cashier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const result = await sql`
        INSERT INTO cashier_entries (
          id, date, initial_balance, cash_sales,
          cash_denominations, final_cash_balance, expenses, total_expenses,
          manual_value_from_system, difference, discrepancy, notes,
          system_cash_sales, system_card_sales, system_transfer_sales, system_total_sales,
          my_effective_sales, my_vouchers_accumulated, my_transfers_received, my_total_sales,
          sales_difference, sales_discrepancy
        )
        VALUES (
          ${id}, ${body.date}, ${body.initialBalance}, ${body.cashSales},
          ${JSON.stringify(body.cashDenominations)}, ${finalCashBalance},
          ${JSON.stringify(body.expenses || [])}, ${totalExpenses},
          ${body.manualValueFromSystem}, ${difference}, ${discrepancy}, ${body.notes || null},
          ${body.systemCashSales || 0}, ${body.systemCardSales || 0}, ${body.systemTransferSales || 0}, ${systemTotalSales},
          ${body.myEffectiveSales || 0}, ${body.myVouchersAccumulated || 0}, ${body.myTransfersReceived || 0}, ${myTotalSales},
          ${salesDifference}, ${salesDiscrepancy}
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

      if (body.cashDenominations || body.initialBalance !== undefined || body.expenses) {
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
        const expenses = body.expenses || JSON.parse(currentData.expenses || '[]');
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

        const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
        expectedTotal = initialBalance + totalCash - totalExpenses;
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
      if (body.expenses) {
        updateParts.push(`expenses = $${updateParts.length + 1}`);
        params.push(JSON.stringify(body.expenses));
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
