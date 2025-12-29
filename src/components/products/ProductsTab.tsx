import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, DollarSign, ShoppingCart, Eye, Edit, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import ProductForm from './ProductForm';
import { useProducts, Product } from '@/hooks/useProducts';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

export default function ProductsTab() {
  const { products, loading, addProduct, updateProduct, deleteProduct } = useProducts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [realSales, setRealSales] = useState<{ revenue: number; units: number }>({ revenue: 0, units: 0 });

  const handleAddProduct = async (newProduct: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'instructor_id'>) => {
    try {
      await addProduct(newProduct);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error adding product:', error);
    }
  };

  const handleUpdateProduct = async (updatedProduct: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'instructor_id'>) => {
    if (!editingProduct) return;
    
    try {
      await updateProduct(editingProduct.id, updatedProduct);
      setEditingProduct(null);
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await deleteProduct(id);
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const publishedProducts = products.filter(p => p.is_published);
  const totalValue = products.reduce((sum, product) => sum + (product.price * (product.stock || 0)), 0);
  const totalStock = products.reduce((sum, product) => sum + (product.stock || 0), 0);

  // Fetch real sales data
  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Buscar vendas reais de produtos
        const { data: salesData, error } = await supabase
          .from('user_purchases')
          .select(`
            products (
              id,
              name,
              price,
              instructor_id
            )
          `)
          .eq('purchase_type', 'product')
          .not('products', 'is', null);

        if (error) throw error;

        // Calcular vendas por produto do instrutor atual
        const relevantSales = (salesData || []).filter(sale => 
          sale.products && sale.products.instructor_id === user.id
        );

        const revenue = relevantSales.reduce((sum, sale) => 
          sum + (sale.products?.price || 0), 0
        );
        const units = relevantSales.length;

        setRealSales({ revenue, units });
      } catch (error) {
        console.error('Error fetching sales data:', error);
      }
    };

    if (products.length > 0) {
      fetchSalesData();
    }
  }, [products]);

  if (loading) {
    return <div className="flex items-center justify-center py-8">Carregando produtos...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
            <p className="text-xs text-muted-foreground">
              {publishedProducts.length} publicados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Valor do estoque
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Total</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock}</div>
            <p className="text-xs text-muted-foreground">
              Unidades disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {realSales.revenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {realSales.units} produtos vendidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Meus Produtos</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingProduct(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto p-2 sm:p-3">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </DialogTitle>
            </DialogHeader>
            <ProductForm
              product={editingProduct}
              onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Products List */}
      {products.length === 0 ? (
        <div className="col-span-full text-center py-12">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum produto cadastrado</h3>
          <p className="text-muted-foreground mb-4">Adicione seu primeiro produto para começar a vender</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Primeiro Produto
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {products.map((product) => (
            <Card key={product.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-base line-clamp-2">
                      {product.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={product.is_published ? "default" : "secondary"}>
                        {product.is_published ? "Publicado" : "Rascunho"}
                      </Badge>
                      <Badge variant="outline">
                        {product.is_digital ? "Digital" : "Físico"}
                      </Badge>
                      {product.category && (
                        <Badge variant="secondary">{product.category}</Badge>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        •••
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => {
                          setEditingProduct(product);
                          setIsDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDeleteProduct(product.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {product.image_url && (
                  <img 
                    src={product.image_url} 
                    alt={product.name}
                    className="w-full h-32 object-cover rounded-md"
                  />
                )}
                
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-primary">
                    R$ {product.price.toFixed(2)}
                  </span>
                  {!product.is_digital && (
                    <span className="text-muted-foreground">
                      Estoque: {product.stock || 0}
                    </span>
                  )}
                </div>
                
                {product.files && product.files.length > 0 && product.is_digital && (
                  <div className="text-xs text-muted-foreground">
                    {product.files.length} arquivo(s) digital(is)
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}