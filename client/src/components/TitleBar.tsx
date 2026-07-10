'use client'

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Menu, FileText, Plus, Search, ShieldCheck, PencilLine, Eye
} from "lucide-react"
import { useEffect, useState } from "react"
import axios from "axios"
import ShareModal from "./ShareModal"
import * as Y from 'yjs'

export default function TitleBar({
    content,
    title,
    permission,
    yjs_state,
    setTitle,
    setContent,
    setPermission,
    onStartCollaboration,
    onStopCollaboration,
    isCollaborating,
    connectionStatus
}: {
    content: string
    title: string
    permission: string
    yjs_state: Y.Doc|null
    setTitle: (value: string) => void
    setContent: (value: string) => void
    setPermission: (value: "OWNER" | "EDITOR" | "VIEWER") => void
    onStartCollaboration: (docId: string) => void
    onStopCollaboration: () => void
    isCollaborating: boolean
    connectionStatus: 'disconnected' | 'connecting' | 'connected'
}) {
    const [documents, setDocuments] = useState<
        { title: string; content: string; permission: 'OWNER' | 'EDITOR' | 'VIEWER' }[]
    >([])

    const [searchQuery, setSearchQuery] = useState("")
    const [currDoc, setCurrDoc] = useState<{ id: string; content: string, title: string }>()
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        async function fetchDocs() {
            try {
                const res = await axios.get("/api/docs", { withCredentials: true })
                setDocuments(res.data.list)
            } catch (err) {
                console.error("Error fetching documents:", err)
            }
        }
        fetchDocs()
    }, [])

    const filteredDocuments = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    function getPermissionIcon(permission: string) {
        switch (permission) {
            case 'OWNER':
                return <ShieldCheck className="h-4 w-4 text-green-600" />
            case 'EDITOR':
                return <PencilLine className="h-4 w-4 text-blue-500" />
            case 'VIEWER':
                return <Eye className="h-4 w-4 text-gray-400" />
            default:
                return null
        }
    }


    async function clickeHandler(doc: any) {
        setContent(doc.content)
        setTitle(doc.title)
        setCurrDoc(doc)
        setPermission(doc.permission)
    }

    async function saveHandler() {
        try {
            const resp = await axios.post("/api/docs/save", { title, content, permission, yjs_state }, { withCredentials: true });
            setSaved(true)
            setCurrDoc(resp.data.doc)
            console.log("Saved successfully:", resp.data);
        } catch (error) {
            console.error("Error saving:", error);
        }
    }

    async function collabHandler() {
        await saveHandler()
        if (permission === "VIEWER") {
            alert("Viewers cannot collaborate. You need Editor or Owner permissions.")
            return
        }
        try {
            if (isCollaborating) {
                onStopCollaboration()
            } else {
                onStartCollaboration(currDoc?.id||"")
            }
        } catch (error) {
            console.error("Error toggling collaboration:", error)
            alert("Failed to toggle collaboration. Please try again.")
        }
    }

    return (
        <div className="flex items-center justify-between h-14 px-6 bg-white border-b border-gray-200">
            {/* Left Section - Menu */}
            <div className="flex items-center gap-3">
                <Sheet>
                    <SheetTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-9 w-9 hover:bg-gray-100 transition-colors"
                        >
                            <Menu className="h-4 w-4 text-gray-600" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-80 p-0">
                        {/* Sidebar Header */}
                        <div className="p-6 border-b border-gray-200">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 mb-2">Documents</h2>
                                <Button
                                    size="sm"
                                    className="h-8 px-3 w-full justify-center"
                                    onClick={() => {
                                        setContent("")
                                        setTitle("")
                                    }}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    New Document
                                </Button>
                            </div>


                            {/* Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Search documents..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-9 bg-gray-50 border-gray-200 focus:bg-white"
                                />
                            </div>
                        </div>

                        {/* Documents List */}
                        <div className="p-4">
                            {filteredDocuments.length > 0 ? (
                                <div className="space-y-1">
                                    {filteredDocuments.map((doc, i) => (
                                        <div
                                            key={i}
                                            onClick={() => clickeHandler(doc)}
                                            className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
                                        >
                                            {/* Left: File + Title */}
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                                                <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate">
                                                    {doc.title}
                                                </span>
                                            </div>
                                            {/* Right: Permission Icon */}
                                            {getPermissionIcon(doc.permission)}
                                        </div>

                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                                    <p className="text-sm text-gray-500">
                                        {searchQuery ? 'No documents found' : 'No documents yet'}
                                    </p>
                                </div>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>

                {/* App Logo/Brand */}
                <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-gray-900 text-sm">Docs</span>
                </div>
            </div>

            {/* Center Section - Title Input */}
            <div className="flex-1 max-w-md mx-8">
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="text-lg font-medium border-none shadow-none focus-visible:ring-0 bg-transparent hover:bg-gray-50 focus:bg-white transition-colors text-center px-4 py-2 rounded-md"
                    placeholder="Untitled Document"
                />
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-2">
                <ShareModal permission={permission} setPermission={setPermission} doc_id={currDoc?.id||""} saved={saved} />
                <Button
                    size="sm"
                    className="h-8 px-4 text-sm font-medium"
                    onClick={() => saveHandler()}
                >
                    Save
                </Button>
                <Button
                    size="sm"
                    className={`h-8 px-4 text-sm font-medium ${isCollaborating
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    onClick={collabHandler}
                    disabled={connectionStatus === 'connecting'}
                >
                    {connectionStatus === 'connecting' ? (
                        <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                            Connecting...
                        </>
                    ) : isCollaborating ? (
                        'Stop Collab'
                    ) : (
                        'Start Collab'
                    )}
                </Button>
            </div>
        </div>
    )
}
