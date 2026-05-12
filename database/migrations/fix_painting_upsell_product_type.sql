-- =============================================
-- MIGRATION: Fix product_type de los bookings del upsell de pintura
-- Fecha: 12 de Mayo 2026
-- Objetivo: Reclasificar reservas de pintura (upsell post-clase) que se
--           crearon con product_type='GROUP_EXPERIENCE' a 'CUSTOM_GROUP_EXPERIENCE'.
--           Motivo: el display en PDF, calendario y panel admin mostraba
--           "GROUP_EXPERIENCE" crudo. Los helpers ya saben mostrar
--           "Pintura de piezas" para CUSTOM_GROUP_EXPERIENCE + technique='painting'.
-- =============================================

-- IMPORTANTE: Ejecutar en Vercel Postgres (Neon) Dashboard.
-- Ejecutar dentro de una transacción para poder revertir si algo sale mal.

BEGIN;

-- 1) Inspeccionar antes de aplicar (recomendado correr este SELECT primero)
--    para confirmar qué bookings serán afectados.
--
-- SELECT b.id, b.booking_code, b.product_type, b.technique,
--        b.product->>'name' as product_name,
--        b.user_info->>'email' as customer_email,
--        d.id as delivery_id, d.painting_status
-- FROM bookings b
-- LEFT JOIN deliveries d
--        ON d.customer_email = b.user_info->>'email'
--       AND d.wants_painting = TRUE
-- WHERE b.product_type = 'GROUP_EXPERIENCE'
--   AND b.technique = 'painting';

-- 2a) Reclasificar product_type de GROUP_EXPERIENCE → CUSTOM_GROUP_EXPERIENCE
--     y actualizar el snapshot embebido en `product`. Solo bookings de pintura
--     que sabemos provienen del upsell. Criterio defensivo:
--     - product_type = 'GROUP_EXPERIENCE' (lo que el bug producía)
--     - technique = 'painting' (la marca distintiva del flujo de pintura)
--     Estos dos en conjunto NO los produce ningún otro flujo del sistema.
UPDATE bookings
SET product_type = 'CUSTOM_GROUP_EXPERIENCE',
    product = jsonb_set(
        COALESCE(product::jsonb, '{}'::jsonb),
        '{type}',
        '"CUSTOM_GROUP_EXPERIENCE"'::jsonb
    )
WHERE product_type = 'GROUP_EXPERIENCE'
  AND technique = 'painting';

-- 2b) Marcar TODOS los bookings del upsell (los recién reclasificados Y los que
--     ya estuvieran como CUSTOM_GROUP_EXPERIENCE + technique='painting' con
--     productId='painting_service') con product.kind = 'painting_upsell'.
--     Esto permite a la UI distinguir el upsell de otras pinturas
--     (catálogo / experiencia personalizada con técnica pintura).
UPDATE bookings
SET product = jsonb_set(
        COALESCE(product::jsonb, '{}'::jsonb),
        '{kind}',
        '"painting_upsell"'::jsonb
    )
WHERE product_type = 'CUSTOM_GROUP_EXPERIENCE'
  AND technique = 'painting'
  AND (
        product_id = 'painting_service'
        OR (product::jsonb)->>'id' = 'painting_service'
  )
  AND COALESCE((product::jsonb)->>'kind', '') <> 'painting_upsell';

-- 3) Verificación post-update (debe retornar 0 filas)
--    Si esto retorna >0 filas, ROLLBACK y revisar.
DO $$
DECLARE
    leftover_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO leftover_count
    FROM bookings
    WHERE product_type = 'GROUP_EXPERIENCE'
      AND technique = 'painting';

    IF leftover_count > 0 THEN
        RAISE EXCEPTION 'Aún quedan % bookings de pintura con product_type=GROUP_EXPERIENCE. Abortando.', leftover_count;
    END IF;
END $$;

COMMIT;

-- =============================================
-- ROLLBACK MANUAL (si fuera necesario en el futuro)
-- =============================================
-- BEGIN;
-- -- Quitar el marcador kind
-- UPDATE bookings
-- SET product = (product::jsonb) - 'kind'
-- WHERE product_type = 'CUSTOM_GROUP_EXPERIENCE'
--   AND technique = 'painting'
--   AND (product::jsonb)->>'kind' = 'painting_upsell';
--
-- -- Volver el tipo a GROUP_EXPERIENCE
-- UPDATE bookings
-- SET product_type = 'GROUP_EXPERIENCE',
--     product = jsonb_set(
--         COALESCE(product::jsonb, '{}'::jsonb),
--         '{type}',
--         '"GROUP_EXPERIENCE"'::jsonb
--     )
-- WHERE product_type = 'CUSTOM_GROUP_EXPERIENCE'
--   AND technique = 'painting';
-- COMMIT;
