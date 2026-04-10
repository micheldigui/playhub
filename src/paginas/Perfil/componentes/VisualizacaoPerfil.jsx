import React from 'react';
import { 
  User, 
  Calendar, 
  MapPin, 
  Trophy, 
  Edit3, 
  EyeOff, 
  Eye, 
  Phone, 
  Award,
  ChevronRight,
  Users
} from 'lucide-react';
import Botao from '../../../componentes/Botao/Botao';
import { rastrear } from '../../../servicos/rastreamento';

const VisualizacaoPerfil = ({ 
  dadosUsuario, 
  modalidades, 
  idade, 
  totalEquipes,
  totalEsportes,
  aoEditar,
  aoNavegar
}) => {

  return (
    <div className="perfil-view-wrapper animacao-entrada">
      {/* Header com Capa e Avatar */}
      <div className="perfil-header-premium">
        <div className="perfil-capa-gradiente"></div>
        
        <div className="perfil-header-conteudo">
          <div className="perfil-avatar-view">
            {dadosUsuario?.foto_url ? (
              <img src={dadosUsuario.foto_url} alt="Avatar" />
            ) : (
              <div className="avatar-placeholder-view">
                {dadosUsuario?.nome_completo?.charAt(0).toUpperCase()}
              </div>
            )}
            {!dadosUsuario?.perfil_publico && (
              <div className="badge-privacidade-view" title="Perfil Privado">
                <EyeOff size={14} />
              </div>
            )}
          </div>

          <div className="perfil-identidade">
            <h1>{dadosUsuario?.nome_completo}</h1>
            <p className="perfil-apelido">
              {dadosUsuario?.apelido ? `@${dadosUsuario.apelido}` : 'Atleta PlayHub'}
            </p>
            <div className="perfil-meta">
              <span className="meta-item">
                <MapPin size={14} /> {dadosUsuario?.cidade} {dadosUsuario?.estado ? `- ${dadosUsuario.estado}` : ''}
              </span>
              <span className="meta-divisor">•</span>
              <span className="meta-item">
                <Calendar size={14} /> {idade} anos
              </span>
            </div>
          </div>

          <button className="btn-editar-flutuante" onClick={aoEditar} title="Editar Perfil">
            <Edit3 size={18} />
            <span>Editar</span>
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="perfil-stats-grid">
        <div className="stat-card">
          <span className="stat-valor">{totalEsportes}</span>
          <span className="stat-label">Esportes</span>
        </div>
        <div className="stat-card">
          <span className="stat-valor">{idade}</span>
          <span className="stat-label">Idade</span>
        </div>
        <div className="stat-card">
          <span className="stat-valor">{totalEquipes}</span>
          <span className="stat-label">Equipes</span>
        </div>
      </div>

      <div className="perfil-secoes-view">
        {/* Esportes / Perfil Esportivo */}
        <div className="perfil-card-info">
          <div className="card-header-view flex-between">
            <div className="header-titulo-icon">
              <Trophy size={18} className="icone-azul" />
              <h3>Perfil Esportivo</h3>
            </div>
            <button 
              className="btn-link-atalho" 
              onClick={() => {
                rastrear.clique('perfil_gerenciar_habilidades', 'Navegou para o perfil esportivo');
                aoNavegar('perfil_esportivo');
              }}
            >
              <span>Gerenciar Habilidades</span>
              <ChevronRight size={14} />
            </button>
          </div>
          
          <div className="modalidades-lista-view">
            {modalidades.length > 0 ? (
              modalidades.map((m) => (
                <div key={m.id} className="modalidade-item-view">
                  <div className="modalidade-info">
                    <span className="modalidade-nome">{m.modalidade}</span>
                    <span className="modalidade-posicao">{m.posicao || 'Posição não definida'}</span>
                  </div>
                  <div className={`nivel-badge nivel-${m.nivel_habilidade.toLowerCase()}`}>
                    {m.nivel_habilidade}
                  </div>
                </div>
              ))
            ) : (
              <p className="vazio-texto">Nenhum esporte adicionado.</p>
            )}
          </div>
        </div>

        {/* Informações de Contato e Privacidade */}
        <div className="perfil-card-info">
          <div className="card-header-view">
            <Award size={18} className="icone-verde" />
            <h3>Privacidade e Contato</h3>
          </div>
          
          <div className="config-resumo-view">
            <div className="item-config-view">
              <div className="item-icone">
                {dadosUsuario?.perfil_publico ? <Eye size={18} color="#0ea5e9" /> : <EyeOff size={18} color="#64748b" />}
              </div>
              <div className="item-texto">
                <span className="item-titulo">Visibilidade do Perfil</span>
                <span className="item-status">
                  {dadosUsuario?.perfil_publico ? 'Público - Capitães podem te encontrar' : 'Privado - Você está oculto na busca'}
                </span>
              </div>
            </div>

            <div className="item-config-view">
              <div className="item-icone">
                <Phone size={18} color={dadosUsuario?.compartilhar_whatsapp_match ? '#22c55e' : '#64748b'} />
              </div>
              <div className="item-texto">
                <span className="item-titulo">WhatsApp no Match</span>
                <span className="item-status">
                  {dadosUsuario?.compartilhar_whatsapp_match ? 'Liberado para Parceiros' : 'Oculto (Segurança máxima)'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizacaoPerfil;
