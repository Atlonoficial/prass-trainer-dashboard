import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface StudentFiltersProps {
  searchName: string;
  onSearchNameChange: (value: string) => void;
  searchEmail: string;
  onSearchEmailChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  planFilter: string;
  onPlanFilterChange: (value: string) => void;
  modalityFilter: string;
  onModalityFilterChange: (value: string) => void;
  onClearFilters: () => void;
}

export function StudentFilters({
  searchName,
  onSearchNameChange,
  searchEmail,
  onSearchEmailChange,
  statusFilter,
  onStatusFilterChange,
  planFilter,
  onPlanFilterChange,
  modalityFilter,
  onModalityFilterChange,
  onClearFilters
}: StudentFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Buscar por nome"
          value={searchName}
          onChange={(e) => onSearchNameChange(e.target.value)}
          className="pl-10 bg-input border-border text-foreground placeholder-muted-foreground"
        />
      </div>
      
      <div className="relative flex-1 max-w-sm">
        <Input
          placeholder="Buscar por email"
          value={searchEmail}
          onChange={(e) => onSearchEmailChange(e.target.value)}
          className="bg-input border-border text-foreground placeholder-muted-foreground"
        />
      </div>
      
      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-48 bg-input border-border text-foreground">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <SelectItem value="todos">Todos os status</SelectItem>
          <SelectItem value="ativos">Ativos</SelectItem>
          <SelectItem value="inativos">Inativos</SelectItem>
        </SelectContent>
      </Select>

      <Select value={planFilter} onValueChange={onPlanFilterChange}>
        <SelectTrigger className="w-48 bg-input border-border text-foreground">
          <SelectValue placeholder="Plano" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <SelectItem value="todos">Todos os planos</SelectItem>
          <SelectItem value="Básica">Básica</SelectItem>
          <SelectItem value="Premium">Premium</SelectItem>
        </SelectContent>
      </Select>

      <Select value={modalityFilter} onValueChange={onModalityFilterChange}>
        <SelectTrigger className="w-48 bg-input border-border text-foreground">
          <SelectValue placeholder="Modalidade" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border">
          <SelectItem value="todos">Todas modalidades</SelectItem>
          <SelectItem value="Dieta">Dieta</SelectItem>
          <SelectItem value="Treino">Treino</SelectItem>
          <SelectItem value="Híbrido">Híbrido</SelectItem>
          <SelectItem value="Presencial">Presencial</SelectItem>
        </SelectContent>
      </Select>

      <Button 
        variant="outline" 
        onClick={onClearFilters}
        className="border-success text-success hover:bg-success/10"
      >
        Limpar filtros
      </Button>
    </div>
  );
}