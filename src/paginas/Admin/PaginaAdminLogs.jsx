import { useState, useEffect } from 'react';
import { 
    Activity, Search, Filter, Calendar, 
    ArrowLeft, ChevronRight, X, AlertCircle, 
    MousePointerClick, Navigation, ShieldAlert,
    Download, RefreshCw, Eye, FileSpreadsheet, Trash2
} from 'lucide-react';
import { supabase } from '../../servicos/supabase';
import './PaginaAdminLogs.css';
import Botao from '../../componentes/Botao/Botao';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';

const PaginaAdminLogs = ({ aoVoltar }) => {
    const [logs, setLogs] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [confirmandoLimpeza, setConfirmandoLimpeza] = useState(false);
    const [limpando, setLimpando] = useState(false);
    const [erroPermissao, setErroPermissao] = useState(false);
    
    const { ehSuperAdmin } = usarAutenticacao();
    
    const [filtros, setFiltros] = useState({
        tipo: '',
        busca: '',
        pagina: 0
    });
    const [logSelecionado, setLogSelecionado] = useState(null);
    const [temMais, setTemMais] = useState(true);
    const LIMITE = 50;

    useEffect(() => {
        setLogs([]);
        setFiltros(prev => ({ ...prev, pagina: 0 }));
    }, [filtros.tipo]);

    useEffect(() => {
        carregarLogs();
    }, [filtros.tipo, filtros.pagina]);

    const carregarLogs = async () => {
        try {
            setCarregando(true);
            const { data, error } = await supabase.rpc('admin_listar_logs_sistema', {
                p_tipo: filtros.tipo || null,
                p_busca: filtros.busca || null,
                p_limite: LIMITE,
                p_offset: filtros.pagina * LIMITE
            });

            if (error) throw error;
            
            const novosLogs = data || [];
            if (filtros.pagina === 0) {
                setLogs(novosLogs);
            } else {
                setLogs(prev => [...prev, ...novosLogs]);
            }
            
            setTemMais(novosLogs.length === LIMITE);
        } catch (err) {
            console.error('Erro ao carregar logs:', err);
            if (err.message === 'Acesso negado.' || err.code === 'P0001') {
                setErroPermissao(true);
            }
        } finally {
            setCarregando(false);
        }
    };

    const handleSearch = (e) => {
        if (e.key === 'Enter') {
            setFiltros({ ...filtros, pagina: 0 });
            carregarLogs();
        }
    };

    const handleLimparBanco = async () => {
        try {
            setLimpando(true);
            
            // Usa a RPC com SECURITY DEFINER — ela ignora o RLS e consegue deletar tudo
            const { error } = await supabase.rpc('admin_limpar_logs_sistema');
            
            if (error) throw error;
            
            setLogs([]);
            setConfirmandoLimpeza(false);
            alert('Base de logs limpa com sucesso!');
            carregarLogs();
        } catch (err) {
            console.error('Erro ao limpar banco:', err);
            alert(`Erro: ${err.message}`);
        } finally {
            setLimpando(false);
        }
    };

    const handleExportarCSV = () => {
        if (logs.length === 0) return;

        // Cabeçalhos do CSV (Excel BR prefere ponto e vírgula)
        const headers = ['Data', 'Usuario', 'Email', 'Tipo', 'Mensagem', 'Pagina', 'Detalhes_Tecnicos'];
        
        // Formatar linhas
        const csvRows = logs.map(log => {
            const data = new Date(log.criado_em).toLocaleString('pt-BR');
            const mensagem = (log.mensagem || '').replace(/"/g, '""');
            // Serializa o JSON e remove quebras de linha internas para não quebrar o CSV
            const metadata = log.metadata ? JSON.stringify(log.metadata).replace(/"/g, '""').replace(/\n/g, ' ') : '';
            
            return [
                `"${data}"`,
                `"${log.usuario_nome || 'Anônimo'}"`,
                `"${log.usuario_email || ''}"`,
                `"${log.tipo}"`,
                `"${mensagem}"`,
                `"${log.pagina || ''}"`,
                `"${metadata}"`
            ].join(';'); // Separador ponto e vírgula
        });

        // Força o Excel a reconhecer UTF-8 injetando o BOM binário (0xEF, 0xBB, 0xBF)
        const csvContent = "sep=;\n" + [headers.join(';'), ...csvRows].join('\n');
        const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        
        link.setAttribute("href", url);
        link.setAttribute("download", `PlayHub_Audit_Logs_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getIconeTipo = (tipo) => {
        switch (tipo) {
            case 'ERRO': return <ShieldAlert size={16} />;
            case 'CLIQUE': return <MousePointerClick size={16} color="#22c55e" />;
            case 'NAVEGACAO': return <Navigation size={16} color="#0ea5e9" />;
            default: return <Activity size={16} />;
        }
    };

    const formatarDataLog = (dataStr) => {
        const data = new Date(dataStr);
        return data.toLocaleString('pt-BR');
    };

    // Lógica de agrupamento visual: Condensa registros idênticos em sequência
    const logsExibicao = [];
    logs.forEach((log, index) => {
        const anterior = logs[index - 1];
        const ehRepetido = anterior && 
                           anterior.usuario_email === log.usuario_email && 
                           anterior.mensagem === log.mensagem &&
                           anterior.tipo === log.tipo;
        
        if (ehRepetido) {
            logsExibicao[logsExibicao.length - 1].repeticoes = (logsExibicao[logsExibicao.length - 1].repeticoes || 1) + 1;
        } else {
            logsExibicao.push({ ...log, repeticoes: 1 });
        }
    });

    if (!ehSuperAdmin || erroPermissao) {
        return (
            <div className="admin-logs-container animate-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ padding: '40px', background: 'rgba(244, 63, 94, 0.05)', borderRadius: '24px', border: '1px solid rgba(244, 63, 94, 0.1)', maxWidth: '400px' }}>
                    <ShieldAlert size={64} color="#f43f5e" style={{ margin: '0 auto 20px' }} />
                    <h2 style={{ color: '#f8fafc', marginBottom: '12px' }}>Acesso Negado</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '24px' }}>Você não possui permissões de administrador global para acessar esta central de monitoramento.</p>
                    <Botao onClick={aoVoltar} variant="secundario">Voltar ao Sistema</Botao>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-logs-container animate-fade-in">
            <header className="admin-logs-header">
                <div className="header-top">
                    <button onClick={aoVoltar} className="btn-voltar-circle">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1>Central de Monitoramento Global</h1>
                        <p>Acompanhe logs de erro, comportamento de usuários e saúde do sistema.</p>
                    </div>
                    
                    <div className="header-actions-logs" style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
                        <button className="btn-export-logs" onClick={handleExportarCSV}>
                            <FileSpreadsheet size={18} /> Exportar CSV
                        </button>
                        <button className="btn-clear-database" onClick={() => setConfirmandoLimpeza(true)}>
                            <Trash2 size={18} /> Limpar Banco
                        </button>
                    </div>
                </div>

                <div className="logs-toolbar">
                    <div className="search-box-logs">
                        <Search size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar por usuário, mensagem ou página... (Enter)" 
                            value={filtros.busca}
                            onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                            onKeyDown={handleSearch}
                        />
                    </div>

                    <div className="filters-group-logs">
                        <div className="filter-select-wrapper">
                            <Filter size={16} />
                            <select 
                                value={filtros.tipo} 
                                onChange={(e) => setFiltros({...filtros, tipo: e.target.value, pagina: 0})}
                            >
                                <option value="">Todos os Tipos</option>
                                <option value="ERRO">Erros</option>
                                <option value="CLIQUE">Cliques / Ações</option>
                                <option value="NAVEGACAO">Navegação</option>
                            </select>
                        </div>

                        <button 
                            onClick={() => {
                                setLogs([]);
                                setFiltros({ ...filtros, pagina: 0 });
                                carregarLogs();
                            }} 
                            className="btn-refresh-logs" 
                            title="Atualizar"
                        >
                            <RefreshCw size={18} className={carregando ? 'anim-spin' : ''} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="logs-content-area">
                {carregando && logs.length === 0 ? (
                    <div className="loading-logs">
                        <div className="spinner-logs"></div>
                        <span>Carregando telemetria...</span>
                    </div>
                ) : (
                    <div className="logs-table-wrapper">
                        <table className="logs-main-table">
                            <thead>
                                <tr>
                                    <th>CRIADO EM</th>
                                    <th>USUÁRIO</th>
                                    <th>TIPO</th>
                                    <th>MENSAGEM / AÇÃO</th>
                                    <th>PÁGINA</th>
                                    <th>AÇÕES</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logsExibicao.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="no-logs">
                                            <Activity size={48} />
                                            <p>Nenhum registro encontrado.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    logsExibicao.map((log) => (
                                        <tr key={log.log_id} className={`row-tipo-${log.tipo?.toLowerCase()}`}>
                                            <td className="col-data" data-label="Data">{formatarDataLog(log.criado_em)}</td>
                                            <td className="col-usuario" data-label="Usuário">
                                                <div className="user-cell">
                                                    <strong>{log.usuario_nome || 'Visitante'}</strong>
                                                    <span>{log.usuario_email || 'Anônimo'}</span>
                                                </div>
                                            </td>
                                            <td className="col-tipo" data-label="Tipo">
                                                <span className={`tag-tipo-log ${log.tipo?.toLowerCase()}`}>
                                                    {getIconeTipo(log.tipo)}
                                                    {log.tipo}
                                                </span>
                                            </td>
                                            <td className="col-mensagem" data-label="Mensagem">
                                                <div className="msg-wrapper-logs">
                                                    <span className="msg-text">{log.mensagem}</span>
                                                    {log.repeticoes > 1 && (
                                                        <span className="badge-repeticao">
                                                            +{log.repeticoes - 1} repetido(s)
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="col-pagina" data-label="Página">{log.pagina}</td>
                                            <td className="col-acoes" data-label="Ações">
                                                <button onClick={() => setLogSelecionado(log)} className="btn-view-log">
                                                    <Eye size={16} /> Detalhes
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
                
                {logs.length > 0 && temMais && !carregando && (
                    <div className="load-more-container">
                        <Botao 
                            variant="secundario" 
                            onClick={() => setFiltros(prev => ({ ...prev, pagina: prev.pagina + 1 }))}
                            style={{ gap: '10px' }}
                        >
                            <Download size={18} /> Carregar mais {LIMITE} registros
                        </Botao>
                    </div>
                )}
            </main>

            {/* MODAL DE CONFIRMAÇÃO DE LIMPEZA */}
            {confirmandoLimpeza && (
                <div className="modal-confirm-overlay" onClick={() => !limpando && setConfirmandoLimpeza(false)}>
                    <div className="modal-confirm-content" onClick={e => e.stopPropagation()}>
                        <div style={{ color: '#f43f5e' }}><ShieldAlert size={48} style={{ margin: '0 auto' }} /></div>
                        <h3>Limpar Base de Logs?</h3>
                        <p>Esta ação apagará <strong>todos os registros de telemetria</strong> permanentemente. Deseja continuar com a manutenção?</p>
                        
                        <div className="modal-confirm-actions">
                            <button className="btn-cancel" onClick={() => setConfirmandoLimpeza(false)} disabled={limpando}>Não, Cancelar</button>
                            <button className="btn-confirm-danger" onClick={handleLimparBanco} disabled={limpando}>
                                {limpando ? 'Limpando...' : 'Sim, Apagar Tudo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DE DETALHES DO LOG */}
            {logSelecionado && (
                <div className="modal-log-overlay" onClick={() => setLogSelecionado(null)}>
                    <div className="modal-log-content" onClick={e => e.stopPropagation()}>
                        <header className="modal-log-header">
                            <div>
                                <span className={`tag-tipo-log ${logSelecionado.tipo?.toLowerCase()}`}>
                                    {logSelecionado.tipo}
                                </span>
                                <h2>Detalhes do Evento</h2>
                            </div>
                            <button onClick={() => setLogSelecionado(null)}><X size={20} /></button>
                        </header>
                        
                        <div className="modal-log-body">
                            <div className="log-detail-grid">
                                <div className="detail-item">
                                    <label>Timestamp</label>
                                    <p>{formatarDataLog(logSelecionado.criado_em)}</p>
                                </div>
                                <div className="detail-item">
                                    <label>Página Origem</label>
                                    <p>{logSelecionado.pagina}</p>
                                </div>
                                <div className="detail-item full">
                                    <label>Usuário</label>
                                    <p>{logSelecionado.usuario_nome || 'Desconectado'} ({logSelecionado.usuario_email || 'Anônimo'})</p>
                                </div>
                                <div className="detail-item full">
                                    <label>Mensagem</label>
                                    <div className="msg-box-detail">{logSelecionado.mensagem}</div>
                                </div>

                                {logSelecionado.metadata && (
                                    <div className="detail-item full">
                                        <label>Metadados Técnicos / Erro</label>
                                        <div className="json-box-detail">
                                            <pre>{JSON.stringify(logSelecionado.metadata, null, 2)}</pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <footer className="modal-log-footer">
                            <Botao onClick={() => setLogSelecionado(null)}>Fechar Detalhes</Botao>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaginaAdminLogs;
