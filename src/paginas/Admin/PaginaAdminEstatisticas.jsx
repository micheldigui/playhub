import { useState, useEffect } from 'react';
import { 
  Users, Trophy, MapPin, PieChart, TrendingUp, 
  Calendar, CheckCircle2, ChevronRight, Info,
  BarChart2, ChevronDown, Globe, Activity
} from 'lucide-react';
import { supabase } from '../../servicos/supabase';
import Botao from '../../componentes/Botao/Botao';
import './PaginaAdminEstatisticas.css';

const CardEstatistica = ({ titulo, icone: Icone, children, corIcone = "var(--primaria)", expandidoInicial = false }) => {
    const [expandido, setExpandido] = useState(expandidoInicial);
    return (
        <div className="stats-card">
            <div className="stats-card-header" onClick={() => setExpandido(!expandido)}>
                <div className="header-label-grupo">
                    <Icone size={20} color={corIcone} />
                    <h2>{titulo}</h2>
                </div>
                <div className={`btn-toggle-card ${expandido ? 'aberto' : ''}`}>
                    <ChevronDown size={20} />
                </div>
            </div>
            {expandido && (
                <div className="stats-card-conteudo">
                    {children}
                </div>
            )}
        </div>
    );
};

const PaginaAdminEstatisticas = ({ aoNavegar }) => {
    const [dados, setDados] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);

    useEffect(() => {
        carregarEstatisticas();
    }, []);

    const carregarEstatisticas = async () => {
        try {
            setCarregando(true);
            const { data, error } = await supabase.rpc('admin_obter_estatisticas_sistema');
            if (error) throw error;
            setDados(data);
        } catch (err) {
            console.error('Erro ao buscar estatísticas:', err);
            setErro(err.message);
        } finally {
            setCarregando(false);
        }
    };

    if (carregando) {
        return (
            <div className="admin-stats-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto 1rem auto' }}></div>
                    <p style={{ color: '#64748b' }}>Consolidando dados do sistema...</p>
                </div>
            </div>
        );
    }

    if (erro) {
        return (
            <div className="admin-stats-container">
                <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '2rem', borderRadius: '16px', textAlign: 'center' }}>
                    <h3 style={{ color: '#f43f5e', marginBottom: '1rem' }}>Erro ao carregar estatísticas</h3>
                    <p style={{ color: '#94a3b8' }}>{erro}</p>
                    <button onClick={carregarEstatisticas} style={{ marginTop: '1rem', padding: '8px 16px', borderRadius: '8px', background: '#f43f5e', color: '#fff', border: 'none', cursor: 'pointer' }}>
                        Tentar Novamente
                    </button>
                </div>
            </div>
        );
    }

    // Cálculos auxiliares
    const totalLocalizacoesAtletas = dados?.usuarios_demografia?.cidades?.reduce((acc, curr) => acc + curr.total, 0) || 1;
    const totalLocalizacoesEquipes = dados?.equipes_estatisticas?.cidades?.reduce((acc, curr) => acc + curr.total, 0) || 1;
    const totalModalidadesEquipes = dados?.equipes_estatisticas?.modalidades?.reduce((acc, curr) => acc + curr.total, 0) || 1;

    // Formatação de data amigável
    const formatarDataLog = (dataStr) => {
        if (!dataStr) return 'Nunca';
        const data = new Date(dataStr);
        return data.toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit', 
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="admin-stats-container">
            <header className="admin-stats-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1><BarChart2 size={32} color="var(--primaria)" /> Gestão & Estatísticas</h1>
                    <p>Métricas globais e demográficas dos atletas e equipes do PlayHub.</p>
                </div>
                <button 
                    onClick={carregarEstatisticas} 
                    className="btn-atualizar-stats"
                    disabled={carregando}
                    style={{ 
                        background: 'rgba(56, 189, 248, 0.1)', 
                        border: '1px solid rgba(56, 189, 248, 0.2)',
                        color: '#38bdf8',
                        padding: '10px 18px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        fontWeight: '600'
                    }}
                >
                    <TrendingUp size={18} className={carregando ? 'anim-spin' : ''} />
                    {carregando ? 'Atualizando...' : 'Atualizar Dados'}
                </button>
            </header>

            {/* KPI CARDS */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                        <Users size={28} />
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-value">{dados.geral.total_usuarios}</span>
                        <span className="kpi-label">Atletas Cadastrados</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#eab308' }}>
                        <Trophy size={28} />
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-value">{dados.geral.total_equipes}</span>
                        <span className="kpi-label">Equipes Criadas</span>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                        <Calendar size={28} />
                    </div>
                    <div className="kpi-info">
                        <span className="kpi-value">{dados.geral.total_partidas}</span>
                        <span className="kpi-label">Partidas no Sistema</span>
                    </div>
                </div>
            </div>

            <div className="stats-sections-grid">
                
                {/* SEÇÃO: ENGAJAMENTO DE ATLETAS */}
                <div className="stats-card" style={{ gridColumn: '1 / -1', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.15)', padding: '2rem' }}>
                    <div className="stats-card-header" style={{ cursor: 'default', border: 'none' }}>
                        <div className="header-label-grupo">
                            <CheckCircle2 size={24} color="#38bdf8" />
                            <h2 style={{ fontSize: '1.2rem' }}>Resumo de Engajamento</h2>
                        </div>
                    </div>
                    
                    <div className="age-distribution" style={{ marginTop: '1.5rem' }}>
                        <div className="age-box" style={{ background: 'rgba(244, 63, 94, 0.05)' }}>
                            <span className="age-box-val" style={{ color: '#f43f5e' }}>{dados.vinculo_atletas.sem_equipe}</span>
                            <span className="age-box-label">Atletas Solo (Sem Equipe)</span>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>Potenciais novos membros</p>
                        </div>
                        <div className="age-box" style={{ background: 'rgba(16, 185, 129, 0.05)' }}>
                            <span className="age-box-val" style={{ color: '#10b981' }}>{dados.vinculo_atletas.uma_equipe}</span>
                            <span className="age-box-label">Focados (1 Equipe)</span>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>Membros ativos padrão</p>
                        </div>
                        <div className="age-box" style={{ background: 'rgba(234, 179, 8, 0.05)' }}>
                            <span className="age-box-val" style={{ color: '#eab308' }}>{dados.vinculo_atletas.multi_equipe}</span>
                            <span className="age-box-label">Engajados (2+ Equipes)</span>
                            <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px' }}>Usuários de alta recorrência</p>
                        </div>
                    </div>
                </div>

                {/* ACORDEÃO: LOGS DE ACESSO */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <CardEstatistica titulo="Acessos Recentes (Atletas)" icone={TrendingUp} corIcone="#8b5cf6">
                        <div className="logs-lista">
                            {dados.logs_acesso?.length === 0 ? (
                                <p style={{ color: '#64748b', textAlign: 'center' }}>Nenhuma atividade registrada ainda.</p>
                            ) : (
                                dados.logs_acesso.map((log, i) => (
                                    <div key={i} className="log-item">
                                        <div className="log-user-info">
                                            <span className="log-nome">{log.nome}</span>
                                            <span className="log-data">Último acesso: {formatarDataLog(log.ultimo_acesso)}</span>
                                        </div>
                                        <div className="log-stats">
                                            <span className="log-count">{log.total_acessos}</span>
                                            <span className="log-label">Acessos</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardEstatistica>
                       {/* SEÇÃO: LINKS RÁPIDOS / TELEMETRIA */}
                <div style={{ gridColumn: '1 / -1' }}>
                    <CardEstatistica titulo="Central de Monitoramento & Telemetria" icone={Activity} corIcone="#f43f5e" expandidoInicial={true}>
                        <div style={{ padding: '1rem 0', textAlign: 'center' }}>
                            <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                                Acesse o relatório completo de eventos, erros e navegação dos usuários em tempo real.
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <Botao 
                                    variant="secundario" 
                                    onClick={() => aoNavegar('logs_sistema')}
                                    style={{ padding: '12px 24px' }}
                                >
                                    Abrir Painel de Logs Avançado <ChevronRight size={18} />
                                </Botao>
                            </div>
                        </div>
                    </CardEstatistica>
                </div>
                </div>

                {/* ACORDEÃO: DEMOGRAFIA */}
                <CardEstatistica titulo="Demografia de Atletas" icone={Users} corIcone="#38bdf8">
                    <div className="stats-list" style={{ marginBottom: '2rem' }}>
                        <h4 style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1rem', textTransform: 'uppercase' }}>Distribuição por Gênero</h4>
                        {Object.entries(dados.usuarios_demografia.genero || {}).map(([gen, total]) => {
                            const perc = ((total / dados.geral.total_usuarios) * 100).toFixed(0);
                            return (
                                <div key={gen} className="stat-item">
                                    <div className="stat-item-info">
                                        <span className="stat-item-label">{gen}</span>
                                        <span className="stat-item-value">{total} ({perc}%)</span>
                                    </div>
                                    <div className="stat-bar-bg">
                                        <div className="stat-bar-fill" style={{ width: `${perc}%`, background: gen === 'Masculino' ? '#0ea5e9' : gen === 'Feminino' ? '#ec4899' : '#94a3b8' }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <h4 style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: '1rem', textTransform: 'uppercase' }}>Faixa Etária</h4>
                    <div className="age-distribution">
                        <div className="age-box">
                            <span className="age-box-val" style={{ color: '#10b981' }}>{dados.usuarios_demografia.faixa_etaria.maiores}</span>
                            <span className="age-box-label">Maiores de 18</span>
                        </div>
                        <div className="age-box">
                            <span className="age-box-val" style={{ color: '#f43f5e' }}>{dados.usuarios_demografia.faixa_etaria.menores}</span>
                            <span className="age-box-label">Menores de 18</span>
                        </div>
                    </div>
                </CardEstatistica>

                {/* ACORDEÃO: LOCALIZAÇÃO EQUIPES */}
                <CardEstatistica titulo="Equipes por Localização" icone={MapPin} corIcone="#eab308">
                    <div className="stats-list">
                        {dados.equipes_estatisticas.cidades?.length === 0 ? (
                            <p style={{ color: '#64748b', textAlign: 'center' }}>Sem dados de localização cadastrados.</p>
                        ) : (
                            dados.equipes_estatisticas.cidades.map((c, i) => {
                                const perc = ((c.total / totalLocalizacoesEquipes) * 100).toFixed(0);
                                return (
                                    <div key={i} className="stat-item">
                                        <div className="stat-item-info">
                                            <span className="stat-item-label">{c.cidade} - {c.estado}</span>
                                            <span className="stat-item-value">{c.total} times</span>
                                        </div>
                                        <div className="stat-bar-bg">
                                            <div className="stat-bar-fill" style={{ width: `${perc}%`, background: '#eab308' }}></div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </CardEstatistica>

                {/* ACORDEÃO: MODALIDADES EQUIPES */}
                <CardEstatistica titulo="Modalidades nas Equipes" icone={Trophy} corIcone="#10b981">
                    <div className="stats-list">
                        {dados.equipes_estatisticas.modalidades?.map((m, i) => {
                            const perc = ((m.total / totalModalidadesEquipes) * 100).toFixed(0);
                            return (
                                <div key={i} className="stat-item">
                                    <div className="stat-item-info">
                                        <span className="stat-item-label">{m.modalidade}</span>
                                        <span className="stat-item-value">{m.total}</span>
                                    </div>
                                    <div className="stat-bar-bg">
                                        <div className="stat-bar-fill" style={{ width: `${perc}%`, background: '#10b981' }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardEstatistica>

                {/* ACORDEÃO: INTERESSES */}
                <CardEstatistica titulo="Top Esportes (Interesse)" icone={Globe} corIcone="#8b5cf6">
                    <div className="stats-list">
                        {dados.esportes_interesses?.map((it, i) => {
                            const perc = ((it.total / dados.geral.total_usuarios) * 100).toFixed(0);
                            return (
                                <div key={i} className="stat-item">
                                    <div className="stat-item-info">
                                        <span className="stat-item-label">{it.esporte}</span>
                                        <span className="stat-item-value">{it.total} atletas</span>
                                    </div>
                                    <div className="stat-bar-bg">
                                        <div className="stat-bar-fill" style={{ width: `${perc}%`, background: '#8b5cf6' }}></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CardEstatistica>

            </div>

            <footer style={{ marginTop: '3rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '2rem', textAlign: 'center' }}>
                <p style={{ color: '#475569', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <Info size={14} /> Dados agregados de todas as interações no sistema para suporte à tomada de decisão.
                </p>
            </footer>
        </div>
    );
};

export default PaginaAdminEstatisticas;
