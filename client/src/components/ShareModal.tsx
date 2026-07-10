'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import axios from "axios"

export default function ShareModal({ permission, setPermission, doc_id, saved }: {
    saved: boolean,
    permission: string,
    doc_id: string,
    setPermission: (value: "OWNER" | "EDITOR" | "VIEWER") => void
}) {
    const [email, setEmail] = useState("")

    const handleShare = async () => {
        console.log("Shared with:", { email, permission })
        if (saved) {
            console.log("inside");            
            const resp = await axios.post('api/docs/share', {
                doc_id:doc_id, email, permission
            }, { withCredentials: true })
        }
        else{
            console.log("Save first");
            return;            
        }
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                    Share
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share this document</DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            placeholder="name@example.com"
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="permission">Permission</Label>
                        <Select value={permission} onValueChange={setPermission}>
                            <SelectTrigger id="permission">
                                <SelectValue placeholder="Select permission" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="OWNER">Owner</SelectItem>
                                <SelectItem value="EDITOR">Editor</SelectItem>
                                <SelectItem value="VIEWER">Viewer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="mt-2">
                    <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleShare}>Share</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
