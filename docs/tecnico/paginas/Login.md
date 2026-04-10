# 🔐 Manual Técnico: Página de Login

A Página de Login é o primeiro ponto de contato para usuários recorrentes do PlayHub, integrada diretamente ao sistema de autenticação do Supabase.

## 🎯 Objetivo
Habilitar o acesso seguro de atletas e gestores às suas respectivas contas, garantindo uma interface rápida e com feedback claro sobre erros de credenciais.

---

## 🏗️ Funcionamento Técnico
O login utiliza o método `signInWithPassword` do **Supabase Auth**.

### Fluxo de Autenticação:
1.  **Entrada:** O usuário digita E-mail e Senha (com opção de visualização via ícone de olho).
2.  **Processamento:** O componente gerencia o estado `carregando` para evitar cliques duplicados e disparar o spinner no botão.
3.  **Resultado:** Em caso de sucesso, o contexto de autenticação do React é atualizado automaticamente. Em caso de erro, uma mensagem amigável é exibida e o erro técnico é enviado para a telemetria.

---

## 📡 Telemetria e Monitoramento
A observabilidade nesta página é crítica para detectar ataques de força bruta ou problemas de usabilidade.

### Eventos Rastreados:
- `rastrear.pagina('Login')`: Disparado ao carregar o formulário.
- `tentativa_login`: Registra cada clique no botão de entrar.
- `login_sucesso`: Confirmado apenas quando o Supabase retorna o usuário validado.
- `toggle_senha_login`: Rastreia o uso do recurso de visualização da senha.
- `nav_cadastro`: Rastreia quantos usuários desistem do login para criar uma conta nova.

### Monitoramento de Erros:
- Qualquer falha no `signInWithPassword` gera um evento de erro com o `err.message` original para diagnóstico no painel administrativo.

---

## 🛠️ Dicas de Manutenção
- **Estilos:** A página compartilha estilos com o cadastro em `PaginaAutenticacao.css`.
- **UX:** O campo de e-mail possui `autoFocus` para permitir que o usuário comece a digitar imediatamente após o carregamento.
- **Ícones:** Utiliza o pacote `lucide-react` para os indicadores visuais de campos e ações.
