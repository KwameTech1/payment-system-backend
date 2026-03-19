# Contributing

Thank you for considering contributing to this project. Please follow these guidelines to keep collaboration smooth and the codebase clean.

---

## Getting Started

1. Fork the repository and clone your fork locally.
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env` and configure your local environment.
4. Create a new branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```

---

## Branching Strategy

| Branch pattern | Purpose |
|----------------|---------|
| `main` | Production-ready code only |
| `feat/*` | New features |
| `fix/*` | Bug fixes |
| `chore/*` | Maintenance, dependency updates |
| `docs/*` | Documentation changes |

---

## Commit Convention

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user registration endpoint
fix: handle null value in auth middleware
chore: update eslint to v9
docs: update deployment guide
test: add missing coverage for health route
```

---

## Pull Request Process

1. Ensure your branch is up to date with `main` before opening a PR.
2. Run the full check suite before pushing:
   ```bash
   npm run lint
   npm test
   ```
3. Fill in the pull request template completely.
4. Request a review from at least one maintainer.
5. Squash commits before merging if there are many noisy commits.

---

## Code Style

- Formatting is enforced by **Prettier** — run `npm run format` before committing.
- Linting is enforced by **ESLint** — run `npm run lint` to check.
- Do not disable lint rules without a comment explaining why.

---

## Reporting Bugs

Use the GitHub issue tracker and fill in the **bug report** template.

## Requesting Features

Use the GitHub issue tracker and fill in the **feature request** template.

---

## Code of Conduct

Be respectful. Harassment, trolling, or discriminatory behavior of any kind will not be tolerated.
