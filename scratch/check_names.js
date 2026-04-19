
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ftwdixnimxpiigjzxutt.supabase.co',
  'sb_publishable_zGEA8TYPPgkY2JxfXepGnA_WXlraU9I'
);

async function checkNames() {
  const { data: perfis } = await supabase.from('usuarios').select('nome_completo').limit(20);
  console.log(perfis);
}

checkNames();
