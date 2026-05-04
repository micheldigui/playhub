import React, { useState, useEffect } from 'react';
import { 
  X, User, Mail, Phone, MapPin, Shield, CheckCircle2, AlertCircle, Save, Trash2, Key, Activity, Eye, Calendar, Users, ShieldCheck, Camera
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
    admin_permissoes: usuario.admin_permissoes || { usuarios: false, equipes: false, estatisticas: false }
  });

  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
  const [perfilEsportivo, setPerfilEsportivo] = useState([]);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [exibindoPerfilAtleta, setExibindoPerfilAtleta] = useState(false);
  const [arquivoFoto, setArquivoFoto] = useState(null);

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

  const handleSelecionarFoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setMensagem({ tipo: 'erro', texto: 'A imagem deve ter no máximo 2MB.' });
        return;
      }
      setArquivoFoto(file);
      setForm(prev => ({ ...prev, foto_url: URL.createObjectURL(file) }));
    }
  };

  const salvarAlteracoes = async () => {
    setCarregando(true);
    setMensagem({ tipo: '', texto: '' });

    // Garantir que menores de 18 sempre tenham privacidade forçada
    const perfilPublicoFinal = ehMenorDeIdade ? false : form.perfil_publico;
    const whatsappFinal = ehMenorDeIdade ? false : form.compartilhar_whatsapp_match;

    try {
      // Verifica e faz upload da foto antes de salvar o formulário
      if (arquivoFoto) {
        const extensao = arquivoFoto.name.split('.').pop();
        // Sobe na pasta DO ADMIN logado para burlar a RLS de Storage que restringe pasta pelo Auth UID.
        const caminho = `${eu.id}/admin-upload-para-${usuario.id}-${Date.now()}.${extensao}`;
        const { error: uploadError } = await supabase.storage.from('avatares').upload(caminho, arquivoFoto);
        if (uploadError) throw new Error('Erro no upload da foto: ' + uploadError.message);
        
        const { data: imgData } = supabase.storage.from('avatares').getPublicUrl(caminho);
        const fotoUrlFinal = imgData.publicUrl;
        
        // Atualiza a foto via RPC para bypass das politicas de RLS (igual ocorre no salvarAlteracoes principal)
        const { error: rlsError } = await supabase.rpc('admin_atualizar_foto_usuario', { p_usuario_id: usuario.id, p_foto_url: fotoUrlFinal });
        
        if (rlsError) {
          console.warn('Erro ao chamar a RPC admin_atualizar_foto_usuario', rlsError);
          setMensagem({ tipo: 'erro', texto: 'A foto foi enviada, mas não salva no banco. Rode o SQL fornecido no terminal do Supabase.' });
        } else {
          form.foto_url = fotoUrlFinal;
        }
      }

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
        p_admin_permissoes: ehMenorDeIdade ? { usuarios: false, equipes: false, estatisticas: false } : form.admin_permissoes
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
    // 1. Verificacao Crucial de Integridade (Previne Crash Cascata)
    setCarregando(true);
    try {
        const { data: equipesLideradas, error: errEquipes } = await supabase
            .from('equipes')
            .select('nome')
            .eq('admin_id', usuario.id);
            
        if (errEquipes) throw errEquipes;
        
        if (equipesLideradas && equipesLideradas.length > 0) {
            const nomes = equipesLideradas.map(e => e.nome).join(', ');
            alert(`Ação Negada: Esta conta não pode ser excluída pois o jogador é Capitão (Dono) da(s) equipe(s): ${nomes}.\n\nRecomende que ele repasse a liderança para outro membro, ou remame/exclua a equipe você mesmo através do Painel de Equipes antes de prosseguir com a deleção da conta.`);
            setCarregando(false);
            return;
        }
    } catch (err) {
        console.error('Erro ao verificar dependências do jogador:', err);
        setMensagem({ tipo: 'erro', texto: 'Erro ao validar conta: ' + err.message });
        setCarregando(false);
        return;
    }

    const confirmacao = window.confirm(
      `ATENÇÃO: Você está prestes a EXCLUIR DEFINITIVAMENTE a conta de ${usuario.nome_completo || usuario.email}.\n\nEsta ação não pode ser desfeita e removerá imediatamente o jogador de todas as equipes e partidas.\n\nDeseja continuar?`
    );
    
    if (!confirmacao) {
        setCarregando(false);
        return;
    }
    
    setMensagem({ tipo: '', texto: '' });
    
    try {
      const { error } = await supabase.rpc('admin_excluir_usuario_v2', {
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

  const getIniciaisAtleta = (u) => {
    if (!u) return '??';
    const nome = u.nome_completo || '';
    const apelido = u.apelido || '';
    if (apelido) {
      const partes = apelido.trim().split(/[\s._-]+/);
      if (partes.length > 1) return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
      return apelido.substring(0, 2).toUpperCase();
    }
    if (!nome) return '??';
    const partes = nome.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
  };

  const formatarNomePremium = (nome) => {
    if (!nome) return 'Sem Nome';
    const partes = nome.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase();
    
    const primeiro = partes[0].charAt(0).toUpperCase() + partes[0].slice(1).toLowerCase();
    const ultimo = partes[partes.length - 1].charAt(0).toUpperCase() + partes[partes.length - 1].slice(1).toLowerCase();
    return `${primeiro} ${ultimo}`;
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animacao-entrada" style={{ maxWidth: '750px', width: '95%', maxHeight: '92vh', overflowY: 'auto', borderRadius: '24px' }}>
        <header className="modal-header" style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="primaria-icon" style={{ background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(14, 165, 233, 0) 100%)', padding: '10px', borderRadius: '12px', color: '#0ea5e9', border: '1px solid rgba(14, 165, 233, 0.2)' }}>
              <User size={26} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800', letterSpacing: '-0.02em' }}>Gestão de Usuário</h3>
              <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '2px 0 0 0', fontWeight: '500', opacity: 0.8 }}>ID: {usuario.id}</p>
            </div>
          </div>
          <button className="btn-fechar" onClick={aoFechar} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '50%', padding: '8px' }}><X size={20} /></button>
        </header>

        <div className="modal-body" style={{ padding: '0 2rem 2rem 2rem' }}>
          {mensagem.texto && (
            <div className={`mensagem-alerta ${mensagem.tipo}`} style={{ marginTop: '1.5rem' }}>
              {mensagem.tipo === 'sucesso' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span>{mensagem.texto}</span>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); salvarAlteracoes(); }} id="form-edicao-usuario">
            {/* Cabeçalho de Foto Premium */}
            <div className="edicao-usuario-avatar">
              <div style={{ position: 'relative' }}>
                <div className="avatar-preview-container" style={{ borderColor: usuarioEditadoEhRoot ? '#fbbf24' : '#0ea5e9' }}>
                  {form.foto_url ? (
                    <img src={form.foto_url} alt="Foto de perfil" />
                  ) : (
                    <div className="avatar-placeholder">
                      {getIniciaisAtleta({ ...usuario, nome_completo: form.nome_completo, apelido: form.apelido })}
                    </div>
                  )}
                </div>
                <label className="btn-upload-admin" style={{ position: 'absolute', bottom: '0px', right: '0px', background: '#0ea5e9', padding: '8px', borderRadius: '14px', cursor: 'pointer', display: 'flex', border: '4px solid #111827', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} title="Trocar Foto Opcional">
                    <Camera size={18} color="white" />
                    <input type="file" accept="image/*" onChange={handleSelecionarFoto} style={{ display: 'none' }} disabled={carregando} />
                </label>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff' }}>{formatarNomePremium(form.nome_completo)}</h4>
                    {usuarioEditadoEhRoot && <ShieldCheck size={16} color="#fbbf24" />}
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>{usuario.email}</span>
              </div>
            </div>

            <div className="secao-titulo-modal" style={{ marginTop: 0 }}>
              <User size={14} /> Informações de Identidade
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
                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Nome Completo</label>
                <div className="campo-input">
                  <span className="icone" style={{ color: '#0ea5e9' }}><User size={16} /></span>
                  <input required value={form.nome_completo} onChange={set('nome_completo')} placeholder="Ex: João Silva" />
                </div>
              </div>
              <div className="grupo-input">
                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Apelido / Handle</label>
                <div className="campo-input">
                  <span className="icone" style={{ color: '#0ea5e9' }}><User size={16} /></span>
                  <input value={form.apelido} onChange={set('apelido')} placeholder="Ex: joaosilva" />
                </div>
                {form.apelido && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--primaria)', marginTop: '4px', fontWeight: '600' }}>
                    Preview: @{form.apelido.split(/[\s._-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('')}
                  </p>
                )}
              </div>
            </div>

            <div className="grade-2" style={{ marginTop: '1rem' }}>
              <div className="grupo-input">
                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Data de Nascimento</label>
                <div className="campo-input">
                  <span className="icone" style={{ color: '#0ea5e9' }}><Calendar size={16} /></span>
                  <input type="date" value={form.data_nascimento} onChange={set('data_nascimento')} />
                </div>
              </div>
              <div className="grupo-input">
                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Gênero</label>
                <div className="campo-input">
                  <span className="icone" style={{ color: '#0ea5e9' }}><Users size={16} /></span>
                  <select value={form.genero} onChange={set('genero')}>
                    <option value="">Selecione...</option>
                    {GENEROS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grupo-input" style={{ marginTop: '1rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Telefone / WhatsApp</label>
              <div className="campo-input">
                <span className="icone" style={{ color: '#0ea5e9' }}><Phone size={16} /></span>
                <input value={form.telefone} onChange={set('telefone')} placeholder="(00) 00000-0000" />
              </div>
            </div>

            <div className="secao-titulo-modal">
              <MapPin size={14} /> Endereço Residencial
            </div>
            
            <div className="grade-2">
              <div className="grupo-input">
                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px', display: 'block' }}>CEP</label>
                <div className="campo-input">
                  <span className="icone" style={{ color: '#0ea5e9' }}><MapPin size={16} /></span>
                  <input value={form.cep} onChange={set('cep')} placeholder="00000-000" />
                </div>
              </div>
              <div className="grupo-input">
                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Rua</label>
                <div className="campo-input">
                  <span className="icone" style={{ color: '#0ea5e9' }}><MapPin size={16} /></span>
                  <input value={form.rua} onChange={set('rua')} />
                </div>
              </div>
            </div>

            <div className="grade-2" style={{ marginTop: '1rem' }}>
              <div className="grupo-input">
                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Número</label>
                <div className="campo-input">
                  <span className="icone" style={{ color: '#0ea5e9' }}><MapPin size={16} /></span>
                  <input value={form.numero} onChange={set('numero')} />
                </div>
              </div>
              <div className="grupo-input">
                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Complemento</label>
                <div className="campo-input">
                  <span className="icone" style={{ color: '#0ea5e9' }}><MapPin size={16} /></span>
                  <input value={form.complemento} onChange={set('complemento')} />
                </div>
              </div>
            </div>

            <div className="grade-2" style={{ marginTop: '1rem' }}>
              <div className="grupo-input">
                <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Bairro</label>
                <div className="campo-input">
                  <span className="icone" style={{ color: '#0ea5e9' }}><MapPin size={16} /></span>
                  <input value={form.bairro} onChange={set('bairro')} />
                </div>
              </div>
              <div className="grupo-input" style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Cidade</label>
                  <div className="campo-input">
                    <input value={form.cidade} onChange={set('cidade')} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: '600', marginBottom: '6px', display: 'block' }}>UF</label>
                  <div className="campo-input" style={{ padding: '0 8px' }}>
                    <input value={form.estado} onChange={set('estado')} maxLength={2} style={{ textAlign: 'center' }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="secao-titulo-modal">
              <Shield size={14} /> Permissões e Segurança
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <label className="checkbox-label" style={{ opacity: ehMenorDeIdade ? 0.5 : 1, cursor: ehMenorDeIdade ? 'not-allowed' : 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={form.perfil_publico}
                  disabled={ehMenorDeIdade}
                  onChange={(e) => !ehMenorDeIdade && setForm(prev => ({ ...prev, perfil_publico: e.target.checked }))} 
                />
                <div className="checkbox-texto">
                  <span style={{ fontWeight: '600' }}>Perfil Público</span>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Aparecer na busca global de atletas da plataforma</p>
                </div>
              </label>

              <label className="checkbox-label" style={{ opacity: ehMenorDeIdade ? 0.5 : 1, cursor: ehMenorDeIdade ? 'not-allowed' : 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={form.compartilhar_whatsapp_match}
                  disabled={ehMenorDeIdade}
                  onChange={(e) => !ehMenorDeIdade && setForm(prev => ({ ...prev, compartilhar_whatsapp_match: e.target.checked }))} 
                />
                <div className="checkbox-texto">
                  <span style={{ fontWeight: '600' }}>Compartilhar WhatsApp no Match</span>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Libera o contato para matches confirmados (mútuos)</p>
                </div>
              </label>

              {ehMenorDeIdade && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', fontSize: '0.8rem', color: '#fca5a5' }}>
                  <ShieldCheck size={18} />
                  <span>Privacidade bloqueada por segurança (usuário menor de 18 anos).</span>
                </div>
              )}

              {/* Seção de Administrador Premium - Somente Root pode atribuir cargos administrativos */}
              {euSouRoot && (
                <div style={{ marginTop: '0.5rem', border: '1px solid rgba(251, 191, 36, 0.15)', borderRadius: '16px', padding: '1.25rem', background: 'rgba(251, 191, 36, 0.02)' }}>
                  <label className="checkbox-label" style={{ border: 'none', background: 'transparent', padding: 0, marginBottom: form.eh_super_admin ? '1.25rem' : 0, opacity: ehMenorDeIdade ? 0.4 : 1, cursor: ehMenorDeIdade ? 'not-allowed' : 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={form.eh_super_admin}
                      disabled={usuarioEditadoEhRoot || ehMenorDeIdade}
                      onChange={(e) => !ehMenorDeIdade && setForm(prev => ({ ...prev, eh_super_admin: e.target.checked }))} 
                    />
                    <div className="checkbox-texto">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: form.eh_super_admin ? '#fbbf24' : 'inherit', fontWeight: '700' }}>
                        <Shield size={16} /> 
                        <span>{usuarioEditadoEhRoot ? 'Super Administrador (Root)' : 'Administrador do Sistema (Co-Admin)'}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Acesso ao painel de controle global da plataforma</p>
                    </div>
                  </label>

                  {form.eh_super_admin && !usuarioEditadoEhRoot && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '2rem', borderLeft: '2px solid rgba(251, 191, 36, 0.2)' }}>
                        <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>Permissões Granulares:</p>
                        
                        <label className="checkbox-label" style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                            <input 
                                type="checkbox" 
                                checked={form.admin_permissoes?.usuarios}
                                onChange={() => togglePermissao('usuarios')}
                            />
                            <div className="checkbox-texto" style={{ fontSize: '0.85rem', fontWeight: '600' }}>Gestão de Usuários</div>
                        </label>

                        <label className="checkbox-label" style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                            <input 
                                type="checkbox" 
                                checked={form.admin_permissoes?.equipes}
                                onChange={() => togglePermissao('equipes')}
                            />
                            <div className="checkbox-texto" style={{ fontSize: '0.85rem', fontWeight: '600' }}>Gestão de Equipes</div>
                        </label>

                        <label className="checkbox-label" style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px' }}>
                            <input 
                                type="checkbox" 
                                checked={form.admin_permissoes?.estatisticas}
                                onChange={() => togglePermissao('estatisticas')}
                            />
                            <div className="checkbox-texto" style={{ fontSize: '0.85rem', fontWeight: '600' }}>Gestão de Estatísticas</div>
                        </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </form>

          <div className="perfil-cartao" style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.05)', padding: '1.25rem', borderRadius: '16px', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem', color: '#f8fafc', margin: 0, fontWeight: '700' }}>
                <Activity size={18} color="#0ea5e9" />
                Perfil Esportivo
              </h4>
              <button 
                type="button" 
                onClick={() => setExibindoPerfilAtleta(true)}
                style={{ background: 'rgba(14, 165, 233, 0.1)', border: 'none', color: '#0ea5e9', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}
              >
                <Eye size={14} /> Visualizar Perfil
              </button>
            </div>
            
            {carregandoPerfil ? (
              <p style={{ fontSize: '0.8rem', color: '#64748b' }}>Carregando modalidades...</p>
            ) : perfilEsportivo.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                {perfilEsportivo.map((esporte) => (
                  <div key={esporte.id} style={{ display: 'flex', flexDirection: 'column', padding: '0.75rem', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', minWidth: '130px' }}>
                    <strong style={{ color: '#fff', fontSize: '0.85rem', marginBottom: '2px' }}>{esporte.modalidade}</strong>
                    <span style={{ fontSize: '0.7rem', color: '#0ea5e9', fontWeight: '600', textTransform: 'uppercase' }}>{esporte.nivel_habilidade}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>Nenhuma modalidade esportiva vinculada.</p>
            )}
          </div>

          <div className="acoes-admin-modal" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <Botao 
              type="button" 
              variant="secundario" 
              onClick={enviarRecuperacaoSenha}
              disabled={carregando}
              style={{ background: 'rgba(14, 165, 233, 0.04)', color: '#0ea5e9', borderColor: 'rgba(14, 165, 233, 0.1)', height: '48px' }}
            >
              <Key size={18} /> Recuperar Senha
            </Botao>
            <Botao 
              type="button"
              onClick={salvarAlteracoes}
              disabled={carregando} 
              style={{ height: '48px', fontWeight: '700', boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)' }}
            >
              <Save size={18} /> {carregando ? 'Processando...' : 'Aplicar Alterações'}
            </Botao>
            <Botao 
              type="button" 
              variant="secundario" 
              onClick={excluirConta}
              disabled={carregando || usuarioEditadoEhRoot} 
              style={{ gridColumn: '1 / -1', background: 'rgba(244, 63, 94, 0.04)', color: '#fca5a5', borderColor: 'rgba(244, 63, 94, 0.1)', height: '48px', opacity: usuarioEditadoEhRoot ? 0.3 : 1 }}
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
