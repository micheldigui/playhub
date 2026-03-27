import React, { useState, useEffect } from 'react';
import { 
  X, User, Mail, Phone, MapPin, Shield, CheckCircle2, AlertCircle, Save, Trash2, Key, Activity, Eye
} from 'lucide-react';
import { supabase } from '../../../servicos/supabase';
import Botao from '../../../componentes/Botao/Botao';
import Tooltip from '../../../componentes/Tooltip/Tooltip';
import PerfilAtletaModal from '../../../componentes/Modais/PerfilAtletaModal';

const ModalEdicaoUsuario = ({ usuario, aoFechar }) => {
  const [form, setForm] = useState({
    nome_completo: usuario.nome_completo || '',
    apelido: usuario.apelido || '',
    telefone: usuario.telefone || '',
    cep: usuario.cep || '',
    rua: usuario.rua || '',
    numero: usuario.numero || '',
    complemento: usuario.complemento || '',
    bairro: usuario.bairro || '',
    cidade: usuario.cidade || '',
    estado: usuario.estado || '',
    perfil_publico: usuario.perfil_publico ?? true,
    eh_super_admin: usuario.eh_super_admin ?? false
  });

  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [perfilEsportivo, setPerfilEsportivo] = useState([]);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [exibindoPerfilAtleta, setExibindoPerfilAtleta] = useState(false);

  useEffect(() => {
    const carregarPerfilEsportivo = async () => {
      try {
        const { data, error } = await supabase
          .from('jogador_modalidades')
          .select('*')
          .eq('usuario_id', usuario.id);
        
        if (error) throw error;
        setPerfilEsportivo(data || []);
      } catch (err) {
        console.error('Erro ao buscar perfil esportivo:', err);
      } finally {
        setCarregandoPerfil(false);
      }
    };
    
    carregarPerfilEsportivo();
  }, [usuario.id]);

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
          cep: form.cep,
          rua: form.rua,
          numero: form.numero,
          complemento: form.complemento,
          bairro: form.bairro,
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

  const excluirConta = async () => {
    const confirmacao = window.confirm(
      `ATENÇÃO: Você está prestes a EXCLUIR DEFINITIVAMENTE a conta de ${usuario.nome_completo || usuario.email}.\n\nEsta ação não pode ser desfeita e removerá imediatamente o jogador de todas as equipes e partidas.\n\nDeseja continuar?`
    );
    
    if (!confirmacao) return;
    
    setCarregando(true);
    setMensagem({ tipo: '', texto: '' });
    
    try {
      const { error } = await supabase.rpc('admin_excluir_usuario', {
        p_usuario_id: usuario.id
      });
      
      if (error) throw error;
      
      setMensagem({ tipo: 'sucesso', texto: 'Conta de usuário excluída permanentemente!' });
      setTimeout(aoFechar, 2000);
    } catch (err) {
      console.error('Erro ao excluir conta:', err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir conta: (Você rodou o script SQL no Supabase para criar a RPC?) ' + err.message });
      setCarregando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '650px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
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

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {mensagem.texto && (
            <div className={`mensagem-alerta ${mensagem.tipo}`}>
              {mensagem.tipo === 'sucesso' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{mensagem.texto}</span>
            </div>
          )}

          <form onSubmit={salvarAlteracoes} id="form-edicao-usuario">
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

              {/* Seção de Endereço */}
              <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                <h5 style={{ marginBottom: '1rem', color: '#94a3b8', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <MapPin size={14} /> Endereço Residencial
                </h5>
                
                <div className="grade-2">
                  <div className="grupo-input">
                    <label>CEP</label>
                    <div className="campo-input">
                      <input value={form.cep} onChange={set('cep')} />
                    </div>
                  </div>
                  <div className="grupo-input">
                    <label>Rua</label>
                    <div className="campo-input">
                      <input value={form.rua} onChange={set('rua')} />
                    </div>
                  </div>
                </div>

                <div className="grade-2">
                  <div className="grupo-input">
                    <label>Número</label>
                    <div className="campo-input">
                      <input value={form.numero} onChange={set('numero')} />
                    </div>
                  </div>
                  <div className="grupo-input">
                    <label>Complemento</label>
                    <div className="campo-input">
                      <input value={form.complemento} onChange={set('complemento')} />
                    </div>
                  </div>
                </div>

                <div className="grupo-input">
                  <label>Bairro</label>
                  <div className="campo-input">
                    <input value={form.bairro} onChange={set('bairro')} />
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
          </form>

          <div className="perfil-cartao" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.95rem', color: '#e2e8f0', margin: 0 }}>
                <Activity size={18} color="#38bdf8" />
                Perfil Esportivo
              </h4>
              <button 
                type="button" 
                onClick={() => setExibindoPerfilAtleta(true)}
                style={{ background: 'transparent', border: 'none', color: '#38bdf8', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'underline' }}
              >
                <Eye size={14} /> Ver Perfil Completo
              </button>
            </div>
            
            {carregandoPerfil ? (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Carregando informações...</p>
            ) : perfilEsportivo.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {perfilEsportivo.map((esporte) => (
                  <div key={esporte.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                    <div>
                      <strong style={{ color: '#f8fafc', fontSize: '0.9rem' }}>{esporte.modalidade}</strong>
                      {esporte.posicao && (
                        <span style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8' }}>Posição: {esporte.posicao}</span>
                      )}
                    </div>
                    <span className="tag-visibilidade" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
                      {esporte.nivel_habilidade}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Este jogador não possui modalidades cadastradas em seu perfil esportivo.</p>
            )}
          </div>

          <div className="acoes-admin-modal" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Botao 
              type="button" 
              variant="secundario" 
              onClick={enviarRecuperacaoSenha}
              disabled={carregando}
              style={{ flex: 1, minWidth: '200px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.2)' }}
            >
              <Key size={18} /> Recuperar Senha
            </Botao>
            <Botao 
              type="submit" 
              form="form-edicao-usuario"
              disabled={carregando} 
              style={{ flex: 1, minWidth: '150px' }}
            >
              <Save size={18} /> {carregando ? 'Salvando...' : 'Salvar'}
            </Botao>
            <Botao 
              type="button" 
              variant="secundario" 
              onClick={excluirConta}
              disabled={carregando}
              style={{ flex: '1 1 100%', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.2)', marginTop: '0.5rem' }}
            >
              <Trash2 size={18} /> Excluir Conta Definitivamente
            </Botao>
          </div>
        </div>
      </div>

      {exibindoPerfilAtleta && (
        <PerfilAtletaModal 
          atleta={usuario} 
          aoFechar={() => setExibindoPerfilAtleta(false)} 
          ehEu={true} 
        />
      )}
    </div>
  );
};

export default ModalEdicaoUsuario;
