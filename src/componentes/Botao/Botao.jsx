import './Botao.css';

const Botao = ({ children, variant = 'primario', onClick, type = 'button', disabled = false, fullWidth = false }) => {
  return (
    <button 
      type={type}
      className={`botao botao-${variant} ${fullWidth ? 'botao-cheio' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Botao;
