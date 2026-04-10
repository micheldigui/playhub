# 📖 Manual Técnico: Gestão Financeira (Mensalistas e Avulsos)

O módulo Financeiro do PlayHub é o coração sustentável das equipes, projetado para separar as cobranças contínuas (Mensalistas) da arrecadação eventual de jogo (Avulsos).

## 🎯 Objetivo do Módulo
Permitir que Capitães e Gestores Financeiros controlem em uma única Interface Glassmorphism os pagamentos de mensalidades, faturas vencidas, e arrecadações isoladas de quem completa jogo, fornecendo balancetes rápidos via WhatsApp.

---

## 🏗️ Arquitetura de Componentes
- **FinanceiroTab.jsx**: Centro de comando para a criação e manutenção de "Ciclos Mensais". Exige controle severo pois injeta mensalidades em massa e define o "Custo da Quadra" do mês.
- **FinanceiroAvulsos.jsx**: Interface atrelada diretamente à presença em jogos. Monitora as participações diárias transformadas em débitos financeiros.
- **FinanceiroDashboard.jsx**: Agregador de análises que apresenta lucro global e estatísticas da saúde financeira do time.

---

## 📡 Mapeamento de Telemetria (Protocolos de Rastreamento)

O módulo financeiro é a parte mais sensível do sistema. Sua telemetria foi modelada para monitorar a conversão de pagamentos e entender se as automações de cobrança estão funcionando.

### Mensalistas (Gestão de Ciclo)
- `financeiro_inicializar_ciclo`: Capturado quando um gestor automatiza a criação de dívidas para todos os membros fixos no início do mês.
- `financeiro_salvar_config_mensalistas`: Monitora as alterações nas regras de negócio da equipe (Valor, Vencimento, Custo Quadra).
- `financeiro_alternar_pagamento_mensalista`: Disparado sempre que um valor entra (Pago) ou sai (Pendente) do caixa.
- `financeiro_adicionar_mensalista_ciclo`: Usado para medir quanta adição manual ocorre fora do ciclo regular.
- `financeiro_remover_mensalista_ciclo`: Retirada ou isenção de pagamento.
- `financeiro_remover_ciclo_vazio`: Quando o gestor anula um mês.
- `financeiro_whatsapp_mensalistas`: **(Métrica Chave)** Uso da funcionalidade de cobrança transparente via grupo de mensageria.

### Avulsos (Ato do Jogo)
- `financeiro_avulso_alternar_pagamento`: Morte da dívida isolada. Se houver conversão alta após os jogos, o fluxo está saudável.
- `financeiro_avulso_anular`: Perdão ou exclusão de fatura indevida. 
