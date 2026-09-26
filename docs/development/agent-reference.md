# Gradus Development Reference

This is on-demand reference material for changes to Gradus. The repository-level [AGENTS.md](../../AGENTS.md) contains the rules that apply to every task.

## Project layout

| Area | Primary locations |
|---|---|
| Routes | `src/app/`; landing is `/`, product shell is `/app`, task detail is `/task/[id]`, and `/task/parity-probe` supplies fixed visual fixtures. |
| API | `src/app/api/**/route.ts`; each route owns its HTTP boundary. |
| UI | `src/components/` grouped by `ui`, `home`, `task`, `landing`, `layout`, `auth`, `membership`, `share`, `errors`, `user-profile`, and `i18n`. |
| Domain code | `src/lib/auth`, `db`, `api`, `ai`, `fetchers`, `i18n`, plus scheduling and resource modules. |
| Design | `src/app/globals.css` is the token source; `output/拾级Gradus-设计预览.html` is the visual reference; `scripts/` contains deterministic audits. |

## Runtime configuration

Use `.env.example` as the complete variable list. Production requires:

- `DATABASE_URL`
- `AUTH_SECRET` with at least 32 characters
- an AI provider: `GEMINI_API_KEY`, or the BYOK trio `AI_PROVIDER_BASE_URL`, `AI_PROVIDER_API_KEY`, and `AI_PROVIDER_MODEL`

`AI_PROVIDER_MODE=gemini|byok` can force a provider. Resource search tries `TAVILY_API_KEY`, `SERPAPI_API_KEY`, `BRAVE_SEARCH_API_KEY`, and `DOUBAO_API_KEY` in that order; an unconfigured, rate-limited, failing, or empty provider falls through to the next one. With none available, resource results degrade to search links. Cron, email verification, Watcha OAuth, Android release checking, and workspace imports each have separate optional variables in `.env.example`.

## Authentication and users

- `src/middleware.ts` creates or renews a temporary JWT session for protected API requests. Cron and public registration/login routes are excluded.
- `src/lib/auth/index.ts` exposes `requireAuth(request)`. Call it first in a protected handler and scope every operation to the returned `userId`.
- `src/lib/auth-shim.ts` provides client-side `auth` and `useSessionUser`; `src/lib/auth/user-provider.tsx` provides the server-rendered user to the client store.
- Sessions use the `__Host-session` cookie. Do not add browser-side authorization headers.
- Registration merges the active temporary account's task data. When changing session behavior, preserve this ownership boundary.

## AI planning, resources, and scheduling

The planning entry point is `src/app/api/tasks/[id]/analyze/route.ts`. It returns one buffered JSON response after these stages:

1. Fetch content from an input URL when possible.
2. Infer intent with `src/lib/ai/prompts.ts`.
3. Generate resource search intents, resolve real links through `src/lib/tavily.ts` and its registered search providers, then validate them.
4. Generate 4 to 8 scheduled subtasks.
5. Validate the plan and regenerate it when the validation or Bloom progression fails.

`src/lib/scheduler.ts` owns cross-task start dates, daily slot allocation, Bloom sequencing, and review-node suggestions. Keep scheduling user-scoped and do not move AI calls into client components.

## API surface

The route directory is the source of truth. Current groups are:

| Group | Routes |
|---|---|
| Auth | `auth/register`, `login`, `logout`, `me`, `config`, `send-code`, and `oauth/watcha`. |
| Tasks | `tasks`, `tasks/[id]`, `tasks/[id]/analyze`, `tasks/[id]/subtasks/[subtaskId]`, and `subtasks`. |
| User and membership | `user/profile`, `user/stats`, `user/membership`, `membership/codes`, `membership/records`, and `membership/redeem`. |
| Other services | `notifications`, `notifications/cron/daily-digest`, `notifications/test`, `cron/cleanup`, and `app/check-update`. |

## Database

Schemas live in `src/lib/db/schema/`, queries in `src/lib/db/queries/`, and migrations in `src/lib/db/migrations/`. Use `bun run db:generate`, `bun run db:migrate`, `bun run db:push`, and `bun run db:studio` as appropriate. Do not alter schema or migration history without an explicit data-change task.

## UI and design verification

Use the design-system documents before changing UI. The useful checks are:

| Command | When to use it |
|---|---|
| `bun run audit:tokens` | Design tokens or global theme values change. |
| `bun run audit:design` | Layout, typography, responsive behavior, or accessibility changes. |
| `bun run audit:parity -- --live=http://localhost:3000` | Compare the running implementation with the visual reference. |
| `bun run audit:modals` | A modal or other interactive overlay changes. |
| `bun run audit:colors` | Component color usage changes. |
| `bun run ds:tokens`, `ds:imports`, `ds:vars` | UI implementation or token usage changes. |

Without a local database, use `/task/parity-probe` for task/detail visual checks. The audits measure browser-computed values; do not replace them with subjective visual comparison.

## Related documents

- [Product requirements](../PRD.md)
- [Design system](../design-system/design-system.md)
- [Android packaging](../ANDROID_PACKAGING.md)
- [Watcha OAuth integration](../integrations/watcha/oauth2.md)
- [Implementation plans and audits](../plans/)
