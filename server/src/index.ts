/*
 * Load `server/.env` before anything reads process.env. Without this the server
 * only ever saw variables exported into the shell: values such as CLIENT_URL
 * and PORT written in .env were silently ignored, so CORS always fell back to
 * http://localhost:3000. (Prisma loads .env for its own datasource URL, which
 * masked the problem.)
 */
import "dotenv/config";

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { YSocketIO, type Document as YDocument } from "y-socket.io/dist/server";
import * as Y from "yjs";

import { prisma } from "./lib/prisma";

/**
 * Comma-separated list so a deployment can allow both the production origin and
 * a preview URL. The previous version accepted a single origin only, which made
 * the socket unusable from any deployed frontend other than the one hard-coded
 * in CLIENT_URL.
 */
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const port = Number(process.env.PORT) || 8080;

if (!process.env.DATABASE_URL) {
    console.error(
        "[startup] DATABASE_URL is not set. The collaboration server cannot " +
        "verify permissions or persist documents without it.",
    );
    process.exit(1);
}

const SAVE_DEBOUNCE_MS = 3000;
/** Safety net so a long editing session cannot go unsaved indefinitely. */
const CHECKPOINT_INTERVAL_MS = 30000;

const app = express();

app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
    }),
);

app.disable("x-powered-by");

/** Health endpoint for uptime checks and platform readiness probes. */
app.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/", (_req, res) => {
    res.json({ service: "nexuseditor-collaboration-server", status: "ok" });
});

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"],
        credentials: true,
    },
});

const saveTimeouts = new Map<string, NodeJS.Timeout>();
/** Live documents, so checkpoints and shutdown can flush every open room. */
const openDocuments = new Map<string, YDocument>();

async function saveDocumentState(docId: string, ydoc: Y.Doc) {
    if (!docId) return;

    try {
        const state = Buffer.from(Y.encodeStateAsUpdate(ydoc));
        await prisma.document.update({
            where: { id: docId },
            data: { yjs_state: state, updated_at: new Date() },
        });
    } catch (error) {
        // P2025 = the document was deleted while a session was still open.
        if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") {
            console.warn(`[collab] Document ${docId} no longer exists; dropping state.`);
            openDocuments.delete(docId);
            return;
        }
        console.error(`[collab] Failed to save document ${docId}:`, error);
    }
}

async function loadDocumentState(docId: string, ydoc: Y.Doc) {
    try {
        const document = await prisma.document.findUnique({
            where: { id: docId },
            select: { yjs_state: true },
        });

        if (document?.yjs_state) {
            Y.applyUpdate(ydoc, new Uint8Array(document.yjs_state));
            console.log(`[collab] Loaded saved state for document ${docId}`);
        }
    } catch (error) {
        console.error(`[collab] Failed to load document ${docId}:`, error);
    }
}

const ysocketio = new YSocketIO(io, {
    authenticate: async (handshake: { [key: string]: any }) => {
        const docId = handshake.query?.doc_id;
        const email = handshake.query?.email;

        if (typeof docId !== "string" || !docId) {
            console.warn("[collab] Rejected join: no document id in handshake");
            return false;
        }

        if (typeof email !== "string" || !email) {
            console.warn("[collab] Rejected join: no identity in handshake");
            return false;
        }

        try {
            const permission = await prisma.document_Permissions.findFirst({
                where: {
                    document_id: docId,
                    OR: [{ email }, { user: { email } }],
                },
                select: { permission_level: true },
            });

            if (!permission) {
                console.warn(`[collab] Access denied for ${email} on ${docId}`);
                return false;
            }

            /*
             * y-socket.io has no read-only mode: anyone in the room can apply
             * Yjs updates. Previously any permission row was enough to join, so
             * a VIEWER could edit the shared document in real time. Viewers read
             * the persisted document through the web app instead.
             */
            if (permission.permission_level === "VIEWER") {
                console.warn(`[collab] Read-only user ${email} refused write session on ${docId}`);
                return false;
            }

            console.log(`[collab] ${email} authorized for ${docId}`);
            return true;
        } catch (error) {
            console.error("[collab] Permission lookup failed:", error);
            return false;
        }
    },
});

ysocketio.initialize();

/*
 * y-socket.io emits these events with the Document itself as the first (and for
 * two of them, only) argument — NOT `(name, doc)`. The previous handlers were
 * declared as `(docName: string, ydoc: Y.Doc)`, so `docName` was really the
 * Document object and `ydoc` was undefined. Every Prisma call therefore ran
 * with an object as the primary key and blew up with "Maximum call stack size
 * exceeded", which meant Yjs state was never loaded and never persisted.
 * The document's id is `doc.name`, the room name the client connected to.
 */
ysocketio.on("document-loaded", async (doc: YDocument) => {
    console.log(`[collab] Document opened: ${doc.name}`);
    openDocuments.set(doc.name, doc);
    await loadDocumentState(doc.name, doc);
});

ysocketio.on("document-destroy", async (doc: YDocument) => {
    console.log(`[collab] Document closed: ${doc.name}`);

    const pending = saveTimeouts.get(doc.name);
    if (pending) {
        clearTimeout(pending);
        saveTimeouts.delete(doc.name);
    }

    openDocuments.delete(doc.name);
    await saveDocumentState(doc.name, doc);
});

ysocketio.on("document-update", (doc: YDocument) => {
    openDocuments.set(doc.name, doc);

    const pending = saveTimeouts.get(doc.name);
    if (pending) {
        clearTimeout(pending);
    }

    saveTimeouts.set(
        doc.name,
        setTimeout(() => {
            saveTimeouts.delete(doc.name);
            void saveDocumentState(doc.name, doc);
        }, SAVE_DEBOUNCE_MS),
    );
});

/** Periodic checkpoint of every open document. */
const checkpointTimer = setInterval(() => {
    for (const [docName, ydoc] of openDocuments) {
        void saveDocumentState(docName, ydoc);
    }
}, CHECKPOINT_INTERVAL_MS);

io.on("connection", (socket) => {
    const docId = socket.handshake.query.doc_id;
    // The client sends identity on the handshake query, not on `auth`.
    const email = socket.handshake.query.email ?? "anonymous";

    console.log(`[collab] ${email} connected to ${docId}`);

    socket.on("disconnect", (reason) => {
        console.log(`[collab] ${email} disconnected from ${docId}: ${reason}`);
    });
});

httpServer.listen(port, () => {
    console.log(`[collab] Collaboration server listening on port ${port}`);
    console.log(`[collab] Allowed origins: ${allowedOrigins.join(", ")}`);
});

/**
 * Flush everything still in memory before the process goes away, so a redeploy
 * or container restart cannot lose the last few seconds of edits.
 */
let shuttingDown = false;

async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`[collab] ${signal} received, flushing open documents…`);
    clearInterval(checkpointTimer);

    for (const timeout of saveTimeouts.values()) {
        clearTimeout(timeout);
    }
    saveTimeouts.clear();

    await Promise.allSettled(
        [...openDocuments].map(([docName, ydoc]) => saveDocumentState(docName, ydoc)),
    );

    await prisma.$disconnect().catch(() => undefined);

    io.close(() => {
        httpServer.close(() => process.exit(0));
    });

    // Don't hang forever if a socket refuses to close.
    setTimeout(() => process.exit(0), 10000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
