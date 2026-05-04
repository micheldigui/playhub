# Auditoria Supabase PlayHub

Gerado em 2026-05-04 a partir do export real do projeto Supabase.

Arquivos de referência:

- `supabase/schema_exports/supabase_schema_live.sql`
- `supabase/schema_exports/supabase_schema_live_catalog.md`
- `supabase/schema_exports/supabase_schema_live_introspection.json`

Escopo: análise somente leitura. Nenhuma alteração foi aplicada no banco de produção.

## Resumo Executivo

O schema real do Supabase está mais completo do que o schema manual usado anteriormente como referência. O banco possui RLS ativa nas tabelas principais, constraints únicas importantes e funções RPC já implantadas.

Mesmo assim, há pontos que exigem cuidado antes de crescer o uso em produção:

- policies permissivas em logs, partidas, presenças e votos coletivos;
- exposição ampla de dados pessoais em `usuarios` quando `perfil_publico = true`;
- funções `SECURITY DEFINER` que recebem `p_usuario_id` como parâmetro;
- coexistência de `partida_presencas` e `partidas_presencas`;
- ausência de um fluxo versionado e seguro de migrations.

## Estado Atual Exportado

- Extensões: 5
- Tabelas/views: 48
- Colunas: 482
- Constraints: 180
- Índices: 133
- Policies RLS: 61
- Funções: 51
- Triggers: 5

## Pontos Positivos Confirmados

### Constraints essenciais existem

O banco real possui constraints únicas que o front já pressupõe:

- `ciclos_financeiros(equipe_id, periodo)`
- `membros_equipe(equipe_id, usuario_id)`
- `mensalidades(equipe_id, usuario_id, periodo)`
- `pagamentos_avulsos(partida_id, usuario_id)`
- `partidas_presencas(partida_id, usuario_id)`
- `votos_mvp(partida_id, eleitor_id, candidato_id)`
- `votos_mvp(partida_id, eleitor_id, posicao)`
- `votos_time(partida_id, eleitor_id, posicao)`

Isso reduz risco de duplicidade em presença, pagamentos, mensalidades e votação.

### RLS está habilitada nas tabelas principais

As tabelas de domínio em `public` estão com RLS ligada, incluindo:

- `usuarios`
- `equipes`
- `membros_equipe`
- `partidas`
- `partidas_presencas`
- `financeiro_config`
- `mensalidades`
- `pagamentos_avulsos`
- `votos_mvp`
- `votos_time`
- `logs_sistema`

## Riscos P0

### Logs com leitura e escrita amplas

Policies atuais:

- `Permitir gravação de logs para todos`: `WITH CHECK (true)`
- `Permitir leitura para autenticados`: `USING (true)`

Risco: `logs_sistema` pode conter dados pessoais, metadados de navegação, stack de erro e contexto técnico. A leitura ampla aumenta exposição caso qualquer usuário autenticado consiga consultar a tabela diretamente.

Recomendação segura:

1. Não alterar imediatamente em produção.
2. Primeiro mapear quais telas dependem de leitura direta de `logs_sistema`.
3. Criar RPC administrativa para leitura de logs.
4. Trocar leitura direta por RPC.
5. Depois restringir SELECT direto da tabela.

### Perfil público expõe linha inteira de usuário

Policy atual:

- `usuarios_select_public`: `USING (perfil_publico = true)`

Risco: RLS filtra linhas, não colunas. Se um usuário tem perfil público, dados como email, telefone, endereço, data de nascimento, latitude/longitude e preferências podem ficar acessíveis conforme as queries do cliente.

Recomendação segura:

1. Criar view/RPC de perfil público com colunas mínimas.
2. Migrar telas públicas para essa view/RPC.
3. Depois restringir a policy direta da tabela `usuarios`.

## Riscos P1

### Policies abertas em partidas e presenças

Policies atuais:

- `partidas`: `Permitir acesso total às partidas` com `USING (true)`
- `partidas_presencas`: `Permitir leitura de presencas` com `USING (true)`
- `partida_presencas`: `Permitir acesso total às presenças` com `USING (true)`

Risco: facilita funcionamento público/convite, mas amplia superfície de leitura/escrita. A tabela singular `partida_presencas` parece legado e é a mais perigosa por ter `ALL USING (true)`.

Recomendação segura:

1. Confirmar se `partida_presencas` ainda tem dados ou uso no app.
2. Se não houver uso, criar plano de desativação gradual.
3. Para `partidas` e `partidas_presencas`, substituir acesso total por policies por equipe/membro/convite.

### Votos coletivos têm leitura pública

Policy atual:

- `votos_time`: `Participantes podem ver os votos do time` com `USING (true)`

Risco: qualquer usuário autenticado pode consultar votos coletivos, dependendo do acesso REST e das chaves públicas. Pode gerar exposição de comportamento de votação.

Recomendação segura:

1. Verificar se a tela de Hall da Fama precisa de voto bruto ou apenas agregados.
2. Criar RPC de resultado agregado por partida.
3. Fechar SELECT direto de `votos_time` para membros da equipe.

### Funções SECURITY DEFINER com `p_usuario_id`

Funções relevantes:

- `aceitar_transferencia_posse`
- `cancelar_transferencia_posse`
- `excluir_convite_seguro`
- `responder_convite_seguro`
- `sair_da_equipe_seguro`
- `solicitar_transferencia_posse`

Risco: funções com `SECURITY DEFINER` devem validar identidade usando `auth.uid()` internamente. Receber `p_usuario_id` do cliente é aceitável apenas se a função sempre comparar `p_usuario_id = auth.uid()` ou validar privilégio administrativo com rigor.

Recomendação segura:

1. Auditar uma função por vez.
2. Adicionar validação interna explícita quando faltar.
3. Garantir `SET search_path = public`.
4. Criar testes manuais de tentativa de acesso cruzado.

## Riscos P2

### Export e schema manual divergiam

O export manual anterior não mostrava várias constraints/policies existentes. Isso poderia levar a decisões erradas.

Recomendação:

- Tratar `supabase_schema_live.sql` como retrato auditável.
- Não usar o antigo schema manual como fonte final da verdade.
- Criar migrations versionadas para qualquer mudança futura.

### Tabela legada de presença

Há duas tabelas:

- `partida_presencas`
- `partidas_presencas`

Recomendação:

- Confirmar contagem de registros em ambas.
- Confirmar se algum código consulta a tabela singular.
- Planejar remoção somente se estiver comprovadamente sem uso.

## Plano Seguro De Ajustes

### Etapa 1: Preparação

- Manter export completo versionado localmente.
- Criar queries de diagnóstico somente leitura.
- Criar checklist de deploy e rollback.
- Revogar tokens temporários usados na exportação.

### Etapa 2: Baixo risco

- Ajustar documentação interna de schema.
- Melhorar textos de privacidade e termos.
- Validar variáveis de ambiente no front.
- Adicionar scripts de `lint`/`test` ou ao menos smoke test de build.

### Etapa 3: Segurança progressiva

- Trocar leitura de logs por RPC administrativa.
- Criar view/RPC de perfil público.
- Migrar telas públicas para dados minimizados.
- Restringir policies de `logs_sistema` e `usuarios`.

### Etapa 4: Dados esportivos

- Criar RPCs agregadas para resultados de votação.
- Restringir leitura direta de votos brutos.
- Revisar policies de `partidas` e `partidas_presencas`.

### Etapa 5: Limpeza

- Auditar `partida_presencas`.
- Planejar migração/remoção se estiver sem uso.
- Consolidar `PLAYHUB_DB_MASTER.sql` como artefato gerado ou substituí-lo por migrations.

## Próximo Passo Recomendado

Criar um pacote de diagnóstico SQL somente leitura com:

- contagem de registros por tabela crítica;
- verificação de uso de `partida_presencas`;
- usuários públicos com campos sensíveis preenchidos;
- volume e idade dos logs;
- top policies abertas;
- funções `SECURITY DEFINER` com parâmetros de usuário.

Esse pacote pode ser executado antes de qualquer mudança e não afeta usuários em produção.
