# 📖 Manual Técnico: Perfil do Atleta (Pessoal)

O Perfil é o cartão de visitas do atleta no PlayHub. Ele permite que o usuário gerencie sua identidade, localização e preferências de visibilidade.

## 🎯 Objetivo da Página
Prover uma interface premium e intuitiva para a gestão de dados pessoais, garantindo que a localização seja capturada de forma granular para melhorar o matchmaking regional.

---

## 🏗️ Arquitetura de Componentes
A página foi modernizada e componentizada para garantir clareza e performance:

1.  **PaginaPerfil.jsx:** Orquestrador central. Gerencia o estado de edição, sincronização com o banco de dados e controle de navegação bidirecional.
2.  **VisualizacaoPerfil.jsx:** Interface premium estilizada com Glossmorphism. Exibe estatísticas consolidadas (Esportes, Idade, Equipes) e informações de contato.
3.  **EdicaoPerfilForms.jsx:** Formulário modularizado que gerencia o upload de fotos, busca de CEP via ViaCEP e entrada de dados granulares de endereço.

---

## 📡 Telemetria e Monitoramento
A página utiliza o serviço `rastrear` para monitorar a jornada do usuário e identificar gargalos no preenchimento:

### Eventos de Navegação
- `rastrear.pagina('Perfil')`: Disparado sempre que a página é montada.

### Eventos de Clique
- `perfil_editar_abrir`: Rastreia quantas vezes o usuário entra no modo de edição.
- `perfil_salvar`: Monitora o sucesso das atualizações de cadastro.
- `upload_foto_perfil`: Rastreia o interesse do usuário em personalizar sua foto.
- `perfil_buscar_cep`: Identifica o uso da ferramenta de preenchimento automático.
- `perfil_gerenciar_habilidades`: Rastreia o salto para o Perfil Esportivo.

### Integração de Dados
- **Endereço Granular:** Os campos `rua`, `numero`, `bairro`, `cidade` e `estado` são gravados de forma independente para permitir filtros geográficos precisos no futuro.

---

## 🛠️ Dicas de Manutenção
- **Estética Glassmorphism:** Todos os novos elementos visuais devem respeitar as variáveis de transparência definidas em `PaginaPerfil.css`.
- **Sincronia:** A função `buscarDadosUsuario` na montagem garante que o `form` esteja sempre em paridade com o último `update` feito no Perfil Esportivo.
