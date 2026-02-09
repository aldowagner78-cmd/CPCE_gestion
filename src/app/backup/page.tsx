"use client"
import { PlaceholderPage } from "@/components/ui/PlaceholderPage"
import { HardDrive } from "lucide-react"

export default function BackupPage() {
    return (
        <PlaceholderPage
            title="Backup & Sincronización"
            description="Respaldo de datos, sincronización con Supabase y exportación de registros."
            icon={<HardDrive className="h-10 w-10 text-orange-600" />}
        />
    )
}
