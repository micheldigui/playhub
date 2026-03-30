import { useState, useEffect, useRef } from 'react';
import './PaginaAutenticacao.css';
import { supabase } from '../../servicos/supabase';
import {
  Mail, Lock, User, Eye, EyeOff,
  MapPin, Search, Phone, AlertCircle, Calendar
} from 'lucide-react';
import Botao from '../../componentes/Botao/Botao';
import Tooltip from '../../componentes/Tooltip/Tooltip';

const validarEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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

const PaginaCadastro = ({ aoIrParaLogin }) => {
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [erro, setErro] = useState('');
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  
  const numeroRef = useRef(null);
  const generoRef = useRef(null);

  const [form, setForm] = useState({
    nome_completo: '', apelido: '', data_nascimento: '', genero: '',
    email: '', telefone: '',
    cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    senha: '', confirmarSenha: '',
    perfil_publico: true,
  });

  const set = (campo) => (e) => setForm(prev => ({ ...prev, [campo]: e.target.value }));

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
    if (!validarEmail(form.email)) { setErro('Por favor, insira um e-mail válido.'); return; }
    if (form.senha.length < 6) { setErro('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (form.senha !== form.confirmarSenha) { setErro('As senhas não conferem.'); return; }

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
      <div className="auth-logo-wrap">
        <div className="auth-logo" style={{ background: 'transparent', boxShadow: 'none' }}>
          <img src="/icon_ph_oficial_cf.png" alt="PlayHub" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
        </div>
        <h2>Criar sua conta</h2>
        <p className="auth-subtitulo">Grátis para sempre · Leva menos de 2 minutos</p>
      </div>

      {erro && <div className="auth-erro"><AlertCircle size={15} /><span>{erro}</span></div>}

      <form onSubmit={handleCadastro} className="auth-form">

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
          <div className="auth-campo">
            <span className="auth-campo-icone"><User size={16} /></span>
            <input placeholder="Como aparecerá no seu perfil" value={form.nome_completo}
              onChange={set('nome_completo')} required tabIndex="2" />
          </div>
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
            <div className="auth-campo">
              <span className="auth-campo-icone"><Calendar size={16} /></span>
              <input type="date" value={form.data_nascimento}
                onChange={set('data_nascimento')} required tabIndex="4" />
            </div>
          </div>
          <div className="auth-grupo">
            <label>
              Gênero *
              <Tooltip texto="Usado para personalizar a experiência no app. Nenhuma informação é compartilhada com equipes." posicao="bottom" />
            </label>
            <div className="auth-campo">
              <span className="auth-campo-icone"><User size={16} /></span>
              <select ref={generoRef} value={form.genero} onChange={set('genero')} required tabIndex="5">
                <option value="">Selecione...</option>
                {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ── Contato ── */}
        <div className="auth-secao">
          <span className="auth-secao-titulo">Contato</span>
        </div>

        <div className="auth-grupo">
          <label>E-mail *</label>
          <div className="auth-campo">
            <span className="auth-campo-icone"><Mail size={16} /></span>
            <input type="email" placeholder="seu@email.com" value={form.email}
              onChange={set('email')} required autoComplete="email" tabIndex="6" />
          </div>
        </div>

        <div className="auth-grupo">
          <label>
            WhatsApp / Telefone
            <Tooltip texto="Seu número com DDD. Usado pelo administrador da equipe para envio de convites e comunicação do grupo." />
          </label>
          <div className="auth-campo">
            <span className="auth-campo-icone"><Phone size={16} /></span>
            <input
              type="tel"
              placeholder="(00) 00000-0000"
              value={form.telefone}
              onChange={(e) => setForm(prev => ({ ...prev, telefone: mascaraTelefone(e.target.value) }))}
              maxLength={15}
              tabIndex="7"
            />
          </div>
        <div className="auth-grupo">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Visibilidade do Perfil
            <Tooltip texto="Perfil público permite que capitães de outras equipes te encontrem. Perfil privado oculta você das buscas." />
          </label>
          <div className="auth-perfil-toggle-container" style={{ marginTop: '8px' }}>
            <label className="auth-toggle" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={form.perfil_publico} 
                onChange={(e) => setForm(prev => ({ ...prev, perfil_publico: e.target.checked }))}
                tabIndex="8"
                style={{ width: 'auto', margin: 0 }}
              />
              <span style={{ fontSize: '0.9rem', color: 'var(--texto-cor)' }}>
                {form.perfil_publico ? 'Perfil Público (Recomendado)' : 'Perfil Privado'}
              </span>
            </label>
          </div>
        </div>
        </div>

        {/* ── Endereço ── */}
        <div className="auth-secao">
          <span className="auth-secao-titulo">Endereço</span>
        </div>

        <div className="auth-grupo">
          <label>CEP *</label>
          <div className="auth-grade-cep">
            <div className="auth-campo">
              <span className="auth-campo-icone"><MapPin size={16} /></span>
              <input
                placeholder="00000-000"
                value={form.cep}
                onChange={(e) => setForm(prev => ({
                  ...prev,
                  cep: mascaraCep(e.target.value)
                }))}
                maxLength={9}
                required
                tabIndex="9"
              />
            </div>
            <button type="button" className="btn-buscar-cep" onClick={buscarCep} disabled={buscandoCep} tabIndex="-1">
              <Search size={15} />
              {buscandoCep ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </div>

        <div className="auth-grupo">
          <label>Rua / Avenida *</label>
          <div className="auth-campo">
            <span className="auth-campo-icone"><MapPin size={16} /></span>
            <input placeholder="Nome da rua ou avenida" value={form.rua}
              onChange={set('rua')} required tabIndex="-1" />
          </div>
        </div>

        <div className="auth-grade-2">
          <div className="auth-grupo">
            <label>Número *</label>
            <div className="auth-campo">
              <span className="auth-campo-icone"><MapPin size={16} /></span>
              <input ref={numeroRef} placeholder="Ex: 42" value={form.numero}
                onChange={set('numero')} required tabIndex="10" />
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
          <label>Bairro *</label>
          <div className="auth-campo">
            <span className="auth-campo-icone"><MapPin size={16} /></span>
            <input placeholder="Nome do bairro" value={form.bairro}
              onChange={set('bairro')} required tabIndex="-1" />
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

        {/* ── Segurança ── */}
        <div className="auth-secao">
          <span className="auth-secao-titulo">Segurança</span>
        </div>

        <div className="auth-grupo">
          <label>Senha * (mínimo 6 caracteres)</label>
          <div className="auth-campo">
            <span className="auth-campo-icone"><Lock size={16} /></span>
            <input type={mostrarSenha ? 'text' : 'password'} placeholder="••••••••"
              value={form.senha} onChange={set('senha')} required tabIndex="12" />
            <button type="button" className="btn-olho" onClick={() => setMostrarSenha(!mostrarSenha)} tabIndex="-1">
              {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="auth-grupo">
          <label>Confirme a senha *</label>
          <div className="auth-campo">
            <span className="auth-campo-icone"><Lock size={16} /></span>
            <input type={mostrarSenha ? 'text' : 'password'} placeholder="••••••••"
              value={form.confirmarSenha} onChange={set('confirmarSenha')} required tabIndex="13" />
          </div>
        </div>

        <Botao type="submit" fullWidth disabled={carregando} tabIndex="14">
          {carregando ? 'Criando conta...' : 'Criar conta grátis'}
        </Botao>
      </form>

      <p className="auth-link">
        Já tem conta? <button onClick={aoIrParaLogin} tabIndex="-1">Fazer login</button>
      </p>
    </div>
  );
};

export default PaginaCadastro;
