"use client"
import { PlaceholderPage } from "@/components/ui/PlaceholderPage"
import { FileText } from "lucide-react"

export default function ProtocolsPage() {
    return (
        <PlaceholderPage
            title="Protocolos"
            description="Definición y consulta de protocolos médicos aplicables a cada práctica y jurisdicción."
            icon={<FileText className="h-10 w-10 text-orange-600" />}
        />
    )
}
