import React, { useState, useEffect } from 'react';
import { 
    Users, Crown, ShieldCheck, UserMinus, UserPlus, 
    MoreHorizontal, Mail, CreditCard, Wallet, Loader2,
    ShieldPlus, ShieldMinus, ShieldAlert, MessageCircle
} from 'lucide-react';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../../contextos/AutenticacaoContexto';
import InfoTooltip from '../../../componentes/Tooltip/InfoTooltip';
import ModalPerfilAtleta from '../../../componentes/Modais/ModalPerfilAtleta';

const MembrosTab = ({ membrosIniciais = [], recarregar }) => {
    const { equipeAtiva, atualizarMembro, removerMembro, temPermissaoEquipe, getLabelVinculo, getAcaoVinculo, transferirTitularidade } = usarEquipe();
    const { usuario, ehSuperAdmin } = usarAutenticacao();
    
    const [membros, setMembros] = useState(membrosIniciais);
    const [carregando, setCarregando] = useState(!membrosIniciais.length);
    const [processando, setProcessando] = useState(null);
    const [idAtletaSelecionado, setIdAtletaSelecionado] = useState(null);
    const [modalPerfilAberto, setModalPerfilAberto] = useState(false);

    // Sincroniza estado local se as props mudarem (ex: mudança de equipe)
    useEffect(() => {
        setMembros(membrosIniciais);
        setCarregando(false);
    }, [membrosIniciais]);

    const calcularIdade = (dataNasc) => {
        if (!dataNasc) return null;
        const hoje = new Date();
        const nasc = new Date(dataNasc);
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const m = hoje.getMonth() - nasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
        return idade;
    };

    const handleAcaoSucesso = async () => {
        if (recarregar) {
            await recarregar();
        }
    };

    const handleAlterarVinculo = async (membroId, novoVinculo) => {
        setProcessando(membroId);
        const res = await atualizarMembro(membroId, { vinculo: novoVinculo });
        if (res.sucesso) {
            await handleAcaoSucesso();
        } else {
            alert('Erro ao atualizar vínculo: ' + res.erro);
        }
        setProcessando(null);
    };

    const handleAlterarPapel = async (membroId, novoPapel) => {
        const label = novoPapel === 'sub_admin' ? 'Vice-Capitão' : 'Jogador';
        if (!window.confirm(`Deseja alterar o cargo deste membro para ${label}?`)) return;
        
        setProcessando(membroId);
        const res = await atualizarMembro(membroId, { papel: novoPapel });
        if (res.sucesso) {
            await handleAcaoSucesso();
        } else {
            alert('Erro ao alterar cargo: ' + res.erro);
        }
        setProcessando(null);
    };

    const handleRemover = async (membroId, nome) => {
        if (!window.confirm(`Tem certeza que deseja remover ${nome} da equipe?`)) return;
        
        setProcessando(membroId);
        const res = await removerMembro(membroId);
        if (res.sucesso) {
            setMembros(prev => prev.filter(m => m.id !== membroId));
        } else {
            alert('Erro ao remover membro: ' + res.erro);
        }
        setProcessando(null);
    };

    const abrirPerfil = (membro) => {
        setIdAtletaSelecionado(membro.usuario_id);
        setModalPerfilAberto(true);
    };

    if (carregando) return <div className="p-8 text-center text-muted"><Loader2 className="animate-spin" /> Carregando membros...</div>;

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <header style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.6rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Users size={28} color="var(--primaria)" /> Membros & Cargos
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Gerencie os atletas da sua equipe e atribua responsabilidades.</p>
            </header>

            <div className="tabela-membros-wrapper">
                <table className="tabela-membros">
                    <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                            <th style={{ padding: '16px', color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Atleta</th>
                            <th style={{ padding: '16px', color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                Cargo
                                <InfoTooltip texto="Capitão: Dono e gestor total. Vice-Capitão: Auxilia na gestão com permissões específicas. Jogador: Membro comum." />
                            </th>
                            <th style={{ padding: '16px', color: '#64748b', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>Entrou em</th>
                            <th style={{ padding: '16px', textAlign: 'left', color: '#64748b', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>
                                Vínculo
                                <InfoTooltip texto="Mensalista: Atleta fixo que paga mensalidade. Avulso: Atleta convidado que paga apenas pelo jogo que participar." />
                            </th>
                            <th style={{ padding: '16px', textAlign: 'right', color: '#64748b', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>
                                Ações
                                <InfoTooltip texto="Coroa Amarela: Transfere a liderança total. Você deixa de ser capitão. Escudo (+/-): Promove a Vice-Capitão ou rebaixa para Jogador. X Vermelho: Remove o atleta definitivamente." posicao="top" />
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {membros.filter(m => m.usuarios).map(m => {
                            const idade = calcularIdade(m.usuarios.data_nascimento);
                            return (
                                <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', opacity: processando === m.id ? 0.5 : 1 }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div 
                                                onClick={() => abrirPerfil(m)}
                                                style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                                            >
                                                {m.usuarios.foto_url ? <img src={m.usuarios.foto_url} alt={m.usuarios.apelido} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Users size={18} color="#64748b" />}
                                            </div>
                                            <div>
                                                <div 
                                                    onClick={() => abrirPerfil(m)}
                                                    style={{ fontWeight: '600', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                                                >
                                                    {m.usuarios.nome_completo}
                                                    {m.papel === 'admin' && <Crown size={12} color="#fbbf24" style={{ marginLeft: '4px' }} title="Capitão" />}
                                                    {m.papel === 'sub_admin' && <Crown size={12} color="#cbd5e1" style={{ marginLeft: '4px' }} title="Vice-Capitão" />}
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>@{m.usuarios.apelido}</div>
                                                    {m.usuarios.telefone && idade >= 18 ? (
                                                        <a 
                                                            href={`https://wa.me/55${m.usuarios.telefone.replace(/\D/g, '')}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            style={{ color: '#25D366', display: 'flex', alignItems: 'center' }}
                                                            title="Conversar no WhatsApp"
                                                        >
                                                            <MessageCircle size={12} />
                                                        </a>
                                                    ) : m.usuarios.telefone && (
                                                        <span title="Contato restrito para menores" style={{ color: '#64748b', opacity: 0.5, display: 'flex', alignItems: 'center' }}>
                                                            <MessageCircle size={12} />
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px' }}>
                                        <span style={{ 
                                            fontSize: '0.7rem', fontWeight: 'bold', padding: '4px 10px', borderRadius: '8px',
                                            background: m.papel === 'admin' ? 'rgba(251, 191, 36, 0.1)' : m.papel === 'sub_admin' ? 'rgba(203, 213, 225, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                                            color: m.papel === 'admin' ? '#fbbf24' : m.papel === 'sub_admin' ? '#cbd5e1' : '#94a3b8'
                                        }}>
                                            {m.papel === 'admin' ? 'Capitão' : m.papel === 'sub_admin' ? 'Vice-Capitão' : 'Jogador'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px', color: '#94a3b8' }}>{new Date(m.entrou_em).toLocaleDateString('pt-BR')}</td>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ 
                                                fontSize: '0.8rem', 
                                                padding: '4px 10px', 
                                                borderRadius: '6px',
                                                background: m.vinculo === 'mensalista' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                                                color: m.vinculo === 'mensalista' ? '#38bdf8' : '#94a3b8',
                                                fontWeight: '600'
                                            }}>
                                                {getLabelVinculo(m.vinculo)}
                                            </span>
                                            {(equipeAtiva.papel === 'admin' || temPermissaoEquipe('gerenciar_membros')) && (
                                                <button 
                                                    onClick={() => handleAlterarVinculo(m.id, m.vinculo === 'mensalista' ? 'avulso' : 'mensalista')}
                                                    style={{ 
                                                        background: m.vinculo === 'mensalista' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(56, 189, 248, 0.15)', 
                                                        border: '1px solid rgba(255,255,255,0.05)', 
                                                        color: m.vinculo === 'mensalista' ? '#94a3b8' : '#38bdf8', 
                                                        cursor: 'pointer', 
                                                        display: 'flex', 
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        transition: 'all 0.2s',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600'
                                                    }}
                                                    className="btn-acao-membro"
                                                    title={getAcaoVinculo(m.vinculo)}
                                                >
                                                    {m.vinculo === 'mensalista' ? <CreditCard size={14} /> : <Wallet size={14} />}
                                                    {getAcaoVinculo(m.vinculo)}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            {(m.usuario_id !== usuario?.id || ehSuperAdmin) && m.papel !== 'admin' && (
                                                <>
                                                    {equipeAtiva.papel === 'admin' && (
                                                        <>
                                                            <button 
                                                                className="btn-membro-acao" 
                                                                title="Passar a bola (Tornar Capitão)"
                                                                onClick={async () => {
                                                                    if(window.confirm(`Tem certeza que deseja passar a bola para ${m.usuarios.nome_completo}? Você deixará de ser o Capitão.`)) {
                                                                        const res = await transferirTitularidade(equipeAtiva.id, m.id);
                                                                        if(res.sucesso) setTimeout(() => window.location.reload(), 800);
                                                                        else alert(res.erro);
                                                                    }
                                                                }}
                                                                style={{ color: '#fbbf24' }}
                                                            >
                                                                <Crown size={18} />
                                                            </button>
                                                            {m.papel === 'jogador' ? (
                                                                <button 
                                                                    onClick={() => handleAlterarPapel(m.id, 'sub_admin')}
                                                                    className="btn-membro-acao"
                                                                    title="Promover a Vice-Capitão"
                                                                >
                                                                    <ShieldPlus size={18} />
                                                                </button>
                                                            ) : m.papel === 'sub_admin' && (
                                                                <button 
                                                                    onClick={() => handleAlterarPapel(m.id, 'jogador')}
                                                                    className="btn-membro-acao"
                                                                    title="Rebaixar para Jogador"
                                                                >
                                                                    <ShieldMinus size={18} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}

                                                    {(equipeAtiva.papel === 'admin' || (temPermissaoEquipe('gerenciar_membros') && m.papel === 'jogador')) && (
                                                        <button 
                                                            onClick={() => handleRemover(m.id, m.usuarios.nome_completo)}
                                                            className="btn-membro-acao perigo"
                                                            title="Remover da Equipe"
                                                        >
                                                            <UserMinus size={18} />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Versão MOBILE: Cards */}
            <div className="grade-membros-mobile">
                {membros.filter(m => m.usuarios).map(m => {
                    const idade = calcularIdade(m.usuarios.data_nascimento);
                    return (
                        <div key={m.id} className="card-membro-mobile" style={{ opacity: processando === m.id ? 0.5 : 1 }}>
                            <div className="card-membro-topo">
                                <div className="card-membro-avatar" onClick={() => abrirPerfil(m)} style={{ cursor: 'pointer' }}>
                                    {m.usuarios.foto_url ? (
                                        <img src={m.usuarios.foto_url} alt={m.usuarios.apelido} />
                                    ) : (
                                        <div className="avatar-placeholder"><Users size={20} /></div>
                                    )}
                                    {m.papel === 'admin' && <div className="badge-lider"><Crown size={12} /></div>}
                                </div>
                                <div className="card-membro-infos">
                                    <div className="nome-atleta" onClick={() => abrirPerfil(m)} style={{ cursor: 'pointer' }}>
                                        {m.usuarios.nome_completo}
                                        {m.papel === 'sub_admin' && <ShieldCheck size={14} color="#94a3b8" />}
                                    </div>
                                    <div className="apelido-atleta">
                                        @{m.usuarios.apelido}
                                        {m.usuarios.telefone && idade >= 18 && (
                                            <a href={`https://wa.me/55${m.usuarios.telefone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn-zap">
                                                <MessageCircle size={14} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="card-membro-tags">
                                <div className="tag-status" style={{ 
                                    background: m.papel === 'admin' ? 'rgba(251, 191, 36, 0.1)' : m.papel === 'sub_admin' ? 'rgba(203, 213, 225, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                                    color: m.papel === 'admin' ? '#fbbf24' : m.papel === 'sub_admin' ? '#cbd5e1' : '#94a3b8'
                                }}>
                                    {m.papel === 'admin' ? 'Capitão' : m.papel === 'sub_admin' ? 'Vice-Capitão' : 'Jogador'}
                                </div>
                                <div className="tag-status" style={{ 
                                    background: m.vinculo === 'mensalista' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(148, 163, 184, 0.1)',
                                    color: m.vinculo === 'mensalista' ? '#38bdf8' : '#94a3b8'
                                }}>
                                    {getLabelVinculo(m.vinculo)}
                                </div>
                            </div>

                            <div className="card-membro-detalhes">
                                <span>Entrou em: {new Date(m.entrou_em).toLocaleDateString('pt-BR')}</span>
                            </div>

                            <div className="card-membro-acoes">
                                {(equipeAtiva.papel === 'admin' || temPermissaoEquipe('gerenciar_membros')) && (
                                    <button 
                                        onClick={() => handleAlterarVinculo(m.id, m.vinculo === 'mensalista' ? 'avulso' : 'mensalista')}
                                        className="btn-card-vinculo"
                                    >
                                        {m.vinculo === 'mensalista' ? <Wallet size={16} /> : <CreditCard size={16} />}
                                        {getAcaoVinculo(m.vinculo)}
                                    </button>
                                )}

                                <div className="grupo-acoes-admin">
                                    {(m.usuario_id !== usuario?.id || ehSuperAdmin) && m.papel !== 'admin' && (
                                        <>
                                            {equipeAtiva.papel === 'admin' && (
                                                <>
                                                    <button 
                                                        className="btn-card-icon" 
                                                        onClick={async () => {
                                                            if(window.confirm(`Passar a bola para ${m.usuarios.nome_completo}?`)) {
                                                                const res = await transferirTitularidade(equipeAtiva.id, m.id);
                                                                if(res.sucesso) setTimeout(() => window.location.reload(), 800);
                                                                else alert(res.erro);
                                                            }
                                                        }}
                                                        style={{ color: '#fbbf24' }}
                                                    >
                                                        <Crown size={20} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleAlterarPapel(m.id, m.papel === 'jogador' ? 'sub_admin' : 'jogador')}
                                                        className="btn-card-icon"
                                                    >
                                                        {m.papel === 'jogador' ? <ShieldPlus size={20} /> : <ShieldMinus size={20} />}
                                                    </button>
                                                </>
                                            )}
                                            {(equipeAtiva.papel === 'admin' || (temPermissaoEquipe('gerenciar_membros') && m.papel === 'jogador')) && (
                                                <button 
                                                    onClick={() => handleRemover(m.id, m.usuarios.nome_completo)}
                                                    className="btn-card-icon perigo"
                                                >
                                                    <UserMinus size={20} />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style>{`
                .tabela-membros-wrapper {
                    background: rgba(15, 23, 42, 0.6);
                    border-radius: 16px;
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    overflow-x: auto;
                    -webkit-overflow-scrolling: touch;
                }
                .tabela-membros { width: 100%; border-collapse: collapse; min-width: 600px; }
                .btn-membro-acao { background: none; border: 1px solid rgba(255,255,255,0.05); color: #64748b; padding: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
                .btn-membro-acao:hover { background: rgba(255,255,255,0.05); color: #f1f5f9; border-color: rgba(255,255,255,0.1); }
                .btn-membro-acao.perigo:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }
                
                /* Layout de Cards Mobile */
                .grade-membros-mobile { display: none; flex-direction: column; gap: 16px; }
                .card-membro-mobile { 
                    background: rgba(30, 41, 59, 0.5); 
                    border: 1px solid rgba(255,255,255,0.05); 
                    border-radius: 16px; 
                    padding: 16px; 
                    display: flex; 
                    flex-direction: column; 
                    gap: 12px; 
                }
                .card-membro-topo { display: flex; align-items: center; gap: 12px; }
                .card-membro-avatar { position: relative; width: 48px; height: 48px; flex-shrink: 0; }
                .card-membro-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
                .avatar-placeholder { width: 48px; height: 48px; border-radius: 50%; background: #1e293b; display: flex; align-items: center; justify-content: center; color: #64748b; }
                .badge-lider { position: absolute; bottom: -2px; right: -2px; background: #fbbf24; color: #000; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; border: 2px solid #1e293b; }
                
                .card-membro-infos { flex: 1; min-width: 0; }
                .nome-atleta { color: #f1f5f9; font-weight: 600; font-size: 1rem; display: flex; align-items: center; gap: 6px; }
                .apelido-atleta { color: #64748b; font-size: 0.85rem; display: flex; align-items: center; gap: 6px; }
                .btn-zap { color: #25D366; display: flex; align-items: center; }

                .card-membro-tags { display: flex; gap: 8px; flex-wrap: wrap; }
                .tag-status { padding: 4px 10px; border-radius: 8px; font-size: 0.75rem; font-weight: bold; }

                .card-membro-detalhes { font-size: 0.75rem; color: #64748b; }

                .card-membro-acoes { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    border-top: 1px solid rgba(255,255,255,0.05); 
                    padding-top: 12px;
                    margin-top: 4px;
                }
                .btn-card-vinculo { border: 1px solid rgba(56, 189, 248, 0.2); background: rgba(56, 189, 248, 0.05); color: #38bdf8; display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; font-size: 0.8rem; font-weight: 600; cursor: pointer; }
                .grupo-acoes-admin { display: flex; gap: 8px; }
                .btn-card-icon { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); color: #94a3b8; padding: 8px; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
                .btn-card-icon.perigo { color: #f43f5e; background: rgba(244, 63, 94, 0.05); }

                @media (max-width: 768px) {
                    .tabela-membros-wrapper { display: none; }
                    .grade-membros-mobile { display: flex; }
                    header h2 { font-size: 1.4rem; }
                }

                @media (max-width: 640px) {
                    .animate-fade-in { padding: 0 0.5rem !important; }
                }
            `}</style>

            <ModalPerfilAtleta 
                isOpen={modalPerfilAberto}
                onClose={() => setModalPerfilAberto(false)}
                idAtleta={idAtletaSelecionado}
            />
        </div>
    );
};


export default MembrosTab;
