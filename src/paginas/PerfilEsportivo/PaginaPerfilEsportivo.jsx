import { useState, useEffect } from 'react';
import { supabase } from '../../servicos/supabase';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import { 
  User,
  Trophy, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  Target, 
  ShieldCheck, 
  Zap,
  Star
} from 'lucide-react';
import Botao from '../../componentes/Botao/Botao';
import { rastrear } from '../../servicos/rastreamento';
import './PaginaPerfilEsportivo.css';

const ESPORTES_DATA = {
  "Futsal": ["Goleiro", "Fixo", "Ala", "Pivô", "Qualquer Posição"],
  "Futebol de Campo": ["Goleiro", "Zagueiro", "Lateral", "Volante", "Meio-Campo", "Ponta", "Atacante", "Qualquer Posição"],
  "Futebol Society": ["Goleiro", "Zagueiro", "Fixo", "Ala", "Meio-Campo", "Pivô", "Atacante", "Qualquer Posição"],
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

const PaginaPerfilEsportivo = ({ aoVoltar, aoNavegar }) => {
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
      rastrear.pagina('Perfil Esportivo');
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
      rastrear.clique('perfil_esp_toggle_interesse', `Alterou interesse em: ${esporte}`, { esporte });
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

      setMensagem({ tipo: 'sucesso', texto: 'Habilidade adicionada!' });
      setNovaModalidade({ modalidade: '', posicao: '', nivel_habilidade: '' });
      carregarDadosPerfil(dadosUsuario.id);
      rastrear.clique('perfil_esp_add_habilidade', `Adicionou habilidade: ${novaModalidade.modalidade}`, { 
        modalidade: novaModalidade.modalidade,
        posicao: novaModalidade.posicao,
        nivel: novaModalidade.nivel_habilidade
      });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao adicionar.' });
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
      rastrear.clique('perfil_esp_remover_habilidade', 'Removeu uma habilidade');
    } catch (err) {
      console.error('Erro ao deletar:', err);
    }
  };

  const posicoesDisponiveis = novaModalidade.modalidade ? ESPORTES_DATA[novaModalidade.modalidade] : [];

  if (!dadosUsuario) return <div className="carregando-perfil">Carregando perfil esportivo...</div>;

  return (
    <div className="perfil-esportivo-premium animacao-entrada">
      {mensagem.texto && (
        <div className={`alerta-esp-global ${mensagem.tipo}`}>
          {mensagem.texto}
        </div>
      )}

      <div className="esp-perfil-body">
        {/* Cabeçalho de Navegação Rápida */}
        <div className="esp-nav-atalho">
          <button className="btn-atalho-perfil" onClick={() => {
            rastrear.clique('perfil_esp_voltar_perfil', 'Voltou para o perfil pessoal');
            aoNavegar('perfil');
          }}>
            <User size={16} />
            <span>Ver Meu Perfil</span>
          </button>
        </div>

        {/* Bloco 1: Esportes de Interesse */}
        <div className="esp-cartao-premium">
          <div className="esp-cartao-header">
            <div className="esp-icone-wrapper">
              <Target size={20} className="flash-icon" />
            </div>
            <div className="esp-header-texto">
              <h3>ESPORTES DE INTERESSE</h3>
              <p>Quais esportes você pretende jogar ou acompanhar na plataforma?</p>
            </div>
          </div>

          <div className="esp-grade-interesses">
            {Object.keys(ESPORTES_DATA).map(esporte => (
              <label key={esporte} className={`esp-interesse-tag ${interesses.includes(esporte) ? 'es-ativo' : ''}`}>
                <input
                  type="checkbox"
                  checked={interesses.includes(esporte)}
                  onChange={() => toggleInteresse(esporte)}
                />
                <span className="esp-tag-content">{esporte}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Bloco 2: Habilidades Detalhadas */}
        <div className="esp-cartao-premium">
          <div className="esp-cartao-header">
            <div className="esp-icone-wrapper alt">
              <Trophy size={20} />
            </div>
            <div className="esp-header-texto">
              <h3>SUAS HABILIDADES DETALHADAS</h3>
              <p>Experiência competitiva e posições favoritas para atrair novos times.</p>
            </div>
          </div>

          <div className="esp-modalidades-lista">
            {carregandoModalidades ? (
              <div className="esp-vazio-glow">Buscando suas habilidades...</div>
            ) : modalidades.length === 0 ? (
              <div className="esp-vazio-glow">Nenhum esporte competitivo cadastrado. Comece agora! 👇</div>
            ) : (
              modalidades.map(m => (
                <div key={m.id} className="esp-item-modalidade animacao-item-lista">
                  <div className="esp-modalidade-main">
                    <div className="esp-icone-esporte">
                      <Zap size={16} />
                    </div>
                    <div className="esp-info-text">
                      <span className="esp-nome-esporte">{m.modalidade}</span>
                      <span className="esp-posicao-esporte">{m.posicao || 'Qualquer Posição'}</span>
                    </div>
                  </div>
                  
                  <div className="esp-modalidade-meta">
                    <span className={`esp-badge-pro nivel-${NIVEL_CLASSE[m.nivel_habilidade]}`}>
                      {m.nivel_habilidade}
                    </span>
                    <button type="button" className="esp-btn-remover" onClick={() => removerModalidade(m.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Mini-form de Adição */}
          <div className="esp-form-adicao">
            <div className="esp-add-grid">
              <div className="esp-add-campo">
                <label>Modalidade</label>
                <select
                  value={novaModalidade.modalidade}
                  onChange={(e) => setNovaModalidade(p => ({ ...p, modalidade: e.target.value, posicao: '' }))}
                >
                  <option value="">Selecione...</option>
                  {Object.keys(ESPORTES_DATA).map(esp => <option key={esp} value={esp}>{esp}</option>)}
                </select>
              </div>

              <div className="esp-add-campo">
                <label>Posição</label>
                <select
                  value={novaModalidade.posicao}
                  onChange={(e) => setNovaModalidade(p => ({ ...p, posicao: e.target.value }))}
                  disabled={!novaModalidade.modalidade}
                >
                  <option value="">Todos</option>
                  {posicoesDisponiveis.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                </select>
              </div>

              <div className="esp-add-campo">
                <label>Nível</label>
                <select
                  value={novaModalidade.nivel_habilidade}
                  onChange={(e) => setNovaModalidade(p => ({ ...p, nivel_habilidade: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {Object.keys(NIVEL_CLASSE).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              <button
                type="button"
                className="esp-btn-confirmar-add"
                onClick={adicionarModalidade}
                disabled={adicionando}
              >
                <Plus size={18} />
                <span>{adicionando ? '...' : 'Adicionar'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaginaPerfilEsportivo;
