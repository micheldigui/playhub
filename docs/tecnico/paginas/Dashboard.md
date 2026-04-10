# 📖 Manual Técnico: Dashboard (Início)

O Dashboard é a porta de entrada principal do atleta no Playhub. Ele consolida informações de diversas fontes para fornecer um resumo operacional rápido.

## 🎯 Objetivo da Página
Prover ao usuário uma visão 360º de suas atividades esportivas, incluindo próximas partidas, saúde financeira nas equipes e atalhos rápidos para ferramentas de gestão.

---

## 🏗️ Arquitetura de Componentes
A página foi modularizada em componentes menores localizados em `./componentes/` para facilitar a manutenção:

1.  **DashboardHeader:** Gerencia a saudação e os estados de privacidade (Perfil Público e Visibilidade de WhatsApp).
2.  **SecaoAgendaDashboard:** Lista as próximas partidas filtradas pela equipe selecionada. Lida com a lógica de janelas de inscrição.
3.  **SecaoEquipesDashboard:** Carrossel interativo para alternância de contexto entre diferentes equipes.
4.  **SecaoFinanceiroDashboard:** Exibe o status de mensalidades e avulsos, consumindo dados do componente global `CardsDadosAtleta`.
5.  **GradeAtalhos:** Componente genérico para renderizar os botões de ação rápida (Pessoais e de Equipe).
6.  **ModalAtalhosDashboard:** Interface de personalização de atalhos baseada em `localStorage`.

---

## 🔐 Lógica de Permissões (Atalhos)
A exibição de atalhos de equipe segue uma hierarquia rigorosa definida em `DashboardConstants.js`:
- **Capitão (admin):** Visualiza todo o catálogo de gestão.
- **Vice-Capitão (sub_admin):** Visualiza apenas ferramentas para as quais possui permissão explícita no banco de dados.
- **Atleta (jogador):** Visualiza apenas ferramentas informativas (Mensalidades, Agenda, Fair Play).

---

## 📡 Telemetria e Monitoramento
A página integra o serviço `rastrear` para fornecer observabilidade total:

### Eventos de Navegação
- `rastrear.pagina('Dashboard')`: Disparado sempre que o atleta acessa o início.

### Eventos de Clique
- `toggle_privacidade`: Monitora mudanças na visibilidade do perfil.
- `toggle_whatsapp`: Monitora mudanças na visibilidade do número de contato.
- `toggle_atalho_[id]`: Monitora quais atalhos os usuários mais gostam de ocultar ou exibir.
- `nav_equipe_focada`: Rastreia o interesse do usuário em ver detalhes de uma equipe específica.

### Monitoramento de Erros
- Logs automáticos em falhas de comunicação com o Supabase nas funções `carregarPartidas` e `handlePrivacidade`.

---

## 🛠️ Dicas de Manutenção
- **Adicionar Novo Atalho:** Basta incluir o objeto no `CATALOGO_ATALHOS` dentro de `DashboardConstants.js`.
- **Ajustar Estilo dos Cards:** O layout utiliza CSS Grid (Bento Grid). As modificações devem ser feitas em `Dashboard.css`.
- **Mudar Lógica de Data:** A formatação e lógica de janelas de inscrição estão isoladas em `SecaoAgendaDashboard.jsx`.
