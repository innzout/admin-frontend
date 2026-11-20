# INNZOUT Admin Frontend

The web admin panel for INNZOUT, built with Next.js 16, React 19, Tailwind 4, Base UI, TanStack Query, react-hook-form and zod.

## Run locally

It needs the [admin API](https://github.com/innzout/admin-api) running.

```bash
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8080
npm install
npm run dev                        # http://localhost:3000
```

`npm run dev` compiles each page the first time you open it, so pages load slowly at first. To check real speed, build and run the production server:

```bash
npm run build && npm start
```

## Checks

```bash
npx tsc --noEmit && npm run lint && npm run build
```

## Layout

| Path | Contents |
|---|---|
| `app/(app)` | Signed-in pages, one folder per module |
| `components/ui` | Base primitives |
| `components/common` | Shared building blocks (form field, KPI card, confirm dialog, …) |
| `hooks/use-*.ts` | TanStack Query hooks, one per API module |
| `lib/validation.ts` | Shared zod rules that match the API's validation |
| `lib/documents` | Letter templates and the block model |
