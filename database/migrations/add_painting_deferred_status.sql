-- Permite estado "deferred": cobro del upsell acordado para después (admin puede agendar sin marcar pagado)
ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_painting_status_check;

ALTER TABLE deliveries
ADD CONSTRAINT deliveries_painting_status_check
CHECK (painting_status IN ('pending_payment', 'deferred', 'paid', 'scheduled', 'completed', NULL));

COMMENT ON COLUMN deliveries.painting_status IS 'pending_payment | deferred (cobro después) | paid | scheduled | completed';
