import React, { useState, useEffect } from 'react';
import { Download, X, Monitor } from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { usarPwa } from '../../contextos/PwaContexto';
import './BannerInstalacaoApp.css';

const IconeAndroid = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 14v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" />
        <path d="M8 21v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2" />
        <path d="M15 11h.01" />
        <path d="M9 11h.01" />
        <path d="M12 4a3.5 3.5 0 0 0 -3.5 3.5v3.5h7v-3.5a3.5 3.5 0 0 0 -3.5 -3.5z" />
        <path d="M8.5 4l-1.5 -1.5" />
        <path d="M15.5 4l1.5 -1.5" />
    </svg>
);

const IconeApple = () => (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2.5a3 3 0 0 1 3 -3a3 3 0 0 1 -3 3z" />
        <path d="M8 12c0 -4 3 -5 4 -5c1 0 5 1 5 5c0 6 -4 10 -4 10s-5 -4 -5 -10" />
        <path d="M9 17l6 -6" />
    </svg>
);

const BannerInstalacaoApp = ({ local = 'dashboard', aoClicarMenu }) => {
    const { isIOS, isAndroid, isDesktop } = usePwaInstall();
    const { abrirModalInstalacao, isInstalled } = usarPwa();
    const [fechado, setFechado] = useState(false);

    const fecharBanner = (e) => {
        e.stopPropagation();
        setFechado(true);
    };

    const handleInstalar = () => {
        abrirModalInstalacao();
    };

    // Não renderizar se já estiver instalado (Standalone mode)
    if (isInstalled) return null;

    if (local === 'menu') {
        return (
            <button 
              className="item-nav-pwa" 
              onClick={() => {
                  handleInstalar();
                  if (aoClicarMenu) aoClicarMenu();
              }}
            >
                <span className="item-nav-icone" style={{ color: 'var(--primaria)' }}>
                   {isAndroid ? <IconeAndroid /> : isIOS ? <IconeApple /> : isDesktop ? <Monitor size={19} /> : <Download size={19} />}
                </span>
                <span className="item-nav-label" style={{ fontWeight: 600 }}>Instalar App</span>
            </button>
        );
    }

    if (local === 'dashboard') {
        if (fechado) return null;

        return (
            <div className="pwa-banner-dash" onClick={handleInstalar}>
                <div className="pwa-banner-icone">
                    {isAndroid ? <IconeAndroid /> : isIOS ? <IconeApple /> : isDesktop ? <Monitor size={24} /> : <Download size={24} />}
                </div>
                <div className="pwa-banner-texto">
                    <h3>Instalar Aplicativo</h3>
                    <p>Tenha acesso rápido na tela inicial do seu dispositivo.</p>
                </div>
                <button className="pwa-banner-fechar" onClick={fecharBanner} aria-label="Fechar banner">
                    <X size={18} />
                </button>
            </div>
        );
    }

    return null;
};

export default BannerInstalacaoApp;
