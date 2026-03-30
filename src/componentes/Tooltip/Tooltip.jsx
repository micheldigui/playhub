import { useState } from 'react';
import { Info } from 'lucide-react';
import './Tooltip.css';

const Tooltip = ({ texto, posicao = 'top' }) => {
  const [visivel, setVisivel] = useState(false);

  return (
    <span className={`tooltip-raiz ${visivel ? 'tooltip-visivel' : ''}`}>
      <span
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
      {visivel && (
        <div className={`tooltip-balao tooltip-${posicao}`}>
          {texto}
          <span className="tooltip-seta" />
        </div>
      )}
    </span>
  );
};

export default Tooltip;
