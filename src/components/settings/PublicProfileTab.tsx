import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useUnifiedApp } from "@/contexts/UnifiedAppProvider"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Upload, X } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"

export function PublicProfileTab() {
  const { user } = useUnifiedApp()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  const [formData, setFormData] = useState({
    professional_title: "",
    profile_image_url: "",
    banner_image_url: "",
    bio: "",
    instagram: "",
    facebook: "",
    youtube: "",
    whatsapp: "",
    is_visible: true
  })

  useEffect(() => {
    if (user?.id) {
      loadPublicProfile()
    }
  }, [user?.id])

  const loadPublicProfile = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (data) {
        // Handle specialties which might be string or array depending on DB schema vs Types
        let specialtiesStr = "";
        if (Array.isArray(data.specialties)) {
          specialtiesStr = data.specialties.join(', ');
        } else if (typeof data.specialties === 'string') {
          specialtiesStr = data.specialties;
        }

        setFormData({
          professional_title: specialtiesStr,
          profile_image_url: data.avatar_url || "",
          banner_image_url: "", // banner_url not in profiles type
          bio: data.bio || "",
          instagram: data.instagram_url || "",
          facebook: data.facebook_url || "",
          youtube: data.youtube_url || "",
          whatsapp: data.whatsapp_url || "",
          is_visible: true
        })
      }
    } catch (error) {
      console.error('Error loading public profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (file: File, type: 'profile' | 'banner') => {
    if (!user?.id) return

    // Only allow profile image upload for now as banner_url is missing in profiles
    if (type === 'banner') {
      toast({
        title: "Indisponível",
        description: "Upload de banner temporariamente indisponível.",
        variant: "destructive"
      })
      return;
    }

    const bucket = 'avatars'
    const setUploading = setUploadingProfile

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

      setFormData(prev => ({ ...prev, profile_image_url: publicUrl }))

      toast({
        title: "Sucesso",
        description: "Foto de perfil enviada com sucesso!"
      })
    } catch (error) {
      console.error('Error uploading image:', error)
      toast({
        title: "Erro",
        description: "Falha ao enviar imagem",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = (type: 'profile' | 'banner') => {
    if (type === 'banner') return;
    setFormData(prev => ({ ...prev, profile_image_url: "" }))
  }

  const handleSave = async () => {
    if (!user?.id) return

    setSaving(true)
    try {
      // Convert comma separated string back to what DB expects? 
      // If DB expects string, we send string. If array, we send array.
      // Error said: "Type 'string[]' is not assignable to type 'string'". So DB expects string.
      const specialtiesStr = formData.professional_title;

      const updates = {
        specialties: specialtiesStr, // Sending string as requested by type
        avatar_url: formData.profile_image_url,
        // banner_url: formData.banner_image_url, // Removed
        bio: formData.bio,
        instagram_url: formData.instagram,
        facebook_url: formData.facebook,
        youtube_url: formData.youtube,
        whatsapp_url: formData.whatsapp,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Perfil público atualizado com sucesso!"
      })
    } catch (error) {
      console.error('Error saving public profile:', error)
      toast({
        title: "Erro",
        description: "Falha ao salvar perfil público",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil Público</CardTitle>
        <CardDescription>
          Configure como seu perfil aparece para os alunos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        <div className="space-y-2">
          <Label htmlFor="professional_title" className="text-sm font-medium">Título Profissional</Label>
          <Input
            id="professional_title"
            value={formData.professional_title}
            onChange={(e) => setFormData(prev => ({ ...prev, professional_title: e.target.value }))}
            placeholder="Personal Trainer, Nutricionista, etc."
          />
        </div>

        <div className="space-y-3 sm:space-y-4">
          <div>
            <Label className="text-sm font-medium">Foto de Perfil</Label>
            <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
              {formData.profile_image_url ? (
                <div className="relative">
                  <img
                    src={formData.profile_image_url}
                    alt="Profile"
                    className="w-28 h-28 sm:w-24 sm:h-24 rounded-full object-cover"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-7 w-7 sm:h-6 sm:w-6 rounded-full"
                    onClick={() => handleRemoveImage('profile')}
                  >
                    <X className="h-4 w-4 sm:h-3 sm:w-3" />
                  </Button>
                </div>
              ) : (
                <div className="w-28 h-28 sm:w-24 sm:h-24 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="h-10 w-10 sm:h-8 sm:w-8 text-muted-foreground" />
                </div>
              )}
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file, 'profile')
                  }}
                  disabled={uploadingProfile}
                  className="max-w-xs"
                />
                {uploadingProfile && <p className="text-sm text-muted-foreground mt-1">Enviando...</p>}
              </div>
            </div>
          </div>

          <div>
            <Label className="text-sm font-medium">Banner / Imagem de Capa</Label>
            <p className="text-xs sm:text-sm text-muted-foreground mb-2">
              Para melhor experiência mobile, use imagens otimizadas (1200x400px recomendado)
            </p>
            <div className="mt-2">
              {formData.banner_image_url ? (
                <div className="relative">
                  <img
                    src={formData.banner_image_url}
                    alt="Banner"
                    className="w-full h-48 rounded-lg object-cover"
                  />
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={() => handleRemoveImage('banner')}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="w-full h-48 rounded-lg bg-muted flex items-center justify-center">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleImageUpload(file, 'banner')
                }}
                disabled={uploadingBanner}
                className="mt-2"
              />
              {uploadingBanner && <p className="text-sm text-muted-foreground mt-1">Enviando...</p>}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio" className="text-sm font-medium">Biografia</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            placeholder="Personal trainer certificado com 10+ anos de experiência..."
            rows={4}
            className="min-h-[100px] sm:min-h-[120px] text-sm"
          />
        </div>

        <div className="border-t pt-4 sm:pt-6">
          <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base">Redes Sociais</h3>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="instagram" className="text-sm font-medium">Instagram</Label>
              <Input
                id="instagram"
                value={formData.instagram}
                onChange={(e) => setFormData(prev => ({ ...prev, instagram: e.target.value }))}
                placeholder="https://instagram.com/seu-perfil"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebook" className="text-sm font-medium">Facebook</Label>
              <Input
                id="facebook"
                value={formData.facebook}
                onChange={(e) => setFormData(prev => ({ ...prev, facebook: e.target.value }))}
                placeholder="https://facebook.com/seu-perfil"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube" className="text-sm font-medium">YouTube</Label>
              <Input
                id="youtube"
                value={formData.youtube}
                onChange={(e) => setFormData(prev => ({ ...prev, youtube: e.target.value }))}
                placeholder="https://youtube.com/@seu-canal"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="text-sm font-medium">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t pt-4 sm:pt-6">
          <div className="space-y-1 flex-1">
            <Label htmlFor="is_visible" className="text-sm font-medium cursor-pointer">Mostrar perfil para alunos</Label>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Quando ativado, seu perfil será visível para os alunos no aplicativo
            </p>
          </div>
          <Switch
            id="is_visible"
            checked={formData.is_visible}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_visible: checked }))}
            className="flex-shrink-0"
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto min-h-[44px]">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Perfil Público'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
