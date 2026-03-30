import { useState } from 'react';
import './PaginaAutenticacao.css';
import { supabase } from '../../servicos/supabase';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Botao from '../../componentes/Botao/Botao';

const PaginaLogin = ({ aoIrParaCadastro }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
    } catch {
      setErro('E-mail ou senha inválidos. Verifique e tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="auth-cartao">
      <div className="auth-logo-wrap">
        <div className="auth-logo" style={{ background: 'transparent', boxShadow: 'none' }}>
          <img src="/icon_ph_oficial.png" alt="PlayHub" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
        </div>
        <h2>Bem-vindo de volta!</h2>
        <p className="auth-subtitulo">Acesse sua conta PlayHub</p>
      </div>

      {erro && (
        <div className="auth-erro">
          <AlertCircle size={16} />
          <span>{erro}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="auth-form">
        <div className="auth-grupo">
          <label>E-mail</label>
          <div className="auth-campo">
            <span className="auth-campo-icone"><Mail size={16} /></span>
            <input type="email" placeholder="seu@email.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
        </div>

        <div className="auth-grupo">
          <label>Senha</label>
          <div className="auth-campo">
            <span className="auth-campo-icone"><Lock size={16} /></span>
            <input type={mostrarSenha ? 'text' : 'password'} placeholder="••••••••"
              value={senha} onChange={(e) => setSenha(e.target.value)}
              required autoComplete="current-password" />
            <button type="button" className="btn-olho" onClick={() => setMostrarSenha(!mostrarSenha)}>
              {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <Botao type="submit" fullWidth disabled={carregando}>
          {carregando ? 'Entrando...' : 'Entrar na conta'}
        </Botao>
      </form>

      <p className="auth-link">
        Não tem conta? <button onClick={aoIrParaCadastro}>Cadastre-se grátis</button>
      </p>
    </div>
  );
};

export default PaginaLogin;
