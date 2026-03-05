'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Pencil, Trash2, X, RotateCcw } from 'lucide-react';

export type FieldStatus = 'pending' | 'accepted' | 'editing' | 'deleted';

interface FieldReviewCardProps {
    label: string;
    value: string;
    fieldKey: string;
    status: FieldStatus;
    icon?: React.ReactNode;
    multiline?: boolean;
    onAccept: (key: string, value: string) => void;
    onDelete: (key: string) => void;
    onEdit: (key: string, value: string) => void;
}

export function FieldReviewCard({
    label,
    value,
    fieldKey,
    status,
    icon,
    multiline = false,
    onAccept,
    onDelete,
    onEdit,
}: FieldReviewCardProps) {
    const [editValue, setEditValue] = useState(value);
    const [isEditing, setIsEditing] = useState(false);

    if (status === 'deleted') {
        return (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-dashed border-muted-foreground/20 opacity-50">
                <span className="text-xs text-muted-foreground line-through flex-1">{label}: {value}</span>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => { onEdit(fieldKey, value); }}
                    title="Restaurar"
                >
                    <RotateCcw className="h-3 w-3" />
                </Button>
            </div>
        );
    }

    const borderColor = status === 'accepted'
        ? 'border-green-300 bg-green-50/50'
        : isEditing
            ? 'border-blue-300 bg-blue-50/30'
            : 'border-border bg-background';

    return (
        <div className={`rounded-lg border-2 ${borderColor} transition-all duration-200`}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-inherit">
                <div className="flex items-center gap-1.5">
                    {icon && <span className="text-muted-foreground">{icon}</span>}
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {label}
                    </span>
                    {status === 'accepted' && (
                        <Check className="h-3.5 w-3.5 text-green-600" />
                    )}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-0.5">
                    {!isEditing && status !== 'accepted' && (
                        <>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                onClick={() => { setIsEditing(true); setEditValue(value); }}
                                title="Editar"
                            >
                                <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => onAccept(fieldKey, value)}
                                title="Aceptar"
                            >
                                <Check className="h-3 w-3" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => onDelete(fieldKey)}
                                title="Eliminar"
                            >
                                <Trash2 className="h-3 w-3" />
                            </Button>
                        </>
                    )}
                    {status === 'accepted' && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => { setIsEditing(true); setEditValue(value); }}
                            title="Re-editar"
                        >
                            <Pencil className="h-3 w-3" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="px-3 py-2">
                {isEditing ? (
                    <div className="space-y-2">
                        {multiline ? (
                            <textarea
                                className="w-full text-sm border rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
                                rows={3}
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                autoFocus
                            />
                        ) : (
                            <Input
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                className="text-sm h-8"
                                autoFocus
                            />
                        )}
                        <div className="flex gap-1.5 justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setIsEditing(false)}
                            >
                                <X className="h-3 w-3 mr-1" /> Cancelar
                            </Button>
                            <Button
                                size="sm"
                                className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => {
                                    onAccept(fieldKey, editValue);
                                    setIsEditing(false);
                                }}
                            >
                                <Check className="h-3 w-3 mr-1" /> Guardar y Aceptar
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className={`text-sm ${status === 'accepted' ? 'text-green-800 font-medium' : 'text-foreground'}`}>
                        {value || <span className="italic text-muted-foreground">Sin datos</span>}
                    </p>
                )}
            </div>
        </div>
    );
}
