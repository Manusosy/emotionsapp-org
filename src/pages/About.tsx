import { motion } from "framer-motion";
import { useSafeNavigation } from "@/hooks/use-safe-navigation";
import { Facebook, Twitter, Instagram, Linkedin, Github } from "lucide-react";
import { useEffect } from "react";

const About = () => {
  const { safeNavigate } = useSafeNavigation();
  
  // Scroll to top when the component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Ensure mobile menu is closed when navigating from this page
  const handleNavigation = (path: string, e: React.MouseEvent) => {
    // Try to close mobile menu if it's open
    const mobileMenuToggle = document.querySelector('.md\\:hidden button') as HTMLButtonElement | null;
    const mobileMenuOpen = document.querySelector('.md\\:hidden .py-4') !== null;
    
    if (mobileMenuOpen && mobileMenuToggle) {
      mobileMenuToggle.click();
    }
    
    safeNavigate(path, e);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-blue-500 py-8 md:py-16 relative">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-2xl text-center md:text-left px-4 md:px-0"
            >
              <span className="inline-block px-4 py-1 bg-blue-400 text-white text-sm font-medium rounded-full mb-4">
                About Us
              </span>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 font-jakarta">
                Transforming Mental Health Support Through Technology
              </h1>
              <p className="text-xl text-white/90 mb-6">
                At Emotions, we're dedicated to making mental health support accessible to everyone. Our platform combines technology with compassion to create a safe space for emotional well-being.
              </p>
            </motion.div>

            {/* Hero Image */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="w-full md:w-1/3 flex-shrink-0"
            >
              <img 
                src="/lovable-uploads/7d02b0da-dd91-4635-8bc4-6df39dffd0f1.png" 
                alt="Emotions Platform" 
                className="w-full h-auto rounded-lg shadow-lg"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Story</h2>
            <p className="text-gray-600">How we started and where we're headed</p>
          </motion.div>
          
          {/* Timeline */}
          <div className="max-w-4xl mx-auto relative">
            {/* Vertical line */}
            <div className="absolute left-0 md:left-1/2 transform md:-translate-x-1/2 top-0 h-full w-1 bg-blue-200 z-0"></div>

            {/* Timeline items */}
            <div className="relative z-10">
              {/* 2024 - The Beginning */}
              <div className="flex flex-col md:flex-row items-start mb-16">
                <div className="md:w-1/2 md:pr-12 md:text-right order-2 md:order-1">
                  <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6 }}
                    className="bg-white p-6 rounded-lg shadow mb-4 md:ml-auto md:mr-0"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-2">The Beginning</h3>
                    <p className="text-gray-700">
                      Founded with a vision to revolutionize mental health support, Emotions started as a simple idea: make emotional wellness accessible to everyone, everywhere.
                    </p>
                  </motion.div>
                </div>
                <div className="md:w-1/2 order-1 md:order-2 flex items-center flex-col mb-8 md:mb-0">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm mb-2">
                    2024
                  </div>
                </div>
              </div>

              {/* 2025 - Growing Impact */}
              <div className="flex flex-col md:flex-row items-start mb-16">
                <div className="md:w-1/2 md:pl-12 order-2">
                  <motion.div 
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="bg-white p-6 rounded-lg shadow mb-4"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Growing Impact</h3>
                    <p className="text-gray-700">
                      We expanded our services, introduced AI-powered mood tracking, and built a community of mental health professionals and support groups.
                    </p>
                  </motion.div>
                </div>
                <div className="md:w-1/2 order-1 flex items-center flex-col mb-8 md:mb-0">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm mb-2">
                    2025
                  </div>
                </div>
              </div>

              {/* 2026 - Looking Forward */}
              <div className="flex flex-col md:flex-row items-start">
                <div className="md:w-1/2 md:pr-12 md:text-right order-2 md:order-1">
                  <motion.div 
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="bg-white p-6 rounded-lg shadow mb-4 md:ml-auto md:mr-0"
                  >
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Looking Forward</h3>
                    <p className="text-gray-700">
                      Our mission continues as we develop innovative solutions and expand our reach to help more people on their mental health journey.
                    </p>
                  </motion.div>
                </div>
                <div className="md:w-1/2 order-1 md:order-2 flex items-center flex-col">
                  <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm mb-2">
                    2026
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Values</h2>
            <p className="text-gray-600">The principles that guide everything we do</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Compassion */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-white p-6 rounded-lg border border-gray-100 text-center"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-4">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 21.35L10.55 20.03C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3C9.24 3 10.91 3.81 12 5.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5C22 12.28 18.6 15.36 13.45 20.04L12 21.35Z" fill="currentColor" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Compassion</h3>
              <p className="text-gray-600">
                We approach every interaction with empathy, creating a supportive environment for all.
              </p>
            </motion.div>

            {/* Trust */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white p-6 rounded-lg border border-gray-100 text-center"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-4">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM12 11.99H19C18.47 16.11 15.72 19.78 12 20.93V12H5V6.3L12 3.19V11.99Z" fill="currentColor" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Trust</h3>
              <p className="text-gray-600">
                We maintain the highest standards of privacy and security, creating a safe space for emotional expression.
              </p>
            </motion.div>

            {/* Innovation */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white p-6 rounded-lg border border-gray-100 text-center"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mx-auto mb-4">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM17 10H14V7H10V10H7V14H10V17H14V14H17V10Z" fill="currentColor" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Innovation</h3>
              <p className="text-gray-600">
                We continuously evolve our platform with cutting-edge technology to provide the best support possible.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Meet Our Team Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Meet Our Team</h2>
            <p className="text-gray-600">The passionate people behind Emotions</p>
          </motion.div>

          <div className="flex overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
            <div className="flex gap-8 min-w-max px-4">
              {/* Team Member 1 */}
              <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="bg-white rounded-lg overflow-hidden shadow-sm w-64 flex-shrink-0 snap-start"
              >
                <img 
                  src="/assets/team/abdul.jpg" 
                  alt="Abdul Karim Sesay" 
                  className="w-full aspect-square object-cover"
                />
                <div className="p-4 text-center">
                  <h3 className="font-bold text-lg text-gray-900">Abdul Karim Sesay</h3>
                  <p className="text-gray-600 text-sm mb-3">CEO and Product Innovation Strategist</p>
                  <div className="flex justify-center space-x-3">
                    <a href="https://www.facebook.com/share/1Gzgqg26Xb/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors">
                      <Facebook className="w-4 h-4" />
                    </a>
                    <a href="https://www.instagram.com/champion_boy_jela_official?igsh=Y2Jyc3UxdTY2dmt2&utm_source=qr" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors">
                      <Instagram className="w-4 h-4" />
                    </a>
                    <a href="https://www.linkedin.com/in/abdul-karim-sesay-2858b6203?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=ios_app" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.div>

              {/* Team Member 2 */}
              <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="bg-white rounded-lg overflow-hidden shadow-sm w-64 flex-shrink-0 snap-start"
              >
                <img 
                  src="/assets/team/gabriel.jpg" 
                  alt="Gabriel Oke" 
                  className="w-full aspect-square object-cover"
                />
                <div className="p-4 text-center">
                  <h3 className="font-bold text-lg text-gray-900">Gabriel Oke</h3>
                  <p className="text-gray-600 text-sm mb-3">Chief Operations Officer</p>
                  <div className="flex justify-center space-x-3">
                    <a href="#" className="text-gray-400 hover:text-blue-500 transition-colors">
                      <Twitter className="w-4 h-4" />
                    </a>
                    <a href="#" className="text-gray-400 hover:text-blue-500 transition-colors">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.div>

              {/* Team Member 3 */}
              <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="bg-white rounded-lg overflow-hidden shadow-sm w-64 flex-shrink-0 snap-start"
              >
                <img 
                  src="/assets/team/axel.jpg" 
                  alt="Axel Shimwa" 
                  className="w-full aspect-square object-cover"
                />
                <div className="p-4 text-center">
                  <h3 className="font-bold text-lg text-gray-900">Axel Shimwa</h3>
                  <p className="text-gray-600 text-sm mb-3">Chief Medical Officer</p>
                  <div className="flex justify-center space-x-3">
                    <a href="https://x.com/AxelShimwa" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                      <Twitter className="w-4 h-4" />
                    </a>
                    <a href="https://www.linkedin.com/in/axel-shimwa-792299192/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.div>

              {/* Team Member 4 */}
              <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-white rounded-lg overflow-hidden shadow-sm w-64 flex-shrink-0 snap-start"
              >
                <img 
                  src="/assets/team/emanuel.jpg" 
                  alt="Emanuel Soita" 
                  className="w-full aspect-square object-cover"
                />
                <div className="p-4 text-center">
                  <h3 className="font-bold text-lg text-gray-900">Emanuel Soita</h3>
                  <p className="text-gray-600 text-sm mb-3">Product Development Lead</p>
                  <div className="flex justify-center space-x-3">
                    <a href="https://github.com/Manusosy" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-gray-700 transition-colors">
                      <Github className="w-4 h-4" />
                    </a>
                    <a href="https://www.linkedin.com/in/soitaemanuel/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                      <Linkedin className="w-4 h-4" />
                    </a>
                    <a href="https://x.com/manusosy" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                      <Twitter className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.div>

              {/* Team Member 5 */}
              <motion.div
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="bg-white rounded-lg overflow-hidden shadow-sm w-64 flex-shrink-0 snap-start"
              >
                <img 
                  src="/assets/team/pascaline.jpg" 
                  alt="Pascaline Kayitete" 
                  className="w-full aspect-square object-cover"
                />
                <div className="p-4 text-center">
                  <h3 className="font-bold text-lg text-gray-900">Pascaline Kayitete</h3>
                  <p className="text-gray-600 text-sm mb-3">Software Developer</p>
                  <div className="flex justify-center space-x-3">
                    <a href="https://x.com/Umulisapa" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                      <Twitter className="w-4 h-4" />
                    </a>
                    <a href="https://www.linkedin.com/in/pascaline-kayitete-umulisa/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <div className="flex space-x-2">
              <span className="block w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="block w-2 h-2 rounded-full bg-gray-300"></span>
              <span className="block w-2 h-2 rounded-full bg-gray-300"></span>
            </div>
          </div>
        </div>
      </section>

      {/* Our Impact Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Impact</h2>
            <p className="text-gray-600">Making a difference in mental health support</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-5xl mx-auto text-center">
            {/* Impact Stat 1 */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center"
            >
              <h3 className="text-4xl font-bold text-blue-500 mb-2">50K+</h3>
              <p className="text-gray-600 text-sm">Active Users</p>
            </motion.div>

            {/* Impact Stat 2 */}
          <motion.div 
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-center"
            >
              <h3 className="text-4xl font-bold text-blue-500 mb-2">200+</h3>
              <p className="text-gray-600 text-sm">Mental Health Professionals</p>
          </motion.div>
          
            {/* Impact Stat 3 */}
          <motion.div 
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center"
            >
              <h3 className="text-4xl font-bold text-blue-500 mb-2">100+</h3>
              <p className="text-gray-600 text-sm">Support Groups</p>
          </motion.div>

            {/* Impact Stat 4 */}
            <motion.div
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-center"
            >
              <h3 className="text-4xl font-bold text-blue-500 mb-2">25+</h3>
              <p className="text-gray-600 text-sm">Countries Reached</p>
            </motion.div>
          </div>
        </div>
      </section>
          
          {/* Call to Action */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-left max-w-3xl mx-auto"
          >
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Join Us on This Journey</h2>
            <p className="text-gray-600 mb-8">
              Whether you're seeking support for your own emotional wellness, looking to connect with others, 
              or passionate about our mission, we invite you to be part of the Emotions community.
            </p>
            <div className="flex gap-4 flex-wrap">
              <a 
                href="/contact"
                onClick={(e) => handleNavigation("/contact", e)}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
              >
                Contact Us
              </a>
              <a 
                href="/faqs"
                onClick={(e) => handleNavigation("/faqs", e)}
                className="px-6 py-3 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 transition-colors font-medium"
              >
                Learn More (FAQs)
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default About; 