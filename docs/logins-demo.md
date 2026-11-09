# InfoHub G1: contas de demonstração

As contas são criadas pelo seed (`backend/src/seed/base.ts` e `backend/src/seed/demo.ts`, com `SEED_DEMO=true`). Elas existem no ambiente local depois de `npm --prefix backend run seed` com `SEED_DEMO=true`. A tela de login tem um bloco **Acesso rápido** com um botão por papel (Admin, Mentor, Aluno).

**Local:** http://localhost:3000/login

> São credenciais **de demonstração**, fixas no seed e só para uso local. Contas `@demo.infohub.dev` saem com `npm --prefix backend run seed:demo:purge`.

## Senhas por papel

| Papel | Senha |
|---|---|
| Admin | `admin123` |
| Mentor | `mentor123` |
| Aluno | `aluno123` |

## Admin

| Nome | E-mail |
|---|---|
| Coordenação InfoHub | `admin@infohub.dev` |

## Mentores

| Nome | E-mail | Acompanha |
|---|---|---|
| Carla Menezes | `mentor1@demo.infohub.dev` | EcoRota e SaúdeJá (2 equipes) |
| Rafael Dornelles | `mentor2@demo.infohub.dev` | Aprende+ |
| Juliana Prates | `mentor3@demo.infohub.dev` | nenhuma (livre) |
| Marcos Tavares | `mentor4@demo.infohub.dev` | nenhuma (livre) |

## Alunos, por equipe

### EcoRota: Etapa 2 · mentora Carla
Etapa 1 aprovada. Não tem pendências, então **avança normalmente**.

| Nome | E-mail | Papel |
|---|---|---|
| Bruna Lopes | `bruna.lopes@demo.infohub.dev` | **líder** |
| Diego Ramos | `diego.ramos@demo.infohub.dev` | integrante |
| Larissa Kunz | `larissa.kunz@demo.infohub.dev` | integrante |
| Rafaela Bortolini | `rafaela.bortolini@demo.infohub.dev` | integrante |

### SaúdeJá: Etapa 2 · mentora Carla
Etapa 1 aprovada. Tem **tarefa atrasada** ("Confirmar agendamento do primeiro encontro"), então **avançar dá bloqueio (RN-01)**; para passar, é preciso forçar com observação.

| Nome | E-mail | Papel |
|---|---|---|
| Pedro Henrique Souza | `pedro.souza@demo.infohub.dev` | **líder** |
| Camila Fontana | `camila.fontana@demo.infohub.dev` | integrante |
| Thiago Weber | `thiago.weber@demo.infohub.dev` | integrante |
| Lucas Andrade | `lucas.andrade@demo.infohub.dev` | integrante |

### Aprende+: Etapa 1 · mentor Rafael

| Nome | E-mail | Papel |
|---|---|---|
| Mariana Alves | `mariana.alves@demo.infohub.dev` | **líder** |
| Gustavo Pires | `gustavo.pires@demo.infohub.dev` | integrante |
| Beatriz Nunes | `beatriz.nunes@demo.infohub.dev` | integrante |
| Yasmin Costa | `yasmin.costa@demo.infohub.dev` | integrante |
| Letícia Moraes | `leticia.moraes@demo.infohub.dev` | integrante · **convite pendente** (não loga; serve para mostrar o fluxo de convite, cujo link aparece no log do seed) |

## Cuidados ao testar

- **Uma janela anônima (ou perfil de navegador) por papel.** As abas do mesmo navegador compartilham o login: entrar como mentor numa aba troca o usuário da aba do admin.
- **Ações que mudam dados alteram o cenário da demo:** avançar etapa, avaliar entrega, criar tarefa, trocar senha, aceitar o convite da Letícia. Para refazer o cenário, rode `npm --prefix backend run seed:demo:purge` e depois o seed de novo.
- **Limite de login:** 5 tentativas **erradas** a cada 15 minutos para o mesmo e-mail. Logins certos não contam.
- **O admin não consegue desativar nem rebaixar a própria conta**: o sistema recusa, de propósito.
