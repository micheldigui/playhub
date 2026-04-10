import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import Botao from '../../../componentes/Botao/Botao';
import { rastrear } from '../../../servicos/rastreamento';

const SecaoSegurancaCadastro = ({ 
  form, set, erros, validarCampo, mostrarSenha, setMostrarSenha, 
  aceitouTermos, setAceitouTermos, setModalLegal, carregando 
}) => {
  
  return (
    <>
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
          <button 
            type="button" 
            className="btn-olho" 
            onClick={() => {
              setMostrarSenha(!mostrarSenha);
              rastrear.clique('toggle_senha_cadastro', 'Alternou visualização da senha no cadastro');
            }} 
            tabIndex="-1"
          >
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
              onChange={(e) => {
                setAceitouTermos(e.target.checked);
                rastrear.clique('check_termos_cadastro', `Estado check: ${e.target.checked}`);
              }}
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
      </div>
    </>
  );
};

export default SecaoSegurancaCadastro;
