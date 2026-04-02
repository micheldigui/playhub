import React, { useState, useEffect } from 'react';
import { 
  X, User, Mail, Phone, MapPin, Shield, CheckCircle2, AlertCircle, Save, Trash2, Key, Activity, Eye, Calendar, Users, ShieldCheck
} from 'lucide-react';
import { supabase } from '../../../servicos/supabase';
import { usarAutenticacao } from '../../../contextos/AutenticacaoContexto';
import Botao from '../../../componentes/Botao/Botao';
import Tooltip from '../../../componentes/Tooltip/Tooltip';
import ModalPerfilAtleta from '../../../componentes/Modais/ModalPerfilAtleta';
import './ModalEdicaoUsuario.css';

const GENEROS = ['Masculino', 'Feminino', 'Não-binário', 'Prefiro não informar'];

const calcularIdade = (dataNasc) => {
  if (!dataNasc) return null;
  const hoje = new Date();
  const nasc = new Date(dataNasc);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
};

const ModalEdicaoUsuario = ({ usuario, aoFechar }) => {
  const { ehRootAdmin: euSouRoot, dadosUsuario: eu } = usarAutenticacao();
  
  const [form, setForm] = useState({
    nome_completo: usuario.nome_completo || '',
    apelido: usuario.apelido || '',
    telefone: usuario.telefone || '',
    data_nascimento: usuario.data_nascimento || '',
    genero: usuario.genero || '',
    cep: usuario.cep || '',
    rua: usuario.rua || '',
    numero: usuario.numero || '',
    complemento: usuario.complemento || '',
    bairro: usuario.bairro || '',
    cidade: usuario.cidade || '',
    estado: usuario.estado || '',
    foto_url: usuario.foto_url || '',
    perfil_publico: usuario.perfil_publico ?? true,
    compartilhar_whatsapp_match: usuario.compartilhar_whatsapp_match ?? false,
    eh_super_admin: usuario.eh_super_admin ?? false,
    admin_permissoes: usuario.admin_permissoes || { usuarios: false, equipes: false }
  });

  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [perfilEsportivo, setPerfilEsportivo] = useState([]);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [exibindoPerfilAtleta, setExibindoPerfilAtleta] = useState(false);

  // Verifica se o usuário que está sendo editado é o Root
  const usuarioEditadoEhRoot = usuario.email === 'michelssouza@gmail.com';

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

  const idadeAtual = calcularIdade(form.data_nascimento);
  const ehMenorDeIdade = idadeAtual !== null && idadeAtual < 18;

  const set = (campo) => (e) => {
    const novoValor = e.target.value;
    setForm(prev => {
      const novoForm = { ...prev, [campo]: novoValor };
      // Se mudou a data de nascimento, forçar privacidade para menores
      if (campo === 'data_nascimento') {
        const idade = calcularIdade(novoValor);
        if (idade !== null && idade < 18) {
          novoForm.perfil_publico = false;
          novoForm.compartilhar_whatsapp_match = false;
        }
      }
      return novoForm;
    });
  };

  const togglePermissao = (chave) => {
    setForm(prev => ({
      ...prev,
      admin_permissoes: {
        ...prev.admin_permissoes,
        [chave]: !prev.admin_permissoes[chave]
      }
    }));
  };

  const salvarAlteracoes = async () => {
    setCarregando(true);
    setMensagem({ tipo: '', texto: '' });

    // Garantir que menores de 18 sempre tenham privacidade forçada
    const perfilPublicoFinal = ehMenorDeIdade ? false : form.perfil_publico;
    const whatsappFinal = ehMenorDeIdade ? false : form.compartilhar_whatsapp_match;

    try {
      // Usa RPC com SECURITY DEFINER para contornar RLS e
      // permitir que o Root Admin atualize campos de outros usuários
      const { error } = await supabase.rpc('admin_atualizar_usuario', {
        p_usuario_id: usuario.id,
        p_nome_completo: form.nome_completo,
        p_apelido: form.apelido,
        p_telefone: form.telefone,
        p_data_nascimento: form.data_nascimento || null,
        p_genero: form.genero || null,
        p_cep: form.cep,
        p_rua: form.rua,
        p_numero: form.numero,
        p_complemento: form.complemento,
        p_bairro: form.bairro,
        p_cidade: form.cidade,
        p_estado: form.estado,
        p_perfil_publico: perfilPublicoFinal,
        p_compartilhar_whatsapp_match: whatsappFinal,
        p_eh_super_admin: ehMenorDeIdade ? false : form.eh_super_admin,
        p_admin_permissoes: ehMenorDeIdade ? { usuarios: false, equipes: false } : form.admin_permissoes
      });

      if (error) throw error;
      setMensagem({ tipo: 'sucesso', texto: 'Usuário atualizado com sucesso!' });
      
      // Delay para fechar o modal e atualizar a lista
      setTimeout(aoFechar, 1500);
    } catch (err) {
      console.error('Erro ao atualizar usuário:', err);
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar: ' + (err.message || 'Verifique permissões do banco.') });
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
      setMensagem({ tipo: 'erro', texto: 'Erro ao excluir conta: ' + err.message });
      setCarregando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '700px', width: '95%', maxHeight: '92vh', overflowY: 'auto' }}>
        <header className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="primaria-icon" style={{ background: 'rgba(14, 165, 233, 0.1)', padding: '8px', borderRadius: '8px', color: '#0ea5e9' }}>
              <User size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Gestão de Usuário</h3>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0, fontFamily: 'monospace' }}>ID: {usuario.id}</p>
            </div>
          </div>
          <button className="btn-fechar" onClick={aoFechar}><X size={20} /></button>
        </header>

        <div className="modal-body">
          {mensagem.texto && (
            <div className={`mensagem-alerta ${mensagem.tipo}`}>
              {mensagem.tipo === 'sucesso' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{mensagem.texto}</span>
            </div>
          )}

          <form onSubmit={salvarAlteracoes} id="form-edicao-usuario">
            {/* Cabeçalho de Foto */}
            <div className="edicao-usuario-avatar">
              <div className="avatar-preview-container" style={{ borderColor: usuarioEditadoEhRoot ? '#fbbf24' : '#0ea5e9' }}>
                {form.foto_url ? (
                  <img src={form.foto_url} alt="Foto de perfil" />
                ) : (
                  <div className="avatar-placeholder">
                    {form.nome_completo?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: 0 }}>Avatar do Usuário</p>
                    {usuarioEditadoEhRoot && <ShieldCheck size={14} color="#fbbf24" />}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>A foto é alterada pelo jogador em seu perfil.</span>
              </div>
            </div>

            <div className="secao-titulo-modal">
              <User size={14} /> Informações Básicas
            </div>

            <div className="grupo-input">
              <label>E-mail (Login) <Tooltip texto="O e-mail não pode ser alterado diretamente por segurança." /></label>
              <div className="campo-input desabilitado" style={{ opacity: 0.8 }}>
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

            <div className="grade-2">
              <div className="grupo-input">
                <label>Data de Nascimento</label>
                <div className="campo-input">
                  <span className="icone"><Calendar size={16} /></span>
                  <input type="date" value={form.data_nascimento} onChange={set('data_nascimento')} />
                </div>
              </div>
              <div className="grupo-input">
                <label>Gênero</label>
                <div className="campo-input">
                  <span className="icone"><Users size={16} /></span>
                  <select value={form.genero} onChange={set('genero')}>
                    <option value="">Selecione...</option>
                    {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
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

            <div className="secao-titulo-modal">
              <MapPin size={14} /> Endereço Residencial
            </div>
            
            <div className="grade-2">
              <div className="grupo-input">
                <label>CEP</label>
                <div className="campo-input">
                  <span className="icone"><MapPin size={16} /></span>
                  <input value={form.cep} onChange={set('cep')} />
                </div>
              </div>
              <div className="grupo-input">
                <label>Rua</label>
                <div className="campo-input">
                  <span className="icone"><MapPin size={16} /></span>
                  <input value={form.rua} onChange={set('rua')} />
                </div>
              </div>
            </div>

            <div className="grade-2">
              <div className="grupo-input">
                <label>Número</label>
                <div className="campo-input">
                  <span className="icone"><MapPin size={16} /></span>
                  <input value={form.numero} onChange={set('numero')} />
                </div>
              </div>
              <div className="grupo-input">
                <label>Complemento</label>
                <div className="campo-input">
                  <span className="icone"><MapPin size={16} /></span>
                  <input value={form.complemento} onChange={set('complemento')} />
                </div>
              </div>
            </div>

            <div className="grupo-input">
              <label>Bairro</label>
              <div className="campo-input">
                <span className="icone"><MapPin size={16} /></span>
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

            <div className="secao-titulo-modal">
              <Shield size={14} /> Permissões e Privacidade
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
              <label className="checkbox-label" style={{ opacity: ehMenorDeIdade ? 0.5 : 1, cursor: ehMenorDeIdade ? 'not-allowed' : 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={form.perfil_publico}
                  disabled={ehMenorDeIdade}
                  onChange={(e) => !ehMenorDeIdade && setForm(prev => ({ ...prev, perfil_publico: e.target.checked }))} 
                />
                <div className="checkbox-texto">Perfil Público na plataforma</div>
                <Tooltip texto="Se ativado, o jogador aparece na busca global de atletas." />
              </label>

              <label className="checkbox-label" style={{ opacity: ehMenorDeIdade ? 0.5 : 1, cursor: ehMenorDeIdade ? 'not-allowed' : 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={form.compartilhar_whatsapp_match}
                  disabled={ehMenorDeIdade}
                  onChange={(e) => !ehMenorDeIdade && setForm(prev => ({ ...prev, compartilhar_whatsapp_match: e.target.checked }))} 
                />
                <div className="checkbox-texto">Compartilhar WhatsApp no Match</div>
                <Tooltip texto="Ativa a visibilidade do número para matches confirmados." />
              </label>

              {ehMenorDeIdade && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', fontSize: '0.8rem', color: '#fca5a5' }}>
                  🔒 Privacidade bloqueada: usuário menor de 18 anos. Nem o Super Admin pode ativar essas opções.
                </div>
              )}

              {/* Seção de Administrador - Somente Root pode atribuir cargos administrativos */}
              {euSouRoot && (
                <div style={{ marginTop: '0.5rem', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '1rem', background: 'rgba(255,255,255,0.01)' }}>
                  {ehMenorDeIdade && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', fontSize: '0.8rem', color: '#fca5a5', marginBottom: '0.75rem' }}>
                      🔒 Menores de 18 anos não podem ser administradores do sistema.
                    </div>
                  )}
                  <label className="checkbox-label" style={{ border: 'none', background: 'transparent', padding: 0, marginBottom: form.eh_super_admin ? '1rem' : 0, opacity: ehMenorDeIdade ? 0.4 : 1, cursor: ehMenorDeIdade ? 'not-allowed' : 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={form.eh_super_admin}
                      disabled={usuarioEditadoEhRoot || ehMenorDeIdade}
                      onChange={(e) => !ehMenorDeIdade && setForm(prev => ({ ...prev, eh_super_admin: e.target.checked }))} 
                    />
                    <div className="checkbox-texto" style={{ color: form.eh_super_admin ? '#fbbf24' : 'inherit', fontWeight: form.eh_super_admin ? 'bold' : 'normal' }}>
                      <Shield size={16} /> 
                      <span>{usuarioEditadoEhRoot ? 'Super Administrador (Root)' : 'Administrador do Sistema (Co-Admin)'}</span>
                    </div>
                    {!usuarioEditadoEhRoot && <Tooltip texto="Dá acesso ao painel administrativo. Você poderá definir permissões específicas abaixo." />}
                  </label>

                  {form.eh_super_admin && !usuarioEditadoEhRoot && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '1.75rem', borderLeft: '2px solid rgba(251, 191, 36, 0.2)' }}>
                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Permissões do Co-Admin:</p>
                        
                        <label className="checkbox-label" style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.03)' }}>
                            <input 
                                type="checkbox" 
                                checked={form.admin_permissoes?.usuarios}
                                onChange={() => togglePermissao('usuarios')}
                            />
                            <div className="checkbox-texto" style={{ fontSize: '0.85rem' }}>Gerenciar Usuários (Global)</div>
                        </label>

                        <label className="checkbox-label" style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.03)' }}>
                            <input 
                                type="checkbox" 
                                checked={form.admin_permissoes?.equipes}
                                onChange={() => togglePermissao('equipes')}
                            />
                            <div className="checkbox-texto" style={{ fontSize: '0.85rem' }}>Gerenciar Equipes (Global)</div>
                        </label>
                    </div>
                  )}
                </div>
              )}

              {/* Se o usuário sendo editado for admin mas quem edita NÃO for root, mostra apenas um selo informativo */}
              {!euSouRoot && form.eh_super_admin && (
                <div className="mensagem-alerta" style={{ background: 'rgba(251, 191, 36, 0.05)', border: '1px solid rgba(251, 191, 36, 0.1)', color: '#fbbf24', marginTop: '0.5rem' }}>
                    <Shield size={16} />
                    <span>Este usuário possui privilégios de Administrador. Somente o Super Admin Root pode gerenciar estas permissões.</span>
                </div>
              )}
            </div>
          </form>

          <div className="perfil-cartao" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {perfilEsportivo.map((esporte) => (
                  <div key={esporte.id} style={{ display: 'flex', flexDirection: 'column', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', minWidth: '120px' }}>
                    <strong style={{ color: '#f8fafc', fontSize: '0.85rem' }}>{esporte.modalidade}</strong>
                    <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{esporte.nivel_habilidade}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Este jogador não possui modalidades cadastradas.</p>
            )}
          </div>

          <div className="acoes-admin-modal" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', marginBottom: '1rem' }}>
            <Botao 
              type="button" 
              variant="secundario" 
              onClick={enviarRecuperacaoSenha}
              disabled={carregando}
              style={{ flex: 1, minWidth: '200px', background: 'rgba(56, 189, 248, 0.05)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.1)' }}
            >
              <Key size={18} /> Recuperar Senha
            </Botao>
            <Botao 
              type="button"
              onClick={salvarAlteracoes}
              disabled={carregando} 
              style={{ flex: 1, minWidth: '150px' }}
            >
              <Save size={18} /> {carregando ? 'Salvando...' : 'Salvar'}
            </Botao>
            <Botao 
              type="button" 
              variant="secundario" 
              onClick={excluirConta}
              disabled={carregando || usuarioEditadoEhRoot} // Root não pode ser excluído
              style={{ flex: '1 1 100%', background: 'rgba(244, 63, 94, 0.05)', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.1)', marginTop: '0.5rem', opacity: usuarioEditadoEhRoot ? 0.5 : 1 }}
            >
              <Trash2 size={18} /> Excluir Conta Definitivamente
            </Botao>
          </div>
        </div>
      </div>

      <ModalPerfilAtleta 
        isOpen={exibindoPerfilAtleta}
        onClose={() => setExibindoPerfilAtleta(false)}
        idAtleta={usuario.id}
      />
    </div>
  );
};

export default ModalEdicaoUsuario;
