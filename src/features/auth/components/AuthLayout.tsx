import { ReactNode } from "react";

interface AuthLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  formType?: 'patient' | 'mentor';
}

const AuthLayout = ({ children, title, subtitle, formType }: AuthLayoutProps) => {
  // Determine background gradient based on form type
  const getBgGradient = () => {
    switch (formType) {
      case 'mentor':
        return 'from-indigo-50 via-white to-purple-50';
      case 'patient':
      default:
        return 'from-brand-purple-light via-white to-brand-blue-light';
    }
  };
  
  return (
    <div className={`min-h-screen bg-gradient-to-br ${getBgGradient()}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-sm p-8">
          {(title || subtitle) && (
            <div className="mb-6 text-center">
              {title && <h1 className="text-2xl font-bold">{title}</h1>}
              {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
            </div>
          )}
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
