import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Headphones, Mail, MapPin, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { useSafeNavigation } from "@/hooks/use-safe-navigation";

const Contact = () => {
  const { safeNavigate } = useSafeNavigation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "General Inquiry",
    message: ""
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Scroll to top when the component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      toast.success("Your message has been sent successfully!");
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "General Inquiry",
        message: ""
      });
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#E7E1FF] to-[#FEFEFF] opacity-80"></div>
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-white to-[#D4E6FF] opacity-90"></div>
      
      {/* Content with relative positioning */}
      <div className="relative z-10">
        {/* Hero Section - Centered */}
        <div className="w-full flex justify-center items-center py-16">
          <div className="text-center max-w-3xl">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center px-4 py-2 bg-[#007BFF] rounded-full text-white text-sm font-medium mb-6"
            >
              <span className="text-white">Reach Out</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-[#001A41] mb-3 font-jakarta"
            >
              Get in Touch
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-gray-500"
            >
              Have questions about our emotional wellness platform? We're here to help you on your journey to better mental health.
            </motion.p>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="container mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Form */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="bg-white rounded-2xl shadow-sm p-8"
            >
              <h2 className="text-2xl font-bold text-[#001A41] mb-6 font-jakarta text-left">
                Send us a Message
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6 text-left">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#001A41] font-medium">Your Name</Label>
                  <Input 
                    id="name"
                    name="name"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="rounded-lg border-gray-300 focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF]"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-[#001A41] font-medium">Email</Label>
                    <Input 
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="rounded-lg border-gray-300 focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-[#001A41] font-medium">Phone Number</Label>
                    <Input 
                      id="phone"
                      name="phone"
                      placeholder="+250 786 468 892"
                      value={formData.phone}
                      onChange={handleChange}
                      className="rounded-lg border-gray-300 focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF]"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-[#001A41] font-medium">Subject</Label>
                  <RadioGroup 
                    defaultValue="General Inquiry" 
                    name="subject"
                    value={formData.subject}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="General Inquiry" id="general" />
                      <Label htmlFor="general" className="cursor-pointer">General Inquiry</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Technical Support" id="support" />
                      <Label htmlFor="support" className="cursor-pointer">Technical Support</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Feedback" id="feedback" />
                      <Label htmlFor="feedback" className="cursor-pointer">Feedback</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Partnership" id="partnership" />
                      <Label htmlFor="partnership" className="cursor-pointer">Partnership</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-[#001A41] font-medium">Your Message</Label>
                  <Textarea 
                    id="message"
                    name="message"
                    placeholder="How can we help you?"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    className="min-h-32 rounded-lg border-gray-300 focus:border-[#007BFF] focus:ring-1 focus:ring-[#007BFF]"
                  />
                </div>
                
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full bg-[#007BFF] hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? "Sending..." : "Send Message"}
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </motion.div>
            
            {/* Contact Information */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="lg:mt-0 space-y-8"
            >
              {/* Contact Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-6 shadow-sm text-left">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                    <Phone className="h-6 w-6 text-[#007BFF]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#001A41] mb-2 font-jakarta">Phone</h3>
                  <p className="text-gray-600 mb-4">Our support team is available from Monday to Friday, 8am to 6pm</p>
                  <a href="tel:+250786468892" className="text-[#007BFF] font-medium hover:underline flex items-center gap-1">
                    +250 786 468 892
                  </a>
                </div>
                
                <div className="bg-white rounded-xl p-6 shadow-sm text-left">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                    <Mail className="h-6 w-6 text-[#007BFF]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#001A41] mb-2 font-jakarta">Email</h3>
                  <p className="text-gray-600 mb-4">Send us an email and we'll get back to you within 24 hours</p>
                  <a href="mailto:support@emotionsapp.org" className="text-[#007BFF] font-medium hover:underline flex items-center gap-1">
                    support@emotionsapp.org
                  </a>
                </div>
              </div>
              
              {/* Office Location */}
              <div className="bg-white rounded-xl p-6 shadow-sm text-left">
                <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-[#007BFF]" />
                </div>
                <h3 className="text-lg font-bold text-[#001A41] mb-2 font-jakarta">Our Office</h3>
                <p className="text-gray-600 mb-4">Kigali Innovation City, Special Economic Zone, Kigali, Rwanda</p>
                
                {/* Map Placeholder */}
                <div className="rounded-lg overflow-hidden h-48 bg-gray-100 relative">
                  <iframe 
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3987.5064531593507!2d30.12291287396074!3d-1.9551786982949305!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x19dca69df6aecf63%3A0xf88fa3d5d66a54a9!2sKigali%20Innovation%20City!5e0!3m2!1sen!2sus!4v1713261952915!5m2!1sen!2sus" 
                    width="100%" 
                    height="100%" 
                    style={{ border: 0 }} 
                    allowFullScreen={true} 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade"
                    className="absolute inset-0"
                  ></iframe>
                </div>
              </div>
              
              {/* FAQ or Help Center Link */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl p-6 shadow-sm text-white text-left">
                <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center mb-4">
                  <Headphones className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2 font-jakarta">Need immediate help?</h3>
                <p className="mb-4 text-white/80">Check our frequently asked questions or browse our help center for quick answers.</p>
                <div className="flex flex-wrap gap-3">
                  <Button 
                    variant="secondary" 
                    className="bg-white text-blue-600 hover:bg-white/90"
                    onClick={() => safeNavigate("/faqs")}
                  >
                    View FAQs
                  </Button>
                  <Button 
                    variant="outline" 
                    className="border-white text-white hover:bg-white/10"
                    onClick={() => safeNavigate("/help-center")}
                  >
                    Help Center
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact; 