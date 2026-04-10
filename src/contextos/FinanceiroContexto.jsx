import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../servicos/supabase';

const FinanceiroContexto = createContext();

export const FinanceiroProvider = ({ children }) => {
    const [configuracao, setConfiguracao] = useState(null);
    const [carregando, setCarregando] = useState(false);

    // Formata YYYY-MM para MM-YYYY (Exibição)
    const formatarPeriodoParaExibicao = (periodo) => {
        if (!periodo) return '';
        const [ano, mes] = periodo.split('-');
        return `${mes}-${ano}`;
    };

    // Calcula o ciclo atual baseado no dia de vencimento
    const obterCicloAtual = (diaVencimento = 10) => {
        const hoje = new Date();
        const diaAtual = hoje.getDate();
        let dataAlvo = new Date(hoje);

        // Se passou do dia de vencimento, foca no próximo ciclo
        if (diaAtual >= diaVencimento) {
            dataAlvo.setMonth(hoje.getMonth() + 1);
        }

        const ano = dataAlvo.getFullYear();
        const mes = String(dataAlvo.getMonth() + 1).padStart(2, '0');
        return `${ano}-${mes}`;
    };

    // Retorna sempre o mês atual (calendário)
    const obterMesAtual = () => {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        return `${ano}-${mes}`;
    };

    const carregarConfiguracao = useCallback(async (equipeId) => {
        try {
            const { data, error } = await supabase
                .from('financeiro_config')
                .select('*')
                .eq('equipe_id', equipeId)
                .limit(1);

            if (error) throw error;
            
            if (data && data.length > 0) {
                const config = data[0];
                setConfiguracao(config);
                return config;
            } else {
                // Configuração padrão se não existir
                const padrao = {
                    equipe_id: equipeId,
                    valor_mensalidade: 50,
                    valor_avulso_padrao: 20,
                    dia_vencimento: 10,
                    dia_tolerancia: 15,
                    custo_quadra: 0,
                    limite_vencimento_horas: 24,
                    chave_pix: ''
                };
                setConfiguracao(padrao);
                return padrao;
            }
        } catch (error) {
            console.error('Erro ao carregar config financeira:', error);
            return null;
        }
    }, []);

    const salvarConfiguracao = async (config, necessitaBypass = false) => {
        setCarregando(true);
        try {
            if (necessitaBypass) {
                const { error } = await supabase.rpc('admin_bypass_update_financeiro', { p_equipe_id: config.equipe_id, p_config: config });
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('financeiro_config')
                    .upsert(config);

                if (error) throw error;
            }
            setConfiguracao(config);
            return { success: true };
        } catch (error) {
            console.error('Erro ao salvar config financeira:', error);
            return { success: false, error: error.message };
        } finally {
            setCarregando(false);
        }
    };

    const buscarMensalidadesCiclo = async (equipeId, periodo) => {
        try {
            const { data, error } = await supabase
                .from('mensalidades')
                .select('*, usuarios(*)')
                .eq('equipe_id', equipeId)
                .eq('periodo', periodo);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar mensalidades:', error);
            return [];
        }
    };

    const buscarDadosCiclo = async (equipeId, periodo) => {
        try {
            const { data, error } = await supabase
                .from('ciclos_financeiros')
                .select('*')
                .eq('equipe_id', equipeId)
                .eq('periodo', periodo)
                .maybeSingle();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Erro ao buscar metadados do ciclo:', error);
            return { success: false, error: error.message };
        }
    };

    const registrarPagamentoMensalidade = async (mensalidade) => {
        try {
            const { data, error } = await supabase
                .from('mensalidades')
                .upsert(
                    {
                        ...mensalidade,
                        pago_em: mensalidade.status === 'pago' ? new Date().toISOString() : null,
                        atualizado_em: new Date().toISOString()
                    },
                    { onConflict: 'equipe_id,usuario_id,periodo' }
                )
                .select()
                .single();

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erro ao registrar mensalidade:', error);
            return { success: false, error: error.message };
        }
    };

    const removerMensalidade = async (id) => {
        try {
            const { error } = await supabase
                .from('mensalidades')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Contexto: Erro ao remover mensalidade:', error);
            return { success: false, error: error.message };
        }
    };

    const inicializarCiclo = async (equipeId, periodo, membros) => {
        try {
            // 1. Criar ou atualizar o registro do ciclo (Snapshot)
            const snapshot = {
                equipe_id: equipeId,
                periodo: periodo,
                valor_mensalidade_snapshot: configuracao?.valor_mensalidade || 50,
                custo_quadra_snapshot: configuracao?.custo_quadra || 0,
                chave_pix_snapshot: configuracao?.chave_pix || '',
                dia_vencimento_snapshot: configuracao?.dia_vencimento || 10,
                status: 'aberto'
            };

            const { error: erroCiclo } = await supabase
                .from('ciclos_financeiros')
                .upsert(snapshot, { onConflict: 'equipe_id,periodo' });

            if (erroCiclo) throw erroCiclo;

            // 2. Criar as mensalidades para os membros
            const registros = membros.map(m => ({
                equipe_id: equipeId,
                usuario_id: m.usuario_id,
                periodo: periodo,
                valor_configurado: snapshot.valor_mensalidade_snapshot,
                status: 'pendente'
            }));

            const { error: erroMensalidades } = await supabase
                .from('mensalidades')
                .upsert(registros, { onConflict: 'equipe_id,usuario_id,periodo' });

            if (erroMensalidades) throw erroMensalidades;

            return { success: true };
        } catch (error) {
            console.error('Contexto: Erro ao inicializar ciclo:', error);
            return { success: false, error: error.message };
        }
    };

    const removerCiclo = async (equipeId, periodo) => {
        try {
            // 1. Remover mensalidades
            const { error: erroMensalidades } = await supabase
                .from('mensalidades')
                .delete()
                .eq('equipe_id', equipeId)
                .eq('periodo', periodo);

            if (erroMensalidades) throw erroMensalidades;

            // 2. Remover o registro do ciclo
            const { error: erroCiclo } = await supabase
                .from('ciclos_financeiros')
                .delete()
                .eq('equipe_id', equipeId)
                .eq('periodo', periodo);
            
            if (erroCiclo) throw erroCiclo;

            return { success: true };
        } catch (error) {
            console.error('Contexto: Erro ao remover ciclo:', error);
            return { success: false, error: error.message };
        }
    };

    const atualizarValoresMensalidadesCiclo = async (equipeId, periodo, novoValor) => {
        try {
            // 1. Atualiza as mensalidades individuais
            const { error: erroMensalidades } = await supabase
                .from('mensalidades')
                .update({ valor_configurado: novoValor })
                .eq('equipe_id', equipeId)
                .eq('periodo', periodo)
                .eq('status', 'pendente');

            if (erroMensalidades) throw erroMensalidades;

            // 2. Atualiza o snapshot no ciclo
            const { error: erroCiclo } = await supabase
                .from('ciclos_financeiros')
                .update({ valor_mensalidade_snapshot: novoValor })
                .eq('equipe_id', equipeId)
                .eq('periodo', periodo);

            if (erroCiclo) throw erroCiclo;

            return { success: true };
        } catch (error) {
            console.error('Contexto: Erro ao propagar valores no ciclo:', error);
            return { success: false, error: error.message };
        }
    };

    const buscarPagamentosAvulsosPartida = async (partidaId) => {
        try {
            const { data, error } = await supabase
                .from('pagamentos_avulsos')
                .select('*')
                .eq('partida_id', partidaId);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao buscar pagamentos avulsos:', error);
            return [];
        }
    };

    const registrarPagamentoAvulso = async (pagamento) => {
        try {
            const { error } = await supabase
                .from('pagamentos_avulsos')
                .upsert(pagamento);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erro ao registrar pagamento avulso:', error);
            return { success: false, error: error.message };
        }
    };

    const removerPagamentoAvulso = async (partidaId, usuarioId) => {
        try {
            const { error } = await supabase
                .from('pagamentos_avulsos')
                .delete()
                .eq('partida_id', partidaId)
                .eq('usuario_id', usuarioId);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Erro ao remover pagamento avulso:', error);
            return { success: false, error: error.message };
        }
    };

    const buscarHistoricoCiclos = async (equipeId, limite = 12) => {
        try {
            // Busca todas as mensalidades da equipe agrupadas por período
            const { data, error } = await supabase
                .from('mensalidades')
                .select('periodo, status, valor_configurado, usuario_id')
                .eq('equipe_id', equipeId)
                .order('periodo', { ascending: false });

            if (error) throw error;

            // Agrupa por período
            const porPeriodo = {};
            (data || []).forEach(m => {
                if (!porPeriodo[m.periodo]) {
                    porPeriodo[m.periodo] = { periodo: m.periodo, total: 0, pagos: 0, pendentes: 0, valorTotal: 0, valorRecebido: 0 };
                }
                porPeriodo[m.periodo].total++;
                porPeriodo[m.periodo].valorTotal += Number(m.valor_configurado);
                if (m.status === 'pago') {
                    porPeriodo[m.periodo].pagos++;
                    porPeriodo[m.periodo].valorRecebido += Number(m.valor_configurado);
                } else {
                    porPeriodo[m.periodo].pendentes++;
                }
            });

            // Ordena por período (mais recentes primeiro) e limita
            return Object.values(porPeriodo)
                .sort((a, b) => b.periodo.localeCompare(a.periodo))
                .slice(0, limite);
        } catch (error) {
            console.error('Erro ao buscar histórico de ciclos:', error);
            return [];
        }
    };

    const verificarSituacaoFinanceiraAtleta = async (equipeId, usuarioId) => {
        try {
            // 1. Buscar a configuração de vencimento
            const { data: config } = await supabase
                .from('financeiro_config')
                .select('dia_vencimento')
                .eq('equipe_id', equipeId)
                .maybeSingle();

            if (!config || !config.dia_vencimento) {
                return { status: 'ocultar' };
            }

            // 2. Buscar Mensalidades
            const { data: mensalidades, error: errMens } = await supabase
                .from('mensalidades')
                .select('*')
                .eq('equipe_id', equipeId)
                .eq('usuario_id', usuarioId)
                .order('periodo', { ascending: true }); // MAIS ANTIGO PRIMEIRO
            if (errMens) throw errMens;

            let mapaCiclos = {};
            if (mensalidades && mensalidades.length > 0) {
                const periodos = mensalidades.map(m => m.periodo);
                const { data: ciclos, error: errCiclos } = await supabase
                    .from('ciclos_financeiros')
                    .select('periodo, dia_vencimento_snapshot')
                    .eq('equipe_id', equipeId)
                    .in('periodo', periodos);
                if (errCiclos) throw errCiclos;
                mapaCiclos = (ciclos || []).reduce((acc, c) => {
                    acc[c.periodo] = c;
                    return acc;
                }, {});
            }

            const hoje = new Date();
            let statusFinal = 'pago';
            let cicloReferencia = (mensalidades && mensalidades.length > 0) ? mensalidades[mensalidades.length - 1].periodo : 'avulso';
            let bloqueio = false;

            // Avaliar primeira mensalidade pendente
            const primeiraNaoPaga = (mensalidades || []).find(m => m.status !== 'pago');
            if (primeiraNaoPaga) {
                const [ano, mes] = primeiraNaoPaga.periodo.split('-').map(Number);
                const cicData = mapaCiclos[primeiraNaoPaga.periodo];
                const diaVenc = cicData?.dia_vencimento_snapshot || config.dia_vencimento;
                const dataVencimento = new Date(ano, mes - 1, diaVenc, 23, 59, 59);

                cicloReferencia = primeiraNaoPaga.periodo;

                if (hoje > dataVencimento) {
                    statusFinal = 'vencido';
                    bloqueio = true;
                } else {
                    statusFinal = 'pendente';
                }
            }

            // 3. Buscar Avulsos Pendentes
            const { data: avulsosPendentes, error: errAvulsos } = await supabase
                .from('pagamentos_avulsos')
                .select('id, partidas!inner(data, hora)')
                .eq('equipe_id', equipeId)
                .eq('usuario_id', usuarioId)
                .eq('status', 'pendente');

            if (!errAvulsos && avulsosPendentes && avulsosPendentes.length > 0) {
                let temAvulsoVencido = false;
                for (const avulso of avulsosPendentes) {
                    const partida = avulso.partidas;
                    if (partida && partida.data) {
                        const horaIso = partida.hora || '23:59:59';
                        const dataPartida = new Date(`${partida.data}T${horaIso}`);
                        if (hoje > dataPartida) {
                            temAvulsoVencido = true;
                            break;
                        }
                    }
                }

                if (temAvulsoVencido) {
                    statusFinal = 'vencido';
                    bloqueio = true;
                    if (cicloReferencia === 'avulso') cicloReferencia = 'Jogos Anteriores';
                } else if (statusFinal === 'pago') {
                    statusFinal = 'pendente';
                    if (cicloReferencia === 'avulso') cicloReferencia = 'Próximo Jogo';
                }
            }

            // Se for estritamente 'pago' e não tem mensalidades vinculadas, ocultamos (limpa a interface para avulsos sem dívida)
            if (statusFinal === 'pago' && (!mensalidades || mensalidades.length === 0)) {
                return { status: 'ocultar' };
            }

            return { 
                status: statusFinal, 
                // Formata ciclo SOMENTE se parecer um período AAAA-MM
                ciclo: cicloReferencia.includes('-') ? formatarPeriodoParaExibicao(cicloReferencia) : cicloReferencia,
                bloqueio 
            };
        } catch (error) {
            console.error('Erro ao verificar situação financeira:', error);
            return { status: 'ocultar' };
        }
    };

    return (
        <FinanceiroContexto.Provider value={{
            configuracao,
            carregando,
            carregarConfiguracao,
            salvarConfiguracao,
            buscarMensalidadesCiclo,
            buscarDadosCiclo,
            buscarHistoricoCiclos,
            registrarPagamentoMensalidade,
            removerMensalidade,
            removerCiclo,
            atualizarValoresMensalidadesCiclo,
            inicializarCiclo,
            buscarPagamentosAvulsosPartida,
            registrarPagamentoAvulso,
            removerPagamentoAvulso,
            obterCicloAtual,
            obterMesAtual,
            formatarPeriodoParaExibicao,
            verificarSituacaoFinanceiraAtleta
        }}>
            {children}
        </FinanceiroContexto.Provider>
    );
};

export const usarFinanceiro = () => {
    const context = useContext(FinanceiroContexto);
    if (!context) {
        throw new Error('usarFinanceiro deve ser usado dentro de um FinanceiroProvider');
    }
    return context;
};
