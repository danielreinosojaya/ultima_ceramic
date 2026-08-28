-- Occupancy window for calendar / capacity.
-- Bookings must be queryable by WHEN THE CLASS HAPPENS, not when the row was created.

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS first_slot_date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_slot_date DATE;

CREATE OR REPLACE FUNCTION bookings_sync_occupancy_dates()
RETURNS trigger AS $fn$
DECLARE
  first_d date;
  last_d date;
BEGIN
  SELECT MIN(d), MAX(d)
  INTO first_d, last_d
  FROM (
    SELECT LEFT(elem->>'date', 10)::date AS d
    FROM jsonb_array_elements(COALESCE(NEW.slots, '[]'::jsonb)) elem
    WHERE (elem->>'date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
  ) dates;

  NEW.first_slot_date := first_d;
  NEW.last_slot_date := last_d;
  RETURN NEW;
END;
$fn$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bookings_occupancy_dates ON bookings;
CREATE TRIGGER trg_bookings_occupancy_dates
BEFORE INSERT OR UPDATE OF slots ON bookings
FOR EACH ROW
EXECUTE FUNCTION bookings_sync_occupancy_dates();

CREATE INDEX IF NOT EXISTS idx_bookings_occupancy
  ON bookings (last_slot_date, first_slot_date)
  WHERE first_slot_date IS NOT NULL;

UPDATE bookings b
SET first_slot_date = sub.first_d,
    last_slot_date = sub.last_d
FROM (
    SELECT
        b2.id,
        MIN(LEFT(s->>'date', 10)::date) FILTER (
            WHERE (s->>'date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
        ) AS first_d,
        MAX(LEFT(s->>'date', 10)::date) FILTER (
            WHERE (s->>'date') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
        ) AS last_d
    FROM bookings b2
    LEFT JOIN LATERAL jsonb_array_elements(COALESCE(b2.slots, '[]'::jsonb)) s ON TRUE
    WHERE b2.first_slot_date IS NULL
    GROUP BY b2.id
) sub
WHERE b.id = sub.id
  AND sub.first_d IS NOT NULL;
