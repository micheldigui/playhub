import { useState, useEffect } from 'react';
import './PaginaAutenticacao.css';
import { supabase } from '../../servicos/supabase';
import { rastrear } from '../../servicos/rastreamento';
import { Mail, Lock, Eye, EyeOff, AlertCircle, X, CheckCircle2 } from 'lucide-react';
import Botao from '../../componentes/Botao/Botao';

const PaginaLogin = ({ aoIrParaCadastro, aoVoltar }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  // --- TELEMETRIA: Entrada na página ---
  useEffect(() => {
    rastrear.pagina('Login');
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setSucesso('');
    setCarregando(true);
    
    // Rastrear tentativa
    rastrear.clique('tentativa_login', `Usuário tentou logar com e-mail: ${email}`);

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;

      // Rastrear sucesso
      rastrear.clique('login_sucesso', `Sucesso na autenticação: ${email}`);
    } catch (err) {
      const msgErro = 'E-mail ou senha inválidos. Verifique e tente novamente.';
      setErro(msgErro);
      
      // Rastrear erro técnico para auditoria
      rastrear.erro(`Falha no login (${email}): ${err.message}`, 'Login.handleLogin', err);
    } finally {
      setCarregando(false);
    }
  };

  const handleRecuperarSenha = async () => {
    const emailLimpo = email.trim();
    setErro('');
    setSucesso('');

    if (!emailLimpo) {
      setErro('Informe seu e-mail para receber o link de recuperação.');
      return;
    }

    setCarregando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailLimpo, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) throw error;

      setSucesso('Pronto! Se esse e-mail estiver cadastrado, enviamos um link para redefinir sua senha. Confira sua caixa de entrada e procure por um e-mail de redefinição de senha. Se não encontrar em alguns minutos, veja também o spam ou lixo eletrônico.');
      rastrear.clique('recuperacao_senha_solicitada', `Recuperacao de senha solicitada para: ${emailLimpo}`);
    } catch (err) {
      setErro('Não foi possível enviar o link agora. Verifique o e-mail e tente novamente.');
      rastrear.erro(`Falha ao solicitar recuperacao de senha (${emailLimpo}): ${err.message}`, 'Login.handleRecuperarSenha', err);
    } finally {
      setCarregando(false);
    }
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
          <h2>Bem-vindo de volta!</h2>
          <p className="auth-subtitulo">Acesse sua conta PlayHub</p>
        </div>
      </div>

      <div className="auth-body">
        {erro && (
          <div className="auth-erro">
            <AlertCircle size={16} />
            <span>{erro}</span>
          </div>
        )}

        {sucesso && (
          <div className="auth-sucesso">
            <CheckCircle2 size={16} />
            <span>{sucesso}</span>
          </div>
        )}

        <form id="form-login" onSubmit={handleLogin} className="auth-form">
          <div className="auth-grupo">
            <label>E-mail</label>
            <div className="auth-campo">
              <span className="auth-campo-icone"><Mail size={16} /></span>
              <input 
                type="email" 
                placeholder="seu@email.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)} 
                required 
                autoComplete="email" 
                autoFocus 
              />
            </div>
          </div>

          <div className="auth-grupo">
            <div className="auth-label-linha">
              <label>Senha</label>
              <button type="button" onClick={handleRecuperarSenha} disabled={carregando}>
                Esqueci minha senha
              </button>
            </div>
            <div className="auth-campo">
              <span className="auth-campo-icone"><Lock size={16} /></span>
              <input 
                type={mostrarSenha ? 'text' : 'password'} 
                placeholder="••••••••"
                value={senha} 
                onChange={(e) => setSenha(e.target.value)}
                required 
                autoComplete="current-password" 
              />
              <button 
                type="button" 
                className="btn-olho" 
                onClick={() => {
                  setMostrarSenha(!mostrarSenha);
                  rastrear.clique('toggle_senha_login', 'Alternou visibilidade da senha no login');
                }}
              >
                {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="auth-acoes-form">
            <Botao type="submit" disabled={carregando}>
              {carregando ? 'Entrando...' : 'Entrar na conta'}
            </Botao>

            <p className="auth-link" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
              Não tem conta? <button type="button" onClick={() => {
                rastrear.clique('nav_cadastro', 'Clicou para ir ao cadastro');
                aoIrParaCadastro();
              }}>Cadastre-se grátis</button>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaginaLogin;
