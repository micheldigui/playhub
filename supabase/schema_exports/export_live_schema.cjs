const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const dbUrl = process.env.SUPABASE_DB_URL;
if (!dbUrl) {
  console.error('SUPABASE_DB_URL is required.');
  process.exit(1);
}

const outDir = __dirname;
const schemas = ['public', 'storage', 'auth'];

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

const sql = {
  extensions: `
    select extname, extversion
    from pg_extension
    order by extname
  `,
  tables: `
    select
      n.nspname as schema,
      c.relname as name,
      case c.relkind
        when 'r' then 'table'
        when 'p' then 'partitioned table'
        when 'v' then 'view'
        when 'm' then 'materialized view'
        when 'f' then 'foreign table'
      end as kind,
      c.relrowsecurity as rls_enabled,
      obj_description(c.oid, 'pg_class') as comment
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = any($1)
      and c.relkind in ('r','p','v','m','f')
    order by n.nspname, c.relname
  `,
  columns: `
    select
      n.nspname as schema,
      c.relname as table_name,
      a.attnum as ordinal_position,
      a.attname as column_name,
      pg_catalog.format_type(a.atttypid, a.atttypmod) as formatted_type,
      case
        when a.atttypid = 'pg_catalog.text[]'::regtype then 'ARRAY'
        else t.typcategory::text
      end as data_type,
      t.typname as udt_name,
      case when a.attnotnull then 'NO' else 'YES' end as is_nullable,
      pg_get_expr(d.adbin, d.adrelid) as column_default,
      null::integer as character_maximum_length,
      null::integer as numeric_precision,
      null::integer as numeric_scale,
      null::integer as datetime_precision
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where n.nspname = any($1)
      and c.relkind in ('r','p','v','m','f')
      and a.attnum > 0
      and not a.attisdropped
    order by n.nspname, c.relname, a.attnum
  `,
  constraints: `
    select
      n.nspname as schema,
      c.relname as table_name,
      con.conname as name,
      con.contype as type,
      pg_get_constraintdef(con.oid, true) as definition
    from pg_constraint con
    join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = any($1)
    order by n.nspname, c.relname, con.conname
  `,
  indexes: `
    select schemaname as schema, tablename as table_name, indexname as name, indexdef as definition
    from pg_indexes
    where schemaname = any($1)
    order by schemaname, tablename, indexname
  `,
  policies: `
    select schemaname as schema, tablename as table_name, policyname as name, permissive, roles, cmd, qual, with_check
    from pg_policies
    where schemaname = any($1)
    order by schemaname, tablename, policyname
  `,
  functions: `
    select
      n.nspname as schema,
      p.proname as name,
      pg_get_function_identity_arguments(p.oid) as arguments,
      pg_get_functiondef(p.oid) as definition
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = any($1)
    order by n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)
  `,
  triggers: `
    select
      n.nspname as schema,
      c.relname as table_name,
      t.tgname as name,
      pg_get_triggerdef(t.oid, true) as definition
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal
      and n.nspname = any($1)
    order by n.nspname, c.relname, t.tgname
  `,
  views: `
    select schemaname as schema, viewname as name, definition
    from pg_views
    where schemaname = any($1)
    order by schemaname, viewname
  `,
  grants: `
    select table_schema as schema, table_name, grantee, privilege_type
    from information_schema.role_table_grants
    where table_schema = any($1)
    order by table_schema, table_name, grantee, privilege_type
  `,
};

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function formatColumn(column) {
  let type = column.formatted_type || column.data_type;
  if (column.character_maximum_length) type += `(${column.character_maximum_length})`;
  if (column.numeric_precision && column.numeric_scale !== null) {
    type += `(${column.numeric_precision},${column.numeric_scale})`;
  }
  const parts = [quoteIdent(column.column_name), type];
  if (column.column_default) parts.push('DEFAULT ' + column.column_default);
  if (column.is_nullable === 'NO') parts.push('NOT NULL');
  return '  ' + parts.join(' ');
}

function renderSql(data) {
  const columnsByTable = new Map();
  for (const column of data.columns) {
    const key = `${column.schema}.${column.table_name}`;
    if (!columnsByTable.has(key)) columnsByTable.set(key, []);
    columnsByTable.get(key).push(column);
  }

  const lines = [];
  lines.push('-- PlayHub Supabase live schema introspection');
  lines.push(`-- Generated at ${new Date().toISOString()}`);
  lines.push('-- Schema-only export. No table data included.');
  lines.push('');

  for (const ext of data.extensions) {
    lines.push(`-- extension: ${ext.extname} ${ext.extversion}`);
  }
  lines.push('');

  for (const table of data.tables.filter(t => ['table', 'partitioned table', 'foreign table'].includes(t.kind))) {
    const key = `${table.schema}.${table.name}`;
    const cols = columnsByTable.get(key) || [];
    lines.push(`CREATE TABLE ${quoteIdent(table.schema)}.${quoteIdent(table.name)} (`);
    lines.push(cols.map(formatColumn).join(',\n'));
    lines.push(');');
    if (table.rls_enabled) {
      lines.push(`ALTER TABLE ${quoteIdent(table.schema)}.${quoteIdent(table.name)} ENABLE ROW LEVEL SECURITY;`);
    }
    lines.push('');
  }

  for (const view of data.views) {
    lines.push(`CREATE OR REPLACE VIEW ${quoteIdent(view.schema)}.${quoteIdent(view.name)} AS`);
    lines.push(view.definition.trim().replace(/;$/, '') + ';');
    lines.push('');
  }

  for (const constraint of data.constraints) {
    lines.push(`ALTER TABLE ONLY ${quoteIdent(constraint.schema)}.${quoteIdent(constraint.table_name)} ADD CONSTRAINT ${quoteIdent(constraint.name)} ${constraint.definition};`);
  }
  lines.push('');

  for (const index of data.indexes) {
    lines.push(index.definition + ';');
  }
  lines.push('');

  for (const fn of data.functions) {
    lines.push(fn.definition.trim());
    lines.push('');
  }

  for (const trigger of data.triggers) {
    lines.push(trigger.definition + ';');
  }
  lines.push('');

  for (const policy of data.policies) {
    const roles = Array.isArray(policy.roles) && policy.roles.length ? ` TO ${policy.roles.map(quoteIdent).join(', ')}` : '';
    const using = policy.qual ? ` USING (${policy.qual})` : '';
    const check = policy.with_check ? ` WITH CHECK (${policy.with_check})` : '';
    lines.push(`CREATE POLICY ${quoteIdent(policy.name)} ON ${quoteIdent(policy.schema)}.${quoteIdent(policy.table_name)} AS ${policy.permissive} FOR ${policy.cmd}${roles}${using}${check};`);
  }

  return lines.join('\n');
}

function renderMarkdown(data) {
  const lines = [];
  lines.push('# PlayHub Supabase live schema');
  lines.push('');
  lines.push(`Generated at ${new Date().toISOString()}. Schema-only; no row data exported.`);
  lines.push('');
  lines.push('## Counts');
  lines.push('');
  for (const key of Object.keys(data)) lines.push(`- ${key}: ${data[key].length}`);
  lines.push('');
  lines.push('## Tables');
  lines.push('');
  for (const table of data.tables) {
    lines.push(`- ${table.schema}.${table.name} (${table.kind}${table.rls_enabled ? ', RLS' : ''})`);
  }
  lines.push('');
  lines.push('## Policies');
  lines.push('');
  for (const policy of data.policies) {
    lines.push(`- ${policy.schema}.${policy.table_name}: ${policy.name} [${policy.cmd}]`);
  }
  lines.push('');
  lines.push('## Functions');
  lines.push('');
  for (const fn of data.functions) {
    lines.push(`- ${fn.schema}.${fn.name}(${fn.arguments})`);
  }
  return lines.join('\n');
}

(async () => {
  await client.connect();
  try {
    const data = {};
    for (const [key, query] of Object.entries(sql)) {
      const params = key === 'extensions' ? [] : [schemas];
      const result = await client.query(query, params);
      data[key] = result.rows;
    }

    fs.writeFileSync(path.join(outDir, 'supabase_schema_live_introspection.json'), JSON.stringify(data, null, 2));
    fs.writeFileSync(path.join(outDir, 'supabase_schema_live.sql'), renderSql(data));
    fs.writeFileSync(path.join(outDir, 'supabase_schema_live_catalog.md'), renderMarkdown(data));

    console.log(`Exported ${data.tables.length} tables/views, ${data.functions.length} functions, ${data.policies.length} policies.`);
  } finally {
    await client.end();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
