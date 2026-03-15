# Welcome to your Lovable project

## Project Status

![Tests](https://img.shields.io/github/actions/workflow/status/YOUR_ORG/lexflowai/test.yml?label=Tests)
![Coverage](https://img.shields.io/badge/coverage-70%25-brightgreen?style=flat)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat)

## Project info

**URL**: https://lovable.dev/projects/9b5e925d-516b-4c9a-8bf5-96cde5168edd

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/9b5e925d-516b-4c9a-8bf5-96cde5168edd) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Testing

### Unit Tests

Run unit tests with Vitest:

```sh
npm run test
```

Run with coverage report (HTML, JSON, LCOV):

```sh
npm run test:coverage
```

View coverage report:

```sh
# Open HTML report in browser
open coverage/index.html
```

**Coverage Thresholds**: Minimum 70% required (lines, functions, branches, statements). CI pipeline enforces these thresholds and blocks merges below the threshold.

### E2E Tests

Run end-to-end tests with Playwright:

```sh
# Run all E2E tests
npx playwright test

# Run tests in UI mode (interactive)
npx playwright test --ui

# Run specific test file
npx playwright test e2e/tests/example.spec.ts

# Run tests for specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run with debugging
npx playwright test --debug
```

View test report:

```sh
npx playwright show-report
```

**Browser Support**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Playwright (E2E Testing)
- Vitest (Unit Testing)

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/9b5e925d-516b-4c9a-8bf5-96cde5168edd) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Security Notes

Este projeto segue boas práticas de segurança para proteger dados sensíveis.

- **Segredos**: Nunca commite arquivos `.env` com valores reais. Use `.env.example` como referência.
- **Chaves de API**: Apenas a `anon key` é permitida no frontend. Chaves privadas devem ficar no backend.
- **RLS**: Todas as tabelas com dados sensíveis possuem Row Level Security habilitado.

Para mais detalhes, consulte o arquivo [SECURITY.md](./SECURITY.md).
