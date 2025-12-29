import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUnifiedApp } from "@/contexts/UnifiedAppProvider"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

export function ProfileTab() {
  const { userProfile, loading } = useUnifiedApp()
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp_url: "",
    about: "",
    academy_name: "",
    cnpj: "",
    address: "",
    specialties: [] as string[]
  })

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || "",
        email: userProfile.email || "",
        phone: userProfile.phone || "",
        whatsapp_url: userProfile.whatsapp_url || "",
        about: userProfile.about || "",
        academy_name: userProfile.academy_name || "",
        cnpj: userProfile.cnpj || "",
        address: userProfile.address || "",
        specialties: Array.isArray(userProfile.specialties) ? userProfile.specialties : []
      })
    }
  }, [userProfile])

  const handleSpecialtiesChange = (value: string) => {
    const specialtiesArray = value.split(',').map(s => s.trim()).filter(Boolean)
    setFormData(prev => ({ ...prev, specialties: specialtiesArray }))
  }

  const handleSave = async () => {
    if (!userProfile?.id) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          phone: formData.phone,
          whatsapp_url: formData.whatsapp_url,
          about: formData.about,
          academy_name: formData.academy_name,
          cnpj: formData.cnpj,
          address: formData.address,
          specialties: formData.specialties.join(', '),
          updated_at: new Date().toISOString()
        })
        .eq('id', userProfile.id)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Perfil atualizado com sucesso!"
      })
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: "Erro",
        description: "Falha ao salvar alterações",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading.profile) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações Pessoais</CardTitle>
        <CardDescription>
          Gerencie suas informações pessoais e profissionais
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">Nome Completo</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Seu nome completo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(00) 00000-0000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp (Link ou Número)</Label>
            <Input
              id="whatsapp"
              value={formData.whatsapp_url}
              onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_url: e.target.value }))}
              placeholder="5511999999999"
            />
            <p className="text-[10px] text-muted-foreground">
              Este número será usado para o botão de suporte no App do Aluno.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="about" className="text-sm font-medium">Sobre</Label>
          <Textarea
            id="about"
            value={formData.about}
            onChange={(e) => setFormData(prev => ({ ...prev, about: e.target.value }))}
            placeholder="Conte um pouco sobre sua experiência profissional..."
            rows={3}
            className="min-h-[80px] sm:min-h-[100px] text-sm"
          />
        </div>

        <div className="border-t pt-4 sm:pt-6">
          <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Informações da Academia/Local</h3>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="academy_name" className="text-sm font-medium">Nome da Academia</Label>
              <Input
                id="academy_name"
                value={formData.academy_name}
                onChange={(e) => setFormData(prev => ({ ...prev, academy_name: e.target.value }))}
                placeholder="Nome da sua academia"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj" className="text-sm font-medium">CNPJ</Label>
              <Input
                id="cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                placeholder="00.000.000/0000-00"
              />
            </div>
          </div>

          <div className="space-y-2 mt-3 sm:mt-4 sm:col-span-2">
            <Label htmlFor="address" className="text-sm font-medium">Endereço</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Endereço completo da academia"
              rows={2}
              className="min-h-[60px] sm:min-h-[80px] text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="specialties" className="text-sm font-medium">Especialidades</Label>
          <Input
            id="specialties"
            value={formData.specialties.join(', ')}
            onChange={(e) => handleSpecialtiesChange(e.target.value)}
            placeholder="Musculação, Emagrecimento, Hipertrofia..."
          />
          <p className="text-sm text-muted-foreground">
            Separe as especialidades por vírgula
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto min-h-[44px]">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Alterações'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
