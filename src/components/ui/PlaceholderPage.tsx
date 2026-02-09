"use client"

import { Card } from "@/components/ui/card"
import { Construction } from "lucide-react"

interface PlaceholderPageProps {
    title: string
    description: string
    icon?: React.ReactNode
}

export function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
    return (
        <div className="space-y-6 container mx-auto max-w-4xl pt-6">
            <Card className="p-12 flex flex-col items-center justify-center text-center space-y-4">
                <div className="bg-orange-100 p-4 rounded-full">
                    {icon || <Construction className="h-10 w-10 text-orange-600" />}
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                <p className="text-muted-foreground max-w-md">{description}</p>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                    Próximamente
                </span>
            </Card>
        </div>
    )
}
