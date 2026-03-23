import React, { useState, useEffect } from 'react';
import { Search, UserMinus, ShieldCheck, Crown, Users, Star } from 'lucide-react';
import { usarEquipe } from '../../../../contextos/EquipeContexto';
import Botao from '../../../../componentes/Botao/Botao';

const EquipeMembrosTab = () => {
    const { equipeAtiva, carregarMembrosEquipe, removerMembro, atualizarMembro } = usarEquipe();
    const [membros, setMembros] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [termoBusca, setTermoBusca] = useState('');

    useEffect(() => {
        if (equipeAtiva?.id) {
            buscarMembros();
        }
    }, [equipeAtiva]);

    const buscarMembros = async () => {
        setCarregando(true);
        const data = await carregarMembrosEquipe(equipeAtiva.id);
        
        // Ordena para que Administradores apareçam primeiro
        const ordenados = data.sort((a, b) => {
            if (a.papel === 'admin' && b.papel !== 'admin') return -1;
            if (a.papel !== 'admin' && b.papel === 'admin') return 1;
            if (a.papel === 'sub_admin' && b.papel !== 'sub_admin') return -1;
            if (a.papel !== 'sub_admin' && b.papel === 'sub_admin') return 1;
            return (a.usuarios?.nome_completo || '').localeCompare(b.usuarios?.nome_completo || '');
        });

        setMembros(ordenados);
        setCarregando(false);
    };

    const handleRemoverMembro = async (membroId, nome) => {
        if (!window.confirm(`Tem certeza que deseja remover ${nome} da equipe?`)) return;

        const result = await removerMembro(membroId);
        if (result.sucesso) {
            setMembros(prev => prev.filter(m => m.id !== membroId));
        } else {
            alert('Erro ao remover membro: ' + result.erro);
        }
    };

    const handleAlterarVinculo = async (membroId, novoVinculo) => {
        const result = await atualizarMembro(membroId, { vinculo: novoVinculo });
        if (result.sucesso) {
            setMembros(prev => prev.map(m => m.id === membroId ? { ...m, vinculo: novoVinculo } : m));
        } else {
            alert('Erro ao alterar vínculo: ' + result.erro);
        }
    };

    const handleAlterarPapel = async (membroId, novoPapel) => {
        const result = await atualizarMembro(membroId, { papel: novoPapel });
        if (result.sucesso) {
            setMembros(prev => prev.map(m => m.id === membroId ? { ...m, papel: novoPapel } : m));
        } else {
            alert('Erro ao alterar papel: ' + result.erro);
        }
    };

    const membrosFiltrados = membros.filter(m => {
        if (!termoBusca) return true;
        const termo = termoBusca.toLowerCase();
        return (
            m.usuarios?.nome_completo?.toLowerCase().includes(termo) ||
            m.usuarios?.apelido?.toLowerCase().includes(termo) ||
            m.usuarios?.email?.toLowerCase().includes(termo)
        );
    });

    if (carregando) {
        return <div className="p-8 text-center text-muted">Carregando membros da equipe...</div>;
    }

    return (
        <div className="animate-fade-in">
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '24px' }}>
                <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px', color: '#f8fafc' }}>Atletas da Equipe</h3>
                    <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                        Gerencie os jogadores que fazem parte do seu elenco atualmente.
                    </p>
                </div>

                <div className="barra-busca-equipe" style={{ marginBottom: '24px' }}>
                    <div className="input-busca-grupo" style={{ width: '100%' }}>
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome, apelido, ou email..."
                            value={termoBusca}
                            onChange={(e) => setTermoBusca(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '12px' }}>
                    {membrosFiltrados.length > 0 ? membrosFiltrados.map(membro => {
                        const user = membro.usuarios;
                        const isAdmin = membro.papel === 'admin';
                        const isSubAdmin = membro.papel === 'sub_admin';

                        return (
                            <div
                                key={membro.id}
                                style={{
                                    padding: '16px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '16px'
                                }}
                            >
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', flexShrink: 0 }}>
                                    {user?.foto_url ? (
                                        <img src={user.foto_url} alt={user?.apelido} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                                            <Users size={24} />
                                        </div>
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ fontWeight: '600', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {user?.nome_completo}
                                        </div>
                                        {isAdmin && <span title="Administrador Geral" style={{ display: 'flex' }}><Crown size={14} color="#fbbf24" /></span>}
                                        {isSubAdmin && <span title="Co-Administrador" style={{ display: 'flex' }}><Crown size={14} color="#94a3b8" /></span>}
                                        {membro.vinculo === 'mensalista' && <span title="Mensalista" style={{ display: 'flex' }}><Star size={14} fill="#fbbf24" color="#fbbf24" /></span>}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                                        {user?.apelido && `@${user?.apelido} • `}{user?.cidade}
                                    </div>
                                </div>
                                <div style={{ flexShrink: 0, display: 'flex', gap: '8px' }}>
                                    <button
                                        className="btn-acao-icone"
                                        onClick={() => handleAlterarVinculo(membro.id, membro.vinculo === 'mensalista' ? 'avulso' : 'mensalista')}
                                        title={membro.vinculo === 'mensalista' ? "Alterar para Avulso" : "Tornar Mensalista"}
                                        style={{ 
                                            background: membro.vinculo === 'mensalista' ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255, 255, 255, 0.05)', 
                                            color: membro.vinculo === 'mensalista' ? '#fbbf24' : '#94a3b8', 
                                            border: 'none',
                                            width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        {membro.vinculo === 'mensalista' ? <Star size={18} fill="currentColor" /> : <Star size={18} />}
                                    </button>

                                    {!isAdmin && (
                                        <>
                                            <button
                                                className="btn-acao-icone"
                                                onClick={() => handleAlterarPapel(membro.id, isSubAdmin ? 'jogador' : 'sub_admin')}
                                                title={isSubAdmin ? "Remover cargo de Co-Admin" : "Promover a Co-Admin"}
                                                style={{ 
                                                    background: isSubAdmin ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.05)', 
                                                    color: isSubAdmin ? '#38bdf8' : '#94a3b8', 
                                                    border: 'none',
                                                    width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                                                }}
                                            >
                                                <ShieldCheck size={18} />
                                            </button>

                                            <button 
                                                className="btn-acao-icone btn-perigo" 
                                                onClick={() => handleRemoverMembro(membro.id, user?.apelido || user?.nome_completo)}
                                                title="Remover Atleta"
                                                style={{ width: '36px', height: '36px' }}
                                            >
                                                <UserMinus size={18} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    }) : (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                            Nenhum atleta encontrado.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EquipeMembrosTab;
