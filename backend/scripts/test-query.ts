import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function test() {
    const { data, error } = await supabaseAdmin
        .from('cotizaciones')
        .select(`
      *,
      clientes ( * ),
      usuarios ( id, nombre, email, puesto, telefono ),
      cotizacion_items ( * )
    `)
        .eq('id', 7)
        .single();

    if (error) {
        console.error('SUPABASE ERROR:', error);
    } else {
        console.log('SUCCESS:', data ? 'got data' : 'no data');
    }
}
test();
