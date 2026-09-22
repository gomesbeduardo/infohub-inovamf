import type { PrismaClient } from "@prisma/client";
import { hashSenha } from "../utils/hash.js";
import { novoIdComSlug } from "../utils/slug.js";

// Camada BASE do seed: dados que um InfoHub REAL precisa para funcionar.
// Idempotente — roda em todo boot e nunca sobrescreve o que já existe
// (inclusive a senha do admin, se alguém trocou).

export const ADMIN_EMAIL = "admin@infohub.dev";
export const ADMIN_SENHA = "admin123"; // G1: fixo por decisão do usuário; trocar depois.
export const CICLO_ATUAL = { nome: "2026/2", inicio: "2026-08-01", fim: "2026-12-20" } as const;

// RF-11: modelos pré-configurados por etapa. Etapa 6 = entregáveis finais (RN-02).
export const MODELOS_TAREFA: ReadonlyArray<{
  etapa: number;
  titulo: string;
  descricao: string;
  prazoDias: number;
  ordem: number;
}> = [
  { etapa: 1, titulo: "Revisar e confirmar os dados da ideia", descricao: "Conferir o formulário de inscrição e corrigir o que for preciso.", prazoDias: 3, ordem: 1 },
  { etapa: 2, titulo: "Confirmar agendamento do primeiro encontro", descricao: "Combinar data e horário com o mentor e confirmar.", prazoDias: 5, ordem: 1 },
  { etapa: 3, titulo: "Definir problema, público-alvo e solução", descricao: "Documento curto com as três definições do Encontro 1.", prazoDias: 7, ordem: 1 },
  { etapa: 4, titulo: "Value Proposition Design (VPD)", descricao: "Canvas de proposta de valor preenchido.", prazoDias: 7, ordem: 1 },
  { etapa: 5, titulo: "Business Model Canvas (BMC)", descricao: "Canvas de modelo de negócio preenchido.", prazoDias: 7, ordem: 1 },
  { etapa: 6, titulo: "Pitch vídeo", descricao: "Vídeo de até 3 minutos apresentando a ideia (link).", prazoDias: 10, ordem: 1 },
  { etapa: 6, titulo: "Business Model Canvas final", descricao: "Versão final do BMC.", prazoDias: 10, ordem: 2 },
  { etapa: 6, titulo: "Value Proposition Design final", descricao: "Versão final do VPD.", prazoDias: 10, ordem: 3 },
];

const dia = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

// Chave arbitrária (fixa) do advisory lock do seed de modelos.
const SEED_LOCK_MODELOS = 4_224_101;

export async function seedBase(db: PrismaClient): Promise<void> {
  await db.ciclos.upsert({
    where: { nome: CICLO_ATUAL.nome },
    update: {},
    create: {
      nome: CICLO_ATUAL.nome,
      data_inicio: dia(CICLO_ATUAL.inicio),
      data_fim: dia(CICLO_ATUAL.fim),
    },
  });

  // Duas execuções simultâneas (boots paralelos, arquivos de teste em paralelo)
  // entram em fila aqui: sem UNIQUE(etapa_id, titulo), o "busca e cria" só é
  // seguro serializado. O lock é da transação e se solta sozinho no fim.
  await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${BigInt(SEED_LOCK_MODELOS)})`;
    for (const m of MODELOS_TAREFA) {
      const existe = await tx.modelos_tarefa.findFirst({
        where: { etapa_id: m.etapa, titulo: m.titulo },
        select: { id: true },
      });
      if (!existe) {
        await tx.modelos_tarefa.create({
          data: {
            etapa_id: m.etapa,
            titulo: m.titulo,
            descricao: m.descricao,
            obrigatoria: true,
            prazo_padrao_dias: m.prazoDias,
            ordem: m.ordem,
          },
        });
      }
    }
  });

  const admin = await db.usuarios.findUnique({ where: { email: ADMIN_EMAIL }, select: { id: true } });
  if (!admin) {
    const ids = novoIdComSlug();
    const agora = new Date();
    await db.usuarios.create({
      data: {
        id: ids.id,
        slug: ids.slug,
        nome: "Coordenação InfoHub",
        email: ADMIN_EMAIL,
        senha: await hashSenha(ADMIN_SENHA),
        telefone: "",
        tipo_usuario: "admin",
        convite_aceito_em: agora,
        email_verificado_em: agora,
      },
    });
  }
}
