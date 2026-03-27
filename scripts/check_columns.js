const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();
fetch(url + '/rest/v1/', { headers: { apikey: key, Authorization: 'Bearer ' + key } })
  .then(r => r.json())
  .then(data => {
    // PostgREST swagger
    const props = data.definitions ? data.definitions.interacoes.properties : data.components.schemas.interacoes.properties;
    console.log("COLUMNS: " + Object.keys(props).join(', '));
  })
  .catch(console.error);
