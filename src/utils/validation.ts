import { SignupData } from '@/types/auth';

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isStrongPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validateSignupData = (data: SignupData): Record<string, string> | null => {
  const errors: Record<string, string> = {};
  
  if (!data.email?.trim()) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  if (!data.password?.trim()) {
    errors.password = 'Password is required';
  } else if (!isStrongPassword(data.password)) {
    errors.password = 'Password must be at least 8 characters long with at least one uppercase letter, one lowercase letter, one number, and one special character';
  }
  
  if (!data.firstName?.trim()) {
    errors.firstName = 'First name is required';
  }
  
  if (!data.lastName?.trim()) {
    errors.lastName = 'Last name is required';
  }
  
  if (!data.role) {
    errors.role = 'Role selection is required';
  }
  
  if (!data.country?.trim()) {
    errors.country = 'Country is required';
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
};

export const isDisposableEmail = async (email: string): Promise<boolean> => {
  try {
    const domain = email.split('@')[1];
    // You could implement a check against a list of known disposable email providers
    const disposableDomains = [
      'tempmail.com',
      'throwawaymail.com',
      // Add more disposable email domains
    ];
    return disposableDomains.includes(domain.toLowerCase());
  } catch {
    return false;
  }
};

