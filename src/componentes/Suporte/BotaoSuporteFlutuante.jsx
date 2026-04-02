import { MessageCircle } from 'lucide-react';
import { SUPORTE } from '../../config/suporte';
import './BotaoSuporteFlutuante.css';

const BotaoSuporteFlutuante = () => {
    return (
        <a 
            href={SUPORTE.GET_LINK_WHATSAPP()} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="botao-suporte-flutuante"
            title="Dúvidas? Fale com o Suporte Oficial"
        >
            <div className="pulse-container">
                <div className="pulse-ring gold"></div>
                <div className="pulse-ring"></div>
                <MessageCircle size={28} />
            </div>
            <span className="label-suporte">Suporte PlayHub</span>
        </a>
    );
};

export default BotaoSuporteFlutuante;
