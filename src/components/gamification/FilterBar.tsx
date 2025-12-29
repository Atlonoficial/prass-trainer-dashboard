import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FilterBarProps {
  activeTab: string;
  filters: any;
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  resultCount: number;
  totalCount: number;
}

export function FilterBar({ 
  activeTab, 
  filters, 
  onFiltersChange, 
  onClearFilters, 
  resultCount, 
  totalCount 
}: FilterBarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const removeFilter = (key: string) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const getActiveFiltersCount = () => {
    return Object.keys(filters).filter(key => {
      const value = filters[key];
      return value !== undefined && value !== '' && value !== null && 
             (!Array.isArray(value) || value.length > 0);
    }).length;
  };

  const renderStudentFilters = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <Label className="text-sm text-muted-foreground">Buscar por nome</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Nome do aluno..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div>
        <Label className="text-sm text-muted-foreground">Faixa de nível</Label>
        <Select value={filters.levelRange || 'all'} onValueChange={(value) => updateFilter('levelRange', value === 'all' ? undefined : value)}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os níveis" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            <SelectItem value="1-5">Níveis 1-5</SelectItem>
            <SelectItem value="6-10">Níveis 6-10</SelectItem>
            <SelectItem value="11-15">Níveis 11-15</SelectItem>
            <SelectItem value="16+">Nível 16+</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm text-muted-foreground">Pontos mínimos: {filters.minPoints || 0}</Label>
        <Slider
          value={[filters.minPoints || 0]}
          onValueChange={(value) => updateFilter('minPoints', value[0])}
          max={2000}
          step={50}
          className="mt-2"
        />
      </div>

      <div>
        <Label className="text-sm text-muted-foreground">Ordenar por</Label>
        <Select value={filters.sortBy || 'points'} onValueChange={(value) => updateFilter('sortBy', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="points">Pontos</SelectItem>
            <SelectItem value="level">Nível</SelectItem>
            <SelectItem value="streak">Streak</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderAchievementFilters = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <Label className="text-sm text-muted-foreground">Buscar conquista</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Nome da conquista..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div>
        <Label className="text-sm text-muted-foreground">Raridade</Label>
        <ToggleGroup 
          type="multiple" 
          value={filters.rarity || []} 
          onValueChange={(value) => updateFilter('rarity', value)}
          className="justify-start"
        >
          <ToggleGroupItem value="bronze" variant="outline" size="sm">Bronze</ToggleGroupItem>
          <ToggleGroupItem value="silver" variant="outline" size="sm">Prata</ToggleGroupItem>
          <ToggleGroupItem value="gold" variant="outline" size="sm">Ouro</ToggleGroupItem>
          <ToggleGroupItem value="platinum" variant="outline" size="sm">Platina</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div>
        <Label className="text-sm text-muted-foreground">Tipo de condição</Label>
        <Select value={filters.conditionType || 'all'} onValueChange={(value) => updateFilter('conditionType', value === 'all' ? undefined : value)}>
          <SelectTrigger>
            <SelectValue placeholder="Todos os tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="training_count">Contagem de Treinos</SelectItem>
            <SelectItem value="points_earned">Pontos Conquistados</SelectItem>
            <SelectItem value="streak_days">Dias Consecutivos</SelectItem>
            <SelectItem value="weight_loss">Perda de Peso</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm text-muted-foreground">Faixa de pontos: {filters.minPointsReward || 0} - {filters.maxPointsReward || 500}</Label>
        <Slider
          value={[filters.minPointsReward || 0, filters.maxPointsReward || 500]}
          onValueChange={(value) => {
            updateFilter('minPointsReward', value[0]);
            updateFilter('maxPointsReward', value[1]);
          }}
          max={500}
          step={10}
          className="mt-2"
        />
      </div>
    </div>
  );

  const renderRewardFilters = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <Label className="text-sm text-muted-foreground">Buscar recompensa</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Nome da recompensa..."
            value={filters.search || ''}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div>
        <Label className="text-sm text-muted-foreground">Status do estoque</Label>
        <ToggleGroup 
          type="multiple" 
          value={filters.stockStatus || []} 
          onValueChange={(value) => updateFilter('stockStatus', value)}
          className="justify-start"
        >
          <ToggleGroupItem value="available" variant="outline" size="sm">Disponível</ToggleGroupItem>
          <ToggleGroupItem value="low" variant="outline" size="sm">Baixo</ToggleGroupItem>
          <ToggleGroupItem value="out" variant="outline" size="sm">Esgotado</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div>
        <Label className="text-sm text-muted-foreground">Custo: {filters.minCost || 0} - {filters.maxCost || 2000} pts</Label>
        <Slider
          value={[filters.minCost || 0, filters.maxCost || 2000]}
          onValueChange={(value) => {
            updateFilter('minCost', value[0]);
            updateFilter('maxCost', value[1]);
          }}
          max={2000}
          step={50}
          className="mt-2"
        />
      </div>

      <div>
        <Label className="text-sm text-muted-foreground">Ordenar por</Label>
        <Select value={filters.sortBy || 'cost'} onValueChange={(value) => updateFilter('sortBy', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="cost">Custo</SelectItem>
            <SelectItem value="stock">Estoque</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
            <SelectItem value="recent">Mais Recentes</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  const renderActiveFilters = () => {
    const activeFilters = Object.entries(filters).filter(([key, value]) => {
      return value !== undefined && value !== '' && value !== null && 
             (!Array.isArray(value) || value.length > 0);
    });

    if (activeFilters.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-2 mb-4">
        {activeFilters.map(([key, value]) => {
          let displayText = '';
          
          if (key === 'search') displayText = `"${value}"`;
          else if (key === 'levelRange') displayText = `Nível ${value}`;
          else if (key === 'minPoints') displayText = `≥${value} pts`;
          else if (key === 'sortBy') displayText = `Por ${value}`;
          else if (key === 'rarity' && Array.isArray(value)) displayText = value.join(', ');
          else if (key === 'conditionType') displayText = `${value}`;
          else if (key === 'minPointsReward') displayText = `≥${value} pts`;
          else if (key === 'maxPointsReward') displayText = `≤${value} pts`;
          else if (key === 'stockStatus' && Array.isArray(value)) displayText = value.join(', ');
          else if (key === 'minCost') displayText = `≥${value} pts`;
          else if (key === 'maxCost') displayText = `≤${value} pts`;
          else displayText = `${value}`;

          return (
            <Badge key={key} variant="secondary" className="flex items-center gap-1">
              <span className="text-xs">{displayText}</span>
              <X 
                className="w-3 h-3 cursor-pointer hover:text-destructive" 
                onClick={() => removeFilter(key)}
              />
            </Badge>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Filtros
                {getActiveFiltersCount() > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {getActiveFiltersCount()}
                  </Badge>
                )}
              </Button>
            </CollapsibleTrigger>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Mostrando {resultCount} de {totalCount} itens</span>
              {getActiveFiltersCount() > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onClearFilters}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpar filtros
                </Button>
              )}
            </div>

            <CollapsibleContent className="space-y-4 mt-4">
              {renderActiveFilters()}
              
              <div className="space-y-4">
                {activeTab === 'students' && renderStudentFilters()}
                {activeTab === 'achievements' && renderAchievementFilters()}
                {activeTab === 'rewards' && renderRewardFilters()}
                
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </Card>
  );
}