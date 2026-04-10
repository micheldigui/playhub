import React from 'react';
import { Users, ChevronRight, Crown, Star } from 'lucide-react';

/**
 * Seção de Equipes do Dashboard
 * Exibe o carrossel de equipes do usuário e permite navegação rápida
 */
const SecaoEquipesDashboard = ({ 
    equipes, 
    equipeFinSelecionada, 
    setEquipeFinSelecionada, 
    selecionarEquipe, 
    setAbaEquipe, 
    aoNavegar,
    getLabelVinculo
}) => {
    return (
        <section className="bento-card card-equipes" style={{ order: 1 }}>
            <div className="bento-top">
                <div className="bento-titulo">
                    <span className="bento-icone purple"><Users size={17} /></span>
                    <h2>Minhas Equipes</h2>
                </div>
                <button className="bento-atalho" onClick={() => aoNavegar('explorar')}>Explorar +</button>
            </div>
            
            {equipes.length > 0 ? (
                <div className="equipes-carrossel">
                    {equipes.map(e => {
                        const selecionada = e.id === equipeFinSelecionada;
                        return (
                            <div 
                                key={e.id} 
                                className={`equipe-chip ${selecionada ? 'selecionada' : ''}`} 
                                onClick={() => {
                                    setEquipeFinSelecionada(e.id);
                                    selecionarEquipe(e.id);
                                }}
                                title={`Clique para ver estatísticas de ${e.nome}`}
                            >
                                <div className="equipe-chip-foto">
                                    {e.logo_url ? <img src={e.logo_url} alt={e.nome} /> : <span>{e.nome.charAt(0).toUpperCase()}</span>}
                                </div>
                                <div className="equipe-chip-info">
                                    <span className="equipe-chip-nome">{e.nome}</span>
                                    <span className="equipe-chip-papel">
                                        {e.papel === 'admin' ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Crown size={12} fill="#fbbf24" color="#fbbf24" /> Capitão
                                            </span>
                                        ) : e.papel === 'sub_admin' ? (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Crown size={12} fill="#94a3b8" color="#94a3b8" /> Vice-Cap.
                                            </span>
                                        ) : (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {e.vinculo === 'mensalista' ? (
                                                    <Star size={12} fill="#fbbf24" color="#fbbf24" />
                                                ) : (
                                                    <Star size={12} fill="#94a3b8" color="#94a3b8" />
                                                )}
                                                {getLabelVinculo(e.vinculo, e.gestao_financeira)}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <button 
                                    className="equipe-chip-arrow-btn" 
                                    onClick={(ev) => {
                                        ev.stopPropagation();
                                        selecionarEquipe(e.id);
                                        setAbaEquipe('minha-equipe');
                                        aoNavegar('equipe');
                                    }}
                                    title="Entrar na página da equipe"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bento-vazio">
                    <Users size={32} opacity={0.3} />
                    <p>Entre em uma equipe ou crie a sua!</p>
                </div>
            )}
        </section>
    );
};

export default SecaoEquipesDashboard;
