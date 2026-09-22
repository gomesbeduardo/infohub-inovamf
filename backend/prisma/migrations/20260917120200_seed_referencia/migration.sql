-- Dados de referência (read-only pela API): as 6 etapas do funil e as áreas
-- de ideia. Idempotente — reaplicar não duplica nem sobrescreve edição manual.

INSERT INTO "etapas" (id, numero, nome, entregavel) VALUES
    (1, 1, 'Envio da ideia',                   'Cadastro da ideia (formulário)'),
    (2, 2, 'Contato com a equipe',             'Agendamento confirmado'),
    (3, 3, 'Encontro 1 – Entendendo a ideia',  'Problema, público-alvo e solução definidos'),
    (4, 4, 'Encontro 2 – Proposta de valor',   'Value Proposition Design'),
    (5, 5, 'Encontro 3 – Modelo de negócio',   'Business Model Canvas'),
    (6, 6, 'Encontro 4 – Pitch e inscrição',   'Pitch Vídeo, Canvas final, VPD final, dados de todos os integrantes')
ON CONFLICT (id) DO NOTHING;

INSERT INTO "areas_ideia" (nome, ordem) VALUES
    ('Educação', 1),
    ('Saúde', 2),
    ('Tecnologia', 3),
    ('Sustentabilidade', 4)
ON CONFLICT (nome) DO NOTHING;

-- `areas_ideia.id` é SERIAL: alinha a sequence com os ids já inseridos.
SELECT setval(pg_get_serial_sequence('areas_ideia', 'id'),
              COALESCE((SELECT MAX(id) FROM "areas_ideia"), 1));
