import { Facebook, Instagram, Linkedin, Heart, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

const Footer = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  
  const handleNavigation = (path: string, e: React.MouseEvent) => {
    e.preventDefault();
    navigate(path);
    // Scroll to top of the page
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle newsletter subscription
    alert(`Subscribed with: ${email}`);
    setEmail("");
  };

  return (
    <footer className="bg-[#F3F7FF] w-full py-10">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Our Mission */}
          <div className="text-center md:text-left flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2 mb-5">
              <Heart className="h-6 w-6 text-amber-500 fill-amber-500" />
              <h3 className="text-2xl font-medium text-gray-900">Our Mission</h3>
            </div>
            <p className="text-gray-700 text-base leading-relaxed mb-4 max-w-sm">
              Making mental health support accessible to everyone, everywhere.
            </p>
            <p className="text-gray-700 text-base leading-relaxed max-w-sm">
              Join us in creating a world where mental wellness is a priority, not an afterthought.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-2xl font-medium text-gray-900 mb-5 text-center md:text-left">Quick Links</h3>
            <div className="grid grid-cols-2 gap-y-4 text-center md:text-left">
              <a 
                href="/about" 
                onClick={(e) => handleNavigation("/about", e)}
                className="text-gray-700 hover:text-blue-600 text-base"
              >
                About Us
              </a>
              <a 
                href="/journal" 
                onClick={(e) => handleNavigation("/journal", e)}
                className="text-gray-700 hover:text-blue-600 text-base"
              >
                Journal
              </a>
              <a 
                href="/contact" 
                onClick={(e) => handleNavigation("/contact", e)}
                className="text-gray-700 hover:text-blue-600 text-base"
              >
                Contact
              </a>
              <a 
                href="/help-groups" 
                onClick={(e) => handleNavigation("/help-groups", e)}
                className="text-gray-700 hover:text-blue-600 text-base"
              >
                Help Groups
              </a>
              <a 
                href="/resources" 
                onClick={(e) => handleNavigation("/resources", e)}
                className="text-gray-700 hover:text-blue-600 text-base"
              >
                Resources
              </a>
              <a 
                href="/mood-mentors" 
                onClick={(e) => handleNavigation("/mood-mentors", e)}
                className="text-gray-700 hover:text-blue-600 text-base"
              >
                Mood Mentors
              </a>
            </div>
          </div>

          {/* Newsletter & Social Media */}
          <div className="flex flex-col space-y-8">
            {/* Newsletter */}
            <div>
              <h3 className="text-2xl font-medium text-gray-900 mb-2 text-center md:text-left">Newsletter</h3>
              <p className="text-gray-600 mb-5 text-center md:text-left">
                Subscribe & Stay Updated from the Emotions
              </p>
              <form onSubmit={handleSubscribe} className="flex">
                <div className="relative flex-grow">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter Email Address"
                    className="w-full py-3 px-4 rounded-l-md bg-white border-0 focus:outline-none"
                    required
                  />
                </div>
                <button 
                  type="submit"
                  className="bg-[#3B82F6] text-white font-medium rounded-r-md px-6 flex items-center justify-center"
                >
                  <Send className="mr-2 h-5 w-5" />
                  Send
                </button>
              </form>
            </div>
            
            {/* Social Media Icons */}
            <div className="flex items-center justify-center md:justify-start">
              <span className="text-gray-700 font-normal mr-4">Follow Us:</span>
              <div className="flex gap-3">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#F3F7FF] p-2 rounded-full border border-gray-200 hover:bg-blue-50 transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5 text-gray-600" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#F3F7FF] p-2 rounded-full border border-gray-200 hover:bg-blue-50 transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5 text-gray-600" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#F3F7FF] p-2 rounded-full border border-gray-200 hover:bg-blue-50 transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="h-5 w-5 text-gray-600" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright & Links */}
        <div className="mt-10 pt-4 border-t border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-600 text-center md:text-left">
              © 2025 Emotions. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center md:justify-end gap-x-8 gap-y-2">
              <a 
                href="/privacy-policy" 
                onClick={(e) => handleNavigation("/privacy-policy", e)}
                className="text-gray-600 hover:text-blue-600 whitespace-nowrap"
              >
                Privacy Policy
              </a>
              <a 
                href="/data-protection" 
                onClick={(e) => handleNavigation("/data-protection", e)}
                className="text-gray-600 hover:text-blue-600 whitespace-nowrap"
              >
                Data Protection
              </a>
              <a 
                href="/terms-of-service" 
                onClick={(e) => handleNavigation("/terms-of-service", e)}
                className="text-gray-600 hover:text-blue-600 whitespace-nowrap"
              >
                Terms of Service
              </a>
              <a 
                href="/faqs" 
                onClick={(e) => handleNavigation("/faqs", e)}
                className="text-gray-600 hover:text-blue-600 whitespace-nowrap"
              >
                FAQs
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
