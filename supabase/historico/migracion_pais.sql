-- Migración para añadir el campo 'pais' a la tabla 'clientes'
-- Esto permite soportar la multi-entidad (MX, US, CA) en los clientes

-- 1. Añadimos la columna 'pais' con valor por defecto 'MX'
-- Esto asegura que los registros existentes no se rompan
ALTER TABLE clientes 
ADD COLUMN pais TEXT NOT NULL DEFAULT 'MX' 
CHECK (pais IN ('MX', 'US', 'CA'));

-- 2. Creamos un índice para hacer más eficientes las búsquedas por país
CREATE INDEX idx_clientes_pais ON clientes(pais);
