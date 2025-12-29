import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ArrowLeft, MessageSquare, Phone, Calendar, ClipboardCheck, Utensils, Dumbbell, Activity, Camera, FileText } from 'lucide-react';
import { StudentAppointmentsList } from '@/components/consulting/StudentAppointmentsList';
import { StudentEvaluationsTab } from '@/components/consulting/StudentEvaluationsTab';
import { StudentAnamneseTab } from '@/components/students/StudentAnamneseTab';
import { MealPlansManager } from '@/components/nutrition';
import { StudentTrainingPlansView } from '@/components/training/StudentTrainingPlansView';
import { ProgressTrackingTab } from '@/components/students/ProgressTrackingTab';
import { ProgressPhotosTab } from '@/components/students/ProgressPhotosTab';
import { FeedbacksTab } from '@/components/students/FeedbacksTab';
import { useAppointments } from '@/hooks/useAppointments';

interface Student {
  id: number;
  name: string;
  email: string;
  plan: string;
  modality: string;
  daysRemaining: number;
  status: 'active' | 'inactive' | 'free';
  age: number;
  height: string;
  weight: string;
}

interface StudentDetailViewProps {
  student: Student;
  onBack: () => void;
  onOpenWhatsApp: () => void;
  onOpenChat: () => void;
  rawStudents: any[];
  getSelectedStudentUserId: () => string | null;
}

export function StudentDetailView({ 
  student, 
  onBack, 
  onOpenWhatsApp, 
  onOpenChat, 
  rawStudents,
  getSelectedStudentUserId
}: StudentDetailViewProps) {
  const [activeTab, setActiveTab] = useState('agendamentos');
  
  const { refetch: refetchAppointments } = useAppointments();

  const studentTabs = [
    { id: 'agendamentos', label: 'Agendamentos', icon: Calendar },
    { id: 'progresso', label: 'Progresso', icon: Activity },
    { id: 'avaliacoes', label: 'Avaliações', icon: ClipboardCheck },
    { id: 'feedbacks', label: 'Feedbacks', icon: MessageSquare },
    { id: 'dietas', label: 'Dietas', icon: Utensils },
    { id: 'treinos', label: 'Treinos', icon: Dumbbell },
    { id: 'fotos', label: 'Fotos', icon: Camera },
    { id: 'anamnese', label: 'Anamnese', icon: FileText }
  ];

  const renderTabContent = () => {
    const studentUserId = rawStudents.find(s => s.name === student?.name)?.user_id;

    switch (activeTab) {
      case 'agendamentos':
        return (
          <div className="p-6">
            <StudentAppointmentsList 
              studentId={studentUserId} 
              teacherId={rawStudents.find(s => s.name === student?.name)?.teacher_id}
              onConfirmAppointment={(id) => {}}
              onCancelAppointment={(id) => {}}
            />
          </div>
        );

      case 'progresso':
        return (
          <ProgressTrackingTab 
            studentUserId={studentUserId || ''} 
            studentName={student?.name || ''}
          />
        );

      case 'avaliacoes':
        return (
          <StudentEvaluationsTab 
            studentId={studentUserId} 
            studentName={student?.name || ''}
          />
        );

      case 'feedbacks':
        return (
          <FeedbacksTab 
            studentUserId={studentUserId || ''} 
            studentName={student?.name || ''}
          />
        );

      case 'dietas':
        return (
          <MealPlansManager 
            studentUserId={studentUserId || ''} 
            studentName={student?.name || ''}
            isStudentView={false}
          />
        );

      case 'treinos':
        return (
          <StudentTrainingPlansView 
            studentUserId={studentUserId || ''} 
            studentName={student?.name || ''}
          />
        );

      case 'fotos':
        return (
          <ProgressPhotosTab 
            studentUserId={studentUserId || ''} 
            studentName={student?.name || ''}
          />
        );

      case 'anamnese':
        return (
          <StudentAnamneseTab 
            studentUserId={studentUserId || ''} 
            studentName={student?.name || ''}
          />
        );

      default:
        return (
          <div className="p-6">
            <div className="text-center py-12 text-muted-foreground">
              Selecione uma aba para visualizar o conteúdo.
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground">
                {student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{student.name}</h2>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <span>{student.plan}</span>
                <span>{student.modality}</span>
              </div>
              <Badge className={
                student.daysRemaining <= 0 
                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                  : student.daysRemaining <= 7 
                  ? 'bg-warning/10 text-warning border-warning/20'
                  : student.daysRemaining <= 30 
                  ? 'bg-secondary/10 text-secondary border-secondary/20'
                  : 'bg-success/10 text-success border-success/20'
              }>
                {student.daysRemaining <= 0 
                  ? 'Vencido' 
                  : `${student.daysRemaining} dias restantes`}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={onOpenWhatsApp}
          >
            <Phone className="w-4 h-4 mr-2" />
            WhatsApp
          </Button>
          <Button 
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={onOpenChat}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Mensagens
          </Button>
        </div>
      </div>

      {/* Student Tabs */}
      <div className="flex flex-wrap gap-2">
        {studentTabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(tab.id)}
              className={
                activeTab === tab.id
                  ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }
            >
              <IconComponent className="w-4 h-4 mr-2" />
              {tab.label}
            </Button>
          );
        })}
      </div>

      {/* Tab Content */}
      <Card className="bg-card border-border">
        {renderTabContent()}
      </Card>

    </div>
  );
}