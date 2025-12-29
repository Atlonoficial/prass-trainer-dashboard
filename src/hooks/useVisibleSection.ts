import { useState, useEffect, useCallback } from 'react'

interface SectionConfig {
  id: string
  priority: 'high' | 'medium' | 'low'
  preload?: boolean
}

const SECTION_CONFIGS: SectionConfig[] = [
  { id: 'inicio', priority: 'high', preload: true },
  { id: 'comunicacao', priority: 'high', preload: true },
  { id: 'gestao-alunos', priority: 'high', preload: true },
  { id: 'consultoria', priority: 'medium' },
  { id: 'produtos', priority: 'medium' },
  { id: 'configuracoes', priority: 'low' },
  { id: 'gamificacao', priority: 'low' },
  { id: 'pagamentos', priority: 'medium' },
  { id: 'relatorios', priority: 'low' }
]

export function useVisibleSection() {
  // FASE 1: Persistir seção ativa no localStorage
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dashboard_active_section') || 'inicio'
    }
    return 'inicio'
  })
  
  const [loadedSections, setLoadedSections] = useState(new Set(['inicio']))
  const [isTransitioning, setIsTransitioning] = useState(false)

  const markSectionVisible = useCallback((sectionId: string) => {
    setIsTransitioning(true)
    
    // FASE 1: Salvar no localStorage
    localStorage.setItem('dashboard_active_section', sectionId)
    
    setTimeout(() => {
      setActiveSection(sectionId)
      setLoadedSections(prev => new Set([...prev, sectionId]))
      setIsTransitioning(false)
    }, 100)
  }, [])

  const shouldLoadSection = useCallback((sectionId: string) => {
    return loadedSections.has(sectionId) || activeSection === sectionId
  }, [loadedSections, activeSection])

  const getSectionPriority = useCallback((sectionId: string): 'high' | 'medium' | 'low' => {
    const config = SECTION_CONFIGS.find(s => s.id === sectionId)
    return config?.priority || 'low'
  }, [])

  // FASE 1: Preload high priority sections after initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      const highPrioritySections = SECTION_CONFIGS
        .filter(s => s.preload)
        .map(s => s.id)
      
      setLoadedSections(prev => {
        const newSet = new Set(prev)
        highPrioritySections.forEach(section => newSet.add(section))
        return newSet
      })
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // FASE 1: Restaurar seções carregadas do activeSection salvo
  useEffect(() => {
    if (activeSection && activeSection !== 'inicio') {
      setLoadedSections(prev => new Set([...prev, activeSection]))
    }
  }, [])

  return {
    activeSection,
    loadedSections: Array.from(loadedSections),
    isTransitioning,
    markSectionVisible,
    shouldLoadSection,
    getSectionPriority
  }
}