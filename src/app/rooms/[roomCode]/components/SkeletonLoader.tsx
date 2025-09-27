'use client';

interface SkeletonLoaderProps {
  type?: 'card' | 'list' | 'frame' | 'player';
  count?: number;
  className?: string;
}

export default function SkeletonLoader({ 
  type = 'card', 
  count = 1, 
  className = '' 
}: SkeletonLoaderProps) {
  const renderSkeleton = () => {
    switch (type) {
      case 'card':
        return (
          <div className="card border border-base-300 bg-base-200 shadow-md animate-pulse">
            <div className="card-body gap-3">
              <div className="h-6 bg-base-300 rounded w-1/3"></div>
              <div className="h-4 bg-base-300 rounded w-2/3"></div>
              <div className="h-4 bg-base-300 rounded w-1/2"></div>
            </div>
          </div>
        );
      
      case 'list':
        return (
          <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-4 border border-base-300 bg-base-100 rounded-lg animate-pulse">
                <div className="w-10 h-10 bg-base-300 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-base-300 rounded w-1/3"></div>
                  <div className="h-3 bg-base-300 rounded w-1/4"></div>
                </div>
                <div className="w-16 h-6 bg-base-300 rounded"></div>
              </div>
            ))}
          </div>
        );
      
      case 'frame':
        return (
          <div className="card border border-base-300 bg-base-200 shadow-md animate-pulse">
            <div className="card-body gap-4">
              <div className="flex justify-between items-center">
                <div className="h-6 bg-base-300 rounded w-1/4"></div>
                <div className="h-4 bg-base-300 rounded w-1/6"></div>
              </div>
              <div className="aspect-video bg-base-300 rounded-xl"></div>
              <div className="space-y-2">
                <div className="h-4 bg-base-300 rounded w-full"></div>
                <div className="h-10 bg-base-300 rounded"></div>
                <div className="h-8 bg-base-300 rounded w-24"></div>
              </div>
            </div>
          </div>
        );
      
      case 'player':
        return (
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className="rounded-lg border border-base-300 bg-base-100 p-4 animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-5 bg-base-300 rounded w-1/3"></div>
                  <div className="flex gap-2">
                    <div className="w-12 h-5 bg-base-300 rounded"></div>
                    <div className="w-8 h-5 bg-base-300 rounded"></div>
                  </div>
                </div>
                <div className="h-3 bg-base-300 rounded w-1/4"></div>
              </div>
            ))}
          </div>
        );
      
      default:
        return <div className="h-4 bg-base-300 rounded animate-pulse"></div>;
    }
  };

  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>
          {renderSkeleton()}
        </div>
      ))}
    </div>
  );
}
