import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop component scrolls the window to the top whenever
 * the route changes (detected by changes to location.pathname)
 */
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top when the route changes
    window.scrollTo({
      top: 0,
      behavior: "instant" // Use "instant" instead of "smooth" for immediate scroll
    });
  }, [pathname]);

  return null; // This component doesn't render anything
};

export default ScrollToTop; 