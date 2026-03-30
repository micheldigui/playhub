import React, { useState, useEffect } from 'react';
import { usarEquipe } from '../../../../contextos/EquipeContexto';
import { Crown, Users, Calendar, DollarSign, Settings, FileText, Loader2, CheckCircle2, XCircle, Save, ChevronDown, ShieldAlert } from 'lucide-react';

const PERMISSOES_DISPONIVEIS = [
    {
        id: 'gerenciar_membros',
        label: 'Gerenciar Membros',
        descricao: 'Adicionar/remover atletas, alterar vínculo (mensalista/avulso)',
        icone: Users,
        cor: '#38bdf8'
    },
    {
        id: 'gerenciar_partidas',
        label: 'Gerenciar Partidas',
        descricao: 'Criar, editar e cancelar partidas da equipe',
        icone: Calendar,
        cor: '#a78bfa'
    },
    {
        id: 'gerenciar_financeiro',
        label: 'Gerenciar Financeiro',
        descricao: 'Visualizar e operar ciclos de mensalidades e pagamentos',
        icone: DollarSign,
        cor: '#10b981'
    },
    {
        id: 'gerenciar_punicoes',
        label: 'Sistema de Fair Play',
        descricao: 'Aplicar cartões, justificar faltas e anistiar suspensões no VAR',
        icone: ShieldAlert,
        cor: '#ef4444'
    },
    {
        id: 'gerenciar_equipe',
        label: 'Configurações da Equipe',
        descricao: 'Editar dados, regras e visual da equipe',
        icone: Settings,
        cor: '#f59e0b'
    },
    {
        id: 'ver_relatorios',
        label: 'Ver Relatórios',
        descricao: 'Acesso a resumos históricos e relatórios de desempenho',
        icone: FileText,
        cor: '#fb923c'
    },
];

const EquipePermissoesTab = () => {
    const { equipeAtiva, carregarMembrosEquipe, atualizarPermissoesMembro } = usarEquipe();
    const [coAdmins, setCoAdmins] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [salvando, setSalvando] = useState(null);
    const [savedId, setSavedId] = useState(null);
    const [permissoesLocais, setPermissoesLocais] = useState({});
    // Controla qual card está expandido (null = todos fechados)
    const [expandido, setExpandido] = useState(null);

    useEffect(() => {
        if (equipeAtiva?.id) {
            carregarCoAdmins();
        }
    }, [equipeAtiva?.id]);

    const carregarCoAdmins = async () => {
        setCarregando(true);
        const membros = await carregarMembrosEquipe(equipeAtiva.id);
        const subs = (membros || []).filter(m => m.papel === 'sub_admin');
        setCoAdmins(subs);
        const estado = {};
        subs.forEach(m => {
            const perms = m.permissoes;
            estado[m.id] = Array.isArray(perms) ? perms : [];
        });
        setPermissoesLocais(estado);
        setCarregando(false);
    };

    const togglePermissao = (membroId, permId) => {
        setPermissoesLocais(prev => {
            const rawAtual = prev[membroId];
            const atual = Array.isArray(rawAtual) ? rawAtual : [];
            const novas = atual.includes(permId)
                ? atual.filter(p => p !== permId)
                : [...atual, permId];
            return { ...prev, [membroId]: novas };
        });
    };

    const toggleExpandido = (membroId) => {
        setExpandido(prev => prev === membroId ? null : membroId);
    };

    const handleSalvar = async (e, membroId) => {
        e.stopPropagation(); // Evita que o clique feche o card
        setSalvando(membroId);
        const res = await atualizarPermissoesMembro(membroId, permissoesLocais[membroId] || []);
        setSalvando(null);
        if (res.sucesso) {
            setSavedId(membroId);
            setTimeout(() => setSavedId(null), 2500);
        } else {
            alert('Erro ao salvar permissões: ' + res.erro);
        }
    };

    if (carregando) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                <Loader2 className="animate-spin" style={{ margin: '0 auto 12px' }} />
                Carregando Vice-Capitães...
            </div>
        );
    }

    if (coAdmins.length === 0) {
        return (
            <div style={{ padding: '60px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <Crown size={48} color="#475569" />
                <div>
                    <h3 style={{ color: '#f1f5f9', marginBottom: '8px' }}>Nenhum Vice-Capitão encontrado</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', maxWidth: '320px', margin: '0 auto' }}>
                        Promova um jogador a Vice-Capitão na aba <strong>Membros</strong> para configurar as permissões dele aqui.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Cabeçalho da Seção */}
            <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'rgba(148,163,184,0.1)', padding: '10px', borderRadius: '12px' }}>
                        <Crown color="#94a3b8" size={22} />
                    </div>
                    <div>
                        <h3 style={{ color: '#f8fafc', fontWeight: '700', fontSize: '1.1rem' }}>Permissões dos Vice-Capitães</h3>
                        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Clique em um Vice-Capitão para expandir e configurar suas permissões individualmente.</p>
                    </div>
                </div>
            </div>

            {/* Lista de Vice-Capitães (Acordeão) */}
            {coAdmins.map(membro => {
                const user = membro.usuarios;
                const rawPerms = permissoesLocais[membro.id];
                const permMembro = Array.isArray(rawPerms) ? rawPerms : [];
                const estasSalvando = salvando === membro.id;
                const foiSalvo = savedId === membro.id;
                const aberto = expandido === membro.id;

                return (
                    <div
                        key={membro.id}
                        style={{
                            background: 'rgba(15,23,42,0.6)',
                            borderRadius: '16px',
                            border: foiSalvo
                                ? '1px solid rgba(16,185,129,0.4)'
                                : aberto
                                ? '1px solid rgba(148,163,184,0.2)'
                                : '1px solid rgba(255,255,255,0.05)',
                            overflow: 'hidden',
                            transition: 'border-color 0.3s'
                        }}
                    >
                        {/* Header clicável do card */}
                        <div
                            onClick={() => toggleExpandido(membro.id)}
                            style={{
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '12px',
                                cursor: 'pointer',
                                borderBottom: aberto ? '1px solid rgba(255,255,255,0.05)' : 'none',
                                transition: 'background 0.2s',
                                background: aberto ? 'rgba(255,255,255,0.02)' : 'transparent',
                                userSelect: 'none',
                            }}
                        >
                            {/* Foto + Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', overflow: 'hidden', flexShrink: 0 }}>
                                    {user?.foto_url
                                        ? <img src={user.foto_url} alt={user.apelido} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: '1.2rem' }}>👤</div>
                                    }
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ color: '#f8fafc', fontWeight: '600' }}>{user?.nome_completo}</span>
                                        <Crown size={13} color="#94a3b8" title="Vice-Capitão" />
                                    </div>
                                    <span style={{ color: '#64748b', fontSize: '0.8rem' }}>
                                        {user?.apelido ? `@${user.apelido}` : user?.email || '—'}
                                        {' · '}
                                        <span style={{ color: permMembro.length > 0 ? '#38bdf8' : '#475569' }}>
                                            {permMembro.length} permissão(ões) ativa(s)
                                        </span>
                                    </span>
                                </div>
                            </div>

                            {/* Ações (Salvar + Chevron) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {aberto && (
                                    <button
                                        onClick={(e) => handleSalvar(e, membro.id)}
                                        disabled={estasSalvando}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            background: foiSalvo ? 'rgba(16,185,129,0.15)' : 'rgba(56,189,248,0.1)',
                                            border: foiSalvo ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(56,189,248,0.3)',
                                            color: foiSalvo ? '#10b981' : '#38bdf8',
                                            padding: '7px 16px', borderRadius: '10px',
                                            fontSize: '0.85rem', fontWeight: '600',
                                            cursor: estasSalvando ? 'wait' : 'pointer',
                                            transition: 'all 0.3s'
                                        }}
                                    >
                                        {estasSalvando
                                            ? <><Loader2 size={15} className="animate-spin" /> Salvando...</>
                                            : foiSalvo
                                            ? <><CheckCircle2 size={15} /> Salvo!</>
                                            : <><Save size={15} /> Salvar</>
                                        }
                                    </button>
                                )}
                                <ChevronDown
                                    size={20}
                                    color="#64748b"
                                    style={{
                                        transform: aberto ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.3s ease',
                                        flexShrink: 0
                                    }}
                                />
                            </div>
                        </div>

                        {/* Grid de permissões (colapsável) */}
                        {aberto && (
                            <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                                {PERMISSOES_DISPONIVEIS.map(perm => {
                                    const Icone = perm.icone;
                                    const ativa = permMembro.includes(perm.id);
                                    return (
                                        <button
                                            key={perm.id}
                                            onClick={() => togglePermissao(membro.id, perm.id)}
                                            style={{
                                                display: 'flex', alignItems: 'flex-start', gap: '12px',
                                                padding: '14px',
                                                background: ativa ? `rgba(${hexToRgb(perm.cor)},0.08)` : 'rgba(255,255,255,0.02)',
                                                border: ativa ? `1px solid ${perm.cor}55` : '1px solid rgba(255,255,255,0.06)',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            <div style={{
                                                width: '36px', height: '36px', borderRadius: '10px',
                                                background: ativa ? `rgba(${hexToRgb(perm.cor)},0.15)` : 'rgba(255,255,255,0.04)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                flexShrink: 0, transition: 'all 0.2s'
                                            }}>
                                                <Icone size={18} color={ativa ? perm.cor : '#475569'} />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                    <span style={{ color: ativa ? '#f8fafc' : '#94a3b8', fontWeight: '600', fontSize: '0.875rem' }}>
                                                        {perm.label}
                                                    </span>
                                                    {ativa
                                                        ? <CheckCircle2 size={16} color={perm.cor} />
                                                        : <XCircle size={16} color="#374151" />
                                                    }
                                                </div>
                                                <p style={{ color: '#64748b', fontSize: '0.78rem', lineHeight: '1.3', margin: 0 }}>
                                                    {perm.descricao}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// Utilitário para converter hex em RGB para usar em rgba()
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r},${g},${b}`;
}

export default EquipePermissoesTab;
