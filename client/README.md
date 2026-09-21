# NexusEditor — web app

The Next.js App Router frontend and its API routes.

See the [root README](../README.md) for architecture, environment variables,
run instructions and deployment steps.

## Quick start

```bash
npm install
cp .env.example .env   # then fill in real values
npm run db:migrate
npm run dev
```

The app runs at http://localhost:3000. Real-time collaboration also needs the
collaboration server in [`../server`](../server) to be running.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Development server. |
| `npm run build` | Generates the Prisma client, then builds for production. |
| `npm start` | Serves the production build. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | Type-check without emitting. |
| `npm run db:migrate` | Apply pending Prisma migrations. |
