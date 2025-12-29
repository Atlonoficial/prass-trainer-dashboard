import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, Check, Package, Star } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { usePurchases } from '@/hooks/usePurchases';
import { useToast } from '@/hooks/use-toast';

export default function StudentProductsTab() {
  const { products, loading: productsLoading } = useProducts();
  const { purchasedItems, checkPurchase, createPurchase, loading: purchasesLoading } = usePurchases();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const { toast } = useToast();

  const publishedProducts = products.filter(product => product.is_published);
  const purchasedProductIds = purchasedItems
    .filter(item => item.type === 'product')
    .map(item => item.id);

  const handlePurchase = async (productId: string) => {
    try {
      setPurchasingId(productId);
      await createPurchase(productId, 'product');
    } catch (error) {
      console.error('Error purchasing product:', error);
    } finally {
      setPurchasingId(null);
    }
  };

  if (productsLoading || purchasesLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (publishedProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">
          Nenhum produto disponível
        </h3>
        <p className="text-muted-foreground">
          Não há produtos publicados no momento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Produtos Disponíveis</p>
              <p className="text-2xl font-bold text-foreground">{publishedProducts.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-success/10 rounded-lg">
              <Check className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Produtos Adquiridos</p>
              <p className="text-2xl font-bold text-foreground">{purchasedProductIds.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-card border-border">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Star className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Valor Total Gasto</p>
              <p className="text-2xl font-bold text-foreground">
                R$ {purchasedItems
                  .filter(item => item.type === 'product')
                  .reduce((sum, item) => sum + item.price, 0)
                  .toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {publishedProducts.map((product) => {
          const isPurchased = purchasedProductIds.includes(product.id);
          const isPurchasing = purchasingId === product.id;

          return (
            <Card key={product.id} className="bg-card border-border overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <img
                  src={product.image_url || 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=250&fit=crop'}
                  alt={product.name}
                  className="w-full h-40 object-cover"
                />
                <div className="absolute top-2 left-2">
                  <Badge className="status-info">
                    R$ {product.price.toFixed(2)}
                  </Badge>
                </div>
                {isPurchased && (
                  <div className="absolute top-2 right-2">
                    <Badge className="status-success">
                      <Check className="w-3 h-3 mr-1" />
                      Adquirido
                    </Badge>
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-foreground flex-1">
                    {product.name}
                  </h3>
                  {product.category && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {product.category}
                    </Badge>
                  )}
                </div>

                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {product.description || 'Sem descrição disponível'}
                </p>

                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    {product.is_digital ? 'Produto Digital' : 'Produto Físico'}
                    {!product.is_digital && product.stock !== undefined && (
                      <span className="block">Estoque: {product.stock}</span>
                    )}
                  </div>

                  {isPurchased ? (
                    <Button variant="outline" disabled className="text-success border-success">
                      <Check className="w-4 h-4 mr-1" />
                      Adquirido
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => handlePurchase(product.id)}
                      disabled={isPurchasing || (!product.is_digital && product.stock === 0)}
                      className="btn-branded"
                    >
                      {isPurchasing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Comprando...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-1" />
                          Comprar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}