'use client';

import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImagePreviewProps {
    file: File | null;
    /** Optional: direct URL for preview instead of File */
    src?: string;
}

export function ImagePreview({ file, src }: ImagePreviewProps) {
    const [imageUrl, setImageUrl] = useState<string | null>(src || null);
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (src) {
            setImageUrl(src);
            return;
        }
        if (!file) { setImageUrl(null); return; }

        const url = URL.createObjectURL(file);
        setImageUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file, src]);

    const isPdf = file?.type === 'application/pdf';

    const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
    const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
    const handleRotate = () => setRotation(prev => (prev + 90) % 360);
    const handleReset = () => { setZoom(1); setRotation(0); };

    if (!imageUrl) {
        return (
            <div className="flex items-center justify-center h-full bg-muted/30 rounded-lg border-2 border-dashed border-muted-foreground/20">
                <p className="text-sm text-muted-foreground">Sin imagen para mostrar</p>
            </div>
        );
    }

    if (isPdf) {
        return (
            <div className="h-full flex flex-col">
                <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/50 rounded-t-lg border-b">
                    <span className="text-xs font-medium text-muted-foreground">Documento PDF</span>
                </div>
                <iframe
                    src={imageUrl}
                    className="flex-1 w-full rounded-b-lg border"
                    title="Vista previa PDF"
                />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-2 py-1.5 bg-muted/50 rounded-t-lg border-b">
                <span className="text-xs font-medium text-muted-foreground mr-auto">Documento Original</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut} title="Alejar">
                    <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-mono text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn} title="Acercar">
                    <ZoomIn className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRotate} title="Rotar">
                    <RotateCw className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset} title="Restablecer">
                    <Maximize2 className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Image container */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto bg-muted/20 rounded-b-lg border flex items-center justify-center p-4 cursor-grab active:cursor-grabbing"
            >
                <img
                    src={imageUrl}
                    alt="Pedido médico original"
                    className="max-w-full max-h-full object-contain transition-transform duration-200 select-none"
                    style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transformOrigin: 'center center',
                    }}
                    draggable={false}
                />
            </div>
        </div>
    );
}
