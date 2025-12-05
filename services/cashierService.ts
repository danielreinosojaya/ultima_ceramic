import { CashierEntry, CashDenomination } from '../types';

interface FetchOptions {
  method: string;
  headers: Record<string, string>;
  body?: string;
}

async function fetchAPI<T>(
  action: string,
  method: string = 'GET',
  body?: any,
  params?: Record<string, string>
): Promise<{ success: boolean; data?: T; error?: string }> {
  const url = new URL('/api/cashier', window.location.origin);
  url.searchParams.append('action', action);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const options: FetchOptions = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url.toString(), options);
  const result = await response.json();

  if (!response.ok) {
    return {
      success: false,
      error: result.error || 'API Error',
    };
  }

  return result;
}

export const cashierService = {
  // Create new cashier entry
  async create(entry: {
    date: string;
    initialBalance: number;
    previousSystemBalance: number;
    cashDenominations: Record<CashDenomination, number>;
    salesTC: number;
    transfers: number;
    manualValueFromSystem: number;
    notes?: string;
  }): Promise<CashierEntry> {
    const result = await fetchAPI<CashierEntry>(
      'create',
      'POST',
      entry
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create cashier entry');
    }

    return result.data;
  },

  // Get all entries or filter by date
  async listEntries(date?: string): Promise<CashierEntry[]> {
    const result = await fetchAPI<CashierEntry[]>(
      'list',
      'GET',
      undefined,
      date ? { date } : undefined
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch entries');
    }

    return result.data || [];
  },

  // Get single entry
  async getEntry(id: string): Promise<CashierEntry> {
    const result = await fetchAPI<CashierEntry>(
      'get',
      'GET',
      undefined,
      { id }
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch entry');
    }

    return result.data;
  },

  // Update entry
  async updateEntry(
    id: string,
    updates: Partial<{
      date: string;
      initialBalance: number;
      previousSystemBalance: number;
      cashDenominations: Record<CashDenomination, number>;
      salesTC: number;
      transfers: number;
      manualValueFromSystem: number;
      notes: string;
    }>
  ): Promise<CashierEntry> {
    const result = await fetchAPI<CashierEntry>(
      'update',
      'PUT',
      updates,
      { id }
    );

    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to update entry');
    }

    return result.data;
  },

  // Delete entry
  async deleteEntry(id: string): Promise<void> {
    const result = await fetchAPI(
      'delete',
      'DELETE',
      undefined,
      { id }
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to delete entry');
    }
  },
};
