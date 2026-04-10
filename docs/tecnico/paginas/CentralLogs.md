# 🛡️ Manual Técnico: Central de Monitoramento Global (Upgrade Pro)

A Central de Monitoramento é a principal ferramenta de diagnóstico e auditoria do PlayHub.

## 🎯 Objetivo
Permitir que administradores identifiquem erros de sistema, monitorem comportamentos suspeitos e gerenciem logs técnicos de forma eficiente.

---

## 🚀 Funcionalidades Pro

### 1. Destaque Visual de Erros
- Registros do tipo **'ERRO'** são renderizados com fundo vermelho semi-transparente e borda sólida lateral.
- A tag de tipo possui uma animação de "pulsação" para garantir visibilidade imediata.

### 2. Condensação Inteligente (Agrupamento)
- O sistema processa a lista de logs antes da renderização.
- Se um usuário realizar a mesma ação na mesma página seguidamente, o sistema agrupa os registros e exibe um selo indicador (ex: `+3 repetidos`), limpando o ruído visual da tabela.

### 3. Exportação para CSV
- Botão localizado na barra de ferramentas superior.
- Gera um arquivo `.csv` compatível com Excel/Google Sheets.
- **Campos Exportados:** Timestamp, Usuário, E-mail, Tipo, Mensagem, Página e Metadados brutos (JSON).

### 4. Limpeza de Base (Zerar Logs)
- Botão localizado no cabeçalho (ícone de lixeira).
- **Segurança:** Exige confirmação em um modal dedicado antes de realizar o `DELETE` no banco de dados.

---

## 📡 Telemetria Injetada
A própria página é monitorada para evitar "pontos cegos":
- Rastreamento de cliques nos botões de Exportação e Limpeza.

---

## 🛠️ Dicas de Manutenção
- **Filtros Dinâmicos:** A listagem é integrada com o componente `Botao` para o carregamento incremental (Lazy Load) de 50 em 50 registros.
- **Metadata:** Em caso de erros, a coluna `metadata` contém o `stack trace` ou informações do erro disparado pelo JavaScript ou Supabase.
