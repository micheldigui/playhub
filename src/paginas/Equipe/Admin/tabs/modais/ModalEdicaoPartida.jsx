import React, { useState, useEffect, useRef } from 'react';
import Botao from '../../../../../componentes/Botao/Botao';
import Modal from '../../../../../componentes/Modal/Modal';
import { X, Calendar, Clock, MapPin, Users, DollarSign } from 'lucide-react';
import { usarPartidas } from '../../../../../contextos/PartidasContexto';
import { usarEquipe } from '../../../../../contextos/EquipeContexto';

const ModalEdicaoPartida = ({ isOpen, onClose, partida }) => {
    const { editarPartida } = usarPartidas();
    const { equipeAtiva } = usarEquipe();
    
    const [formData, setFormData] = useState({
        data: '',
        hora: '',
        hora_termino: '',
        tipo_evento: 'partida',
        local_nome: '',
        local_endereco: '',
        vagas: 14,
        valor_avulso: 0.00,
        observacoes: '',
        tem_churrasco: false
    });
    const [salvando, setSalvando] = useState(false);
    const dataRef = useRef(null);
    const horaRef = useRef(null);

    useEffect(() => {
        if (isOpen && partida) {
            setFormData({
                data: partida.data,
                hora: partida.hora,
                hora_termino: partida.hora_termino || '',
                tipo_evento: partida.tipo_evento || 'partida',
                local_nome: partida.local_nome || equipeAtiva?.local_nome || '',
                local_endereco: partida.local_endereco || '',
                vagas: partida.vagas || 14,
                valor_avulso: partida.valor_avulso,
                observacoes: partida.observacoes || '',
                tem_churrasco: partida.tem_churrasco || false
            });
        }
    }, [isOpen, partida]);

    if (!isOpen || !partida) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'vagas' || name === 'valor_avulso' ? Number(value) : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSalvando(true);
        const result = await editarPartida(partida.id, formData);
        setSalvando(false);

        if (result.sucesso) {
            onClose();
        } else {
            alert('Erro ao editar partida: ' + result.erro);
        }
    };

    return (
        <Modal 
            isOpen={isOpen && !!partida} 
            onClose={onClose} 
            title="Editar Partida"
            maxWidth="500px"
        >
            <div className="anima-entrada">
                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>Tipo de Evento</label>
                            <div className="input-busca-grupo" style={{ width: '100%' }}>
                                <select 
                                    name="tipo_evento"
                                    value={['treino', 'confraternizacao', 'jogo_contra', 'amistoso', 'scrim', 'inhouse', 'vod_review', 'tryout', 'partida'].includes(formData.tipo_evento) ? formData.tipo_evento : 'outro'}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData(prev => ({ ...prev, tipo_evento: val === 'outro' ? '' : val }));
                                    }}
                                    style={{ 
                                        background: 'transparent', border: 'none', color: '#f8fafc', 
                                        width: '100%', outline: 'none', fontSize: '14px', cursor: 'pointer'
                                    }}
                                >
                                    <option value="partida" style={{ background: '#0f172a' }}>⚽ Jogo / Partida</option>
                                    <option value="treino" style={{ background: '#0f172a' }}>💪 Treino Geral</option>
                                    <option value="scrim" style={{ background: '#0f172a' }}>🎮 Treino contra outro Time (Scrim)</option>
                                    <option value="inhouse" style={{ background: '#0f172a' }}>🏠 Jogo Interno / Entre nós (Mix)</option>
                                    <option value="vod_review" style={{ background: '#0f172a' }}>📺 Revisão de Jogo / Tática (VOD)</option>
                                    <option value="tryout" style={{ background: '#0f172a' }}>🕵️‍♂️ Teste de Jogador (Tryout)</option>
                                    <option value="amistoso" style={{ background: '#0f172a' }}>🤝 Amistoso</option>
                                    <option value="jogo_contra" style={{ background: '#0f172a' }}>⚔️ Jogo Contra</option>
                                    <option value="confraternizacao" style={{ background: '#0f172a' }}>🎉 Confraternização</option>
                                    <option value="outro" style={{ background: '#0f172a' }}>✨ Outro (Digitar)</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>Data</label>
                            <div className="input-busca-grupo" style={{ width: '100%' }}>
                                <Calendar size={18} style={{ cursor: 'pointer' }} onClick={() => { dataRef.current?.focus(); try { dataRef.current?.showPicker() } catch(e){} }} />
                                <input 
                                    ref={dataRef}
                                    type="date" 
                                    name="data"
                                    value={formData.data}
                                    onChange={handleChange}
                                    required
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>
                        </div>
                    </div>

                    {!['treino', 'confraternizacao', 'jogo_contra', 'amistoso', 'scrim', 'inhouse', 'vod_review', 'tryout', 'partida'].includes(formData.tipo_evento) && (
                        <div className="anima-entrada">
                            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>Nome do Evento Personalizado</label>
                            <div className="input-busca-grupo" style={{ width: '100%' }}>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Torneio Interno, Festival..."
                                    value={formData.tipo_evento}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const formatado = val.charAt(0).toUpperCase() + val.slice(1);
                                        setFormData(prev => ({ ...prev, tipo_evento: formatado }));
                                    }}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    <div style={{ background: 'rgba(249, 115, 22, 0.05)', padding: '12px', borderRadius: '12px', border: '1px solid rgba(249, 115, 22, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ background: 'rgba(249, 115, 22, 0.1)', padding: '8px', borderRadius: '8px' }}>
                                🍖
                            </div>
                            <div>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f97316' }}>Terceiro Tempo?</div>
                                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Vai rolar um churrasco ou resenha após?</div>
                            </div>
                        </div>
                        <input 
                            type="checkbox" 
                            name="tem_churrasco"
                            checked={formData.tem_churrasco}
                            onChange={(e) => setFormData(prev => ({ ...prev, tem_churrasco: e.target.checked }))}
                            style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#f97316' }}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>Horário de Início</label>
                            <div className="input-busca-grupo" style={{ width: '100%' }}>
                                <Clock size={18} style={{ cursor: 'pointer' }} onClick={() => { horaRef.current?.focus(); try { horaRef.current?.showPicker() } catch(e){} }} />
                                <input 
                                    ref={horaRef}
                                    type="time" 
                                    name="hora"
                                    value={formData.hora}
                                    onChange={handleChange}
                                    required
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>Horário de Término</label>
                            <div className="input-busca-grupo" style={{ width: '100%' }}>
                                <Clock size={18} style={{ opacity: 0.5 }} />
                                <input 
                                    type="time" 
                                    name="hora_termino"
                                    value={formData.hora_termino}
                                    onChange={handleChange}
                                    style={{ colorScheme: 'dark' }}
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Onde vai ser?</label>
                            <button 
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, local_nome: prev.local_nome === equipeAtiva?.local_nome ? '' : equipeAtiva?.local_nome }))}
                                style={{ 
                                    background: 'none', border: 'none', color: '#38bdf8', fontSize: '11px', 
                                    cursor: 'pointer', padding: '0', textDecoration: 'underline' 
                                }}
                            >
                                {formData.local_nome === equipeAtiva?.local_nome ? 'Trocar para Link/Outro Local' : 'Usar Local Padrão da Equipe'}
                            </button>
                        </div>
                        <div style={{ display: 'grid', gap: '10px' }}>
                            <div className="input-busca-grupo" style={{ width: '100%' }}>
                                <MapPin size={18} />
                                <input 
                                    type="text" 
                                    name="local_nome"
                                    value={formData.local_nome}
                                    onChange={handleChange}
                                    placeholder="Ex: Arena Society, Discord, Servidor..."
                                    required
                                />
                            </div>
                            
                            {formData.local_nome !== equipeAtiva?.local_nome && (
                                <div className="anima-entrada input-busca-grupo" style={{ width: '100%' }}>
                                    <input 
                                        type="text" 
                                        name="local_endereco"
                                        value={formData.local_endereco || ''}
                                        onChange={handleChange}
                                        placeholder="Endereço ou Link de Acesso (Opcional)"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '600' }}>Limite de Vagas</label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#38bdf8', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={formData.vagas === 999}
                                        onChange={(e) => setFormData(prev => ({ ...prev, vagas: e.target.checked ? 999 : 14 }))}
                                        style={{ accentColor: '#38bdf8' }}
                                    /> Ilimitado
                                </label>
                            </div>
                            <div className="input-busca-grupo" style={{ width: '100%', opacity: formData.vagas === 999 ? 0.5 : 1 }}>
                                <Users size={18} />
                                <input 
                                    type="number" 
                                    name="vagas"
                                    value={formData.vagas === 999 ? '' : formData.vagas}
                                    onChange={handleChange}
                                    placeholder={formData.vagas === 999 ? '∞' : 'Ex: 14'}
                                    disabled={formData.vagas === 999}
                                    min="1"
                                    required={formData.vagas !== 999}
                                />
                            </div>
                        </div>
                        {equipeAtiva?.gestao_financeira && (
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>Valor Avulso (R$)</label>
                                <div className="input-busca-grupo" style={{ width: '100%' }}>
                                    <span style={{ color: '#94a3b8', fontWeight: 'bold', fontSize: '13px', marginLeft: '2px' }}>R$</span>
                                    <input 
                                        type="number" 
                                        name="valor_avulso"
                                        value={formData.valor_avulso}
                                        onChange={handleChange}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>Observações / Recados</label>
                        <div className="input-busca-grupo" style={{ width: '100%', alignItems: 'flex-start', padding: '10px' }}>
                            <textarea 
                                name="observacoes"
                                value={formData.observacoes}
                                onChange={handleChange}
                                placeholder="Informações extras para os atletas..."
                                style={{ 
                                    background: 'transparent', border: 'none', color: '#f8fafc', 
                                    width: '100%', outline: 'none', fontSize: '14px', 
                                    minHeight: '60px', resize: 'none' 
                                }}
                            />
                        </div>
                    </div>

                    <Botao type="submit" fullWidth disabled={salvando} style={{ marginTop: '16px', padding: '16px' }}>
                        {salvando ? 'Salvando Alterações...' : 'Salvar Alterações'}
                    </Botao>
                </form>
            </div>
        </Modal>
    );
};

export default ModalEdicaoPartida;
