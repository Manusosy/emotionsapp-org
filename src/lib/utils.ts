import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getSiteUrl = (): string => {
  const fromWindow = typeof window !== 'undefined' ? window.ENV_CONFIG?.VITE_APP_URL : '';
  const fromEnv = import.meta.env.VITE_APP_URL as string | undefined;
  const fallback = 'https://emotionsapp.org';
  return (fromWindow || fromEnv || fallback).replace(/\/$/, '');
};

export const buildCanonical = (path: string): string => {
  const base = getSiteUrl();
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
};

/**
 * Get a value from environment variables with fallback
 * @param key - Environment variable key
 * @param fallback - Fallback value if not found
 * @returns The environment variable value or fallback
 */
export function getEnvValue(key: string, fallback: string = ''): string {
  // Try window.ENV_CONFIG first (runtime config)
  if (window.ENV_CONFIG?.[key]) {
    return window.ENV_CONFIG[key];
  }
  
  // Then try import.meta.env (build-time config)
  if (import.meta.env[key]) {
    return import.meta.env[key];
  }
  
  // Return fallback if not found
  return fallback;
}

/**
 * Format a date string into a human-readable format
 * @param dateString - Date string to format
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) {
    return 'Invalid date';
  }
  
  // Format options
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
  };
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Safely get environment variable with fallback
 * This handles different sources of environment variables including
 * import.meta.env, window.ENV_CONFIG, and hardcoded fallbacks
 */
export function getEnvVar(key: string, fallback: string = ''): string {
  // Try import.meta.env first (Vite's environment variables)
  if (import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  
  // Try window.ENV_CONFIG (runtime environment variables)
  if (typeof window !== 'undefined' && window.ENV_CONFIG && window.ENV_CONFIG[key]) {
    return window.ENV_CONFIG[key];
  }
  
  // Use fallback
  return fallback;
}
