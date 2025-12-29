import React from 'react';
import { cn } from '@/lib/utils';

// FASE 3: Skeleton components otimizados
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rectangular' | 'circular';
  animation?: boolean;
  width?: string | number;
  height?: string | number;
}

export const Skeleton = React.memo(({ 
  className,
  variant = 'rectangular',
  animation = true,
  width,
  height,
  ...props 
}: SkeletonProps) => {
  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded-md',
    circular: 'rounded-full'
  };

  const animationClasses = animation ? 'animate-pulse' : '';
  const styles: React.CSSProperties = {};
  if (width) styles.width = typeof width === 'number' ? `${width}px` : width;
  if (height) styles.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        'bg-muted',
        variantClasses[variant],
        animationClasses,
        className
      )}
      style={styles}
      {...props}
    />
  );
});

export const CardSkeleton = React.memo(() => (
  <div className="bg-card border border-border rounded-lg p-6 space-y-4">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
      <Skeleton variant="circular" className="w-12 h-12" />
    </div>
  </div>
));

export const TableRowSkeleton = React.memo(() => (
  <tr className="border-b border-border">
    <td className="px-4 py-3">
      <div className="space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </td>
    <td className="px-4 py-3">
      <Skeleton className="h-4 w-20" />
    </td>
    <td className="px-4 py-3">
      <Skeleton className="h-4 w-16" />
    </td>
    <td className="px-4 py-3">
      <Skeleton className="h-6 w-18 rounded-full" />
    </td>
    <td className="px-4 py-3">
      <Skeleton className="h-4 w-24" />
    </td>
    <td className="px-4 py-3">
      <div className="flex space-x-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-20" />
      </div>
    </td>
  </tr>
));

export const PaymentSectionSkeleton = React.memo(() => (
  <div className="space-y-6">
    {/* Stats cards skeleton */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>

    {/* Chart skeleton */}
    <div className="bg-card border border-border rounded-lg p-6">
      <Skeleton className="h-6 w-40 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>

    {/* Table skeleton */}
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
));

export const MetricCardSkeleton = React.memo(() => (
  <div className="p-6 border border-border rounded-lg bg-card">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <Skeleton className="h-4 w-[120px]" />
        <Skeleton className="h-8 w-[80px]" />
      </div>
      <Skeleton className="h-8 w-8 rounded" />
    </div>
  </div>
));