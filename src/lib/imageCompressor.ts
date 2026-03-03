/**
 * Compresor de imágenes client-side usando Canvas API.
 * Reduce tamaño de JPG/PNG antes de subir a Supabase Storage.
 *
 * - Redimensiona si excede MAX_DIMENSION (mantiene proporción)
 * - Comprime JPEG a calidad configurable (default 0.7)
 * - Convierte PNG > 500KB a JPEG (los PNG de fotos pesan mucho)
 * - Muestra ahorro en consola para debug
 */

export interface CompressOptions {
    /** Dimensión máxima (ancho o alto). Default: 1600px */
    maxDimension?: number;
    /** Calidad JPEG 0-1. Default: 0.7 */
    quality?: number;
    /** Tamaño máximo en bytes antes de forzar compresión. Default: 300KB */
    thresholdBytes?: number;
    /** Convertir PNG pesados a JPEG. Default: true */
    convertPngToJpeg?: boolean;
    /** Umbral para convertir PNG a JPEG (bytes). Default: 500KB */
    pngConvertThreshold?: number;
}

const DEFAULT_OPTIONS: Required<CompressOptions> = {
    maxDimension: 1600,
    quality: 0.7,
    thresholdBytes: 300 * 1024,       // 300 KB
    convertPngToJpeg: true,
    pngConvertThreshold: 500 * 1024,  // 500 KB
};

/** Tipos MIME de imagen que podemos comprimir */
const COMPRESSIBLE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/** Resultado de la compresión */
export interface CompressResult {
    file: File;
    originalSize: number;
    compressedSize: number;
    wasCompressed: boolean;
    savings: number;         // bytes ahorrados
    savingsPercent: number;  // porcentaje ahorrado
}

/**
 * Comprime una imagen si es necesario.
 * Retorna el File original si no es imagen o no necesita compresión.
 */
export async function compressImage(
    file: File,
    options?: CompressOptions,
): Promise<CompressResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const originalSize = file.size;

    // Si no es imagen comprimible, devolver tal cual
    if (!COMPRESSIBLE_TYPES.includes(file.type)) {
        return {
            file,
            originalSize,
            compressedSize: originalSize,
            wasCompressed: false,
            savings: 0,
            savingsPercent: 0,
        };
    }

    // Si es chica, no comprimir
    if (file.size <= opts.thresholdBytes) {
        return {
            file,
            originalSize,
            compressedSize: originalSize,
            wasCompressed: false,
            savings: 0,
            savingsPercent: 0,
        };
    }

    try {
        const bitmap = await createImageBitmap(file);
        let { width, height } = bitmap;

        // Calcular nueva dimensión manteniendo proporción
        if (width > opts.maxDimension || height > opts.maxDimension) {
            const ratio = Math.min(opts.maxDimension / width, opts.maxDimension / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }

        // Crear canvas y dibujar
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('No se pudo crear contexto 2D');
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();

        // Decidir formato de salida
        let outputType = file.type;
        if (
            opts.convertPngToJpeg &&
            file.type === 'image/png' &&
            file.size > opts.pngConvertThreshold
        ) {
            outputType = 'image/jpeg';
        }

        // Comprimir
        const blob = await canvas.convertToBlob({
            type: outputType,
            quality: opts.quality,
        });

        // Si la compresión no ahorró nada, devolver original
        if (blob.size >= file.size) {
            return {
                file,
                originalSize,
                compressedSize: originalSize,
                wasCompressed: false,
                savings: 0,
                savingsPercent: 0,
            };
        }

        // Nombre del archivo (cambiar extensión si convertimos PNG→JPEG)
        let fileName = file.name;
        if (outputType === 'image/jpeg' && file.type === 'image/png') {
            fileName = fileName.replace(/\.png$/i, '.jpg');
        }

        const compressedFile = new File([blob], fileName, {
            type: outputType,
            lastModified: Date.now(),
        });

        const savings = originalSize - compressedFile.size;
        const savingsPercent = Math.round((savings / originalSize) * 100);

        console.log(
            `[Compresor] ${file.name}: ${formatBytes(originalSize)} → ${formatBytes(compressedFile.size)} (-${savingsPercent}%)`,
        );

        return {
            file: compressedFile,
            originalSize,
            compressedSize: compressedFile.size,
            wasCompressed: true,
            savings,
            savingsPercent,
        };
    } catch {
        // Si falla la compresión, devolver original sin error
        return {
            file,
            originalSize,
            compressedSize: originalSize,
            wasCompressed: false,
            savings: 0,
            savingsPercent: 0,
        };
    }
}

/**
 * Comprime múltiples archivos en paralelo.
 */
export async function compressFiles(
    files: File[],
    options?: CompressOptions,
): Promise<CompressResult[]> {
    return Promise.all(files.map(f => compressImage(f, options)));
}

/** Formatea bytes a unidad legible */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const val = bytes / Math.pow(1024, i);
    return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Tamaño máximo permitido por archivo (10 MB) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Valida que un archivo no exceda el tamaño máximo */
export function validateFileSize(file: File): { valid: boolean; message?: string } {
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            message: `"${file.name}" excede el límite de ${formatBytes(MAX_FILE_SIZE)} (tiene ${formatBytes(file.size)})`,
        };
    }
    return { valid: true };
}
