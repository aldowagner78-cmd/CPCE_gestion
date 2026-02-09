"use client"
import { PlaceholderPage } from "@/components/ui/PlaceholderPage"
import { Activity } from "lucide-react"

export default function MatcherPage() {
    return (
        <PlaceholderPage
            title="Homologador"
            description="Herramienta de homologación para cruzar códigos entre nomencladores de distintas jurisdicciones."
            icon={<Activity className="h-10 w-10 text-orange-600" />}
        />
    )
}
