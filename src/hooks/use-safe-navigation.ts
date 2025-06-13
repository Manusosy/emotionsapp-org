import { useNavigate } from "react-router-dom";

export const useSafeNavigation = () => {
  const navigate = useNavigate();

  const safeNavigate = (path: string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation(); // Stop event bubbling to prevent interference
    }
    
    console.log(`SafeNavigate: Navigating to ${path}`);
    
    // Try to close mobile menu if it's open
    const mobileMenuOpen = document.querySelector('.md\\:hidden .py-4') !== null;
    if (mobileMenuOpen) {
      const mobileMenuToggle = document.querySelector('.md\\:hidden button') as HTMLButtonElement | null;
      if (mobileMenuToggle) {
        mobileMenuToggle.click();
      }
    }
    
    // Force a small delay to ensure the navigation completes
    setTimeout(() => {
      // Check if path is the same as current to prevent unnecessary navigation
      if (window.location.pathname !== path) {
        navigate(path);
      } else {
        console.log("Already on this page, skipping navigation");
      }
    }, 10);
  };

  return { safeNavigate };
}; 