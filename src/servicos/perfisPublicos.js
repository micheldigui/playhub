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
