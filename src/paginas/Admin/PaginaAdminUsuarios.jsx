import React, { useState, useEffect } from 'react';
import { 
  Users, Mail, Search, MapPin, Shield, Eye, EyeOff, UserCog, MailQuestion, ShieldCheck
} from 'lucide-react';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { supabase } from '../../servicos/supabase';
import Botao from '../../componentes/Botao/Botao';
import ModalEdicaoUsuario from './modais/ModalEdicaoUsuario';
import './PaginaAdminUsuarios.css';

// Retorna "Primeiro Último" com iniciais maiúsculas
const formatarNomeAdmin = (nomeCompleto) => {
  if (!nomeCompleto) return '';
  const partes = nomeCompleto.trim().split(/\s+/);
  if (partes.length === 1) {
    return partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase();
  }
  const primeiro = partes[0];
  const ultimo = partes[partes.length - 1];
  const capitalizar = (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  return `${capitalizar(primeiro)} ${capitalizar(ultimo)}`;
};

const PaginaAdminUsuarios = () => {
  const { ehSuperAdmin, ehRootAdmin, temPermissao } = usarAutenticacao();
  const [termoBusca, setTermoBusca] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [modalAberto, setModalAberto] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [temMais, setTemMais] = useState(true);
  const [letraFiltro, setLetraFiltro] = useState('');

  const ITENS_POR_PAGINA = 20;

  // Verifica permissão específica para esta página
  const podeAcessar = ehRootAdmin || temPermissao('usuarios');

  // Busca inicial e dinâmica com debounce
  useEffect(() => {
    if (!podeAcessar) return;
    
    const timer = setTimeout(() => {
      handleBuscarUsuarios(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [termoBusca, letraFiltro, podeAcessar]);

  const handleBuscarUsuarios = async (novaBusca = false) => {
    if (!podeAcessar) return;
    setBuscando(true);
    
    const novaPagina = novaBusca ? 0 : pagina + 1;
    const de = novaPagina * ITENS_POR_PAGINA;
    const ate = de + ITENS_POR_PAGINA - 1;

    try {
      // Usa RPC com SECURITY DEFINER para bypassar RLS e ver TODOS os usuários,
      // incluindo perfis privados e menores de 18 anos
      const { data, error } = await supabase.rpc('admin_listar_usuarios', {
        p_busca: termoBusca || null,
        p_letra: letraFiltro || null,
        p_de: de,
        p_ate: ate
      });

      if (error) throw error;
      
      const lista = data || [];

      if (novaBusca) {
        setUsuarios(lista);
      } else {
        setUsuarios(prev => [...prev, ...lista]);
      }
      
      setPagina(novaPagina);
      setTemMais(lista.length === ITENS_POR_PAGINA);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error.message);
    } finally {
      setBuscando(false);
    }
  };

  const abrirEdicao = (u) => {
    setUsuarioSelecionado(u);
    setModalAberto(true);
  };

  if (!podeAcessar) {
    return (
      <div className="pagina-servico-vazia">
        <Shield size={48} color="#f43f5e" />
        <h2>Acesso Restrito</h2>
        <p>Você não tem permissão para gerenciar usuários do sistema.</p>
        <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.5rem' }}>Solicite acesso ao Super Admin Root.</p>
      </div>
    );
  }

  return (
    <div className="pagina-admin-usuarios animacao-entrada">
      <header className="admin-header">
        <div className="admin-header-info">
          <h2><Users size={24} /> Gestão Global de Usuários</h2>
          <p>Gerencie perfis, auxilie em recuperações de acesso e visualize todos os membros da plataforma.</p>
        </div>
      </header>

      <div className="barra-busca-admin">
        <div className="grupo-input-admin-longo">
          <Search size={18} />
          <input
            type="text"
            placeholder="Buscar por nome, apelido ou e-mail..."
            value={termoBusca}
            onChange={(e) => {
              setTermoBusca(e.target.value);
              setLetraFiltro(''); // Limpa filtro de letra ao digitar busca livre
            }}
          />
        </div>
        <Botao onClick={() => handleBuscarUsuarios(true)} disabled={buscando}>
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
              setTermoBusca(''); // Limpa busca livre ao filtrar por letra
            }}
          >
            {letra}
          </button>
        ))}
      </div>

      <div className="resultados-admin">
        {usuarios.length > 0 ? (
          <>
            <div className="grade-admin-usuarios">
              {usuarios.map((u) => {
                  const ehO_Root = u.email === 'michelssouza@gmail.com';
                  return (
                    <div key={u.id} className="card-usuario-admin">
                    <div className="card-usuario-topo">
                        <div className="usuario-avatar-admin" style={{ borderColor: ehO_Root ? '#fbbf24' : 'rgba(255,255,255,0.1)' }}>
                        {u.foto_url ? (
                            <img src={u.foto_url} alt={formatarNomeAdmin(u.nome_completo)} />
                        ) : (
                            <div className="avatar-admin-placeholder">
                            {formatarNomeAdmin(u.nome_completo)?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        </div>
                        <div className="usuario-info-admin">
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {formatarNomeAdmin(u.nome_completo)} 
                            {ehO_Root && <ShieldCheck size={14} color="#fbbf24" title="Super Admin Root" />}
                            {!ehO_Root && u.eh_super_admin && <Shield size={14} color="#94a3b8" title="Administrador" />}
                        </h4>
                        <span className="usuario-email-admin"><Mail size={12} /> {u.email}</span>
                        </div>
                    </div>

                    <div className="usuario-corpo-admin">
                        <div className="usuario-meta-admin">
                        {u.apelido && <p><strong>Apelido:</strong> @{u.apelido}</p>}
                        <p><strong>Local:</strong> {u.cidade || 'Não inf.'}, {u.estado || '??'}</p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                            <span className={`tag-visibilidade ${u.perfil_publico ? 'publica' : 'privada'}`}>
                            {u.perfil_publico ? <Eye size={12} /> : <EyeOff size={12} />}
                            {u.perfil_publico ? 'Público' : 'Privado'}
                            </span>
                            {u.eh_super_admin && (
                                <span className="tag-visibilidade" style={{ background: ehO_Root ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255,255,255,0.05)', color: ehO_Root ? '#fbbf24' : '#94a3b8' }}>
                                    {ehO_Root ? 'ROOT' : 'ADMIN'}
                                </span>
                            )}
                        </div>
                        </div>
                    </div>

                    <Botao 
                        onClick={() => abrirEdicao(u)} 
                        variant="secundario"
                        style={{ width: '100%', marginTop: '1rem', justifyContent: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                    >
                        <UserCog size={16} /> Gerenciar Usuário
                    </Botao>
                    </div>
                  );
              })}
            </div>

            {temMais && (
              <div className="carregar-mais">
                <Botao 
                  variant="secundario" 
                  onClick={() => handleBuscarUsuarios(false)}
                  disabled={buscando}
                  style={{ minWidth: '200px' }}
                >
                  {buscando ? 'Carregando...' : 'Carregar mais usuários'}
                </Botao>
              </div>
            )}
          </>
        ) : buscando ? (
          <div className="admin-vazio"><p>Carregando usuários do sistema...</p></div>
        ) : (
          <div className="admin-vazio">
            <p>Nenhum usuário encontrado com esses filtros.</p>
          </div>
        )}
      </div>

      {modalAberto && (
        <ModalEdicaoUsuario 
          usuario={usuarioSelecionado} 
          aoFechar={() => {
            setModalAberto(false);
            handleBuscarUsuarios(true);
          }} 
        />
      )}
    </div>
  );
};

export default PaginaAdminUsuarios;
