import './Botao.css';

const Botao = ({ children, variant = 'primario', onClick, type = 'button', disabled = false, fullWidth = false, style, ...props }) => {
  return (
    <button 
      type={type}
      className={`botao botao-${variant} ${fullWidth ? 'botao-cheio' : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
      {...props}
    >
      {children}
    </button>
  );
};

export default Botao;
