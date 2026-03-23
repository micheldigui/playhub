import { useState, useCallback } from 'react';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { supabase } from '../../servicos/supabase';
import { Globe, MapPin, Trophy, Users, Search, ArrowLeft, Crown } from 'lucide-react';
import Botao from '../../componentes/Botao/Botao';
import './PaginaExplorar.css';

const MODALIDADES = [
  'Vôlei de Quadra',
  'Vôlei de Praia',
  'Futevôlei',
  'Beach Tennis',
  'Futsal',
  'Futebol Society',
  'Basquete',
  'Handebol',
  'Tênis',
  'Padel',
];

const PaginaExplorar = ({ aoVoltar }) => {
  const { solicitarIngresso, equipes: minhasEquipes } = usarEquipe();
  const { usuario } = usarAutenticacao();

  const [termoBusca, setTermoBusca] = useState('');
  const [modalidadeBusca, setModalidadeBusca] = useState('');
  const [cidadeBusca, setCidadeBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [solicitados, setSolicitados] = useState({});
  const [buscouUmaVez, setBuscouUmaVez] = useState(false);

  // IDs de equipes onde o usuario já é membro
  const idsMinhasEquipes = new Set((minhasEquipes || []).map((e) => e.id));

  const executarBusca = useCallback(async () => {
    setBuscando(true);
    setBuscouUmaVez(true);

    try {
      let query = supabase
        .from('equipes')
        .select(`
          *,
          admin:usuarios!equipes_admin_id_fkey (
            id,
            nome_completo,
            apelido,
            foto_url
          )
        `)
        .eq('visibilidade', 'publica')
        .eq('status', 'ativo');

      if (modalidadeBusca) query = query.eq('modalidade', modalidadeBusca);
      if (cidadeBusca)     query = query.ilike('local_cidade', `%${cidadeBusca}%`);
      if (termoBusca)      query = query.or(`nome.ilike.%${termoBusca}%,slug_convite.ilike.%${termoBusca}%`);

      const { data, error } = await query.limit(24);
      if (error) throw error;
      setResultados(data || []);
    } catch (err) {
      console.error('Erro ao buscar equipes:', err.message);
      setResultados([]);
    } finally {
      setBuscando(false);
    }
  }, [termoBusca, modalidadeBusca, cidadeBusca]);

  const handleFormBusca = (e) => {
    e.preventDefault();
    executarBusca();
  };

  const handleSolicitar = async (equipeId) => {
    const result = await solicitarIngresso(equipeId);
    if (result.sucesso) {
      setSolicitados((prev) => ({ ...prev, [equipeId]: true }));
    } else {
      alert(result.erro);
    }
  };

  const statusEquipe = (equipe) => {
    if (!usuario) return null;
    if (equipe.admin_id === usuario.id) return 'dono';
    if (idsMinhasEquipes.has(equipe.id)) return 'membro';
    return null;
  };

  return (
    <div className="pagina-explorar">
      {/* Botão Voltar */}
      {aoVoltar && (
        <button className="btn-voltar-explorar" onClick={aoVoltar}>
          <ArrowLeft size={18} /> Voltar ao Dashboard
        </button>
      )}

      <header className="explorar-header">
        <h1>
          <Globe size={32} />
          Explorar Equipes
        </h1>
        <p>Encontre times públicos e solicite para participar.</p>
      </header>

      {/* Formulário de Busca */}
      <form className="explorar-filtros" onSubmit={handleFormBusca}>
        <div className="filtro-grupo">
          <Search size={18} />
          <input
            type="text"
            placeholder="Nome ou código do time..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
          />
        </div>

        <div className="filtro-grupo filtro-select">
          <Trophy size={18} />
          <select
            value={modalidadeBusca}
            onChange={(e) => setModalidadeBusca(e.target.value)}
          >
            <option value="">Todas as Modalidades</option>
            {MODALIDADES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo">
          <MapPin size={18} />
          <input
            type="text"
            placeholder="Digite uma cidade..."
            value={cidadeBusca}
            onChange={(e) => setCidadeBusca(e.target.value)}
          />
        </div>

        <Botao type="submit" disabled={buscando} style={{ flexShrink: 0 }}>
          <Search size={16} /> {buscando ? 'Buscando...' : 'Pesquisar'}
        </Botao>
      </form>

      {/* Resultados */}
      <div className="explorar-resultados">
        {buscando ? (
          <div className="explorar-vazio">
            <div className="loading-spinner" />
            <p>Buscando equipes...</p>
          </div>
        ) : resultados.length > 0 ? (
          <div className="grade-explorar">
            {resultados.map((equipe) => {
              const meuStatus = statusEquipe(equipe);
              const nomeAdmin = equipe.admin?.nome_completo || equipe.admin?.apelido || 'Desconhecido';
              return (
                <div key={equipe.id} className={`card-explorar ${meuStatus ? 'card-explorar--meu' : ''}`}>
                  {meuStatus && (
                    <div className={`tag-status-meu ${meuStatus === 'dono' ? 'tag-dono' : 'tag-membro'}`}>
                      {meuStatus === 'dono' ? <><Crown size={13} /> Sua Equipe (Capitão)</> : <><Trophy size={13} /> Você é Membro</>}
                    </div>
                  )}

                  <div className="card-explorar-topo">
                    {equipe.logo_url ? (
                      <img src={equipe.logo_url} alt={equipe.nome} className="logo-explorar" />
                    ) : (
                      <div className="logo-explorar-placeholder">
                        <Trophy size={28} />
                      </div>
                    )}
                    <div className="card-explorar-info">
                      <h4>{equipe.nome}</h4>
                      <span className="badge-mi">{equipe.modalidade}</span>
                    </div>
                  </div>

                  <div className="card-explorar-meta">
                    {equipe.local_cidade && (
                      <span><MapPin size={14} /> {equipe.local_cidade}{equipe.local_estado ? ` - ${equipe.local_estado}` : ''}</span>
                    )}
                    {equipe.nivel && (
                      <span><Users size={14} /> {equipe.nivel}</span>
                    )}
                    <span className="admin-do-time">
                      <Crown size={13} /> Capitão: {nomeAdmin}
                    </span>
                  </div>

                  {meuStatus ? (
                    <div className="tag-ja-membro">
                      {meuStatus === 'dono' ? '👑 Você administra esta equipe' : '✓ Você já faz parte desta equipe'}
                    </div>
                  ) : solicitados[equipe.id] ? (
                    <div className="tag-pendente">Solicitação Enviada ✓</div>
                  ) : (
                    <Botao
                      onClick={() => handleSolicitar(equipe.id)}
                      variant="secundario"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Solicitar Ingresso
                    </Botao>
                  )}
                </div>
              );
            })}
          </div>
        ) : buscouUmaVez ? (
          <div className="explorar-vazio">
            <Globe size={48} strokeWidth={1} />
            <p>Nenhuma equipe encontrada com esses filtros.</p>
          </div>
        ) : (
          <div className="explorar-vazio">
            <Search size={48} strokeWidth={1} />
            <p>Use os filtros e clique em <strong>Pesquisar</strong> para encontrar equipes.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaginaExplorar;
