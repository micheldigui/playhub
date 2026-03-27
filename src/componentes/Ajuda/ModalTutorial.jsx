import React, { useState } from 'react';
import Modal from '../Modal/Modal';
import { 
  User, Shield, ShieldCheck, Zap, 
  Trophy, Calendar, DollarSign, MessageCircle,
  Globe, Users
} from 'lucide-react';
import './ModalTutorial.css';

const ModalTutorial = ({ isOpen, onClose }) => {
  const [abaAtiva, setAbaAtiva] = useState('atleta');

  const abas = [
    { id: 'atleta', label: 'Atleta', icon: <User size={18} /> },
    { id: 'capitao', label: 'Capitão', icon: <Shield size={18} /> },
    { id: 'vice', label: 'Vice-Capitão', icon: <ShieldCheck size={18} /> }
  ];

  const renderConteudo = () => {
    switch (abaAtiva) {
      case 'atleta':
        return (
          <div className="tutorial-conteudo animacao-entrada">
            <div className="tutorial-item">
              <div className="tutorial-icone"><Globe size={24} /></div>
              <div className="tutorial-texto">
                <h4>Encontre seu Time</h4>
                <p>Use a aba <strong>Explorar</strong> para buscar equipes por modalidade e localização. Você pode solicitar ingresso em equipes públicas.</p>
              </div>
            </div>
            <div className="tutorial-item">
              <div className="tutorial-icone red-glow"><Zap size={24} /></div>
              <div className="tutorial-texto">
                <h4>Passar a Bola</h4>
                <p><strong>Passe a bola e entre no jogo!</strong> Demonstre interesse em novos parceiros ou equipes. Se o toque for retribuído, é match e o WhatsApp é liberado na hora!</p>
              </div>
            </div>
            <div className="tutorial-item">
              <div className="tutorial-icone"><Calendar size={24} /></div>
              <div className="tutorial-texto">
                <h4>Partidas e Inscrições</h4>
                <p>Fique de olho no <strong>Dashboard</strong>. Partidas criadas pela sua equipe aparecerão lá para você confirmar presença.</p>
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
                <h4>Gestão da Equipe</h4>
                <p>Você tem total controle. Pode editar informações, trocar o escudo e definir as <strong>Regras do Time</strong> na aba de Gestão.</p>
              </div>
            </div>
            <div className="tutorial-item">
              <div className="tutorial-icone"><DollarSign size={24} /></div>
              <div className="tutorial-texto">
                <h4>Financeiro Facilitado</h4>
                <p>Controle mensalidades e pagamentos de avulsos. O sistema gera a lista de quem pagou automaticamente para cada partida.</p>
              </div>
            </div>
            <div className="tutorial-item">
              <div className="tutorial-icone"><Users size={24} /></div>
              <div className="tutorial-texto">
                <h4>Convites e Aprovações</h4>
                <p>Aprove novos membros que pediram entrada ou envie links de convite para amigos se juntarem ao elenco.</p>
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
        </div>
      </div>
    </Modal>
  );
};

export default ModalTutorial;
