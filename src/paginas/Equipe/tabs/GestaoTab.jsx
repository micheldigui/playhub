import React, { useState, useEffect } from 'react';
import { 
  Settings, Users, Shield, Edit2, Trash2, Crown, 
  UserPlus, UserMinus, ShieldCheck, ShieldAlert,
  Save, X, Info
} from 'lucide-react';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../../contextos/AutenticacaoContexto';
import Botao from '../../../componentes/Botao/Botao';

const GestaoTab = ({ abrirEdicao, aoExcluir }) => {
    const { 
        equipeAtiva, carregarMembrosEquipe, atualizarMembro, removerMembro, 
        transferirTitularidade 
    } = usarEquipe();
    const { ehSuperAdmin, usuario } = usarAutenticacao();
    
    const [membros, setMembros] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [processando, setProcessando] = useState(null); // ID do membro sendo editado

    useEffect(() => {
        if (equipeAtiva?.id) {
            buscarMembros();
        }
    }, [equipeAtiva]);

    const buscarMembros = async () => {
        setCarregando(true);
        const dados = await carregarMembrosEquipe(equipeAtiva.id);
        setMembros(dados || []);
        setCarregando(false);
    };

    const handleAlterarPapel = async (membroId, novoPapel) => {
        const label = novoPapel === 'sub_admin' ? 'Vice-Capitão' : 'Jogador';
        if (!window.confirm(`Deseja alterar o cargo deste membro para ${label}?`)) return;
        
        setProcessando(membroId);
        const res = await atualizarMembro(membroId, { papel: novoPapel });
        if (res.sucesso) {
            await buscarMembros();
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

    if (carregando) return <div className="p-8 text-center text-muted">Carregando painel de gestão...</div>;

    const ehDono = equipeAtiva.admin_id === usuario?.id || ehSuperAdmin;

    return (
        <div className="animate-fade-in gestao-container">
            <header className="gestao-header">
                <div>
                    <h2><Settings size={24} /> Gestão da Equipe</h2>
                    <p>Controle de informações, membros e governança do seu time.</p>
                </div>
            </header>

            <div className="gestao-grade">
                {/* ── SEÇÃO 1: CONFIGURAÇÕES BÁSICAS ── */}
                <section className="gestao-card">
                    <div className="gestao-card-topo">
                        <div className="icone-bg azul"><Edit2 size={20} /></div>
                        <div>
                            <h3>Configurações do Time</h3>
                            <p>Nome, logo, localização e visibilidade.</p>
                        </div>
                    </div>
                    <div className="gestao-card-acoes">
                        <Botao onClick={abrirEdicao} style={{ width: '100%' }}>
                            <Edit2 size={16} /> Editar Informações
                        </Botao>
                        {ehDono && (
                            <Botao variant="secundario" onClick={aoExcluir} style={{ width: '100%', marginTop: '10px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                                <Trash2 size={16} /> Excluir Equipe
                            </Botao>
                        )}
                    </div>
                </section>

                {/* ── SEÇÃO 2: RESUMO DE MEMBROS ── */}
                <section className="gestao-card">
                    <div className="gestao-card-topo">
                        <div className="icone-bg roxo"><Users size={20} /></div>
                        <div>
                            <h3>Comunicação</h3>
                            <p>Links e contatos da equipe.</p>
                        </div>
                    </div>
                    <div className="gestao-card-conteudo">
                        <div className="info-item">
                            <span className="info-label">WhatsApp:</span>
                            <span className="info-valor">{equipeAtiva.link_grupo ? 'Configurado' : 'Não definido'}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Privacidade:</span>
                            <span className="info-valor">{equipeAtiva.visibilidade === 'publica' ? 'Pública' : 'Privada'}</span>
                        </div>
                    </div>
                </section>
            </div>

            {/* ── SEÇÃO 3: LISTA DE MEMBROS (FULL WIDTH) ── */}
            <section className="gestao-membros-section">
                <div className="section-header">
                    <h3><ShieldCheck size={20} color="var(--primaria)" /> Membros & Cargos</h3>
                    <span className="badge-contagem">{membros.length} Atletas</span>
                </div>

                <div className="tabela-membros-container">
                    <table className="tabela-membros">
                        <thead>
                            <tr>
                                <th>Atleta</th>
                                <th>Cargo</th>
                                <th>Entrou em</th>
                                <th style={{ textAlign: 'right' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {membros.map(m => (
                                <tr key={m.id} className={processando === m.id ? 'processando' : ''}>
                                    <td>
                                        <div className="membro-celula">
                                            <div className="membro-avatar">
                                                {m.usuarios.foto_url ? <img src={m.usuarios.foto_url} alt={m.usuarios.apelido} /> : <Users size={16} />}
                                            </div>
                                            <div>
                                                <div className="membro-nome">
                                                    {m.usuarios.nome_completo}
                                                    {m.papel === 'admin' && <Crown size={12} title="Capitão" className="icone-capitao" />}
                                                </div>
                                                <div className="membro-sub">@{m.usuarios.apelido}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge-cargo ${m.papel}`}>
                                            {m.papel === 'admin' ? 'Capitão' : m.papel === 'sub_admin' ? 'Vice-Capitão' : 'Jogador'}
                                        </span>
                                    </td>
                                    <td>{new Date(m.entrou_em).toLocaleDateString('pt-BR')}</td>
                                    <td>
                                        <div className="membro-acoes">
                                            {m.papel !== 'admin' && m.usuario_id !== usuario?.id && (
                                                <>
                                                    {m.papel === 'jogador' ? (
                                                        <button 
                                                            className="btn-membro-acao" 
                                                            title="Promover a Vice-Capitão"
                                                            onClick={() => handleAlterarPapel(m.id, 'sub_admin')}
                                                        >
                                                            <ShieldCheck size={18} />
                                                        </button>
                                                    ) : (
                                                        <>
                                                            {equipeAtiva.papel === 'admin' && (
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
                                                            )}
                                                            <button 
                                                                className="btn-membro-acao" 
                                                                title="Rebaixar para Jogador"
                                                                onClick={() => handleAlterarPapel(m.id, 'jogador')}
                                                            >
                                                                <ShieldAlert size={18} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button 
                                                        className="btn-membro-acao perigo" 
                                                        title="Remover do Time"
                                                        onClick={() => handleRemover(m.id, m.usuarios.nome_completo)}
                                                    >
                                                        <UserMinus size={18} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <style>{`
                .gestao-container { padding: 0 1rem; }
                .gestao-header { margin-bottom: 2rem; }
                .gestao-header h2 { font-size: 1.6rem; color: #f8fafc; display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
                .gestao-header p { color: #94a3b8; font-size: 0.9rem; }
                
                .gestao-grade { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem; }
                .gestao-card { background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 1.5rem; }
                .gestao-card-topo { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
                .icone-bg { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
                .icone-bg.azul { background: linear-gradient(135deg, #0ea5e9, #2563eb); }
                .icone-bg.roxo { background: linear-gradient(135deg, #8b5cf6, #6366f1); }
                .gestao-card h3 { font-size: 1.1rem; color: #f1f5f9; margin-bottom: 4px; }
                .gestao-card p { font-size: 0.85rem; color: #64748b; }
                
                .info-item { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
                .info-label { color: #64748b; font-size: 0.85rem; }
                .info-valor { color: #cbd5e1; font-size: 0.85rem; font-weight: 500; }

                .gestao-membros-section { background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 1.5rem; }
                .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
                .badge-contagem { background: rgba(56, 189, 248, 0.1); color: #38bdf8; font-size: 0.75rem; font-weight: 600; padding: 2px 10px; border-radius: 12px; }

                .tabela-membros-container { overflow-x: auto; }
                .tabela-membros { width: 100%; border-collapse: collapse; text-align: left; }
                .tabela-membros th { padding: 12px; color: #64748b; font-size: 0.8rem; font-weight: 600; border-bottom: 1px solid rgba(255,255,255,0.05); text-transform: uppercase; }
                .tabela-membros td { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.03); }
                
                .membro-celula { display: flex; align-items: center; gap: 12px; }
                .membro-avatar { width: 32px; height: 32px; border-radius: 50%; overflow: hidden; background: #1e293b; display: flex; align-items: center; justify-content: center; }
                .membro-avatar img { width: 100%; height: 100%; object-fit: cover; }
                .membro-nome { font-size: 0.9rem; color: #f1f5f9; font-weight: 500; display: flex; align-items: center; gap: 6px; }
                .membro-sub { font-size: 0.75rem; color: #64748b; }
                .icone-capitao { color: #fbbf24; }
                
                .badge-cargo { font-size: 0.7rem; font-weight: 600; padding: 2px 8px; border-radius: 6px; }
                .badge-cargo.admin { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }
                .badge-cargo.sub_admin { background: rgba(56, 189, 248, 0.1); color: #38bdf8; }
                .badge-cargo.jogador { background: rgba(148, 163, 184, 0.1); color: #94a3b8; }

                .membro-acoes { display: flex; gap: 8px; justify-content: flex-end; }
                .btn-membro-acao { background: none; border: 1px solid rgba(255,255,255,0.05); color: #64748b; padding: 6px; border-radius: 6px; cursor: pointer; transition: all 0.2s; }
                .btn-membro-acao:hover { background: rgba(255,255,255,0.05); color: #f1f5f9; border-color: rgba(255,255,255,0.1); }
                .btn-membro-acao.perigo:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; border-color: rgba(239, 68, 68, 0.2); }
                
                tr.processando { opacity: 0.5; pointer-events: none; }
            `}</style>
        </div>
    );
};

export default GestaoTab;
