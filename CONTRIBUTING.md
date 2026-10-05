# Contributing

## Change workflow

1. Start from the latest `main` and create a focused branch (Codex branches use `codex/`).
2. Make small, scoped changes. Keep camera processing local.
3. Run `pnpm test` and `pnpm desktop:build`.
4. Push the branch and open a pull request.
5. Resolve review conversations and pass the required `verify` check before squash merging.

`main` requires pull requests and passing CI, including for administrators. Direct pushes, force pushes, and branch deletion are blocked. Keep the branch up to date with `main` before merging. Merged branches are deleted automatically.

This solo project does not require a second person's approval. Review discussions must still be resolved.

Do not commit credentials, private participant information, camera recordings, or generated build output. Include a short description of the change and its validation in each pull request. Visual and camera behavior still need manual testing; CI covers tests and compilation.
