import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function insertFlightCost() {
    console.log('Inserting Costo de Vuelo...');
    const { data, error } = await supabaseAdmin
        .from('servicios')
        .insert({
            concepto: 'Costo de Vuelo',
            unidad: 'viaje',
            precio_sin_contrato: 0,
            precio_con_contrato: 0,
            moneda: 'USD',
            categoria: 'Gastos de Viaje',
            region: 'MX',
            activo: true
        })
        .select()
        .single();

    if (error) {
        console.error('SUPABASE ERROR:', error);
    } else {
        console.log('SUCCESS:', data);
    }
}

insertFlightCost();
