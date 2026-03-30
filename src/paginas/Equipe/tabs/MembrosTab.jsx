import React, { useState, useEffect } from 'react';
import { 
    Users, Crown, ShieldCheck, UserMinus, UserPlus, 
    MoreHorizontal, Mail, CreditCard, Wallet, Loader2,
    ShieldPlus, ShieldMinus, ShieldAlert, MessageCircle
} from 'lucide-react';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../../contextos/AutenticacaoContexto';
import InfoTooltip from '../../../componentes/Tooltip/InfoTooltip';

const MembrosTab = ({ membrosIniciais = [], recarregar }) => {
    const { equipeAtiva, atualizarMembro, removerMembro, temPermissaoEquipe, getLabelVinculo, getAcaoVinculo, transferirTitularidade } = usarEquipe();
    const { usuario, ehSuperAdmin } = usarAutenticacao();
    
    const [membros, setMembros] = useState(membrosIniciais);
    const [carregando, setCarregando] = useState(!membrosIniciais.length);
    const [processando, setProcessando] = useState(null);

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

    if (carregando) return <div className="p-8 text-center text-muted"><Loader2 className="animate-spin" /> Carregando membros...</div>;

    return (
        <div className="animate-fade-in" style={{ padding: '0 1rem' }}>
            <header style={{ marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.6rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Users size={28} color="var(--primaria)" /> Membros & Cargos
                </h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Gerencie os atletas da sua equipe e atribua responsabilidades.</p>
            </header>

            <div className="tabela-membros-container" style={{ background: 'rgba(15, 23, 42, 0.6)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.05)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
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
                            <th style={{ padding: '16px', textAlign: 'right', color: '#64748b', fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {membros.map(m => {
                            const idade = calcularIdade(m.usuarios.data_nascimento);
                            return (
                                <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', opacity: processando === m.id ? 0.5 : 1 }}>
                                    <td style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', background: '#1e293b', display: 'flex', alignItems: 'center', justify: 'center' }}>
                                                {m.usuarios.foto_url ? <img src={m.usuarios.foto_url} alt={m.usuarios.apelido} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Users size={18} color="#64748b" />}
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: '600', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                                                                        if(res.sucesso) window.location.reload();
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

            <style>{`
                .btn-membro-acao { background: none; border: 1px solid rgba(255,255,255,0.05); color: #64748b; padding: 8px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
                .btn-membro-acao:hover { background: rgba(255,255,255,0.05); color: #f1f5f9; border-color: rgba(255,255,255,0.1); }
                .btn-membro-acao.perigo:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }
            `}</style>
        </div>
    );
};

export default MembrosTab;
