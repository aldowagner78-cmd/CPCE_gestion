
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Leer .env.local manualmente para no depender de dotenv
const envPath = path.resolve('.env.local');
let envConfig = {};

try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            envConfig[key] = value;
        }
    });
} catch (e) {
    console.log('No se pudo leer .env.local', e);
}

const supabaseUrl = envConfig['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = envConfig['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.log('Error: Falta URL o Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
    console.log('Conectando a Supabase...');
    const { data, error } = await supabase
        .from('users')
        .select('email, role, is_superuser');

    if (error) {
        console.error('Error fetching users:', error);
    } else {
        console.log('Usuarios encontrados:', JSON.stringify(data, null, 2));
        if (!data || data.length === 0) {
            console.log('⚠️ No hay usuarios en la tabla publica.');
        }
    }
}

checkUsers();
