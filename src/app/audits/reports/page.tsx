'use client';

import { useEffect, useState, useCallback } from 'react';
import { DatePicker } from '@/components/ui/DatePicker';
import { useJurisdiction } from '@/lib/jurisdictionContext';
import { useAuth } from '@/contexts/AuthContext';
import {
    ReportService,
    type DashboardMetrics,
} from '@/services/reportService';
import {
    BarChart3,
    TrendingUp,
    Clock,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    FileText,
    Download,
    Calendar,
    Printer,
    Loader2,
    ArrowUpRight,
    ArrowDownRight,
    DollarSign,
    Users,
    Activity,
    PieChart as PieChartIcon,
    RefreshCw,
} from 'lucide-react';
import {
    Bar,
    BarChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell,
    CartesianGrid,
    Area,
    AreaChart,
} from 'recharts';
import { generateReportPDF } from '@/lib/reportPDF';

// ── Constantes ──

const STATUS_LABELS: Record<string, string> = {
    pendiente: 'Pendientes',
    en_revision: 'En revisión',
    parcialmente_resuelto: 'Parcial',
    resuelto: 'Resueltos',
    observada: 'Observados',
    en_apelacion: 'Apelación',
    anulada: 'Anulados',
    borrador: 'Borradores',
};

const STATUS_COLORS: Record<string, string> = {
    pendiente: '#f59e0b',
    en_revision: '#3b82f6',
    parcialmente_resuelto: '#8b5cf6',
    resuelto: '#22c55e',
    observada: '#f97316',
    en_apelacion: '#ef4444',
    anulada: '#6b7280',
    borrador: '#94a3b8',
};

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316', '#14b8a6'];

const fmtCurrency = (v: number) =>
    v.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 });

const fmtNumber = (v: number) =>
    v.toLocaleString('es-AR');

// ── KPI Card ──

function KPICard({
    title, value, subtitle, icon: Icon, trend, color = 'blue',
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ElementType;
    trend?: { value: number; label: string };
    color?: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'indigo';
}) {
    const colorMap = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        green: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        red: 'bg-red-50 text-red-600 border-red-200',
        amber: 'bg-amber-50 text-amber-600 border-amber-200',
        purple: 'bg-purple-50 text-purple-600 border-purple-200',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    };
    const iconBg = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-emerald-100 text-emerald-600',
        red: 'bg-red-100 text-red-600',
        amber: 'bg-amber-100 text-amber-600',
        purple: 'bg-purple-100 text-purple-600',
        indigo: 'bg-indigo-100 text-indigo-600',
    };

    return (
        <div className={`rounded-xl border p-5 ${colorMap[color]} transition-shadow hover:shadow-md`}>
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium opacity-70 uppercase tracking-wide">{title}</p>
                    <p className="text-2xl font-bold mt-1">{value}</p>
                    {subtitle && <p className="text-xs mt-1 opacity-60">{subtitle}</p>}
                    {trend && (
                        <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {trend.value >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {Math.abs(trend.value)}% {trend.label}
                        </div>
                    )}
                </div>
                <div className={`p-2.5 rounded-lg ${iconBg[color]}`}>
                    <Icon className="h-5 w-5" />
                </div>
            </div>
        </div>
    );
}

// ── Componente principal ──

export default function AuditReportsPage() {
    const { activeJurisdiction } = useJurisdiction();
    const { user } = useAuth();
    const jurisdictionId = activeJurisdiction?.id;

    // State
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const [year, setYear] = useState(new Date().getFullYear());
    const [dateFrom, setDateFrom] = useState(`${new Date().getFullYear()}-01-01`);
    const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState<'dashboard' | 'exportar'>('dashboard');

    const loadMetrics = useCallback(async () => {
        setLoading(true);
        try {
            const data = await ReportService.getDashboardMetrics({
                jurisdictionId,
                dateFrom,
                dateTo,
                year,
            });
            setMetrics(data);
        } catch (err) {
            console.error('Error loading metrics:', err);
        } finally {
            setLoading(false);
        }
    }, [jurisdictionId, dateFrom, dateTo, year]);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            await loadMetrics();
            if (cancelled) return;
        };
        run();
        return () => { cancelled = true; };
    }, [loadMetrics]);

    // ── Export handlers ──

    const handleExportExpedients = async () => {
        setExporting(true);
        try {
            const data = await ReportService.getExpedientsForExport({
                jurisdictionId,
                dateFrom,
                dateTo,
            });
            generateReportPDF('expedientes', data, {
                title: 'Reporte de Expedientes',
                dateFrom,
                dateTo,
                jurisdiction: activeJurisdiction?.name || '',
            });
        } catch (err) {
            console.error('Error exporting:', err);
        } finally {
            setExporting(false);
        }
    };

    const handleExportAuthorizations = async () => {
        setExporting(true);
        try {
            const data = await ReportService.getAuthorizationsForExport({
                jurisdictionId,
                dateFrom,
                dateTo,
            });
            generateReportPDF('autorizaciones', data, {
                title: 'Reporte de Autorizaciones Emitidas',
                dateFrom,
                dateTo,
                jurisdiction: activeJurisdiction?.name || '',
            });
        } catch (err) {
            console.error('Error exporting:', err);
        } finally {
            setExporting(false);
        }
    };

    const handleExportDebits = async () => {
        setExporting(true);
        try {
            const data = await ReportService.getDebitsForExport({
                jurisdictionId,
                dateFrom,
                dateTo,
            });
            generateReportPDF('debitos', data, {
                title: 'Reporte de Notas de Débito',
                dateFrom,
                dateTo,
                jurisdiction: activeJurisdiction?.name || '',
            });
        } catch (err) {
            console.error('Error exporting:', err);
        } finally {
            setExporting(false);
        }
    };

    const handleExportCSV = async () => {
        setExporting(true);
        try {
            const data = await ReportService.getExpedientsForExport({
                jurisdictionId,
                dateFrom,
                dateTo,
            });
            exportToCSV(data, `expedientes_${dateFrom}_${dateTo}`);
        } catch (err) {
            console.error('Error exporting CSV:', err);
        } finally {
            setExporting(false);
        }
    };

    // ── CSV helper ──
    function exportToCSV(data: Array<Record<string, unknown>>, filename: string) {
        if (data.length === 0) return;

        const rows = data.map((row) => ({
            Expediente: row.expedient_number || '',
            Tipo: row.type || '',
            Estado: row.status || '',
            Prioridad: row.priority || '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Afiliado: (row.affiliate as any)?.full_name || '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            DNI: (row.affiliate as any)?.document_number || '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Prestador: (row.provider as any)?.name || '',
            Creado: row.created_at ? new Date(row.created_at as string).toLocaleDateString('es-AR') : '',
            Resuelto: row.resolved_at ? new Date(row.resolved_at as string).toLocaleDateString('es-AR') : '',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            Prácticas: Array.isArray(row.practices) ? (row.practices as any[]).length : 0,
        }));

        const headers = Object.keys(rows[0]);
        const csvContent = [
            headers.join(';'),
            ...rows.map(r => headers.map(h => `"${String(r[h as keyof typeof r] ?? '').replace(/"/g, '""')}"`).join(';')),
        ].join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ── Status pie data ──
    const statusPieData = metrics ? Object.entries(metrics.expedientsByStatus)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({
            name: STATUS_LABELS[k] || k,
            value: v,
            color: STATUS_COLORS[k] || '#6b7280',
        })) : [];

    // ── Type pie data ──
    const typePieData = metrics?.expedientsByType?.map((t, i) => ({
        name: t.label,
        value: t.count,
        color: PIE_COLORS[i % PIE_COLORS.length],
    })) || [];

    // ── Resolution bar data ──
    const resolutionData = metrics ? [
        { name: 'Autorizadas', value: metrics.practicesByResolution.autorizada, fill: '#22c55e' },
        { name: 'Parciales', value: metrics.practicesByResolution.autorizada_parcial, fill: '#8b5cf6' },
        { name: 'Denegadas', value: metrics.practicesByResolution.denegada, fill: '#ef4444' },
        { name: 'Observadas', value: metrics.practicesByResolution.observada, fill: '#f59e0b' },
        { name: 'Diferidas', value: metrics.practicesByResolution.diferida, fill: '#3b82f6' },
    ].filter(d => d.value > 0) : [];

    // ── Current year for year selector ──
    const currentYear = new Date().getFullYear();
    const yearOptions = [currentYear - 2, currentYear - 1, currentYear];

    if (loading && !metrics) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">Cargando métricas...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 max-w-[1400px] mx-auto">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-primary" />
                        Reportes y Estadísticas
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {activeJurisdiction?.name || 'Todas las jurisdicciones'} · Dashboard de auditoría médica
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={loadMetrics}
                        disabled={loading}
                        className="p-2 rounded-lg border hover:bg-muted transition-colors"
                        title="Actualizar"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('dashboard')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'dashboard'
                            ? 'bg-background shadow text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Activity className="h-4 w-4 inline mr-1.5" />
                    Dashboard
                </button>
                <button
                    onClick={() => setActiveTab('exportar')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === 'exportar'
                            ? 'bg-background shadow text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Download className="h-4 w-4 inline mr-1.5" />
                    Exportar Reportes
                </button>
            </div>

            {/* ── Filters ── */}
            <div className="flex flex-wrap gap-3 items-end bg-muted/30 rounded-lg p-4 border">
                <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Año</label>
                    <select
                        value={year}
                        onChange={e => {
                            const y = Number(e.target.value);
                            setYear(y);
                            setDateFrom(`${y}-01-01`);
                            setDateTo(y === currentYear ? new Date().toISOString().split('T')[0] : `${y}-12-31`);
                        }}
                        className="h-9 px-3 rounded-md border text-sm bg-background"
                    >
                        {yearOptions.map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Desde</label>
                    <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="Desde" clearable />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Hasta</label>
                    <DatePicker value={dateTo} onChange={setDateTo} placeholder="Hasta" clearable />
                </div>
                <button
                    onClick={loadMetrics}
                    disabled={loading}
                    className="h-9 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4 inline mr-1" />}
                    Aplicar
                </button>
            </div>

            {activeTab === 'dashboard' && metrics && (
                <>
                    {/* ── KPI Cards ── */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        <KPICard
                            title="Total Expedientes"
                            value={fmtNumber(metrics.totalExpedients)}
                            subtitle={`${metrics.expedientsByStatus.resuelto} resueltos`}
                            icon={FileText}
                            color="blue"
                        />
                        <KPICard
                            title="Tasa Aprobación"
                            value={`${metrics.approvalRate.toFixed(1)}%`}
                            subtitle={`${metrics.practicesByResolution.autorizada + metrics.practicesByResolution.autorizada_parcial} aprobadas`}
                            icon={CheckCircle2}
                            color="green"
                        />
                        <KPICard
                            title="Tasa Denegación"
                            value={`${metrics.denialRate.toFixed(1)}%`}
                            subtitle={`${metrics.practicesByResolution.denegada} denegadas`}
                            icon={XCircle}
                            color="red"
                        />
                        <KPICard
                            title="Tiempo Prom."
                            value={metrics.avgResolutionHours < 24
                                ? `${metrics.avgResolutionHours.toFixed(0)}h`
                                : `${(metrics.avgResolutionHours / 24).toFixed(1)}d`
                            }
                            subtitle="resolución"
                            icon={Clock}
                            color="amber"
                        />
                        <KPICard
                            title="Pendientes"
                            value={fmtNumber(metrics.expedientsByStatus.pendiente + metrics.expedientsByStatus.en_revision)}
                            subtitle={`${metrics.expedientsByStatus.observada} observados`}
                            icon={AlertTriangle}
                            color="purple"
                        />
                        <KPICard
                            title="Facturación"
                            value={fmtCurrency(metrics.postAuditSummary.total_facturado)}
                            subtitle={`${metrics.postAuditSummary.total} auditorías`}
                            icon={DollarSign}
                            color="indigo"
                        />
                    </div>

                    {/* ── Row 1: Tendencias + Estado ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                        {/* Tendencias Mensuales */}
                        <div className="lg:col-span-4 rounded-xl border bg-card p-5">
                            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-primary" />
                                Tendencias Mensuales ({year})
                            </h3>
                            {metrics.monthlyTrends.some(m => m.total > 0) ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={metrics.monthlyTrends}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis dataKey="month" stroke="#888" fontSize={12} tickLine={false} />
                                        <YAxis stroke="#888" fontSize={12} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: '8px',
                                                border: 'none',
                                                boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)',
                                                fontSize: '12px',
                                            }}
                                        />
                                        <Legend />
                                        <Area type="monotone" dataKey="aprobadas" fill="#22c55e" fillOpacity={0.2} stroke="#22c55e" strokeWidth={2} name="Aprobadas" />
                                        <Area type="monotone" dataKey="denegadas" fill="#ef4444" fillOpacity={0.2} stroke="#ef4444" strokeWidth={2} name="Denegadas" />
                                        <Area type="monotone" dataKey="observadas" fill="#f59e0b" fillOpacity={0.15} stroke="#f59e0b" strokeWidth={2} name="Observadas" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                                    Sin datos para el período seleccionado
                                </div>
                            )}
                        </div>

                        {/* Estado de Expedientes (Pie) */}
                        <div className="lg:col-span-3 rounded-xl border bg-card p-5">
                            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                <PieChartIcon className="h-4 w-4 text-primary" />
                                Estado de Expedientes
                            </h3>
                            {statusPieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={statusPieData}
                                            cx="50%"
                                            cy="45%"
                                            innerRadius={55}
                                            outerRadius={85}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {statusPieData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)', fontSize: '12px' }}
                                        />
                                        <Legend
                                            verticalAlign="bottom"
                                            height={36}
                                            formatter={(value: string) => <span className="text-xs">{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                                    Sin expedientes
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Row 2: Resoluciones + Tipo ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Resoluciones por práctica */}
                        <div className="rounded-xl border bg-card p-5">
                            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                                Resoluciones por Práctica
                            </h3>
                            {resolutionData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={resolutionData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis type="number" stroke="#888" fontSize={12} />
                                        <YAxis type="category" dataKey="name" stroke="#888" fontSize={12} width={85} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)', fontSize: '12px' }} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]} name="Cantidad">
                                            {resolutionData.map((entry, i) => (
                                                <Cell key={i} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                                    Sin datos
                                </div>
                            )}
                        </div>

                        {/* Distribución por tipo */}
                        <div className="rounded-xl border bg-card p-5">
                            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                <PieChartIcon className="h-4 w-4 text-primary" />
                                Distribución por Tipo
                            </h3>
                            {typePieData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={260}>
                                    <PieChart>
                                        <Pie
                                            data={typePieData}
                                            cx="50%"
                                            cy="45%"
                                            innerRadius={50}
                                            outerRadius={75}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {typePieData.map((entry, i) => (
                                                <Cell key={i} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)', fontSize: '12px' }} />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-[260px] text-muted-foreground text-sm">
                                    Sin datos
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Row 3: Productividad + Top Prácticas ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Productividad por auditor */}
                        <div className="rounded-xl border bg-card p-5">
                            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" />
                                Productividad por Auditor
                            </h3>
                            {metrics.auditorProductivity.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Auditor</th>
                                                <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Resueltos</th>
                                                <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Autoriz.</th>
                                                <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Deneg.</th>
                                                <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">T. Prom.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {metrics.auditorProductivity.map((a) => (
                                                <tr key={a.auditor_id} className="border-b last:border-0 hover:bg-muted/50">
                                                    <td className="py-2 px-2 font-medium truncate max-w-[150px]" title={a.auditor_name}>{a.auditor_name}</td>
                                                    <td className="text-center py-2 px-2">
                                                        <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                                            {a.resueltos}
                                                        </span>
                                                    </td>
                                                    <td className="text-center py-2 px-2">
                                                        <span className="text-emerald-600 font-semibold">{a.autorizados}</span>
                                                    </td>
                                                    <td className="text-center py-2 px-2">
                                                        <span className="text-red-600 font-semibold">{a.denegados}</span>
                                                    </td>
                                                    <td className="text-center py-2 px-2 text-muted-foreground">
                                                        {a.tiempo_promedio_horas < 24
                                                            ? `${a.tiempo_promedio_horas.toFixed(0)}h`
                                                            : `${(a.tiempo_promedio_horas / 24).toFixed(1)}d`
                                                        }
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                                    Sin datos de productividad
                                </div>
                            )}
                        </div>

                        {/* Top prácticas */}
                        <div className="rounded-xl border bg-card p-5">
                            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-primary" />
                                Top 10 Prácticas Solicitadas
                            </h3>
                            {metrics.topPractices.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">#</th>
                                                <th className="text-left py-2 px-2 text-xs font-medium text-muted-foreground">Práctica</th>
                                                <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Total</th>
                                                <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Autoriz.</th>
                                                <th className="text-center py-2 px-2 text-xs font-medium text-muted-foreground">Deneg.</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {metrics.topPractices.map((p, i) => (
                                                <tr key={p.practice_id} className="border-b last:border-0 hover:bg-muted/50">
                                                    <td className="py-2 px-2 text-muted-foreground font-mono text-xs">{i + 1}</td>
                                                    <td className="py-2 px-2">
                                                        <div className="font-medium truncate max-w-[200px]" title={p.practice_description}>
                                                            {p.practice_description}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">{p.practice_code}</div>
                                                    </td>
                                                    <td className="text-center py-2 px-2">
                                                        <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                                            {p.count}
                                                        </span>
                                                    </td>
                                                    <td className="text-center py-2 px-2">
                                                        <span className="text-emerald-600 font-semibold">{p.authorized}</span>
                                                    </td>
                                                    <td className="text-center py-2 px-2">
                                                        <span className="text-red-600 font-semibold">{p.denied}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                                    Sin datos
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── Row 4: Post-Audit Summary ── */}
                    {metrics.postAuditSummary.total > 0 && (
                        <div className="rounded-xl border bg-card p-5">
                            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-primary" />
                                Resumen de Auditoría Posterior (Facturación)
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                                <div className="text-center p-3 bg-muted/30 rounded-lg">
                                    <p className="text-2xl font-bold text-foreground">{metrics.postAuditSummary.total}</p>
                                    <p className="text-xs text-muted-foreground">Total</p>
                                </div>
                                <div className="text-center p-3 bg-amber-50 rounded-lg">
                                    <p className="text-2xl font-bold text-amber-700">{metrics.postAuditSummary.pendientes}</p>
                                    <p className="text-xs text-amber-600">Pendientes</p>
                                </div>
                                <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <p className="text-2xl font-bold text-blue-700">{metrics.postAuditSummary.en_revision}</p>
                                    <p className="text-xs text-blue-600">En revisión</p>
                                </div>
                                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                                    <p className="text-2xl font-bold text-emerald-700">{metrics.postAuditSummary.aprobadas}</p>
                                    <p className="text-xs text-emerald-600">Aprobadas</p>
                                </div>
                                <div className="text-center p-3 bg-red-50 rounded-lg">
                                    <p className="text-2xl font-bold text-red-700">{metrics.postAuditSummary.con_debitos}</p>
                                    <p className="text-xs text-red-600">Con débitos</p>
                                </div>
                                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                                    <p className="text-lg font-bold text-indigo-700">{fmtCurrency(metrics.postAuditSummary.total_facturado)}</p>
                                    <p className="text-xs text-indigo-600">Facturado</p>
                                </div>
                                <div className="text-center p-3 bg-purple-50 rounded-lg">
                                    <p className="text-lg font-bold text-purple-700">{fmtCurrency(metrics.postAuditSummary.total_debitos)}</p>
                                    <p className="text-xs text-purple-600">Débitos</p>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* ── Tab: Exportar Reportes ── */}
            {activeTab === 'exportar' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Reporte de Expedientes */}
                    <div className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Expedientes por Período</h3>
                                <p className="text-xs text-muted-foreground">Listado completo con prácticas</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Genera un reporte detallado de todos los expedientes del período seleccionado,
                            incluyendo afiliado, prestador, prácticas y resoluciones.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={handleExportExpedients}
                                disabled={exporting}
                                className="flex-1 h-9 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                            >
                                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                                PDF
                            </button>
                            <button
                                onClick={handleExportCSV}
                                disabled={exporting}
                                className="flex-1 h-9 flex items-center justify-center gap-2 border rounded-md text-sm font-medium hover:bg-muted disabled:opacity-50"
                            >
                                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                CSV
                            </button>
                        </div>
                    </div>

                    {/* Reporte de Autorizaciones */}
                    <div className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Autorizaciones Emitidas</h3>
                                <p className="text-xs text-muted-foreground">Con código y vencimiento</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Listado de todas las autorizaciones emitidas en el período: práctica,
                            afiliado, cobertura, coseguro, código de autorización y vencimiento.
                        </p>
                        <button
                            onClick={handleExportAuthorizations}
                            disabled={exporting}
                            className="w-full h-9 flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-md text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                        >
                            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                            Generar PDF
                        </button>
                    </div>

                    {/* Reporte de Débitos */}
                    <div className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 bg-red-100 text-red-600 rounded-lg">
                                <DollarSign className="h-5 w-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Notas de Débito</h3>
                                <p className="text-xs text-muted-foreground">Débitos generados a prestadores</p>
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            Reporte de notas de débito generadas: prestador, factura, montos
                            facturado vs autorizado, diferencias y motivos de débito.
                        </p>
                        <button
                            onClick={handleExportDebits}
                            disabled={exporting}
                            className="w-full h-9 flex items-center justify-center gap-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                        >
                            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                            Generar PDF
                        </button>
                    </div>
                </div>
            )}

            {/* ── Footer info ── */}
            <p className="text-xs text-muted-foreground text-center pb-4">
                Datos actualizados a {new Date().toLocaleString('es-AR', { dateStyle: 'long', timeStyle: 'short' })}
                {user && ` · Usuario: ${user.full_name}`}
            </p>
        </div>
    );
}
