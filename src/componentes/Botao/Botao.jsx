import './Botao.css';

const Botao = ({ children, variant = 'primario', onClick, type = 'button', disabled = false, fullWidth = false, style, active, title, ...props }) => {
  return (
    <button 
      type={type}
      className={`botao botao-${variant} ${fullWidth ? 'botao-cheio' : ''} ${active ? 'botao-ativo' : ''}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
      title={title}
      {...props}
    >
      {children}
    </button>
  );
};

export default Botao;
