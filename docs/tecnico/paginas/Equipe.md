# 📖 Manual Técnico: Equipe (Página Principal e Gestão)

A Página de Equipe é o centro operacional de um time no PlayHub. Ela integra ferramentas de comunicação, gestão de membros e configurações de sede.

## 🎯 Objetivo da Página
Prover ao Capitão e aos Membros uma interface eficiente para a coordenação de partidas, convite de novos atletas e controle financeiro/administrativo da equipe.

---

## 🏗️ Arquitetura de Componentes
A página utiliza um sistema de abas alimentado pelo `EquipeContexto`:

1.  **PaginaEquipe.jsx:** Orquestrador que gerencia o carregamento dos dados da equipe ativa e a troca de contexto entre abas.
2.  **GestaoTab.jsx:** Interface administrativa exclusiva para Capitães e Vice-Capitães. Gerencia cargos e expulsões.
3.  **ModalCriacaoEquipe.jsx:** Formulário complexo para criação e edição de times.
4.  **FormEnderecoEquipe.jsx (NOVO):** Componente fatiado do modal, responsável pela gestão dos metadados geográficos da sede com Glassmorphism.

---

## 📡 Telemetria e Monitoramento
Implementação do rastreamento analítico para entender o engajamento e a retenção de líderes:

### Eventos de Navegação
- `rastrear.pagina('Equipe')`: Disparado ao acessar qualquer time.

### Eventos de Clique (Geral)
- `equipe_whatsapp_convite`: Rastreia o compartilhamento do link do time no WhatsApp.
- `equipe_copiar_link`: Monitora o uso da ferramenta de convite via link.
- `equipe_sair`: Registra quando um membro decide deixar a equipe.

### Eventos de Clique (Gestão)
- `equipe_membro_promover`: Registra a elevação de um jogador a Vice-Capitão.
- `equipe_membro_rebaixar`: Monitora a remoção de permissões administrativas.
- `equipe_membro_remover`: Rastreia a expulsão de membros do time.
- `equipe_transferir_posse`: (Crítico) Monitora a troca definitiva de liderança do time.

### Eventos de Clique (Configuração)
- `equipe_salvar_dados`: Rastreia a atualização dos dados da sede ou regras financeiras.
- `equipe_ajuste_escudo`: Monitora a personalização da identidade visual do time.

---

## 🛠️ Dicas de Manutenção
- **Segurança de Endereço:** O novo componente `FormEnderecoEquipe` sincroniza automaticamente `local_cidade` e `local_estado` com os campos raiz da tabela `equipes`, garantindo que filtros de busca regionais funcionem perfeitamente.
- **Hierarquia Visual:** Cores e ícones nas abas de gestão devem seguir as variáveis definidas em `PaginaEquipe.css`.
