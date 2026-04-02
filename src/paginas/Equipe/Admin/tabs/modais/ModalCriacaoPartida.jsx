import React, { useState, useRef } from 'react';
import Botao from '../../../../../componentes/Botao/Botao';
import Modal from '../../../../../componentes/Modal/Modal';
import { X, Calendar, Clock, MapPin, Users, DollarSign } from 'lucide-react';
import { usarPartidas } from '../../../../../contextos/PartidasContexto';
import { usarEquipe } from '../../../../../contextos/EquipeContexto';

const ModalCriacaoPartida = ({ isOpen, onClose, aoSucesso }) => {
    const { equipeAtiva } = usarEquipe();
    const { criarPartida } = usarPartidas();
    
    const [formData, setFormData] = useState({
        equipe_id: '',
        data: '',
        hora: '',
        local_nome: '',
        vagas: 14,
        valor_avulso: 0.00
    });
    const [salvando, setSalvando] = useState(false);
    const dataRef = useRef(null);
    const horaRef = useRef(null);

    React.useEffect(() => {
        if (isOpen) {
            // Força reset com equipeAtiva ao abrir
            setFormData({
                equipe_id: equipeAtiva?.id || '',
                data: '',
                hora: '',
                local_nome: equipeAtiva?.local_nome || '',
                vagas: 14,
                valor_avulso: 0.00
            });
        }
    }, [isOpen]); // Dependência no isOpen garante refresh toda vez que for chamado

    if (!isOpen) return null;

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
        const result = await criarPartida(formData);
        setSalvando(false);

        if (result.sucesso) {
            if (aoSucesso) aoSucesso(result.partida);
            onClose();
        } else {
            alert('Erro ao criar partida: ' + result.erro);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Agendar Nova Partida"
            maxWidth="500px"
        >
            <div className="anima-entrada">

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '20px' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>Hora</label>
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
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>Local da Partida</label>
                        <div className="input-busca-grupo" style={{ width: '100%' }}>
                            <MapPin size={18} />
                            <input 
                                type="text" 
                                name="local_nome"
                                value={formData.local_nome}
                                onChange={handleChange}
                                placeholder="Nome do Ginásio/Quadra"
                                required
                            />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '8px', fontWeight: '600' }}>Nº de Vagas Mínimas</label>
                            <div className="input-busca-grupo" style={{ width: '100%' }}>
                                <Users size={18} />
                                <input 
                                    type="number" 
                                    name="vagas"
                                    value={formData.vagas}
                                    onChange={handleChange}
                                    min="2"
                                    required
                                />
                            </div>
                        </div>
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
                    </div>

                    <Botao type="submit" fullWidth disabled={salvando} style={{ marginTop: '16px', padding: '16px' }}>
                        {salvando ? 'Criando Partida...' : 'Criar Partida'}
                    </Botao>
                </form>
            </div>
        </Modal>
    );
};

export default ModalCriacaoPartida;
