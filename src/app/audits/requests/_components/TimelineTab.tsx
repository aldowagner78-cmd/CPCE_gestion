'use client';

import { formatDate, formatAction } from './configUI';
import type { ExpedientLog } from '@/types/database';

interface TimelineTabProps {
    log: ExpedientLog[];
}

export function TimelineTab({ log }: TimelineTabProps) {
    return (
        <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-4">
                {log.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground py-4">Sin historial</p>
                )}
                {log.map(l => (
                    <div key={l.id} className="flex items-start gap-4 relative">
                        <div className="w-6 h-6 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center shrink-0 z-10">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>
                        <div className="flex-1 pb-2">
                            <p className="text-sm font-medium">{formatAction(l.action)}</p>
                            <p className="text-[10px] text-muted-foreground">{formatDate(l.performed_at)}</p>
                            {Object.keys(l.details).length > 0 && (
                                <pre className="text-[10px] bg-muted/30 rounded-lg p-2 mt-1 overflow-x-auto">
                                    {JSON.stringify(l.details, null, 2)}
                                </pre>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
