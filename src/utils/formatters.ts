/**
 * Format a number as currency with appropriate currency symbol
 */
export const formatCurrency = (amount: number, currencyCode = 'USD'): string => {
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0 
  }).format(amount);
};

/**
 * Slugify a name or string for URLs
 * Converts a string to lowercase, removes accents, replaces spaces with hyphens, and removes special characters
 */
export const slugify = (text: string): string => {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w-]+/g, '') // Remove all non-word chars
    .replace(/--+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text
}; 