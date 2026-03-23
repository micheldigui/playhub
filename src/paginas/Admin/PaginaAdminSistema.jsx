import React, { useState, useEffect } from 'react';
import { 
  Building2, Globe, Lock, Search, MapPin, Trophy, Shield, Users 
} from 'lucide-react';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import Botao from '../../componentes/Botao/Botao';
import './PaginaAdminSistema.css';

const PaginaAdminSistema = ({ aoSelecionarEquipe }) => {
  const { usuario, ehSuperAdmin } = usarAutenticacao();
  const { buscarEquipes, selecionarEquipeGlobal, equipes } = usarEquipe();

  const [termoBusca, setTermoBusca] = useState('');
  const [modalidadeBusca, setModalidadeBusca] = useState('');
  const [cidadeBusca, setCidadeBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  // Busca inicial e dinâmica com debounce
  useEffect(() => {
    if (!ehSuperAdmin) return;
    
    const timer = setTimeout(() => {
      handleBuscarEquipes();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [termoBusca, cidadeBusca, modalidadeBusca, ehSuperAdmin]);

  const handleBuscarEquipes = async () => {
    if (!ehSuperAdmin) return;
    setBuscando(true);
    
    const data = await buscarEquipes({
      termo: termoBusca,
      modalidade: modalidadeBusca,
      cidade: cidadeBusca,
    }, false); // false = buscar TODAS (incluindo privadas)

    // Identifica se o usuário já é membro ou dono de cada equipe
    const resultadosProcessados = data.map(eq => {
      const membro = equipes.find(me => me.id === eq.id);
      return {
        ...eq,
        isMember: !!membro,
        isOwner: eq.admin_id === usuario.id || membro?.papel === 'admin'
      };
    });
    
    setResultados(resultadosProcessados || []);
    setBuscando(false);
  };

  const handleGerenciar = (eq) => {
    selecionarEquipeGlobal(eq);
    if (aoSelecionarEquipe) aoSelecionarEquipe();
  };

  if (!ehSuperAdmin) {
    return (
      <div className="pagina-servico-vazia">
        <Shield size={48} color="#f43f5e" />
        <h2>Acesso Restrito</h2>
        <p>Esta página é exclusiva para administradores do sistema.</p>
      </div>
    );
  }

  return (
    <div className="pagina-admin-sistema">
      <header className="admin-header">
        <div className="admin-header-info">
          <h2><Building2 size={24} /> Gestão Global de Equipes</h2>
          <p>Visualize, dê manutenção e ajude os administradores de qualquer equipe cadastrada no PlayHub.</p>
        </div>
      </header>

      <div className="barra-busca-admin">
        <div className="grupo-input-admin">
          <Search size={18} />
          <input
            type="text"
            placeholder="Nome ou código da equipe..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
        </div>
        <div className="grupo-input-admin">
          <Trophy size={18} />
          <select
            value={modalidadeBusca}
            onChange={(e) => setModalidadeBusca(e.target.value)}
          >
            <option value="">Todas as Modalidades</option>
            <option value="Vôlei de Quadra">Vôlei de Quadra</option>
            <option value="Vôlei de Praia">Vôlei de Praia</option>
            <option value="Futevôlei">Futevôlei</option>
            <option value="Beach Tennis">Beach Tennis</option>
            <option value="Futsal">Futsal</option>
            <option value="Futebol Society">Futebol Society</option>
            <option value="Basquete">Basquete</option>
            <option value="Handebol">Handebol</option>
            <option value="Tênis">Tênis</option>
            <option value="Padel">Padel</option>
          </select>
        </div>
        <div className="grupo-input-admin">
          <MapPin size={18} />
          <input
            type="text"
            placeholder="Cidade..."
            value={cidadeBusca}
            onChange={(e) => setCidadeBusca(e.target.value)}
          />
        </div>
        <Botao onClick={handleBuscarEquipes} disabled={buscando}>
          {buscando ? 'Buscando...' : 'Pesquisar'}
        </Botao>
      </div>

      <div className="resultados-admin">
        {buscando ? (
          <div className="admin-vazio"><p>Carregando equipes do sistema...</p></div>
        ) : resultados.length > 0 ? (
          <div className="grade-admin">
            {resultados.map((eq) => (
              <div key={eq.id} className="card-admin">
                <div className="card-admin-topo">
                  {eq.logo_url ? (
                    <img src={eq.logo_url} alt={eq.nome} className="logo-admin" />
                  ) : (
                    <div className="logo-admin-placeholder">
                      <Trophy size={20} />
                    </div>
                  )}
                  <div className="card-admin-info">
                    <h4>{eq.nome}</h4>
                    <span>{eq.modalidade}</span>
                  </div>
                </div>

                <div className="card-admin-meta">
                  <span><MapPin size={14} /> {eq.local_cidade || eq.cidade}, {eq.local_estado || eq.estado}</span>
                  <span><Users size={14} /> {eq.membros_equipe?.[0]?.count || 0} {eq.membros_equipe?.[0]?.count === 1 ? 'Jogador' : 'Jogadores'}</span>
                  <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                    <span className={`tag-visibilidade ${eq.visibilidade}`}>
                      {eq.visibilidade === 'publica' ? <Globe size={12} /> : <Lock size={12} />}
                      {eq.visibilidade === 'publica' ? 'Pública' : 'Privada'}
                    </span>
                    {eq.isOwner && <span className="tag-vinculo dono">DONO</span>}
                    {eq.isMember && !eq.isOwner && <span className="tag-vinculo membro">MEMBRO</span>}
                  </div>
                </div>

                <Botao 
                  onClick={() => handleGerenciar(eq)} 
                  variant="primario"
                  style={{ width: '100%', marginTop: '1rem', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Shield size={16} /> Gerenciar Equipe
                </Botao>
              </div>
            ))}
          </div>
        ) : (
          <div className="admin-vazio">
            <p>Nenhuma equipe encontrada no sistema.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaginaAdminSistema;
