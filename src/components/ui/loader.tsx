import React from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

interface LoaderProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const Loader = ({ className, size = "md" }: LoaderProps) => {
  return <Spinner className={cn(className)} size={size} />;
}; 