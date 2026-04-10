import { useState, useEffect, useRef } from 'react';
import './PaginaAutenticacao.css';
import { supabase } from '../../servicos/supabase';
import {
  Mail, Lock, User, Eye, EyeOff,
  MapPin, Search, Phone, AlertCircle, Calendar, HelpCircle, X
} from 'lucide-react';
import Botao from '../../componentes/Botao/Botao';
import Tooltip from '../../componentes/Tooltip/Tooltip';
import Modal from '../../componentes/Modal/Modal';
import { CONTEUDO_TERMOS, CONTEUDO_PRIVACIDADE } from '../Legal/PaginasLegais';
import { rastrear } from '../../servicos/rastreamento';

const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const calcularIdade = (dataNasc) => {
  if (!dataNasc) return null;
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
};

const GENEROS = ['Masculino', 'Feminino', 'Não-binário', 'Prefiro não informar'];

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

const PaginaCadastro = ({ aoIrParaLogin, aoVoltar }) => {
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erro, setErro] = useState('');
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [modalLegal, setModalLegal] = useState({ aberto: false, tipo: null });
  const [erros, setErros] = useState({});
  
  // Rastreamento de Modais Legais no Cadastro
  useEffect(() => {
    if (modalLegal.aberto && modalLegal.tipo) {
      rastrear.pagina(`Cadastro: Modal ${modalLegal.tipo === 'termos' ? 'Termos' : 'Privacidade'}`);
    }
  }, [modalLegal.aberto, modalLegal.tipo]);

  const numeroRef = useRef(null);
  const generoRef = useRef(null);

  const [form, setForm] = useState({
    nome_completo: '', apelido: '', data_nascimento: '', genero: '',
    email: '', telefone: '',
    cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    senha: '', confirmarSenha: '',
    perfil_publico: true,
    compartilhar_whatsapp_match: true,
  });

  const idadeAtual = calcularIdade(form.data_nascimento);
  const ehMenorDeIdade = idadeAtual !== null && idadeAtual < 18;

  const set = (campo) => (e) => {
    const novoValor = e.target.value;
    setForm(prev => {
      const novoForm = { ...prev, [campo]: novoValor };
      // Se mudou a data de nascimento, ajustar privacidade
      if (campo === 'data_nascimento') {
        const idade = calcularIdade(novoValor);
        if (idade !== null) {
          if (idade < 18) {
            // Menores: Sempre privado por segurança
            novoForm.perfil_publico = false;
            novoForm.compartilhar_whatsapp_match = false;
          } else {
            // Maiores: Sugerimos público para facilitar encontrar equipes, 
            // mas o usuário tem liberdade para mudar.
            novoForm.perfil_publico = true;
            novoForm.compartilhar_whatsapp_match = true;
          }
        }
      }
      return novoForm;
    });

    // Limpa o erro do campo ao começar a digitar
    if (erros[campo]) {
      setErros(prev => {
        const novos = { ...prev };
        delete novos[campo];
        return novos;
      });
    }
  };

  const validarCampo = (campo, valor) => {
    let msgErro = '';
    
    if (campo === 'nome_completo') {
      const nomeTrim = valor.trim();
      if (!nomeTrim) msgErro = 'Informe seu nome completo';
      else if (nomeTrim.split(/\s+/).length < 2) msgErro = 'Insira nome e sobrenome';
    } else if (campo === 'email') {
      if (!validarEmail(valor)) msgErro = 'E-mail inválido';
    } else if (campo === 'data_nascimento') {
      if (!valor) msgErro = 'Informe sua data de nascimento';
    } else if (campo === 'telefone') {
      const telLimpo = valor.replace(/\D/g, '');
      if (telLimpo.length < 10) msgErro = 'WhatsApp inválido (mínimo 10 dígitos)';
    } else if (campo === 'genero') {
      if (!valor) msgErro = 'Selecione seu gênero';
    } else if (campo === 'senha') {
      if (valor.length < 6) msgErro = 'Mínimo de 6 caracteres';
    } else if (campo === 'confirmarSenha') {
      if (valor !== form.senha) msgErro = 'As senhas não conferem';
    }

    setErros(prev => {
      const novos = { ...prev };
      if (msgErro) novos[campo] = msgErro;
      else delete novos[campo];
      return novos;
    });
  };

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
    setErro('');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await res.json();
      if (data.erro) {
        setErro('CEP não encontrado. Verifique e tente novamente.');
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
    } catch { setErro('Erro ao buscar CEP. Verifique sua conexão.'); }
    finally { setBuscandoCep(false); }
  };

  const handleFotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErro('A foto deve ter no máximo 2MB.');
        return;
      }
      setFoto(file);
      const reader = new FileReader();
      reader.onloadend = () => setFotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCadastro = async (e) => {
    e.preventDefault();
    setErro('');
    const adicionarErro = (campo, msg) => {
        setErros(prev => ({ ...prev, [campo]: msg }));
    };

    if (!validarEmail(form.email)) { 
        setErro('Existem campos com erros no seu cadastro.'); 
        adicionarErro('email', 'E-mail inválido'); 
        return; 
    }
    const nomeTrim = form.nome_completo.trim();
    if (!nomeTrim) { 
        setErro('Existem campos com erros no seu cadastro.'); 
        adicionarErro('nome_completo', 'Informe seu nome completo'); 
        return; 
    }
    if (nomeTrim.split(/\s+/).length < 2) { 
        setErro('Existem campos com erros no seu cadastro.'); 
        adicionarErro('nome_completo', 'Insira nome e sobrenome');
        return; 
    }
    if (!form.data_nascimento) { 
        setErro('Existem campos com erros no seu cadastro.'); 
        adicionarErro('data_nascimento', 'Campo obrigatório'); 
        return; 
    }
    if (!form.genero) { 
        setErro('Existem campos com erros no seu cadastro.'); 
        adicionarErro('genero', 'Selecione uma opção'); 
        return; 
    }
    const telLimpo = form.telefone.replace(/\D/g, '');
    if (telLimpo.length < 10) { 
        setErro('Existem campos com erros no seu cadastro.'); 
        adicionarErro('telefone', 'Mínimo 10 dígitos'); 
        return; 
    }
    if (!form.cidade.trim()) { 
        setErro('Existem campos com erros no seu cadastro.'); 
        adicionarErro('cep', 'Informe um CEP válido'); 
        return; 
    }
    if (form.senha.length < 6) { 
        setErro('Existem campos com erros no seu cadastro.'); 
        adicionarErro('senha', 'Mínimo 6 caracteres'); 
        return; 
    }
    if (form.senha !== form.confirmarSenha) { 
        setErro('As senhas não conferem.'); 
        adicionarErro('confirmarSenha', 'Senhas diferentes'); 
        return; 
    }

    setCarregando(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.senha,
        options: { data: form }
      });
      if (authError) throw authError;

      const user = authData.user;
      if (user && foto) {
        const fileExt = foto.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatares')
          .upload(fileName, foto);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatares')
            .getPublicUrl(fileName);

          await supabase
            .from('usuarios')
            .update({ foto_url: publicUrl })
            .eq('id', user.id);
        }
      }
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setErro('Este e-mail já está cadastrado. Faça login.');
      } else {
        setErro('Erro ao criar conta. Verifique os dados e tente novamente.');
      }
    } finally { setCarregando(false); }
  };

  return (
    <div className="auth-cartao">
      <div className="auth-header">
        {aoVoltar && (
          <button 
            type="button" 
            className="btn-fechar-auth" 
            onClick={aoVoltar} 
            title="Voltar para o Início"
            style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', zIndex: 10 }}
          >
            <X size={20} />
          </button>
        )}
        <div className="auth-logo-wrap">
          <div className="auth-logo" style={{ background: 'transparent', boxShadow: 'none' }}>
            <img src="/icon_ph_oficial_cf.png" alt="PlayHub" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
          </div>
          <h2>Criar sua conta</h2>
          <p className="auth-subtitulo">Grátis para sempre · Leva menos de 2 minutos</p>
        </div>
      </div>

      <div className="auth-body">
        {erro && <div className="auth-erro"><AlertCircle size={15} /><span>{erro}</span></div>}
        
        <form id="form-cadastro" onSubmit={handleCadastro} className="auth-form">

        <div className="auth-secao">
          <span className="auth-secao-titulo">Dados Pessoais</span>
        </div>

        <div className="auth-foto-registro">
          <label className="auth-foto-label">Foto do Perfil</label>
          <div className="auth-foto-preview" onClick={() => document.getElementById('foto-input').click()}>
            {fotoPreview ? (
              <img src={fotoPreview} alt="Preview" />
            ) : (
              <div className="auth-foto-placeholder">
                <User size={40} />
                <span>Escolher Foto</span>
              </div>
            )}
          </div>
          <input 
            id="foto-input"
            type="file" 
            accept="image/*" 
            onChange={handleFotoChange} 
            style={{ display: 'none' }}
            tabIndex="1"
          />
        </div>

        <div className="auth-grupo">
          <label>Nome completo *</label>
          <div className={`auth-campo ${erros.nome_completo ? 'campo-com-erro' : ''}`}>
            <span className="auth-campo-icone"><User size={16} /></span>
            <input 
              placeholder="Digite seu Nome e Sobrenome" 
              value={form.nome_completo}
              onChange={set('nome_completo')} 
              onBlur={(e) => validarCampo('nome_completo', e.target.value)}
              required 
              tabIndex="2" 
            />
          </div>
          {erros.nome_completo && (
            <span className="msg-erro-campo"><AlertCircle size={12} /> {erros.nome_completo}</span>
          )}
        </div>

        <div className="auth-grupo">
          <label>
            Apelido
            <Tooltip texto="Como você quer ser chamado dentro das equipes. Se vazio, usaremos seu primeiro nome." />
          </label>
          <div className="auth-campo">
            <span className="auth-campo-icone"><User size={16} /></span>
            <input placeholder="Como quer ser chamado na equipe" value={form.apelido}
              onChange={set('apelido')} tabIndex="3" />
          </div>
        </div>

        <div className="auth-grade-2">
          <div className="auth-grupo">
            <label>Data de Nascimento *</label>
            <div className={`auth-campo ${erros.data_nascimento ? 'campo-com-erro' : ''}`}>
              <span className="auth-campo-icone"><Calendar size={16} /></span>
              <input 
                type="date" 
                value={form.data_nascimento}
                onChange={set('data_nascimento')} 
                onBlur={(e) => validarCampo('data_nascimento', e.target.value)}
                required 
                tabIndex="4" 
              />
            </div>
            {erros.data_nascimento && (
              <span className="msg-erro-campo"><AlertCircle size={12} /> {erros.data_nascimento}</span>
            )}
          </div>
          <div className="auth-grupo">
            <label>
              Gênero *
              <Tooltip texto="Usado para personalizar a experiência no app. Nenhuma informação é compartilhada com equipes." posicao="bottom" />
            </label>
            <div className={`auth-campo ${erros.genero ? 'campo-com-erro' : ''}`}>
              <span className="auth-campo-icone"><User size={16} /></span>
              <select 
                ref={generoRef} 
                value={form.genero} 
                onChange={set('genero')} 
                onBlur={(e) => validarCampo('genero', e.target.value)}
                required 
                tabIndex="5"
              >
                <option value="">Selecione...</option>
                {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            {erros.genero && (
              <span className="msg-erro-campo"><AlertCircle size={12} /> {erros.genero}</span>
            )}
          </div>
        </div>

        {/* ── Contato ── */}
        <div className="auth-secao">
          <span className="auth-secao-titulo">Contato</span>
        </div>

        <div className="auth-grupo">
          <label>E-mail *</label>
          <div className={`auth-campo ${erros.email ? 'campo-com-erro' : ''}`}>
            <span className="auth-campo-icone"><Mail size={16} /></span>
            <input 
              type="email" 
              placeholder="seu@email.com" 
              value={form.email}
              onChange={set('email')} 
              onBlur={(e) => validarCampo('email', e.target.value)}
              required 
              autoComplete="email" 
              tabIndex="6" 
            />
          </div>
          {erros.email && (
            <span className="msg-erro-campo"><AlertCircle size={12} /> {erros.email}</span>
          )}
        </div>

        <div className="auth-grupo">
          <label>
            WhatsApp / Telefone *
            <Tooltip texto="Obrigatório. Usado pelo administrador da equipe para convites e comunicação." />
          </label>
          <div className={`auth-campo ${erros.telefone ? 'campo-com-erro' : ''}`}>
            <span className="auth-campo-icone"><Phone size={16} /></span>
            <input
              type="tel"
              placeholder="(00) 00000-0000"
              value={form.telefone}
              onChange={(e) => {
                const val = mascaraTelefone(e.target.value);
                setForm(prev => ({ ...prev, telefone: val }));
                if (erros['telefone']) {
                  setErros(prev => {
                    const novos = { ...prev };
                    delete novos['telefone'];
                    return novos;
                  });
                }
              }}
              onBlur={(e) => validarCampo('telefone', e.target.value)}
              maxLength={15}
              required
              tabIndex="7"
            />
          </div>
          {erros.telefone && (
            <span className="msg-erro-campo"><AlertCircle size={12} /> {erros.telefone}</span>
          )}
        </div>

        <div className="auth-grupo">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Quem pode ver meu perfil?
            <Tooltip texto="Ativando, capitães de outras equipes podem te encontrar na busca de atletas. Recomendado para quem busca novos times!" />
          </label>
          {ehMenorDeIdade && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', marginTop: '8px', fontSize: '0.8rem', color: '#fca5a5' }}>
              🔒 Opções obrigatórias para menores de 18 anos.
            </div>
          )}
          <div className="auth-perfil-toggle-container" style={{ marginTop: '8px', opacity: ehMenorDeIdade ? 0.4 : 1 }}>
            <label className="auth-toggle" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: ehMenorDeIdade ? 'not-allowed' : 'pointer' }}>
              <input 
                type="checkbox" 
                checked={form.perfil_publico} 
                onChange={(e) => !ehMenorDeIdade && setForm(prev => ({ ...prev, perfil_publico: e.target.checked }))}
                disabled={ehMenorDeIdade}
                tabIndex="8"
                style={{ width: 'auto', margin: 0 }}
              />
              <span style={{ fontSize: '0.9rem', color: 'var(--texto-cor)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {form.perfil_publico ? <Eye size={16} color="#0ea5e9" /> : <EyeOff size={16} color="#64748b" />}
                {form.perfil_publico ? 'Perfil Aberto (Recomendado)' : 'Perfil Privado'}
              </span>
            </label>
          </div>
        </div>

        <div className="auth-grupo">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Privacidade do Número
            <Tooltip texto="Seu WhatsApp só aparecerá após você e o capitão demonstrarem interesse mútuo (Match)." />
          </label>
          <div className="auth-perfil-toggle-container" style={{ marginTop: '8px', opacity: ehMenorDeIdade ? 0.4 : 1 }}>
            <label className="auth-toggle" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: ehMenorDeIdade ? 'not-allowed' : 'pointer' }}>
              <input 
                type="checkbox" 
                checked={form.compartilhar_whatsapp_match} 
                onChange={(e) => !ehMenorDeIdade && setForm(prev => ({ ...prev, compartilhar_whatsapp_match: e.target.checked }))}
                disabled={ehMenorDeIdade}
                tabIndex="8"
                style={{ width: 'auto', margin: 0 }}
              />
              <span style={{ fontSize: '0.9rem', color: 'var(--texto-cor)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {form.compartilhar_whatsapp_match ? <Phone size={16} color="#22c55e" /> : <Phone size={16} color="#64748b" />}
                {form.compartilhar_whatsapp_match ? 'Autorizar WhatsApp no Match' : 'Não compartilhar número'}
              </span>
            </label>
          </div>
        </div>

        {/* ── Endereço ── */}
        <div className="auth-secao">
          <span className="auth-secao-titulo">Endereço</span>
        </div>

        <div className="auth-grupo">
          <label>
            CEP
            <Tooltip texto="Preencha o CEP para preenchimento automático da cidade e estado." />
          </label>
          <div className="auth-grade-cep">
            <div className={`auth-campo ${erros.cep ? 'campo-com-erro' : ''}`}>
            <span className="auth-campo-icone"><MapPin size={16} /></span>
            <input
              placeholder="00000-000"
              value={form.cep}
              onChange={(e) => {
                const val = mascaraCep(e.target.value);
                setForm(prev => ({ ...prev, cep: val }));
                if (erros['cep']) {
                    setErros(prev => {
                      const novos = { ...prev };
                      delete novos['cep'];
                      return novos;
                    });
                  }
              }}
              maxLength={9}
              tabIndex="9"
            />
          </div>
          {erros.cep && (
            <span className="msg-erro-campo"><AlertCircle size={12} /> {erros.cep}</span>
          )}
            <button type="button" className="btn-buscar-cep" onClick={buscarCep} disabled={buscandoCep} tabIndex="-1">
              <Search size={15} />
              {buscandoCep ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>

        <div className="auth-grupo">
          <label>Rua / Avenida</label>
          <div className="auth-campo">
            <span className="auth-campo-icone"><MapPin size={16} /></span>
            <input placeholder="Nome da rua ou avenida" value={form.rua}
              onChange={set('rua')} tabIndex="-1" />
          </div>
        </div>

        <div className="auth-grade-2">
          <div className="auth-grupo">
            <label>Número</label>
            <div className="auth-campo">
              <span className="auth-campo-icone"><MapPin size={16} /></span>
              <input ref={numeroRef} placeholder="Ex: 42" value={form.numero}
                onChange={set('numero')} tabIndex="10" />
            </div>
          </div>
          <div className="auth-grupo">
            <label>Complemento</label>
            <div className="auth-campo">
              <span className="auth-campo-icone"><MapPin size={16} /></span>
              <input placeholder="Apto, Bloco..." value={form.complemento}
                onChange={set('complemento')} tabIndex="11" />
            </div>
          </div>
        </div>

        <div className="auth-grupo">
          <label>Bairro</label>
          <div className="auth-campo">
            <span className="auth-campo-icone"><MapPin size={16} /></span>
            <input placeholder="Nome do bairro" value={form.bairro}
              onChange={set('bairro')} tabIndex="-1" />
          </div>
        </div>

        <div className="auth-grade-uf">
          <div className="auth-grupo">
            <label>Cidade *</label>
            <div className="auth-campo">
              <span className="auth-campo-icone"><MapPin size={16} /></span>
              <input placeholder="Sua cidade" value={form.cidade}
                onChange={set('cidade')} required tabIndex="-1" />
            </div>
          </div>
          <div className="auth-grupo">
            <label>Estado *</label>
            <div className="auth-campo">
              <span className="auth-campo-icone"><MapPin size={16} /></span>
              <input placeholder="UF" value={form.estado}
                onChange={(e) => setForm(prev => ({ ...prev, estado: e.target.value.toUpperCase().slice(0, 2) }))}
                maxLength={2} required tabIndex="-1" />
            </div>
          </div>
        </div>
        <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '-0.5rem' }}>
          💡 Preencha o CEP acima para preenchimento automático de cidade e estado.
        </p>

        {/* ── Segurança ── */}
        <div className="auth-secao">
          <span className="auth-secao-titulo">Segurança</span>
        </div>

        <div className="auth-grupo">
          <label>Senha * (mínimo 6 caracteres)</label>
          <div className={`auth-campo ${erros.senha ? 'campo-com-erro' : ''}`}>
            <span className="auth-campo-icone"><Lock size={16} /></span>
            <input 
              type={mostrarSenha ? 'text' : 'password'} 
              placeholder="••••••••"
              value={form.senha} 
              onChange={set('senha')} 
              onBlur={(e) => validarCampo('senha', e.target.value)}
              required 
              tabIndex="12" 
            />
            <button type="button" className="btn-olho" onClick={() => setMostrarSenha(!mostrarSenha)} tabIndex="-1">
              {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {erros.senha && (
            <span className="msg-erro-campo"><AlertCircle size={12} /> {erros.senha}</span>
          )}
        </div>

        <div className="auth-grupo">
          <label>Confirme a senha *</label>
          <div className={`auth-campo ${erros.confirmarSenha ? 'campo-com-erro' : ''}`}>
            <span className="auth-campo-icone"><Lock size={16} /></span>
            <input 
              type={mostrarSenha ? 'text' : 'password'} 
              placeholder="••••••••"
              value={form.confirmarSenha} 
              onChange={set('confirmarSenha')} 
              onBlur={(e) => validarCampo('confirmarSenha', e.target.value)}
              required 
              tabIndex="13" 
            />
          </div>
          {erros.confirmarSenha && (
            <span className="msg-erro-campo"><AlertCircle size={12} /> {erros.confirmarSenha}</span>
          )}
        </div>

        <div className="auth-acoes-form">
          <div className="auth-grupo" style={{ marginBottom: '1.25rem' }}>
            <label className="auth-toggle" style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={aceitouTermos} 
                onChange={(e) => setAceitouTermos(e.target.checked)}
                required
                style={{ width: '18px', height: '18px', marginTop: '2px' }}
              />
              <span style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: '1.5' }}>
                Li e concordo com os{' '}
                <button 
                  type="button" 
                  onClick={() => setModalLegal({ aberto: true, tipo: 'termos' })}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', padding: 0, font: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Termos de Uso
                </button>
                {' '}e a{' '}
                <button 
                  type="button" 
                  onClick={() => setModalLegal({ aberto: true, tipo: 'privacidade' })}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', padding: 0, font: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Política de Privacidade
                </button>
                {' '}do PlayHub. *
              </span>
            </label>
          </div>

          <Botao type="submit" disabled={carregando || !aceitouTermos} tabIndex="14">
            {carregando ? 'Criando conta...' : 'Criar conta grátis'}
          </Botao>

          <p className="auth-link" style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
            Já tem conta? <button onClick={aoIrParaLogin} tabIndex="-1">Fazer login</button>
          </p>
        </div>

        </form>
      </div>

      <Modal 
        isOpen={modalLegal.aberto} 
        onClose={() => setModalLegal({ ...modalLegal, aberto: false })}
        title={modalLegal.tipo === 'termos' ? 'Termos de Uso' : 'Política de Privacidade'}
        maxWidth="700px"
        footer={(
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <Botao onClick={() => {
              rastrear.clique(`btn_aceitar_${modalLegal.tipo}`, `Aceitou ${modalLegal.tipo} no cadastro`);
              setAceitouTermos(true);
              setModalLegal({ ...modalLegal, aberto: false });
            }}>
              Entendido e Aceito
            </Botao>
          </div>
        )}
      >
        <div className="conteudo-legal-modal" style={{ 
          color: '#cbd5e1', lineHeight: '1.7', fontSize: '0.95rem',
          textAlign: 'left'
        }}>
          {modalLegal.tipo === 'termos' ? CONTEUDO_TERMOS : CONTEUDO_PRIVACIDADE}
        </div>
        <style>{`
          .conteudo-legal-modal h2 { color: #f8fafc; font-size: 1.2rem; margin: 1.5rem 0 0.8rem 0; font-weight: 700; text-align: center; }
          .conteudo-legal-modal p { margin-bottom: 1rem; }
          .conteudo-legal-modal ul { margin-bottom: 1.5rem; padding-left: 1.2rem; }
          .conteudo-legal-modal li { margin-bottom: 0.5rem; }
        `}</style>
      </Modal>
    </div>
  );
};

export default PaginaCadastro;
