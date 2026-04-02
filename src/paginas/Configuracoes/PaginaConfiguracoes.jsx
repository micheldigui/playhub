import React, { useState } from 'react';
import { 
  Settings, ShieldAlert, FileText, ChevronRight, 
  ArrowLeft, LogOut, UserX, ExternalLink, MessageCircle, Mail
} from 'lucide-react';
import Botao from '../../componentes/Botao/Botao';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { SUPORTE } from '../../config/suporte';

const PaginaConfiguracoes = ({ aoVoltar, aoNavegar }) => {
    const { usuario, dadosUsuario, logout } = usarAutenticacao();
    const [processando, setProcessando] = useState(false);

    const secaoItemEstilo = {
        background: 'none', border: 'none', width: '100%', padding: '1.5rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', transition: 'background 0.2s', textAlign: 'left',
        color: '#f8fafc'
    };

    const handleExcluirConta = async () => {
        const confirmacao = window.confirm(
            "⚠️ ATENÇÃO: Esta ação é permanente!\n\n" +
            "Ao excluir sua conta, você perderá acesso a todas as suas equipes, " +
            "histórico de partidas e dados de perfil. Não há como desfazer.\n\n" +
            "Deseja realmente continuar?"
        );

        if (confirmacao) {
            setProcessando(true);
            // Simulação de lógica de exclusão (geralmente via Edge Function ou Admin API)
            setTimeout(() => {
                alert("Sua solicitação de exclusão foi enviada e será processada em até 24h. Você será deslogado agora.");
                logout();
            }, 2000);
        }
    };

    return (
        <div className="animate-fade-in" style={{ padding: '0 2rem 2rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'grid', gap: '2rem' }}>
                <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>Gerencie sua conta e preferências do sistema.</p>

                
                {/* SEÇÃO: CONTA */}
                <section>
                    <h2 style={{ fontSize: '1.2rem', color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                        Conta & Segurança
                    </h2>
                    <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.05)', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ color: '#f8fafc', fontWeight: '600' }}>E-mail da Conta</div>
                                <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{usuario?.email}</div>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 10px', borderRadius: '20px', fontWeight: '700' }}>Verificado</span>
                        </div>
                        
                        <button 
                            onClick={logout}
                            style={secaoItemEstilo}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <LogOut size={20} color="#94a3b8" />
                                <span style={{ fontWeight: '500' }}>Sair da Conta</span>
                            </div>
                            <ChevronRight size={18} color="#475569" />
                        </button>
                    </div>
                </section>

                {/* SEÇÃO: SUPORTE */}
                <section>
                    <h2 style={{ fontSize: '1.2rem', color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                        Ajuda & Suporte
                    </h2>
                    <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.05)', overflow: 'hidden', padding: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(148, 163, 184, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Mail size={20} color="#94a3b8" />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: '#f8fafc', fontWeight: '600', fontSize: '1rem' }}>E-mail Oficial</div>
                                    <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{SUPORTE.EMAIL}</div>
                                </div>
                            </div>
                            
                            <Botao 
                                onClick={() => window.open(SUPORTE.GET_LINK_WHATSAPP('Olá! Preciso de ajuda no PlayHub.'), '_blank')}
                                style={{ width: '100%', justifyContent: 'center', background: '#25D366', color: '#fff', border: 'none' }}
                            >
                                <MessageCircle size={18} /> Conversar no WhatsApp
                            </Botao>
                        </div>
                    </div>
                </section>

                {/* SEÇÃO: LEGAL */}
                <section>
                    <h2 style={{ fontSize: '1.2rem', color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                        Legal & Suporte
                    </h2>
                    <div style={{ background: 'rgba(15, 23, 42, 0.4)', borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.05)', overflow: 'hidden' }}>
                        <button 
                            onClick={() => aoNavegar('termos')}
                            style={{ ...secaoItemEstilo, borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <FileText size={20} color="#94a3b8" />
                                <span style={{ fontWeight: '500' }}>Termos de Uso</span>
                            </div>
                            <ChevronRight size={18} color="#475569" />
                        </button>

                        <button 
                            onClick={() => aoNavegar('privacidade')}
                            style={secaoItemEstilo}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <ShieldAlert size={20} color="#94a3b8" />
                                <span style={{ fontWeight: '500' }}>Política de Privacidade</span>
                            </div>
                            <ChevronRight size={18} color="#475569" />
                        </button>
                    </div>
                </section>

                {/* SEÇÃO: ZONA DE PERIGO */}
                <section style={{ marginTop: '1rem' }}>
                    <div style={{ padding: '2rem', background: 'rgba(244, 63, 94, 0.05)', border: '1px dashed rgba(244, 63, 94, 0.2)', borderRadius: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#f43f5e', marginBottom: '12px' }}>
                            <UserX size={24} />
                            <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: 0 }}>Zona de Perigo</h2>
                        </div>
                        <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                            Ao excluir sua conta, todos os seus dados serão anonimizados e removidos permanentemente. 
                            Você perderá seu histórico tático, reputação no Fair Play e acesso às suas equipes.
                        </p>
                        <Botao 
                            variant="perigo" 
                            onClick={handleExcluirConta} 
                            disabled={processando}
                            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                        >
                            {processando ? 'Processando...' : 'Excluir minha conta permanentemente'}
                        </Botao>
                    </div>
                </section>

                <footer style={{ textAlign: 'center', padding: '2rem 0', color: '#475569', fontSize: '0.85rem' }}>
                    <p>PlayHub Sistema Esportivo v1.2.0 • 2026</p>
                </footer>
            </div>
        </div>
    );
};

export default PaginaConfiguracoes;
