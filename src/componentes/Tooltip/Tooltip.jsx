import { useState } from 'react';
import { Info } from 'lucide-react';
import './Tooltip.css';

const Tooltip = ({ texto, posicao = 'top' }) => {
  const [visivel, setVisivel] = useState(false);

  return (
    <span className={`tooltip-raiz ${visivel ? 'tooltip-visivel' : ''}`}>
      <button
        type="button"
        className="tooltip-botao"
        onMouseEnter={() => setVisivel(true)}
        onMouseLeave={() => setVisivel(false)}
        onClick={() => setVisivel(!visivel)}
        aria-label="Mais informações"
        tabIndex="-1"
      >
        <Info size={13} />
      </button>
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
