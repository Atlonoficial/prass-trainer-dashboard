import { GraduationCap, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UserTypeSelectorProps {
  onSelect: (type: 'teacher' | 'student') => void
}

export function UserTypeSelector({ onSelect }: UserTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-center mb-6">
        Como você vai usar o Prass Trainer?
      </h2>

      <Button
        variant="outline"
        className="w-full h-auto py-6 px-6 flex flex-col items-center gap-3 hover:bg-primary/10 hover:border-primary transition-all"
        onClick={() => onSelect('teacher')}
      >
        <GraduationCap className="w-12 h-12 text-primary" />
        <div className="text-center">
          <div className="font-semibold text-lg">Sou Professor/Personal</div>
          <div className="text-sm text-muted-foreground">
            Quero gerenciar meus alunos e treinos
          </div>
        </div>
      </Button>

      <Button
        variant="outline"
        className="w-full h-auto py-6 px-6 flex flex-col items-center gap-3 hover:bg-primary/10 hover:border-primary transition-all"
        onClick={() => onSelect('student')}
      >
        <Dumbbell className="w-12 h-12 text-primary" />
        <div className="text-center">
          <div className="font-semibold text-lg">Sou Aluno</div>
          <div className="text-sm text-muted-foreground">
            Quero acessar meus treinos e acompanhar meu progresso
          </div>
        </div>
      </Button>
    </div>
  )
}
