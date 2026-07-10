import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import { YSocketIO } from "y-socket.io/dist/server";
import { prisma } from "./lib/prisma"
import * as Y from "yjs";

async function saveDocumentState(doc_id: string, ydoc: any) {
    try {
        const YDocState = Buffer.from(Y.encodeStateAsUpdate(ydoc))
        await prisma.document.update({
            where: {
                id: doc_id
            },
            data: {
                yjs_state: YDocState,
                updated_at: new Date()
            }
        })
    } catch (error) {
        console.error(`Failed to save document ${doc_id}:`, error)
    }
}

async function loadDocumentState(docId: string, ydoc: any) {
    try {
        const document = await prisma.document.findUnique({
            where: { id: docId },
            select: { yjs_state: true }
        })

        if (document?.yjs_state) {
            Y.applyUpdate(ydoc, new Uint8Array(document.yjs_state))
            console.log(`Loaded existing state for document ${docId}`)
        }
    } catch (error) {
        console.error(`Failed to load document ${docId}:`, error)
    }
}

const app = express()
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true,
}))

const httpServer = http.createServer(app)

const io = new Server(httpServer, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
    }
})

const saveTimeouts = new Map<string, NodeJS.Timeout>();

const ysocketio = new YSocketIO(io, {
    authenticate: async (handshake: { [key: string]: any }) => {
        const doc_id = handshake.query?.doc_id;
        const email = handshake.query?.email;
        if (!doc_id) {
            console.log("No document ID provided in handshake");
            return false;
        }

        console.log(email);


        if (!email) {
            console.log("No valid session token.");
            return false;
        }

        const permission = await prisma.document_Permissions.findFirst({
            where: {
                document_id: doc_id,
                OR: [
                    { email: email },
                    { user: { email: email } }
                ]
            }
        })

        if (!permission) {
            console.log(`Access denied for document ${doc_id}`);
            return false;
        }

        console.log(`User ${email} authorized for document ${doc_id}`);
        return true
    }
});

ysocketio.initialize();


ysocketio.on('document-loaded', async (docName: string, ydoc: Y.Doc) => {
    console.log(`Document created: ${docName}`)
    await loadDocumentState(docName, ydoc)
});

ysocketio.on('document-destroy', async (docName: string, ydoc: Y.Doc) => {
    console.log(`Document destroyed: ${docName}`)
    await saveDocumentState(docName, ydoc)
});

ysocketio.on('document-update', async (docName: string, ydoc: Y.Doc, update: Uint8Array) => {
    if (saveTimeouts.has(docName)) {
        clearTimeout(saveTimeouts.get(docName))
    }

    const timeout = setTimeout(async () => {
        await saveDocumentState(docName, ydoc)
        saveTimeouts.delete(docName)
    }, 5000)

    saveTimeouts.set(docName, timeout)
});


setInterval(async () => {
    const activeDocuments = ysocketio.documents
    if (activeDocuments.size != 0) {
        for (const [docName, ydoc] of activeDocuments) {
            await saveDocumentState(docName, ydoc)
        }
    }
    console.log(`Periodic save completed for ${activeDocuments.size} documents`)
}, 12000)

io.on('connection', (socket) => {
    const doc_id = socket.handshake.query.doc_id;
    const user_email = socket.handshake.auth?.email || 'Anonymous'

    if (!doc_id) {
        socket.emit('error', { msg: "Document ID is required" })
        socket.disconnect()
        return
    }

    console.log(`User ${user_email} connected to document: ${doc_id}`)

    socket.on('disconnect', (reason) => {
        console.log(`User ${user_email} disconnected from document ${doc_id}: ${reason}`)
    })

    socket.on('connect_error', (error) => {
        console.error(`Connection error for document ${doc_id}:`, error)
    })
})

httpServer.listen(8080, () => {
    console.log(`WebSocket server is running at http://localhost:8080`);
});