import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Edit, Eye, MessageSquare, Calendar, Filter, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/hooks/use-mobile';

interface StudentManagementMobileProps {
  students: any[];
  searchName: string;
  setSearchName: (value: string) => void;
  selectedPlan: string;
  setSelectedPlan: (value: string) => void;
  selectedStatus: string;
  setSelectedStatus: (value: string) => void;
  onStudentClick: (student: any) => void;
  onViewProfile: (student: any, e: React.MouseEvent) => void;
  onEditStudent: (student: any, e: React.MouseEvent) => void;
  plans: any[];
  getStatusBadge: (status: string) => string;
  getStatusDisplay: (status: string) => string;
  getPlanName: (student: any) => string;
}

export function StudentManagementMobile({
  students,
  searchName,
  setSearchName,
  selectedPlan,
  setSelectedPlan,
  selectedStatus,
  setSelectedStatus,
  onStudentClick,
  onViewProfile,
  onEditStudent,
  plans,
  getStatusBadge,
  getStatusDisplay,
  getPlanName
}: StudentManagementMobileProps) {
  const [showFilters, setShowFilters] = useState(false);
  const isMobile = useIsMobile();

  if (!isMobile) return null;

  return (
    <div className="space-y-4">
      {/* Mobile Search */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Buscar aluno..."
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            className="pl-10 min-h-12 text-base"
          />
        </div>
        
        {/* Filter Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="w-full justify-center gap-2 min-h-11"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
        </Button>

        {/* Mobile Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 gap-3 p-4 bg-muted/10 rounded-lg border">
            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Plano</label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger className="min-h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os planos</SelectItem>
                  {plans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                  ))}
                  <SelectItem value="none">Sem plano</SelectItem>
                  <SelectItem value="free">Gratuito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-2 block">Status</label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="min-h-11 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Student Cards */}
      <div className="space-y-3">
        {students.map((student) => (
          <Card 
            key={student.id} 
            className="p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => onStudentClick(student)}
          >
            <div className="flex items-start space-x-3">
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage src={student.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {student.name?.charAt(0)?.toUpperCase() || 'A'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-foreground text-sm truncate">
                      {student.name}
                    </h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {student.email}
                    </p>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={(e) => onViewProfile(student, e)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Perfil
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => onEditStudent(student, e)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Mensagem
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Calendar className="w-4 h-4 mr-2" />
                        Agendar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex flex-col space-y-1">
                    <Badge 
                      className={`text-xs ${getStatusBadge(student.membership_status)} max-w-fit`}
                    >
                      {getStatusDisplay(student.membership_status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {getPlanName(student)}
                    </span>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {student.membership_expiry ? 
                        `Vence: ${new Date(student.membership_expiry).toLocaleDateString('pt-BR')}` :
                        'Sem vencimento'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}