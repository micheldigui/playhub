import React from 'react';
import { 
  MapPin, Search, Home, Hash, Map, Building2, Flag 
} from 'lucide-react';
import Botao from '../Botao/Botao';

/**
 * Componente modular para gestão de endereço da sede da equipe.
 * Mantém o estado centralizado no Modal Pai para segurança lógica.
 */
const FormEnderecoEquipe = ({ 
  form, 
  handleMudanca, 
  buscarCep, 
  buscandoCep, 
  campoNumeroRef,
  mascaraCep 
}) => {
  return (
    <div className="secao-form-endereco anima-entrada">
      <span className="secao-titulo">Sede da Equipe (Local de Jogo)</span>
      
      <div className="campo">
        <label>Nome do Local (Onde o time joga?)*</label>
        <div className="campo-valida-moderno">
          <span className="icone-input"><Building2 size={18} /></span>
          <input 
            type="text" 
            placeholder="Ex: Arena Soccer, Clube Recreativo..." 
            value={form.local_nome}
            onChange={(e) => handleMudanca('local_nome', e.target.value)}
            required
            className="input-glass"
          />
        </div>
      </div>

      <div className="grupo-input-moderno-cep">
        <label>CEP (Busca Automática)</label>
        <div className="grade-cep-moderno">
          <div className="campo-valida-moderno" style={{ flex: 1 }}>
            <span className="icone-input"><Search size={16} /></span>
            <input 
              type="text"
              value={form.local_cep} 
              onChange={(e) => handleMudanca('local_cep', mascaraCep ? mascaraCep(e.target.value) : e.target.value)}
              placeholder="00000-000"
              maxLength={9}
              className="input-glass input-cep-mod"
            />
          </div>
          <Botao 
            type="button" 
            onClick={() => buscarCep()} 
            disabled={buscandoCep} 
            className="btn-busca-cep-mod"
            variant="secundario"
          >
            {buscandoCep ? '...' : <Search size={15} />}
          </Botao>
        </div>
      </div>

      <div className="fila-campos-moderna">
        <div className="campo">
          <label>Rua / Logradouro</label>
          <div className="campo-valida-moderno">
            <span className="icone-input"><Home size={18} /></span>
            <input 
              type="text" 
              placeholder="Rua, Avenida..." 
              value={form.local_rua}
              onChange={(e) => handleMudanca('local_rua', e.target.value)}
              className="input-glass"
            />
          </div>
        </div>
        <div className="campo campo-num">
          <label>Número *</label>
          <div className="campo-valida-moderno">
            <span className="icone-input"><Hash size={18} /></span>
            <input 
              ref={campoNumeroRef}
              type="text" 
              placeholder="Ex: 123" 
              value={form.local_numero}
              onChange={(e) => handleMudanca('local_numero', e.target.value)}
              required
              className="input-glass"
            />
          </div>
        </div>
      </div>

      <div className="fila-campos-moderna">
        <div className="campo">
          <label>Bairro</label>
          <div className="campo-valida-moderno">
            <span className="icone-input"><Map size={18} /></span>
            <input 
              type="text" 
              placeholder="Bairro..." 
              value={form.local_bairro}
              onChange={(e) => handleMudanca('local_bairro', e.target.value)}
              className="input-glass"
            />
          </div>
        </div>
        <div className="campo">
          <label>Cidade *</label>
          <div className="campo-valida-moderno">
            <span className="icone-input"><Building2 size={18} /></span>
            <input 
              type="text" 
              placeholder="Cidade..." 
              value={form.local_cidade}
              onChange={(e) => handleMudanca('local_cidade', e.target.value)}
              required
              className="input-glass"
            />
          </div>
        </div>
        <div className="campo campo-uf">
          <label>UF *</label>
          <div className="campo-valida-moderno">
            <span className="icone-input"><Flag size={18} /></span>
            <input 
              type="text" 
              placeholder="UF" 
              value={form.local_estado}
              onChange={(e) => handleMudanca('local_estado', e.target.value.toUpperCase().slice(0,2))}
              required
              maxLength={2}
              className="input-glass"
            />
          </div>
        </div>
      </div>

      <div className="campo">
        <label>Link do Google Maps / Waze</label>
        <div className="campo-valida-moderno">
          <span className="icone-input"><MapPin size={18} /></span>
          <input 
            type="url" 
            placeholder="https://maps.google.com/..." 
            value={form.local_mapa_link}
            onChange={(e) => handleMudanca('local_mapa_link', e.target.value)}
            className="input-glass"
          />
        </div>
      </div>
    </div>
  );
};

export default FormEnderecoEquipe;
