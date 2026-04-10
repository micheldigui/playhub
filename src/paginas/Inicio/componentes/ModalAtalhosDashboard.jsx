import React from 'react';
import { X } from 'lucide-react';

/**
 * Modal de Personalização de Atalhos
 */
const ModalAtalhosDashboard = ({ 
    aberto, 
    aoFechar, 
    categoria, 
    catalogo, 
    selecionados, 
    toggleAtalho, 
    papelNaEquipe 
}) => {
    if (!aberto) return null;

    const isEquipe = categoria === 'equipe';
    const titulo = isEquipe ? 'Atalhos da Equipe' : 'Acesso Rápido';

    return (
        <div className="modal-overlay" onClick={aoFechar}>
            <div className="modal-atalhos" onClick={e => e.stopPropagation()}>
                <div className="modal-atalhos-header">
                    <h2>Personalizar — {titulo}</h2>
                    <button onClick={aoFechar} className="modal-fechar"><X size={20} /></button>
                </div>
                <p className="modal-sub">Ative ou desative os atalhos que deseja ver no painel.</p>
                {isEquipe && papelNaEquipe === 'jogador' && (
                    <p className="modal-aviso">⚡ Atalhos de gestão aparecem apenas para Capitães e Vice-Capitães.</p>
                )}
                <div className="modal-atalhos-grid">
                    {catalogo.map(a => {
                        const sel = selecionados.includes(a.id);
                        return (
                            <button
                                key={a.id}
                                className={`modal-atalho-item ${sel ? 'selecionado' : ''}`}
                                onClick={() => toggleAtalho(a.id, categoria)}
                            >
                                <span className="atalho-win-emoji">{a.emoji}</span>
                                <span className="atalho-win-label">{a.label}</span>
                                {sel && <div className="modal-check">✓</div>}
                            </button>
                        );
                    })}
                </div>
                <div className="modal-atalhos-footer">
                    <button className="btn-confirmar" onClick={aoFechar}>Concluído</button>
                </div>
            </div>
        </div>
    );
};

export default ModalAtalhosDashboard;
