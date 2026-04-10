import React from 'react';
import { Lock, Unlock, Info } from 'lucide-react';
import InfoTooltip from '../../../componentes/Tooltip/InfoTooltip';

/**
 * Componente de Cabeçalho do Dashboard
 * Exibe saudação, avatar e controles de privacidade (Perfil/WhatsApp)
 */
const DashboardHeader = ({ 
    dadosUsuario, 
    primeiroNome, 
    saudacao, 
    isPublico, 
    alterandoPriv, 
    handlePrivacidade, 
    handleToggleWhatsApp 
}) => {
    return (
        <header className="dash-hero">
            <div className="dash-hero-left">
                <div className="dash-avatar-wrapper">
                    {dadosUsuario.foto_url
                        ? <img src={dadosUsuario.foto_url} alt="Perfil" className="dash-avatar" />
                        : <div className="dash-avatar-fallback">{primeiroNome.charAt(0).toUpperCase()}</div>}
                    <div className="dash-avatar-online"></div>
                </div>
                <div>
                    <p className="dash-saudacao-sub">{saudacao},</p>
                    <h1 className="dash-saudacao-nome">{primeiroNome}!</h1>
                </div>
            </div>

            <div className="dash-hero-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div
                    className={`dash-priv-btn ${alterandoPriv ? 'loading' : ''}`}
                    onClick={!alterandoPriv ? handlePrivacidade : undefined}
                    role="button"
                    tabIndex="0"
                    style={{
                        borderColor: isPublico ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
                        color: isPublico ? '#10b981' : '#f43f5e',
                        background: isPublico ? 'rgba(16, 185, 129, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                        opacity: alterandoPriv ? 0.7 : 1,
                        cursor: alterandoPriv ? 'wait' : 'pointer'
                    }}
                >
                    {isPublico ? <Unlock size={15} /> : <Lock size={15} />}
                    <span>Perfil</span>
                    <InfoTooltip texto={`Seu perfil está ${isPublico ? 'Público' : 'Privado'}. Quando público, outros times podem te encontrar na busca do PlayHub para convites.`} posicao="bottom-left" />
                </div>
                
                <div
                    className={`dash-priv-btn ${alterandoPriv ? 'loading' : ''}`}
                    onClick={!alterandoPriv ? handleToggleWhatsApp : undefined}
                    role="button"
                    tabIndex="0"
                    style={{ 
                        borderColor: dadosUsuario.compartilhar_whatsapp_match ? 'rgba(37, 211, 102, 0.4)' : 'rgba(244, 63, 94, 0.4)',
                        color: dadosUsuario.compartilhar_whatsapp_match ? '#25D366' : '#f43f5e',
                        background: dadosUsuario.compartilhar_whatsapp_match ? 'rgba(37, 211, 102, 0.08)' : 'rgba(244, 63, 94, 0.08)',
                        opacity: alterandoPriv ? 0.7 : 1,
                        cursor: alterandoPriv ? 'wait' : 'pointer'
                    }}
                >
                    {dadosUsuario.compartilhar_whatsapp_match ? <Unlock size={15} /> : <Lock size={15} />}
                    <span>WhatsApp</span>
                    <InfoTooltip texto={`Seu WhatsApp está ${dadosUsuario.compartilhar_whatsapp_match ? 'Liberado' : 'Oculto'}. Quando liberado, seu número aparece apenas após interesse mútuo (Match).`} posicao="bottom-left" />
                </div>
            </div>
        </header>
    );
};

export default DashboardHeader;
