import { useState, useRef, useEffect } from 'react';
import Modal from '../Modal/Modal';
import Botao from '../Botao/Botao';
import { 
  Globe, Lock, MapPin, Search, Camera, User, 
  Image as ImageIcon, Home, Hash, Map, Building2, Flag, Link,
  Settings, DollarSign, Users, Calendar, CreditCard, Clock
} from 'lucide-react';
import { usarEquipe } from '../../contextos/EquipeContexto';
import './ModalCriacaoEquipe.css';

const MODALIDADES = [
  'Futebol de Campo', 'Futsal', 'Futebol Society / Suíço', 
  'Vôlei de Quadra', 'Vôlei de Areia / Praia', 'Futevôlei',
  'Basquete', 'Beach Tennis', 'Padel', 'Tênis', 'Handebol', 'E-Sports'
];

const ModalCriacaoEquipe = ({ isOpen, onClose, aoSucesso, equipeParaEditar = null }) => {
  const { criarEquipe, editarEquipe } = usarEquipe();
  
  const [form, setForm] = useState({
    nome: equipeParaEditar?.nome || '',
    modalidade: equipeParaEditar?.modalidade || '',
    observacoes: equipeParaEditar?.observacoes || '',
    maxJogadores: equipeParaEditar?.max_jogadores || 20,
    visibilidade: equipeParaEditar?.visibilidade || 'publica',
    nivel: equipeParaEditar?.nivel || '',
    cep: equipeParaEditar?.cep || '',
    cidade: equipeParaEditar?.cidade || '',
    estado: equipeParaEditar?.estado || '',
    local_nome: equipeParaEditar?.local_nome || '',
    local_cep: equipeParaEditar?.local_cep || '',
    local_rua: equipeParaEditar?.local_rua || '',
    local_numero: equipeParaEditar?.local_numero || '',
    local_complemento: equipeParaEditar?.local_complemento || '',
    local_bairro: equipeParaEditar?.local_bairro || '',
    local_cidade: equipeParaEditar?.local_cidade || '',
    local_estado: equipeParaEditar?.local_estado || '',
    local_mapa_link: equipeParaEditar?.local_mapa_link || '',
    link_grupo: equipeParaEditar?.link_grupo || '',
    gestao_financeira: equipeParaEditar?.gestao_financeira ?? true,
    aceitando_membros: equipeParaEditar?.aceitando_membros ?? true,
    // Novos campos financeiros (dentro de regras)
    mensalidade: equipeParaEditar?.regras?.mensalidade || 50,
    vencimento_dia: equipeParaEditar?.regras?.vencimento_dia || 10,
    chave_pix: equipeParaEditar?.regras?.chave_pix || '',
    custo_quadra: equipeParaEditar?.regras?.custo_quadra || 0,
    horas_limite_pagamento: equipeParaEditar?.regras?.horas_limite_pagamento || 24
  });

  const [arquivoLogo, setArquivoLogo] = useState(null);
  const [previewLogo, setPreviewLogo] = useState(equipeParaEditar?.logo_url || null);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const campoNumeroRef = useRef(null);
  const campoNomeRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (equipeParaEditar) {
        setForm({
          nome: equipeParaEditar.nome || '',
          modalidade: equipeParaEditar.modalidade || '',
          observacoes: equipeParaEditar.observacoes || '',
          maxJogadores: equipeParaEditar.max_jogadores || 20,
          visibilidade: equipeParaEditar.visibilidade || 'publica',
          nivel: equipeParaEditar.nivel || '',
          cep: equipeParaEditar.cep || '',
          cidade: equipeParaEditar.cidade || '',
          estado: equipeParaEditar.estado || '',
          local_nome: equipeParaEditar.local_nome || '',
          local_cep: equipeParaEditar.local_cep || '',
          local_rua: equipeParaEditar.local_rua || '',
          local_numero: equipeParaEditar.local_numero || '',
          local_complemento: equipeParaEditar.local_complemento || '',
          local_bairro: equipeParaEditar.local_bairro || '',
          local_cidade: equipeParaEditar.local_cidade || '',
          local_estado: equipeParaEditar.local_estado || '',
          local_mapa_link: equipeParaEditar.local_mapa_link || '',
          link_grupo: equipeParaEditar.link_grupo || '',
          gestao_financeira: equipeParaEditar.gestao_financeira ?? true,
          aceitando_membros: equipeParaEditar.aceitando_membros ?? true,
          mensalidade: equipeParaEditar.regras?.mensalidade || 50,
          vencimento_dia: equipeParaEditar.regras?.vencimento_dia || 10,
          chave_pix: equipeParaEditar.regras?.chave_pix || '',
          custo_quadra: equipeParaEditar.regras?.custo_quadra || 0,
          horas_limite_pagamento: equipeParaEditar.regras?.horas_limite_pagamento || 24
        });
        setPreviewLogo(equipeParaEditar.logo_url || null);
      } else {
        // Resetar para criação de nova equipe
        setForm({
          nome: '',
          modalidade: '',
          observacoes: '',
          maxJogadores: 20,
          visibilidade: 'publica',
          nivel: '',
          cep: '',
          cidade: '',
          estado: '',
          local_nome: '',
          local_cep: '',
          local_rua: '',
          local_numero: '',
          local_complemento: '',
          local_bairro: '',
          local_cidade: '',
          local_estado: '',
          local_mapa_link: '',
          link_grupo: '',
          gestao_financeira: true,
          aceitando_membros: true,
          mensalidade: 50,
          vencimento_dia: 10,
          chave_pix: '',
          custo_quadra: 0,
          horas_limite_pagamento: 24
        });
        setPreviewLogo(null);
      }
      const timeoutId = setTimeout(() => {
        if (campoNomeRef.current) {
          campoNomeRef.current.focus();
        }
      }, 150);
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, equipeParaEditar]);

  const mascaraCep = (valor) => {
    const nums = valor.replace(/\D/g, '').slice(0, 8);
    return nums.length > 5 ? `${nums.slice(0, 5)}-${nums.slice(5)}` : nums;
  };

  const buscarCep = async (valorManual) => {
    const cepLimpo = valorManual || form.local_cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    
    setBuscandoCep(true);
    setErro('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (data.erro) {
        setErro('CEP não encontrado.');
      } else {
        setForm(prev => ({ 
          ...prev, 
          local_rua: data.logradouro || '',
          local_bairro: data.bairro || '',
          local_cidade: data.localidade || '', 
          local_estado: data.uf || '',
          cidade: data.localidade || '', // Mantém cidade/estado base atualizados
          estado: data.uf || ''
        }));
        // Foco automático no número após preencher endereço
        setTimeout(() => campoNumeroRef.current?.focus(), 100);
      }
    } catch (err) {
      setErro('Erro ao buscar CEP. Tente preencher manualmente.');
    } finally {
      setBuscandoCep(false);
    }
  };

  const handleFoto = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setArquivoLogo(file);
      setPreviewLogo(URL.createObjectURL(file));
    }
  };

  const handleMudanca = (campo, valor) => {
    setForm(prev => ({ ...prev, [campo]: valor }));
    
    // Auto busca se for CEP
    if (campo === 'local_cep') {
      const limpo = valor.replace(/\D/g, '');
      if (limpo.length === 8) buscarCep(limpo);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    
    if (!form.nome || !form.modalidade || !form.local_cidade || !form.local_estado || !form.nivel) {
      setErro('Preencha os campos obrigatórios (Nome, Modalidade, Localização, Nível).');
      return;
    }

    setCarregando(true);
    let result;
    
    const dadosParaSalvar = {
      ...form,
      regras: {
        ...(equipeParaEditar?.regras || {}),
        mensalidade: Number(form.mensalidade),
        vencimento_dia: Number(form.vencimento_dia),
        chave_pix: form.chave_pix,
        custo_quadra: Number(form.custo_quadra || 0),
        horas_limite_pagamento: Number(form.horas_limite_pagamento || 24),
        prioridade_mensalista: equipeParaEditar?.regras?.prioridade_mensalista || false,
        dias_abertura_inscricao: equipeParaEditar?.regras?.dias_abertura_inscricao || 7,
        horas_limite_inscricao: equipeParaEditar?.regras?.horas_limite_inscricao || 2,
        horas_limite_cancelamento: equipeParaEditar?.regras?.horas_limite_cancelamento || 24,
        suspenso_amarelos: equipeParaEditar?.regras?.suspenso_amarelos || 3
      }
    };

    if (equipeParaEditar) {
      result = await editarEquipe(equipeParaEditar.id, dadosParaSalvar, arquivoLogo);
    } else {
      result = await criarEquipe(dadosParaSalvar, arquivoLogo);
    }
    
    setCarregando(false);

    if (result.sucesso) {
      if (!equipeParaEditar) limparForm();
      onClose();
      if (aoSucesso) aoSucesso(result.equipe);
    } else {
      setErro('Falha ao processar equipe: ' + result.erro);
    }
  };

  const limparForm = () => {
    if (!equipeParaEditar) {
      setForm({
        nome: '', modalidade: '', observacoes: '',
        maxJogadores: 20, visibilidade: 'publica',
        nivel: '', cep: '', cidade: '', estado: '',
        local_nome: '', local_cep: '', local_rua: '', local_numero: '', 
        local_complemento: '', local_bairro: '', local_cidade: '', 
        local_estado: '', local_mapa_link: '', link_grupo: '',
        gestao_financeira: true, aceitando_membros: true
      });
      setArquivoLogo(null);
      setPreviewLogo(null);
    }
    setErro('');
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => { limparForm(); onClose(); }} 
      title={equipeParaEditar ? "Editar Equipe" : "Criar Nova Equipe"}
      maxWidth="800px"
    >
      <form className="form-equipe" onSubmit={handleSubmit}>
        
        {erro && <div className="alerta-erro">{erro}</div>}

        <div className="secao-upload-logo">
          <div className="avatar-preview">
            {previewLogo ? (
              <img 
                src={previewLogo} 
                alt="Preview do Escudo" 
                className="avatar-img" 
                style={{ borderRadius: '12px', width: '140px', height: '140px', objectFit: 'cover' }}
              />
            ) : (
              <div className="avatar-placeholder">
                <ImageIcon size={40} color="#475569" />
              </div>
            )}
            <label className="btn-upload-logo">
              <Camera size={16} />
              <span>{previewLogo ? 'Trocar Escudo' : 'Adicionar Escudo'}</span>
              <input type="file" accept="image/*" onChange={handleFoto} />
            </label>
          </div>
          <div className="dica-upload">
            <p><strong>A alma do time!</strong></p>
            <span>Dica: Use uma imagem quadrada (.png ou .jpg) para melhor qualidade na listagem.</span>
          </div>
        </div>

        <div className="campo">
          <label>Nome da Equipe *</label>
          <input 
            type="text" 
            placeholder="Ex: Guerreiros do Final de Semana" 
            value={form.nome}
            onChange={(e) => handleMudanca('nome', e.target.value)}
            required
            ref={campoNomeRef}
          />
        </div>

        <div className="fila-campos">
          <div className="campo">
            <label>Modalidade *</label>
            <select value={form.modalidade} onChange={(e) => handleMudanca('modalidade', e.target.value)} required>
              <option value="">Selecione...</option>
              {MODALIDADES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="campo">
            <label>Nível da Equipe *</label>
            <select value={form.nivel} onChange={(e) => handleMudanca('nivel', e.target.value)} required>
              <option value="">Selecione...</option>
              <option value="Lazer / Sem Experiência">Lazer / Sem Experiência</option>
              <option value="Iniciante">Iniciante</option>
              <option value="Intermediário">Intermediário</option>
              <option value="Avançado">Avançado</option>
              <option value="Profissional">Profissional</option>
            </select>
          </div>
        </div>

        <div className="secao-form">
          <span className="secao-titulo">Comunicação</span>
          <div className="campo">
            <label>Link do Grupo (WhatsApp / Telegram)</label>
            <div className="campo-explicacao" style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '8px' }}>
              🔒 Visível apenas para membros aprovados na equipe.
            </div>
            <div className="campo-valida">
              <span className="icone-input"><Link size={18} /></span>
              <input 
                type="url" 
                placeholder="https://chat.whatsapp.com/..." 
                value={form.link_grupo}
                onChange={(e) => handleMudanca('link_grupo', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="secao-form">
          <span className="secao-titulo">Sede da Equipe (Local de Jogo)</span>
          
          <div className="campo">
            <label>Nome do Local (Onde o time joga?)*</label>
            <div className="campo-valida">
              <span className="icone-input"><Building2 size={18} /></span>
              <input 
                type="text" 
                placeholder="Ex: Arena Soccer, Clube Recreativo..." 
                value={form.local_nome}
                onChange={(e) => handleMudanca('local_nome', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grupo-input">
            <label>CEP (Busca Automática)</label>
            <div className="grade-cep">
              <div className="campo-input" style={{ flex: 1, position: 'relative' }}>
                <span className="icone" style={{ position: 'absolute', left: '10px', top: '12px', color: '#64748b' }}><Search size={16} /></span>
                <input 
                  type="text"
                  value={form.local_cep} 
                  onChange={(e) => handleMudanca('local_cep', mascaraCep(e.target.value))}
                  placeholder="00000-000"
                  maxLength={9}
                  className="input-cep"
                />
              </div>
              <Botao type="button" onClick={buscarCep} disabled={buscandoCep} className="btn-busca-cep">
                <Search size={15} />
              </Botao>
            </div>
          </div>

        <div className="fila-campos">
          <div className="campo">
            <label>Rua / Logradouro</label>
            <div className="campo-valida">
              <span className="icone-input"><Home size={18} /></span>
              <input 
                type="text" 
                placeholder="Rua, Avenida..." 
                value={form.local_rua}
                onChange={(e) => handleMudanca('local_rua', e.target.value)}
              />
            </div>
          </div>
          <div className="campo campo-pequeno">
            <label>Número *</label>
            <div className="campo-valida">
              <span className="icone-input"><Hash size={18} /></span>
              <input 
                ref={campoNumeroRef}
                type="text" 
                placeholder="Ex: 123" 
                value={form.local_numero}
                onChange={(e) => handleMudanca('local_numero', e.target.value)}
                required
              />
            </div>
          </div>
          <div className="campo campo-medio">
            <label>Complemento</label>
            <div className="campo-valida">
              <span className="icone-input"><Building2 size={18} /></span>
              <input 
                type="text" 
                placeholder="Apto, Bloco..." 
                value={form.local_complemento}
                onChange={(e) => handleMudanca('local_complemento', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="fila-campos">
          <div className="campo">
            <label>Bairro</label>
            <div className="campo-valida">
              <span className="icone-input"><Map size={18} /></span>
              <input 
                type="text" 
                placeholder="Bairro..." 
                value={form.local_bairro}
                onChange={(e) => handleMudanca('local_bairro', e.target.value)}
              />
            </div>
          </div>
          <div className="campo campo-flex-2">
            <label>Cidade *</label>
            <div className="campo-valida">
              <span className="icone-input"><Building2 size={18} /></span>
              <input 
                type="text" 
                placeholder="Cidade..." 
                value={form.local_cidade}
                onChange={(e) => handleMudanca('local_cidade', e.target.value)}
                required
              />
            </div>
          </div>
          <div className="campo campo-pequeno">
            <label>UF *</label>
            <div className="campo-valida">
              <span className="icone-input"><Flag size={18} /></span>
              <input 
                type="text" 
                placeholder="UF" 
                value={form.local_estado}
                onChange={(e) => handleMudanca('local_estado', e.target.value.toUpperCase().slice(0,2))}
                required
                maxLength={2}
              />
            </div>
          </div>
        </div>

        <div className="campo">
          <label>Link do Google Maps / Waze</label>
          <div className="campo-valida">
            <span className="icone-input"><MapPin size={18} /></span>
            <input 
              type="url" 
              placeholder="https://maps.google.com/..." 
              value={form.local_mapa_link}
              onChange={(e) => handleMudanca('local_mapa_link', e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="campo">
          <label>Visibilidade (Matchmaking)</label>
          <div className="opcoes-visibilidade">
            <button 
              type="button" 
              className={`opcao ${form.visibilidade === 'publica' ? 'ativa' : ''}`}
              onClick={() => handleMudanca('visibilidade', 'publica')}
            >
              <Globe size={18} />
              <div>
                <strong>Pública</strong>
                <span>Aparece no buscador. Atletas podem pedir para entrar.</span>
              </div>
            </button>
            <button 
              type="button" 
              className={`opcao ${form.visibilidade === 'privada' ? 'ativa' : ''}`}
              onClick={() => handleMudanca('visibilidade', 'privada')}
            >
              <Lock size={18} />
              <div>
                <strong>Privada</strong>
                <span>Invísivel para outros. Apenas convite por link.</span>
              </div>
            </button>
          </div>
        </div>

        <div className="secao-form">
          <span className="secao-titulo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={18} /> Configurações de Módulos
          </span>
          
          <div className="campo-toggle-grupo">
            <div className="item-toggle">
              <div className="toggle-info">
                <div className="toggle-label-principal">
                  <DollarSign size={18} />
                  <strong>Controle Financeiro da Equipe</strong>
                </div>
                <p>Habilita gestão de mensalidades, rateio de custos de quadra e relatórios de fluxo de caixa.</p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={form.gestao_financeira} 
                  onChange={(e) => handleMudanca('gestao_financeira', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>

            {/* Campos Financeiros Adicionais quando habilitado */}
            {form.gestao_financeira && (
              <div className="campos-financeiros-adicionais anima-entrada">
                <div className="fila-campos">
                  <div className="campo">
                    <label>Mensalidade (R$)</label>
                    <div className="campo-valida">
                      <span className="icone-input"><DollarSign size={18} /></span>
                      <input 
                        type="number" 
                        placeholder="Ex: 50" 
                        value={form.mensalidade}
                        onChange={(e) => handleMudanca('mensalidade', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="campo">
                    <label>Dia Vencimento</label>
                    <div className="campo-valida">
                      <span className="icone-input"><Calendar size={18} /></span>
                      <input 
                        type="number" 
                        placeholder="Ex: 10" 
                        min="1" max="31"
                        value={form.vencimento_dia}
                        onChange={(e) => handleMudanca('vencimento_dia', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="fila-campos">
                  <div className="campo">
                    <label>Custo da Quadra (R$)</label>
                    <div className="campo-valida">
                      <span className="icone-input"><DollarSign size={18} /></span>
                      <input 
                        type="number" 
                        placeholder="Ex: 150" 
                        value={form.custo_quadra}
                        onChange={(e) => handleMudanca('custo_quadra', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="campo">
                    <label>Limite Pagamento (h)</label>
                    <div className="campo-valida">
                      <span className="icone-input"><Clock size={18} /></span>
                      <input 
                        type="number" 
                        placeholder="Ex: 24" 
                        value={form.horas_limite_pagamento}
                        onChange={(e) => handleMudanca('horas_limite_pagamento', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="campo">
                  <label>Chave PIX para Recebimento</label>
                  <div className="campo-valida">
                    <span className="icone-input"><CreditCard size={18} /></span>
                    <input 
                      type="text" 
                      placeholder="CPF, E-mail, Celular..." 
                      value={form.chave_pix}
                      onChange={(e) => handleMudanca('chave_pix', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="item-toggle">
              <div className="toggle-info">
                <div className="toggle-label-principal">
                  <Users size={18} />
                  <strong>Aceitando novos membros agora?</strong>
                </div>
                <p>Define se o botão "Solicitar Ingresso" ficará ativo para atletas que encontrarem seu time.</p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={form.aceitando_membros} 
                  onChange={(e) => handleMudanca('aceitando_membros', e.target.checked)}
                />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        </div>

        <div className="campo">
          <label>Observações</label>
          <textarea 
            placeholder="Regras, dia fixo de jogo, fale um pouco sobre sua equipe..." 
            value={form.observacoes}
            onChange={(e) => handleMudanca('observacoes', e.target.value)}
            rows="3"
          />
        </div>

        <div className="modal-acoes-form">
          <Botao variant="secundario" type="button" onClick={() => { limparForm(); onClose(); }} disabled={carregando}>
            Cancelar
          </Botao>
          <Botao type="submit" disabled={carregando || !form.nome || !form.modalidade}>
            {carregando ? (equipeParaEditar ? 'Salvando...' : 'Criando...') : (equipeParaEditar ? 'Salvar Alterações' : 'Criar Equipe')}
          </Botao>
        </div>
      </form>
    </Modal>
  );
};

export default ModalCriacaoEquipe;
