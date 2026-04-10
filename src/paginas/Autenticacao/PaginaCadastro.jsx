import { useState, useEffect, useRef } from 'react';
import './PaginaAutenticacao.css';
import { supabase } from '../../servicos/supabase';
import { rastrear } from '../../servicos/rastreamento';
import { AlertCircle, X } from 'lucide-react';

// Utilitários e Sub-componentes
import { validarEmail, calcularIdade } from './CadastroConstants';
import SecaoFotoCadastro from './componentes/SecaoFotoCadastro';
import SecaoDadosPessoais from './componentes/SecaoDadosPessoais';
import SecaoPrivacidadeContato from './componentes/SecaoPrivacidadeContato';
import SecaoEnderecoCadastro from './componentes/SecaoEnderecoCadastro';
import SecaoSegurancaCadastro from './componentes/SecaoSegurancaCadastro';

import Botao from '../../componentes/Botao/Botao';
import Modal from '../../componentes/Modal/Modal';
import { CONTEUDO_TERMOS, CONTEUDO_PRIVACIDADE } from '../Legal/PaginasLegais';

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
  
  const numeroRef = useRef(null);

  const [form, setForm] = useState({
    nome_completo: '', apelido: '', data_nascimento: '', genero: '',
    email: '', telefone: '',
    cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
    senha: '', confirmarSenha: '',
    perfil_publico: true,
    compartilhar_whatsapp_match: true,
  });

  // --- TELEMETRIA: Entrada na página ---
  useEffect(() => {
    rastrear.pagina('Cadastro');
  }, []);

  // Rastreamento de Modais Legais
  useEffect(() => {
    if (modalLegal.aberto && modalLegal.tipo) {
      rastrear.pagina(`Cadastro: Modal ${modalLegal.tipo === 'termos' ? 'Termos' : 'Privacidade'}`);
    }
  }, [modalLegal.aberto, modalLegal.tipo]);

  const idadeAtual = calcularIdade(form.data_nascimento);
  const ehMenorDeIdade = idadeAtual !== null && idadeAtual < 18;

  const set = (campo) => (e) => {
    const novoValor = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    
    setForm(prev => {
      const novoForm = { ...prev, [campo]: novoValor };
      
      // Lógica de Segurança Dinâmica: Reage a correções de idade
      if (campo === 'data_nascimento') {
        const idade = calcularIdade(novoValor);
        if (idade !== null) {
          if (idade < 18) {
            // Menor: Força privacidade total por segurança
            novoForm.perfil_publico = false;
            novoForm.compartilhar_whatsapp_match = false;
          } else {
            // Maior: Restaura o padrão de engajamento do app (Público)
            // Isso garante que se o usuário digitou errado e corrigiu, o app volta ao estado ideal.
            novoForm.perfil_publico = true;
            novoForm.compartilhar_whatsapp_match = true;
          }
        }
      }
      return novoForm;
    });

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
      if (telLimpo.length < 10) msgErro = 'WhatsApp inválido';
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

  // Busca automática do CEP
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
        setErro('CEP não encontrado.');
        rastrear.erro(`CEP não encontrado: ${cepLimpo}`, 'Cadastro.buscarCep');
      } else {
        setForm(prev => ({
          ...prev,
          rua: data.logradouro || '',
          bairro: data.bairro || '',
          cidade: data.localidade || '',
          estado: data.uf || '',
        }));
        setTimeout(() => numeroRef.current?.focus(), 150);
      }
    } catch (err) { 
        setErro('Erro ao buscar CEP.'); 
        rastrear.erro('Falha conexão ViaCEP', 'Cadastro.buscarCep', err);
    } finally { setBuscandoCep(false); }
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
      rastrear.clique('selecionou_foto_cadastro', `Arquivo: ${file.name}`);
    }
  };

  const handleCadastro = async (e) => {
    e.preventDefault();
    setErro('');
    rastrear.clique('tentativa_cadastro_final', `Email: ${form.email}`);

    // Validações básicas (simplificadas para o handler)
    if (!aceitouTermos) return;

    setCarregando(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.senha,
        options: { data: form }
      });
      if (authError) throw authError;

      const user = authData.user;
      
      rastrear.clique('cadastro_usuario_sucesso', 'Conversao de Registro Concluida', { user_id: user?.id });

      // Upload de Foto se houver
      if (user && foto) {
        rastrear.evento('iniciando_upload_foto_cadastro');
        const fileExt = foto.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatares')
          .upload(fileName, foto);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('avatares').getPublicUrl(fileName);
          await supabase.from('usuarios').update({ foto_url: publicUrl }).eq('id', user.id);
        }
      }

      rastrear.sucesso('cadastro_confortado', `Usuário criado: ${form.email}`);
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setErro('Este e-mail já está cadastrado. Faça login.');
      } else {
        setErro('Erro ao criar conta. Tente novamente.');
      }
      rastrear.erro(`Falha no cadastro: ${err.message}`, 'Cadastro.handleCadastro', err);
    } finally { setCarregando(false); }
  };

  return (
    <div className="auth-cartao">
      <div className="auth-header">
        {aoVoltar && (
          <button type="button" className="btn-fechar-auth" onClick={aoVoltar} title="Voltar">
            <X size={20} />
          </button>
        )}
        <div className="auth-logo-wrap">
          <div className="auth-logo" style={{ background: 'transparent', boxShadow: 'none' }}>
            <img src="/icon_ph_oficial_cf.png" alt="PlayHub" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <h2>Criar sua conta</h2>
          <p className="auth-subtitulo">Grátis para sempre · Leva menos de 2 minutos</p>
        </div>
      </div>

      <div className="auth-body">
        {erro && <div className="auth-erro"><AlertCircle size={15} /><span>{erro}</span></div>}
        
        <form id="form-cadastro" onSubmit={handleCadastro} className="auth-form">
          
          <SecaoFotoCadastro 
            fotoPreview={fotoPreview} 
            handleFotoChange={handleFotoChange} 
          />

          <SecaoDadosPessoais 
            form={form} 
            set={set} 
            erros={erros} 
            validarCampo={validarCampo} 
            ehMenorDeIdade={ehMenorDeIdade} 
          />

          <SecaoPrivacidadeContato 
            form={form} 
            setForm={setForm}
            set={set} 
            erros={erros} 
            validarCampo={validarCampo} 
            ehMenorDeIdade={ehMenorDeIdade}
          />

          <SecaoEnderecoCadastro 
            form={form} 
            setForm={setForm} 
            set={set} 
            erros={erros} 
            buscandoCep={buscandoCep} 
            buscarCep={buscarCep} 
            numeroRef={numeroRef} 
          />

          <SecaoSegurancaCadastro 
            form={form} 
            set={set} 
            erros={erros} 
            validarCampo={validarCampo} 
            mostrarSenha={mostrarSenha} 
            setMostrarSenha={setMostrarSenha}
            aceitouTermos={aceitouTermos} 
            setAceitouTermos={setAceitouTermos} 
            setModalLegal={setModalLegal}
            carregando={carregando}
          />

          <p className="auth-link" style={{ marginTop: '1.5rem', marginBottom: '1rem' }}>
            Já tem conta? <button type="button" onClick={() => {
               rastrear.clique('nav_login_desde_cadastro', 'Voltou para o login');
               aoIrParaLogin();
            }}>Fazer login</button>
          </p>

        </form>
      </div>

      {/* MODAL LEGAL (Reutilizável) */}
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
        <div className="conteudo-legal-modal" style={{ color: '#cbd5e1', lineHeight: '1.7', fontSize: '0.95rem', textAlign: 'left' }}>
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
