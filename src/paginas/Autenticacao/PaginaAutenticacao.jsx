import { useState } from 'react';
import './PaginaAutenticacao.css';
import PaginaLogin from './PaginaLogin';
import PaginaCadastro from './PaginaCadastro';

const PaginaAutenticacao = ({ aoVoltar, telaInicial = 'login' }) => {
  const [tela, setTela] = useState(telaInicial);

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
