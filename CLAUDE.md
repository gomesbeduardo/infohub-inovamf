# InfoHub / InovAMF — instruções do projeto

## Fluxo de branches e PRs
- **Todo PR deve mirar `staging`, nunca `main`.** `main` só recebe merges promovidos a partir de `staging`.
- Trabalhe sempre em uma branch de feature/fix criada a partir de `staging`.
- Ao abrir PR (`gh pr create`), use explicitamente `--base staging`.
