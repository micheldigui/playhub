import React from 'react';
import { 
  Trophy, Star, Shield, Users, Plus, 
  ChevronRight, Info, DollarSign, Ban,
  CheckCircle2, AlertCircle, LayoutGrid
} from 'lucide-react';
import { usarEquipe } from '../../contextos/EquipeContexto';
import Botao from '../../componentes/Botao/Botao';
import './GerenciarEquipes.css';

const GerenciarEquipes = ({ aoVoltar, aoNavegar, setAbaEquipe }) => {
  const { 
    equipes, 
    equipeAtiva, 
    selecionarEquipe, 
    setModalCriacaoAberto,
    podeCriarEquipe,
    totalCriadas,
    limiteEquipes
  } = usarEquipe();

  return (
    <div className="gerenciar-equipes-container animate-fade-in">
      <header className="gerenciar-header">
        <div className="header-texto">
          <h1>Suas Equipes</h1>
          <p>Gerencie seus times, escolha a equipe ativa e acompanhe sua reputação.</p>
        </div>
        
        {podeCriarEquipe ? (
          <Botao 
            variant="primario" 
            onClick={() => setModalCriacaoAberto(true)}
            className="btn-criar-equipe-topo"
          >
            <Plus size={20} />
            Criar Novo Time
          </Botao>
        ) : (
          <div className="limite-equipes-alerta">
            <AlertCircle size={18} />
            <span>Limite de {limiteEquipes} equipes atingido</span>
          </div>
        )}
      </header>

      <section className="info-cards-grid">
        <div className="info-card gold">
          <div className="info-card-back"></div>
          <div className="info-card-icon"><DollarSign size={24} /></div>
          <div className="info-card-content">
            <h3>Gestão Financeira</h3>
            <p>Times "Pro" possuem controle de mensalidades, rateio de quadra e caixa automático.</p>
          </div>
        </div>

        <div 
          className={`info-card azure ${equipeAtiva ? 'interativo' : ''}`}
          onClick={() => {
            if (equipeAtiva) {
              setAbaEquipe('disciplina');
              aoNavegar('equipe');
            }
          }}
          title={equipeAtiva ? 'Ir para o VAR da Equipe Ativa' : 'Selecione uma equipe para gerenciar o VAR'}
        >
          <div className="info-card-back"></div>
          <div className="info-card-icon"><Shield size={24} /></div>
          <div className="info-card-content">
            <h3>Fair Play (VAR)</h3>
            <p>A disciplina agora fala a língua do atleta. Cartões amarelos e vermelhos definem sua reputação.</p>
          </div>
        </div>
      </section>

      <div className="lista-equipes-secao">
        <div className="lista-equipes-header">
          <h2>Selecione a Equipe Ativa</h2>
          <span>{equipes.length} equipe{equipes.length !== 1 ? 's' : ''} vinculada{equipes.length !== 1 ? 's' : ''}</span>
        </div>

        {equipes.length === 0 ? (
          <div className="equipes-vazia">
            <LayoutGrid size={64} color="rgba(255,255,255,0.05)" />
            <p>Você ainda não participa de nenhuma equipe.</p>
            <Botao variant="secundario" onClick={() => setModalCriacaoAberto(true)} style={{ marginTop: '16px' }}>
              Começar Agora
            </Botao>
          </div>
        ) : (
          <div className="equipes-grid">
            {equipes.map((equipe) => {
              const isAtiva = equipeAtiva?.id === equipe.id;
              return (
                <div 
                  key={equipe.id} 
                  className={`equipe-card ${isAtiva ? 'card-ativo' : ''}`}
                  onClick={() => selecionarEquipe(equipe.id)}
                >
                  <div className="equipe-card-glow"></div>
                  
                  <div className="equipe-card-topo">
                    <div className="equipe-logo-wrapper">
                      {equipe.logo_url ? (
                        <img src={equipe.logo_url} alt={equipe.nome} className="equipe-logo-img" />
                      ) : (
                        <div className="equipe-logo-placeholder">
                          <Users size={24} />
                        </div>
                      )}
                      {isAtiva && (
                        <div className="estrela-ativa">
                          <Star size={16} fill="var(--amarelo)" color="var(--amarelo)" />
                        </div>
                      )}
                    </div>
                    
                    <div className="equipe-badge-papel">
                      {equipe.papel === 'admin' ? 'Capitão' : equipe.papel === 'sub_admin' ? 'Vice' : 'Atleta'}
                    </div>
                  </div>

                  <div className="equipe-card-info">
                    <h3 className="equipe-nome">{equipe.nome}</h3>
                    <p className="equipe-detalhes">
                      {equipe.modalidade} • {equipe.local_cidade || 'Cidade não inf.'}
                    </p>
                  </div>

                  <div className="equipe-card-footer">
                    <div className="equipe-config-badges">
                      {equipe.gestao_financeira ? (
                        <span className="badge-config" title="Controle Financeiro Habilitado">
                          <DollarSign size={12} /> R$
                        </span>
                      ) : (
                        <span className="badge-config gray" title="Time Gratuito (Sem Financeiro)">
                          <Ban size={12} /> Grátis
                        </span>
                      )}
                      {equipe.aceitando_membros ? (
                        <span className="badge-config green" title="Aceitando novos jogadores">
                          <CheckCircle2 size={12} /> Aberto
                        </span>
                      ) : (
                        <span className="badge-config red" title="Recrutamento fechado">
                          <Ban size={12} /> Fechado
                        </span>
                      )}
                    </div>
                    
                    <div className={`btn-ativar ${isAtiva ? 'btn-ativo' : ''}`}>
                      {isAtiva ? 'Equipe Ativa' : 'Ativar Equipe'}
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="gerenciar-footer">
        <div className="footer-alerta">
          <Info size={18} />
          <p>
            Dica: Ao "Ativar" uma equipe (clicando na estrela), as ferramentas da barra lateral 
            serão ajustadas automaticamente para as necessidades daquele time específico.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default GerenciarEquipes;
