// Lazy Loading Hook for Dashboard Sections
import { useState, useEffect, useRef, useCallback } from 'react'

export function useLazyLoading(threshold = 0.1) {
  const [isVisible, setIsVisible] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const elementRef = useRef<HTMLElement>(null)

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries
    if (entry.isIntersecting && !hasLoaded) {
      setIsVisible(true)
      setHasLoaded(true)
    }
  }, [hasLoaded])

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin: '50px' // Start loading 50px before element is visible
    })

    observer.observe(element)

    return () => {
      observer.unobserve(element)
    }
  }, [handleIntersection, threshold])

  return {
    elementRef,
    isVisible,
    hasLoaded,
    shouldLoad: isVisible || hasLoaded
  }
}

// Section-specific lazy loading with priorities
export function useSectionVisibility() {
  const [activeSection, setActiveSection] = useState<string>('overview')
  const [loadedSections, setLoadedSections] = useState(new Set(['overview']))

  const markSectionActive = useCallback((section: string) => {
    setActiveSection(section)
    setLoadedSections(prev => new Set([...prev, section]))
  }, [])

  const shouldLoadSection = useCallback((section: string) => {
    return loadedSections.has(section) || activeSection === section
  }, [loadedSections, activeSection])

  // Preload high-priority sections
  useEffect(() => {
    const highPrioritySections = ['comunicacao', 'estudantes']
    const timer = setTimeout(() => {
      setLoadedSections(prev => {
        const newSet = new Set(prev)
        highPrioritySections.forEach(section => newSet.add(section))
        return newSet
      })
    }, 2000) // Preload after 2 seconds

    return () => clearTimeout(timer)
  }, [])

  return {
    activeSection,
    markSectionActive,
    shouldLoadSection,
    loadedSections: Array.from(loadedSections)
  }
}