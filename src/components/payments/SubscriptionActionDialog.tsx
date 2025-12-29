import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, PauseCircle, XCircle } from "lucide-react";

interface SubscriptionActionDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    action: 'cancel' | 'pause';
    studentName: string;
    loading?: boolean;
}

export function SubscriptionActionDialog({
    isOpen,
    onClose,
    onConfirm,
    action,
    studentName,
    loading = false
}: SubscriptionActionDialogProps) {
    const isCancel = action === 'cancel';

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${isCancel ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            {isCancel ? <XCircle className="h-6 w-6" /> : <PauseCircle className="h-6 w-6" />}
                        </div>
                        <div>
                            <DialogTitle>
                                {isCancel ? 'Cancelar Assinatura?' : 'Pausar Assinatura?'}
                            </DialogTitle>
                            <DialogDescription className="mt-1">
                                Esta ação afetará o acesso do aluno <strong>{studentName}</strong>.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="py-4">
                    <div className={`p-4 rounded-md border ${isCancel ? 'bg-red-50 border-red-100 text-red-800' : 'bg-yellow-50 border-yellow-100 text-yellow-800'}`}>
                        <div className="flex gap-3">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <div className="text-sm">
                                <p className="font-medium mb-1">
                                    {isCancel ? 'Atenção: Ação Irreversível' : 'Atenção: Pausa Temporária'}
                                </p>
                                <p>
                                    {isCancel
                                        ? 'Ao cancelar, o aluno perderá acesso imediato aos conteúdos exclusivos e não será cobrado nas próximas faturas.'
                                        : 'Ao pausar, a cobrança será suspensa temporariamente e o aluno manterá acesso limitado até a reativação.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Voltar
                    </Button>
                    <Button
                        variant={isCancel ? "destructive" : "default"}
                        className={!isCancel ? "bg-yellow-600 hover:bg-yellow-700 text-white" : ""}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? 'Processando...' : isCancel ? 'Sim, Cancelar Assinatura' : 'Sim, Pausar Assinatura'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
