import { useState, useEffect } from 'react';
import { supabase } from '../../servicos/supabase';
import { X, Trophy, MapPin, Calendar, User, Phone, MessageSquare } from 'lucide-react';
import Botao from '../Botao/Botao';
import './PerfilAtletaModal.css';

const PerfilAtletaModal = ({ atleta, aoFechar, aoPassarBola, ehEu, ehMatch }) => {
    const [modalidades, setModalidades] = useState([]);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        if (atleta?.id) {
            carregarDetalhes();
        }
    }, [atleta]);

    const carregarDetalhes = async () => {
        try {
            setCarregando(true);
            const { data, error } = await supabase
                .from('jogador_modalidades')
                .select('*')
                .eq('usuario_id', atleta.id);
            
            if (error) throw error;
            setModalidades(data || []);
        } catch (error) {
            console.error('Erro ao carregar modalidades:', error);
        } finally {
            setCarregando(false);
        }
    };

    const calcularIdade = (dataNasc) => {
        if (!dataNasc) return null;
        const hoje = new Date();
        const nasc = new Date(dataNasc);
        let idade = hoje.getFullYear() - nasc.getFullYear();
        const m = hoje.getMonth() - nasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
        return idade;
    };

    if (!atleta) return null;

    return (
        <div className="modal-overlay" onClick={aoFechar}>
            <div className="modal-perfil-atleta animacao-entrada" onClick={e => e.stopPropagation()}>
                <button className="btn-fechar-modal" onClick={aoFechar}>
                    <X size={20} />
                </button>

                <div className="perfil-topo">
                    <div className="perfil-avatar-grande">
                        {atleta.foto_url ? (
                            <img src={atleta.foto_url} alt={atleta.nome_completo} />
                        ) : (
                            <div className="avatar-placeholder-grande">
                                {atleta.nome_completo?.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="perfil-info-basica">
                        <h2>{atleta.nome_completo}</h2>
                        <p className="perfil-apelido">@{atleta.apelido || 'atleta'}</p>
                        <div className="perfil-badges">
                            {atleta.data_nascimento && (
                                <span className="badge-perfil"><Calendar size={14} /> {calcularIdade(atleta.data_nascimento)} anos</span>
                            )}
                            <span className="badge-perfil"><MapPin size={14} /> {atleta.cidade || 'Local não inf.'}</span>
                        </div>
                    </div>
                </div>

                <div className="perfil-corpo">
                    <section className="perfil-secao">
                        <h3><Trophy size={18} /> Modalidades e Nível</h3>
                        {carregando ? (
                            <p>Carregando modalidades...</p>
                        ) : modalidades.length > 0 ? (
                            <div className="grade-modalidades-atleta">
                                {modalidades.map((m) => (
                                    <div key={m.id} className="item-modalidade-atleta">
                                        <div className="mod-header">
                                            <strong>{m.modalidade}</strong>
                                            <span className={`nivel-tag ${m.nivel_habilidade.toLowerCase()}`}>
                                                {m.nivel_habilidade}
                                            </span>
                                        </div>
                                        {m.posicao && <p className="mod-posicao">Posição: {m.posicao}</p>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="vazio">Este atleta ainda não adicionou modalidades ao perfil.</p>
                        )}
                    </section>
                </div>

                {!ehEu && (
                    <div className="perfil-rodape">
                        <Botao 
                            variant={ehMatch ? "primario" : "secundario"} 
                            onClick={() => {
                                aoPassarBola(atleta);
                                aoFechar();
                            }}
                            style={{ 
                                width: '100%', 
                                justifyContent: 'center', 
                                gap: '8px',
                                background: ehMatch ? 'rgba(37, 211, 102, 0.1)' : undefined, 
                                color: ehMatch ? '#25D366' : undefined, 
                                borderColor: ehMatch ? 'rgba(37, 211, 102, 0.4)' : undefined 
                            }}
                        >
                            {ehMatch ? <MessageSquare size={18} /> : <User size={18} />}
                            {ehMatch ? `Match! Conversar com ${atleta.apelido || 'ele(a)'}` : `Passar a bola para ${atleta.apelido || 'ele(a)'}`}
                        </Botao>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PerfilAtletaModal;
