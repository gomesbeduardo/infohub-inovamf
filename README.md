# InfoHub → InovAMF

Sistema de acompanhamento da jornada do empreendedor no laboratório **InfoHub** da Faculdade Antonio Meneghetti, digitalizando o funil de 6 etapas até o encaminhamento ao centro de inovação **InovAMF**.

Hoje esse acompanhamento é manual — a jornada é guiada por uma cartilha impressa e o contato com os alunos acontece por WhatsApp. O sistema centraliza o cadastro das ideias e equipes, mostra em que etapa cada equipe está, permite atribuir tarefas com prazos, receber os entregáveis e disparar lembretes automáticos por e-mail.

Este repositório é o projeto prático da disciplina de **Arquitetura de Sistemas**, do curso de graduação em Sistemas de Informação. O sistema é construído de forma incremental ao longo da cadeira:

- **Fase 1 (atual)** — levantamento de requisitos e modelagem do banco de dados.
- **Fases futuras** — definição da arquitetura, implementação e evolução do desenho conforme o conteúdo da disciplina avançar.

## Documentação

- [`docs/Infohub_InovAMF_Requisitos.md`](docs/Infohub_InovAMF_Requisitos.md) — documento de requisitos v1.0 (convertido do PDF fornecido pela coordenação): objetivos, perfis de usuário, RF-01 a RF-24, RNF-01 a RNF-07, regras de negócio e as perguntas em aberto Q1–Q7.
- [`docs/sql/infohub_schema.sql`](docs/sql/infohub_schema.sql) — schema PostgreSQL (DDL) derivado dos requisitos: identidade e acesso, equipes e jornada, mentoria, tarefas e entregas versionadas, fila de e-mails e auditoria.

## A jornada

As seis etapas herdadas da cartilha do InfoHub, representadas no sistema como um funil:

| Etapa | Nome | Entregável |
| --- | --- | --- |
| 1 | Envio da ideia | Cadastro da ideia (formulário) |
| 2 | Contato com a equipe | Agendamento confirmado |
| 3 | Encontro 1 – Entendendo a ideia | Problema, público-alvo e solução |
| 4 | Encontro 2 – Proposta de valor | Value Proposition Design |
| 5 | Encontro 3 – Modelo de negócio | Business Model Canvas |
| 6 | Encontro 4 – Pitch e inscrição | Pitch Vídeo, Canvas e VPD finais |

Concluída a etapa 6 com os entregáveis aprovados, a equipe é marcada como **Pronta para o InovAMF**.

## Stack

Frontend web com **dados mockados em memória** (sem backend/persistência nesta fase), guiado por um Design System próprio da marca *infohub*:

- **Next.js 14** (App Router) + **React 18** + **TypeScript** (strict)
- **Tailwind CSS v3** com cores 100% tokenizadas (CSS variables, light/dark)
- **Vitest + React Testing Library + jsdom** (TDD na camada de domínio/repositório)

O scaffold é gerado pelo init oficial do framework (`create-next-app@14`); nenhum arquivo de configuração é escrito à mão.

### Segurança / dependências

`npm audit` acusa vulnerabilidades cujo fix automático (`npm audit fix --force`) exigiria pular para Next 16 + React 19 + eslint 9 (cascata de majors que foge do plano). A decisão foi **manter o Next 14** por ser um projeto acadêmico que roda **localmente**, porque os avisos não são exploráveis neste contexto:

- **esbuild / vite / vitest / postcss / glob** — tooling de **dev/build**; não vai para o artefato final e não recebe input não-confiável.
- **Next.js** (DoS no Image Optimizer, cache poisoning em RSC, SSRF em rewrites) — só afetam apps **self-hosted em produção** usando esses recursos, que este mock não usa.

Ao evoluir para um deploy real, revisar e atualizar as dependências (incluindo o salto de major do Next) faz parte do hardening.

## Estrutura do repositório

Enquanto não há código de aplicação, o repositório guarda apenas os artefatos de análise e modelagem, separados por tipo:

```
docs/                          # documentação do projeto
├── Infohub_InovAMF_Requisitos.md   # requisitos v1.0
└── sql/
    └── infohub_schema.sql          # DDL de referência
```

## Como rodar

```bash
npm install      # instala as dependências
npm run dev      # sobe o app em http://localhost:3000 (redireciona para /login)
npm test         # roda a suíte Vitest (TDD)
npm run build    # build de produção
```

Login mockado do seed: administrador `admin@infohub.dev` / `123456`; aluno `aluno@infohub.dev` / `123456`.

## Status

Em modelagem. Requisitos levantados e schema do banco escrito; o schema está em revisão e os ajustes serão feitos na próxima aula.

Sete pontos ainda dependem de decisão da coordenação (Q1 a Q7 no documento de requisitos) — entre eles se cada integrante da equipe terá login próprio, se o mentor terá perfil separado do administrador e se o Pitch Vídeo será enviado como upload ou como link.
