'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Homologator from '@/components/practices/Homologator'
import { externalNomenclatorService } from '@/services/externalNomenclatorService'

export default function HomologatePage() {
    const params = useParams()
    const router = useRouter()
    const nomenclatorId = parseInt(params.id as string)
    
    const [nomenclator, setNomenclator] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadNomenclator()
    }, [nomenclatorId])

    const loadNomenclator = async () => {
        try {
            const nomenclators = await externalNomenclatorService.getNomenclators()
            const found = nomenclators.find(n => n.id === nomenclatorId)
            setNomenclator(found)
        } catch (error) {
            console.error('Error loading nomenclator:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!nomenclator) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="text-center">
                    <p className="text-muted-foreground">Nomenclador no encontrado</p>
                    <Button
                        onClick={() => router.back()}
                        className="mt-4"
                    >
                        Volver
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Back Button */}
            <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="mb-6"
            >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver a {nomenclator.name}
            </Button>

            {/* Homologator Component */}
            <Homologator
                nomenclatorId={nomenclatorId}
                nomenclatorName={nomenclator.name}
            />
        </div>
    )
}
