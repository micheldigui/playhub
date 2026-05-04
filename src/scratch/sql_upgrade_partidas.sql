-- Script de Upgrade para Tabela de Partidas (Eventos)
-- Adiciona colunas para suportar tipos de eventos, horários de término e observações

ALTER TABLE partidas 
ADD COLUMN IF NOT EXISTS tipo_evento TEXT DEFAULT 'partida',
ADD COLUMN IF NOT EXISTS hora_termino TIME,
ADD COLUMN IF NOT EXISTS observacoes TEXT,
ADD COLUMN IF NOT EXISTS tem_churrasco BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS local_endereco TEXT;

-- Comentários para documentação
COMMENT ON COLUMN partidas.tipo_evento IS 'Tipo do evento: partida, treino, confraternizacao, amistoso, jogo_contra ou personalizado';
COMMENT ON COLUMN partidas.hora_termino IS 'Horário previsto para o encerramento do evento (usado para mover para o histórico)';
COMMENT ON COLUMN partidas.tem_churrasco IS 'Indica se haverá confraternização/churrasco após o evento principal';
COMMENT ON COLUMN partidas.local_endereco IS 'Endereço físico detalhado ou Link de acesso (Discord/Sala) para o evento';
