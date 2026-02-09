"use client"
import { PlaceholderPage } from "@/components/ui/PlaceholderPage"
import { Clock } from "lucide-react"

export default function PendingPage() {
    return (
        <PlaceholderPage
            title="Pendientes"
            description="Cola de auditorías pendientes de revisión y prácticas que requieren autorización previa."
            icon={<Clock className="h-10 w-10 text-orange-600" />}
        />
    )
}
