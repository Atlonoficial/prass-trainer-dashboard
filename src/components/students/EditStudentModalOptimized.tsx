// FASE 4: Modal Otimizado - Import limpo
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, Edit2, Save, X, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useStudents } from '@/hooks/useStudents';
import { useUnifiedPlans } from '@/hooks/useUnifiedPlans';
import { useStudentContentPermissions } from '@/hooks/useStudentContentPermissions';
import { normalizeStudentForUI, normalizeMembershipExpiry } from '@/utils/studentDataNormalizer';
import { validateStudentForm, sanitizeFormData } from '@/utils/studentValidation';
import type { Student } from '@/types/student';

interface EditStudentModalOptimizedProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  plan: string;
  mode: string;
  status: string;
  goals: string[];
  membership_expiry: string;
}

interface ContentPermissions {
  trainingPlans: boolean;
  dietPlans: boolean;
  nutritionLibrary: boolean;
  exerciseLibrary: boolean;
  consultations: boolean;
  reports: boolean;
  courses: boolean;
}

export default function EditStudentModalOptimized({ 
  isOpen, 
  onClose, 
  student 
}: EditStudentModalOptimizedProps) {
  // ✅ HOOKS E ESTADOS ORGANIZADOS
  const { updateStudent } = useStudents();
  const { unifiedPlans } = useUnifiedPlans();
  const { 
    getPermissionsState: getPermissions, 
    updatePermissions, 
    loading: permissionsLoading 
  } = useStudentContentPermissions();

  // Estados locais
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  // 🔒 SISTEMA SIMPLES DE CONTROLE DO MODAL
  const [modalClosing, setModalClosing] = useState(false);
  
  // Estados do formulário
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    plan: 'none',
    mode: 'Online',
    status: 'Inativo',
    goals: [] as string[],
    membership_expiry: '',
  });

  // Estados de permissões
  const [selectedContents, setSelectedContents] = useState<ContentPermissions>({
    trainingPlans: false,
    dietPlans: false,
    nutritionLibrary: false,
    exerciseLibrary: false,
    consultations: false,
    reports: false,
    courses: false,
  });

  // ✅ CARREGAR DADOS DO ESTUDANTE
  useEffect(() => {
    if (isOpen && student) {
      console.log('📖 [MODAL] Carregando dados do estudante:', student);
      const normalizedStudent = normalizeStudentForUI(student);
      
      setFormData({
        name: normalizedStudent.name || '',
        email: normalizedStudent.email || '',
        phone: normalizedStudent.phone || '',
        plan: normalizedStudent.active_plan || 'none',
        mode: normalizedStudent.mode || 'Online',
        status: normalizedStudent.membership_status || 'Inativo',
        goals: Array.isArray(normalizedStudent.goals) ? normalizedStudent.goals : [],
        membership_expiry: normalizedStudent.membership_expiry || '',
      });
    }
  }, [isOpen, student]);

  // ✅ CARREGAR PERMISSÕES
  useEffect(() => {
    if (isOpen && student?.user_id) {
      console.log('🔑 [MODAL] Carregando permissões para:', student.user_id);
      loadPermissions();
    }
  }, [isOpen, student?.user_id]);

  const loadPermissions = async () => {
    if (!student?.user_id) return;
    
    try {
      const permissions = await getPermissions();
      console.log('📋 [MODAL] Permissões carregadas:', permissions);
      setSelectedContents(permissions);
    } catch (error) {
      console.error('❌ [MODAL] Erro ao carregar permissões:', error);
    }
  };

  const getPermissionsState = () => {
    return {
      trainingPlans: selectedContents.trainingPlans,
      dietPlans: selectedContents.dietPlans,
      nutritionLibrary: selectedContents.nutritionLibrary,
      exerciseLibrary: selectedContents.exerciseLibrary,
      consultations: selectedContents.consultations,
      reports: selectedContents.reports,
      courses: selectedContents.courses,
    };
  };

  // ✅ FUNÇÃO SIMPLIFICADA E ROBUSTA DE SALVAMENTO
  const handleSave = useCallback(async () => {
    if (!student || saving) {
      console.log('⚠️ [SAVE] Bloqueado: sem estudante ou já salvando')
      return;
    }

    console.log('🚀 [SAVE] =======  INICIANDO SALVAMENTO DEFINITIVO =======');
    console.log('📋 [SAVE] Estudante:', student?.name || student?.user_id);
    console.log('📋 [SAVE] Form data atual:', formData);
    
    setSaving(true);
    setValidationErrors({});

    try {
      // ✅ VALIDAÇÃO BÁSICA OBRIGATÓRIA
      const errors: Record<string, string> = {};
      
      if (!formData.name?.trim()) errors.name = 'Nome é obrigatório';
      if (!formData.email?.trim()) errors.email = 'Email é obrigatório';
      else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
          errors.email = 'Email inválido';
        }
      }

      if (Object.keys(errors).length > 0) {
        console.error('❌ [SAVE] Validação falhou:', errors);
        setValidationErrors(errors);
        setSaving(false);
        toast({
          title: "Erro de validação",
          description: "Corrija os campos obrigatórios",
          variant: "destructive"
        });
        return;
      }

      // ✅ PREPARAÇÃO DOS DADOS COM LOGS DETALHADOS
      console.log('📅 [SAVE] Data de expiração original:', formData.membership_expiry);
      
      const normalizedExpiry = formData.membership_expiry ? 
        normalizeMembershipExpiry(formData.membership_expiry) : null;
      
      console.log('📅 [SAVE] Data após normalização:', normalizedExpiry);

      const dataToSave = {
        profileData: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone?.trim() || null,
        },
        studentData: {
          user_id: student.user_id,
          active_plan: formData.plan !== 'none' ? formData.plan : null,
          mode: formData.mode,
          membership_status: (() => {
            const statusMap: Record<string, string> = {
              'Ativo': 'active',
              'Inativo': 'inactive', 
              'Suspenso': 'suspended',
              'Cancelado': 'cancelled'
            };
            const result = statusMap[formData.status] || 'inactive';
            console.log('🔄 [SAVE] Status conversion:', formData.status, '→', result);
            return result;
          })(),
          goals: formData.goals.length > 0 ? formData.goals : null,
          membership_expiry: normalizedExpiry,
        }
      };

      console.log('📤 [SAVE] Dados finais preparados:', JSON.stringify(dataToSave, null, 2));
      
      // ✅ EXECUTAR SALVAMENTO
      console.log('💾 [SAVE] Chamando updateStudent...');
      const result = await updateStudent(dataToSave);
      console.log('📥 [SAVE] Resultado recebido:', result);
      
      // ✅ VERIFICAR RESULTADO
      if (!result || result.success !== true) {
        const errorMsg = result?.error || 'Erro desconhecido ao salvar dados';
        console.error('❌ [SAVE] FALHA no salvamento:', errorMsg);
        
        toast({
          title: "❌ Erro ao salvar",
          description: `Falha: ${errorMsg}`,
          variant: "destructive"
        });
        setSaving(false);
        return;
      }
      
      console.log('✅ [SAVE] SUCESSO confirmado! Dados salvos');

      // ✅ FEEDBACK DE SUCESSO
      toast({
        title: "✅ Dados atualizados!",
        description: `${formData.name} foi atualizado com sucesso`,
      });

      // ✅ ATUALIZAR PERMISSÕES EM BACKGROUND
      if (selectedContents) {
        console.log('🔑 [SAVE] Atualizando permissões em background...');
        setTimeout(async () => {
          try {
            await updatePermissions(selectedContents);
            console.log('✅ [SAVE] Permissões atualizadas');
          } catch (error) {
            console.warn('⚠️ [SAVE] Erro nas permissões (não crítico):', error);
          }
        }, 100);
      }

      // ✅ RESET E FECHAMENTO SIMPLES
      setSaving(false);
      setIsEditMode(false);
      setValidationErrors({});
      
      console.log('🚪 [SAVE] Fechando modal após sucesso...');
      onClose();
      console.log('✅ [SAVE] ======= SALVAMENTO CONCLUÍDO COM SUCESSO =======');

    } catch (error: any) {
      console.error('💥 [SAVE] ERRO CRÍTICO:', error);
      
      toast({
        title: "❌ Erro crítico",
        description: error?.message || 'Falha inesperada ao salvar dados',
        variant: "destructive"
      });
      
      setSaving(false);
    }
  }, [student, updateStudent, updatePermissions, selectedContents, onClose, toast, formData]);

  // ✅ SISTEMA SIMPLIFICADO DE CONTROLE DO MODAL
  useEffect(() => {
    if (!isOpen) {
      console.log('🔄 [MODAL] Fechado - limpeza de estados');
      setIsEditMode(false);
      setSaving(false);
      setValidationErrors({});
      setModalClosing(false);
    }
  }, [isOpen]);

  const handleCancelEdit = () => {
    console.log('🚫 [MODAL] Cancelando edição');
    
    if (student) {
      const normalizedStudent = normalizeStudentForUI(student);
      setFormData({
        name: normalizedStudent.name || '',
        email: normalizedStudent.email || '',
        phone: normalizedStudent.phone || '',
        plan: normalizedStudent.active_plan || 'none',
        mode: normalizedStudent.mode || 'Online',
        status: normalizedStudent.membership_status || 'Inativo',
        goals: Array.isArray(normalizedStudent.goals) ? normalizedStudent.goals : [],
        membership_expiry: normalizedStudent.membership_expiry || '',
      });
      loadPermissions();
    }
    setIsEditMode(false);
    setValidationErrors({});
  };

  const availableGoals = [
    'Perda de peso',
    'Ganho de massa muscular',
    'Melhora do condicionamento físico',
    'Fortalecimento',
    'Flexibilidade',
    'Reabilitação',
    'Performance esportiva',
    'Saúde geral'
  ];

  if (!student) return null;

  return (
    <Dialog open={isOpen && !modalClosing} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            📋 Detalhes do Estudante
            {isEditMode && <span className="text-sm text-muted-foreground">(Modo Edição)</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Informações Básicas */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    👤 Informações Básicas
                    <ChevronDown className="h-4 w-4" />
                  </CardTitle>
                </CardHeader>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Nome *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        disabled={!isEditMode}
                        className={validationErrors.name ? 'border-destructive' : ''}
                      />
                      {validationErrors.name && (
                        <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.name}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        disabled={!isEditMode}
                        className={validationErrors.email ? 'border-destructive' : ''}
                      />
                      {validationErrors.email && (
                        <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.email}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phone">Telefone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        disabled={!isEditMode}
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    <div>
                      <Label htmlFor="membership_expiry">Data de Expiração</Label>
                      <Input
                        id="membership_expiry"
                        type="date"
                        value={formData.membership_expiry}
                        onChange={(e) => setFormData(prev => ({ ...prev, membership_expiry: e.target.value }))}
                        disabled={!isEditMode}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Plano e Configurações */}
          <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    ⚙️ Plano e Configurações
                    <ChevronDown className="h-4 w-4" />
                  </CardTitle>
                </CardHeader>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="plan">Plano</Label>
                      <Select
                        value={formData.plan}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, plan: value }))}
                        disabled={!isEditMode}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um plano" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum plano</SelectItem>
                          {unifiedPlans?.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="mode">Modalidade</Label>
                      <Select
                        value={formData.mode}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, mode: value }))}
                        disabled={!isEditMode}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Online">Online</SelectItem>
                          <SelectItem value="Presencial">Presencial</SelectItem>
                          <SelectItem value="Híbrido">Híbrido</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
                        disabled={!isEditMode}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="Inativo">Inativo</SelectItem>
                          <SelectItem value="Suspenso">Suspenso</SelectItem>
                          <SelectItem value="Cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Objetivos</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {availableGoals.map((goal) => (
                        <div key={goal} className="flex items-center space-x-2">
                          <Checkbox
                            id={goal}
                            checked={formData.goals.includes(goal)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  goals: [...prev.goals, goal]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  goals: prev.goals.filter(g => g !== goal)
                                }));
                              }
                            }}
                            disabled={!isEditMode}
                          />
                          <Label htmlFor={goal} className="text-sm">
                            {goal}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>

          {/* Permissões de Conteúdo */}
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    🔐 Permissões de Conteúdo
                    <ChevronDown className="h-4 w-4" />
                  </CardTitle>
                </CardHeader>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedContents).map(([key, value]) => (
                      <div key={key} className="flex items-center space-x-2">
                        <Checkbox
                          id={key}
                          checked={value}
                          onCheckedChange={(checked) => {
                            setSelectedContents(prev => ({
                              ...prev,
                              [key]: checked
                            }));
                          }}
                          disabled={!isEditMode || permissionsLoading}
                        />
                        <Label htmlFor={key} className="text-sm">
                          {key === 'trainingPlans' && 'Planos de Treino'}
                          {key === 'dietPlans' && 'Planos de Dieta'}
                          {key === 'nutritionLibrary' && 'Biblioteca Nutricional'}
                          {key === 'exerciseLibrary' && 'Biblioteca de Exercícios'}
                          {key === 'consultations' && 'Consultorias'}
                          {key === 'reports' && 'Relatórios'}
                          {key === 'courses' && 'Cursos'}
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Botões de Ação */}
        <div className="flex-shrink-0 flex justify-end gap-2 pt-4 border-t">
          {!isEditMode ? (
            <>
              <Button
                variant="outline"
                onClick={onClose}
              >
                Fechar
              </Button>
              <Button
                onClick={() => setIsEditMode(true)}
                className="flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                Editar
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}