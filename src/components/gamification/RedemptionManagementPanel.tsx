import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Check, X, Clock, MessageSquare, Gift, Coins, Calendar, Info, AlertTriangle, Trash2 } from 'lucide-react';
import { RewardRedemption } from '@/hooks/useRewards';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RedemptionManagementPanelProps {
  redemptions: RewardRedemption[];
  onUpdateStatus: (redemptionId: string, status: 'approved' | 'rejected', adminNotes?: string) => Promise<void>;
  onDelete: (redemptionId: string) => Promise<void>;
  loading?: boolean;
}

export function RedemptionManagementPanel({ 
  redemptions, 
  onUpdateStatus,
  onDelete,
  loading = false 
}: RedemptionManagementPanelProps) {
  const [selectedRedemption, setSelectedRedemption] = useState<RewardRedemption | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [deletingRedemption, setDeletingRedemption] = useState<RewardRedemption | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  // Separate redemptions by status
  const pendingRedemptions = redemptions.filter(r => r.status === 'pending');
  const approvedRedemptions = redemptions.filter(r => r.status === 'approved');
  const rejectedRedemptions = redemptions.filter(r => r.status === 'rejected');

  const handleOpenDialog = (redemption: RewardRedemption, action: 'approve' | 'reject') => {
    setSelectedRedemption(redemption);
    setActionType(action);
    setAdminNotes('');
    setIsDialogOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!selectedRedemption || !actionType) return;

    setProcessingId(selectedRedemption.id);
    
    try {
      await onUpdateStatus(
        selectedRedemption.id,
        actionType === 'approve' ? 'approved' : 'rejected',
        adminNotes.trim() || undefined
      );
      
      setIsDialogOpen(false);
      setSelectedRedemption(null);
      setActionType(null);
      setAdminNotes('');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteClick = (redemption: RewardRedemption) => {
    setDeletingRedemption(redemption);
    setIsDeleteAlertOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingRedemption) return;
    
    try {
      await onDelete(deletingRedemption.id);
      setIsDeleteAlertOpen(false);
      setDeletingRedemption(null);
    } catch (error) {
      // Error already handled by onDelete
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 bg-yellow-500/10"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'approved':
        return <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 bg-emerald-500/10"><Check className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="border-red-500/50 text-red-600 bg-red-500/10"><X className="w-3 h-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const RedemptionCard = ({ redemption, showActions = false, onDelete }: { redemption: RewardRedemption; showActions?: boolean; onDelete?: (redemptionId: string) => void }) => (
    <Card className="bg-card/50 border-border/40 hover:border-border/60 transition-colors">
      <CardContent className="p-4 space-y-3">
        {/* Student Info */}
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={redemption.student_avatar} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {redemption.student_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{redemption.student_name}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(redemption.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          {getStatusBadge(redemption.status)}
        </div>

        {/* Reward Info */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-background/50 border border-border/40">
          <Gift className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">{redemption.reward?.title || 'Recompensa não disponível'}</p>
            {redemption.reward?.description && (
              <p className="text-xs text-muted-foreground mt-1">{redemption.reward.description}</p>
            )}
            <div className="flex items-center gap-1 mt-2">
              <Coins className="w-3 h-3 text-amber-500" />
              <span className="text-xs font-semibold text-amber-600">{redemption.points_spent} pontos</span>
            </div>
          </div>
        </div>

        {/* Admin Notes */}
        {redemption.admin_notes && (
          <div className="flex items-start gap-2 p-2 rounded bg-muted/50 border border-border/30">
            <MessageSquare className="w-3 h-3 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">{redemption.admin_notes}</p>
          </div>
        )}

        {/* Action Buttons (only for pending) */}
        {showActions && (
          <div className="flex gap-2 pt-2 border-t border-border/40">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-emerald-500/50 text-emerald-600 hover:bg-emerald-500/10"
              onClick={() => handleOpenDialog(redemption, 'approve')}
              disabled={processingId === redemption.id}
            >
              <Check className="w-3 h-3 mr-1" />
              Aprovar
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-red-500/50 text-red-600 hover:bg-red-500/10"
              onClick={() => handleOpenDialog(redemption, 'reject')}
              disabled={processingId === redemption.id}
            >
              <X className="w-3 h-3 mr-1" />
              Rejeitar
            </Button>
          </div>
        )}

        {/* Delete Button (only for history items) */}
        {onDelete && (
          <div className="flex justify-end pt-2 border-t border-border/40">
            <Button
              size="sm"
              variant="ghost"
              className="text-red-600 hover:text-red-700 hover:bg-red-500/10"
              onClick={() => handleDeleteClick(redemption)}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Apagar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-4 h-4 animate-spin" />
            <span className="text-sm">Carregando resgates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Status Indicator */}
      <div className="mb-4 p-3 bg-muted/50 rounded-lg border border-border/40">
        <div className="flex items-center gap-2">
          {loading ? (
            <>
              <Clock className="h-4 w-4 text-muted-foreground animate-spin" />
              <span className="text-sm text-muted-foreground">Carregando resgates...</span>
            </>
          ) : redemptions.length === 0 ? (
            <>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-muted-foreground">⚠️ Nenhum resgate encontrado</span>
            </>
          ) : (
            <>
              <Info className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                ✅ {redemptions.length} resgate{redemptions.length !== 1 ? 's' : ''} carregado{redemptions.length !== 1 ? 's' : ''}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        {/* Pending Redemptions Section */}
        <Card>
          <CardHeader className="px-6 pt-6 pb-4 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Resgates Pendentes</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Aguardando aprovação do professor
                </CardDescription>
              </div>
              <Badge variant="outline" className="border-yellow-500/50 text-yellow-600 bg-yellow-500/10">
                {pendingRedemptions.length} pendente{pendingRedemptions.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            {pendingRedemptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhum resgate pendente no momento</p>
              </div>
            ) : (
              pendingRedemptions.map(redemption => (
                <RedemptionCard key={redemption.id} redemption={redemption} showActions />
              ))
            )}
          </CardContent>
        </Card>

        {/* History Section */}
        <Card>
          <CardHeader className="px-6 pt-6 pb-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-muted-foreground" />
              <CardTitle className="text-lg font-semibold">Histórico de Resgates</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Approved */}
            {approvedRedemptions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-emerald-600">Aprovados</h4>
                  <Badge variant="outline" className="border-emerald-500/50 text-emerald-600 bg-emerald-500/10 text-xs">
                    {approvedRedemptions.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {approvedRedemptions.map(redemption => (
                    <RedemptionCard key={redemption.id} redemption={redemption} onDelete={() => handleDeleteClick(redemption)} />
                  ))}
                </div>
              </div>
            )}

            {/* Rejected */}
            {rejectedRedemptions.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold text-red-600">Rejeitados</h4>
                  <Badge variant="outline" className="border-red-500/50 text-red-600 bg-red-500/10 text-xs">
                    {rejectedRedemptions.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {rejectedRedemptions.map(redemption => (
                    <RedemptionCard key={redemption.id} redemption={redemption} onDelete={() => handleDeleteClick(redemption)} />
                  ))}
                </div>
              </div>
            )}

            {approvedRedemptions.length === 0 && rejectedRedemptions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhum histórico de resgates ainda</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="p-0 max-w-md">
          <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40">
            <DialogTitle className="text-lg font-semibold">
              {actionType === 'approve' ? 'Aprovar Resgate' : 'Rejeitar Resgate'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="px-5 pb-5 pt-3 space-y-4">
            {selectedRedemption && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border/40 space-y-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={selectedRedemption.student_avatar} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {selectedRedemption.student_name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm">{selectedRedemption.student_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Gift className="w-4 h-4 text-primary" />
                  <span>{selectedRedemption.reward?.title}</span>
                </div>
                <div className="flex items-center gap-1 text-sm">
                  <Coins className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-amber-600">{selectedRedemption.points_spent} pontos</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-notes" className="text-sm">
                Observações {actionType === 'reject' ? '(opcional)' : '(opcional)'}
              </Label>
              <Textarea
                id="admin-notes"
                placeholder={actionType === 'approve' 
                  ? "Ex: Recompensa será entregue na próxima aula"
                  : "Ex: Estoque esgotado temporariamente"
                }
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="min-h-[80px] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="px-5 pb-5 pt-3 border-t border-border/40 flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={processingId !== null}
            >
              Cancelar
            </Button>
            <Button
              variant={actionType === 'approve' ? 'default' : 'destructive'}
              onClick={handleConfirmAction}
              disabled={processingId !== null}
            >
              {processingId !== null ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  {actionType === 'approve' ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Confirmar Aprovação
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Confirmar Rejeição
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja apagar este resgate do histórico?
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border/40 space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {deletingRedemption?.student_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {deletingRedemption?.reward?.title}
                </p>
                <p className="text-xs text-amber-600 font-semibold">
                  {deletingRedemption?.points_spent} pontos
                </p>
              </div>
              <p className="mt-3 text-sm text-destructive">
                ⚠️ Esta ação não pode ser desfeita.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar Exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
