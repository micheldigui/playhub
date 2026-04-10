import { useState, useEffect } from 'react';
import { 
    Activity, Search, Filter, Calendar, 
    ArrowLeft, ChevronRight, X, AlertCircle, 
    MousePointerClick, Navigation, ShieldAlert,
    Download, RefreshCw, Eye
} from 'lucide-react';
import { supabase } from '../../servicos/supabase';
import './PaginaAdminLogs.css';
import Botao from '../../componentes/Botao/Botao';

const PaginaAdminLogs = ({ aoVoltar }) => {
    const [logs, setLogs] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [filtros, setFiltros] = useState({
        tipo: '',
        busca: '',
        pagina: 0
    });
    const [logSelecionado, setLogSelecionado] = useState(null);
    const [temMais, setTemMais] = useState(true);
    const LIMITE = 50;

    useEffect(() => {
        // Resetar ao mudar tipo
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

    const getIconeTipo = (tipo) => {
        switch (tipo) {
            case 'ERRO': return <ShieldAlert size={16} color="#f43f5e" />;
            case 'CLIQUE': return <MousePointerClick size={16} color="#22c55e" />;
            case 'NAVEGACAO': return <Navigation size={16} color="#0ea5e9" />;
            default: return <Activity size={16} />;
        }
    };

    const formatarDataLog = (dataStr) => {
        const data = new Date(dataStr);
        return data.toLocaleString('pt-BR');
    };

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
                {carregando ? (
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
                                {logs.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="no-logs">
                                            <Activity size={48} />
                                            <p>Nenhum registro encontrado para os filtros selecionados.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    logs.map((log) => (
                                        <tr key={log.log_id} className={`row-tipo-${log.tipo?.toLowerCase()}`}>
                                            <td className="col-data">{formatarDataLog(log.criado_em)}</td>
                                            <td className="col-usuario">
                                                <div className="user-cell">
                                                    <strong>{log.usuario_nome || 'Visitante'}</strong>
                                                    <span>{log.usuario_email || 'Anônimo'}</span>
                                                </div>
                                            </td>
                                            <td className="col-tipo">
                                                <span className={`tag-tipo-log ${log.tipo?.toLowerCase()}`}>
                                                    {getIconeTipo(log.tipo)}
                                                    {log.tipo}
                                                </span>
                                            </td>
                                            <td className="col-mensagem">{log.mensagem}</td>
                                            <td className="col-pagina">{log.pagina}</td>
                                            <td className="col-acoes">
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
                
                {logs.length > 0 && !temMais && (
                    <div className="load-more-container" style={{ color: '#475569', fontSize: '0.85rem' }}>
                        Todos os registros foram carregados.
                    </div>
                )}
            </main>

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
