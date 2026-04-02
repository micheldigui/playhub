import { useState, useEffect } from 'react';
import { supabase } from '../../servicos/supabase';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { Trophy, Plus, Trash2, ArrowLeft } from 'lucide-react';
import './PaginaPerfilEsportivo.css';

const ESPORTES_DATA = {
  "Futsal": ["Goleiro", "Fixo", "Ala", "Pivô", "Qualquer Posição"],
  "Futebol de Campo": ["Goleiro", "Zagueiro", "Lateral", "Volante", "Meio-Campo", "Ponta", "Atacante", "Qualquer Posição"],
  "Futebol Society / Suíço": ["Goleiro", "Zagueiro", "Fixo", "Ala", "Meio-Campo", "Pivô", "Atacante", "Qualquer Posição"],
  "Vôlei de Quadra": ["Levantador", "Líbero", "Central", "Ponteiro", "Oposto", "Qualquer Posição"],
  "Vôlei de Areia / Praia": ["Levantador", "Atacante", "Defensor", "Bloqueador", "Qualquer Posição"],
  "Futevôlei": ["Atacante", "Levantador", "Qualquer Posição"],
  "Basquete": ["Armador", "Ala", "Ala-Armador", "Ala-Pivô", "Pivô", "Qualquer Posição"],
  "Beach Tennis": ["Lado Direito", "Lado Esquerdo", "Ambos os Lados", "Qualquer Posição"],
  "Padel": ["Lado Direito", "Lado Esquerdo", "Ambos os Lados", "Qualquer Posição"],
  "Tênis": ["Simples", "Duplas", "Qualquer Posição"],
  "Handebol": ["Goleiro", "Armador", "Meia", "Ponta", "Pivô", "Qualquer Posição"],
  "E-Sports": ["Player", "Coach / IGL", "Qualquer Posição"]
};

const NIVEL_CLASSE = {
  'Lazer / Sem Experiência': 'lazer',
  'Iniciante': 'iniciante',
  'Intermediário': 'intermediario',
  'Avançado': 'avancado',
  'Profissional': 'profissional'
};

const PaginaPerfilEsportivo = ({ aoVoltar }) => {
  const { dadosUsuario } = usarAutenticacao();
  const [modalidades, setModalidades] = useState([]);
  const [interesses, setInteresses] = useState([]);
  const [carregandoModalidades, setCarregandoModalidades] = useState(true);
  const [novaModalidade, setNovaModalidade] = useState({ modalidade: '', posicao: '', nivel_habilidade: '' });
  const [adicionando, setAdicionando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  useEffect(() => {
    if (dadosUsuario) {
      carregarDadosPerfil(dadosUsuario.id);
    }
  }, [dadosUsuario]);

  const carregarDadosPerfil = async (userId) => {
    try {
      setCarregandoModalidades(true);

      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('esportes_interesse')
        .eq('id', userId)
        .single();

      if (!usuarioError && usuarioData) {
        setInteresses(usuarioData.esportes_interesse || []);
      }

      const { data, error } = await supabase
        .from('jogador_modalidades')
        .select('*')
        .eq('usuario_id', userId)
        .order('criado_em', { ascending: false });

      if (error) throw error;
      setModalidades(data || []);
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
    } finally {
      setCarregandoModalidades(false);
    }
  };

  const toggleInteresse = async (esporte) => {
    const novosInteresses = interesses.includes(esporte)
      ? interesses.filter(e => e !== esporte)
      : [...interesses, esporte];

    setInteresses(novosInteresses);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ esportes_interesse: novosInteresses })
        .eq('id', dadosUsuario.id);

      if (error) throw error;
    } catch (err) {
      console.error('Erro ao salvar interesse:', err);
      // rollback em caso de erro
      setInteresses(interesses);
      setMensagem({ tipo: 'erro', texto: 'Erro ao sincronizar interesses.' });
    }
  };

  const adicionarModalidade = async () => {
    if (!novaModalidade.modalidade || !novaModalidade.nivel_habilidade) {
      setMensagem({ tipo: 'erro', texto: 'Selecione o esporte e nível de habilidade.' });
      return;
    }

    try {
      setAdicionando(true);
      setMensagem({ tipo: '', texto: '' });
      const { error } = await supabase
        .from('jogador_modalidades')
        .insert({
          usuario_id: dadosUsuario.id,
          modalidade: novaModalidade.modalidade,
          posicao: novaModalidade.posicao || null,
          nivel_habilidade: novaModalidade.nivel_habilidade
        });

      if (error) {
        if (error.code === '23505') throw new Error('Você já adicionou essa modalidade e posição.');
        throw error;
      }

      setMensagem({ tipo: 'sucesso', texto: 'Habilidade adicionada com sucesso!' });
      setNovaModalidade({ modalidade: '', posicao: '', nivel_habilidade: '' });
      carregarDadosPerfil(dadosUsuario.id);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao adicionar habilidade.' });
    } finally {
      setAdicionando(false);
    }
  };

  const removerModalidade = async (id) => {
    if (!window.confirm('Remover esta modalidade do seu perfil?')) return;
    try {
      const { error } = await supabase.from('jogador_modalidades').delete().eq('id', id);
      if (error) throw error;
      setModalidades(prev => prev.filter(m => m.id !== id));
      setMensagem({ tipo: 'sucesso', texto: 'Modalidade removida.' });
    } catch (err) {
      console.error('Erro ao deletar:', err);
      setMensagem({ tipo: 'erro', texto: `Erro ao remover modalidade: ${err.message}` });
    }
  };

  // Posições baseadas no esporte selecionado
  const posicoesDisponiveis = novaModalidade.modalidade ? ESPORTES_DATA[novaModalidade.modalidade] : [];

  if (!dadosUsuario) return <div>Carregando...</div>;

  return (
    <div className="perfil-esportivo-container animacao-entrada">
      {mensagem.texto && (
        <div style={{ padding: '1rem 1.5rem 0 1.5rem' }}>
          <div className={`mensagem-alerta ${mensagem.tipo}`} style={{ marginBottom: 0 }}>
            <span>{mensagem.texto}</span>
          </div>
        </div>
      )}

      <div className="perfil-body">
        <div className="perfil-cartao" style={{ marginBottom: '1.5rem' }}>
          <span className="cartao-titulo"><Trophy size={14} /> ESPORTES DE INTERESSE</span>
          <p className="cartao-descricao">
            Selecione os esportes que você curte jogar por diversão.
            Mesmo sem posições definidas, você será visível para equipes locais na categoria "Casual".
          </p>

          <div className="grade-interesses">
            {Object.keys(ESPORTES_DATA).map(esporte => (
              <label key={esporte} className={`interesse-badge ${interesses.includes(esporte) ? 'ativo' : ''}`}>
                <input
                  type="checkbox"
                  checked={interesses.includes(esporte)}
                  onChange={() => toggleInteresse(esporte)}
                />
                {esporte}
              </label>
            ))}
          </div>
        </div>

        <div className="perfil-cartao">
          <span className="cartao-titulo"><Trophy size={14} /> SUAS HABILIDADES DETALHADAS</span>
          <p className="cartao-descricao">
            Se você tem experiência competitiva, adicione os esportes, suas posições favoritas e seu nível técnico.
          </p>

          <div className="modalidades-lista">
            {carregandoModalidades ? (
              <div className="loading-texto">Carregando modalidades...</div>
            ) : modalidades.length === 0 ? (
              <div className="estado-vazio">Nenhum esporte cadastrado. Adicione abaixo!</div>
            ) : (
              modalidades.map(m => (
                <div key={m.id} className="modalidade-item">
                  <div className="modalidade-info">
                    <strong>{m.modalidade}</strong>
                    {m.posicao && <span> • {m.posicao}</span>}
                    <span className={`badge-nivel ${NIVEL_CLASSE[m.nivel_habilidade] || 'iniciante'}`}>
                      {m.nivel_habilidade}
                    </span>
                  </div>
                  <button type="button" className="btn-remover-icone" onClick={() => removerModalidade(m.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="form-add-modalidade">
            <h4>Adicionar Esporte</h4>
            <div className="grade-add-modalidade">

              <div className="grupo-input">
                <label>Modalidade / Esporte *</label>
                <div className="campo-input">
                  <select
                    className="sem-icone"
                    value={novaModalidade.modalidade}
                    onChange={(e) => setNovaModalidade(p => ({ ...p, modalidade: e.target.value, posicao: '' }))}
                  >
                    <option value="">Selecione o esporte...</option>
                    {Object.keys(ESPORTES_DATA).map(esp => (
                      <option key={esp} value={esp}>{esp}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grupo-input">
                <label>Posição (Opcional)</label>
                <div className={`campo-input ${!novaModalidade.modalidade ? 'desabilitado' : ''}`}>
                  <select
                    className="sem-icone"
                    value={novaModalidade.posicao}
                    onChange={(e) => setNovaModalidade(p => ({ ...p, posicao: e.target.value }))}
                    disabled={!novaModalidade.modalidade}
                  >
                    <option value="">Selecione...</option>
                    {posicoesDisponiveis && posicoesDisponiveis.map(pos => (
                      <option key={pos} value={pos}>{pos}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grupo-input">
                <label>Nível *</label>
                <div className="campo-input">
                  <select
                    className="sem-icone"
                    value={novaModalidade.nivel_habilidade}
                    onChange={(e) => setNovaModalidade(p => ({ ...p, nivel_habilidade: e.target.value }))}
                  >
                    <option value="">Selecione...</option>
                    <option value="Lazer / Sem Experiência">Lazer / Sem Experiência</option>
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                    <option value="Profissional">Profissional</option>
                  </select>
                </div>
              </div>

              <div className="grupo-btn-add">
                <button
                  type="button"
                  className="btn-add-modalidade"
                  onClick={adicionarModalidade}
                  disabled={adicionando}
                >
                  <Plus size={18} /> {adicionando ? 'Adicionando...' : 'Adicionar'}
                </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaginaPerfilEsportivo;
