import React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

interface LoadingOverlayProps {
  fullscreen?: boolean;
  text?: string;
  variant?: "default" | "primary" | "secondary" | "ghost";
  className?: string;
  spinnerSize?: "sm" | "md" | "lg";
  blur?: boolean;
}

export const LoadingOverlay = ({
  fullscreen = false,
  text = "Loading...",
  variant = "primary",
  className = "",
  spinnerSize = "lg",
  blur = true
}: LoadingOverlayProps) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        fullscreen ? "fixed inset-0" : "absolute inset-0",
        blur ? "backdrop-blur-sm" : "bg-white/80",
        "z-50",
        className
      )}
    >
      <div className="flex flex-col items-center space-y-4">
        <Spinner 
          size={spinnerSize} 
          variant={variant} 
          text={text}
          showText={true}
        />
      </div>
    </div>
  );
}; 