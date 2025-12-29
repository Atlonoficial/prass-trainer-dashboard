import StudentProductsTab from '@/components/products/StudentProductsTab';

export default function StudentProductsSection() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Produtos Disponíveis</h1>
      </div>
      
      <StudentProductsTab />
    </div>
  );
}