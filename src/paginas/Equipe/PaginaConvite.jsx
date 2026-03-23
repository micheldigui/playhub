import { useState, useEffect } from 'react';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { supabase } from '../../servicos/supabase';
import { Globe, MapPin, Trophy, Users, ArrowLeft, Crown } from 'lucide-react';
import Botao from '../../componentes/Botao/Botao';
import '../Explorar/PaginaExplorar.css';

const PaginaConvite = ({ equipeId, aoVoltar }) => {
  const { solicitarIngresso, equipes: minhasEquipes } = usarEquipe();
  const { usuario } = usarAutenticacao();

  const [equipe, setEquipe] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [solicitado, setSolicitado] = useState(false);

  // IDs de equipes onde o usuario já é membro
  const idsMinhasEquipes = new Set((minhasEquipes || []).map((e) => e.id));

  useEffect(() => {
    async function carregarEquipe() {
      if (!equipeId) {
        setErro('ID do convite inválido.');
        setCarregando(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('equipes')
          .select(`
            *,
            admin:usuarios!equipes_admin_id_fkey (
              id, nome_completo, apelido, foto_url
            )
          `)
          .eq('slug_convite', equipeId)
          .single();

        if (error) throw error;
        setEquipe(data);
      } catch (err) {
        console.error('Erro ao carregar convite:', err.message);
        setErro('Convite inválido ou equipe não encontrada.');
      } finally {
        setCarregando(false);
      }
    }
    carregarEquipe();
  }, [equipeId]);

  const handleSolicitar = async () => {
    const result = await solicitarIngresso(equipe.id);
    if (result.sucesso) {
      setSolicitado(true);
    } else {
      alert(result.erro);
    }
  };

  const statusEquipe = () => {
    if (!usuario || !equipe) return null;
    if (equipe.admin_id === usuario.id) return 'dono';
    if (idsMinhasEquipes.has(equipe.id)) return 'membro';
    return null;
  };

  if (carregando) {
    return (
      <div className="pagina-explorar" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
        <p>Carregando convite...</p>
      </div>
    );
  }

  if (erro || !equipe) {
    return (
      <div className="pagina-explorar" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '4rem' }}>
        <Globe size={48} strokeWidth={1} style={{ marginBottom: '1rem', color: '#64748b' }} />
        <h2>Ops!</h2>
        <p>{erro}</p>
        <div style={{ marginTop: '2rem' }}>
          <Botao onClick={aoVoltar}>Ir para o Início</Botao>
        </div>
      </div>
    );
  }

  const meuStatus = statusEquipe();
  const nomeAdmin = equipe.admin?.nome_completo || equipe.admin?.apelido || 'Desconhecido';

  return (
    <div className="pagina-explorar" style={{ maxWidth: '600px', margin: '0 auto' }}>
      {aoVoltar && (
        <button className="btn-voltar-explorar" onClick={aoVoltar} style={{ marginBottom: '2rem' }}>
          <ArrowLeft size={18} /> Voltar ao Dashboard
        </button>
      )}

      <header className="explorar-header">
        <h1>Convite para Equipe</h1>
        <p>Você foi convidado(a) para conhecer e ingressar na equipe abaixo.</p>
      </header>

      <div className="grade-explorar" style={{ display: 'flex', flexDirection: 'column', marginTop: '2rem' }}>
        <div className={`card-explorar ${meuStatus ? 'card-explorar--meu' : ''}`}>
          {meuStatus && (
            <div className={`tag-status-meu ${meuStatus === 'dono' ? 'tag-dono' : 'tag-membro'}`}>
              {meuStatus === 'dono' ? <><Crown size={13} /> Sua Equipe (Capitão)</> : <><Trophy size={13} /> Você é Membro</>}
            </div>
          )}

          <div className="card-explorar-topo">
            {equipe.logo_url ? (
              <img src={equipe.logo_url} alt={equipe.nome} className="logo-explorar" style={{ width: '80px', height: '80px' }} />
            ) : (
              <div className="logo-explorar-placeholder" style={{ width: '80px', height: '80px' }}>
                <Trophy size={36} />
              </div>
            )}
            <div className="card-explorar-info">
              <h4 style={{ fontSize: '1.5rem' }}>{equipe.nome}</h4>
              <span className="badge-mi" style={{ fontSize: '1rem' }}>{equipe.modalidade}</span>
            </div>
          </div>

          <div className="card-explorar-meta" style={{ marginTop: '1.5rem', marginBottom: '2rem', gap: '1rem' }}>
            {equipe.local_cidade && (
              <span style={{ fontSize: '1rem' }}><MapPin size={16} /> {equipe.local_cidade}{equipe.local_estado ? ` - ${equipe.local_estado}` : ''}</span>
            )}
            {equipe.nivel && (
              <span style={{ fontSize: '1rem' }}><Users size={16} /> {equipe.nivel}</span>
            )}
            <span className="admin-do-time" style={{ fontSize: '1rem' }}>
              <Crown size={16} /> Capitão: {nomeAdmin}
            </span>
          </div>

          {meuStatus ? (
            <div className="tag-ja-membro" style={{ padding: '1rem', fontSize: '1rem' }}>
              {meuStatus === 'dono' ? '👑 Você administra esta equipe' : '✓ Você já faz parte desta equipe'}
            </div>
          ) : solicitado ? (
            <div className="tag-pendente" style={{ padding: '1rem', fontSize: '1rem' }}>Solicitação Enviada ✓</div>
          ) : (
            <Botao
              onClick={handleSolicitar}
              variant="primario"
              style={{ width: '100%', justifyContent: 'center', padding: '1rem', fontSize: '1rem' }}
            >
              Solicitar Ingresso
            </Botao>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaginaConvite;
