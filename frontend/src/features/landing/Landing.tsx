import type { CSSProperties } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Logo } from '@/design-system/Logo';
import { Card } from '@/design-system/components/Card';
import { Badge } from '@/design-system/components/Badge';
import { StageTag } from '@/design-system/components/StageTag';
import { AreaTag } from '@/design-system/components/AreaTag';
import { SpotlightCard } from './SpotlightCard';
import { SpotlightField } from './SpotlightField';
import { CURSOS_AMF } from '@/domain/cursos';
import {
  LightbulbIcon,
  UsersIcon,
  ListChecksIcon,
  MailIcon,
  UploadIcon,
  DashboardIcon,
  CalendarIcon,
  RocketIcon,
  ChevronRightIcon,
  MapPinIcon,
  PhoneIcon,
  type IconProps,
} from '@/design-system/icons';
import { cn } from '@/design-system/cn';
import { LandingHeader } from '@/features/landing/LandingHeader';
import { HeroTransformacao } from '@/features/landing/HeroTransformacao';
import { NumerosVitrine } from '@/features/landing/NumerosVitrine';
import { JornadaOnda } from '@/features/landing/JornadaOnda';
import { CarrosselCasos } from '@/features/landing/CarrosselCasos';
import { ProximaSecao } from '@/features/landing/ProximaSecao';
import {
  AREAS_VITRINE,
  CASOS_VITRINE,
  CONTATO_AMF,
  EQUIPES_VITRINE,
  ETAPAS_VITRINE,
  FOTO_AMF,
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
      'Você envia a ideia ainda no começo. A equipe InfoHub analisa, chama para conversar e ajuda a transformar o esboço em um problema, um público e uma solução.',
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

const BOTAO_PRINCIPAL =
  'inline-flex h-12 items-center justify-center gap-2 rounded-[0.625rem] bg-primary px-6 text-[0.95rem] font-medium tracking-[-0.01em] text-primary-fg shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

function TituloSecao({ id, titulo, texto }: { id: string; titulo: string; texto?: string }) {
  return (
    <div className="max-w-2xl">
      <h2 id={id} className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">
        {titulo}
      </h2>
      {texto && <p className="mt-3 text-[0.95rem] leading-relaxed text-text-muted">{texto}</p>}
    </div>
  );
}

function CardEquipe({
  caso,
  destaque,
  reativo = true,
}: {
  caso: CasoVitrine;
  destaque?: boolean;
  /** Aplica o hover com brilho/borda reflexiva (usado só na seção Equipes). */
  reativo?: boolean;
}) {
  const Wrapper = reativo ? SpotlightCard : Card;
  return (
    <Wrapper className="h-full">
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
          <AreaTag area={caso.area} />
          <span>·</span>
          <span>
            {caso.integrantes}{' '}
            {caso.integrantes === 1 ? 'integrante' : 'integrantes'}
          </span>
          <span>·</span>
          <span className="truncate">{caso.cursos.join(', ')}</span>
        </div>
      </Card.Body>
    </Wrapper>
  );
}

/** "Aberto a todos os cursos" (opção 2b): foto da AMF no card inteiro, com véu. */
function CardCursos() {
  return (
    <div
      className={cn(
        'relative mt-10 flex items-end overflow-hidden rounded-[var(--radius-lg)] border border-border bg-auth-hero',
        FOTO_AMF && 'min-h-[24rem] md:min-h-[28rem]',
      )}
    >
      {FOTO_AMF && (
        <Image
          src={FOTO_AMF.src}
          alt={FOTO_AMF.alt}
          fill
          sizes="(min-width: 1152px) 1152px, 100vw"
          className="object-cover object-[center_40%]"
        />
      )}
      <div aria-hidden className="veu-foto absolute inset-0" />
      <div className="relative flex max-w-3xl flex-col gap-3 p-6 sm:p-8">
        <h3 className="font-display text-2xl font-bold tracking-tight text-white">
          Aberto a todos os cursos da AMF
        </h3>
        <p className="text-[0.95rem] leading-relaxed text-white/80">
          Não é preciso ser da tecnologia nem ter um protótipo pronto.
        </p>
        <ul className="mt-1 flex flex-wrap gap-2">
          {CURSOS_AMF.map((c) => (
            <li key={c} className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
              {c}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Página pública do InfoHub: explica o programa, mostra a jornada de seis
 * etapas, quem está participando e os casos concluídos, e leva às duas portas
 * de entrada — enviar a ideia (cadastro) ou entrar (login). Cada seção termina
 * num botão para a próxima.
 */
export function Landing() {
  return (
    <div className="min-h-screen bg-bg">
      <LandingHeader />

      {/* ── Hero: tela cheia, brilho sob o cabeçalho transparente ──────────── */}
      <section aria-labelledby="titulo-hero" className="landing-brilho relative -mt-16 pt-16">
        <div className="mx-auto grid min-h-[calc(100svh-4rem)] w-full max-w-6xl items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
          <div>
            <h1
              id="titulo-hero"
              className="font-display text-4xl font-bold leading-[1.06] tracking-tight text-text sm:text-5xl lg:text-[3.5rem]"
            >
              <span className="hero-linha block" style={{ '--i': 0 } as CSSProperties}>
                Você tem uma ideia.
              </span>
              <span className="hero-linha block" style={{ '--i': 1 } as CSSProperties}>
                Aqui ela vira um negócio.
              </span>
            </h1>
            <div className="hero-apoio">
              <p className="mt-5 max-w-xl text-base leading-relaxed text-text-muted sm:text-lg">
                O InfoHub é o laboratório de empreendedorismo da AMF: seis etapas
                de mentoria que levam o seu esboço até um MVP pronto para o centro
                de inovação InovAMF. Envie a sua ideia, mesmo que ainda esteja no começo.
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <Link href="/cadastro" className={BOTAO_PRINCIPAL}>
                  Enviar minha ideia
                  <ChevronRightIcon size={18} />
                </Link>
                <ProximaSecao href="#o-que-e">Conheça o InfoHub</ProximaSecao>
              </div>
              <p className="mt-4 text-xs text-text-subtle">
                O envio da ideia já cria a sua conta de acesso. Leva poucos minutos.
              </p>
              <NumerosVitrine />
            </div>
          </div>

          <HeroTransformacao />
        </div>
      </section>

      {/* ── O que é ──────────────────────────────────────────────────────── */}
      <SpotlightField id="o-que-e" className="border-t border-border py-16 sm:py-24">
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6">
          <TituloSecao
            id="titulo-o-que-e"
            titulo="Um laboratório para tirar a ideia do papel"
            texto="No InfoHub, alunos de qualquer curso da AMF desenvolvem uma ideia de negócio até o MVP, com apoio de mentores e um roteiro claro do começo ao fim."
          />
          <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {PILARES.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="border-t-2 border-border-strong pt-5">
                <Icone size={22} className="text-primary-text" />
                <h3 className="mt-3 font-display text-base font-bold tracking-tight text-text">{titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{texto}</p>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap items-center gap-2">
            <span className="text-sm text-text-muted">Áreas das ideias:</span>
            {AREAS_VITRINE.map((a) => (
              <AreaTag key={a} area={a} />
            ))}
          </div>

          <div className="mt-12 grid gap-5 rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-sm sm:grid-cols-2 sm:p-8 lg:grid-cols-4">
            {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
              <div key={titulo} className="flex gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.75rem] bg-primary-soft text-primary-text">
                  <Icone size={20} />
                </span>
                <div>
                  <h3 className="font-display text-sm font-bold tracking-tight text-text">{titulo}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-muted">{texto}</p>
                </div>
              </div>
            ))}
          </div>

          <ProximaSecao href="#como-funciona" className="mt-10">
            Como funciona
          </ProximaSecao>
        </div>
      </SpotlightField>

      {/* ── Como funciona: uma tela por etapa ───────────────────────────── */}
      <section
        id="como-funciona"
        aria-labelledby="titulo-como-funciona"
        className="border-t border-border bg-surface-sunken pb-10 md:pb-0"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="pt-16 sm:pt-24">
            <TituloSecao
              id="titulo-como-funciona"
              titulo="Seis etapas, um entregável em cada uma"
              texto="A jornada segue a cartilha do InfoHub. Você sempre sabe em que etapa está, o que precisa entregar e até quando."
            />
          </div>
          <div className="mt-8 md:mt-0">
            <JornadaOnda etapas={ETAPAS_VITRINE} hrefDepois="#casos" />
          </div>
        </div>
      </section>

      {/* ── Quem participa ───────────────────────────────────────────────── */}
      <SpotlightField id="equipes" className="border-t border-border py-16 sm:py-24">
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6">
          <TituloSecao
            id="titulo-equipes"
            titulo="Quem está no InfoHub agora"
            texto="Equipes de cursos diferentes desenvolvendo ideias em paralelo — a mistura entre áreas é parte do método."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {EQUIPES_VITRINE.map((e) => (
              <CardEquipe key={e.id} caso={e} />
            ))}
          </div>

          <CardCursos />

          <ProximaSecao href="#casos" className="mt-10">
            Veja os casos
          </ProximaSecao>
        </div>
      </SpotlightField>

      {/* ── Casos ────────────────────────────────────────────────────────── */}
      <section
        id="casos"
        aria-labelledby="titulo-casos"
        className="border-t border-border bg-surface-sunken py-16 sm:py-24"
      >
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <TituloSecao
            id="titulo-casos"
            titulo="Ideias que completaram a jornada"
            texto="Equipes que concluíram as seis etapas e seguiram com Canvas, Value Proposition Design e Pitch Vídeo prontos para o InovAMF."
          />
          <div className="mt-10">
            <CarrosselCasos
              rotulo="Casos em destaque"
              itens={CASOS_VITRINE.map((c) => ({
                chave: c.id,
                conteudo: <CardEquipe caso={c} destaque reativo={false} />,
              }))}
            />
          </div>
          <div className="mt-8 flex justify-center">
            <ProximaSecao href="#enviar">Quero ser o próximo</ProximaSecao>
          </div>
        </div>
      </section>

      {/* ── Chamada final: segue o tema, um botão só ────────────────────── */}
      <section
        id="enviar"
        aria-labelledby="titulo-enviar"
        className="border-t border-border bg-hero-glow py-20 sm:py-28"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center px-4 text-center sm:px-6">
          <h2 id="titulo-enviar" className="font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
            Inscreva sua ideia no InfoHub
          </h2>
          <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-text-muted">
            Envie sua proposta pelo formulário de inscrição. A coordenação do
            InfoHub analisa cada ideia e entra em contato para agendar o primeiro
            encontro com a sua equipe.
          </p>
          <Link href="/cadastro" className={cn(BOTAO_PRINCIPAL, 'mt-8')}>
            Enviar minha ideia
            <ChevronRightIcon size={18} />
          </Link>
        </div>
      </section>

      {/* ── Rodapé ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-bg py-12">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-[1.3fr_1fr_auto]">
          <div>
            <Logo withTagline />
            <p className="mt-3 max-w-md text-sm leading-relaxed text-text-muted">
              Laboratório de empreendedorismo da Faculdade Antonio Meneghetti —
              acompanhamento da jornada do empreendedor até o InovAMF.
            </p>
          </div>

          <div>
            <h2 className="font-display text-sm font-bold tracking-tight text-text">Onde estamos</h2>
            <address className="mt-3 flex gap-2 text-sm not-italic leading-relaxed text-text-muted">
              <MapPinIcon size={16} className="mt-1 shrink-0 text-primary-text" />
              <span>
                {CONTATO_AMF.instituicao}
                {CONTATO_AMF.linhas.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </span>
            </address>
            <p className="mt-3 flex gap-2 text-sm text-text-muted">
              <PhoneIcon size={16} className="mt-0.5 shrink-0 text-primary-text" />
              <span className="flex flex-wrap gap-x-3 gap-y-1">
                {CONTATO_AMF.telefones.map((t) => (
                  <a key={t} href={`tel:+55${t.replace(/\D/g, '')}`} className="tabular-nums hover:text-text">
                    {t}
                  </a>
                ))}
              </span>
            </p>
          </div>

          <nav aria-label="Rodapé" className="flex flex-col gap-2 text-sm">
            <h2 className="font-display text-sm font-bold tracking-tight text-text">Navegue</h2>
            <a href="#o-que-e" className="mt-1 text-text-muted hover:text-text">
              O que é
            </a>
            <a href="#como-funciona" className="text-text-muted hover:text-text">
              Como funciona
            </a>
            <a href="#casos" className="text-text-muted hover:text-text">
              Casos
            </a>
            <Link href="/cadastro" className="text-text-muted hover:text-text">
              Enviar ideia
            </Link>
            <Link href="/login" className="text-text-muted hover:text-text">
              Entrar
            </Link>
            <Link href="/termos" className="text-text-muted hover:text-text">
              Termos de Uso
            </Link>
            <Link href="/privacidade" className="text-text-muted hover:text-text">
              Política de Privacidade
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
