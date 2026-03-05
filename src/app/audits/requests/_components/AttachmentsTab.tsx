'use client';

import { Button } from '@/components/ui/button';
import { Paperclip } from 'lucide-react';
import { ExpedientService } from '@/services/expedientService';
import type { ExpedientAttachment } from '@/types/database';

interface AttachmentsTabProps {
    attachments: ExpedientAttachment[];
}

export function AttachmentsTab({ attachments }: AttachmentsTabProps) {
    if (attachments.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground">
                <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin documentos adjuntos</p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            {attachments.map(a => (
                <div key={a.id} className="flex items-center justify-between p-3 border rounded-xl">
                    <div className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-medium">{a.file_name}</p>
                            <p className="text-xs text-muted-foreground">
                                {a.document_type.replace('_', ' ')} • {a.file_size ? `${(a.file_size / 1024).toFixed(0)} KB` : ''}
                            </p>
                        </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={async () => {
                        const url = await ExpedientService.getAttachmentUrl(a.storage_path);
                        window.open(url, '_blank');
                    }}>
                        Ver
                    </Button>
                </div>
            ))}
        </div>
    );
}
