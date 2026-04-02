import { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import './Tooltip.css';

const Tooltip = ({ texto, posicao = 'top' }) => {
  const [visivel, setVisivel] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const gatilhoRef = useRef(null);

  useLayoutEffect(() => {
    if (visivel && gatilhoRef.current) {
      const rect = gatilhoRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      let top = 0;
      let left = 0;

      if (posicao === 'top') {
        top = rect.top + scrollY - 10;
        left = rect.left + scrollX + rect.width / 2;
      } else if (posicao === 'bottom') {
        top = rect.bottom + scrollY + 10;
        left = rect.left + scrollX + rect.width / 2;
      } else if (posicao === 'right') {
        top = rect.top + scrollY + rect.height / 2;
        left = rect.right + scrollX + 10;
      }

      setPosition({ top, left });
    }
  }, [visivel, posicao]);

  const balaoEstilo = {
    position: 'fixed',
    top: `${position.top}px`,
    left: `${position.left}px`,
    transform: posicao === 'top' ? 'translate(-50%, -100%)' : 
               posicao === 'bottom' ? 'translate(-50%, 0)' : 
               posicao === 'right' ? 'translate(0, -50%)' : 'none',
    zIndex: 100000,
    pointerEvents: 'none'
  };

  return (
    <span className="tooltip-raiz">
      <span
        ref={gatilhoRef}
        role="button"
        className="tooltip-botao"
        onMouseEnter={() => setVisivel(true)}
        onMouseLeave={() => setVisivel(false)}
        onClick={(e) => {
          e.stopPropagation();
          setVisivel(!visivel);
        }}
        aria-label="Mais informações"
        tabIndex="0"
      >
        <Info size={13} />
      </span>
      {visivel && createPortal(
        <div 
          className={`tooltip-balao tooltip-${posicao}`}
          style={balaoEstilo}
        >
          {texto}
          <span className="tooltip-seta" />
        </div>,
        document.body
      )}
    </span>
  );
};

const Info = ({ size }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className="lucide lucide-info"
  >
    <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
  </svg>
);

export default Tooltip;
