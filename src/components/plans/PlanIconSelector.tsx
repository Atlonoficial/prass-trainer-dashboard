import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Crown, Star, Diamond, Trophy, Gem } from "lucide-react";

const PLAN_ICONS = [
  { id: 'crown', icon: Crown, label: 'Coroa', color: 'text-yellow-500' },
  { id: 'star', icon: Star, label: 'Estrela', color: 'text-blue-500' },
  { id: 'diamond', icon: Diamond, label: 'Diamante', color: 'text-purple-500' },
  { id: 'trophy', icon: Trophy, label: 'Troféu', color: 'text-orange-500' },
  { id: 'gem', icon: Gem, label: 'Gema', color: 'text-emerald-500' },
];

interface PlanIconSelectorProps {
  selected: string;
  onSelect: (iconId: string) => void;
}

export function PlanIconSelector({ selected, onSelect }: PlanIconSelectorProps) {
  return (
    <div className="space-y-3">
      <Label>Ícone do Plano</Label>
      <div className="grid grid-cols-5 gap-3">
        {PLAN_ICONS.map(({ id, icon: Icon, label, color }) => (
          <button
            key={id}
            type="button"
            className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all hover:bg-muted/50 ${
              selected === id 
                ? 'border-primary bg-primary/10' 
                : 'border-border'
            }`}
            onClick={() => onSelect(id)}
          >
            <Icon className={`h-6 w-6 ${color}`} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function getPlanIcon(iconId: string) {
  const planIcon = PLAN_ICONS.find(p => p.id === iconId);
  return planIcon || PLAN_ICONS[0];
}