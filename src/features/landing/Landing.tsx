import Link from 'next/link';
import { Logo } from '@/design-system/Logo';
import { Button } from '@/design-system/components/Button';
import { Card } from '@/design-system/components/Card';
import { Badge } from '@/design-system/components/Badge';
import { StageTag } from '@/design-system/components/StageTag';
import { SpotlightCard } from './SpotlightCard';
import { CURSOS_AMF } from '@/domain/cursos';
import {
  LightbulbIcon,
  UsersIcon,
  ListChecksIcon,
  MailIcon,
  UploadIcon,
  DashboardIcon,
  TargetIcon,
  CalendarIcon,
  RocketIcon,
  CheckIcon,
  ChevronRightIcon,
  type IconProps,
} from '@/design-system/icons';
import { LandingHeader } from '@/features/landing/LandingHeader';
import { FunilVisual } from '@/features/landing/FunilVisual';
import {
  AREAS_VITRINE,
  CASOS_VITRINE,
  EQUIPES_VITRINE,
  ETAPAS_VITRINE,
  NUMEROS_VITRINE,
  type CasoVitrine,
} from '@/features/landing/conteudo';

type Bloco = {
  icone: (p: IconProps) => JSX.Element;
  titulo: string;
  texto: string;
};

const PILARES: Bloco[] = [
  {
    icone: LightbulbIcon,
    titulo: 'Sua ideia sai do papel',
    texto:
      'Você envia a ideia mesmo crua. A equipe InfoHub analisa, chama para conversar e ajuda a transformar o esboço em um problema, um público e uma solução.',
  },
  {
    icone: UsersIcon,
    titulo: 'Mentoria em quatro encontros',
    texto:
      'Um mentor acompanha a equipe do primeiro encontro ao pitch, com material de apoio e devolutiva a cada entrega.',
  },
  {
    icone: ListChecksIcon,
    titulo: 'Tarefas e prazos claros',
    texto:
      'Cada etapa tem entregáveis definidos — Value Proposition Design, Business Model Canvas, Pitch Vídeo — com prazo visível na sua área.',
  },
  {
    icone: RocketIcon,
    titulo: 'Caminho até o InovAMF',
    texto:
      'Ao concluir a jornada, a equipe fica pronta para ser encaminhada ao centro de inovação InovAMF com o material já organizado.',
  },
];

const RECURSOS: Bloco[] = [
  {
    icone: DashboardIcon,
    titulo: 'Painel do funil',
    texto:
      'A coordenação vê em que etapa cada equipe está e o que falta para avançar.',
  },
  {
    icone: UploadIcon,
    titulo: 'Entregas no sistema',
    texto:
      'Canvas, VPD e Pitch Vídeo enviados como arquivo ou link, com histórico de versões.',
  },
  {
    icone: MailIcon,
    titulo: 'Lembretes por e-mail',
    texto:
      'Avisos automáticos de nova tarefa, prazo próximo e entrega avaliada.',
  },
  {
    icone: CalendarIcon,
    titulo: 'Prazos e ciclos',
    texto:
      'Cada turma tem seu ciclo, com filtro por período para acompanhar a evolução.',
  },
];

function TituloSecao({
  etiqueta,
  titulo,
  texto,
}: {
  etiqueta: string;
  titulo: string;
  texto?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="font-display text-xs font-semibold uppercase tracking-[0.18em] text-primary-text">
        {etiqueta}
      </p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {titulo}
      </h2>
      {texto && (
        <p className="mt-3 text-[0.95rem] leading-relaxed text-text-muted">
          {texto}
        </p>
      )}
    </div>
  );
}

function CardEquipe({
  caso,
  destaque,
}: {
  caso: CasoVitrine;
  destaque?: boolean;
}) {
  return (
    <Card className="h-full">
      <Card.Body className="flex h-full flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg font-bold tracking-tight text-text">
            {caso.nomeIdeia}
          </h3>
          {destaque ? (
            <StageTag etapaId={0}>{caso.status}</StageTag>
          ) : (
            <Badge>{caso.status}</Badge>
          )}
        </div>
        <p className="flex-1 text-sm leading-relaxed text-text-muted">
          {caso.descricao}
        </p>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-subtle">
          <Badge>{caso.area}</Badge>
          <span>·</span>
          <span>
            {caso.integrantes}{' '}
            {caso.integrantes === 1 ? 'integrante' : 'integrantes'}
          </span>
          <span>·</span>
          <span className="truncate">{caso.cursos.join(', ')}</span>
        </div>
      </Card.Body>
    </Card>
  );
}

/**
 * Página pública do InfoHub: explica o programa, mostra a jornada de seis
 * etapas, quem está participando e os casos concluídos, e leva às duas portas
 * de entrada — enviar a ideia (cadastro) ou entrar (login).
 */
export function Landing() {
  return (
    <div className="min-h-screen bg-bg">
      <LandingHeader />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="bg-hero-glow">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div className="motion-fade">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs font-medium text-text-muted">
              <span
                className="inline-flex h-1.5 w-1.5 rounded-full"
                style={{ background: 'var(--primary)' }}
              />
              Faculdade Antonio Meneghetti · InfoHub → InovAMF
            </span>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-tight text-text sm:text-5xl">
              Você tem uma ideia.
              <br />
              Aqui ela vira um negócio.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-text-muted sm:text-lg">
              O InfoHub é o laboratório de empreendedorismo da AMF: seis etapas
              de mentoria que levam o seu esboço até um MVP pronto para o centro
              de inovação InovAMF. Envie a ideia — mesmo que ainda esteja crua.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/cadastro">
                <Button size="lg" className="w-full sm:w-auto">
                  Enviar minha ideia
                  <ChevronRightIcon size={18} />
                </Button>
              </Link>
              <Link href="/login">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto"
                >
                  Já participo — entrar
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-text-subtle">
              O envio da ideia já cria a sua conta de acesso. Leva poucos
              minutos.
            </p>

            <dl className="mt-10 grid grid-cols-2 gap-4 border-t border-border pt-6 sm:grid-cols-4">
              {NUMEROS_VITRINE.map((n) => (
                <div key={n.rotulo}>
                  <dt className="sr-only">{n.rotulo}</dt>
                  <dd>
                    <span className="block font-display text-2xl font-bold text-text">
                      {n.valor}
                    </span>
                    <span className="mt-0.5 block text-xs leading-snug text-text-muted">
                      {n.rotulo}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="motion-fade lg:pl-4">
            <FunilVisual />
          </div>
        </div>
      </section>

      {/* ── O que é ──────────────────────────────────────────────────────── */}
      <section
        id="o-que-e"
        className="scroll-mt-20 border-t border-border py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <TituloSecao
            etiqueta="O que é"
            titulo="Um laboratório para tirar a ideia do papel"
            texto="No InfoHub, alunos de qualquer curso da AMF desenvolvem uma ideia de negócio até o MVP, com apoio de mentores e um roteiro claro do começo ao fim."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PILARES.map(({ icone: Icone, titulo, texto }) => (
              <SpotlightCard key={titulo} className="h-full">
                <Card.Body className="relative">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-[0.875rem] bg-primary-soft text-primary-text">
                    <Icone size={22} />
                  </span>
                  <h3 className="mt-4 font-display text-base font-bold tracking-tight text-text">
                    {titulo}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    {texto}
                  </p>
                </Card.Body>
              </SpotlightCard>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="text-sm text-text-muted">Áreas das ideias:</span>
            {AREAS_VITRINE.map((a) => (
              <Badge key={a} tone="brand">
                {a}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* ── Como funciona ────────────────────────────────────────────────── */}
      <section
        id="como-funciona"
        className="scroll-mt-20 border-t border-border bg-surface-sunken py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <TituloSecao
            etiqueta="Como funciona"
            titulo="Seis etapas, um entregável em cada uma"
            texto="A jornada segue a cartilha do InfoHub. Você sempre sabe em que etapa está, o que precisa entregar e até quando."
          />
          <ol className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {ETAPAS_VITRINE.map((etapa) => (
              <li key={etapa.numero}>
                <Card className="h-full">
                  <Card.Body className="flex h-full flex-col gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold text-[color:var(--primary-fg)] shadow-sm"
                        style={{ background: `var(--stage-${etapa.numero})` }}
                      >
                        {etapa.numero}
                      </span>
                      <h3 className="font-display text-base font-bold tracking-tight text-text">
                        {etapa.nome}
                      </h3>
                    </div>
                    <p className="flex items-start gap-2 text-sm leading-relaxed text-text-muted">
                      <CheckIcon
                        size={16}
                        className="mt-0.5 shrink-0 text-success-text"
                      />
                      <span>
                        <span className="font-medium text-text">
                          Entregável:{' '}
                        </span>
                        {etapa.entregavel}
                      </span>
                    </p>
                  </Card.Body>
                </Card>
              </li>
            ))}
          </ol>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="flex gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.75rem] border border-border bg-surface text-primary-text">
                  <Icone size={20} />
                </span>
                <div>
                  <h3 className="font-display text-sm font-bold tracking-tight text-text">
                    {titulo}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-muted">
                    {texto}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quem participa ───────────────────────────────────────────────── */}
      <section
        id="equipes"
        className="scroll-mt-20 border-t border-border py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <TituloSecao
            etiqueta="Equipes"
            titulo="Quem está no InfoHub agora"
            texto="Equipes de cursos diferentes desenvolvendo ideias em paralelo — a mistura entre áreas é parte do método."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {EQUIPES_VITRINE.map((e) => (
              <CardEquipe key={e.id} caso={e} />
            ))}
          </div>

          <div className="mt-10 rounded-[1.25rem] border border-border bg-surface p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.75rem] bg-primary-soft text-primary-text">
                <TargetIcon size={20} />
              </span>
              <div>
                <h3 className="font-display text-base font-bold tracking-tight text-text">
                  Aberto a todos os cursos da AMF
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-text-muted">
                  Não é preciso ser da tecnologia nem ter um protótipo pronto.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {CURSOS_AMF.map((c) => (
                    <Badge key={c}>{c}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Casos ────────────────────────────────────────────────────────── */}
      <section
        id="casos"
        className="scroll-mt-20 border-t border-border bg-surface-sunken py-16 sm:py-20"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <TituloSecao
            etiqueta="Casos"
            titulo="Ideias que completaram a jornada"
            texto="Equipes que concluíram as seis etapas e seguiram com Canvas, Value Proposition Design e Pitch Vídeo prontos para o InovAMF."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {CASOS_VITRINE.map((c) => (
              <CardEquipe key={c.id} caso={c} destaque />
            ))}
          </div>
        </div>
      </section>

      {/* ── Chamada final ────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-auth-hero py-16 sm:py-20">
        <div className="mx-auto w-full max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Comece pela ideia crua
          </h2>
          <p className="mt-4 text-base leading-relaxed text-white/80">
            Preencha o formulário inicial contando o que você imaginou. A equipe
            InfoHub analisa e chama a sua equipe para o primeiro encontro.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/cadastro">
              <Button size="lg" className="w-full sm:w-auto">
                Enviar minha ideia
                <ChevronRightIcon size={18} />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="secondary"
                className="w-full border-white/25 bg-white/10 text-white hover:border-white/40 hover:bg-white/20 sm:w-auto"
              >
                Entrar na minha área
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Rodapé ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-bg py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <Logo withTagline />
            <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">
              Laboratório de empreendedorismo da Faculdade Antonio Meneghetti —
              acompanhamento da jornada do empreendedor até o InovAMF.
            </p>
          </div>
          <nav
            aria-label="Rodapé"
            className="flex flex-wrap gap-x-6 gap-y-2 text-sm"
          >
            <a href="#o-que-e" className="text-text-muted hover:text-text">
              O que é
            </a>
            <a href="#como-funciona" className="text-text-muted hover:text-text">
              Como funciona
            </a>
            <Link href="/cadastro" className="text-text-muted hover:text-text">
              Enviar ideia
            </Link>
            <Link href="/login" className="text-text-muted hover:text-text">
              Entrar
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
