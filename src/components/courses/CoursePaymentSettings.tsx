import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CreditCard, Settings2, Banknote, CheckCircle, X } from 'lucide-react';
import { useGlobalPaymentSettings } from '@/hooks/useGlobalPaymentSettings';
import { useToast } from '@/hooks/use-toast';
import { Course } from '@/hooks/useCourses';

interface CoursePaymentSettingsProps {
  course: Course;
  onUpdate: (updates: Partial<Course>) => void;
}

export default function CoursePaymentSettings({ course, onUpdate }: CoursePaymentSettingsProps) {
  const [paymentEnabled, setPaymentEnabled] = useState(!course.is_free);
  const [coursePrice, setCoursePrice] = useState(course.price || 0);
  
  const { settings, loading } = useGlobalPaymentSettings();
  const { toast } = useToast();

  const handlePaymentToggle = (enabled: boolean) => {
    setPaymentEnabled(enabled);
    onUpdate({
      is_free: !enabled,
      price: enabled ? coursePrice : 0
    });
  };

  const handlePriceChange = (price: number) => {
    setCoursePrice(price);
    onUpdate({ price });
  };

  const getGatewayIcon = (gateway?: string) => {
    switch (gateway) {
      case 'mercado_pago':
        return <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">MP</div>;
      case 'pagbank':
        return <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center text-white text-xs font-bold">PB</div>;
      case 'stripe':
        return <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center text-white text-xs font-bold">ST</div>;
      default:
        return <CreditCard className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const getGatewayName = (gateway?: string) => {
    switch (gateway) {
      case 'mercado_pago': return 'Mercado Pago';
      case 'pagbank': return 'PagBank';
      case 'stripe': return 'Stripe';
      default: return 'Gateway não configurado';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Carregando configurações...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gateway Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Gateway de Pagamento Configurado
          </CardTitle>
        </CardHeader>
        <CardContent>
          {settings ? (
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                {getGatewayIcon(settings.gateway_type)}
                <div>
                  <p className="font-medium">{getGatewayName(settings.gateway_type)}</p>
                  <p className="text-sm text-muted-foreground">
                    Status: <span className={settings.is_active ? 'text-green-600' : 'text-red-600'}>
                      {settings.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </p>
                </div>
              </div>
              <Badge variant={settings.is_active ? 'default' : 'secondary'}>
                {settings.is_active ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Configurado
                  </>
                ) : (
                  <>
                    <X className="w-3 h-3 mr-1" />
                    Inativo
                  </>
                )}
              </Badge>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 border border-dashed border-muted-foreground/50 rounded-lg">
              <AlertCircle className="w-8 h-8 text-amber-500" />
              <div>
                <p className="font-medium">Nenhum gateway configurado</p>
                <p className="text-sm text-muted-foreground">
                  Configure um gateway de pagamento na seção "Configurações de Pagamento" para vender este curso.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Course Payment Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5" />
            Configurações do Curso
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Payment Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base font-medium">Vendas Habilitadas</Label>
              <p className="text-sm text-muted-foreground">
                Ative para permitir que alunos comprem este curso
              </p>
            </div>
            <Switch
              checked={paymentEnabled}
              onCheckedChange={handlePaymentToggle}
              disabled={!settings?.is_active}
            />
          </div>

          {/* Price Configuration */}
          {paymentEnabled && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Preço do Curso (R$)</Label>
                <Input
                  type="number"
                  value={coursePrice}
                  onChange={(e) => handlePriceChange(Number(e.target.value))}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground">
                  Este será o preço cobrado dos alunos para acessar o curso
                </p>
              </div>

              {/* Preview */}
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Preview do Pagamento:</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Curso: {course.title}</span>
                  <span className="font-bold text-lg">R$ {coursePrice.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Gateway utilizado: {getGatewayName(settings?.gateway_type)}
                </p>
              </div>
            </div>
          )}

          {/* Course is Free */}
          {!paymentEnabled && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Curso Gratuito</span>
              </div>
              <p className="text-sm text-green-700 mt-1">
                Este curso será disponibilizado gratuitamente para todos os alunos
              </p>
            </div>
          )}

          {/* Warning for no gateway */}
          {paymentEnabled && !settings?.is_active && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span className="font-medium text-amber-800">Gateway Necessário</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                Para habilitar vendas, configure um gateway de pagamento ativo primeiro.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sales Analytics Preview */}
      {paymentEnabled && settings?.is_active && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="w-4 h-4" />
              Potencial de Vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">R$ {(coursePrice * (course.enrolled_users?.length || 1)).toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Receita potencial atual</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{course.enrolled_users?.length || 0}</p>
                <p className="text-xs text-muted-foreground">Alunos interessados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}