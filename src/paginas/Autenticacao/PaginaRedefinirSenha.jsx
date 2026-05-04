import { useEffect, useState } from 'react';
import './PaginaAutenticacao.css';
import { supabase } from '../../servicos/supabase';
import { AlertCircle, CheckCircle2, Eye, EyeOff, Lock, X } from 'lucide-react';
import Botao from '../../componentes/Botao/Botao';

const PaginaRedefinirSenha = ({ aoIrParaLogin }) => {
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    let ativo = true;

    const verificarSessao = async () => {
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;

      if (!data.session) {
        setErro('Link inválido ou expirado. Solicite um novo link de recuperação.');
      }
      setCarregando(false);
    };

    verificarSessao();

    return () => {
      ativo = false;
    };
  }, []);

  const handleSalvar = async (e) => {
    e.preventDefault();
    setErro('');

    if (senha.length < 6) {
      setErro('A nova senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    if (senha !== confirmarSenha) {
      setErro('As senhas não conferem.');
      return;
    }

    setSalvando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;

      await supabase.auth.signOut();
      setSucesso(true);
      setSenha('');
      setConfirmarSenha('');
    } catch (err) {
      setErro('Não foi possível alterar a senha. Solicite um novo link e tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="auth-pagina">
      <div className="auth-cartao">
        <div className="auth-header">
          <button
            type="button"
            className="btn-fechar-auth"
            onClick={aoIrParaLogin}
            title="Voltar para o login"
            style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', zIndex: 10 }}
          >
            <X size={20} />
          </button>

          <div className="auth-logo-wrap">
            <div className="auth-logo" style={{ background: 'transparent', boxShadow: 'none' }}>
              <img src="/icon_ph_oficial_cf.png" alt="PlayHub" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '4px' }} />
            </div>
            <h2>Redefinir senha</h2>
            <p className="auth-subtitulo">Crie uma nova senha para acessar o PlayHub</p>
          </div>
        </div>

        <div className="auth-body">
          {carregando ? (
            <p className="auth-subtitulo" style={{ padding: '1rem 0 2rem' }}>Validando link de recuperação...</p>
          ) : sucesso ? (
            <div className="auth-form">
              <div className="auth-sucesso">
                <CheckCircle2 size={16} />
                <span>Senha alterada com sucesso. Entre novamente com sua nova senha.</span>
              </div>
              <div className="auth-acoes-form">
                <Botao type="button" onClick={aoIrParaLogin}>Ir para o login</Botao>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSalvar} className="auth-form">
              {erro && (
                <div className="auth-erro">
                  <AlertCircle size={16} />
                  <span>{erro}</span>
                </div>
              )}

              <div className="auth-grupo">
                <label>Nova senha</label>
                <div className="auth-campo">
                  <span className="auth-campo-icone"><Lock size={16} /></span>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <button type="button" className="btn-olho" onClick={() => setMostrarSenha(!mostrarSenha)}>
                    {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="auth-grupo">
                <label>Confirmar nova senha</label>
                <div className="auth-campo">
                  <span className="auth-campo-icone"><Lock size={16} /></span>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>

              <div className="auth-acoes-form">
                <Botao type="submit" disabled={salvando || !!erro && erro.includes('expirado')}>
                  {salvando ? 'Salvando...' : 'Salvar nova senha'}
                </Botao>

                <p className="auth-link" style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                  Lembrou a senha? <button type="button" onClick={aoIrParaLogin}>Voltar ao login</button>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaginaRedefinirSenha;
