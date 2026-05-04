import { supabase } from './supabase';

const rpcPerfisPublicosAtiva = import.meta.env.VITE_USAR_RPC_PERFIS_PUBLICOS === 'true';

const erroRpcDesativada = () => Object.assign(
  new Error('RPC de perfis publicos desativada neste ambiente.'),
  { code: 'RPC_PERFIS_DESATIVADA', silencioso: true }
);

export const buscarAtletasPublicosSeguro = async ({
  termo = '',
  cidade = '',
  modalidade = '',
  cidadeReferencia = '',
  estadoReferencia = '',
  limite = 24,
  offset = 0
} = {}) => {
  if (!rpcPerfisPublicosAtiva) throw erroRpcDesativada();

  const { data, error } = await supabase.rpc('buscar_atletas_publicos_seguro', {
    p_termo: termo || null,
    p_cidade: cidade || null,
    p_modalidade: modalidade || null,
    p_cidade_referencia: cidadeReferencia || null,
    p_estado_referencia: estadoReferencia || null,
    p_limite: limite,
    p_offset: offset
  });

  if (error) throw error;
  return data || [];
};

export const obterWhatsAppMatchSeguro = async (atletaId) => {
  if (!rpcPerfisPublicosAtiva) throw erroRpcDesativada();

  const { data, error } = await supabase.rpc('obter_whatsapp_match_seguro', {
    p_atleta_id: atletaId
  });

  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
};

export const buscarPerfilPublicoAtletaSeguro = async (atletaId) => {
  if (!rpcPerfisPublicosAtiva) throw erroRpcDesativada();

  const { data, error } = await supabase.rpc('buscar_perfil_publico_atleta_seguro', {
    p_atleta_id: atletaId
  });

  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
};

export const buscarPrivacidadeAtletaAtual = async (atletaId) => {
  if (!atletaId) return null;

  try {
    const perfilSeguro = await buscarPerfilPublicoAtletaSeguro(atletaId);
    if (perfilSeguro) {
      return {
        id: perfilSeguro.id,
        perfil_publico: perfilSeguro.perfil_publico,
        compartilhar_whatsapp_match: perfilSeguro.compartilhar_whatsapp_match,
        data_nascimento: perfilSeguro.data_nascimento,
        idade: perfilSeguro.idade
      };
    }
  } catch (error) {
    if (!error?.silencioso) {
      console.warn('Falha ao buscar privacidade via RPC segura, usando fallback legado:', error.message);
    }
  }

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, perfil_publico, compartilhar_whatsapp_match')
    .eq('id', atletaId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const buscarPrivacidadeAtletasAtuais = async (atletaIds = []) => {
  const ids = [...new Set((atletaIds || []).filter(Boolean))];
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, perfil_publico, compartilhar_whatsapp_match')
    .in('id', ids);

  if (error) throw error;
  return new Map((data || []).map(item => [item.id, item]));
};
