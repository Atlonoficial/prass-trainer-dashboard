import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit, Activity, Utensils, Dumbbell } from 'lucide-react';

interface Student {
  id: number;
  name: string;
  email: string;
  plan: string;
  modality: string;
  daysRemaining: number;
  status: 'active' | 'inactive' | 'free';
}

interface StudentsTableProps {
  students: Student[];
  onStudentClick: (student: Student) => void;
  showActions?: boolean;
}

export function StudentsTable({ students, onStudentClick, showActions = false }: StudentsTableProps) {
  const getModalityIcon = (modality: string) => {
    if (modality.includes('Dieta') && modality.includes('Treino')) {
      return <Activity className="w-4 h-4" />;
    } else if (modality.includes('Dieta')) {
      return <Utensils className="w-4 h-4" />;
    } else {
      return <Dumbbell className="w-4 h-4" />;
    }
  };

  const getModalityColor = (modality: string) => {
    if (modality.includes('Dieta') && modality.includes('Treino')) {
      return 'text-warning';
    } else if (modality.includes('Dieta')) {
      return 'text-info';
    } else {
      return 'text-warning';
    }
  };

  return (
    <Card className="bg-card border-border">
      <Table>
        <TableHeader>
          <TableRow className="border-border">
            <TableHead className="text-muted-foreground">Status</TableHead>
            <TableHead className="text-muted-foreground">Aluno</TableHead>
            <TableHead className="text-muted-foreground">E-mail</TableHead>
            <TableHead className="text-muted-foreground">Plano</TableHead>
            <TableHead className="text-muted-foreground">Modalidade</TableHead>
            <TableHead className="text-muted-foreground">Vencimento</TableHead>
            {showActions && <TableHead className="text-muted-foreground">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.length === 0 ? (
            <TableRow>
              <TableCell colSpan={showActions ? 7 : 6} className="text-center py-8 text-muted-foreground">
                Nenhum aluno encontrado
              </TableCell>
            </TableRow>
          ) : (
            students.map((student) => (
              <TableRow 
                key={student.id} 
                className="border-border hover:bg-muted/30 cursor-pointer"
                onClick={() => onStudentClick(student)}
              >
                <TableCell>
                  <Badge className={
                    student.status === 'active' 
                      ? 'bg-success/10 text-success border-success/20'
                      : student.status === 'inactive'
                      ? 'bg-warning/10 text-warning border-warning/20'
                      : 'bg-muted text-muted-foreground border-border'
                  }>
                    {student.status === 'active' ? 'Ativo' : student.status === 'inactive' ? 'Inativo' : 'Livre'}
                  </Badge>
                </TableCell>
                <TableCell className="text-foreground font-medium">{student.name}</TableCell>
                <TableCell className="text-muted-foreground">{student.email}</TableCell>
                <TableCell className="text-muted-foreground">{student.plan}</TableCell>
                <TableCell>
                  <div className={`flex items-center gap-2 text-sm font-medium ${getModalityColor(student.modality)}`}>
                    {getModalityIcon(student.modality)}
                    {student.modality}
                  </div>
                </TableCell>
                <TableCell>
                  {student.daysRemaining > 0 ? (
                    <Badge className={
                      student.daysRemaining <= 7 
                        ? 'bg-destructive/10 text-destructive border-destructive/20'
                        : student.daysRemaining <= 30 
                        ? 'bg-warning/10 text-warning border-warning/20'
                        : 'bg-success/10 text-success border-success/20'
                    }>
                      {student.daysRemaining} dias
                    </Badge>
                  ) : (
                    <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                      Expirado
                    </Badge>
                  )}
                </TableCell>
                {showActions && (
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onStudentClick(student);
                        }}
                        className="text-info hover:text-info/80"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        className="text-warning hover:text-warning/80"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      
      <div className="p-4 text-center text-muted-foreground text-sm border-t border-border">
        Exibindo {students.length} aluno{students.length !== 1 ? 's' : ''}
      </div>
    </Card>
  );
}