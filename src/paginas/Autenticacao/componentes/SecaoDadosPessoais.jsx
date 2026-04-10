import { useState } from 'react';
import { User, Calendar, AlertCircle, Eye, EyeOff, Settings } from 'lucide-react';
import { GENEROS } from '../CadastroConstants';
import Tooltip from '../../../componentes/Tooltip/Tooltip';
import { rastrear } from '../../../servicos/rastreamento';

const SecaoDadosPessoais = ({ form, set, erros, validarCampo, ehMenorDeIdade }) => {
  const [exibirPrivacidade, setExibirPrivacidade] = useState(ehMenorDeIdade);

  return (
    <>
      <div className="auth-secao">
        <span className="auth-secao-titulo">Dados Pessoais</span>
      </div>

      {/* ... (campos nome, apelido, data, genero permanecem iguais) */}
      <div className="auth-grupo">
        <label>Nome completo *</label>
        <div className={`auth-campo ${erros.nome_completo ? 'campo-com-erro' : ''}`}>
          <span className="auth-campo-icone"><User size={16} /></span>
          <input 
            placeholder="Digite seu Nome e Sobrenome" 
            value={form.nome_completo}
            onChange={set('nome_completo')} 
            onBlur={(e) => {
              validarCampo('nome_completo', e.target.value);
              rastrear.clique('foco_nome_cadastro', 'Nome preenchido ou saído do campo');
            }}
            required 
            tabIndex="2" 
          />
        </div>
        {erros.nome_completo && (
          <span className="msg-erro-campo"><AlertCircle size={12} /> {erros.nome_completo}</span>
        )}
      </div>

      <div className="auth-grupo">
        <label>
          Apelido
          <Tooltip texto="Como você quer ser chamado dentro das equipes. Se vazio, usaremos seu primeiro nome." />
        </label>
        <div className="auth-campo">
          <span className="auth-campo-icone"><User size={16} /></span>
          <input 
            placeholder="Como quer ser chamado na equipe" 
            value={form.apelido}
            onChange={set('apelido')} 
            tabIndex="3" 
          />
        </div>
      </div>

      <div className="auth-grade-2">
        <div className="auth-grupo">
          <label>Data de Nascimento *</label>
          <div className={`auth-campo ${erros.data_nascimento ? 'campo-com-erro' : ''}`}>
            <span className="auth-campo-icone"><Calendar size={16} /></span>
            <input 
              type="date" 
              value={form.data_nascimento}
              onChange={(e) => {
                 set('data_nascimento')(e);
                 rastrear.clique('mudou_data_nascimento', `Iniciou preenchimento de idade: ${e.target.value}`);
              }} 
              onBlur={(e) => validarCampo('data_nascimento', e.target.value)}
              required 
              tabIndex="4" 
            />
          </div>
          {erros.data_nascimento && (
            <span className="msg-erro-campo"><AlertCircle size={12} /> {erros.data_nascimento}</span>
          )}
        </div>
        
        <div className="auth-grupo">
          <label>
            Gênero *
            <Tooltip texto="Usado para localizar equipes compatíveis." posicao="bottom" />
          </label>
          <div className={`auth-campo ${erros.genero ? 'campo-com-erro' : ''}`}>
            <span className="auth-campo-icone"><User size={16} /></span>
            <select 
              value={form.genero} 
              onChange={set('genero')} 
              onBlur={(e) => {
                 validarCampo('genero', e.target.value);
                 rastrear.clique('selecionou_genero', `Gênero escolhido: ${e.target.value}`);
              }}
              required 
              tabIndex="5"
            >
              <option value="">Selecione...</option>
              {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          {erros.genero && (
            <span className="msg-erro-campo"><AlertCircle size={12} /> {erros.genero}</span>
          )}
        </div>
      </div>

      <div className="auth-grupo" style={{ marginBottom: '1.5rem' }}>
        {/* Trigger de Privacidade */}
        {!ehMenorDeIdade && (
          <button 
            type="button" 
            className="btn-toggle-privacidade"
            onClick={() => setExibirPrivacidade(!exibirPrivacidade)}
          >
            <Settings size={12} />
            {exibirPrivacidade ? 'Ocultar opções de perfil' : 'Configurações de Privacidade do Perfil'}
          </button>
        )}

        {exibirPrivacidade && (
          <div className="auth-perfil-toggle-container" style={{ opacity: ehMenorDeIdade ? 0.8 : 1 }}>
            {ehMenorDeIdade && (
                <div style={{ color: '#fca5a5', fontSize: '0.75rem', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <AlertCircle size={12} /> Perfil privado obrigatório (Menor de 18 anos)
                </div>
            )}
            <label className="auth-toggle" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: ehMenorDeIdade ? 'not-allowed' : 'pointer' }}>
                <input 
                type="checkbox" 
                checked={!form.perfil_publico} 
                onChange={(e) => {
                    if(!ehMenorDeIdade) {
                    set('perfil_publico')({ target: { value: !e.target.checked } });
                    rastrear.clique('toggle_perfil_privado', `Perfil Privado: ${e.target.checked}`);
                    }
                }}
                disabled={ehMenorDeIdade}
                tabIndex="8"
                style={{ width: 'auto', margin: 0 }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--texto-cor)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {!form.perfil_publico ? 'Perfil Privado' : 'Perfil Público'}
                </span>
            </label>
            
            {/* Mensagem dinâmica (Incentivo vs Alerta) */}
            {!ehMenorDeIdade && (
                <p style={{ 
                fontSize: '0.72rem', 
                color: !form.perfil_publico ? '#ef4444' : '#38bdf8', 
                marginTop: '6px', 
                fontWeight: '500' 
                }}>
                {!form.perfil_publico 
                    ? '⚠️ Atenção: Capitães não te encontrarão na busca de atletas.' 
                    : '💡 Perfis públicos aparecem primeiro nas buscas.'}
                </p>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default SecaoDadosPessoais;
