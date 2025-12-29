import React, { createContext, useContext, ReactNode } from 'react';
import { useStudentSync } from '@/hooks/useStudentSync';

// Context para sincronização global de estudantes
const StudentSyncContext = createContext<{
  invalidateStudentCache: (studentId?: string) => void;
  forceSyncAll: () => void;
} | null>(null);

interface StudentSyncProviderProps {
  children: ReactNode;
}

/**
 * Provider global para sincronização de dados de estudantes
 * Centraliza cache management e real-time updates
 */
export function StudentSyncProvider({ children }: StudentSyncProviderProps) {
  const { invalidateStudentCache, forceSyncAll } = useStudentSync();

  return (
    <StudentSyncContext.Provider value={{ invalidateStudentCache, forceSyncAll }}>
      {children}
    </StudentSyncContext.Provider>
  );
}

/**
 * Hook para acessar funcionalidades de sincronização
 */
export function useStudentSyncContext() {
  const context = useContext(StudentSyncContext);
  if (!context) {
    throw new Error('useStudentSyncContext deve ser usado dentro de StudentSyncProvider');
  }
  return context;
}

export default StudentSyncProvider;