-- Eventos personalizados internos (grupos privados fuera del catálogo).
-- Solo agenda admin: no ocupa cupos ni bloquea el calendario público.
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
);

CREATE INDEX IF NOT EXISTS idx_private_custom_events_date ON private_custom_events(event_date);
CREATE INDEX IF NOT EXISTS idx_private_custom_events_status ON private_custom_events(status);
CREATE INDEX IF NOT EXISTS idx_private_custom_events_payment ON private_custom_events(payment_status);
