"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const auditData = [
    { name: "Ene", aprobadas: 40, rechazadas: 24 },
    { name: "Feb", aprobadas: 30, rechazadas: 13 },
    { name: "Mar", aprobadas: 20, rechazadas: 50 }, // Spike in rejections
    { name: "Abr", aprobadas: 27, rechazadas: 39 },
    { name: "May", aprobadas: 18, rechazadas: 48 },
    { name: "Jun", aprobadas: 23, rechazadas: 38 },
    { name: "Jul", aprobadas: 34, rechazadas: 43 },
]

const pieData = [
    { name: "Consultas", value: 400 },
    { name: "Cirugías", value: 300 },
    { name: "Prácticas", value: 300 },
    { name: "Internación", value: 200 },
]

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042']

export function DashboardCharts() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-6">
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Tendencias de Auditoría</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={auditData}>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend />
                            <Bar dataKey="aprobadas" fill="#22c55e" radius={[4, 4, 0, 0]} name="Aprobadas" />
                            <Bar dataKey="rechazadas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Rechazadas" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Distribución por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                fill="#8884d8"
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    )
}
