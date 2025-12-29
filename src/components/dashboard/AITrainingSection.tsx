import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Zap, Send, Edit, Share, Utensils, User, FileText, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { LoadingHourglass } from '@/components/LoadingHourglass';
import { useStudents } from '@/hooks/useStudents';
import { useAnamneses } from '@/hooks/useAnamneses';
import { supabase } from '@/integrations/supabase/client';
import { EditAITrainingModal } from '@/components/training/EditAITrainingModal';
import { EditAIDietModal } from '@/components/training/EditAIDietModal';
import { SendPlanModal } from '@/components/training/SendPlanModal';
import { useToast } from '@/hooks/use-toast';

export default function AITrainingSection() {
  const { toast } = useToast();
  
  // Fetch real students data
  const { students, loading: studentsLoading } = useStudents();
  
  // Categorize students
  const consultoriaStudents = students.filter(s => 
    s.plan !== "Plano Gratuito" && s.plan !== "free" && s.status === "Ativo"
  );
  const freeStudents = students.filter(s => 
    (s.plan === "Plano Gratuito" || s.plan === "free") && s.status === "Ativo"
  );

  // Anamnese-based states for training
  const [useAnamneseForTraining, setUseAnamneseForTraining] = useState(false);
  const [selectedStudentForTraining, setSelectedStudentForTraining] = useState('');
  
  // Anamnese-based states for diet
  const [useAnamneseForDiet, setUseAnamneseForDiet] = useState(false);
  const [selectedStudentForDiet, setSelectedStudentForDiet] = useState('');

  // Generated plans states
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [generatedDiet, setGeneratedDiet] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingDiet, setIsGeneratingDiet] = useState(false);

  // Modal states
  const [editTrainingModalOpen, setEditTrainingModalOpen] = useState(false);
  const [editDietModalOpen, setEditDietModalOpen] = useState(false);
  const [sendTrainingModalOpen, setSendTrainingModalOpen] = useState(false);
  const [sendDietModalOpen, setSendDietModalOpen] = useState(false);

  // Physical measurements states
  const [studentPhysicalData, setStudentPhysicalData] = useState<any>(null);
  const [loadingPhysicalData, setLoadingPhysicalData] = useState(false);
  const [dietStudentPhysicalData, setDietStudentPhysicalData] = useState<any>(null);
  const [loadingDietPhysicalData, setLoadingDietPhysicalData] = useState(false);

  // Fetch anamnesis for selected students
  const { anamneses: trainingAnamneses, loading: trainingAnamnesisLoading } = useAnamneses(selectedStudentForTraining);
  const { anamneses: dietAnamneses, loading: dietAnamnesisLoading } = useAnamneses(selectedStudentForDiet);

  // Get selected student data
  const selectedStudentDataForTraining = students.find(s => s.user_id === selectedStudentForTraining || s.id === selectedStudentForTraining);
  const selectedStudentDataForDiet = students.find(s => s.user_id === selectedStudentForDiet || s.id === selectedStudentForDiet);

  // Get latest anamnesis
  const latestTrainingAnamnesis = trainingAnamneses?.[0];
  const latestDietAnamnesis = dietAnamneses?.[0];

  // Calculate BMI
  const calculateBMI = (weight: number, height: number) => {
    if (!weight || !height) return null;
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  // Fetch physical data when student is selected
  useEffect(() => {
    const fetchPhysicalData = async () => {
      if (!selectedStudentForTraining) {
        setStudentPhysicalData(null);
        return;
      }

      setLoadingPhysicalData(true);
      try {
        const { data, error } = await supabase
          .from('students')
          .select('weight, height, goals')
          .eq('user_id', selectedStudentForTraining)
          .single();

        if (error) throw error;
        setStudentPhysicalData(data);
      } catch (error) {
        console.error('Error fetching physical data:', error);
        setStudentPhysicalData(null);
      } finally {
        setLoadingPhysicalData(false);
      }
    };

    fetchPhysicalData();
  }, [selectedStudentForTraining]);

  // Fetch physical data for diet when student is selected
  useEffect(() => {
    const fetchDietPhysicalData = async () => {
      if (!selectedStudentForDiet) {
        setDietStudentPhysicalData(null);
        return;
      }

      setLoadingDietPhysicalData(true);
      try {
        const { data, error } = await supabase
          .from('students')
          .select('weight, height, goals')
          .eq('user_id', selectedStudentForDiet)
          .single();

        if (error) throw error;
        setDietStudentPhysicalData(data);
      } catch (error) {
        console.error('Error fetching diet physical data:', error);
        setDietStudentPhysicalData(null);
      } finally {
        setLoadingDietPhysicalData(false);
      }
    };

    fetchDietPhysicalData();
  }, [selectedStudentForDiet]);

  // Training states
  const [selectedGoal, setSelectedGoal] = useState('');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');

  // Diet states
  const [selectedDietGoal, setSelectedDietGoal] = useState('');
  const [selectedDietType, setSelectedDietType] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');

  const handleGeneratePlan = async () => {
    if (!selectedGoal) {
      return;
    }

    if (useAnamneseForTraining && !selectedStudentForTraining) {
      return;
    }

    setIsGenerating(true);
    setGeneratedPlan(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-training-generator', {
        body: {
          type: 'training',
          useAnamnesis: useAnamneseForTraining,
          studentId: useAnamneseForTraining ? selectedStudentForTraining : null,
          goal: selectedGoal,
          equipment: selectedEquipment ? [selectedEquipment] : [],
          level: selectedLevel,
          duration: 60
        }
      });

      if (error) throw error;

      if (data.success) {
        setGeneratedPlan({
          ...data.data,
          generation_context: {
            useAnamnesis: useAnamneseForTraining,
            studentId: selectedStudentForTraining,
            studentName: useAnamneseForTraining && selectedStudentForTraining 
              ? students.find(s => s.user_id === selectedStudentForTraining)?.name 
              : null
          }
        });
      } else {
        throw new Error(data.details || data.error);
      }
    } catch (error) {
      console.error('Erro ao gerar plano:', error);
      // Fallback para plano simulado em caso de erro
      setGeneratedPlan({
        name: 'Plano de Treino Personalizado',
        description: 'Plano gerado automaticamente',
        exercises: [
          { name: 'Agachamento', sets: 3, reps: '12-15', rest_time: 60, instructions: 'Movimento básico fundamental' },
          { name: 'Flexão de Braço', sets: 3, reps: '8-12', rest_time: 45, instructions: 'Variação adaptada ao nível' },
          { name: 'Prancha', sets: 3, reps: '30-45s', rest_time: 30, instructions: 'Manter posição isométrica' }
        ],
        generated_with_ai: false,
        fallback: true
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateDiet = async () => {
    if (!selectedDietGoal) {
      return;
    }

    if (useAnamneseForDiet && !selectedStudentForDiet) {
      return;
    }

    setIsGeneratingDiet(true);
    setGeneratedDiet(null);

    try {
      // Timeout para evitar travamentos longos
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: Geração demorou mais que 2 minutos')), 120000)
      );

      const generatePromise = supabase.functions.invoke('ai-training-generator', {
        body: {
          type: 'diet',
          useAnamnesis: useAnamneseForDiet,
          studentId: useAnamneseForDiet ? selectedStudentForDiet : null,
          goal: selectedDietGoal,
          mealsPerDay: 5,
          dietaryRestrictions: []
        }
      });

      const { data, error } = await Promise.race([generatePromise, timeoutPromise]) as any;

      if (error) throw error;

      if (data.success) {
        const dietData = data.data;
        
        // Validar e sanitizar dados da dieta
        const sanitizedDiet = {
          ...dietData,
          generation_context: {
            useAnamnesis: useAnamneseForDiet,
            studentId: selectedStudentForDiet,
            studentName: useAnamneseForDiet && selectedStudentForDiet 
              ? students.find(s => s.user_id === selectedStudentForDiet)?.name 
              : null
          }
        };

        // Se tem dias (dieta semanal), validar estrutura
        if (dietData.days && Array.isArray(dietData.days)) {
          sanitizedDiet.days = dietData.days.map(day => ({
            ...day,
            meals: day.meals?.map(meal => ({
              ...meal,
              foods: meal.foods?.map(food => ({
                name: typeof food === 'string' ? food : (food.name || 'Alimento'),
                quantity: typeof food === 'object' ? (food.quantity || 'N/A') : 'N/A',
                calories: typeof food === 'object' ? (food.calories || 0) : 0,
                proteins: typeof food === 'object' ? (food.proteins || food.protein || 0) : 0,
                carbs: typeof food === 'object' ? (food.carbs || 0) : 0,
                fats: typeof food === 'object' ? (food.fats || food.fat || 0) : 0
              })) || [],
              calories: meal.calories || 0,
              proteins: meal.proteins || meal.protein || 0,
              carbs: meal.carbs || 0,
              fats: meal.fats || meal.fat || 0
            })) || [],
            daily_totals: {
              calories: day.daily_totals?.calories || 0,
              proteins: day.daily_totals?.proteins || day.daily_totals?.protein || 0,
              carbs: day.daily_totals?.carbs || 0,
              fats: day.daily_totals?.fats || day.daily_totals?.fat || 0
            }
          }));
          
          // Calcular totais semanais se não existirem
          if (!sanitizedDiet.weekly_totals) {
            const totalDays = sanitizedDiet.days.length;
            const avgCalories = Math.round(sanitizedDiet.days.reduce((sum, day) => sum + (day.daily_totals?.calories || 0), 0) / totalDays);
            const avgProteins = Math.round(sanitizedDiet.days.reduce((sum, day) => sum + (day.daily_totals?.proteins || 0), 0) / totalDays);
            const avgCarbs = Math.round(sanitizedDiet.days.reduce((sum, day) => sum + (day.daily_totals?.carbs || 0), 0) / totalDays);
            const avgFats = Math.round(sanitizedDiet.days.reduce((sum, day) => sum + (day.daily_totals?.fats || 0), 0) / totalDays);
            
            sanitizedDiet.weekly_totals = {
              avg_daily_calories: avgCalories,
              avg_daily_proteins: avgProteins,
              avg_daily_carbs: avgCarbs,
              avg_daily_fats: avgFats
            };
          }
        }

        setGeneratedDiet(sanitizedDiet);
      } else {
        throw new Error(data.details || data.error);
      }
    } catch (error) {
      console.error('Erro ao gerar dieta:', error);
      
      // Mostrar toast com erro específico
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast({
        title: "Erro na Geração da Dieta",
        description: `${errorMessage}. Usando plano de emergência.`,
        variant: "destructive"
      });
      
      // Fallback para dieta semanal completa e estruturada
      const sampleDays = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
      const sampleMeals = [
        {
          name: 'Café da Manhã',
          time: '08:00',
          foods: [
            { name: 'Aveia', quantity: '50g', calories: 180, proteins: 6, carbs: 30, fats: 3 },
            { name: 'Banana', quantity: '1 unidade', calories: 90, proteins: 1, carbs: 23, fats: 0 }
          ],
          calories: 270,
          proteins: 7,
          carbs: 53,
          fats: 3,
          preparation_notes: 'Misturar aveia com água quente'
        },
        {
          name: 'Lanche da Manhã',
          time: '10:00',
          foods: [
            { name: 'Iogurte natural', quantity: '150g', calories: 100, proteins: 8, carbs: 12, fats: 4 }
          ],
          calories: 100,
          proteins: 8,
          carbs: 12,
          fats: 4,
          preparation_notes: 'Consumir gelado'
        },
        {
          name: 'Almoço',
          time: '12:30',
          foods: [
            { name: 'Frango grelhado', quantity: '150g', calories: 250, proteins: 46, carbs: 0, fats: 6 },
            { name: 'Arroz integral', quantity: '80g', calories: 90, proteins: 2, carbs: 18, fats: 1 },
            { name: 'Brócolis', quantity: '100g', calories: 25, proteins: 3, carbs: 5, fats: 0 }
          ],
          calories: 365,
          proteins: 51,
          carbs: 23,
          fats: 7,
          preparation_notes: 'Grelhar com temperos naturais'
        },
        {
          name: 'Lanche da Tarde',
          time: '15:30',
          foods: [
            { name: 'Castanhas', quantity: '30g', calories: 180, proteins: 6, carbs: 6, fats: 16 }
          ],
          calories: 180,
          proteins: 6,
          carbs: 6,
          fats: 16,
          preparation_notes: 'Porção controlada'
        },
        {
          name: 'Jantar',
          time: '19:00',
          foods: [
            { name: 'Peixe assado', quantity: '120g', calories: 150, proteins: 28, carbs: 0, fats: 4 },
            { name: 'Batata doce', quantity: '100g', calories: 85, proteins: 2, carbs: 20, fats: 0 },
            { name: 'Salada', quantity: '150g', calories: 30, proteins: 2, carbs: 6, fats: 0 }
          ],
          calories: 265,
          proteins: 32,
          carbs: 26,
          fats: 4,
          preparation_notes: 'Assar com ervas'
        }
      ];

      const fallbackDays = sampleDays.map(dayName => ({
        day: dayName,
        meals: sampleMeals,
        daily_totals: {
          calories: 1180,
          proteins: 104,
          carbs: 120,
          fats: 34
        }
      }));

      setGeneratedDiet({
        name: `Plano Alimentar de Emergência - ${selectedDietGoal}`,
        description: 'Plano nutricional básico. Recomenda-se regenerar para personalização.',
        duration_weeks: 1,
        days: fallbackDays,
        weekly_totals: {
          avg_daily_calories: 1180,
          avg_daily_proteins: 104,
          avg_daily_carbs: 120,
          avg_daily_fats: 34
        },
        safety_considerations: 'Este é um plano de emergência. Consulte um nutricionista para personalização.',
        generated_with_ai: false,
        fallback: true,
        error_occurred: true,
        generation_context: {
          useAnamnesis: useAnamneseForDiet,
          studentId: selectedStudentForDiet,
          goal: selectedDietGoal,
          error: errorMessage
        }
      });
    } finally {
      setIsGeneratingDiet(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
          <Bot className="w-6 h-6 icon-success" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Criação com IA</h1>
          <p className="text-muted-foreground">Gere planos personalizados automaticamente com inteligência artificial</p>
        </div>
      </div>

      <Tabs defaultValue="treinos" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-card border-border">
          <TabsTrigger value="treinos" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Zap className="w-4 h-4 mr-2" />
            Treinos
          </TabsTrigger>
          <TabsTrigger value="dietas" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Utensils className="w-4 h-4 mr-2" />
            Dietas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="treinos" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Training Configuration */}
            <Card className="bg-card border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Configuração do Treino</h3>

              <div className="space-y-4">
                {/* Toggle para criar com base na anamnese */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Criar com base na Anamnese</p>
                      <p className="text-sm text-muted-foreground">Use dados coletados de um aluno específico</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseAnamneseForTraining(!useAnamneseForTraining)}
                    className="p-1"
                  >
                    {useAnamneseForTraining ? (
                      <ToggleRight className="w-6 h-6 text-primary" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                    )}
                  </Button>
                </div>

                {useAnamneseForTraining ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Selecionar Aluno</label>
                      <Select value={selectedStudentForTraining} onValueChange={setSelectedStudentForTraining}>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Escolha um aluno para gerar o treino" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Alunos da Consultoria</SelectLabel>
                            {consultoriaStudents.map((student) => (
                              <SelectItem key={student.user_id || student.id} value={student.user_id || student.id}>
                                {student.name} ({student.plan})
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Alunos do Plano Gratuito</SelectLabel>
                            {freeStudents.map((student) => (
                              <SelectItem key={student.user_id || student.id} value={student.user_id || student.id}>
                                {student.name} (Gratuito)
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Objetivo Principal</label>
                      <Select value={selectedGoal} onValueChange={setSelectedGoal}>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Selecione o objetivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hipertrofia">Hipertrofia</SelectItem>
                          <SelectItem value="emagrecimento">Emagrecimento</SelectItem>
                          <SelectItem value="condicionamento">Condicionamento Físico</SelectItem>
                          <SelectItem value="forca">Ganho de Força</SelectItem>
                          <SelectItem value="resistencia">Resistência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Equipamentos Disponíveis</label>
                      <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Selecione os equipamentos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="academia-completa">Academia Completa</SelectItem>
                          <SelectItem value="peso-corporal">Apenas Peso Corporal</SelectItem>
                          <SelectItem value="halteres">Halteres</SelectItem>
                          <SelectItem value="elasticos">Elásticos e Faixas</SelectItem>
                          <SelectItem value="funcional">Equipamentos Funcionais</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Nível de Experiência</label>
                      <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Selecione o nível" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iniciante">Iniciante</SelectItem>
                          <SelectItem value="intermediario">Intermediário</SelectItem>
                          <SelectItem value="avancado">Avançado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Mostrar informações do aluno selecionado */}
                    {selectedStudentForTraining && (
                      <div className="mt-4 p-4 bg-info/10 rounded-lg border border-info/20">
                        <h4 className="font-medium text-info mb-2 flex items-center">
                          <FileText className="w-4 h-4 mr-2" />
                          Dados do Aluno
                        </h4>
                        
                        {trainingAnamnesisLoading || loadingPhysicalData ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">Carregando dados...</span>
                          </div>
                        ) : latestTrainingAnamnesis || studentPhysicalData ? (
                          <div className="space-y-2">
                            <p className="text-sm">
                              <span className="font-medium">Nome:</span> {selectedStudentDataForTraining?.name}
                            </p>
                            
                            {studentPhysicalData && (
                              <>
                                {studentPhysicalData.weight && (
                                  <div className="flex space-x-4 text-sm">
                                    <span className="text-muted-foreground">Peso: <span className="text-foreground">{studentPhysicalData.weight}kg</span></span>
                                    {studentPhysicalData.height && (
                                      <span className="text-muted-foreground">Altura: <span className="text-foreground">{studentPhysicalData.height}cm</span></span>
                                    )}
                                  </div>
                                )}
                                
                                {studentPhysicalData.weight && studentPhysicalData.height && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">IMC: </span>
                                    <span className="text-foreground">{calculateBMI(studentPhysicalData.weight, studentPhysicalData.height)}</span>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {latestTrainingAnamnesis && (
                              <>
                                {(latestTrainingAnamnesis.lesoes || latestTrainingAnamnesis.doencas?.length > 0 || latestTrainingAnamnesis.alergias?.length > 0) && (
                                  <div className="mt-3 pt-3 border-t border-border">
                                    <p className="text-muted-foreground mb-1">Condições especiais:</p>
                                    <div className="text-foreground text-xs space-y-1">
                                      {latestTrainingAnamnesis.lesoes && (
                                        <p>• Lesões: {latestTrainingAnamnesis.lesoes}</p>
                                      )}
                                      {latestTrainingAnamnesis.doencas?.length > 0 && (
                                        <p>• Doenças: {latestTrainingAnamnesis.doencas.join(', ')}</p>
                                      )}
                                      {latestTrainingAnamnesis.outras_doencas && (
                                        <p>• Outras condições: {latestTrainingAnamnesis.outras_doencas}</p>
                                      )}
                                      {latestTrainingAnamnesis.alergias?.length > 0 && (
                                        <p>• Alergias: {latestTrainingAnamnesis.alergias.join(', ')}</p>
                                      )}
                                      {latestTrainingAnamnesis.outras_alergias && (
                                        <p>• Outras alergias: {latestTrainingAnamnesis.outras_alergias}</p>
                                      )}
                                      {latestTrainingAnamnesis.medicacoes?.length > 0 && (
                                        <p>• Medicações: {latestTrainingAnamnesis.medicacoes.join(', ')}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {(latestTrainingAnamnesis.qualidade_sono || latestTrainingAnamnesis.horas_sono) && (
                                  <div className="mt-3 pt-3 border-t border-border">
                                    <p className="text-muted-foreground mb-1">Sono:</p>
                                    <div className="text-foreground text-xs">
                                      {latestTrainingAnamnesis.qualidade_sono && (
                                        <p>• Qualidade: {latestTrainingAnamnesis.qualidade_sono}</p>
                                      )}
                                      {latestTrainingAnamnesis.horas_sono && (
                                        <p>• Horas: {latestTrainingAnamnesis.horas_sono}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {studentPhysicalData?.goals?.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <p className="text-muted-foreground mb-1">Objetivos:</p>
                                <p className="text-foreground text-xs">{studentPhysicalData.goals.join(', ')}</p>
                              </div>
                            )}
                            
                            {selectedStudentDataForTraining?.goal && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <p className="text-muted-foreground mb-1">Objetivo Principal:</p>
                                <p className="text-foreground text-xs">{selectedStudentDataForTraining.goal}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-muted-foreground text-sm">Nenhuma anamnese encontrada para este aluno</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Objetivo Principal</label>
                      <Select value={selectedGoal} onValueChange={setSelectedGoal}>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Selecione o objetivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hipertrofia">Hipertrofia</SelectItem>
                          <SelectItem value="emagrecimento">Emagrecimento</SelectItem>
                          <SelectItem value="condicionamento">Condicionamento Físico</SelectItem>
                          <SelectItem value="forca">Ganho de Força</SelectItem>
                          <SelectItem value="resistencia">Resistência</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Equipamentos Disponíveis</label>
                      <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Selecione os equipamentos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="academia-completa">Academia Completa</SelectItem>
                          <SelectItem value="peso-corporal">Apenas Peso Corporal</SelectItem>
                          <SelectItem value="halteres">Halteres</SelectItem>
                          <SelectItem value="elasticos">Elásticos e Faixas</SelectItem>
                          <SelectItem value="funcional">Equipamentos Funcionais</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Nível de Experiência</label>
                      <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Selecione o nível" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iniciante">Iniciante</SelectItem>
                          <SelectItem value="intermediario">Intermediário</SelectItem>
                          <SelectItem value="avancado">Avançado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Observações Adicionais</label>
                      <Textarea
                        placeholder="Ex: Lesão no joelho direito, preferência por treinos curtos..."
                        className="bg-input border-border text-foreground placeholder-muted-foreground"
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleGeneratePlan}
                  disabled={
                    isGenerating ||
                    (useAnamneseForTraining
                      ? !selectedStudentForTraining || !selectedGoal || !selectedEquipment || !selectedLevel
                      : !selectedGoal || !selectedEquipment || !selectedLevel)
                  }
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : useAnamneseForTraining ? (
                    <>
                      <User className="w-4 h-4 mr-2" />
                      Gerar com Base na Anamnese
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Gerar Plano com IA
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Generated Plan */}
            <Card className="bg-card border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Plano Gerado</h3>

              {isGenerating ? (
                <div className="animate-fade-in">
                  <LoadingHourglass 
                    message="Gerando plano de treino personalizado..."
                    type="training"
                    compact={true}
                  />
                </div>
              ) : !generatedPlan ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Bot className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Configure os parâmetros e clique em "Gerar Plano" para criar um treino personalizado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {generatedPlan.generation_context?.useAnamnesis ? 'Treino Baseado na Anamnese' : 'Treino Personalizado'}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        {generatedPlan.generation_context?.useAnamnesis ? (
                          <>
                            <Badge variant="secondary">
                              <User className="w-3 h-3 mr-1" />
                              {generatedPlan.student}
                            </Badge>
                            <Badge variant="success">
                              Baseado na Anamnese
                            </Badge>
                          </>
                        ) : (
                          <>
                            <Badge variant="success">
                              {selectedGoal}
                            </Badge>
                            <Badge variant="info">
                              {selectedLevel}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                     <div className="flex space-x-2">
                       <Button 
                         size="sm" 
                         variant="outline"
                         onClick={() => setEditTrainingModalOpen(true)}
                       >
                         <Edit className="w-4 h-4 mr-1" />
                         Editar
                       </Button>
                       <Button 
                         size="sm" 
                         className="bg-primary hover:bg-primary/90 text-primary-foreground"
                         onClick={() => setSendTrainingModalOpen(true)}
                       >
                         <Share className="w-4 h-4 mr-1" />
                         Enviar
                       </Button>
                     </div>
                  </div>

                    <ScrollArea className="h-96 w-full">
                      <div className="space-y-3 pr-4">
                       {generatedPlan.exercises?.map((exercise, index) => (
                         <div key={index} className="bg-muted/50 rounded-lg p-4">
                           <div className="flex items-start justify-between">
                             <div className="flex-1">
                               <h5 className="font-medium text-foreground">{exercise.name}</h5>
                               <p className="text-sm text-muted-foreground mb-2">{exercise.muscle_group}</p>
                               
                               <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                                 <div className="text-xs">
                                   <span className="font-medium">Séries:</span> {exercise.sets}
                                 </div>
                                 <div className="text-xs">
                                   <span className="font-medium">Reps:</span> {exercise.reps}
                                 </div>
                                 {exercise.weight && (
                                   <div className="text-xs">
                                     <span className="font-medium">Peso:</span> {exercise.weight}
                                   </div>
                                 )}
                                 <div className="text-xs">
                                   <span className="font-medium">Descanso:</span> {exercise.rest_time}
                                 </div>
                               </div>
                               
                               {exercise.instructions && (
                                 <p className="text-xs text-muted-foreground mb-1">
                                   <span className="font-medium">Execução:</span> {exercise.instructions}
                                 </p>
                               )}
                               
                               {exercise.safety_notes && (
                                 <p className="text-xs text-amber-600">
                                   <span className="font-medium">Atenção:</span> {exercise.safety_notes}
                                 </p>
                               )}
                               
                               {exercise.modifications && (
                                 <p className="text-xs text-blue-600">
                                   <span className="font-medium">Adaptações:</span> {exercise.modifications}
                                 </p>
                               )}
                             </div>
                           </div>
                         </div>
                       ))}
                     </div>
                   </ScrollArea>

                  {generatedPlan.isFromAnamnese ? (
                    <div className="mt-6 p-4 bg-warning/10 rounded-lg border border-warning/20">
                      <h5 className="font-medium text-warning mb-2">Observações Baseadas na Anamnese</h5>
                      <p className="text-sm text-card-foreground">
                        {generatedPlan.observations}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-6 p-4 bg-success/10 rounded-lg border border-success/20">
                      <h5 className="font-medium text-success mb-2">Dicas da IA</h5>
                      <p className="text-sm text-card-foreground">
                        Mantenha a técnica correta em todos os exercícios. Aumente gradualmente a intensidade conforme a evolução do aluno. Monitore a recuperação entre as sessões.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dietas" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Diet Configuration */}
            <Card className="bg-card border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Configuração da Dieta</h3>

              <div className="space-y-4">
                {/* Toggle para criar com base na anamnese */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">Criar com base na Anamnese</p>
                      <p className="text-sm text-muted-foreground">Use dados coletados de um aluno específico</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseAnamneseForDiet(!useAnamneseForDiet)}
                    className="p-1"
                  >
                    {useAnamneseForDiet ? (
                      <ToggleRight className="w-6 h-6 text-primary" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                    )}
                  </Button>
                </div>

                {useAnamneseForDiet ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Selecionar Aluno</label>
                      <Select value={selectedStudentForDiet} onValueChange={setSelectedStudentForDiet}>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Escolha um aluno para gerar a dieta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Alunos da Consultoria</SelectLabel>
                            {consultoriaStudents.map((student) => (
                              <SelectItem key={student.user_id || student.id} value={student.user_id || student.id}>
                                {student.name} ({student.plan})
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectGroup>
                            <SelectLabel>Alunos do Plano Gratuito</SelectLabel>
                            {freeStudents.map((student) => (
                              <SelectItem key={student.user_id || student.id} value={student.user_id || student.id}>
                                {student.name} (Gratuito)
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Objetivo Nutricional</label>
                      <Select value={selectedDietGoal} onValueChange={setSelectedDietGoal}>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Selecione o objetivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="emagrecimento">Emagrecimento</SelectItem>
                          <SelectItem value="ganho_massa">Ganho de Massa Muscular</SelectItem>
                          <SelectItem value="manutencao">Manutenção do Peso</SelectItem>
                          <SelectItem value="definicao">Definição Muscular</SelectItem>
                          <SelectItem value="saude_geral">Saúde Geral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Mostrar informações do aluno selecionado */}
                    {selectedStudentForDiet && (
                      <div className="mt-4 p-4 bg-info/10 rounded-lg border border-info/20">
                        <h4 className="font-medium text-info mb-2 flex items-center">
                          <FileText className="w-4 h-4 mr-2" />
                          Dados do Aluno
                        </h4>
                        
                        {dietAnamnesisLoading || loadingDietPhysicalData ? (
                          <div className="flex items-center space-x-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">Carregando dados...</span>
                          </div>
                        ) : latestDietAnamnesis || dietStudentPhysicalData ? (
                          <div className="space-y-2">
                            <p className="text-sm">
                              <span className="font-medium">Nome:</span> {selectedStudentDataForDiet?.name}
                            </p>
                            
                            {dietStudentPhysicalData && (
                              <>
                                {dietStudentPhysicalData.weight && (
                                  <div className="flex space-x-4 text-sm">
                                    <span className="text-muted-foreground">Peso: <span className="text-foreground">{dietStudentPhysicalData.weight}kg</span></span>
                                    {dietStudentPhysicalData.height && (
                                      <span className="text-muted-foreground">Altura: <span className="text-foreground">{dietStudentPhysicalData.height}cm</span></span>
                                    )}
                                  </div>
                                )}
                                
                                {dietStudentPhysicalData.weight && dietStudentPhysicalData.height && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">IMC: </span>
                                    <span className="text-foreground">{calculateBMI(dietStudentPhysicalData.weight, dietStudentPhysicalData.height)}</span>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {latestDietAnamnesis && (
                              <>
                                {latestDietAnamnesis.alergias?.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-border">
                                    <p className="text-muted-foreground mb-1">Alergias alimentares:</p>
                                    <div className="text-foreground text-xs space-y-1">
                                      <p>• {latestDietAnamnesis.alergias.join(', ')}</p>
                                      {latestDietAnamnesis.outras_alergias && (
                                        <p>• Outras: {latestDietAnamnesis.outras_alergias}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {(latestDietAnamnesis.doencas?.length > 0 || latestDietAnamnesis.outras_doencas) && (
                                  <div className="mt-3 pt-3 border-t border-border">
                                    <p className="text-muted-foreground mb-1">Condições de saúde:</p>
                                    <div className="text-foreground text-xs space-y-1">
                                      {latestDietAnamnesis.doencas?.length > 0 && (
                                        <p>• {latestDietAnamnesis.doencas.join(', ')}</p>
                                      )}
                                      {latestDietAnamnesis.outras_doencas && (
                                        <p>• Outras: {latestDietAnamnesis.outras_doencas}</p>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                            
                            {dietStudentPhysicalData?.goals?.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-border">
                                <p className="text-muted-foreground mb-1">Objetivos:</p>
                                <p className="text-foreground text-xs">{dietStudentPhysicalData.goals.join(', ')}</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <p className="text-muted-foreground text-sm">Nenhuma anamnese encontrada para este aluno</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Objetivo Nutricional</label>
                      <Select value={selectedDietGoal} onValueChange={setSelectedDietGoal}>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Selecione o objetivo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="emagrecimento">Emagrecimento</SelectItem>
                          <SelectItem value="ganho_massa">Ganho de Massa Muscular</SelectItem>
                          <SelectItem value="manutencao">Manutenção do Peso</SelectItem>
                          <SelectItem value="definicao">Definição Muscular</SelectItem>
                          <SelectItem value="saude_geral">Saúde Geral</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Tipo de Dieta</label>
                      <Select value={selectedDietType} onValueChange={setSelectedDietType}>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equilibrada">Equilibrada</SelectItem>
                          <SelectItem value="low_carb">Low Carb</SelectItem>
                          <SelectItem value="vegetariana">Vegetariana</SelectItem>
                          <SelectItem value="vegana">Vegana</SelectItem>
                          <SelectItem value="cetogenica">Cetogênica</SelectItem>
                          <SelectItem value="mediterranea">Mediterrânea</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Nível de Atividade</label>
                      <Select value={selectedActivity} onValueChange={setSelectedActivity}>
                        <SelectTrigger className="bg-input border-border text-foreground">
                          <SelectValue placeholder="Selecione o nível" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sedentario">Sedentário</SelectItem>
                          <SelectItem value="leve">Atividade Leve</SelectItem>
                          <SelectItem value="moderada">Atividade Moderada</SelectItem>
                          <SelectItem value="intensa">Atividade Intensa</SelectItem>
                          <SelectItem value="muito_intensa">Muito Ativa</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">Restrições Alimentares</label>
                      <Textarea
                        placeholder="Ex: Intolerância à lactose, alergia a amendoim, não come carne vermelha..."
                        className="bg-input border-border text-foreground placeholder-muted-foreground"
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleGenerateDiet}
                  disabled={
                    isGeneratingDiet ||
                    (useAnamneseForDiet
                      ? !selectedStudentForDiet || !selectedDietGoal
                      : !selectedDietGoal || !selectedDietType || !selectedActivity)
                  }
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                >
                  {isGeneratingDiet ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : useAnamneseForDiet ? (
                    <>
                      <User className="w-4 h-4 mr-2" />
                      Gerar com Base na Anamnese
                    </>
                  ) : (
                    <>
                      <Utensils className="w-4 h-4 mr-2" />
                      Gerar Dieta com IA
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Generated Diet */}
            <Card className="bg-card border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-6">Dieta Gerada</h3>

              {isGeneratingDiet ? (
                <div className="animate-fade-in">
                  <LoadingHourglass 
                    message="Gerando plano alimentar personalizado..."
                    type="diet"
                    compact={true}
                  />
                </div>
              ) : !generatedDiet ? (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <Utensils className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Configure os parâmetros e clique em "Gerar Dieta" para criar um plano nutricional personalizado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-foreground">
                        {generatedDiet.generation_context?.useAnamnesis ? 'Dieta Baseada na Anamnese' : 'Plano Nutricional'}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        {generatedDiet.generation_context?.useAnamnesis ? (
                          <>
                            <Badge variant="info">
                              <User className="w-3 h-3 mr-1" />
                              {generatedDiet.generation_context?.studentName || 'Aluno'}
                            </Badge>
                            <Badge variant="success">
                              Baseado na Anamnese
                            </Badge>
                            <Badge variant="warning">
                              {generatedDiet.totalCalories}
                            </Badge>
                          </>
                        ) : (
                          <>
                            <Badge variant="success">
                              {selectedDietGoal}
                            </Badge>
                            <Badge variant="warning">
                              {selectedDietType}
                            </Badge>
                            {generatedDiet.error_occurred && (
                              <Badge variant="destructive" className="text-xs">
                                Erro - Plano de Emergência
                              </Badge>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                     <div className="flex space-x-2">
                       {generatedDiet.error_occurred && (
                         <Button 
                           size="sm" 
                           variant="default"
                           onClick={handleGenerateDiet}
                           className="bg-yellow-600 hover:bg-yellow-700"
                         >
                           <Zap className="w-4 h-4 mr-1" />
                           Tentar Novamente
                         </Button>
                       )}
                       <Button 
                         size="sm" 
                         variant="outline"
                         onClick={() => setEditDietModalOpen(true)}
                       >
                         <Edit className="w-4 h-4 mr-1" />
                         Editar
                       </Button>
                       <Button 
                         size="sm" 
                         className="bg-primary hover:bg-primary/90 text-primary-foreground"
                         onClick={() => setSendDietModalOpen(true)}
                       >
                         <Share className="w-4 h-4 mr-1" />
                         Enviar
                       </Button>
                     </div>
                  </div>

                    <ScrollArea className="h-96 w-full">
                      <div className="space-y-3 pr-4">
                       {/* Display weekly diet if available */}
                       {generatedDiet.days ? (
                         <div className="space-y-4">
                           <div className="flex items-center justify-between mb-4">
                             <h4 className="text-lg font-semibold">Plano Semanal</h4>
                             <Badge variant="secondary">7 dias</Badge>
                           </div>
                           
                           {generatedDiet.days.map((day, dayIndex) => (
                            <div key={dayIndex} className="border border-border rounded-lg overflow-hidden">
                              <div className="bg-muted/30 px-4 py-2 border-b border-border">
                                <h5 className="font-medium text-foreground">{day.day}</h5>
                                <p className="text-xs text-muted-foreground">
                                  Total: {day.daily_totals?.calories || 'N/A'} kcal
                                </p>
                              </div>
                              
                              <div className="p-4 space-y-3">
                                {day.meals?.map((meal, mealIndex) => (
                                  <div key={mealIndex} className="bg-muted/30 rounded-lg p-3">
                                    <div className="flex items-start justify-between mb-2">
                                      <div className="flex-1">
                                        <h6 className="font-medium text-foreground text-sm">{meal.name}</h6>
                                        <p className="text-xs text-muted-foreground mb-2">{meal.time}</p>
                                        
                                         <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                                           <div className="text-xs">
                                             <span className="font-medium">Calorias:</span> {meal.calories || 0}
                                           </div>
                                           <div className="text-xs">
                                             <span className="font-medium">Proteína:</span> {meal.proteins || meal.protein || 0}g
                                           </div>
                                           <div className="text-xs">
                                             <span className="font-medium">Carbs:</span> {meal.carbs || 0}g
                                           </div>
                                           <div className="text-xs">
                                             <span className="font-medium">Gordura:</span> {meal.fats || meal.fat || 0}g
                                           </div>
                                         </div>
                                        
                                        <div className="space-y-1 mb-2">
                                          <p className="text-xs font-medium">Alimentos:</p>
                                          {meal.foods?.map((food, foodIndex) => (
                                            <p key={foodIndex} className="text-xs text-muted-foreground ml-2">
                                              • {typeof food === 'string' ? food : food.name} 
                                              {typeof food === 'object' && food.quantity && ` (${food.quantity})`}
                                            </p>
                                          ))}
                                        </div>
                                        
                                        {meal.instructions && (
                                          <p className="text-xs text-muted-foreground mb-1">
                                            <span className="font-medium">Preparo:</span> {meal.instructions}
                                          </p>
                                        )}
                                        
                                        {meal.substitutions && (
                                          <p className="text-xs text-blue-600">
                                            <span className="font-medium">Substituições:</span> {meal.substitutions}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                 ))}
                               </div>
                             </div>
                           ))}

                           <div className="mt-6 p-4 bg-info/10 rounded-lg border border-info/20">
                             <h5 className="font-medium text-info mb-2">
                               Média Semanal de Macronutrientes
                             </h5>
                             <div className="grid grid-cols-3 gap-4 text-center">
                               <div>
                                 <p className="text-lg font-semibold text-foreground">
                                   {(generatedDiet.weekly_totals?.avg_daily_proteins || generatedDiet.daily_totals?.proteins || 0)}g
                                 </p>
                                 <p className="text-xs text-muted-foreground">Proteínas</p>
                               </div>
                               <div>
                                 <p className="text-lg font-semibold text-foreground">
                                   {(generatedDiet.weekly_totals?.avg_daily_carbs || generatedDiet.daily_totals?.carbs || 0)}g
                                 </p>
                                 <p className="text-xs text-muted-foreground">Carboidratos</p>
                               </div>
                               <div>
                                 <p className="text-lg font-semibold text-foreground">
                                   {(generatedDiet.weekly_totals?.avg_daily_fats || generatedDiet.daily_totals?.fats || 0)}g
                                 </p>
                                 <p className="text-xs text-muted-foreground">Gorduras</p>
                               </div>
                             </div>
                             
                             {(generatedDiet.weekly_totals || generatedDiet.daily_totals) && (
                               <div className="mt-3 pt-3 border-t border-info/20">
                                 <p className="text-center text-sm text-muted-foreground">
                                   Calorias médias diárias: <span className="font-medium text-foreground">
                                     {generatedDiet.weekly_totals?.avg_daily_calories || generatedDiet.daily_totals?.calories || 0} kcal
                                   </span>
                                 </p>
                               </div>
                             )}
                           </div>
                         </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-muted-foreground">Nenhuma dieta semanal gerada ainda</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                  {generatedDiet.error_occurred && (
                    <div className="mt-6 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                      <h5 className="font-medium text-destructive mb-2 flex items-center">
                        <Zap className="w-4 h-4 mr-2" />
                        Plano de Emergência
                      </h5>
                      <p className="text-sm text-card-foreground mb-3">
                        Houve um problema na geração personalizada. Este é um plano básico que você pode editar ou tentar regenerar.
                      </p>
                      <Button 
                        size="sm" 
                        onClick={handleGenerateDiet}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Tentar Gerar Novamente
                      </Button>
                    </div>
                  )}

                  {generatedDiet.isFromAnamnese && !generatedDiet.error_occurred && (
                    <div className="mt-6 p-4 bg-warning/10 rounded-lg border border-warning/20">
                      <h5 className="font-medium text-warning mb-2">Observações Baseadas na Anamnese</h5>
                      <p className="text-sm text-card-foreground">
                        {generatedDiet.observations}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <EditAITrainingModal
        isOpen={editTrainingModalOpen}
        onClose={() => setEditTrainingModalOpen(false)}
        plan={generatedPlan}
        onSave={(updatedPlan) => {
          setGeneratedPlan(updatedPlan);
          setEditTrainingModalOpen(false);
        }}
      />

      <EditAIDietModal
        isOpen={editDietModalOpen}
        onClose={() => setEditDietModalOpen(false)}
        plan={generatedDiet}
        onSave={(updatedPlan) => {
          setGeneratedDiet(updatedPlan);
          setEditDietModalOpen(false);
        }}
      />

      <SendPlanModal
        isOpen={sendTrainingModalOpen}
        onClose={() => setSendTrainingModalOpen(false)}
        plan={generatedPlan}
        type="training"
        students={students}
        preSelectedStudentId={useAnamneseForTraining ? selectedStudentForTraining : undefined}
      />

      <SendPlanModal
        isOpen={sendDietModalOpen}
        onClose={() => setSendDietModalOpen(false)}
        plan={generatedDiet}
        type="diet"
        students={students}
        preSelectedStudentId={useAnamneseForDiet ? selectedStudentForDiet : undefined}
      />
    </div>
  );
}