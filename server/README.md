# NexusEditor — collaboration server

Express + Socket.IO + Yjs server that synchronises live editing sessions and
persists each document's Yjs state to PostgreSQL.

See the [root README](../README.md) for architecture and deployment steps.

## Quick start

```bash
npm install
cp .env.example .env   # then fill in real values
npm run dev
```

Listens on port `8080` by default, with a health check at `/health`.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Compile and run. |
| `npm run build` | Generate the Prisma client and compile to `dist/`. |
| `npm start` | Run the compiled server (`dist/index.js`). |
| `npm run typecheck` | Type-check without emitting. |

## Notes

- Requires a persistent Node process — it holds long-lived WebSocket
  connections and cannot run on a serverless platform.
- Only `OWNER` and `EDITOR` may join a session. `y-socket.io` rooms have no
  read-only mode, so viewers read the persisted document through the web app.
