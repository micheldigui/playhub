
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ftwdixnimxpiigjzxutt.supabase.co',
  'sb_publishable_zGEA8TYPPgkY2JxfXepGnA_WXlraU9I'
);

const PESO_MEDALHA = { 1: 4, 2: 2, 3: 1 };
const TETO_UNICO_MVP = 4;

async function auditRanking() {
  try {
    const { data: votos } = await supabase.from('votos_mvp').select('candidato_id, posicao, partida_id, eleitor_id');
    const { data: presencas } = await supabase.from('partidas_presencas').select('usuario_id, partida_id').eq('frequencia', 'P');
    const { data: perfis } = await supabase.from('usuarios').select('id, nome_completo');
    
    if (!votos) throw new Error('Votos not found');
    if (!perfis) throw new Error('Perfis not found');

    const nomeMap = perfis.reduce((acc, p) => ({ ...acc, [p.id]: p.nome_completo }), {});

    const votantesPorPartida = {};
    votos.forEach(v => {
      if (!votantesPorPartida[v.partida_id]) votantesPorPartida[v.partida_id] = new Set();
      if (v.eleitor_id) votantesPorPartida[v.partida_id].add(v.eleitor_id);
    });

    const stats = {};
    votos.forEach(v => {
      const pts = PESO_MEDALHA[v.posicao] || 0;
      const uid = v.candidato_id;
      if (!stats[uid]) stats[uid] = { pontos: 0, ouros: 0, pratas: 0, bronzes: 0, ptsPorPartida: {} };
      stats[uid].pontos += pts;
      if (v.posicao === 1) stats[uid].ouros++;
      if (v.posicao === 2) stats[uid].pratas++;
      if (v.posicao === 3) stats[uid].bronzes++;
      stats[uid].ptsPorPartida[v.partida_id] = (stats[uid].ptsPorPartida[v.partida_id] || 0) + pts;
    });

    const targets = ['Aline', 'Gustavo', 'Igor', 'João'];
    const ranking = [];

    for (const userId in stats) {
      const s = stats[userId];
      const nome = nomeMap[userId] || 'Desconhecido';
      
      const partidasDoAtleta = presencas.filter(p => p.usuario_id === userId);
      let somaPontosGanhos = 0;
      let somaMax = 0;
      
      partidasDoAtleta.forEach(p => {
        const q = votantesPorPartida[p.partida_id] ? votantesPorPartida[p.partida_id].size : 0;
        if (q === 0) return;
        
        somaMax += q * TETO_UNICO_MVP;
        somaPontosGanhos += s.ptsPorPartida[p.partida_id] || 0;
      });

      const nota = somaMax > 0 ? (somaPontosGanhos / somaMax) * 10 : 0;
      
      if (targets.some(t => nome.includes(t))) {
        ranking.push({
            nome,
            ouros: s.ouros,
            pratas: s.pratas,
            bronzes: s.bronzes,
            pontos: s.pontos,
            teto: somaMax,
            nota: nota.toFixed(2)
        });
      }
    }

    console.log(JSON.stringify(ranking.sort((a,b) => b.nota - a.nota), null, 2));
  } catch (e) {
    console.error('ERRO:', e.message);
  }
}

auditRanking();
