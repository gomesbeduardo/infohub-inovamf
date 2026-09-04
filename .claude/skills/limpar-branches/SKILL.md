---
name: limpar-branches
description: >-
  Limpa branches antigas (mais de 1 dia) que já foram mergeadas — locais,
  worktrees stale e remotas no GitHub — de forma segura. Use quando o usuário
  pedir para "limpar branches", "fechar branches antigas", "podar branches",
  "limpar worktrees" ou similar. NUNCA apaga branch não-mergeada, protegida
  (main/staging) ou worktree com mudança pendente.
---

# Limpar branches antigas (seguro)

Remove o acúmulo de branches já integradas com **mais de 1 dia**, em três
frentes — branches locais, worktrees stale e branches remotas — sem nunca
destruir trabalho não integrado.

## Regras de segurança (invioláveis)

1. **Protegidas nunca são tocadas:** `main`, `staging` e a branch atualmente
   em checkout (`git branch --show-current`).
2. **Só apaga o que está comprovadamente mergeado.** Ancestralidade
   (`git merge-base --is-ancestor`) é **não confiável** aqui porque os PRs usam
   squash/merge-commit (reescrevem o SHA). A fonte de verdade para "mergeada" é
   **um PR mergeado** com aquele `headRefName`:
   `gh pr list --state merged --limit 200 --json headRefName --jq '.[].headRefName'`.
   Uma branch só é candidata se o nome dela estiver nessa lista **ou** for
   ancestral de `origin/staging`/`origin/main`.
3. **Idade > 1 dia:** usar `committerdate`; branches com ≤ 24h ficam.
4. **Worktree sujo nunca é forçado:** usar `git worktree remove <path>` **sem**
   `--force` — o git recusa worktree com mudança pendente ou em uso; esses são
   pulados, não destruídos.
5. **Em dúvida, preserve e relate.** Toda branch que não passar nas regras
   acima é listada como "mantida (motivo)", não apagada.

## Procedimento

Execute os comandos a partir da raiz do repositório (ou de um worktree dele).

### 1. Sincronizar

```bash
git fetch origin --prune
```

Isso remove refs `origin/*` já apagadas no GitHub e evita erros de
"remote ref does not exist".

### 2. Levantar os dados

- Branches locais + idade + merge:
  ```bash
  git for-each-ref --sort=committerdate \
    --format='%(refname:short) | %(committerdate:relative) | %(committerdate:unix)' refs/heads/
  ```
- Branches remotas + idade:
  ```bash
  git for-each-ref --sort=committerdate \
    --format='%(refname:short) | %(committerdate:relative) | %(committerdate:unix)' refs/remotes/origin/
  ```
- Lista confiável de mergeadas (PRs):
  ```bash
  gh pr list --state merged --limit 200 --json headRefName --jq '.[].headRefName' | sort -u
  ```
- Worktrees em uso: `git worktree list` (o nome da branch aparece entre `[ ]`).

### 3. Montar os conjuntos (aplicando as regras)

- **Candidatas** = idade > 1 dia **e** (nome em PR mergeado **ou** ancestral de
  `origin/staging`/`origin/main`), **menos** as protegidas.
- Separe:
  - **locais em worktree** → precisam do passo 4 antes de deletar a branch;
  - **locais soltas** → deletar direto (passo 5);
  - **remotas** → passo 6.

### 4. Mostrar o plano e confirmar o destrutivo

Imprima três listas: **worktrees a remover**, **branches locais a deletar**,
**branches remotas a deletar**, e as **mantidas (com motivo)**.

- A remoção de **worktrees** e a deleção **local** podem seguir direto (são
  reversíveis via reflog / re-checkout).
- A deleção **remota** é destrutiva e outward-facing num repo compartilhado:
  **confirme com o usuário** a lista antes de empurrar, a menos que ele já tenha
  dito explicitamente "sem confirmar".

### 5. Remover worktrees stale (só limpos)

Para cada worktree cuja branch é candidata:

```bash
git worktree remove <path>   # sem --force; pula sujo/locked
```

### 6. Deletar branches locais (seguro)

```bash
git branch -d <b1> <b2> ...   # -d recusa não-mergeada; nunca -D em lote
```

Se `-d` recusar alguma (não mergeada na HEAD/upstream), verifique de novo pela
regra 2; se realmente não estiver mergeada, **mantenha** e relate.

### 7. Deletar branches remotas (após confirmação)

```bash
git push origin --delete <b1> <b2> ...
```

Se aparecer "remote ref does not exist", rode `git fetch origin --prune` e
refaça só com as que existem — o push aborta o lote inteiro se houver refs
inválidas.

### 8. Relatório final

Resuma: quantas locais, quantos worktrees e quantas remotas foram removidos, e
liste as **mantidas** com o motivo (protegida / não mergeada / ≤ 1 dia /
worktree sujo).

## Observações

- Este repositório usa **`staging` como base** (ver `AGENTS.md`); `main` só
  recebe promoções. Ambas são protegidas por padrão aqui.
- A skill é conservadora de propósito: prefere manter uma branch duvidosa a
  arriscar apagar trabalho não integrado.
