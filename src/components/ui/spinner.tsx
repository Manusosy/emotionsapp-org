import React from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  text?: string;
}

export const Spinner = ({ size = "md", className, text = "" }: SpinnerProps) => {
  // Return null to render nothing and remove all spinners
  return null;
}; 