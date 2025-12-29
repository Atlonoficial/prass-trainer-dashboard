import React from 'react';
import { StudentPaymentPortal } from '@/components/students/StudentPaymentPortal';
import { SubscriptionAutoRenewal } from '@/components/students/SubscriptionAutoRenewal';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function StudentPayments() {
  const { subscriptions, loading } = useSubscriptionStatus()
  const activeSubscription = subscriptions.find(sub => sub.status === 'active')

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Meus Pagamentos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie suas assinaturas e compre planos de consultoria
          </p>
        </div>
        
        <Tabs defaultValue="payments" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="payments">
            <StudentPaymentPortal />
          </TabsContent>

          <TabsContent value="settings">
            {!loading && activeSubscription ? (
              <SubscriptionAutoRenewal 
                subscription={activeSubscription}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma assinatura ativa encontrada
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}