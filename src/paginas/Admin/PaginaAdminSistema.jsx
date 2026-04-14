import React, { useState, useEffect } from 'react';
import { 
  Building2, Globe, Lock, Search, MapPin, Trophy, Shield, Users, User, ShieldCheck
} from 'lucide-react';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { supabase } from '../../servicos/supabase';
import Botao from '../../componentes/Botao/Botao';
import './PaginaAdminSistema.css';

const PaginaAdminSistema = ({ aoSelecionarEquipe }) => {
  const { usuario, ehRootAdmin, temPermissao } = usarAutenticacao();
  const { buscarEquipes, selecionarEquipeGlobal, equipes } = usarEquipe();

  const [termoBusca, setTermoBusca] = useState('');
  const [modalidadeBusca, setModalidadeBusca] = useState('');
  const [cidadeBusca, setCidadeBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [temMais, setTemMais] = useState(true);
  const [letraFiltro, setLetraFiltro] = useState('');

  const ITENS_POR_PAGINA = 20;

  // Verifica permissão específica para esta página
  const podeAcessar = ehRootAdmin || temPermissao('equipes');

  // Busca inicial e dinâmica com debounce
  useEffect(() => {
    if (!podeAcessar) return;
    
    const timer = setTimeout(() => {
      handleBuscarEquipes(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [termoBusca, cidadeBusca, modalidadeBusca, letraFiltro, podeAcessar]);

  const handleBuscarEquipes = async (novaBusca = false) => {
    if (!podeAcessar) return;
    setBuscando(true);
    
    const novaPagina = novaBusca ? 0 : pagina + 1;
    const de = novaPagina * ITENS_POR_PAGINA;
    const ate = de + ITENS_POR_PAGINA - 1;

    try {
      let query = supabase
        .from('equipes')
        .select(`
          *,
          admin:usuarios!equipes_admin_id_fkey (id, nome_completo, apelido, foto_url),
          membros_equipe(count)
        `, { count: 'exact' })
        .eq('status', 'ativo')
        .order('nome', { ascending: true })
        .range(de, ate);

      if (termoBusca) {
        query = query.or(`nome.ilike.%${termoBusca}%,slug_convite.eq.${termoBusca}`);
      }

      if (modalidadeBusca) {
        query = query.eq('modalidade', modalidadeBusca);
      }

      if (cidadeBusca) {
        query = query.ilike('local_cidade', `%${cidadeBusca}%`);
      }

      if (letraFiltro) {
        query = query.ilike('nome', `${letraFiltro}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      // Identifica se o usuário já é membro ou dono de cada equipe
      const processados = (data || []).map(eq => {
        const membro = equipes.find(me => me.id === eq.id);
        return {
          ...eq,
          isMember: !!membro,
          isOwner: eq.admin_id === usuario.id || membro?.papel === 'admin'
        };
      });
      
      if (novaBusca) {
        setResultados(processados);
      } else {
        setResultados(prev => [...prev, ...processados]);
      }

      setPagina(novaPagina);
      setTemMais(count > (de + (data?.length || 0)));
    } catch (error) {
      console.error('Erro ao buscar equipes:', error.message);
    } finally {
      setBuscando(false);
    }
  };

  const handleGerenciar = (eq) => {
    selecionarEquipeGlobal(eq);
    if (aoSelecionarEquipe) aoSelecionarEquipe();
  };

  if (!podeAcessar) {
    return (
      <div className="pagina-servico-vazia">
        <Shield size={48} color="#f43f5e" />
        <h2>Acesso Restrito</h2>
        <p>Você não tem permissão para gerenciar as equipes do sistema.</p>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>Entre em contato com o Super Admin Root para solicitar acesso.</p>
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
            onChange={(e) => {
              setTermoBusca(e.target.value);
              setLetraFiltro('');
            }}
          />
        </div>
        <div className="grupo-input-admin">
          <Trophy size={18} />
          <select
            value={modalidadeBusca}
            onChange={(e) => setModalidadeBusca(e.target.value)}
          >
            <option value="">Todas as Modalidades</option>
            <option value="Basquete">Basquete</option>
            <option value="Beach Tennis">Beach Tennis</option>
            <option value="E-Sports">E-Sports</option>
            <option value="Futebol de Campo">Futebol de Campo</option>
            <option value="Futebol Society">Futebol Society</option>
            <option value="Futsal">Futsal</option>
            <option value="Futevôlei">Futevôlei</option>
            <option value="Handebol">Handebol</option>
            <option value="Padel">Padel</option>
            <option value="Tênis">Tênis</option>
            <option value="Vôlei de Areia / Praia">Vôlei de Areia / Praia</option>
            <option value="Vôlei de Quadra">Vôlei de Quadra</option>
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
        <Botao onClick={() => handleBuscarEquipes(true)} disabled={buscando}>
          {buscando ? 'Buscando...' : 'Pesquisar'}
        </Botao>
      </div>

      <div className="indice-alfabetico">
        <button 
          className={`btn-letra ${letraFiltro === '' ? 'ativo' : ''}`}
          onClick={() => setLetraFiltro('')}
        >
          TODOS
        </button>
        {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(letra => (
          <button
            key={letra}
            className={`btn-letra ${letraFiltro === letra ? 'ativo' : ''}`}
            onClick={() => {
              setLetraFiltro(letra);
              setTermoBusca('');
            }}
          >
            {letra}
          </button>
        ))}
      </div>

      <div className="resultados-admin">
        {resultados.length > 0 ? (
          <>
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
                    <span><User size={14} /> Capitão: {eq.admin?.nome_completo || eq.admin?.apelido || 'Desconhecido'}</span>
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

            {temMais && (
              <div className="carregar-mais">
                <Botao 
                  variant="secundario" 
                  onClick={() => handleBuscarEquipes(false)}
                  disabled={buscando}
                  style={{ minWidth: '200px' }}
                >
                  {buscando ? 'Carregando...' : 'Carregar mais equipes'}
                </Botao>
              </div>
            )}
          </>
        ) : buscando ? (
          <div className="admin-vazio"><p>Carregando equipes do sistema...</p></div>
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
