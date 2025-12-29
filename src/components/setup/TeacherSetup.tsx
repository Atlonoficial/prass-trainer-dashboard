import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'

interface TeacherSetupProps {
  onSubmit: (data: any) => void
  onBack: () => void
  isSubmitting: boolean
}

export function TeacherSetup({ onSubmit, onBack, isSubmitting }: TeacherSetupProps) {
  const [formData, setFormData] = useState({
    name: '',
    academy_name: '',
    specialties: '',
    bio: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🎓 [TeacherSetup] Submitting teacher data:', {
      name: formData.name.trim(),
      academy_name: formData.academy_name.trim() || null,
      specialties: formData.specialties.trim() || null,
      bio: formData.bio.trim() || null
    })
    
    onSubmit({
      name: formData.name.trim(),
      academy_name: formData.academy_name.trim() || null,
      specialties: formData.specialties.trim() || null,
      bio: formData.bio.trim() || null
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Voltar
      </Button>

      <div>
        <h2 className="text-xl font-semibold mb-2">Configuração de Professor</h2>
        <p className="text-sm text-muted-foreground">
          Complete seus dados profissionais
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nome Completo *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Seu nome completo"
            required
          />
        </div>

        <div>
          <Label htmlFor="academy">Nome da Academia/Estúdio</Label>
          <Input
            id="academy"
            value={formData.academy_name}
            onChange={(e) => setFormData({ ...formData, academy_name: e.target.value })}
            placeholder="Nome do seu local de trabalho"
          />
        </div>

        <div>
          <Label htmlFor="specialties">Especialidades</Label>
          <Input
            id="specialties"
            value={formData.specialties}
            onChange={(e) => setFormData({ ...formData, specialties: e.target.value })}
            placeholder="Ex: Musculação, Crossfit, Pilates"
          />
        </div>

        <div>
          <Label htmlFor="bio">Sobre Você</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Conte um pouco sobre sua experiência e objetivos"
            rows={4}
          />
        </div>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || !formData.name}
      >
        {isSubmitting ? 'Configurando...' : 'Finalizar Configuração'}
      </Button>
    </form>
  )
}
