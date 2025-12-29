import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft } from 'lucide-react'

interface StudentSetupProps {
  onSubmit: (data: any) => void
  onBack: () => void
  isSubmitting: boolean
}

export function StudentSetup({ onSubmit, onBack, isSubmitting }: StudentSetupProps) {
  const [formData, setFormData] = useState({
    name: '',
    objectives: '',
    bio: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🎒 [StudentSetup] Submitting student data:', {
      name: formData.name.trim(),
      objectives: formData.objectives.trim() || null,
      bio: formData.bio.trim() || null
    })
    
    onSubmit({
      name: formData.name.trim(),
      objectives: formData.objectives.trim() || null,
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
        <h2 className="text-xl font-semibold mb-2">Configuração de Aluno</h2>
        <p className="text-sm text-muted-foreground">
          Complete seus dados para começar
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
          <Label htmlFor="objectives">Objetivos</Label>
          <Input
            id="objectives"
            value={formData.objectives}
            onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
            placeholder="Ex: Ganhar massa muscular, perder peso"
          />
        </div>

        <div>
          <Label htmlFor="bio">Sobre Você</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Conte um pouco sobre você e sua experiência com atividades físicas"
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
