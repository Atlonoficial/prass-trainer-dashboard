import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getCurrentTenantId } from '@/utils/tenantHelpers';

interface TenantContextType {
  tenantId: string | null;
  loading: boolean;
  refreshTenantId: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const refreshTenantId = async () => {
    if (!user?.id) {
      setTenantId(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const id = await getCurrentTenantId(user.id);
      setTenantId(id);
    } catch (error) {
      console.error('❌ [TenantContext] Error fetching tenant_id:', error);
      setTenantId(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshTenantId();
  }, [user?.id]);

  return (
    <TenantContext.Provider value={{ tenantId, loading, refreshTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenantContext must be used within a TenantProvider');
  }
  return context;
}
