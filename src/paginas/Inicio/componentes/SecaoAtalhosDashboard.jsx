import React from 'react';
import { GripHorizontal, Settings, Plus, Users, Crown } from 'lucide-react';

/**
 * Componente que exibe uma grade de atalhos (Pessoais ou de Equipe)
 */
const GradeAtalhos = ({ 
    titulo, 
    icone: Icone, 
    corIcone, 
    atalhos, 
    setModalCategoria, 
    setModalAtalhosAberto, 
    categoria, 
    aoNavegar, 
    setAbaEquipe,
    selecionarEquipe = null,
    equipeId = null,
    equipeNome = null,
    papel = null,
    ordem = 5,
    setDadosNavegacao = null
}) => {
    return (
        <section className={`bento-card card-atalhos-${categoria}`} style={{ order: ordem }}>
            <div className="bento-top" style={{ marginBottom: '0.75rem' }}>
                <div className="bento-titulo">
                    <span className={`bento-icone ${corIcone}`}><Icone size={17} /></span>
                    <div>
                        <h2>{titulo}</h2>
                        {equipeNome && (
                            <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: '500', display: 'block', marginTop: '-2px' }}>
                                {equipeNome}
                            </span>
                        )}
                    </div>
                </div>
                <button className="bento-atalho" onClick={() => { setModalCategoria(categoria); setModalAtalhosAberto(true); }}>
                    <Settings size={13} /> Personalizar
                </button>
            </div>

            {atalhos.length > 0 ? (
                <div className="atalhos-win-grid">
                    {atalhos.map(a => (
                        <button key={a.id} className="atalho-win-btn" onClick={() => {
                            if (a.action) a.action(aoNavegar, setAbaEquipe, selecionarEquipe, equipeId, setDadosNavegacao);
                            else {
                                if (selecionarEquipe && equipeId) selecionarEquipe(equipeId);
                                aoNavegar(a.tela);
                            }
                        }}>
                            <span className="atalho-win-emoji">{a.emoji}</span>
                            <span className="atalho-win-label">{a.label}</span>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="bento-vazio pequeno">
                    <p>Nenhum atalho ativo.</p>
                    <button className="bento-atalho" style={{ marginTop: '0.5rem' }} onClick={() => { setModalCategoria(categoria); setModalAtalhosAberto(true); }}>
                        <Plus size={13} /> Adicionar
                    </button>
                </div>
            )}
        </section>
    );
};

export default GradeAtalhos;
