import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Plus, Trash2, Loader2 } from "lucide-react"
import { useUnifiedApp } from "@/contexts/UnifiedAppProvider"
import { supabase } from "@/integrations/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface TrainingLocation {
  id: string
  name: string
  address: string
  type: string
}

export function TrainingLocationsTab() {
  const { user } = useUnifiedApp()
  const [locations, setLocations] = useState<TrainingLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newLocation, setNewLocation] = useState({
    name: "",
    address: "",
    type: "gym" // default type
  })

  useEffect(() => {
    if (user?.id) {
      loadLocations()
    }
  }, [user?.id])

  const loadLocations = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('training_locations')
        .select('*')
        .eq('teacher_id', user.id)
        .order('name')

      if (error) throw error
      setLocations(data || [])
    } catch (error) {
      console.error('Error loading locations:', error)
      toast.error("Erro ao carregar locais de treino")
    } finally {
      setLoading(false)
    }
  }

  const handleAddLocation = async () => {
    if (!user?.id) return
    if (!newLocation.name || !newLocation.address) {
      toast.error("Preencha todos os campos obrigatórios")
      return
    }

    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('training_locations')
        .insert({
          teacher_id: user.id,
          name: newLocation.name,
          address: newLocation.address,
          type: newLocation.type
        })

      if (error) throw error

      toast.success("Local de treino adicionado com sucesso!")
      setNewLocation({ name: "", address: "", type: "gym" })
      setIsModalOpen(false)
      loadLocations()
    } catch (error) {
      console.error('Error adding location:', error)
      toast.error("Erro ao adicionar local de treino")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteLocation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('training_locations')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success("Local removido com sucesso")
      loadLocations()
    } catch (error) {
      console.error('Error deleting location:', error)
      toast.error("Erro ao remover local")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Locais de Treino</CardTitle>
        <CardDescription>
          Gerencie os locais onde você oferece seus serviços
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-border bg-muted/30 p-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-lg">Configure seus locais de treino</h3>
              <p className="text-sm text-muted-foreground">
                Configure seus locais de treino para que sejam exibidos automaticamente durante o agendamento.
                Você pode cadastrar academias, studios, locais ao ar livre e outros espaços onde oferece seus serviços.
              </p>
            </div>
          </div>
        </div>

        {locations.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm sm:text-base">Locais Cadastrados ({locations.length})</h3>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
              {locations.map((location) => (
                <Card key={location.id} className="border-border relative group">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate text-sm sm:text-base">{location.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">{location.address}</p>
                        <p className="text-xs text-muted-foreground mt-1 capitalize">{location.type}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDeleteLocation(location.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="border-t pt-4 sm:pt-6">
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto min-h-[44px]">
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Local
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Local de Treino</DialogTitle>
                <DialogDescription>
                  Preencha os dados do novo local de treino.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-6">
                <div className="grid gap-3">
                  <Label htmlFor="name" className="text-base font-medium">Nome do Local</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Academia Smart Fit"
                    value={newLocation.name}
                    onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                    className="h-12 text-base"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="address" className="text-base font-medium">Endereço</Label>
                  <Input
                    id="address"
                    placeholder="Ex: Rua das Flores, 123"
                    value={newLocation.address}
                    onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                    className="h-12 text-base"
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="type" className="text-base font-medium">Tipo</Label>
                  <Select
                    value={newLocation.type}
                    onValueChange={(value) => setNewLocation({ ...newLocation, type: value })}
                  >
                    <SelectTrigger className="h-12 text-base">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gym">Academia</SelectItem>
                      <SelectItem value="studio">Studio</SelectItem>
                      <SelectItem value="outdoor">Ao Ar Livre</SelectItem>
                      <SelectItem value="home">Em Casa</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter className="gap-3 sm:gap-0">
                <Button variant="outline" onClick={() => setIsModalOpen(false)} className="h-12 px-6 text-base">Cancelar</Button>
                <Button onClick={handleAddLocation} disabled={isSubmitting} className="h-12 px-6 text-base">
                  {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}
