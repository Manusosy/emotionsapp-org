import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  variant?: "default" | "primary" | "secondary" | "ghost" | "skeleton";
  className?: string;
  text?: string;
  showText?: boolean;
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8"
};

const variantClasses = {
  default: "text-muted-foreground",
  primary: "text-primary",
  secondary: "text-secondary",
  ghost: "text-gray-400",
  skeleton: "bg-gray-200"
};

export const Spinner = ({ 
  size = "md", 
  variant = "primary", 
  className = "", 
  text = "Loading...",
  showText = true 
}: SpinnerProps) => {
  if (variant === "skeleton") {
    return (
      <div className="flex items-center space-x-4">
        <div className={cn(
          "animate-pulse rounded-full",
          sizeClasses[size],
          variantClasses[variant],
          className
        )} />
        {showText && (
          <div className="animate-pulse h-4 bg-gray-200 rounded w-24" />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Loader2 className={cn(
        "animate-spin",
        sizeClasses[size],
        variantClasses[variant],
        className
      )} />
      {showText && (
        <span className={cn(
          "text-sm font-medium",
          variantClasses[variant]
        )}>
          {text}
        </span>
      )}
    </div>
  );
}; 