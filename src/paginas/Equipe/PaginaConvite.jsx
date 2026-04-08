import { useState, useEffect } from 'react';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { supabase } from '../../servicos/supabase';
import { Globe, MapPin, Trophy, Users, Crown, LogIn, UserPlus, Shield, Star, CheckCircle } from 'lucide-react';
import Botao from '../../componentes/Botao/Botao';
import '../Explorar/PaginaExplorar.css';

const PaginaConvite = ({ equipeId, aoVoltar, aoNavegar }) => {
  const { solicitarIngresso, equipes: minhasEquipes } = usarEquipe();
  const { usuario } = usarAutenticacao();

  const [equipe, setEquipe] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [solicitado, setSolicitado] = useState(false);
  const [totalMembros, setTotalMembros] = useState(0);

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
        // Uma única query com joins para evitar bloqueio de RLS em usuários não autenticados
        const { data, error } = await supabase
          .from('equipes')
          .select(`
            *,
            admin:admin_id (
              id, nome_completo, apelido, foto_url
            ),
            membros_equipe(count)
          `)
          .eq('slug_convite', equipeId)
          .eq('membros_equipe.status', 'ativo')
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          setErro('Convite inválido ou equipe não encontrada.');
          setCarregando(false);
          return;
        }

        setTotalMembros(data.membros_equipe?.[0]?.count || 0);
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
    if (!usuario) {
      return; // não deve chegar aqui, mas segurança extra
    }
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', background: '#0f172a' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(56,189,248,0.2)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#64748b' }}>Carregando convite...</p>
      </div>
    );
  }

  if (erro || !equipe) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem', background: '#0f172a', padding: '2rem' }}>
        <Globe size={56} strokeWidth={1} style={{ color: '#64748b' }} />
        <h2 style={{ color: '#f8fafc', margin: 0 }}>Convite não encontrado</h2>
        <p style={{ color: '#64748b', textAlign: 'center' }}>{erro || 'Este link de convite é inválido ou expirou.'}</p>
        <Botao onClick={aoVoltar}>Ir para o Início</Botao>
      </div>
    );
  }

  const meuStatus = statusEquipe();
  const nomeAdmin = equipe.admin?.nome_completo || equipe.admin?.apelido || 'Capitão';

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>

      {/* Logo do PlayHub */}
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Shield size={28} color="#38bdf8" />
        <span style={{ color: '#f8fafc', fontWeight: '700', fontSize: '1.2rem' }}>PlayHub</span>
      </div>

      {/* Card Principal */}
      <div style={{
        width: '100%', maxWidth: '480px',
        background: 'rgba(15, 23, 42, 0.95)',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        borderRadius: '24px',
        overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
      }}>

        {/* Banner topo com gradiente */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(56,189,248,0.15) 0%, rgba(99,102,241,0.15) 100%)',
          padding: '2rem',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
          {/* Logo da equipe */}
          {equipe.logo_url ? (
            <img src={equipe.logo_url} alt={equipe.nome} style={{ width: '90px', height: '90px', borderRadius: '50%', border: '3px solid rgba(56,189,248,0.4)', objectFit: 'cover', marginBottom: '1rem' }} />
          ) : (
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'rgba(56,189,248,0.1)', border: '3px solid rgba(56,189,248,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <Trophy size={40} color="#38bdf8" />
            </div>
          )}
          <h2 style={{ color: '#f8fafc', margin: '0 0 0.5rem', fontSize: '1.4rem', fontWeight: '700' }}>{equipe.nome}</h2>
          <span style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', padding: '4px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: '600' }}>
            {equipe.modalidade}
          </span>
        </div>

        {/* Informações da equipe */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {/* Capitão */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {equipe.admin?.foto_url ? (
              <img src={equipe.admin.foto_url} alt={nomeAdmin} style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(251,191,36,0.3)' }} />
            ) : (
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(251,191,36,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Crown size={18} color="#fbbf24" />
              </div>
            )}
            <div>
              <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Capitão</div>
              <div style={{ color: '#f8fafc', fontWeight: '600', fontSize: '0.95rem' }}>{nomeAdmin}</div>
            </div>
          </div>

          {/* Localização */}
          {equipe.local_cidade && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8' }}>
              <MapPin size={16} color="#64748b" />
              <span style={{ fontSize: '0.9rem' }}>{equipe.local_cidade}{equipe.local_estado ? `, ${equipe.local_estado}` : ''}</span>
            </div>
          )}

          {/* Nível */}
          {equipe.nivel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8' }}>
              <Star size={16} color="#64748b" />
              <span style={{ fontSize: '0.9rem' }}>Nível: <strong style={{ color: '#f8fafc' }}>{equipe.nivel}</strong></span>
            </div>
          )}

          {/* Membros */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94a3b8' }}>
            <Users size={16} color="#64748b" />
            <span style={{ fontSize: '0.9rem' }}>{totalMembros} atleta{totalMembros !== 1 ? 's' : ''} na equipe</span>
          </div>
        </div>

        {/* Área de ação */}
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!usuario ? (
            <>
              <div style={{ padding: '1rem', background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.15)', borderRadius: '12px', color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center', lineHeight: '1.6' }}>
                👋 Para solicitar ingresso nesta equipe, você precisa ter uma conta no PlayHub. É rápido e gratuito!
              </div>
              <Botao
                onClick={() => aoNavegar ? aoNavegar('cadastro') : aoVoltar()}
                variant="primario"
                style={{ width: '100%', justifyContent: 'center', gap: '8px', padding: '14px' }}
              >
                <UserPlus size={18} /> Criar Conta Grátis
              </Botao>
              <Botao
                onClick={() => aoNavegar ? aoNavegar('login') : aoVoltar()}
                variant="secundario"
                style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
              >
                <LogIn size={18} /> Já tenho conta — Fazer Login
              </Botao>
            </>
          ) : meuStatus === 'dono' ? (
            <div style={{ padding: '1rem', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '12px', color: '#fbbf24', textAlign: 'center', fontWeight: '600' }}>
              👑 Você é o Capitão desta equipe
            </div>
          ) : meuStatus === 'membro' ? (
            <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', color: '#10b981', textAlign: 'center', fontWeight: '600' }}>
              ✓ Você já faz parte desta equipe
            </div>
          ) : solicitado ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '1rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', color: '#10b981', fontWeight: '600' }}>
              <CheckCircle size={20} /> Solicitação enviada! Aguarde aprovação do Capitão.
            </div>
          ) : (
            <Botao
              onClick={handleSolicitar}
              variant="primario"
              style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '1rem', gap: '8px' }}
            >
              <Users size={18} /> Solicitar Ingresso na Equipe
            </Botao>
          )}

          <p style={{ color: '#475569', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>
            Powered by PlayHub • Sistema de Gestão Esportiva
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaginaConvite;
