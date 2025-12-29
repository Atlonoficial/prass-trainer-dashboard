import { useState, useCallback, useRef, useEffect } from 'react'

type LoadingState = {
  auth: boolean
  profile: boolean
  students: boolean
  payments: boolean
  sync: boolean
}

type LoadingKey = keyof LoadingState

// Global loading state shared across the app
const globalLoadingState: LoadingState = {
  auth: false,
  profile: false,
  students: false,
  payments: false,
  sync: false
}

const listeners = new Set<(state: LoadingState) => void>()

function notifyListeners() {
  listeners.forEach(listener => listener({ ...globalLoadingState }))
}

export function useGlobalLoading() {
  const [localState, setLocalState] = useState<LoadingState>({ ...globalLoadingState })
  const listenerRef = useRef<(state: LoadingState) => void>()

  useEffect(() => {
    listenerRef.current = setLocalState
    listeners.add(listenerRef.current)
    
    return () => {
      if (listenerRef.current) {
        listeners.delete(listenerRef.current)
      }
    }
  }, [])

  const setLoading = useCallback((key: LoadingKey, value: boolean) => {
    globalLoadingState[key] = value
    notifyListeners()
  }, [])

  const setMultipleLoading = useCallback((updates: Partial<LoadingState>) => {
    Object.assign(globalLoadingState, updates)
    notifyListeners()
  }, [])

  const isAnyLoading = localState.auth || localState.profile || localState.students || localState.payments || localState.sync

  return {
    loading: localState,
    isAnyLoading,
    setLoading,
    setMultipleLoading
  }
}