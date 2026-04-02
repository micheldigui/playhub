import { useState } from 'react';
import './PaginaAutenticacao.css';
import PaginaLogin from './PaginaLogin';
import PaginaCadastro from './PaginaCadastro';

const PaginaAutenticacao = ({ aoVoltar }) => {
  const [tela, setTela] = useState('login');

  return (
    <div className="auth-pagina">
      {tela === 'login' 
        ? <PaginaLogin aoIrParaCadastro={() => setTela('cadastro')} aoVoltar={aoVoltar} />
        : <PaginaCadastro aoIrParaLogin={() => setTela('login')} aoVoltar={aoVoltar} />
      }
    </div>
  );
};

export default PaginaAutenticacao;
