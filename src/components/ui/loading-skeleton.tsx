import React from 'react';

interface LoadingSkeletonProps {
  count?: number;
  height?: string;
  className?: string;
}

export function LoadingSkeleton({ count = 3, height = "h-4", className = "" }: LoadingSkeletonProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${height} bg-muted/50 rounded animate-pulse`}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );
}

interface StudentSelectionSkeletonProps {
  className?: string;
}

export function StudentSelectionSkeleton({ className = "" }: StudentSelectionSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="h-4 w-24 bg-muted/50 rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-10 bg-muted/50 rounded animate-pulse" />
        <div className="h-10 bg-muted/50 rounded animate-pulse" />
      </div>
    </div>
  );
}