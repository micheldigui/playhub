import React from 'react';
import { 
  X, Share, Smartphone, Monitor, Download, 
  MoreVertical, PlusSquare, MonitorDown, CheckCircle2, Youtube 
} from 'lucide-react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import './BannerInstalacaoApp.css'; // Reutilizando e estendendo o CSS existente

const ModalInstalacaoApp = ({ aoFechar }) => {
    const { isIOS, isAndroid, isDesktop, installApp, isInstallable } = usePwaInstall();

    const handleAcaoPrimaria = () => {
        if (!isIOS && isInstallable) {
            installApp();
        }
    };

    const linkPlaylistTutorial = 'https://www.youtube.com/playlist?list=PLL3QBAHD-EYz4Ahj0M-IniOzdVdqWpNS5';

    const handleAssistirPlaylist = () => {
        window.open(linkPlaylistTutorial, '_blank');
    };

    const renderConteudo = () => {
        if (isIOS) {
            return (
                <div className="pwa-tutorial">
                    <div className="pwa-tutorial-intro">
                        <p>Siga estes 3 passos simples para instalar o <strong>PlayHub</strong> no seu iPhone ou iPad:</p>
                    </div>
                    <div className="pwa-passos">
                        <div className="pwa-passo">
                            <div className="pwa-passo-numero">1</div>
                            <div className="pwa-passo-texto">
                                Toque no botão de <strong>Compartilhar</strong> (quadrado com seta) na barra inferior do Safari.
                                <div className="pwa-passo-sub"><Share size={20} color="var(--primaria)" /></div>
                            </div>
                        </div>
                        <div className="pwa-passo">
                            <div className="pwa-passo-numero">2</div>
                            <div className="pwa-passo-texto">
                                No menu que abrir, role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>.
                                <div className="pwa-passo-sub"><PlusSquare size={20} /></div>
                            </div>
                        </div>
                        <div className="pwa-passo">
                            <div className="pwa-passo-numero">3</div>
                            <div className="pwa-passo-texto">
                                Confirme tocando em <strong>"Adicionar"</strong> no canto superior direito da tela.
                                <div className="pwa-passo-sub"><CheckCircle2 size={20} color="#10b981" /></div>
                            </div>
                        </div>
                    </div>

                    <button className="pwa-btn-video" onClick={handleAssistirPlaylist}>
                        <Youtube size={18} /> Ver Playlist de Tutoriais
                    </button>
                </div>
            );
        }

        if (isAndroid) {
            return (
                <div className="pwa-tutorial">
                    <div className="pwa-tutorial-intro">
                        <p>Instalação rápida do <strong>PlayHub</strong> para Android:</p>
                    </div>
                    <div className="pwa-passos">
                        <div className="pwa-passo">
                            <div className="pwa-passo-numero">1</div>
                            <div className="pwa-passo-texto">
                                Toque nos <strong>três pontinhos</strong> (⋮) localizados no canto superior direito do Chrome.
                                <div className="pwa-passo-sub"><MoreVertical size={20} /></div>
                            </div>
                        </div>
                        {isInstallable ? (
                            <div className="pwa-passo destaque">
                                <div className="pwa-passo-numero">2</div>
                                <div className="pwa-passo-texto">
                                    Toque no botão abaixo para uma instalação instantânea:
                                    <button className="pwa-btn-instalar-direto" onClick={handleAcaoPrimaria}>
                                        <Download size={18} /> Instalar Agora
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="pwa-passo">
                                <div className="pwa-passo-numero">2</div>
                                <div className="pwa-passo-texto">
                                    Localize e selecione a opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.
                                    <div className="pwa-passo-sub"><PlusSquare size={20} /></div>
                                </div>
                            </div>
                        )}
                        <div className="pwa-passo">
                            <div className="pwa-passo-numero">3</div>
                            <div className="pwa-passo-texto">
                                Pronto! O <strong>PlayHub</strong> agora aparecerá na sua tela inicial.
                            </div>
                        </div>
                    </div>

                    <button className="pwa-btn-video" onClick={handleAssistirPlaylist}>
                        <Youtube size={18} /> Ver Playlist de Tutoriais
                    </button>
                </div>
            );
        }

        // Desktop
        return (
            <div className="pwa-tutorial">
                <div className="pwa-tutorial-intro">
                    <p>Instale o <strong>PlayHub</strong> no seu computador para acesso rápido:</p>
                </div>
                <div className="pwa-passos">
                    <div className="pwa-passo">
                        <div className="pwa-passo-numero">1</div>
                        <div className="pwa-passo-texto">
                            Clique nos <strong>três pontinhos</strong> (⋮) no canto superior do navegador.
                            <div className="pwa-passo-sub"><MoreVertical size={18} /></div>
                        </div>
                    </div>
                    <div className="pwa-passo">
                        <div className="pwa-passo-numero">2</div>
                        <div className="pwa-passo-texto">
                            Vá em <strong>"Transmitir, salvar e compartilhar"</strong> e depois em <strong>"Instalar PlayHub"</strong>.
                            <div className="pwa-passo-sub"><Share size={18} /></div>
                        </div>
                    </div>
                    {isInstallable && (
                        <div className="pwa-passo destaque">
                            <div className="pwa-passo-numero">3</div>
                            <div className="pwa-passo-texto">
                                Ou clique no botão abaixo para instalar agora:
                                <button className="pwa-btn-instalar-direto" onClick={handleAcaoPrimaria}>
                                    <MonitorDown size={18} /> Instalar no PC
                                </button>
                            </div>
                        </div>
                    )}
                    <div className="pwa-passo">
                        <div className="pwa-passo-numero">4</div>
                        <div className="pwa-passo-texto">
                            Confirme em <strong>"Instalar"</strong> na janela que aparecerá.
                        </div>
                    </div>
                </div>

                <button className="pwa-btn-video" onClick={handleAssistirPlaylist}>
                    <Youtube size={18} /> Ver Playlist de Tutoriais
                </button>
            </div>
        );
    };

    return (
        <div className="pwa-modal-overlay">
            <div className="pwa-modal-conteudo pwa-guia-completo" onClick={e => e.stopPropagation()}>
                <header className="pwa-modal-header">
                    <div className="pwa-modal-title-group">
                        <div className="pwa-modal-icon-bg">
                            {isIOS ? <Smartphone size={20} /> : isAndroid ? <Smartphone size={20} /> : <Monitor size={20} />}
                        </div>
                        <h2>Instalar PlayHub</h2>
                    </div>
                    <button className="pwa-modal-fechar" onClick={aoFechar}>
                        <X size={20} />
                    </button>
                </header>

                <div className="pwa-modal-body">
                    {renderConteudo()}
                </div>

                <footer className="pwa-modal-footer">
                    <button className="pwa-btn-entendi" onClick={aoFechar}>Entendi, vamos lá!</button>
                </footer>
            </div>
        </div>
    );
};

export default ModalInstalacaoApp;
