import React, { useState } from 'react';
import { 
  X, User, Mail, Phone, MapPin, Shield, CheckCircle2, AlertCircle, MailQuestion, Save, Trash2, Key
} from 'lucide-react';
import { supabase } from '../../../servicos/supabase';
import Botao from '../../../componentes/Botao/Botao';
import Tooltip from '../../../componentes/Tooltip/Tooltip';

const ModalEdicaoUsuario = ({ usuario, aoFechar }) => {
  const [form, setForm] = useState({
    nome_completo: usuario.nome_completo || '',
    apelido: usuario.apelido || '',
    telefone: usuario.telefone || '',
    cidade: usuario.cidade || '',
    estado: usuario.estado || '',
    perfil_publico: usuario.perfil_publico ?? true,
    eh_super_admin: usuario.eh_super_admin ?? false
  });

  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);

  const set = (campo) => (e) => setForm(prev => ({ ...prev, [campo]: e.target.value }));

  const salvarAlteracoes = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setMensagem({ tipo: '', texto: '' });

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nome_completo: form.nome_completo,
          apelido: form.apelido,
          telefone: form.telefone,
          cidade: form.cidade,
          estado: form.estado,
          perfil_publico: form.perfil_publico,
          eh_super_admin: form.eh_super_admin
        })
        .eq('id', usuario.id);

      if (error) throw error;
      setMensagem({ tipo: 'sucesso', texto: 'Usuário atualizado com sucesso!' });
      
      // Delay para fechar o modal e atualizar a lista
      setTimeout(aoFechar, 1500);
    } catch (err) {
      console.error('Erro ao atualizar usuário:', err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar: ' + err.message });
    } finally {
      setCarregando(false);
    }
  };

  const enviarRecuperacaoSenha = async () => {
    if (!window.confirm(`Deseja enviar um e-mail de recuperação de senha para ${usuario.email}?`)) return;
    
    setCarregando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(usuario.email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) throw error;
      setMensagem({ tipo: 'sucesso', texto: 'E-mail de recuperação enviado com sucesso!' });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Erro ao enviar e-mail: ' + err.message });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '600px', width: '95%' }}>
        <header className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <User className="primaria-icon" size={24} />
            <div>
              <h3>Gestão de Usuário</h3>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>ID: {usuario.id}</p>
            </div>
          </div>
          <button className="btn-fechar" onClick={aoFechar}><X size={20} /></button>
        </header>

        <form onSubmit={salvarAlteracoes} className="modal-body">
          {mensagem.texto && (
            <div className={`mensagem-alerta ${mensagem.tipo}`} style={{ marginBottom: '1.5rem' }}>
              {mensagem.tipo === 'sucesso' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{mensagem.texto}</span>
            </div>
          )}

          <div className="perfil-cartao" style={{ background: 'transparent', border: 'none', padding: 0 }}>
            <div className="grupo-input longo">
              <label>E-mail (Login) <Tooltip texto="O e-mail não pode ser alterado diretamente por segurança." /></label>
              <div className="campo-input desabilitado" style={{ opacity: 0.7 }}>
                <span className="icone"><Mail size={16} /></span>
                <input type="email" value={usuario.email} disabled />
              </div>
            </div>

            <div className="grade-2">
              <div className="grupo-input">
                <label>Nome Completo</label>
                <div className="campo-input">
                  <span className="icone"><User size={16} /></span>
                  <input required value={form.nome_completo} onChange={set('nome_completo')} />
                </div>
              </div>
              <div className="grupo-input">
                <label>Apelido</label>
                <div className="campo-input">
                  <span className="icone"><User size={16} /></span>
                  <input value={form.apelido} onChange={set('apelido')} />
                </div>
              </div>
            </div>

            <div className="grupo-input">
              <label>Telefone / WhatsApp</label>
              <div className="campo-input">
                <span className="icone"><Phone size={16} /></span>
                <input value={form.telefone} onChange={set('telefone')} />
              </div>
            </div>

            <div className="grade-2">
              <div className="grupo-input">
                <label>Cidade</label>
                <div className="campo-input">
                  <span className="icone"><MapPin size={16} /></span>
                  <input value={form.cidade} onChange={set('cidade')} />
                </div>
              </div>
              <div className="grupo-input">
                <label>UF</label>
                <div className="campo-input">
                  <span className="icone"><MapPin size={16} /></span>
                  <input value={form.estado} onChange={set('estado')} maxLength={2} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={form.perfil_publico}
                  onChange={(e) => setForm(prev => ({ ...prev, perfil_publico: e.target.checked }))} 
                />
                <span className="checkbox-texto">Perfil Público na plataforma</span>
              </label>

              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={form.eh_super_admin}
                  onChange={(e) => setForm(prev => ({ ...prev, eh_super_admin: e.target.checked }))} 
                />
                <span className="checkbox-texto" style={{ color: form.eh_super_admin ? '#fbbf24' : 'inherit', fontWeight: form.eh_super_admin ? 'bold' : 'normal' }}>
                  <Shield size={16} style={{ display: 'inline', marginRight: '6px' }} /> 
                  Super Administrador do Sistema
                </span>
                <Tooltip texto="CUIDADO: Isso dá acesso total ao sistema, BD e gestão de outros usuários." />
              </label>
            </div>
          </div>

          <div className="acoes-admin-modal" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <Botao 
              type="button" 
              variant="secundario" 
              onClick={enviarRecuperacaoSenha}
              disabled={carregando}
              style={{ flex: 1, minWidth: '200px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.2)' }}
            >
              <Key size={18} /> Recuperar Senha (E-mail)
            </Botao>
            <Botao type="submit" disabled={carregando} style={{ flex: 1, minWidth: '150px' }}>
              <Save size={18} /> {carregando ? 'Salvando...' : 'Salvar Alterações'}
            </Botao>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEdicaoUsuario;
