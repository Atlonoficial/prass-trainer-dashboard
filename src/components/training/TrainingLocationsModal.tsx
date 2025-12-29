import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTrainingLocations, TrainingLocation } from '@/hooks/useTrainingLocations';
import { Plus, Edit2, MapPin, Home, Dumbbell, TreePine, Video, Building2, ExternalLink } from 'lucide-react';

interface TrainingLocationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const locationTypeIcons = {
  gym: Dumbbell,
  studio: Building2,
  outdoor: TreePine,
  online: Video,
  home: Home,
};

const locationTypeLabels = {
  gym: 'Academia',
  studio: 'Studio',
  outdoor: 'Ao ar livre',
  online: 'Online',
  home: 'Domiciliar',
};

export function TrainingLocationsModal({ open, onOpenChange }: TrainingLocationsModalProps) {
  const { locations, loading, createLocation, updateLocation, toggleLocationStatus } = useTrainingLocations();
  const [editingLocation, setEditingLocation] = useState<TrainingLocation | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'gym' as TrainingLocation['type'],
    address: '',
    description: '',
    google_maps_link: '',
  });

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'gym',
      address: '',
      description: '',
      google_maps_link: '',
    });
    setEditingLocation(null);
    setIsFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingLocation) {
        await updateLocation(editingLocation.id, formData);
      } else {
        await createLocation({
          ...formData,
          is_active: true,
        });
      }
      resetForm();
    } catch (error) {
      console.error('Error saving location:', error);
    }
  };

  const handleEdit = (location: TrainingLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      type: location.type,
      address: location.address || '',
      description: location.description || '',
      google_maps_link: location.google_maps_link || '',
    });
    setIsFormOpen(true);
  };

  const handleToggleStatus = async (location: TrainingLocation) => {
    await toggleLocationStatus(location.id, !location.is_active);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Locais de Treino
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Gerencie os locais onde você oferece seus serviços
            </p>
            <Button 
              onClick={() => setIsFormOpen(true)} 
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Local
            </Button>
          </div>

          {isFormOpen && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingLocation ? 'Editar Local' : 'Novo Local'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome do Local*</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Ex: Academia Central"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Tipo de Local*</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value: TrainingLocation['type']) => 
                          setFormData(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(locationTypeLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              <div className="flex items-center gap-2">
                                {(() => {
                                  const Icon = locationTypeIcons[value as keyof typeof locationTypeIcons];
                                  return <Icon className="h-4 w-4" />;
                                })()}
                                {label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Endereço completo (opcional)"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="google_maps_link">Link do Google Maps</Label>
                    <Input
                      id="google_maps_link"
                      value={formData.google_maps_link}
                      onChange={(e) => setFormData(prev => ({ ...prev, google_maps_link: e.target.value }))}
                      placeholder="https://maps.google.com/... (opcional)"
                      type="url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Informações adicionais sobre o local..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingLocation ? 'Atualizar' : 'Criar Local'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Locais Cadastrados</h3>
            
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando locais...</p>
              </div>
            ) : locations.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum local cadastrado ainda</p>
                <p className="text-sm text-muted-foreground">
                  Crie seu primeiro local para começar
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {locations.map((location) => {
                  const Icon = locationTypeIcons[location.type];
                  return (
                    <Card key={location.id} className={!location.is_active ? 'opacity-60' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Icon className="h-5 w-5 text-primary" />
                            <h4 className="font-semibold">{location.name}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={location.is_active ? "default" : "secondary"}>
                              {location.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(location)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Badge variant="outline">
                            {locationTypeLabels[location.type]}
                          </Badge>
                          
                          {location.address && (
                            <p className="text-sm text-muted-foreground">
                              📍 {location.address}
                            </p>
                          )}

                          {location.google_maps_link && (
                            <div className="flex items-center gap-2">
                              <a
                                href={location.google_maps_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                              >
                                <MapPin className="h-3 w-3" />
                                Ver no Maps
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                          
                          {location.description && (
                            <p className="text-sm text-muted-foreground">
                              {location.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`active-${location.id}`} className="text-sm">
                              Ativo
                            </Label>
                            <Switch
                              id={`active-${location.id}`}
                              checked={location.is_active}
                              onCheckedChange={() => handleToggleStatus(location)}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}