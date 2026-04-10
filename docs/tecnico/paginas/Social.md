# 📖 Manual Técnico: Funil de Aquisição Social (Explorar e Notificações)

Este módulo trata da porta de entrada e distribuição (matchmaking) do ecossistema PlayHub. As métricas coletadas aqui visam responder a duas perguntas vitais de Retenção (AARRR): "As pessoas encontram os parceiros?" e "Elas conseguem entrar nos times?".

## 🎯 Arquitetura de Conversão

O funil se divide em duas partes de responsabilidade distintas:

1. **Explorar (`PaginaExplorar.jsx`)**: Vitrine do Usuário (topo de funil). É aqui que o Atleta caça as Equipes ou demais Atletas para se conectar.
2. **Notificações (`PaginaNotificacoes.jsx`)**: Central de Conversão (fundo de funil). Onde as intenções viram ação final (o dono do time que aprova; o atleta que passa a bola de volta gerando o Match).

---

## 📡 Mapeamento de Telemetria (Protocolos Analíticos)

### 1. Explorar (Busca e Intenções)
- `explorar_realizou_busca`: Acionado ao usar os filtros de Tênis, Futebol, etc. Mostra-nos quais modalidades estão sendo mais buscadas sem sucesso e qual a dor demográfica (cidades sem times).
- `explorar_solicitou_ingresso`: **[KPI Crítico]** Mede quantas vezes Atletas batem na porta das Equipes (Click).
- `explorar_cancelou_solicitacao`: Permite medir o *Chourn de Espera* (ex: O atleta pediu e a equipe demorou dias, ele cancelou).
- `explorar_passou_bola`: Contagem das vezes que alguém curtiu o perfil de um outro atleta para networking local.

### 2. Notificações (Decisões e Matches)
- `notificacoes_avaliar_pedido_ingresso`: Captura se o dono da equipe abriu ativamente o card de alguém que quer entrar.
- `notificacoes_respondeu_convite_equipe`: Quando o atleta clica no convite (Aceitou vs Recusou). Monitorar a rejeição é crucial.
- `notificacoes_match_retribuiu_bola`: Quando dois atletas finalmente formam o pareamento mútuo (A bola volta pra quem jogou).
- `notificacoes_match_whatsapp`: Acesso final. Mostra qual porcentagem dos "matches" de fato culmina em um contato direto via WhatsApp (sucesso primário da funcionalidade).
