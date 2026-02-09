"use client"
import { PlaceholderPage } from "@/components/ui/PlaceholderPage"
import { Users } from "lucide-react"

export default function PatientsPage() {
    return (
        <PlaceholderPage
            title="Gestión de Pacientes"
            description="Alta, baja y modificación de afiliados. Consulta de historial clínico y estado de cobertura."
            icon={<Users className="h-10 w-10 text-orange-600" />}
        />
    )
}
