import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../servicos/supabase';
import { usarAutenticacao } from '../../contextos/AutenticacaoContexto';
import Botao from '../../componentes/Botao/Botao';
import Tooltip from '../../componentes/Tooltip/Tooltip';
import { User, Calendar, Mail, Phone, MapPin, Search, AlertCircle, CheckCircle2, ArrowLeft, Camera, Trophy, Plus, Trash2, Eye, EyeOff, HelpCircle } from 'lucide-react';
import './PaginaPerfil.css';

const GENEROS = ['Masculino', 'Feminino', 'Não-binário', 'Prefiro não informar'];

const calcularIdade = (dataNasc) => {
  if (!dataNasc) return null;
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
};

const mascaraCep = (valor) => {
  const nums = valor.replace(/\D/g, '').slice(0, 8);
  return nums.length > 5 ? `${nums.slice(0, 5)}-${nums.slice(5)}` : nums;
};

const mascaraTelefone = (valor) => {
  const nums = valor.replace(/\D/g, '').slice(0, 11);
  if (nums.length <= 2)  return `(${nums}`;
  if (nums.length <= 7)  return `(${nums.slice(0,2)}) ${nums.slice(2)}`;
  if (nums.length <= 11) return `(${nums.slice(0,2)}) ${nums.slice(2,7)}-${nums.slice(7)}`;
  return valor;
};

const PaginaPerfil = ({ aoVoltar }) => {
  const { dadosUsuario, recarregarUsuario } = usarAutenticacao();
  const [carregando, setCarregando] = useState(false);
  const [fazendoUpload, setFazendoUpload] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  
  // States para o Perfil Esportivo
  const [modalidades, setModalidades] = useState([]);
  const [carregandoModalidades, setCarregandoModalidades] = useState(true);
  const [novaModalidade, setNovaModalidade] = useState({ modalidade: '', posicao: '', nivel_habilidade: '' });
  const [adicionando, setAdicionando] = useState(false);

  const numeroRef = useRef(null);
  const nomeRef = useRef(null);

  const [form, setForm] = useState({
    nome_completo: '', apelido: '', data_nascimento: '', genero: '',
    telefone: '', cep: '', rua: '', numero: '', complemento: '',
    bairro: '', cidade: '', estado: '', perfil_publico: true,
    compartilhar_whatsapp_match: false
  });

  // Preenche o formulário com os dados carregados do Supabase
  useEffect(() => {
    if (dadosUsuario) {
      setForm({
        nome_completo: dadosUsuario.nome_completo || '',
        apelido: dadosUsuario.apelido || '',
        data_nascimento: dadosUsuario.data_nascimento || '',
        genero: dadosUsuario.genero || '',
        telefone: mascaraTelefone(dadosUsuario.telefone || ''),
        cep: mascaraCep(dadosUsuario.cep || ''),
        rua: dadosUsuario.rua || '',
        numero: dadosUsuario.numero || '',
        complemento: dadosUsuario.complemento || '',
        bairro: dadosUsuario.bairro || '',
        cidade: dadosUsuario.cidade || '',
        estado: dadosUsuario.estado || '',
        perfil_publico: dadosUsuario.perfil_publico ?? true,
        compartilhar_whatsapp_match: dadosUsuario.compartilhar_whatsapp_match ?? false
      });
      carregarModalidades(dadosUsuario.id);
    }
  }, [dadosUsuario]);

  // Foca no campo de nome ao carregar o perfil
  useEffect(() => {
    if (dadosUsuario) {
      setTimeout(() => nomeRef.current?.focus(), 200);
    }
  }, [dadosUsuario]);

  const carregarModalidades = async (userId) => {
    try {
      setCarregandoModalidades(true);
      const { data, error } = await supabase
        .from('jogador_modalidades')
        .select('*')
        .eq('usuario_id', userId)
        .order('criado_em', { ascending: false });
        
      if (error) throw error;
      setModalidades(data || []);
    } catch (err) {
      console.error('Erro ao buscar modalidades:', err);
    } finally {
      setCarregandoModalidades(false);
    }
  };

  const set = (campo) => (e) => {
    const novoValor = e.target.value;
    setForm(prev => {
      const novoForm = { ...prev, [campo]: novoValor };
      // Se mudou a data de nascimento, forçar privacidade para menores
      if (campo === 'data_nascimento') {
        const idade = calcularIdade(novoValor);
        if (idade !== null && idade < 18) {
          novoForm.perfil_publico = false;
          novoForm.compartilhar_whatsapp_match = false;
        }
      }
      return novoForm;
    });
  };

  const idadeAtual = calcularIdade(form.data_nascimento);
  const ehMenorDeIdade = idadeAtual !== null && idadeAtual < 18;

  // Busca automática do CEP quando atinge 8 dígitos
  useEffect(() => {
    const cepLimpo = form.cep.replace(/\D/g, '');
    if (cepLimpo.length === 8 && !buscandoCep) {
      buscarCep();
    }
  }, [form.cep]);

  const buscarCep = async () => {
    const cepLimpo = form.cep.replace(/\D/g, '');
    if (cepLimpo.length !== 8) return;
    
    setBuscandoCep(true);
    setMensagem({ tipo: '', texto: '' });
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (data.erro) {
        setMensagem({ tipo: 'erro', texto: 'CEP não encontrado.' });
      } else {
        setForm(prev => ({
          ...prev,
          rua: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
        }));
        // Foca automaticamente no campo número
        setTimeout(() => numeroRef.current?.focus(), 100);
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao buscar CEP. Verifique sua conexão.' });
    } finally {
      setBuscandoCep(false);
    }
  };

  const getCoordenadasPorCEPLocal = async (cep) => {
    if (!cep) return { lat: null, lon: null };
    try {
      const cepLimpo = cep.replace(/\D/g, '');
      if (cepLimpo.length !== 8) return { lat: null, lon: null };
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&postalcode=${cepLimpo}&country=Brazil&limit=1`, {
        headers: { 'Accept-Language': 'pt-BR' }
      });
      const data = await response.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      }
    } catch (error) {
      console.error('Erro ao buscar coordenadas:', error);
    }
    return { lat: null, lon: null };
  };

  const salvarPerfil = async (e) => {
    e.preventDefault();
    setMensagem({ tipo: '', texto: '' });
    setCarregando(true);

    try {
      // 0. Obter coordenadas antes de salvar
      const coords = await getCoordenadasPorCEPLocal(form.cep);

      const { error } = await supabase
        .from('usuarios')
        .update({
          nome_completo: form.nome_completo,
          apelido: form.apelido,
          data_nascimento: form.data_nascimento || null,
          genero: form.genero,
          telefone: form.telefone,
          cep: form.cep,
          rua: form.rua,
          numero: form.numero,
          complemento: form.complemento,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
          perfil_publico: form.perfil_publico,
          compartilhar_whatsapp_match: form.compartilhar_whatsapp_match,
          latitude: coords.lat,
          longitude: coords.lon
        })
        .eq('id', dadosUsuario.id);

      if (error) throw error;
      
      setMensagem({ tipo: 'sucesso', texto: 'Perfil atualizado com sucesso!' });
      if (recarregarUsuario) await recarregarUsuario();
      
    } catch (err) {
      console.error('Erro de Supabase:', err);
      // Se tiver details ou message, mostra na tela
      const msgErro = err.details || err.message || 'Erro desconhecido.';
      setMensagem({ tipo: 'erro', texto: `Erro ao salvar: ${msgErro}` });
    } finally {
      setCarregando(false);
    }
  };

  const adicionarModalidade = async () => {
    if (!novaModalidade.modalidade || !novaModalidade.nivel_habilidade) {
      setMensagem({ tipo: 'erro', texto: 'Preencha esporte e nível de habilidade.' });
      return;
    }

    try {
      setAdicionando(true);
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

      setMensagem({ tipo: 'sucesso', texto: 'Modalidade adicionada com sucesso!' });
      setNovaModalidade({ modalidade: '', posicao: '', nivel_habilidade: '' });
      carregarModalidades(dadosUsuario.id);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.message || 'Erro ao adicionar modalidade.' });
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
      setMensagem({ tipo: 'erro', texto: 'Erro ao remover modalidade.' });
    }
  };

  const uploadAvatar = async (evento) => {
    try {
      setFazendoUpload(true);
      setMensagem({ tipo: '', texto: '' });
      
      const arquivo = evento.target.files[0];
      if (!arquivo) return;

      if (arquivo.size > 2 * 1024 * 1024) {
        setMensagem({ tipo: 'erro', texto: 'A imagem deve ter no máximo 2MB.' });
        return;
      }

      const extensao = arquivo.name.split('.').pop();
      const caminho = `${dadosUsuario.id}/${Math.random()}.${extensao}`;

      const { error: uploadError } = await supabase.storage
        .from('avatares')
        .upload(caminho, arquivo);

      if (uploadError) throw uploadError;

      const { data: imgData } = supabase.storage
        .from('avatares')
        .getPublicUrl(caminho);

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ foto_url: imgData.publicUrl })
        .eq('id', dadosUsuario.id);

      if (updateError) throw updateError;

      if (recarregarUsuario) await recarregarUsuario();
      
      setMensagem({ tipo: 'sucesso', texto: 'Foto de perfil atualizada!' });
    } catch (err) {
      console.error('Erro de Supabase (Storage):', err);
      const msgErro = err.details || err.message || 'Erro desconhecido.';
      setMensagem({ tipo: 'erro', texto: `Erro ao enviar foto: ${msgErro}` });
    } finally {
      setFazendoUpload(false);
    }
  };

  if (!dadosUsuario) return <div>Carregando...</div>;

  return (
    <div className="perfil-container animacao-entrada">

      <div className="perfil-cabecalho">
        <h2>Meu Perfil</h2>
        <p>Gerencie suas informações pessoais e de contato.</p>
      </div>

      {mensagem.texto && (
        <div className={`mensagem-alerta ${mensagem.tipo}`}>
          {mensagem.tipo === 'sucesso' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{mensagem.texto}</span>
        </div>
      )}

      <form className="perfil-form" onSubmit={salvarPerfil}>
        <div className="perfil-cartao">
          <span className="cartao-titulo">Dados Pessoais</span>
          
          <div className="perfil-avatar-container">
            <div className="avatar-wrapper">
              {dadosUsuario?.foto_url ? (
                <img src={dadosUsuario.foto_url} alt="Avatar" className="avatar-img" />
              ) : (
                <div className="avatar-placeholder">{form.nome_completo.charAt(0).toUpperCase()}</div>
              )}
              <label htmlFor="upload-avatar" className="avatar-overlay" title="Alterar foto">
                <Camera size={20} />
                <input 
                  id="upload-avatar" 
                  type="file" 
                  accept="image/*" 
                  onChange={uploadAvatar} 
                  disabled={fazendoUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
            {fazendoUpload && <div className="avatar-loading">Enviando...</div>}
          </div>

          <div className="grupo-input longo" style={{ marginTop: '1rem' }}>
            <label>E-mail <Tooltip texto="Não é possível alterar o e-mail por aqui." /></label>
            <div className="campo-input desabilitado">
              <span className="icone"><Mail size={16} /></span>
              <input type="email" value={dadosUsuario.email} disabled />
            </div>
          </div>

          <div className="grade-2">
            <div className="grupo-input">
              <label>Nome completo *</label>
              <div className="campo-input">
                <span className="icone"><User size={16} /></span>
                <input 
                  ref={nomeRef}
                  required 
                  value={form.nome_completo} 
                  onChange={set('nome_completo')} 
                  placeholder="Seu nome completo"
                />
              </div>
            </div>
            <div className="grupo-input">
              <label>Apelido <Tooltip texto="Como você será chamado nas equipes" /></label>
              <div className="campo-input">
                <span className="icone"><User size={16} /></span>
                <input value={form.apelido} onChange={set('apelido')} />
              </div>
            </div>
          </div>

          <div className="grade-2">
            <div className="grupo-input">
              <label>Data de Nascimento *</label>
              <div className="campo-input">
                <span className="icone"><Calendar size={16} /></span>
                <input type="date" required value={form.data_nascimento} onChange={set('data_nascimento')} />
              </div>
            </div>
            <div className="grupo-input">
              <label>Gênero *</label>
              <div className="campo-input">
                <span className="icone"><User size={16} /></span>
                <select required value={form.genero} onChange={set('genero')}>
                  <option value="">Selecione...</option>
                  {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="grupo-input">
            <label>WhatsApp / Telefone <Tooltip texto="Seu número para ser contactado pela equipe" /></label>
            <div className="campo-input">
              <span className="icone"><Phone size={16} /></span>
              <input 
                type="tel"
                value={form.telefone}
                onChange={(e) => setForm(prev => ({ ...prev, telefone: mascaraTelefone(e.target.value) }))}
                maxLength={15}
              />
            </div>
          </div>

          <div className="grupo-checkbox">
            <label className="checkbox-label" style={{ opacity: ehMenorDeIdade ? 0.5 : 1, cursor: ehMenorDeIdade ? 'not-allowed' : 'pointer' }}>
              <input 
                type="checkbox" 
                checked={form.perfil_publico}
                onChange={(e) => !ehMenorDeIdade && setForm(prev => ({ ...prev, perfil_publico: e.target.checked }))}
                disabled={ehMenorDeIdade}
              />
              <span className="checkbox-texto">
                {form.perfil_publico ? <Eye size={18} color="#0ea5e9"/> : <EyeOff size={18} color="#64748b"/>}
                Visibilidade no Matchmaking
              </span>
              <Tooltip texto="Ativando esta opção, seu perfil aparecerá na busca de atletas e capitães de outras equipes poderão te encontrar." />
            </label>
          </div>

          <div className="grupo-checkbox">
            <label className="checkbox-label" style={{ opacity: ehMenorDeIdade ? 0.5 : 1, cursor: ehMenorDeIdade ? 'not-allowed' : 'pointer' }}>
              <input 
                type="checkbox" 
                checked={form.compartilhar_whatsapp_match}
                onChange={(e) => !ehMenorDeIdade && setForm(prev => ({ ...prev, compartilhar_whatsapp_match: e.target.checked }))}
                disabled={ehMenorDeIdade}
              />
              <span className="checkbox-texto">
                {form.compartilhar_whatsapp_match ? <Phone size={18} color="#22c55e"/> : <Phone size={18} color="#64748b"/>}
                Privacidade do WhatsApp
              </span>
              <Tooltip texto="Seu número só será exibido para jogadores que você também 'deu match' e que tenham mais de 18 anos." />
            </label>
          </div>

          {ehMenorDeIdade && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', fontSize: '0.82rem', color: '#fca5a5', marginTop: '4px' }}>
              🔒 Por segurança, perfil público e compartilhamento de WhatsApp são restritos para usuários menores de 18 anos.
            </div>
          )}
        </div>

        <div className="perfil-cartao">
          <span className="cartao-titulo">Endereço</span>
          
          <div className="grupo-input">
            <label>CEP *</label>
            <div className="grade-cep">
              <div className="campo-input">
                <span className="icone"><MapPin size={16} /></span>
                <input 
                  required
                  value={form.cep} 
                  onChange={(e) => setForm(prev => ({ ...prev, cep: mascaraCep(e.target.value) }))}
                  maxLength={9}
                />
              </div>
              <button type="button" className="btn-cep" onClick={buscarCep} disabled={buscandoCep}>
                <Search size={15} /> {buscandoCep ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
          </div>

          <div className="grupo-input">
            <label>Rua / Avenida *</label>
            <div className="campo-input">
              <span className="icone"><MapPin size={16} /></span>
              <input required value={form.rua} onChange={set('rua')} />
            </div>
          </div>

          <div className="grade-2">
            <div className="grupo-input">
              <label>Número *</label>
              <div className="campo-input">
                <span className="icone"><MapPin size={16} /></span>
                <input ref={numeroRef} required value={form.numero} onChange={set('numero')} />
              </div>
            </div>
            <div className="grupo-input">
              <label>Complemento</label>
              <div className="campo-input">
                <span className="icone"><MapPin size={16} /></span>
                <input value={form.complemento} onChange={set('complemento')} />
              </div>
            </div>
          </div>

          <div className="grade-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="grupo-input longo">
              <label>Bairro *</label>
              <div className="campo-input">
                <span className="icone"><MapPin size={16} /></span>
                <input required value={form.bairro} onChange={set('bairro')} />
              </div>
            </div>
          </div>
          
          <div className="auth-grade-uf">
            <div className="grupo-input">
              <label>Cidade *</label>
              <div className="campo-input">
                <span className="icone"><MapPin size={16} /></span>
                <input required value={form.cidade} onChange={set('cidade')} />
              </div>
            </div>
            <div className="grupo-input">
              <label>Estado *</label>
              <div className="campo-input">
                <span className="icone"><MapPin size={16} /></span>
                <input 
                  required 
                  value={form.estado} 
                  onChange={(e) => setForm(prev => ({ ...prev, estado: e.target.value.toUpperCase().slice(0, 2) }))}
                  maxLength={2} 
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rodape-form">
          <Botao type="submit" disabled={carregando}>
            {carregando ? 'Salvando...' : 'Salvar Alterações'}
          </Botao>
        </div>
      </form>
    </div>
  );
};

export default PaginaPerfil;
