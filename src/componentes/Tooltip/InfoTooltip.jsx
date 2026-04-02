import React from 'react';
import { Info } from 'lucide-react';
import Tooltip from './Tooltip';
import './Tooltip.css';

const InfoTooltip = ({ texto, posicao = 'top', size = 14 }) => {
  return (
    <Tooltip 
      texto={texto} 
      posicao={posicao} 
      gatilho={
        <div className="info-icon-wrapper" style={{ display: 'inline-flex', marginLeft: '10px', cursor: 'help', color: 'var(--primaria)', opacity: 0.8 }}>
          <Info size={size} />
        </div>
      }
    />
  );
};

export default InfoTooltip;
