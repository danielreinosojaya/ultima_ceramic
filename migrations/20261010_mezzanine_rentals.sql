-- Agenda interna del mezzanine (espacio de arriba).
-- No referencia bookings y no entra en el cálculo de cupos del taller.
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
);

CREATE INDEX IF NOT EXISTS idx_mezzanine_rentals_date ON mezzanine_rentals(rental_date);
CREATE INDEX IF NOT EXISTS idx_mezzanine_rentals_status ON mezzanine_rentals(status);
