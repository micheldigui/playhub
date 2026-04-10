# 📝 Manual Técnico: Página de Cadastro

A Página de Cadastro é um dos fluxos mais críticos do PlayHub, orquestrando a criação de credenciais, coleta de dados geográficos e upload de mídia.

## 🎯 Objetivo
Prover uma experiência de onboarding fluida, segura e monitorada para novos atletas.

---

## 🏗️ Arquitetura Modular
Após a refatoração, a página foi dividida em componentes especializados para facilitar a manutenção:

1.  **`SecaoFotoCadastro.jsx`**: Gerencia o preview e upload de fotos. Possui um design "Nudge" (incentivo visual) para aumentar a conversão de uploads de perfil.
2.  **`SecaoDadosPessoais.jsx`**: Coleta nome, apelido, gênero e data de nascimento. Contém a lógica de verificação de idade.
3.  **`SecaoPrivacidadeContato.jsx`**: Gerencia o funil de contato (WhatsApp) e as travas de privacidade para menores de 18 anos.
4.  **`SecaoEnderecoCadastro.jsx`**: Integração com a API ViaCEP para auto-preenchimento de logradouros.
5.  **`SecaoSegurancaCadastro.jsx`**: Gestão de senhas e integração com os fluxos legais de Termos e Privacidade.
6.  **`CadastroConstants.js`**: Centraliza todas as máscaras de entrada e validadores de lógica de negócio.

---

## 🛡️ Regras de Segurança e Engajamento
O sistema equilibra o crescimento da rede com a proteção de dados sensíveis:

- **Adultos (Maioridade):** O padrão é **Perfil Público** e **WhatsApp Autorizado** (Opt-in automático). Para restringir o acesso, o usuário deve marcar as opções "Perfil Privado" ou "Não compartilhar número".
- **Menores de Idade:** A privacidade é **obrigatória**. Ao detectar uma data de nascimento que resulte em menos de 18 anos, o sistema força os estados para Privado/Oculto, bloqueia a alteração manual e exibe um banner de segurança.
- **Reatividade:** Caso o usuário corrija uma data de nascimento errada de 'Menor' para 'Adulto', os campos de privacidade são desbloqueados e o padrão de engajamento (Público) é restaurado automaticamente.
---

## 📡 Telemetria e UI Persuasiva
O Cadastro utiliza psicologia visual (Nudge) para incentivar o engajamento de usuários maiores de idade:
- **Mensagens dinâmicas:**
    - **Modo Público (Desmarcado):** Exibe dicas em **Verde/Azul** ressaltando ganhos de visibilidade.
    - **Modo Privado (Marcado):** Exibe alertas em **Vermelho** sobre a perda de convites e visibilidade na busca.
- **Rastreamento de Funil:**
    - `rastrear.pagina('Cadastro')`: Disparado no início.
    - `toggle_perfil_privado`: Monitora quando o usuário opta por se esconder.
    - `toggle_whatsapp_privado`: Monitora a restrição de contato direto.
    - `cadastro_confortado`: Sinal de sucesso total.

---

## 🛠️ Dicas de Manutenção
- **Storage:** Fotos de perfil são salvas no *bucket* `avatares` do Supabase, em sub-pastas nomeadas com o `user.id`.
- **CEP:** O auto-foco após a busca do CEP é controlado via `numeroRef` passado do orquestrador para a `SecaoEndereco`.
