---
name: run-frontend-tests
description: Run Grafana frontend Jest tests for this repo without watch mode. Use when the user asks to run tests, run frontend tests, run Jest, verify test cases, or execute UserCreatePage / ConnectRepositoryButton tests.
---

# Run frontend tests

Run Jest from the repo root with **no watch mode**. Do not ask the user to run commands — execute them with the Shell tool.

## Critical: avoid watch mode

`yarn test` enables watch (`jest --notify --watch`) and will hang. Always use:

```sh
yarn jest --no-watch <path-or-pattern>
```

Equivalent: `yarn jest --watchAll=false <path-or-pattern>`.

## Default suite (this repo's curated cases)

When the user asks to "run the tests", "run test cases", or does not name a file, run this suite:

```sh
yarn jest --no-watch \
  public/app/features/admin/UserCreatePage.test.tsx \
  public/app/features/provisioning/Shared/ConnectRepositoryButton.test.tsx
```

### Covered cases

| Area | File | Cases |
|------|------|--------|
| Admin user create | `UserCreatePage.test.tsx` | Form render; required-field validation; short password rejected; successful create → `navigate('/admin/users/edit/:uid')` |
| Provisioning connect | `ConnectRepositoryButton.test.tsx` | Tooltip copy for managed/limit states; menu selection navigates to `/admin/provisioning/connect/github` and `.../local` |

## Common commands

```sh
# Single file
yarn jest --no-watch path/to/File.test.tsx

# By name pattern
yarn jest --no-watch -t "creates a user and navigates"

# Changed since main (still no watch)
yarn jest --no-watch --changedSince=origin/main

# Coverage for specific files
yarn jest --no-watch --coverage \
  public/app/features/admin/UserCreatePage.test.tsx
```

## Workflow

1. Confirm working directory is the repo root.
2. If `node_modules` is missing, run frontend install first (`corepack enable && corepack install && yarn install --immutable`).
3. Run the default suite or the path the user named.
4. Report pass/fail counts and failing assertion messages. Do not re-run endlessly — fix clear failures, then re-run once.

## Notes

- Prefer targeted paths over the full frontend suite (very large).
- For React Router migration tests, mock `useNavigate` and assert `mockNavigate` calls (see `.cursor/skills/React-router-migration/SKILL.md`).
- Backend Go tests are out of scope for this skill — use `go test` / `make test-go-unit` instead.
