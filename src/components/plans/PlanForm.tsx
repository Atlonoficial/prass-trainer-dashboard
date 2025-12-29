import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlanIconSelector } from "./PlanIconSelector";
import type { BillingInterval, PlanCatalog } from "@/hooks/usePlans";

interface PlanFormProps {
  initial?: Partial<PlanCatalog>;
  onSubmit: (payload: {
    name: string;
    description?: string;
    price: number;
    currency: string;
    interval: BillingInterval;
    features: any[];
    is_active: boolean;
    highlighted: boolean;
    icon: string;
  }) => Promise<void> | void;
  submitting?: boolean;
}

export function PlanForm({ initial, onSubmit, submitting }: PlanFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [price, setPrice] = useState<number>(Number(initial?.price || 0));
  const [currency] = useState(initial?.currency || "BRL");
  const [interval, setInterval] = useState<BillingInterval>((initial?.interval as BillingInterval) || "monthly");
  const [featuresText, setFeaturesText] = useState(
    Array.isArray(initial?.features) ? (initial?.features as any[]).join(", ") : ""
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [highlighted, setHighlighted] = useState(initial?.highlighted ?? false);
  const [selectedIcon, setSelectedIcon] = useState(initial?.icon || "crown");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const features = featuresText
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);
    await onSubmit({
      name,
      description,
      price: Number(price) || 0,
      currency,
      interval,
      features,
      is_active: isActive,
      highlighted,
      icon: selectedIcon,
    });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label>Nome do Plano</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label>Preço</Label>
          <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Moeda</Label>
          <Input value={currency} readOnly />
        </div>
        <div className="space-y-2">
          <Label>Intervalo</Label>
          <Select value={interval} onValueChange={(v) => setInterval(v as BillingInterval)}>
            <SelectTrigger>
              <SelectValue placeholder="Intervalo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
              <SelectItem value="yearly">Anual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <PlanIconSelector selected={selectedIcon} onSelect={setSelectedIcon} />

      <div className="space-y-2">
        <Label>Recursos (separe por vírgula)</Label>
        <Input
          placeholder="Acesso aos treinos, Avaliação mensal, Grupo VIP"
          value={featuresText}
          onChange={(e) => setFeaturesText(e.target.value)}
        />
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Salvando..." : "Salvar Plano"}
        </Button>
      </div>
    </form>
  );
}
