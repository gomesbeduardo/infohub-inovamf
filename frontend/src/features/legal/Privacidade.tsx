import { CONTATO_AMF } from '@/features/landing/conteudo';
import { DocumentoLegal } from './DocumentoLegal';

/** Mesma versão gravada em consentimentos_lgpd (backend/src/domain/lgpd.ts). */
export const VERSAO_POLITICA = '2026-09';

const RETENCAO: ReadonlyArray<[dado: string, prazo: string]> = [
  ['Conta e dados acadêmicos', 'Enquanto você participa do programa, ou até pedir a exclusão (anonimização).'],
  ['Conteúdo da ideia e das entregas', 'Enquanto a equipe existir. É da equipe, não da pessoa: fica com o autor anonimizado.'],
  ['Registros de auditoria (com IP)', '12 meses.'],
  ['Links de sessão e de senha expirados', 'Até expirar, mais 30 dias.'],
  ['E-mails enviados ou cancelados', '90 dias.'],
  ['Registro do seu aceite (termos e política)', 'Enquanto a conta existir, como prova do consentimento.'],
];

/**
 * /privacidade (RNF-02). Página estática: a versão muda junto com
 * VERSAO_POLITICA no backend, e aí pedimos um novo aceite.
 */
export function Privacidade() {
  return (
    <DocumentoLegal titulo="Política de Privacidade" subtitulo={`Versão ${VERSAO_POLITICA}`}>
      <p>
        Esta política explica como o InfoHub, a plataforma da {CONTATO_AMF.instituicao} para o
        programa de ideação até o InovAMF, trata os seus dados pessoais, conforme a Lei Geral de
        Proteção de Dados (Lei nº 13.709/2018).
      </p>

      <h2>Dados que coletamos</h2>
      <ul className="list-disc space-y-1 pl-5">
        <li>Conta: nome, e-mail, telefone e senha (guardada só como hash).</li>
        <li>Dados acadêmicos: curso, semestre e matrícula (opcional).</li>
        <li>Conteúdo que a equipe produz: a ideia, as tarefas e as entregas.</li>
        <li>Registros técnicos: endereço IP e navegador, em logs de acesso e de auditoria.</li>
      </ul>
      <p>
        Quando o líder cadastra a equipe, ele informa só o nome e o e-mail dos colegas. Cada colega
        completa os próprios dados e aceita esta política ao aceitar o convite.
      </p>

      <h2>Para que usamos</h2>
      <p>
        Para acompanhar a jornada da sua equipe até o InovAMF: organizar as etapas, as tarefas e a
        mentoria, avaliar as entregas e avisar você sobre prazos e novidades.
      </p>

      <h2>Base legal</h2>
      <p>
        Execução do programa em que você se inscreveu e o seu consentimento, dado no cadastro.
        Os registros de auditoria e segurança se apoiam no legítimo interesse de manter a
        plataforma segura e rastreável.
      </p>

      <h2>Quem vê seus dados</h2>
      <p>
        Os integrantes da sua equipe, o mentor da equipe e a coordenação do programa. Integrantes
        não veem o e-mail nem o telefone uns dos outros. Não vendemos nem compartilhamos seus dados
        com terceiros, e a página pública mostra só números agregados.
      </p>

      <h2>Por quanto tempo guardamos</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-border text-text">
              <th scope="col" className="py-2 pr-4 font-semibold">Dado</th>
              <th scope="col" className="py-2 font-semibold">Prazo</th>
            </tr>
          </thead>
          <tbody>
            {RETENCAO.map(([dado, prazo]) => (
              <tr key={dado} className="border-b border-border align-top">
                <td className="py-2 pr-4 text-text">{dado}</td>
                <td className="py-2">{prazo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Seus direitos</h2>
      <p>
        Você pode pedir acesso aos seus dados, a correção deles ou a exclusão. Na exclusão, seus
        dados pessoais são anonimizados: somem da plataforma, mas as entregas continuam com a
        equipe. Para pedir, fale com a coordenação do programa pelos telefones{' '}
        {CONTATO_AMF.telefones.join(' ou ')}.
      </p>
    </DocumentoLegal>
  );
}
