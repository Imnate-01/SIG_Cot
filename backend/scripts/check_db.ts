import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkDb() {
    console.log('--- SERVICIOS ---');
    const { data: servicios, error: err1 } = await supabaseAdmin
        .from('servicios')
        .select('*')
        .eq('activo', true)
        .order('id');
    
    if (err1) console.error(err1);
    else console.log(servicios.map(s => `[${s.id}] ${s.concepto} (${s.region})`).join('\n'));

    console.log('\n--- CLIENTES ---');
    const { data: clientes, error: err2 } = await supabaseAdmin
        .from('clientes')
        .select('*');

    if (err2) console.error(err2);
    else {
        const nestle = clientes.filter(c => c.nombre.toLowerCase().includes('nestle') || c.nombre.toLowerCase().includes('nestlé'));
        console.log('Nestle Clients:', nestle);
    }
}

checkDb();
