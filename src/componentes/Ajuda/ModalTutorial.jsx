import React, { useState, useEffect } from 'react';
import Modal from '../Modal/Modal';
import { 
  User, Shield, ShieldCheck, Zap, 
  Trophy, Calendar, DollarSign, MessageCircle,
  Globe, Users, PlayCircle, ExternalLink, Youtube, Smartphone, Mail
} from 'lucide-react';
import { SUPORTE } from '../../config/suporte';
import './ModalTutorial.css';

const ModalTutorial = ({ isOpen, onClose, abaInicial = 'atleta' }) => {
  const [abaAtiva, setAbaAtiva] = useState(abaInicial);

  // Sincroniza a aba ativa quando o modal abre (caso seja chamado por atalhos diferentes)
  useEffect(() => {
    if (isOpen) setAbaAtiva(abaInicial);
  }, [isOpen, abaInicial]);

  const abas = [
    { id: 'atleta', label: 'Atleta', icon: <User size={18} /> },
    { id: 'capitao', label: 'Capitão', icon: <Shield size={18} /> },
    { id: 'vice', label: 'Vice-Capitão', icon: <ShieldCheck size={18} /> },
    { id: 'videos', label: 'Vídeos', icon: <Youtube size={18} /> }
  ];

  const VIDEOS_TUTORIAL = [
    { id: '6zmaDjac1yM', titulo: 'PlayHub: A Solução Definitiva', desc: 'Entenda como o PlayHub revoluciona a gestão do seu time.' },
    { id: 'KW6tgPcLDm0', titulo: 'Tutorial: Instalar no Android', desc: 'Passo a passo rápido para ter o app no seu smartphone Android.' },
    { id: 'c0zyeVAL1tE', titulo: 'Tutorial: Instalar no iPhone', desc: 'Como adicionar o PlayHub na tela de início do seu iOS.' },
    { id: 'tnuiicFBf4E', titulo: 'Encontrar Jogadores e Times', desc: 'Use o Explorar para achar novos craques ou equipes na região.' },
    { id: 'r9uekAd4WRc', titulo: 'Configurar Perfil e Habilidades', desc: 'Destaque-se no time preenchendo todos os seus dados esportivos.' },
    { id: 'EiIF2A-BGoA', titulo: 'Criar e Gerenciar seu Time', desc: 'Guia completo para Capitães dominarem as ferramentas de gestão.' }
  ];

  const renderConteudo = () => {
    switch (abaAtiva) {
      case 'atleta':
        return (
          <div className="tutorial-conteudo animacao-entrada">
            <div className="tutorial-item">
              <div className="tutorial-icone"><Smartphone size={24} /></div>
              <div className="tutorial-texto">
                <h4>Instalação e Acesso</h4>
                <p>O PlayHub é um PWA. Para uma melhor experiência, adicione-o à tela de início do seu dispositivo:</p>
                <div style={{ marginTop: '8px' }}>
                  <a href="https://www.youtube.com/playlist?list=PLL3QBAHD-EYz4Ahj0M-IniOzdVdqWpNS5" target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', color: '#ff0000', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Youtube size={16} /> Ver Playlist de Tutoriais
                  </a>
                </div>
              </div>
            </div>
            <div className="tutorial-item">
              <div className="tutorial-icone"><User size={24} /></div>
              <div className="tutorial-texto">
                <h4>Perfil Esportivo e Habilidades</h4>
                <p>Mantenha seu **Perfil Esportivo** sempre atualizado. Defina suas posições, nível técnico e atributos. Isso ajuda capitães a te encontrarem na busca por atletas.</p>
              </div>
            </div>
            <div className="tutorial-item">
              <div className="tutorial-icone"><Globe size={24} /></div>
              <div className="tutorial-texto">
                <h4>Encontre seu Jogo</h4>
                <p>Use a aba **Explorar** para buscar equipes na sua região. Demonstre interesse em equipes públicas e, se houver "Match", o contato via WhatsApp é liberado na hora!</p>
              </div>
            </div>
          </div>
        );
      case 'capitao':
        return (
          <div className="tutorial-conteudo animacao-entrada">
            <div className="tutorial-item">
              <div className="tutorial-icone blue-glow"><Trophy size={24} /></div>
              <div className="tutorial-texto">
                <h4>Gestão Completa de Equipe</h4>
                <p>O PlayHub é a solução definitiva. Crie sua equipe, customize o escudo e defina as **Regras do Time** (como tempo de cancelamento e limite de jogadores).</p>
              </div>
            </div>
            <div className="tutorial-item">
              <div className="tutorial-icone"><DollarSign size={24} /></div>
              <div className="tutorial-texto">
                <h4>Controle Financeiro Rigoroso</h4>
                <p>Gerencie mensalistas e avulsos de forma automática. O sistema controla quem pagou e bloqueia inscrições de inadimplentes se você configurar assim.</p>
              </div>
            </div>
            <div className="tutorial-item">
              <div className="tutorial-icone"><Users size={24} /></div>
              <div className="tutorial-texto">
                <h4>Convocação e Presença</h4>
                <p>Crie partidas em segundos. Seus atletas recebem notificações e podem confirmar presença direto pelo app, gerando a lista de chamada em tempo real.</p>
              </div>
            </div>
          </div>
        );
      case 'vice':
        return (
          <div className="tutorial-conteudo animacao-entrada">
            <div className="tutorial-item">
              <div className="tutorial-icone"><ShieldCheck size={24} /></div>
              <div className="tutorial-texto">
                <h4>Braço Direito</h4>
                <p>O Vice-Capitão ajuda na organização. Ele pode aprovar membros, criar partidas e marcar pagamentos tanto quanto o Capitão.</p>
              </div>
            </div>
            <div className="tutorial-item">
              <div className="tutorial-icone"><MessageCircle size={24} /></div>
              <div className="tutorial-texto">
                <h4>Comunicação</h4>
                <p>Mantenha o grupo unido. Use as ferramentas de gestão para garantir que todos recebam os avisos das próximas partidas.</p>
              </div>
            </div>
          </div>
        );
      case 'videos':
        return (
          <div className="tutorial-conteudo tutorial-videos animacao-entrada">
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
              Assista nossos tutoriais rápidos para dominar o PlayHub em poucos minutos!
            </p>
            <div className="lista-videos-tutorial">
              {VIDEOS_TUTORIAL.map(v => (
                <a 
                  key={v.id} 
                  href={`https://www.youtube.com/watch?v=${v.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="video-item-ajuda"
                >
                  <div className="video-thumbnail">
                    <img src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`} alt={v.titulo} />
                    <div className="video-play-overlay"><PlayCircle size={32} /></div>
                  </div>
                  <div className="video-info-ajuda">
                    <h4>{v.titulo}</h4>
                    <p>{v.desc}</p>
                    <span className="btn-assistir-yt">Assistir Tutorial <ExternalLink size={12} /></span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Guia PlayHub" 
      maxWidth="600px"
    >
      <div className="tutorial-container">
        <div className="tutorial-abas">
          {abas.map(aba => (
            <button 
              key={aba.id}
              className={`aba-tutorial ${abaAtiva === aba.id ? 'ativa' : ''}`}
              onClick={() => setAbaAtiva(aba.id)}
            >
              {aba.icon}
              <span>{aba.label}</span>
            </button>
          ))}
        </div>

        <div className="tutorial-janela">
          {renderConteudo()}
        </div>

        <div className="tutorial-footer">
          <p>Dúvidas? Entre em contato com o suporte da PlayHub.</p>
          <div className="suporte-email-tutorial">
            <Mail size={14} /> <span>{SUPORTE.EMAIL}</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ModalTutorial;
