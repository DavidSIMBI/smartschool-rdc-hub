# SmartSchool RDC

Cloud school-management platform for primary and secondary schools in the DR Congo.
Bilingual (FR/EN), light & dark mode, emerald branding, six roles: Super Admin,
School Admin (Director/Prefect), Secretary, Accountant, Teacher, Student.

---

## 1. Technologies used

| Area | Technology |
| --- | --- |
| Language | TypeScript |
| UI library | React 19 |
| Framework | TanStack Start v1 (file-based routing with TanStack Router) |
| Build tool | Vite 8 |
| Styling | Tailwind CSS v4 (configured in `src/styles.css`, no `tailwind.config.js`) |
| Components | shadcn/ui built on Radix UI primitives (`src/components/ui`) |
| Icons | lucide-react |
| Data fetching / cache | TanStack Query v5 |
| Forms & validation | react-hook-form + zod |
| Charts | recharts |
| Toasts | sonner |
| Dates | date-fns |
| Markdown | react-markdown |
| AI helpers | `ai` + `@ai-sdk/react` (assistant screens) |
| Backend client (current) | `@supabase/supabase-js` for database, auth and file storage |

No Bootstrap, no Next.js, no react-router-dom.

---

## 2. Requirements

- Node.js 20 or newer (install via [nvm](https://github.com/nvm-sh/nvm))
- npm 10+ (or pnpm / bun — the project also works with `bun install`)
- VS Code (recommended extensions: ESLint, Prettier, Tailwind CSS IntelliSense)
- Git

---

## 3. Getting the code

Inside Lovable:

- **GitHub sync** — chat input Plus (+) menu → GitHub → Connect project → Create
  Repository. Every later change syncs both ways. Then `git clone <your-repo-url>`.
- **Direct download** — open the Code Editor and use **Download codebase** at the
  bottom of the file tree (paid workspaces), or on GitHub use **Code → Download ZIP**.

Database rows are exported separately from Cloud → Advanced settings → Export data.

---

## 4. Installation

```sh
git clone <your-repository-url>
cd smartschool-rdc
npm install
```

---

## 5. Open in VS Code

```sh
code .
```

Then open the built-in terminal (`Ctrl` + `` ` ``) and run the commands below.

---

## 6. Run locally

```sh
npm run dev
```

The app starts on <http://localhost:8080>.

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm run build:dev` | Build with development mode settings |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier formatting |

---

## 7. Environment variables

Copy the example file and fill in your own values:

```sh
cp .env.example .env
```

| Variable | Used by | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | browser client | Backend project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | browser client | Public/anon key, safe in the client |
| `VITE_SUPABASE_PROJECT_ID` | browser client | Project reference id |

Server-side keys (service role, HMAC signing secret, AI gateway key) are **never**
placed in `VITE_*` variables — they are read only inside server functions.

---

## 8. Project structure

```text
public/                     favicon, robots.txt, sitemap.xml, llms.txt
src/
  assets/                   images used by the UI
  components/
    ui/                     shadcn/ui primitives (button, dialog, table, ...)
    site/                   landing page, navbar, logo, language & theme toggle
    dashboard/              shells and shared kit for Admin / Teacher / Student
    super-admin/            Super Admin shell
  lib/
    auth-context.tsx        session + roles context
    i18n.tsx                French / English strings
    theme.tsx               light & dark mode
    admin.functions.ts      Admin data actions
    teacher.functions.ts    Teacher data actions
    student.functions.ts    Student data actions
    super-admin.functions.ts
    lms.ts, storage-upload.ts, utils.ts
  routes/
    __root.tsx              app shell (head tags, providers, Outlet)
    index.tsx               public landing page
    auth.*.tsx              login, register, forgot & reset password
    dashboard.admin.tsx     + students, teachers, classes, attendance, exams,
                            fees, timetable, announcements, notifications, settings
    dashboard.teacher.*     classes, attendance, assignments, exams, grading,
                            lesson-plans, resources, subjects, timetable,
                            messages, documents, calendar, profile, notifications
    dashboard.student.*     profile, subjects, assignments, exams, report-card,
                            attendance, timetable, materials, resources,
                            announcements, messages, calendar, search, assistant
    dashboard.super-admin.* schools, subscriptions, payments, audit,
                            announcements, notifications, settings
    api/public/             HTTP endpoints (secure file streaming)
  styles.css                Tailwind v4 theme tokens, design system
  router.tsx, start.ts, server.ts
index.html-equivalent handled by TanStack Start
package.json, tsconfig.json, vite.config.ts, eslint.config.js, components.json
```

`src/routeTree.gen.ts` is generated automatically — never edit it by hand.

---

## 9. Notes on the design system

All colours, gradients and shadows are CSS variables in `src/styles.css`
(emerald primary, soft/elegant shadows, hero gradient). Components use semantic
tokens (`bg-background`, `text-primary`) so light/dark mode and future rebranding
work everywhere. Avoid hard-coded colours such as `text-white` or `bg-[#hex]`.

Layouts are mobile-first: each dashboard has a permanent sidebar from `lg:` up and
a hamburger drawer (`MobileNavDrawer`) below that; tables scroll inside their own
container and dialogs are capped at `90dvh`.

---

## 10. Backend

See `BACKEND_FEATURES_TO_IMPLEMENT_LATER.md` for the full list of features that
depend on a database, authentication, file storage, server processing or external
services, and what a replacement backend must provide.
