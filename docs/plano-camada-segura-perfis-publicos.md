# Plano - Camada Segura de Perfis Publicos

## Objetivo

Reduzir a exposicao direta da tabela `public.usuarios` nas buscas publicas de atletas, sem mudar a experiencia atual e sem bloquear fluxos em producao.

## O que sera criado

Migration:

- `supabase/migrations/20260504_public_profiles_safe_layer.sql`

Funcoes:

- `public.buscar_atletas_publicos_seguro(...)`
- `public.buscar_perfil_publico_atleta_seguro(uuid)`
- `public.obter_whatsapp_match_seguro(uuid)`

Arquivo de teste:

- `supabase/schema_exports/teste_rpc_perfis_publicos_readonly.sql`

## Dados expostos pelas funcoes

### Busca de atletas

Retorna apenas:

- `id`
- `nome_completo`
- `apelido`
- `foto_url`
- `cidade`
- `estado`
- `idade`
- `esportes_interesse`
- `compartilhar_whatsapp_match`

Nao retorna:

- `email`
- `telefone`
- `data_nascimento`
- `cep`
- `rua`
- `numero`
- `complemento`
- `bairro`

### Perfil publico

Segue a mesma ideia da busca: mostra dados publicos e idade calculada, sem data de nascimento completa ou contato direto.

### WhatsApp por match

O telefone so e retornado quando:

- o usuario esta autenticado;
- o alvo existe;
- ambos permitem compartilhamento de WhatsApp;
- ambos tem maioridade confirmada;
- existe interacao de ida e volta do tipo `bola`.

## Por que o risco e baixo

Esta etapa e aditiva:

- nao remove tabelas;
- nao altera colunas;
- nao apaga dados;
- nao endurece RLS ainda;
- nao muda policies existentes;
- nao troca o front automaticamente.

O front so usa as RPCs se a variavel `VITE_USAR_RPC_PERFIS_PUBLICOS=true` estiver ativa. Sem essa variavel, continua usando o fluxo atual.

## Ordem recomendada

1. Aplicar a migration no Supabase.
2. Rodar `supabase/schema_exports/teste_rpc_perfis_publicos_readonly.sql`.
3. Conferir se as funcoes retornam somente campos publicos.
4. Ativar `VITE_USAR_RPC_PERFIS_PUBLICOS=true` em ambiente local ou preview.
5. Testar:
   - login;
   - buscar atletas em Explorar;
   - buscar atletas dentro da Area da Equipe;
   - abrir modal de perfil;
   - passar bola;
   - fluxo de match/WhatsApp.
6. So depois ativar a variavel em producao e fazer deploy.

## Rollback

Se algo se comportar mal, o rollback operacional imediato e simples:

1. Remover/desativar `VITE_USAR_RPC_PERFIS_PUBLICOS=true`.
2. Fazer novo deploy.

O app volta para o fallback legado.

Rollback de banco, se necessario:

```sql
drop function if exists public.buscar_atletas_publicos_seguro(text, text, text, text, text, integer, integer);
drop function if exists public.buscar_perfil_publico_atleta_seguro(uuid);
drop function if exists public.obter_whatsapp_match_seguro(uuid);
```

## Proxima etapa, em outro momento

Depois que essa camada estiver validada, podemos pensar em endurecer as policies de `public.usuarios`. Essa parte deve ser feita em uma janela separada, porque ai sim existe risco maior de quebrar leituras antigas.
