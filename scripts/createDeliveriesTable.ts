import { sql } from '@vercel/postgres';

async function createDeliveriesTable() {
    try {
        console.log('Creating deliveries table...');
        
        // Create the deliveries table if it doesn't exist
        await sql`
            CREATE TABLE IF NOT EXISTS deliveries (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                customer_email VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                scheduled_date DATE NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                completed_at TIMESTAMPTZ NULL,
                notes TEXT NULL
            );
        `;
        
        console.log('Creating indexes...');
        
        // Create indexes for better performance
        await sql`CREATE INDEX IF NOT EXISTS idx_deliveries_customer_email ON deliveries(customer_email);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);`;
        await sql`CREATE INDEX IF NOT EXISTS idx_deliveries_scheduled_date ON deliveries(scheduled_date);`;
        
        console.log('Deliveries table and indexes created successfully!');
        
        // Test the table with a simple query
        const testQuery = await sql`SELECT COUNT(*) as count FROM deliveries;`;
        console.log(`Current deliveries count: ${testQuery.rows[0].count}`);
        
    } catch (error) {
        console.error('Error creating deliveries table:', error);
        throw error;
    }
}

// Run the migration
createDeliveriesTable()
    .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });