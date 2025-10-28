import { sql } from '@vercel/postgres';

/**
 * Deletes a customer and all related data from the database.
 * 
 * This function performs a cascading delete of:
 * - Bookings associated with the customer (by email in user_info)
 * - Deliveries linked to the customer's email
 * - Invoice requests for the customer's bookings
 * - The customer record itself (if exists in customers table)
 * 
 * @param customerEmail - The email of the customer to delete
 * @returns Promise<boolean> - True if customer was deleted, false if not found
 * @throws Error if database operation fails
 */
export async function deleteCustomerByEmail(customerEmail: string): Promise<boolean> {
    if (!customerEmail || typeof customerEmail !== 'string') {
        throw new Error('Customer email is required and must be a string');
    }

    try {
        console.log('[DATABASE] Deleting customer with email:', customerEmail);
        
        // Delete related data in correct order (respecting foreign key constraints)
        
        // 1. Delete invoice requests (depends on bookings)
        const invoiceDeleteResult = await sql`
            DELETE FROM invoice_requests 
            WHERE booking_id IN (
                SELECT id FROM bookings 
                WHERE user_info->>'email' = ${customerEmail}
            )
        `;
        console.log('[DATABASE] Deleted invoice_requests:', invoiceDeleteResult.rowCount);

        // 2. Delete deliveries (linked by customer email)
        const deliveriesDeleteResult = await sql`
            DELETE FROM deliveries 
            WHERE customer_email = ${customerEmail}
        `;
        console.log('[DATABASE] Deleted deliveries:', deliveriesDeleteResult.rowCount);

        // 3. Delete bookings (main data source)
        const bookingsDeleteResult = await sql`
            DELETE FROM bookings 
            WHERE user_info->>'email' = ${customerEmail}
        `;
        console.log('[DATABASE] Deleted bookings:', bookingsDeleteResult.rowCount);

        // 4. Delete from customers table if exists (standalone customers)
        const customersDeleteResult = await sql`
            DELETE FROM customers 
            WHERE email = ${customerEmail}
        `;
        console.log('[DATABASE] Deleted from customers table:', customersDeleteResult.rowCount);

        // Consider successful if at least one record was deleted
        const totalDeleted = (invoiceDeleteResult.rowCount || 0) + 
                            (deliveriesDeleteResult.rowCount || 0) + 
                            (bookingsDeleteResult.rowCount || 0) + 
                            (customersDeleteResult.rowCount || 0);

        console.log('[DATABASE] Total records deleted:', totalDeleted);
        return totalDeleted > 0;
    } catch (error) {
        console.error('[DATABASE] Error deleting customer:', error);
        throw new Error(`Failed to delete customer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
