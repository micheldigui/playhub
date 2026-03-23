import { useState } from 'react';
import './PaginaAutenticacao.css';
import PaginaLogin from './PaginaLogin';
import PaginaCadastro from './PaginaCadastro';

const PaginaAutenticacao = () => {
  const [tela, setTela] = useState('login');

  return (
    <div className="auth-pagina">
      {tela === 'login' 
        ? <PaginaLogin aoIrParaCadastro={() => setTela('cadastro')} />
        : <PaginaCadastro aoIrParaLogin={() => setTela('login')} />
      }
    </div>
  );
};

export default PaginaAutenticacao;
