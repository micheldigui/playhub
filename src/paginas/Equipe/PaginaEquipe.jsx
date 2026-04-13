import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Trophy, MapPin, Globe, Lock, Crown, MessageCircle, 
  Clipboard, CheckCircle2, Link, Users, PlusSquare, 
  LogOut, Shield, Mail, Share2, Plus, Phone, ArrowLeft,
  BookOpen
} from 'lucide-react';
import ModalRegrasEquipe from './componentes/ModalRegrasEquipe';
import CardsDadosAtleta from './componentes/CardsDadosAtleta';
import { usarEquipe } from '../../contextos/EquipeContexto';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import Botao from '../../componentes/Botao/Botao';
import ModalCriacaoEquipe from '../../componentes/Equipe/ModalCriacaoEquipe';
import ModalPerfilAtleta from '../../componentes/Modais/ModalPerfilAtleta';
import { rastrear } from '../../servicos/rastreamento';

// Importação das Abas Especializadas
import AgendaTab from './tabs/AgendaTab';
import FinanceiroTab from './tabs/FinanceiroTab';
import AbaPunicoes from './tabs/AbaPunicoes';
import MembrosTab from './tabs/MembrosTab';
import RegrasTab from './tabs/RegrasTab';
import SolicitacoesTab from './tabs/SolicitacoesTab';
import DescobrirTab from './tabs/DescobrirTab';
import EquipePermissoesTab from './Admin/tabs/EquipePermissoesTab';

import './PaginaEquipe.css';

const PaginaEquipe = ({ abaAtiva, setAbaAtiva, aoVoltar, aoNavegar, setDadosNavegacao, dadosNavegacao }) => {
    const { 
        equipeAtiva, excluirEquipe, sairDaEquipe, 
        aceitarTransferenciaPosse, recusarTransferenciaPosse,
        podeCriarEquipe, carregarMembrosEquipe, temPermissaoEquipe,
        modalCriacaoAberto, setModalCriacaoAberto, getLabelVinculo
    } = usarEquipe();
    const { ehSuperAdmin, usuario } = usarAutenticacao();

    const formatarIdentidadeAtleta = useCallback((u) => {
        if (!u || (!u.nome_completo && !u.apelido)) return 'Atleta';
        
        const nomeParaUsar = u.nome_completo || u.apelido;
        const partes = nomeParaUsar.trim().split(/\s+/);
        
        if (partes.length === 1) {
            return partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase();
        }
        
        const primeiro = partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase();
        const ultimo = partes[partes.length - 1].charAt(0).toUpperCase() + partes[partes.length - 1].slice(1).toLowerCase();
        
        return `${primeiro} ${ultimo}`;
    }, []);

    const getIniciaisAtleta = useCallback((u) => {
        if (!u) return '??';
        if (u.apelido) {
            // Se o apelido for uma palavra só, pega as 2 primeiras letras. 
            // Se tiver duas palavras, pega a inicial de cada.
            const partes = u.apelido.trim().split(/\s+/);
            if (partes.length > 1) return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
            return u.apelido.substring(0, 2).toUpperCase();
        }
        if (!u.nome_completo) return '??';
        const partes = u.nome_completo.trim().split(/\s+/);
        if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
        return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
    }, []);
    
    const [modalEditarAberto, setModalEditarAberto] = useState(false);
    const [copiado, setCopiado] = useState(false);
    const [confirmandoSair, setConfirmandoSair] = useState(false);
    const [modalRegrasAberto, setModalRegrasAberto] = useState(false);
    const [idAtletaSelecionado, setIdAtletaSelecionado] = useState(null);
    const [modalPerfilAberto, setModalPerfilAberto] = useState(false);
    
    // Novas estatísticas
    const [membros, setMembros] = useState([]);
    const [carregandoMembros, setCarregandoMembros] = useState(false);

    const buscarMembros = useCallback(async () => {
        if (!equipeAtiva?.id) return;
        setCarregandoMembros(true);
        try {
            const dados = await carregarMembrosEquipe(equipeAtiva.id);
            setMembros(dados || []);
        } finally {
            setCarregandoMembros(false);
        }
    }, [equipeAtiva?.id, carregarMembrosEquipe]);

    useEffect(() => {
        let isMounted = true;
        if (equipeAtiva?.id) {
            buscarMembros();
            rastrear.pagina('Equipe', { equipe: equipeAtiva.nome, modalidade: equipeAtiva.modalidade });
        }
        return () => { isMounted = false; };
    }, [equipeAtiva?.id, buscarMembros]);

    const stats = useMemo(() => {
        const total = membros.length;
        const mensalistas = membros.filter(m => m.vinculo === 'mensalista').length;
        const avulsos = membros.filter(m => m.vinculo === 'avulso').length;
        const viceCapitaes = membros
            .filter(m => m.papel === 'sub_admin' && m.usuarios)
            .map(m => formatarIdentidadeAtleta(m.usuarios));
        
        return { total, mensalistas, avulsos, viceCapitaes };
    }, [membros, formatarIdentidadeAtleta]);

    // URL de convite
    const urlConvite = equipeAtiva?.slug_convite ? `${window.location.origin}/convite/${equipeAtiva.slug_convite}` : '';

    const copiarLink = () => {
        navigator.clipboard.writeText(urlConvite);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
        rastrear.clique('equipe_copiar_link', 'Copiou link de convite da equipe');
    };

    const convidarWhatsApp = () => {
        const cidade = equipeAtiva.local_cidade ? `📍 ${equipeAtiva.local_cidade}${equipeAtiva.local_estado ? `/${equipeAtiva.local_estado}` : ''}` : '';
        const nivel = equipeAtiva.nivel ? `⭐ Nível: ${equipeAtiva.nivel}` : '';
        const infos = [cidade, nivel].filter(Boolean).join('\n');
        const mensagem = encodeURIComponent(
            `Fala atleta! 🤘\n\nVocê foi convidado(a) para a equipe *${equipeAtiva.nome}* no PlayHub!\n\n🏆 ${equipeAtiva.modalidade}\n${infos}\n\nAcesse o link, crie sua conta e solicite o ingresso:\n${urlConvite}`
        );
        window.open(`https://wa.me/?text=${mensagem}`, '_blank');
        rastrear.clique('equipe_whatsapp_convite', 'Compartilhou convite da equipe via WhatsApp');
    };

    const handlesExcluir = async () => {
        if (!window.confirm('Excluir a equipe removerá permanentemente todos os dados financeiros, membros e partidas. Confirmar?')) return;
        const res = await excluirEquipe(equipeAtiva.id);
        if (!res.sucesso) alert(res.erro);
    };

    const abrirPerfil = (membro) => {
        setIdAtletaSelecionado(membro.usuario_id);
        setModalPerfilAberto(true);
    };

    if (!equipeAtiva) {
        return (
            <div className="lista-vazia" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
                <Trophy size={64} color="rgba(255,255,255,0.1)" style={{ marginBottom: '1.5rem' }} />
                <h2 style={{ fontSize: '1.8rem', color: '#f1f5f9' }}>Você não faz parte de uma equipe ativa</h2>
                <p style={{ color: '#94a3b8', marginBottom: '2rem', maxWidth: '500px', marginInline: 'auto' }}>
                    O PlayHub é melhor com uma equipe! Crie a sua agora ou seja convidado por um capitão.
                </p>
                <Botao onClick={() => setModalCriacaoAberto(true)} disabled={!podeCriarEquipe} style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
                   <PlusSquare size={22} /> Criar Minha Equipe
                </Botao>
            </div>
        );
    }

    return (
        <div className="pagina-equipe animate-fade-in">
            {/* CONTEÚDO DINÂMICO BASEADO NO SUBMENU DA SIDEBAR */}
            
            {/* BANNERS DE STATUS CRÍTICO */}
            {equipeAtiva?.admin_id_pendente === usuario?.id && (
                <div className="banner-aviso banner-sucesso">
                    <Crown size={24} />
                    <div style={{ flex: 1 }}>
                        <strong>Transferência de Liderança</strong>
                        <p>Você foi convidado para assumir como <strong>Capitão</strong> desta equipe. Aceita a responsabilidade?</p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Botao variant="secundario" onClick={() => recusarTransferenciaPosse(equipeAtiva.id)} style={{ color: '#f43f5e' }}>Recusar</Botao>
                        <Botao onClick={() => aceitarTransferenciaPosse(equipeAtiva.id)} style={{ background: '#10b981' }}>Aceitar</Botao>
                    </div>
                </div>
            )}

            {equipeAtiva?.gestao_global && (
                <div className="banner-aviso banner-info">
                    <Shield size={20} />
                    <div style={{ flex: 1 }}>
                        <strong>Modo Manutenção (Super Admin)</strong>
                        <p>Você tem acesso administrativo total a esta equipe para suporte.</p>
                    </div>
                    <Botao variant="secundario" onClick={() => { localStorage.removeItem('playhub_equipe_ativa'); window.location.reload(); }}>Sair</Botao>
                </div>
            )}

            {/* CONTEÚDO DINÂMICO BASEADO NO SUBMENU DA SIDEBAR */}
            <main className="equipe-conteudo-global">
                {abaAtiva === 'minha-equipe' && (
                    <section className="dashboard-equipe">
                        <header className="equipe-cabecalho">
                            <div className="equipe-logo-container">
                                <div className="equipe-logo-grande">
                                    {equipeAtiva.logo_url ? <img src={equipeAtiva.logo_url} alt="Escudo" /> : <Trophy size={60} color="#475569" />}
                                </div>
                            </div>
                            <div className="equipe-info-topo">
                                <h1 className="equipe-nome">{equipeAtiva.nome}</h1>
                                <div className="equipe-badges">
                                    <span className="badge badge-primaria"><Trophy size={14} /> {equipeAtiva.modalidade}</span>
                                    <span className="badge"><MapPin size={14} /> {equipeAtiva.local_cidade || 'Sede não definida'}</span>
                                    <span style={{ cursor: 'help' }} className="badge" title={`Público: Qualquer um pode ver. Privado: Apenas membros.`}>
                                        {equipeAtiva.visibilidade === 'publica' ? <Globe size={14} /> : <Lock size={14} />} 
                                        {equipeAtiva.visibilidade === 'publica' ? 'Pública' : 'Privada'}
                                    </span>
                                    <span className="badge badge-capitao" title="Dono da Equipe">
                                        <Crown size={14} /> Capitão: {(() => {
                                            const adminId = equipeAtiva.admin_id;
                                            const adminMembro = membros.find(m => m.usuario_id === adminId || m.usuarios?.id === adminId);
                                            const u = adminMembro?.usuarios || equipeAtiva.admin || {};
                                            return formatarIdentidadeAtleta(u);
                                        })()}
                                    </span>
                                    {stats.viceCapitaes.length > 0 && (
                                        <span className="badge badge-vice" title="Responsáveis pela organização">
                                            <Shield size={14} /> Vice: {stats.viceCapitaes.join(', ')}
                                        </span>
                                    )}
                                </div>
                                <div className="acoes-equipe">
                                    <button 
                                        className="btn-regras-equipe" 
                                        onClick={() => setModalRegrasAberto(true)}
                                        title="Ver Regras e Valores do Grupo"
                                        style={{
                                            background: 'rgba(56, 189, 248, 0.1)',
                                            border: '1px solid rgba(56, 189, 248, 0.2)',
                                            color: '#38bdf8',
                                            padding: '10px',
                                            borderRadius: '12px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <BookOpen size={20} />
                                    </button>
                                    <button className="btn-whatsapp" onClick={convidarWhatsApp}><Phone size={18} fill="white" /> Convidar WhatsApp</button>
                                    <Botao variant="secundario" onClick={copiarLink} style={{ gap: '0.75rem' }}>
                                        {copiado ? <CheckCircle2 size={18} color="#10b981" /> : <Clipboard size={18} />}
                                        {copiado ? 'Copiado!' : 'Copiar Link'}
                                    </Botao>
                                    {equipeAtiva.papel && equipeAtiva.papel !== 'admin' && (
                                        <button className={`btn-sair-equipe ${confirmandoSair ? 'confirmando' : ''}`} onClick={async () => {
                                            if (!confirmandoSair) { setConfirmandoSair(true); setTimeout(() => setConfirmandoSair(false), 3000); return; }
                                            const res = await sairDaEquipe(equipeAtiva.id);
                                            if (res.sucesso) {
                                                rastrear.clique('equipe_sair', 'Membro saiu da equipe');
                                            }
                                        }}>
                                            <LogOut size={16} /> {confirmandoSair ? 'Confirmar Saída?' : 'Sair da Equipe'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </header>

                        <CardsDadosAtleta />

                        <div className="grade-detalhes-eq">
                            <div className="card-eq">
                                <h3><Users size={18} color="var(--primaria)" /> Equipe em Números</h3>
                                <div className="stats-equipe">
                                    <div className="stat-item">
                                        <span className="stat-valor">{stats.total}</span>
                                        <span className="stat-label">Total</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-valor">{stats.mensalistas}</span>
                                        <span className="stat-label">{getLabelVinculo('mensalista')}</span>
                                    </div>
                                    <div className="stat-item">
                                        <span className="stat-valor">{stats.avulsos}</span>
                                        <span className="stat-label">{getLabelVinculo('avulso')}</span>
                                    </div>
                                </div>
                                <p style={{ marginTop: '12px', opacity: 0.7 }}>Nível Médio: <strong>{equipeAtiva.nivel || 'Lazer'}</strong></p>
                            </div>
                            
                            {equipeAtiva.link_grupo && (
                                <div className="card-eq" style={{ borderLeft: '3px solid #25D366' }}>
                                    <h3><MessageCircle size={18} color="#25D366" /> Canal de Recados</h3>
                                    <p>Clique abaixo para acessar o grupo oficial da equipe no WhatsApp.</p>
                                    <a href={equipeAtiva.link_grupo} target="_blank" rel="noopener noreferrer" className="btn-whatsapp" style={{ marginTop: '10px', width: '100%', justifyContent: 'center', background: '#25D366' }}>
                                        <MessageCircle size={18} /> Acessar WhatsApp
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* SEÇÃO: NOSSOS ATLETAS */}
                        <div className="secao-atletas-social">
                            <div className="secao-header">
                                <div>
                                    <h3><Users size={20} /> Nossos Atletas</h3>
                                    <p>Conheça os craques que fazem parte do nosso elenco</p>
                                </div>
                                <Botao variant="minimal" onClick={() => setAbaAtiva('membros')} style={{ fontSize: '0.8rem' }}>Ver todos</Botao>
                            </div>

                            <div className="grid-atletas-social">
                                {membros
                                    .filter(membro => membro.usuarios)
                                    .sort((a, b) => {
                                        if (a.papel === 'admin') return -1;
                                        if (b.papel === 'admin') return 1;
                                        if (a.papel === 'sub_admin' && b.papel !== 'admin') return -1;
                                        if (b.papel === 'sub_admin' && a.papel !== 'admin') return 1;
                                        return 0;
                                    })
                                    .slice(0, 8)
                                    .map(membro => {
                                    const u = membro.usuarios;
                                    const p = u.perfil_esportivo?.[0] || {};
                                    return (
                                        <div 
                                            key={membro.usuario_id} 
                                            className="card-atleta-social" 
                                            onClick={() => abrirPerfil(membro)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <div className="atleta-avatar-box">
                                                {u.foto_url ? (
                                                    <img src={u.foto_url} alt={u.apelido || u.nome_completo} />
                                                ) : (
                                                    <div className="atleta-avatar-fallback">
                                                        {getIniciaisAtleta(u)}
                                                    </div>
                                                )}
                                                {membro.papel === 'admin' && <div className="tag-lider" title="Capitão"><Crown size={12} /></div>}
                                                {membro.papel === 'sub_admin' && <div className="tag-lider" title="Vice-Capitão" style={{ background: '#94a3b8' }}><Shield size={12} /></div>}
                                            </div>
                                            <div className="atleta-info-box">
                                                <h4>{formatarIdentidadeAtleta(u)}</h4>
                                                <span className="atleta-posicao">{p.posicao_principal || 'Atleta'}</span>
                                                <div className="atleta-nivel-tag">{p.nivel_tecnico || 'Lazer'}</div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {membros.length > 8 && (
                                    <button className="card-atleta-mais" onClick={() => setAbaAtiva('membros')}>
                                        <span>+{membros.length - 8}</span>
                                        <p>Outros</p>
                                    </button>
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {abaAtiva === 'agenda' && <AgendaTab aoNavegar={aoNavegar} setDadosNavegacao={setDadosNavegacao} dadosNavegacao={dadosNavegacao} />}
                
                {abaAtiva === 'financeiro-mensal' && <FinanceiroTab abaExterna="gestao" modoLeitura={!temPermissaoEquipe('gerenciar_financeiro')} membrosIniciais={membros} />}
                {abaAtiva === 'financeiro-avulsos' && <FinanceiroTab abaExterna="avulsos" modoLeitura={!temPermissaoEquipe('gerenciar_financeiro')} membrosIniciais={membros} />}
                {abaAtiva === 'financeiro-relatorios' && <FinanceiroTab abaExterna="dashboard" modoLeitura={true} membrosIniciais={membros} />}

                {abaAtiva === 'membros' && <MembrosTab membrosIniciais={membros} recarregar={buscarMembros} />}
                {abaAtiva === 'solicitacoes' && <SolicitacoesTab />}
                {abaAtiva === 'disciplina' && <AbaPunicoes membrosIniciais={membros} />}
                {abaAtiva === 'permissoes' && <EquipePermissoesTab />}
                
                {abaAtiva === 'regras-config' && <RegrasTab abrirEdicao={() => setModalEditarAberto(true)} aoExcluir={handlesExcluir} />}
                {abaAtiva === 'descobrir' && <DescobrirTab />}

                {/* Sub-abas de Notificações que agora estão na sidebar podem renderizar conteúdos específicos aqui se necessário */}
            </main>

            {/* MODAIS GLOBAIS */}
            <ModalCriacaoEquipe 
                isOpen={modalEditarAberto} 
                onClose={() => setModalEditarAberto(false)} 
                equipeParaEditar={equipeAtiva} 
            />

            <ModalRegrasEquipe 
                isOpen={modalRegrasAberto} 
                onClose={() => setModalRegrasAberto(false)} 
            />

            <ModalPerfilAtleta 
                isOpen={modalPerfilAberto}
                onClose={() => setModalPerfilAberto(false)}
                idAtleta={idAtletaSelecionado}
            />
            
            <style>{`
                .banner-aviso { display: flex; align-items: center; gap: 16px; padding: 1.25rem; border-radius: 12px; margin-bottom: 1.5rem; }
                .banner-sucesso { background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2); color: #10b981; }
                .banner-info { background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.2); color: #38bdf8; }
                .banner-aviso strong { display: block; color: #f1f5f9; }
                .banner-aviso p { font-size: 0.9rem; color: #94a3b8; margin: 0; }
                
                .grade-detalhes-eq { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 24px; }
                .card-eq { background: rgba(15, 23, 42, 0.6); padding: 20px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); }
                .card-eq h3 { font-size: 1.1rem; color: #f1f5f9; display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
                .card-eq p { color: #94a3b8; font-size: 0.9rem; margin-bottom: 8px; }
                
                .btn-sair-equipe { background: none; border: 1px solid rgba(244, 63, 94, 0.3); color: #f43f5e; padding: 8px 16px; border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; }
                .btn-sair-equipe.confirmando { background: #f43f5e; color: white; border-color: #f43f5e; font-weight: bold; }
                
                
                .badge-capitao { background: rgba(251, 191, 36, 0.1) !important; color: #fbbf24 !important; border-color: rgba(251, 191, 36, 0.2) !important; }
                .badge-vice { background: rgba(16, 185, 129, 0.1) !important; color: #10b981 !important; border-color: rgba(16, 185, 129, 0.2) !important; }
                
                .stats-equipe { display: flex; gap: 16px; margin-top: 10px; }
                .stat-item { display: flex; flex-direction: column; }
                .stat-valor { font-size: 1.4rem; font-weight: 800; color: #f1f5f9; }
                .stat-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; font-weight: bold; }

                .secao-atletas-social { margin-top: 2rem; background: rgba(15, 23, 42, 0.4); border-radius: 16px; padding: 1.5rem; border: 1px solid rgba(255,255,255,0.03); }
                .secao-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; }
                .secao-header h3 { font-size: 1.25rem; color: #f1f5f9; display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
                .secao-header p { font-size: 0.85rem; color: #94a3b8; margin: 0; }

                .grid-atletas-social { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 16px; }
                .card-atleta-social { background: rgba(30, 41, 59, 0.5); padding: 12px; border-radius: 12px; display: flex; flex-direction: column; align-items: center; text-align: center; transition: transform 0.2s; border: 1px solid rgba(255,255,255,0.05); }
                .card-atleta-social:hover { transform: translateY(-4px); background: rgba(30, 41, 59, 0.8); }
                
                .atleta-avatar-box { position: relative; width: 64px; height: 64px; margin-bottom: 10px; }
                .atleta-avatar-box img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid var(--primaria); padding: 2px; }
                .atleta-avatar-fallback { 
                    width: 100%; 
                    height: 100%; 
                    border-radius: 50%; 
                    background: linear-gradient(135deg, #1e293b 0%, #334155 100%); 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-size: 1.2rem; 
                    font-weight: 800; 
                    color: #f1f5f9; 
                    border: 1px solid rgba(255,255,255,0.1);
                    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                }
                .tag-lider { position: absolute; bottom: 0; right: 0; background: #fbbf24; color: #000; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid #0f172a; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }

                .atleta-info-box h4 { font-size: 0.95rem; color: #f1f5f9; margin: 0 0 4px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; width: 100%; }
                .atleta-posicao { font-size: 0.75rem; color: #94a3b8; display: block; margin-bottom: 6px; }
                .atleta-nivel-tag { font-size: 0.65rem; background: rgba(56, 189, 248, 0.1); color: #38bdf8; padding: 2px 8px; border-radius: 10px; display: inline-block; font-weight: bold; }

                .card-atleta-mais { background: rgba(30, 41, 59, 0.3); border: 2px dashed rgba(255,255,255,0.1); border-radius: 12px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justifyContent: center; transition: all 0.2s; }
                .card-atleta-mais:hover { background: rgba(30, 41, 59, 0.5); border-color: var(--primaria); }
                .card-atleta-mais span { font-size: 1.25rem; font-weight: bold; color: var(--primaria); }
                .card-atleta-mais p { font-size: 0.75rem; color: #94a3b8; margin: 4px 0 0 0; }
            `}</style>
        </div>
    );
};

export default PaginaEquipe;
