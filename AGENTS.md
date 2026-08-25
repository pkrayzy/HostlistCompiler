# AGENTS.md

Guidelines for AI agents working on this project.

## Project Overview

**Hostlist Compiler** (`@adguard/hostlist-compiler`) is a Node.js CLI tool and
library that compiles DNS hosts blocklists from multiple sources into a single
filter list compatible with AdGuard Home and other AdGuard products with DNS
filtering.

It supports multiple input formats (`/etc/hosts`, adblock-style), configurable
transformations (compress, deduplicate, validate, remove comments, etc.),
inclusion/exclusion rules, and `!#include` directive resolution via
`@adguard/filters-downloader`.

## Technical Context

- **Language**: JavaScript (Node.js, CommonJS modules)
- **Node Version**: Compatible with current LTS
- **Primary Dependencies**:
  - `@adguard/filters-downloader` — resolves `!#include` directives and
    downloads remote sources
  - `ajv` / `ajv-errors` / `better-ajv-errors` — JSON schema validation for
    configuration
  - `axios` — HTTP requests for remote filter lists
  - `lodash` — utility functions
  - `tldts` — TLD parsing for domain validation
  - `yargs` — CLI argument parsing
  - `consola` — logging
- **Testing**: Jest (`jest --runInBand --detectOpenHandles`)
- **Linting**: ESLint with `airbnb-base` config, `@babel/eslint-parser`
- **Storage**: None (stateless CLI tool, reads remote/local files, writes output
  files)
- **Target Platform**: Node.js (CLI and library; published to npm)
- **Project Type**: Single package (CLI + library)
- **License**: GPL-3.0

## Project Structure

```text
├── src/                        # Main source code
│   ├── cli.js                  # CLI entry point (hashbang, yargs setup)
│   ├── index.js                # Library entry point (compile function)
│   ├── index.d.ts              # TypeScript type declarations
│   ├── compile-source.js       # Compiles individual sources
│   ├── configuration.js        # Configuration validation (AJV)
│   ├── filter.js               # Filtering utilities
│   ├── rule.js                 # Rule parsing (adblock, /etc/hosts)
│   ├── utils.js                # String and path utilities
│   ├── schemas/                # JSON schemas for configuration validation
│   └── transformations/        # Transformation modules (14 files)
├── test/                       # Jest test suites mirroring src/
│   ├── resources/              # Test fixture files
│   └── transformations/        # Transformation-specific tests
├── examples/                   # Example configurations (sdn, energized, etc.)
├── .github/workflows/          # GitHub Actions CI (ci, mirror, prepare-release, publish-release)
├── Dockerfile                  # Multi-stage build: test-output / build-output targets
├── package.json                # Package manifest and scripts
├── jest.config.js              # Jest configuration
├── .eslintrc.js                # ESLint configuration
├── CHANGELOG.md                # Release history
├── README.md                   # User documentation
└── LICENSE                     # GPL-3.0
```

## Build and Test Commands

**Full verification sequence** (run all of these before considering a task done):

```bash
pnpm lint
pnpm test
```

| Action  | Command |
|---------|---------|
| Install | `pnpm install` |
| Lint    | `pnpm lint` |
| Test    | `pnpm test` |
| Run CLI (example) | `node src/cli.js -c examples/sdn/configuration.json -o filter.txt` |
| Version bump | `pnpm increment` |

## Verification

You MUST follow these rules for EVERY task you perform:

1. **Run the linter**: `pnpm lint`. Fix all warnings and errors before
   proceeding. The project uses ESLint with `airbnb-base`.
2. **Run the tests**: `pnpm test`. All tests must pass. If you changed
   behavior, verify that existing tests still reflect correct expectations.
3. **Check the outcome**. If either command fails, fix the issues and re-run
   until both pass. A task is not complete until all checks are green.

## Mandatory Task Actions

For every task you perform, you MUST:

- **Update or add unit tests** for any changed or new code. Mirror the source
  file structure under `test/`.
- **Run the full verification sequence** (`pnpm lint` and `pnpm test`) and
  confirm both pass.
- **Update `AGENTS.md`** if you change the project structure, add new build
  commands, or discover a recurring agent mistake that should become a rule.
- **Update `CHANGELOG.md`** when making user-facing changes.
- **Update the JSON schema** (`src/schemas/configuration.schema.json`) when
  adding or changing configuration options.
- **Update TypeScript declarations** (`src/index.d.ts`) when changing the
  public API.
- **Verify your code follows the Code Guidelines** in this file after
  completing the task.
- If a prompt asks you to refactor or improve existing code, check whether
  the insight can be phrased as a code guideline. If so, add it to the
  relevant Code Guidelines section below.

## Contribution Instructions

1. **Install** dependencies with `pnpm install`.
2. **Lint** before committing: `pnpm lint`. Fix all warnings and errors.
3. **Test** before committing: `pnpm test`. All tests must pass. Add tests for
   new functionality — mirror the source file structure under `test/`.
4. **Do not commit** generated files, `node_modules`, or editor configs.
5. **Do not create git commits or PRs** unless explicitly asked.
6. Keep the `CHANGELOG.md` up to date when making user-facing changes.

## Code Guidelines

### Architecture

- **CommonJS modules** — use `require`/`module.exports` throughout; do not
  introduce ES module syntax.
- **Transformation pipeline** — each transformation is a standalone module in
  `src/transformations/` exporting a single async function. Transformations are
  orchestrated by `src/transformations/transform.js` and always run in a fixed
  order regardless of the order specified in configuration.
- **Configuration-driven** — the compiler is controlled by a JSON configuration
  object validated against `src/schemas/configuration.schema.json` via AJV.

### Code Quality

- **ESLint airbnb-base** rules apply — run `pnpm lint` to check. See
  `.eslintrc.js` for project-specific overrides.
- Use `lodash` helpers (e.g., `_.startsWith`, `_.isEmpty`, `_.trim`) where they
  are already used — stay consistent with the existing style.
- Prefer `for...of` loops over `Array.forEach` for async iteration (the
  codebase disables `no-restricted-syntax` where needed).

### Testing

- **Framework**: Jest, running in Node environment with `--runInBand`.
- **Mocking**: `mock-fs` for filesystem mocks, `nock` for HTTP request
  interception.
- Test files follow the naming convention `<module>.test.js` under `test/`.
- Each transformation has its own test file under `test/transformations/`.

### Logging and Error Handling

- Use `consola` for all logging (`consola.info`, `consola.debug`,
  `consola.error`). Do not use `console.log` / `console.error` directly.
- Throw descriptive `Error` (or `TypeError`) instances with messages that
  include the invalid input value — this helps users diagnose configuration
  and rule problems.
- Propagate errors up to the CLI entry point (`src/cli.js`), which catches
  them, logs via `consola.error`, and exits with code 1.

### Other

- The `src/index.d.ts` file provides TypeScript type declarations for external
  consumers. Keep it in sync when changing the public API.
- The JSON schema in `src/schemas/configuration.schema.json` must be updated
  when adding new configuration options or transformations.
- Any recurring agent error is a defect in this document. If you had to be
  corrected twice on the same issue, add a rule here to prevent it in the
  future.
