# 📖 Manual Técnico: Perfil Esportivo (Habilidades e Interesses)

O Perfil Esportivo é onde o atleta define sua identidade técnica, especialidades e modalidades de interesse dentro do PlayHub.

## 🎯 Objetivo da Página
Permitir que o usuário catalogue suas habilidades (posições e níveis) e selecione os esportes que deseja praticar, alimentando o motor de recomendações e convites de equipes.

---

## 🏗️ Arquitetura de Componentes
A página utiliza uma estrutura centralizada em `PaginaPerfilEsportivo.jsx`, organizada em blocos funcionais:

1.  **Bloco de Interesses:** Gerencia o array `esportes_interesse` na tabela `usuarios`. Permite a seleção múltipla de modalidades com sincronização em tempo real.
2.  **Bloco de Habilidades:** Gerencia registros na tabela `jogador_modalidades`. Cada entrada contém a modalidade, a posição preferencial e o nível técnico do atleta.
3.  **Sistema de Navegação:** Inclui atalhos para retorno fluido ao Perfil Pessoal via `aoNavegar`.

---

## 📡 Telemetria e Monitoramento
A página integra o serviço `rastrear` para monitorar a conversão de atletas em modalidades específicas:

### Eventos de Navegação
- `rastrear.pagina('Perfil Esportivo')`: Disparado na montagem da tela.

### Eventos de Clique
- `perfil_esp_toggle_interesse`: Rastreia a ativação/desativação de esportes na lista de interesses. (Metadata: `esporte`).
- `perfil_esp_add_habilidade`: Monitora quando o atleta formaliza uma posição e nível técnico. (Metadata: `modalidade`, `posicao`, `nivel`).
- `perfil_esp_remover_habilidade`: Rastreia a exclusão de competências técnicas.
- `perfil_esp_voltar_perfil`: Registra a navegação de retorno ao perfil pessoal.

### Monitoramento de Erros
- Logs automáticos em falhas de persistência no Supabase para as tabelas `usuarios` e `jogador_modalidades`.

---

## 🛠️ Dicas de Manutenção
- **ESPORTES_DATA:** Caso novas modalidades sejam adicionadas ao PlayHub, o objeto constante no topo do arquivo deve ser atualizado para liberar novas posições e filtros.
- **NIVEL_CLASSE:** As cores das badges de nível são controladas por este mapeamento em conjunto com o CSS de utilitários técnicos.
