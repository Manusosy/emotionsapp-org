
import { Headphones, MessageCircle } from "lucide-react";

const ContactBanner = () => {
  return (
    <div className="flex justify-center mx-auto max-w-5xl px-4">
      <div className="w-full rounded-2xl overflow-hidden bg-gradient-to-r from-blue-600 to-blue-400 text-white shadow-lg">
        <div className="px-5 py-6 sm:py-8 flex flex-col md:flex-row justify-between items-center">
          <div>
            <h2 className="text-xl md:text-2xl font-bold font-jakarta">
              Working for Your Better<br className="hidden md:block" /> Mental Health.
            </h2>
          </div>
          
          <div className="mt-5 md:mt-0 flex flex-col md:flex-row gap-4 md:gap-8">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2 flex items-center justify-center">
                <Headphones className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Customer Support</h3>
                <a 
                  href="tel:+250786468892" 
                  className="text-white/90 hover:text-white hover:underline transition-colors text-xs"
                >
                  +250786468892
                </a>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-white font-medium text-sm">Drop Us an Email</h3>
                <a 
                  href="mailto:support@emotionsapp.org" 
                  className="text-white/90 hover:text-white hover:underline transition-colors text-xs"
                >
                  support@emotionsapp.org
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactBanner;
