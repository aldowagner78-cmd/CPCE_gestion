"use client"

import { useState, useEffect } from "react"
import { useJurisdiction } from "@/lib/jurisdictionContext"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabase/client"
import { Clock, ShieldCheck, CheckCircle, XCircle, Loader2 } from "lucide-react"

type PendingAudit = {
    id: string
    status: string
    notes: string | null
    created_at: string
    coverage_result: Record<string, unknown> | null
}

export default function PendingPage() {
    const { activeJurisdiction } = useJurisdiction()
    const [audits, setAudits] = useState<PendingAudit[]>([])
    const [loading, setLoading] = useState(true)

    const supabase = getSupabaseClient()

    const fetchPending = async () => {
        if (!activeJurisdiction) return
        setLoading(true)
        const { data } = await supabase
            .from('audits')
            .select('id, status, notes, created_at, coverage_result')
            .eq('jurisdiction_id', activeJurisdiction.id)
            .in('status', ['pending', 'requires_auth'])
            .order('created_at', { ascending: false })
        setAudits((data ?? []) as PendingAudit[])
        setLoading(false)
    }

    useEffect(() => { fetchPending() }, [activeJurisdiction])

    const handleAction = async (id: string, action: 'approved' | 'rejected') => {
        await supabase.from('audits').update({ status: action, reviewed_at: new Date().toISOString() }).eq('id', id)
        await fetchPending()
    }

    const cr = (a: PendingAudit) => a.coverage_result as Record<string, unknown> | null

    if (!activeJurisdiction) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>

    return (
        <div className="space-y-6 container mx-auto max-w-5xl pt-6">
            <div className="flex items-center gap-3">
                <div className="bg-amber-100 p-2 rounded-lg"><Clock className="h-6 w-6 text-amber-600" /></div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Pendientes de Revisión</h1>
                    <p className="text-muted-foreground">Auditorías que requieren aprobación o autorización previa</p>
                </div>
                <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">● Supabase</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Card className="p-3"><div className="text-xs text-blue-600">Pendientes</div><div className="text-2xl font-bold text-blue-700">{audits.filter(a => a.status === 'pending').length}</div></Card>
                <Card className="p-3"><div className="text-xs text-purple-600">Req. Autorización</div><div className="text-2xl font-bold text-purple-700">{audits.filter(a => a.status === 'requires_auth').length}</div></Card>
            </div>

            {loading ? (
                <Card className="p-12 flex flex-col items-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" /><p className="text-sm text-muted-foreground">Cargando pendientes...</p></Card>
            ) : audits.length === 0 ? (
                <Card className="p-12 text-center">
                    <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                    <h3 className="font-semibold">Sin pendientes</h3>
                    <p className="text-sm text-muted-foreground">Todas las auditorías han sido revisadas.</p>
                </Card>
            ) : (
                <div className="space-y-3">
                    {audits.map(a => {
                        const data = cr(a)
                        return (
                            <Card key={a.id} className={`p-4 border-l-4 ${a.status === 'requires_auth' ? 'border-l-purple-500' : 'border-l-blue-500'}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            {a.status === 'requires_auth' ? <ShieldCheck className="h-4 w-4 text-purple-600" /> : <Clock className="h-4 w-4 text-blue-600" />}
                                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.status === 'requires_auth' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {a.status === 'requires_auth' ? 'Req. Autorización' : 'Pendiente'}
                                            </span>
                                        </div>
                                        <h3 className="font-semibold mt-1">{data?.affiliate_name as string ?? 'Afiliado'} — {data?.practice_description as string ?? 'Práctica'}</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            Cobertura: {data?.coverage_percent as number ?? 0}% | Copago: ${(data?.copay as number ?? 0).toLocaleString('es-AR')}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                                        {a.notes && <p className="text-xs mt-1 italic text-muted-foreground">Nota: {a.notes}</p>}
                                    </div>
                                    <div className="flex gap-2 shrink-0 ml-4">
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleAction(a.id, 'approved')}>
                                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aprobar
                                        </Button>
                                        <Button size="sm" variant="danger" onClick={() => handleAction(a.id, 'rejected')}>
                                            <XCircle className="h-3.5 w-3.5 mr-1" /> Rechazar
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
