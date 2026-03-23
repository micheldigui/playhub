import React, { useState, useEffect } from 'react';
import { Search, UserMinus, Crown, Users, Star, LogOut, ArrowRightLeft, X, CheckCircle2, AlertTriangle } from 'lucide-react';
import { usarEquipe } from '../../../../contextos/EquipeContexto';

const EquipeMembrosTab = () => {
    const { equipeAtiva, carregarMembrosEquipe, removerMembro, atualizarMembro, transferirTitularidade } = usarEquipe();
    const [membros, setMembros] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [termoBusca, setTermoBusca] = useState('');
    const [modalTransferencia, setModalTransferencia] = useState(false);
    const [membroParaTransferir, setMembroParaTransferir] = useState(null);
    const [etapaConfirmacao, setEtapaConfirmacao] = useState(false); // segundo passo no modal
    const [salvando, setSalvando] = useState(false);
    const [confirmandoRemocao, setConfirmandoRemocao] = useState(null); // ID do membro a remover

    // O admin geral (dono) é o usuário com papel 'admin' na equipeAtiva
    const euSouAdminGeral = equipeAtiva?.papel === 'admin';

    useEffect(() => {
        if (equipeAtiva?.id) {
            buscarMembros();
        }
    }, [equipeAtiva]);

    const buscarMembros = async () => {
        setCarregando(true);
        const data = await carregarMembrosEquipe(equipeAtiva.id);
        
        const ordenados = (data || []).sort((a, b) => {
            if (a.papel === 'admin' && b.papel !== 'admin') return -1;
            if (a.papel !== 'admin' && b.papel === 'admin') return 1;
            if (a.papel === 'sub_admin' && b.papel !== 'sub_admin') return -1;
            if (a.papel !== 'sub_admin' && b.papel === 'sub_admin') return 1;
            return (a.usuarios?.nome_completo || '').localeCompare(b.usuarios?.nome_completo || '');
        });

        setMembros(ordenados);
        setCarregando(false);
    };

    const handleRemoverMembro = async (membroId) => {
        if (confirmandoRemocao !== membroId) {
            setConfirmandoRemocao(membroId);
            setTimeout(() => setConfirmandoRemocao(null), 3000);
            return;
        }
        setConfirmandoRemocao(null);
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

    const handleTransferirTitularidade = async () => {
        if (!membroParaTransferir) return;
        if (!etapaConfirmacao) {
            setEtapaConfirmacao(true);
            return;
        }
        setSalvando(true);
        const res = await transferirTitularidade(equipeAtiva.id, membroParaTransferir.id);
        setSalvando(false);
        if (res.sucesso) {
            setModalTransferencia(false);
            setMembroParaTransferir(null);
            setEtapaConfirmacao(false);
            await buscarMembros();
        } else {
            alert('Erro ao transferir: ' + res.erro);
            setEtapaConfirmacao(false);
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

    // Candidatos para transferência: qualquer membro que não seja o admin atual
    const candidatosTransferencia = membros.filter(m => m.papel !== 'admin');

    if (carregando) {
        return <div className="p-8 text-center text-muted">Carregando membros da equipe...</div>;
    }

    return (
        <div className="animate-fade-in">
            <div style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '24px' }}>
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '8px', color: '#f8fafc' }}>Atletas da Equipe</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                            Gerencie os jogadores que fazem parte do seu elenco atualmente.
                        </p>
                    </div>
                    {/* Botão de Transferência de Titularidade — apenas admin geral */}
                    {euSouAdminGeral && (
                        <button
                            onClick={() => setModalTransferencia(true)}
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#f43f5e', padding: '8px 14px', borderRadius: '10px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}
                            title="Transferir titularidade da equipe"
                        >
                            <ArrowRightLeft size={15} /> Transferir Titularidade
                        </button>
                    )}
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
                                    border: isAdmin ? '1px solid rgba(251,191,36,0.15)' : '1px solid rgba(255, 255, 255, 0.05)',
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
                                    {/* Alterar vínculo mensalista — qualquer gestor */}
                                    {!isAdmin && (
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
                                    )}

                                    {/* Promover/rebaixar co-admin — APENAS o admin geral pode fazer isso */}
                                    {!isAdmin && euSouAdminGeral && (
                                        <button
                                            className="btn-acao-icone"
                                            onClick={() => handleAlterarPapel(membro.id, isSubAdmin ? 'jogador' : 'sub_admin')}
                                            title={isSubAdmin ? "Remover cargo de Co-Admin" : "Promover a Co-Admin"}
                                            style={{ 
                                                background: isSubAdmin ? 'rgba(148, 163, 184, 0.1)' : 'rgba(255, 255, 255, 0.05)', 
                                                color: isSubAdmin ? '#94a3b8' : '#64748b', 
                                                border: 'none',
                                                width: '36px', height: '36px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                                            }}
                                        >
                                            <Crown size={18} color={isSubAdmin ? '#94a3b8' : '#475569'} />
                                        </button>
                                    )}

                                    {/* Remover membro — não pode remover admin */}
                                    {!isAdmin && (
                                        <button 
                                            className={`btn-acao-icone ${confirmandoRemocao === membro.id ? 'btn-perigo' : ''}`}
                                            onClick={() => handleRemoverMembro(membro.id)}
                                            title={confirmandoRemocao === membro.id ? 'Clique para confirmar remoção' : 'Remover Atleta'}
                                            style={{ 
                                                width: '36px', height: '36px',
                                                background: confirmandoRemocao === membro.id ? 'rgba(244,63,94,0.2)' : undefined,
                                                border: confirmandoRemocao === membro.id ? '1px solid rgba(244,63,94,0.5)' : undefined,
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {confirmandoRemocao === membro.id ? <AlertTriangle size={18} color="#f43f5e" /> : <UserMinus size={18} />}
                                        </button>
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

            {/* Modal de Transferência de Titularidade */}
            {modalTransferencia && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
                    <div style={{ background: '#0f172a', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '20px', padding: '28px', maxWidth: '480px', width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <ArrowRightLeft size={22} color="#f43f5e" />
                                <h3 style={{ color: '#f8fafc', fontWeight: '700', fontSize: '1.1rem' }}>Transferir Titularidade</h3>
                            </div>
                            <button onClick={() => { setModalTransferencia(false); setMembroParaTransferir(null); }} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                                <X size={20} />
                            </button>
                        </div>

                        <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '20px', lineHeight: '1.5' }}>
                            ⚠️ Esta ação é <strong style={{ color: '#f43f5e' }}>irreversível sem a cooperação do novo admin</strong>. Selecione o membro que assumirá a titularidade:
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto', marginBottom: '20px' }}>
                            {candidatosTransferencia.map(m => {
                                const selecionado = membroParaTransferir?.id === m.id;
                                return (
                                    <button
                                        key={m.id}
                                        onClick={() => setMembroParaTransferir(m)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '12px 14px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                                            background: selecionado ? 'rgba(244,63,94,0.1)' : 'rgba(255,255,255,0.03)',
                                            border: selecionado ? '1px solid rgba(244,63,94,0.5)' : '1px solid rgba(255,255,255,0.06)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)', overflow: 'hidden', flexShrink: 0 }}>
                                            {m.usuarios?.foto_url
                                                ? <img src={m.usuarios.foto_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}><Users size={16} /></div>
                                            }
                                        </div>
                                        <div>
                                            <div style={{ color: '#f8fafc', fontWeight: '600', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {m.usuarios?.nome_completo}
                                                {m.papel === 'sub_admin' && <Crown size={12} color="#94a3b8" />}
                                            </div>
                                            <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                                                {m.usuarios?.apelido ? `@${m.usuarios.apelido}` : m.usuarios?.email}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {etapaConfirmacao ? (
                            <div style={{ marginTop: '4px' }}>
                                <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: '12px', padding: '14px', marginBottom: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                    <AlertTriangle size={18} color="#f43f5e" style={{ flexShrink: 0, marginTop: '1px' }} />
                                    <p style={{ color: '#f43f5e', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                                        <strong>{membroParaTransferir?.usuarios?.nome_completo}</strong> se tornará o novo Administrador Geral. Você passará a ser Co-Admin.
                                        <br /><span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Esta ação não pode ser desfeita sozinho.</span>
                                    </p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={() => setEtapaConfirmacao(false)}
                                        style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', borderRadius: '10px', fontWeight: '600', fontSize: '0.88rem', cursor: 'pointer' }}
                                    >Cancelar</button>
                                    <button
                                        onClick={handleTransferirTitularidade}
                                        disabled={salvando}
                                        style={{ flex: 2, padding: '11px', background: 'rgba(244,63,94,0.2)', border: '1px solid rgba(244,63,94,0.5)', color: '#f43f5e', borderRadius: '10px', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer' }}
                                    >
                                        {salvando ? 'Transferindo...' : 'Confirmar Transferência'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleTransferirTitularidade}
                                disabled={!membroParaTransferir || salvando}
                                style={{
                                    width: '100%', padding: '12px',
                                    background: membroParaTransferir ? 'rgba(244,63,94,0.15)' : 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(244,63,94,0.4)',
                                    color: membroParaTransferir ? '#f43f5e' : '#475569',
                                    borderRadius: '12px', fontWeight: '600', fontSize: '0.9rem', cursor: membroParaTransferir ? 'pointer' : 'not-allowed'
                                }}
                            >
                                {membroParaTransferir ? `Transferir para ${membroParaTransferir.usuarios?.nome_completo}` : 'Selecione um membro acima'}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EquipeMembrosTab;
