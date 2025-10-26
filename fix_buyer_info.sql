-- Hacer buyer_info nullable para permitir INSERT sin ese campo
ALTER TABLE giftcards ALTER COLUMN buyer_info DROP NOT NULL;
