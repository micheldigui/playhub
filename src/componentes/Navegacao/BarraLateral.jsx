import { useState } from 'react';
import { 
  LayoutDashboard, Users, Settings, LogOut, Menu, X, 
  ChevronRight, UserCircle, Trophy, Globe 
} from 'lucide-react';
import './BarraLateral.css';
import { supabase } from '../../servicos/supabase';
import { usarEquipe } from '../../contextos/EquipeContexto';

const ITENS_NAV = [
  { id: 'inicio',           icone: LayoutDashboard, label: 'Início' },
  { id: 'equipe',           icone: Users,            label: 'Equipe' },
  { id: 'perfil',           icone: UserCircle,       label: 'Meu Perfil' },
  { id: 'perfil_esportivo', icone: Trophy,           label: 'Perfil Esportivo' },
  { id: 'explorar',         icone: Globe,            label: 'Explorar' },
  { id: 'configuracoes',    icone: Settings,          label: 'Configurações' },
];

const BarraLateral = ({ ativo, setAtivo }) => {
  const [aberta, setAberta] = useState(false);
  const { convitesPendentesGlobais } = usarEquipe();

  const fazerLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <>
      <button className="hamburguer" onClick={() => setAberta(true)} aria-label="Abrir menu">
        <Menu size={22} />
      </button>

      {aberta && <div className="barra-overlay" onClick={() => setAberta(false)} />}

      <aside className={`barra-lateral ${aberta ? 'barra-aberta' : ''}`}>
        <div className="barra-topo">
          <div className="logotipo">
            <div className="logo-icone">PH</div>
            <span className="logo-texto">PlayHub</span>
          </div>
          <button className="barra-fechar" onClick={() => setAberta(false)} aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>

        <nav className="navegacao">
          {ITENS_NAV.map(({ id, icone: Icone, label }) => (
            <button
              key={id}
              className={`item-nav ${ativo === id ? 'ativo' : ''}`}
              onClick={() => { setAtivo(id); setAberta(false); }}
            >
              <span className="item-nav-icone"><Icone size={19} /></span>
              <span className="item-nav-label">
                {label}
                {id === 'equipe' && convitesPendentesGlobais > 0 && (
                  <span style={{
                    background: '#f43f5e',
                    color: 'white',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    marginLeft: '8px'
                  }}>
                    {convitesPendentesGlobais}
                  </span>
                )}
              </span>
              <ChevronRight size={14} className="item-nav-seta" />
            </button>
          ))}
        </nav>

        <div className="barra-rodape">
          <button className="botao-sair" onClick={fazerLogout}>
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default BarraLateral;
