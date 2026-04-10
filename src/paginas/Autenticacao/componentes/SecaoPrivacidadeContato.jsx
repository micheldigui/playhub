import { useState } from 'react';
import { Mail, Phone, AlertCircle, Settings } from 'lucide-react';
import { mascaraTelefone } from '../CadastroConstants';
import Tooltip from '../../../componentes/Tooltip/Tooltip';
import { rastrear } from '../../../servicos/rastreamento';

const SecaoPrivacidadeContato = ({ form, setForm, set, erros, validarCampo, ehMenorDeIdade }) => {
  const [exibirPrivacidade, setExibirPrivacidade] = useState(ehMenorDeIdade);

  return (
    <>
      <div className="auth-secao">
        <span className="auth-secao-titulo">Contato & Privacidade</span>
      </div>

      <div className="auth-grupo">
        <label>E-mail *</label>
        <div className={`auth-campo ${erros.email ? 'campo-com-erro' : ''}`}>
          <span className="auth-campo-icone"><Mail size={16} /></span>
          <input 
            type="email" 
            placeholder="seu@email.com" 
            value={form.email}
            onChange={set('email')} 
            onBlur={(e) => {
               validarCampo('email', e.target.value);
               rastrear.clique('foco_email_cadastro', 'E-mail preenchido');
            }}
            required 
            autoComplete="email" 
            tabIndex="6" 
          />
        </div>
        {erros.email && (
          <span className="msg-erro-campo"><AlertCircle size={12} /> {erros.email}</span>
        )}
      </div>

      <div className="auth-grupo">
        <label>
          WhatsApp / Telefone *
          <Tooltip texto="Usado para convites e comunicação da equipe." />
        </label>
        <div className={`auth-campo ${erros.telefone ? 'campo-com-erro' : ''}`}>
          <span className="auth-campo-icone"><Phone size={16} /></span>
          <input
            type="tel"
            placeholder="(00) 00000-0000"
            value={form.telefone}
            onChange={(e) => {
              const val = mascaraTelefone(e.target.value);
              setForm(prev => ({ ...prev, telefone: val }));
            }}
            onBlur={(e) => validarCampo('telefone', e.target.value)}
            maxLength={15}
            required
            tabIndex="7"
          />
        </div>
        {erros.telefone && (
          <span className="msg-erro-campo"><AlertCircle size={12} /> {erros.telefone}</span>
        )}
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
            {exibirPrivacidade ? 'Ocultar opções de contato' : 'Privacidade e Visibilidade do Número'}
          </button>
        )}

        {exibirPrivacidade && (
          <div className="auth-perfil-toggle-container" style={{ opacity: ehMenorDeIdade ? 0.8 : 1 }}>
            {ehMenorDeIdade && (
                <div style={{ color: '#fca5a5', fontSize: '0.75rem', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <AlertCircle size={12} /> Ocultação obrigatória (Menor de 18 anos)
                </div>
            )}
            <label className="auth-toggle" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: ehMenorDeIdade ? 'not-allowed' : 'pointer' }}>
                <input 
                type="checkbox" 
                checked={!form.compartilhar_whatsapp_match} 
                onChange={(e) => {
                    if(!ehMenorDeIdade) {
                    setForm(prev => ({ ...prev, compartilhar_whatsapp_match: !e.target.checked }));
                    rastrear.clique('toggle_whatsapp_privado', `WhatsApp Privado: ${e.target.checked}`);
                    }
                }}
                disabled={ehMenorDeIdade}
                tabIndex="8"
                style={{ width: 'auto', margin: 0 }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--texto-cor)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {!form.compartilhar_whatsapp_match ? 'Não compartilhar número' : 'Compartilhamento Ativado'}
                </span>
            </label>
            
            {/* Mensagem dinâmica (Incentivo vs Alerta) */}
            {!ehMenorDeIdade && (
                <p style={{ 
                fontSize: '0.72rem', 
                color: !form.compartilhar_whatsapp_match ? '#ef4444' : '#22c55e', 
                marginTop: '6px', 
                fontWeight: '500' 
                }}>
                {!form.compartilhar_whatsapp_match 
                    ? '⚠️ Atenção: Equipes não conseguirão te chamar rapidamente.' 
                    : '💡 Liberar o WhatsApp facilita convites rápidos de times!'}
                </p>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default SecaoPrivacidadeContato;
