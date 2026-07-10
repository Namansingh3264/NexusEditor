# Realtime Collaborative Docs Platform

A full-stack collaborative document editor with authentication, role-based sharing, rich text editing, and realtime multi-user collaboration.

---

## 1) Project Summary

This project is composed of:

- **Client (`/client`)**: Next.js App Router application
  - Sign up / sign in
  - Document editor UI (Tiptap)
  - Save/load/share APIs
  - Session management using NextAuth credentials provider
- **Collaboration Server (`/server`)**: Express + Socket.IO + Yjs sync server
  - Realtime collaboration over websocket
  - Permission check on document join
  - Debounced + periodic persistence of Yjs state
- **Database**: PostgreSQL accessed through Prisma ORM

---

## 2) High Level Design (HLD)

```mermaid
flowchart LR
    U[User Browser]
    C[Next.js Client App]
    A[NextAuth Credentials]
    API[Next.js Route Handlers]
    DB[(PostgreSQL + Prisma)]
    WS[Collab Server<br/>Express + Socket.IO + y-socket.io]
    Y[Yjs Shared State]

    U --> C
    C --> A
    C --> API
    API --> DB

    C <--> WS
    WS <--> Y
    WS --> DB
```

### HLD Notes

- Authentication is handled in the Next.js layer.
- Core document metadata/content is persisted through Next.js APIs to PostgreSQL.
- Realtime editor sync is handled by Yjs + Socket.IO server.
- Collaboration server persists binary Yjs state (`yjs_state`) back to DB for durability.

---

## 3) Low Level Design (LLD)

```mermaid
flowchart TB
    subgraph CLIENT["Client (Next.js)"]
      SIGNUP_PAGE["/signup page"]
      SIGNIN_PAGE["/signin page"]
      CANVAS_PAGE["/canvas page"]

      APPBAR["AppBar"]
      TITLEBAR["TitleBar"]
      SHARE_MODAL["ShareModal"]
      MENU_BAR["MenuBar"]
      TIPTAP["Tiptap"]

      AUTH_ROUTE["/api/auth/[...nextauth]"]
      SIGNUP_API["/api/signup"]
      DOCS_API["/api/docs (GET)"]
      SAVE_API["/api/docs/save (POST)"]
      SHARE_API["/api/docs/share (POST)"]

      AUTH_OPTS["authOptions"]
      PRISMA_CLIENT["Prisma Client"]
    end

    subgraph COLLAB["Realtime Server (/server)"]
      EXPRESS["Express + CORS"]
      IO["Socket.IO Server"]
      YSIO["YSocketIO"]
      HS_AUTH["Handshake AuthZ"]
      LOAD_STATE["Load yjs_state"]
      SAVE_STATE["Debounced/Periodic Save"]
      PRISMA_SERVER["Prisma Client"]
    end

    subgraph DATA["PostgreSQL"]
      USERS["users"]
      DOCS["documents"]
      PERMS["document_permissions"]
      YSTATE["documents.yjs_state"]
    end

    SIGNUP_PAGE --> SIGNUP_API
    SIGNIN_PAGE --> AUTH_ROUTE
    CANVAS_PAGE --> APPBAR
    CANVAS_PAGE --> TIPTAP
    TIPTAP --> TITLEBAR
    TIPTAP --> MENU_BAR
    TITLEBAR --> SHARE_MODAL

    AUTH_ROUTE --> AUTH_OPTS
    SIGNUP_API --> PRISMA_CLIENT
    DOCS_API --> PRISMA_CLIENT
    SAVE_API --> PRISMA_CLIENT
    SHARE_API --> PRISMA_CLIENT
    AUTH_OPTS --> PRISMA_CLIENT

    PRISMA_CLIENT --> USERS
    PRISMA_CLIENT --> DOCS
    PRISMA_CLIENT --> PERMS

    TIPTAP <--> IO
    EXPRESS --> IO
    IO --> YSIO
    YSIO --> HS_AUTH
    YSIO --> LOAD_STATE
    YSIO --> SAVE_STATE
    HS_AUTH --> PRISMA_SERVER
    LOAD_STATE --> PRISMA_SERVER
    SAVE_STATE --> PRISMA_SERVER

    PRISMA_SERVER --> USERS
    PRISMA_SERVER --> DOCS
    PRISMA_SERVER --> PERMS
    PRISMA_SERVER --> YSTATE
```

---

## 4) Functional Requirements

### Authentication and User Management

- User can sign up with `name`, `email`, `password`.
- Password must be hashed before DB storage.
- User can sign in using credentials provider (NextAuth).
- Session contains user identity used by protected APIs.

### Document Management

- User can create and save a document.
- User can update an existing document.
- User can fetch document list available by direct email or linked user permission.
- Owner can share document with another email and assign permission.

### Permission Model

- Permission levels: `OWNER`, `EDITOR`, `VIEWER`.
- Only authorized users can access document data.
- Collaboration join is allowed only for users with permission entry for the document.

### Realtime Collaboration

- Multiple users can edit the same document concurrently.
- Client joins realtime room using `doc_id` and user email.
- Collaboration server authenticates join request using DB permission lookup.
- Yjs updates are synchronized to connected participants.

### Persistence

- Standard content persisted through `/api/docs/save`.
- Yjs binary state persisted from collaboration server:
  - debounced on updates
  - periodic background checkpoints

---

## 5) Non-Functional Requirements

- **Security**
  - Credential authentication with hashed passwords (`bcrypt`).
  - Server-side permission validation before data access.
  - CORS configured for local frontend origin.
- **Performance**
  - Debounced save for high-frequency collaboration updates.
  - Periodic save as backup durability strategy.
- **Reliability**
  - Collaboration state recovered from persisted `yjs_state`.
  - Unauthorized room join attempts are rejected.
- **Accessibility**
  - Dialog/Sheet components should include titles for screen reader support.
- **Scalability (current baseline)**
  - Single collaboration server instance.
  - DB-backed shared state enables restart recovery.

---

## 6) End-to-End Workflows

### 6.1 Signup and Auto-login

```mermaid
sequenceDiagram
    participant U as User
    participant SU as Signup UI
    participant SA as /api/signup
    participant DB as PostgreSQL
    participant NA as NextAuth

    U->>SU: Submit name/email/password
    SU->>SA: POST /api/signup
    SA->>DB: Check existing user
    alt User exists
        SA-->>SU: 411 already exists
    else New user
        SA->>SA: Hash password
        SA->>DB: Create user
        SA-->>SU: 200 success
        SU->>NA: signIn(credentials)
        NA->>DB: Validate credentials
        NA-->>SU: Session established
        SU-->>U: Redirect /canvas
    end
```

### 6.2 Signin

```mermaid
sequenceDiagram
    participant U as User
    participant SI as Signin UI
    participant NA as NextAuth
    participant DB as PostgreSQL

    U->>SI: Enter email/password
    SI->>NA: signIn(credentials)
    NA->>DB: Find user and compare hash
    alt Valid
        NA-->>SI: Auth success + session
        SI-->>U: Redirect /canvas
    else Invalid
        NA-->>SI: 401
        SI-->>U: Show invalid credentials
    end
```

### 6.3 Load Documents

```mermaid
sequenceDiagram
    participant UI as TitleBar
    participant API as /api/docs
    participant DB as PostgreSQL

    UI->>API: GET /api/docs (with session)
    API->>DB: Query document_permissions + documents
    DB-->>API: Accessible docs
    API-->>UI: list[]
    UI-->>UI: Render sidebar document list
```

### 6.4 Save Document

```mermaid
sequenceDiagram
    participant UI as Tiptap/TitleBar
    participant API as /api/docs/save
    participant DB as PostgreSQL

    UI->>API: POST title/content/permission/yjs_state
    API->>DB: Find existing by title
    alt Not found
        API->>DB: Create document + owner permission
    else Found
        API->>DB: Update document content
    end
    API-->>UI: Saved doc response
```

### 6.5 Share Document

```mermaid
sequenceDiagram
    participant UI as ShareModal
    participant API as /api/docs/share
    participant DB as PostgreSQL

    UI->>API: POST doc_id/email/permission
    API->>DB: Verify requester is OWNER
    alt Not owner
        API-->>UI: Unauthorized/forbidden response
    else Owner
        API->>DB: Create document_permissions row
        API-->>UI: Share success
    end
```

### 6.6 Realtime Collaboration

```mermaid
sequenceDiagram
    participant E as Tiptap Client
    participant W as Collab Server
    participant D as PostgreSQL

    E->>W: Socket connect(doc_id, email)
    W->>D: Check document_permissions
    alt Unauthorized
        W-->>E: Reject connection
    else Authorized
        W->>D: Load yjs_state
        W-->>E: Sync initial state
        E-->>W: Continuous Yjs updates
        W->>W: Debounce updates (5s)
        W->>D: Save yjs_state
        W->>D: Periodic save checkpoints
    end
```

---

## 7) Data Model

```mermaid
erDiagram
    User ||--o{ Document : owns
    User ||--o{ Document_Permissions : has
    Document ||--o{ Document_Permissions : grants

    User {
      string id PK
      string email
      string name
      string password
      datetime created_at
      datetime updated_at
    }

    Document {
      string id PK
      string title
      string content
      bytes yjs_state
      string owner_id FK
      datetime created_at
      datetime updated_at
    }

    Document_Permissions {
      string id PK
      string document_id FK
      string user_id FK
      string email
      enum permission_level
      string granted_by
      datetime created_at
    }
```

---

## 8) APIs

### Auth

- `GET/POST /api/auth/[...nextauth]`
  - NextAuth handler for credential-based login/session.

### User

- `POST /api/signup`
  - Creates user after schema validation and password hash.

### Documents

- `GET /api/docs`
  - Returns documents accessible to authenticated user.
- `POST /api/docs/save`
  - Creates or updates a document.
- `POST /api/docs/share`
  - Owner grants permission to another email.

---

## 9) Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, TailwindCSS, Radix UI
- **Editor**: Tiptap + Yjs
- **Auth**: NextAuth (Credentials)
- **Realtime**: Socket.IO + y-socket.io
- **Backend/ORM**: Node.js, Express, Prisma
- **Database**: PostgreSQL

---

## 10) Setup Requirements

### Prerequisites

- Node.js 18+ (recommended latest LTS)
- npm
- PostgreSQL database (or managed PG like Neon)
- Correct environment variables

### Environment Variables

Set in `client/.env` and `server/.env` as needed:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
NEXTAUTH_SECRET=<strong-secret>
NEXTAUTH_URL=http://localhost:3000
```

---

## 11) Run Instructions

### Install

```bash
cd client && npm install
cd ../server && npm install
```

### Build

```bash
cd client && npm run build
cd ../server && npm run build
```

### Dev Run

```bash
# terminal 1
cd client
npm run dev

# terminal 2
cd server
npm run dev
```

- Client URL: `http://localhost:3000`
- Collaboration server URL: `http://localhost:8080`

---

## 12) Operational Notes

- If database URL changes, restart running dev servers to reload env values.
- Collaboration authorization depends on `document_permissions`.
- `yjs_state` persistence enables recovery across server restarts.
- Ensure Prisma client versions are aligned across client/server packages to avoid mismatch issues.

---

## 13) Future Improvements

- Add migration and seed scripts in root-level orchestration.
- Add refresh token/session hardening and secure cookies by environment.
- Add audit logs for share/revoke actions.
- Add integration and e2e tests for auth + collaboration.
- Add role-based UI guards and clearer permission error messages.
