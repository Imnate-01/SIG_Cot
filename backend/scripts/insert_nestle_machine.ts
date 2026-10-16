import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function insertMachine() {
    console.log('Inserting Machine...');
    const { data, error } = await supabaseAdmin
        .from('cliente_maquinas')
        .insert({
            cliente_id: 70, // Nestle
            modelo_maquina: 'CFA 810-32',
            serie: '8608 51 002',
            machine_id: 'CFA 810-32 8608 51 002'
        })
        .select()
        .single();

    if (error) {
        console.error('SUPABASE ERROR:', error);
        
        // Wait, what if there's no cliente_id but direccion_id? Let's check columns
        const { data: cols, error: errCols } = await supabaseAdmin
            .from('cliente_maquinas')
            .select('*')
            .limit(1);
        console.log('Columns in cliente_maquinas:', cols);
    } else {
        console.log('SUCCESS:', data);
    }
}

insertMachine();
