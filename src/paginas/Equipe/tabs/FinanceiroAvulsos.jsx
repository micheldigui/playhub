import React, { useState, useEffect } from 'react';
import { supabase } from '../../../servicos/supabase';
import { usarEquipe } from '../../../contextos/EquipeContexto';
import { DollarSign, User, CheckCircle2, AlertCircle, Trash2, Calendar } from 'lucide-react';

const FinanceiroAvulsos = () => {
    const { equipeAtiva, temPermissaoEquipe } = usarEquipe();
    const [pagamentos, setPagamentos] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [processando, setProcessando] = useState(null);

    const isAdmin = equipeAtiva?.papel === 'admin' || temPermissaoEquipe('gerenciar_financeiro');

    const carregarAvulsos = async () => {
        if (!equipeAtiva) return;
        setCarregando(true);
        try {
            const { data, error } = await supabase
                .from('pagamentos_avulsos')
                .select(`
                    id, status, valor_pago, pago_em,
                    usuarios (id, nome_completo, foto_url),
                    partidas (id, data)
                `)
                .eq('equipe_id', equipeAtiva.id)
                .order('pago_em', { ascending: false });
                
            if (error) throw error;
            setPagamentos(data || []);
        } catch (error) {
            console.error('Erro ao buscar pagamentos avulsos:', error);
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => {
        carregarAvulsos();
    }, [equipeAtiva]);

    const alternarStatus = async (id, statusAtual) => {
        if (!isAdmin) return;
        setProcessando(id);
        const novoStatus = statusAtual === 'pago' ? 'pendente' : 'pago';
        
        try {
            const { error } = await supabase
                .from('pagamentos_avulsos')
                .update({ status: novoStatus })
                .eq('id', id);
            
            if (error) throw error;
            await carregarAvulsos();
        } catch (error) {
            alert('Falha ao atualizar pagamento: ' + error.message);
        } finally {
            setProcessando(null);
        }
    };

    const excluirCobranca = async (id) => {
        if (!isAdmin) return;
        if (!window.confirm("Deseja realmente apagar esta cobrança avulsa?")) return;
        setProcessando(id);
        try {
            const { error } = await supabase
                .from('pagamentos_avulsos')
                .delete()
                .eq('id', id);
            if (error) throw error;
            await carregarAvulsos();
        } catch (error) {
            alert('Falha ao apagar: ' + error.message);
        } finally {
            setProcessando(null);
        }
    };

    const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);

    const formatarData = (d) => {
        const date = new Date(d + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    };

    if (carregando) return <div style={{ color: '#94a3b8', padding: '2rem', textAlign: 'center' }}>Carregando faturas...</div>;

    const pendentes = pagamentos.filter(p => p.status === 'pendente');
    const pagos = pagamentos.filter(p => p.status === 'pago');
    const valorPendente = pendentes.reduce((acc, p) => acc + Number(p.valor_pago), 0);
    const valorPago = pagos.reduce((acc, p) => acc + Number(p.valor_pago), 0);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* CARDS DE RESUMO */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fca5a5', marginBottom: '8px' }}>
                        <AlertCircle size={18} /> Avulsos a Receber ({pendentes.length})
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>{formatarMoeda(valorPendente)}</div>
                </div>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '16px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6ee7b7', marginBottom: '8px' }}>
                        <DollarSign size={18} /> Caixa de Avulsos ({pagos.length})
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#10b981' }}>{formatarMoeda(valorPago)}</div>
                </div>
            </div>

            {pagamentos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', background: 'rgba(15,23,42,0.4)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    <DollarSign size={48} color="#475569" style={{ marginBottom: '16px' }} />
                    <h3 style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '8px' }}>Nenhuma Cobrança Avulsa Registrada</h3>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Os pagamentos aparecerão aqui automaticamente quando o capitão marcar [P] para um avulso em uma partida.</p>
                </div>
            ) : (
                <div className="painel-membros" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden' }}>
                    <div className="lista-membros" style={{ padding: 0 }}>
                        {pagamentos.map(p => (
                            <div key={p.id} className="membro-item" style={{ 
                                display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                                opacity: processando === p.id ? 0.5 : 1
                            }}>
                                <div style={{width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginRight: '16px'}}>
                                    {p.usuarios?.foto_url ? <img src={p.usuarios.foto_url} alt="jogador" style={{width:'100%', height:'100%', objectFit:'cover'}}/> : <User size={20} style={{margin:'10px', color:'#94a3b8'}}/>}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '500', color: '#f8fafc', marginBottom: '4px' }}>{p.usuarios?.nome_completo || 'Desconhecido'}</div>
                                    <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: '#94a3b8' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={12}/> {p.partidas ? formatarData(p.partidas.data) : 'Partida Excluída'}</span>
                                        <span style={{ color: '#cbd5e1', fontWeight: 'bold' }}>{formatarMoeda(p.valor_pago)}</span>
                                    </div>
                                </div>
                                
                                {/* Ações */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button 
                                        onClick={() => alternarStatus(p.id, p.status)}
                                        disabled={!isAdmin}
                                        style={{
                                            background: p.status === 'pago' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                            color: p.status === 'pago' ? '#10b981' : '#ef4444',
                                            border: `1px solid ${p.status === 'pago' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                            padding: '6px 12px',
                                            borderRadius: '8px',
                                            cursor: isAdmin ? 'pointer' : 'default',
                                            display: 'flex', alignItems: 'center', gap: '6px',
                                            fontWeight: '600', fontSize: '0.85rem'
                                        }}
                                        title={isAdmin ? "Clique para alternar status" : p.status}
                                    >
                                        {p.status === 'pago' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                        {p.status === 'pago' ? 'Pago' : 'Pendente'}
                                    </button>
                                    
                                    {isAdmin && (
                                        <button 
                                            onClick={() => excluirCobranca(p.id)}
                                            style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '6px' }}
                                            title="Anular Fatura"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceiroAvulsos;
