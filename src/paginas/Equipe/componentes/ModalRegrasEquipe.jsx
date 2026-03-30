import React from 'react';
import { 
  X, BookOpen, Coins, Calendar, Clock, 
  ShieldAlert, Users, Info, CheckCircle2 
} from 'lucide-react';
import { usarEquipe } from '../../../contextos/EquipeContexto';

const ModalRegrasEquipe = ({ isOpen, onClose }) => {
    const { equipeAtiva, getLabelVinculo } = usarEquipe();

    if (!isOpen || !equipeAtiva) return null;

    const regras = equipeAtiva.regras || {};
    const temFinanceiro = equipeAtiva.gestao_financeira;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            zIndex: 10000, padding: '20px', backdropFilter: 'blur(4px)'
        }}>
            <div className="animate-scale-in" style={{
                background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '24px', width: '100%', maxWidth: '480px', 
                maxHeight: '90vh', overflowY: 'auto', position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}>
                {/* Botão Fechar */}
                <button 
                    onClick={onClose}
                    style={{
                        position: 'absolute', top: '20px', right: '20px', 
                        background: 'rgba(255,255,255,0.05)', border: 'none', 
                        borderRadius: '50%', width: '36px', height: '36px', 
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#94a3b8', cursor: 'pointer'
                    }}
                >
                    <X size={20} />
                </button>

                {/* Cabeçalho */}
                <div style={{ padding: '40px 32px 24px', textAlign: 'center' }}>
                    <div style={{ 
                        width: '64px', height: '64px', background: 'rgba(56, 189, 248, 0.1)', 
                        borderRadius: '20px', display: 'flex', alignItems: 'center', 
                        justifyContent: 'center', margin: '0 auto 20px', color: '#38bdf8'
                    }}>
                        <BookOpen size={32} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#f8fafc', marginBottom: '8px' }}>
                        Regras & Valores
                    </h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
                        Confira as diretrizes oficiais do grupo <strong>{equipeAtiva.nome}</strong>.
                    </p>
                </div>

                {/* Conteúdo das Regras */}
                <div style={{ padding: '0 32px 40px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
                    
                    {/* 1. Investimento */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ color: '#10b981', marginTop: '2px' }}><Coins size={22} /></div>
                        <div>
                            <h4 style={{ color: '#f8fafc', fontWeight: '700', fontSize: '1.05rem', marginBottom: '6px' }}>Investimento por Partida</h4>
                            <div style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                <div>{getLabelVinculo('mensalista')}: <strong>R$ {regras.mensalidade || '0,00'}</strong> / mês</div>
                                <div>{getLabelVinculo('avulso')}: <strong>{regras.valor_avulso ? `R$ ${regras.valor_avulso}` : 'Consulte um administrador'}</strong></div>
                                {temFinanceiro && regras.vencimento_dia && (
                                    <div style={{ color: '#f43f5e', fontSize: '0.8rem', marginTop: '6px', fontWeight: '600' }}>
                                        ⚠️ Bloqueio automático após o dia {regras.vencimento_dia} caso não pago.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. Janela de Inscrição */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ color: '#38bdf8', marginTop: '2px' }}><Calendar size={22} /></div>
                        <div>
                            <h4 style={{ color: '#f8fafc', fontWeight: '700', fontSize: '1.05rem', marginBottom: '6px' }}>Janela de Inscrição</h4>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                As inscrições abrem <strong>{regras.dias_antes || '2'} dias</strong> antes de cada evento agendado.
                            </p>
                        </div>
                    </div>

                    {/* 3. Prioridade */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ color: '#fbbf24', marginTop: '2px' }}><Users size={22} /></div>
                        <div>
                            <h4 style={{ color: '#f8fafc', fontWeight: '700', fontSize: '1.05rem', marginBottom: '6px' }}>Prioridade {getLabelVinculo('mensalista')}</h4>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                {getLabelVinculo('mensalista')}s têm prioridade de vaga. Em caso de lotação, confirmados {getLabelVinculo('avulso')}s podem ser movidos para a lista de espera.
                            </p>
                        </div>
                    </div>

                    {/* 4. Política de Faltas */}
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ color: '#f43f5e', marginTop: '2px' }}><ShieldAlert size={22} /></div>
                        <div>
                            <h4 style={{ color: '#f8fafc', fontWeight: '700', fontSize: '1.05rem', marginBottom: '6px' }}>Política de Faltas</h4>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: '1.5' }}>
                                Cancelamentos feitos com menos de <strong>{regras.horas_limite || '5'} horas</strong> de antecedência ou faltas injustificadas geram 1 advertência. Com <strong>{regras.limite_faltas || '2'} punições</strong>, o cadastro é bloqueado.
                            </p>
                        </div>
                    </div>

                    {/* Botão Entendido */}
                    <button 
                        onClick={onClose}
                        style={{
                            marginTop: '10px', width: '100%', padding: '16px', 
                            background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', 
                            border: 'none', borderRadius: '16px', color: 'white', 
                            fontWeight: '700', fontSize: '1rem', cursor: 'pointer',
                            boxShadow: '0 10px 20px -5px rgba(14, 165, 233, 0.4)',
                            transition: 'transform 0.2s', display: 'flex', 
                            alignItems: 'center', justifyContent: 'center', gap: '10px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Entendido, vamos pro jogo! <CheckCircle2 size={18} />
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes scaleIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-scale-in {
                    animation: scaleIn 0.3s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default ModalRegrasEquipe;
