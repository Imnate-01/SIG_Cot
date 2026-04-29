-- Migración para crear la tabla de Cotizaciones US Standard Rates

CREATE TABLE cotizaciones_us_standard (
  id SERIAL PRIMARY KEY,
  quote_number TEXT,
  customer TEXT NOT NULL,
  city_state TEXT,
  scope_of_visit TEXT,
  equipment_to_service TEXT,
  payment_terms TEXT,
  quoted_by TEXT,
  quote_date DATE DEFAULT NOW(),
  
  -- Estructuras JSON para almacenar los arrays de los cronogramas
  travel_legs JSONB DEFAULT '[]',
  labor_schedule JSONB DEFAULT '[]',
  
  -- Subtotales directos
  preparation_amount NUMERIC DEFAULT 0,
  expenses_amount NUMERIC DEFAULT 0,
  calibration_amount NUMERIC DEFAULT 0,
  sales_accommodation_amount NUMERIC DEFAULT 0,
  
  travel_subtotal NUMERIC DEFAULT 0,
  labor_subtotal NUMERIC DEFAULT 0,
  grand_total NUMERIC DEFAULT 0,
  
  -- Toda la información cruda del formulario frontend para facilitar la recreación del PDF
  datos_forma JSONB,
  
  -- Metadatos del sistema
  estado TEXT DEFAULT 'borrador',
  creado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para mantener el updated_at actualizado
CREATE OR REPLACE FUNCTION update_cotizaciones_us_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_cotizaciones_us_modtime
BEFORE UPDATE ON cotizaciones_us_standard
FOR EACH ROW EXECUTE PROCEDURE update_cotizaciones_us_updated_at_column();

-- Políticas RLS (Row Level Security) básicas
ALTER TABLE cotizaciones_us_standard ENABLE ROW LEVEL SECURITY;

-- Permitir a todos los usuarios autenticados ver y crear cotizaciones
CREATE POLICY "Usuarios pueden ver todas las cotizaciones US"
  ON cotizaciones_us_standard FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden insertar cotizaciones US"
  ON cotizaciones_us_standard FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden actualizar cotizaciones US"
  ON cotizaciones_us_standard FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios pueden eliminar cotizaciones US"
  ON cotizaciones_us_standard FOR DELETE
  USING (auth.role() = 'authenticated');
