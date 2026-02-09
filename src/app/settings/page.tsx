"use client"
import { PlaceholderPage } from "@/components/ui/PlaceholderPage"
import { Settings } from "lucide-react"

export default function SettingsPage() {
    return (
        <PlaceholderPage
            title="Configuración"
            description="Ajustes del sistema: conexión a base de datos, temas visuales, parámetros de auditoría y preferencias generales."
            icon={<Settings className="h-10 w-10 text-orange-600" />}
        />
    )
}
