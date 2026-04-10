import { MapPin, Search, AlertCircle } from 'lucide-react';
import { mascaraCep } from '../CadastroConstants';
import Tooltip from '../../../componentes/Tooltip/Tooltip';
import { rastrear } from '../../../servicos/rastreamento';

const SecaoEnderecoCadastro = ({ form, setForm, set, erros, buscandoCep, buscarCep, numeroRef }) => {
  
  return (
    <>
      <div className="auth-secao">
        <span className="auth-secao-titulo">Endereço</span>
      </div>

      <div className="auth-grupo">
        <label>
          CEP
          <Tooltip texto="Preencha o CEP para preenchimento automático." />
        </label>
        <div className="auth-grade-cep">
          <div className={`auth-campo ${erros.cep ? 'campo-com-erro' : ''}`}>
            <span className="auth-campo-icone"><MapPin size={16} /></span>
            <input
              placeholder="00000-000"
              value={form.cep}
              onChange={(e) => {
                const val = mascaraCep(e.target.value);
                setForm(prev => ({ ...prev, cep: val }));
              }}
              maxLength={9}
              tabIndex="9"
            />
          </div>
          <button 
            type="button" 
            className="btn-buscar-cep" 
            onClick={() => {
               rastrear.clique('clique_buscar_cep', `CEP Digitado: ${form.cep}`);
               buscarCep();
            }} 
            disabled={buscandoCep} 
            tabIndex="-1"
          >
            <Search size={15} />
            {buscandoCep ? '...' : 'Buscar'}
          </button>
        </div>
        {erros.cep && (
          <span className="msg-erro-campo"><AlertCircle size={12} /> {erros.cep}</span>
        )}
      </div>

      <div className="auth-grupo">
        <label>Rua / Avenida</label>
        <div className="auth-campo">
          <span className="auth-campo-icone"><MapPin size={16} /></span>
          <input 
            placeholder="Nome da rua ou avenida" 
            value={form.rua}
            onChange={set('rua')} 
            tabIndex="-1" 
          />
        </div>
      </div>

      <div className="auth-grade-2">
        <div className="auth-grupo">
          <label>Número</label>
          <div className="auth-campo">
            <span className="auth-campo-icone"><MapPin size={16} /></span>
            <input 
              ref={numeroRef} 
              placeholder="Ex: 42" 
              value={form.numero}
              onChange={set('numero')} 
              tabIndex="10" 
            />
          </div>
        </div>
        <div className="auth-grupo">
          <label>Complemento</label>
          <div className="auth-campo">
            <span className="auth-campo-icone"><MapPin size={16} /></span>
            <input 
              placeholder="Apto, Bloco..." 
              value={form.complemento}
              onChange={set('complemento')} 
              tabIndex="11" 
            />
          </div>
        </div>
      </div>

      <div className="auth-grupo">
        <label>Bairro</label>
        <div className="auth-campo">
          <span className="auth-campo-icone"><MapPin size={16} /></span>
          <input 
            placeholder="Nome do bairro" 
            value={form.bairro}
            onChange={set('bairro')} 
            tabIndex="-1" 
          />
        </div>
      </div>

      <div className="auth-grade-uf">
        <div className="auth-grupo">
          <label>Cidade *</label>
          <div className="auth-campo">
            <span className="auth-campo-icone"><MapPin size={16} /></span>
            <input 
              placeholder="Sua cidade" 
              value={form.cidade}
              onChange={set('cidade')} 
              required 
              tabIndex="-1" 
            />
          </div>
        </div>
        <div className="auth-grupo">
          <label>Estado *</label>
          <div className="auth-campo">
            <span className="auth-campo-icone"><MapPin size={16} /></span>
            <input 
              placeholder="UF" 
              value={form.estado}
              onChange={(e) => setForm(prev => ({ ...prev, estado: e.target.value.toUpperCase().slice(0, 2) }))}
              maxLength={2} 
              required 
              tabIndex="-1" 
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default SecaoEnderecoCadastro;
