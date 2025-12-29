import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Search, X, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useStudents } from '@/hooks/useStudents';
import { useTeacherAuth } from '@/hooks/useTeacherAuth';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedPaymentSystem } from '@/hooks/useUnifiedPaymentSystem';
import { usePaymentResilience } from '@/hooks/usePaymentResilience';
import { StudentSelectionSkeleton } from '@/components/ui/loading-skeleton';
import { useDebounce } from '@/hooks/useDebounce';
import { usePerformanceTimer } from '@/hooks/usePerformanceMonitor';

interface ManualPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualPaymentModal({ isOpen, onClose, onSuccess }: ManualPaymentModalProps) {
  const { students, loading: studentsLoading, error: studentsError, refetch } = useStudents();
  const { isTeacher, userId, loading: authLoading } = useTeacherAuth();
  const { createManualPayment, smartRefresh } = useUnifiedPaymentSystem();
  const { withResilience, withCircuitBreaker, state: resilienceState } = usePaymentResilience();
  const { toast } = useToast();

  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [paymentType, setPaymentType] = useState<string>('pix');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState<string>('');
  const [searchStudent, setSearchStudent] = useState<string>('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedStudent('');
      setPaymentType('pix');
      setAmount('');
      setPaymentDate(new Date());
      setNotes('');
      setSearchStudent('');
    }
  }, [isOpen]);

  // Debounce search to improve performance
  const debouncedSearch = useDebounce(searchStudent, 300);

  // Filter students based on debounced search
  const filteredStudents = students.filter(student => {
    if (!debouncedSearch) return true;
    
    const name = student.name || '';
    const email = student.email || '';
    const searchTerm = debouncedSearch.toLowerCase();
    
    return name.toLowerCase().includes(searchTerm) ||
           email.toLowerCase().includes(searchTerm);
  });

  // Removed console.log to prevent infinite loops

  const formatCurrency = (value: string) => {
    // Remove all non-numeric characters except comma and dot
    const numericValue = value.replace(/[^\d,]/g, '');
    
    // Convert comma to dot for processing
    const processedValue = numericValue.replace(',', '.');
    
    // Parse as float and format
    const floatValue = parseFloat(processedValue) || 0;
    
    return floatValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleAmountChange = (value: string) => {
    setAmount(value);
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'cash': return 'Espécie';
      case 'pix': return 'PIX';
      case 'card': return 'Cartão';
      default: return type;
    }
  };

  const validateForm = () => {
    if (!selectedStudent) {
      toast({
        title: "Erro de validação",
        description: "Selecione um aluno",
        variant: "destructive",
      });
      return false;
    }

    if (!amount || parseFloat(amount.replace(',', '.')) <= 0) {
      toast({
        title: "Erro de validação",
        description: "Insira um valor válido",
        variant: "destructive",
      });
      return false;
    }

    if (!paymentType) {
      toast({
        title: "Erro de validação",
        description: "Selecione o tipo de pagamento",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    const endTimer = usePerformanceTimer('save_manual_payment')
    
    if (!validateForm() || !userId || !isTeacher) {
      endTimer(false, 'Validation failed')
      return
    }

    setLoading(true);
    
    try {
      const selectedStudentData = students.find(s => s.id === selectedStudent);
      if (!selectedStudentData) {
        endTimer(false, 'Student not found');
        throw new Error('Aluno não encontrado');
      }

      // Convert amount to number
      const amountValue = parseFloat(amount.replace(',', '.'));
      
      console.log('[ManualPaymentModal] Salvando pagamento via UnifiedPayments...', {
        teacherId: userId,
        studentId: selectedStudentData.user_id,
        amount: amountValue
      });

      // FASE 4: Use resilient payment system with circuit breaker
      await withCircuitBreaker(
        () => withResilience(
          () => createManualPayment({
            studentId: selectedStudentData.user_id,
            amount: amountValue,
            paymentMethod: paymentType,
            paymentDate: paymentDate,
            notes: notes
          }),
          'Criar Pagamento Manual'
        ),
        'Pagamento Manual'
      );

      // FASE 3: Immediate success feedback with smart refresh
      toast({
        title: "✅ Pagamento registrado!",
        description: `R$ ${formatCurrency(amount)} registrado para ${selectedStudentData.name}`,
        duration: 3000,
      });

      // FASE 3: Smart refresh that shows progress
      setTimeout(() => {
        smartRefresh(true);
      }, 300);

      endTimer();
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('[ManualPaymentModal] Erro ao salvar:', error);
      endTimer(false, error.message);
      toast({
        title: "❌ Erro ao registrar pagamento",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg p-0 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 pr-12 border-b border-border/40 flex-shrink-0">
          <DialogTitle className="text-foreground">Registrar Pagamento Manual</DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-5 pt-3 flex-1 min-h-0 overflow-y-auto">
          {/* Verificação de Permissão */}
          {authLoading ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando...</span>
          </div>
        ) : !isTeacher ? (
          <div className="text-center p-8">
            <div className="text-destructive mb-2">❌ Acesso Negado</div>
            <div className="text-sm text-muted-foreground">
              Apenas professores podem registrar pagamentos manuais.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Student Selection */}
            <div className="space-y-2">
              <Label htmlFor="student">Aluno</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar aluno..."
                    value={searchStudent}
                    onChange={(e) => setSearchStudent(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um aluno" />
                  </SelectTrigger>
                  <SelectContent className="z-[100] bg-background border-border">
                    {studentsLoading ? (
                      <div className="p-4">
                        <StudentSelectionSkeleton />
                      </div>
                    ) : studentsError ? (
                      <div className="p-4 text-center text-destructive">
                        <p>❌ Erro ao carregar alunos</p>
                        <p className="text-xs mt-1">{studentsError}</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refetch()}
                          className="text-xs mt-2"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Tentar Novamente
                        </Button>
                      </div>
                    ) : students.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <p>📝 Nenhum aluno encontrado</p>
                        <p className="text-xs mt-1">Adicione alunos primeiro</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => refetch()}
                          className="text-xs mt-2"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Recarregar
                        </Button>
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        <p>🔍 Nenhum aluno encontrado na busca</p>
                        <p className="text-xs mt-1">"{searchStudent}"</p>
                      </div>
                    ) : (
                      filteredStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{student.name || 'Nome não informado'}</span>
                            <span className="text-xs text-muted-foreground">
                              {student.email || 'Email não informado'}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Plano: {student.plan} | Status: {student.status}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Payment Type */}
            <div className="space-y-2">
              <Label>Tipo de Pagamento</Label>
              <RadioGroup value={paymentType} onValueChange={setPaymentType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cash" id="cash" />
                  <Label htmlFor="cash">💵 Espécie</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix">📱 PIX</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="card" id="card" />
                  <Label htmlFor="card">💳 Cartão</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="text"
                placeholder="0,00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label>Data do Pagamento</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !paymentDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentDate ? (
                      format(paymentDate, "PPP", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={paymentDate}
                    onSelect={(date) => {
                      if (date) {
                        setPaymentDate(date);
                        setIsCalendarOpen(false);
                      }
                    }}
                    disabled={(date) =>
                      date > new Date() || date < new Date("2020-01-01")
                    }
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Informações adicionais sobre o pagamento..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        )}
      </div>
        
      <DialogFooter className="px-5 pb-5 pt-3 border-t border-border/40 flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={loading || !isTeacher || !selectedStudent || !amount}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Salvando...
              </div>
            ) : (
              'Registrar Pagamento'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}