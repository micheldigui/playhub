import React, { useState } from 'react';
import { ShieldAlert, CheckCircle2, X } from 'lucide-react';
import Modal from '../Modal/Modal';
import Botao from '../Botao/Botao';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';

const ModalAjustePrivacidade = ({ isOpen, onClose, aoConcluir }) => {
    const { alternarVisibilidadePerfil, alternarWhatsAppMatch, dadosUsuario } = usarAutenticacao();
    const [processando, setProcessando] = useState(false);
    const [sucesso, setSucesso] = useState(false);

    const handleAtivarTudo = async () => {
        setProcessando(true);
        try {
            // Ativa perfil público se estiver desativado
            if (!dadosUsuario.perfil_publico) {
                await alternarVisibilidadePerfil();
            }
            // Ativa WhatsApp match se estiver desativado
            if (!dadosUsuario.compartilhar_whatsapp_match) {
                await alternarWhatsAppMatch();
            }
            
            setSucesso(true);
            setTimeout(() => {
                setSucesso(false);
                aoConcluir(); // Prossegue com a ação original (passar a bola)
            }, 1000);
        } catch (error) {
            console.error('Erro ao ajustar privacidade:', error);
        } finally {
            setProcessando(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} titulo="Privacidade Necessária">
            <div style={{ padding: '20px', textAlign: 'center' }}>
                <div style={{ 
                    width: '64px', height: '64px', 
                    borderRadius: '50%', background: 'rgba(52, 152, 219, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 20px', color: '#3498db'
                }}>
                    {sucesso ? <CheckCircle2 size={32} /> : <ShieldAlert size={32} />}
                </div>

                <h3 style={{ marginBottom: '10px', fontSize: '1.2rem' }}>
                    {sucesso ? 'Privacidade Ajustada!' : 'Torne-se visível para interagir'}
                </h3>
                
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.5' }}>
                    Para passar a bola e encontrar parceiros de jogo, você também precisa estar visível. 
                    Isso permite que quem recebe seu interesse possa ver quem você é e te retribuir!
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Botao 
                        variant="primario" 
                        onClick={handleAtivarTudo}
                        disabled={processando || sucesso}
                        style={{ width: '100%', py: '14px' }}
                    >
                        {processando ? 'Ajustando...' : sucesso ? 'Tudo pronto!' : 'Tornar perfil público e continuar'}
                    </Botao>
                    
                    <Botao 
                        variant="minimal" 
                        onClick={onClose}
                        disabled={processando}
                        style={{ width: '100%', color: '#64748b' }}
                    >
                        Agora não, apenas fechar
                    </Botao>
                </div>
            </div>
        </Modal>
    );
};

export default ModalAjustePrivacidade;
