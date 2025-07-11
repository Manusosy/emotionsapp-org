import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "card" | "avatar" | "text" | "button";
  animate?: boolean;
}

export function Skeleton({
  className,
  variant = "default",
  animate = true,
}: SkeletonProps) {
  const variants = {
    default: "w-full h-4 rounded-md",
    card: "w-full h-40 rounded-xl",
    avatar: "h-12 w-12 rounded-full",
    text: "h-4 w-3/4 rounded-md",
    button: "h-10 w-24 rounded-md"
  };

  return (
    <div
      className={cn(
        "bg-muted animate-pulse",
        variants[variant],
        animate && "animate-pulse",
        className
      )}
    />
  );
}

interface SkeletonListProps extends SkeletonProps {
  count?: number;
  gap?: number;
}

export function SkeletonList({
  count = 3,
  gap = 4,
  ...props
}: SkeletonListProps) {
  return (
    <div className={cn("space-y-" + gap)}>
      {Array(count)
        .fill(null)
        .map((_, i) => (
          <Skeleton key={i} {...props} />
        ))}
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
  hasImage?: boolean;
  hasFooter?: boolean;
}

export function SkeletonCard({
  className,
  hasImage = true,
  hasFooter = true,
}: SkeletonCardProps) {
  return (
    <div className={cn("rounded-xl border p-4", className)}>
      <div className="space-y-4">
        {hasImage && <Skeleton variant="card" />}
        <div className="space-y-2">
          <Skeleton variant="text" className="w-1/2" />
          <Skeleton variant="text" className="w-3/4" />
        </div>
        {hasFooter && (
          <div className="flex items-center justify-between pt-4">
            <Skeleton variant="avatar" className="h-8 w-8" />
            <Skeleton variant="button" className="w-20" />
          </div>
        )}
      </div>
    </div>
  );
}
