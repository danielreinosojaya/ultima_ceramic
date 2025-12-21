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

      const id = `cashier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Step 1: Ensure minimal table exists
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS cashier_entries (
            id TEXT PRIMARY KEY,
            date TEXT NOT NULL,
            initial_balance DECIMAL NOT NULL,
            cash_denominations JSONB NOT NULL,
            manual_value_from_system DECIMAL NOT NULL,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;
      } catch (e) {
        // Table might already exist, continue
      }

      // Step 2: Add all columns safely using individual ALTER commands
      const allColumns = [
        'cash_sales',
        'final_cash_balance',
        'expenses',
        'total_expenses',
        'difference',
        'discrepancy',
        'notes',
        'system_cash_sales',
        'system_card_sales',
        'system_transfer_sales',
        'system_total_sales',
        'my_effective_sales',
        'my_vouchers_accumulated',
        'my_transfers_received',
        'my_total_sales',
        'sales_difference',
        'sales_discrepancy',
      ];

      // Get existing columns to avoid duplicates
      let existingColumns: string[] = [];
      try {
        const colResult = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'cashier_entries'
        `;
        existingColumns = colResult.rows.map((r: any) => r.column_name);
      } catch (e) {
        console.warn('Could not fetch columns, will attempt all migrations');
      }

      // Add missing columns one by one
      const columnDefs: Record<string, string> = {
        'cash_sales': 'DECIMAL DEFAULT 0',
        'final_cash_balance': 'DECIMAL DEFAULT 0',
        'expenses': "JSONB DEFAULT '[]'::jsonb",
        'total_expenses': 'DECIMAL DEFAULT 0',
        'difference': 'DECIMAL DEFAULT 0',
        'discrepancy': 'BOOLEAN DEFAULT false',
        'notes': 'TEXT',
        'system_cash_sales': 'DECIMAL DEFAULT 0',
        'system_card_sales': 'DECIMAL DEFAULT 0',
        'system_transfer_sales': 'DECIMAL DEFAULT 0',
        'system_total_sales': 'DECIMAL DEFAULT 0',
        'my_effective_sales': 'DECIMAL DEFAULT 0',
        'my_vouchers_accumulated': 'DECIMAL DEFAULT 0',
        'my_transfers_received': 'DECIMAL DEFAULT 0',
        'my_total_sales': 'DECIMAL DEFAULT 0',
        'sales_difference': 'DECIMAL DEFAULT 0',
        'sales_discrepancy': 'BOOLEAN DEFAULT false',
      };

      for (const col of allColumns) {
        if (!existingColumns.includes(col)) {
          try {
            await sql.unsafe(`ALTER TABLE cashier_entries ADD COLUMN ${col} ${columnDefs[col]}`);
          } catch (err: any) {
            console.warn(`Could not add column ${col}:`, err.message);
          }
        }
      }

      // Step 3: Re-query actual columns after migration attempts
      try {
        const finalColResult = await sql`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'cashier_entries'
        `;
        existingColumns = finalColResult.rows.map((r: any) => r.column_name);
      } catch (e) {
        console.error('Failed to re-query columns after migration');
      }

      // Step 4: Build dynamic INSERT based on actual existing columns
      const dataMap: Record<string, any> = {
        'id': id,
        'date': body.date,
        'initial_balance': body.initialBalance,
        'cash_sales': body.cashSales,
        'cash_denominations': JSON.stringify(body.cashDenominations),
        'final_cash_balance': finalCashBalance,
        'expenses': JSON.stringify(body.expenses || []),
        'total_expenses': totalExpenses,
        'manual_value_from_system': body.manualValueFromSystem,
        'difference': difference,
        'discrepancy': discrepancy,
        'notes': body.notes || null,
        'system_cash_sales': body.systemCashSales || 0,
        'system_card_sales': body.systemCardSales || 0,
        'system_transfer_sales': body.systemTransferSales || 0,
        'system_total_sales': systemTotalSales,
        'my_effective_sales': body.myEffectiveSales || 0,
        'my_vouchers_accumulated': body.myVouchersAccumulated || 0,
        'my_transfers_received': body.myTransfersReceived || 0,
        'my_total_sales': myTotalSales,
        'sales_difference': salesDifference,
        'sales_discrepancy': salesDiscrepancy,
      };

      // Filter to only columns that exist
      const insertColumns = Object.keys(dataMap).filter(col => existingColumns.includes(col));
      const insertValues = insertColumns.map(col => dataMap[col]);

      // Build dynamic query
      const colsList = insertColumns.join(', ');
      const placeholders = insertColumns.map((_, i) => `$${i + 1}`).join(', ');
      
      const insertQuery = `
        INSERT INTO cashier_entries (${colsList})
        VALUES (${placeholders})
        RETURNING *
      `;

      const result = await sql.unsafe(insertQuery, insertValues);

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
