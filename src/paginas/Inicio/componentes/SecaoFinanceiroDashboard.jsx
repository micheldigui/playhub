import React from 'react';
import { Activity, ChevronRight } from 'lucide-react';
import CardsDadosAtleta from '../../Equipe/componentes/CardsDadosAtleta';

/**
 * Seção de Resumo Financeiro do Dashboard
 */
const SecaoFinanceiroDashboard = ({ 
    equipeNome, 
    equipeId, 
    carregandoFin, 
    navegarParaEquipeFocada 
}) => {
    return (
        <section className="bento-card card-financeiro" style={{ order: 4 }}>
            <div className="bento-top">
                <div className="bento-titulo">
                    <span className="bento-icone green"><Activity size={17} /></span>
                    <h2>Resumo Teu na Equipe</h2>
                </div>
                <button className="bento-atalho" onClick={() => navegarParaEquipeFocada('minha-equipe')}>Detalhes</button>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '-0.5rem', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                Focado em: <strong style={{color: 'var(--primaria)'}}>{equipeNome}</strong>
            </p>

            {carregandoFin ? (
                <div className="fin-loading">
                    <Activity size={18} className="dash-spinner" />
                </div>
            ) : (
                <div style={{ marginTop: '1.25rem' }}>
                    <CardsDadosAtleta equipeIdOpcional={equipeId} esconderIcones={true} />
                    
                    <div className="fin-acoes-wrap" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-1rem' }}>
                        <button className="bento-atalho" onClick={() => navegarParaEquipeFocada('financeiro-mensal')}>
                            Ver Detalhes Financeiros <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};

export default SecaoFinanceiroDashboard;
