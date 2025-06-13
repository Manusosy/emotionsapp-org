import { Minus, Plus, Search, UserRound, CalendarDays, MessageSquare, HelpCircle, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";

const featureCards = [
  {
    title: "Follow-Up Care",
    description: "Track your mental health journey with regular check-ins and progress monitoring to stay committed to your emotional wellbeing.",
    icon: "UserRound",
    iconBg: "#FEF0E6",
    iconColor: "#FF5722",
  },
  {
    title: "Patient-Centered Approach",
    description: "Our emotional wellness platform adapts to your unique needs, providing personalized mood tracking and mental health resources.",
    icon: "CircleUser",
    iconBg: "#F0E7FE",
    iconColor: "#7B33FF",
  },
  {
    title: "Convenient Access",
    description: "Connect with mental health professionals and track your emotions anytime, anywhere with our easy-to-use platform.",
    icon: "ShieldCheck",
    iconBg: "#E1F5FE",
    iconColor: "#00B8D9",
  },
];

const missionVisionData = [
  {
    id: "vision",
    title: "Our Vision",
    number: "01",
    content: "We envision a world where emotional wellness is prioritized, and everyone has the tools and support they need to understand and manage their mental health effectively.",
  },
  {
    id: "mission",
    title: "Our Mission",
    number: "02",
    content: "Our mission is to provide an accessible, user-friendly platform that helps individuals track their moods, identify emotional patterns, and connect with mental health resources.",
  },
  {
    id: "values",
    title: "Our Values",
    number: "03",
    content: "Empathy, accessibility, and evidence-based approaches guide our platform, ensuring everyone receives compassionate support for their emotional wellbeing journey.",
  }
];

const stepItems = [
  {
    icon: Search,
    title: "Track Your Mood",
    description: "Record your emotions daily to identify patterns and triggers that affect your mental wellbeing",
    bgColor: "#007BFF",
  },
  {
    icon: UserRound,
    title: "Get Personalized Insights",
    description: "Receive customized recommendations based on your mood patterns to improve emotional health",
    bgColor: "#FF5722",
  },
  {
    icon: CalendarDays,
    title: "Schedule Self-Care",
    description: "Plan regular self-care activities and mindfulness exercises to maintain emotional balance",
    bgColor: "#00B8D9",
  },
  {
    icon: MessageSquare,
    title: "Connect With Support",
    description: "Access resources and connect with mental health professionals when you need additional guidance",
    bgColor: "#5E5EF6",
  },
];

const faqItems = [
  {
    id: "item-1",
    question: "How can mood tracking improve my mental health?",
    answer: "Regular mood tracking helps you identify patterns and triggers, giving you insights into your emotional wellbeing. This awareness allows you to make positive changes, implement coping strategies earlier, and track your progress over time."
  },
  {
    id: "item-2",
    question: "Is my emotional data kept private and secure?",
    answer: "Yes, we take your privacy seriously. All your emotional health data is encrypted and stored securely. We never share your personal information with third parties without your explicit consent."
  },
  {
    id: "item-3",
    question: "How often should I track my mood?",
    answer: "For best results, we recommend tracking your mood daily. Consistent daily entries provide the most accurate patterns and insights, but even periodic tracking can be beneficial for your emotional awareness."
  },
  {
    id: "item-4",
    question: "Can I use the app if I'm already working with a mood mentor?",
    answer: "Absolutely! Our mood tracking platform works as a complementary tool to your sessions with mood mentors. Many users share their mood data with their mood mentors to provide additional insights between sessions."
  },
  {
    id: "item-5",
    question: "How do I get started with mood tracking?",
    answer: "Getting started is easy! Simply create an account, complete the initial mood assessment, and begin tracking your emotions daily. Our intuitive interface guides you through the process, making it simple to maintain your emotional wellness journey."
  },
  {
    id: "item-6",
    question: "Are there any costs associated with using the platform?",
    answer: "We offer both free and premium tiers. The free tier provides access to basic mood tracking and resources, while our premium subscription unlocks advanced analytics, personalized insights, and direct access to mental health professionals."
  }
];

const testimonials = [
  {
    rating: 5,
    quote: "The mood tracking feature has helped me understand my emotional patterns. I can now identify triggers and take steps to manage my mental health better.",
    author: "Amara Sesay",
    location: "Sierra Leone",
    avatar: "/lovable-uploads/0dbbdc2c-31a1-45b6-a37a-5b573caeb29c.png"
  },
  {
    rating: 5,
    quote: "The daily check-ins have become an essential part of my routine. I appreciate how the app helps me stay accountable to my emotional wellbeing.",
    author: "Eric Mutoni",
    location: "Rwanda",
    avatar: "/lovable-uploads/47ac3dae-2498-4dd3-a729-73086f5c34f8.png"
  },
  {
    rating: 5,
    quote: "This platform has transformed how I approach my mental health. The personalized insights and resources are exactly what I needed on my journey.",
    author: "Kwame Owusu",
    location: "Ghana",
    avatar: "/lovable-uploads/65c8eda5-85f7-4c63-a4cf-a3ba1a9abfdd.png"
  }
];

const WhyBookUs = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");

  return (
    <>
      {/* First Section - Compelling Reasons */}
      <div className="relative py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center px-4 py-2 bg-[#007BFF] rounded-full text-white text-sm font-medium mb-6 mx-auto"
            >
              <span className="text-white">• Why Choose Us •</span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl md:text-4xl font-bold text-[#001A41] mb-12 font-jakarta text-center"
            >
              Compelling Reasons to Choose Us
            </motion.h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Follow-Up Care */}
            <div className="flex flex-col items-start">
              <div className="w-12 h-12 rounded-full bg-[#FEF0E6] flex items-center justify-center text-[#FF5722] mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5ZM12 19.2C9.5 19.2 7.29 17.92 6 15.98C6.03 13.99 10 12.9 12 12.9C13.99 12.9 17.97 13.99 18 15.98C16.71 17.92 14.5 19.2 12 19.2Z" fill="#FF5722"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-[#001A41] font-jakarta">Follow-Up Care</h3>
              <p className="text-[#475467] text-base font-jakarta">
                Track your mental health journey with regular check-ins and progress monitoring to stay committed to your emotional wellbeing.
              </p>
            </div>
            
            {/* Patient-Centered Approach */}
            <div className="flex flex-col items-start">
              <div className="w-12 h-12 rounded-full bg-[#F0E7FE] flex items-center justify-center text-[#7B33FF] mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#7B33FF"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-[#001A41] font-jakarta">Patient-Centered Approach</h3>
              <p className="text-[#475467] text-base font-jakarta">
                Our emotional wellness platform adapts to your unique needs, providing personalized mood tracking and mental health resources.
              </p>
            </div>
            
            {/* Convenient Access */}
            <div className="flex flex-col items-start">
              <div className="w-12 h-12 rounded-full bg-[#E1F5FE] flex items-center justify-center text-[#00B8D9] mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1ZM10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z" fill="#00B8D9"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2 text-[#001A41] font-jakarta">Convenient Access</h3>
              <p className="text-[#475467] text-base font-jakarta">
                Connect with mental health professionals and track your emotions anytime, anywhere with our easy-to-use platform.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Second Section - Dark Blue Background with Mission/Vision */}
      <section className="bg-[#001A41] text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="grid grid-cols-4 gap-4 md:order-1 mx-auto w-full">
              <div className="col-span-4">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6 }}
                  className="rounded-xl overflow-hidden h-auto"
                >
                  <img 
                    src="/lovable-uploads/9ac089c1-e190-4c3f-add1-55934e661d1d.png" 
                    alt="Healthcare professional smiling in teal scrubs" 
                    className="w-full object-contain mx-auto"
                  />
                </motion.div>
              </div>
              <div className="col-span-2">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="rounded-xl overflow-hidden h-40"
                >
                  <img 
                    src="/lovable-uploads/22d420f4-ed4f-4cd9-93a1-cd4c9c7e7747.png" 
                    alt="Doctor with young patient" 
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </div>
              <div className="col-span-2">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.3 }}
                  className="rounded-xl overflow-hidden h-40"
                >
                  <img 
                    src="/lovable-uploads/33227e56-13c8-4799-b80f-5663f5acaf00.png" 
                    alt="Medical supplies" 
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </div>
            </div>
            
            <div className="md:order-2">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center px-4 py-2 bg-[#007BFF] rounded-full text-white text-sm font-medium mb-6"
              >
                <span className="text-white font-jakarta">• Why Choose Us •</span>
              </motion.div>
              
              <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight font-jakarta text-left"
              >
                We are committed to <br />
                understanding your <span className="text-[#007BFF]">emotional needs</span><br />
                <span className="text-[#007BFF]">and supporting your wellbeing.</span>
              </motion.h2>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="text-gray-300 mb-8 font-jakarta text-left"
              >
                As a trusted mental health platform, we are passionate about<br /> promoting emotional wellness beyond the digital experience.<br /> We actively provide tools, resources, and connections to help you<br /> understand and manage your emotions effectively.
              </motion.p>
              
              <div className="space-y-4">
                <Accordion type="single" collapsible defaultValue="vision" className="w-full">
                  {missionVisionData.map((item) => (
                    <AccordionItem 
                      key={item.id} 
                      value={item.id}
                      className="bg-[#001F54] rounded-lg overflow-hidden border border-[#1E3A8A]/30 mb-4"
                    >
                      <AccordionTrigger 
                        className="p-4 hover:no-underline focus:outline-none group"
                        iconPosition="right"
                        customIcon={
                          <div className="w-8 h-8 rounded-md flex items-center justify-center bg-[#007BFF] transition-colors duration-300">
                            <Plus className="w-5 h-5 text-white group-data-[state=open]:hidden" />
                            <Minus className="w-5 h-5 text-white hidden group-data-[state=open]:block" />
                          </div>
                        }
                      >
                        <div className="flex items-center">
                          <div className="text-[#007BFF] font-bold mr-2 font-jakarta">{item.number} .</div>
                          <div className="text-white font-medium font-jakarta">{item.title}</div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-4 text-gray-300 border-t border-[#1E3A8A]/30 font-jakarta text-left">
                        {item.content}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="bg-[#001A41] text-white py-16 border-t border-[#1E3A8A]/30">
        <div className="container mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 max-w-6xl">
          {stepItems.map((step, index) => (
            <div key={index} className="text-left">
              <div 
                className={`w-14 h-14 mb-4 rounded-lg flex items-center justify-center shadow-lg`}
                style={{ backgroundColor: step.bgColor }}
              >
                <step.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2 font-jakarta text-white">{step.title}</h3>
              <p className="text-gray-300 text-sm font-jakarta">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-gradient-to-r from-[#E6F0FF] to-[#E6F7FF] py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center px-4 py-2 bg-[#007BFF] rounded-full text-white text-sm font-medium mb-6 mx-auto font-jakarta"
            >
              <span className="text-white">• Testimonials •</span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl md:text-4xl font-bold text-[#001A41] mb-6 font-jakarta text-center"
            >
              9K Users Trust Emotions Worldwide
            </motion.h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-md">
                <div className="flex items-center gap-1 mb-4">
                  <div className="text-3xl text-[#FF5722] mr-1">"</div>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                
                <p className="text-[#475467] mb-6 font-jakarta text-left">
                  {testimonial.quote}
                </p>
                
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.author}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#001A41] font-jakarta">{testimonial.author}</h4>
                    <p className="text-[#475467] text-sm font-jakarta">{testimonial.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center px-4 py-2 bg-[#007BFF] rounded-full text-white text-sm font-medium mb-6 font-jakarta mx-auto"
            >
              <span className="text-white">• Frequently Asked Questions •</span>
            </motion.div>
            
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl md:text-4xl font-bold text-[#001A41] mb-6 font-jakarta text-center"
            >
              Common Questions About Our Platform
            </motion.h2>
            
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-[#475467] text-lg mb-12 font-jakarta text-center"
            >
              Find answers to frequently asked questions about our emotional wellness tracking platform and services
            </motion.p>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item) => (
                <AccordionItem 
                  key={item.id} 
                  value={item.id}
                  className="mb-4 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <AccordionTrigger 
                    className="p-4 hover:no-underline focus:outline-none group"
                    iconPosition="right"
                    customIcon={
                      <div className="w-8 h-8 rounded-md flex items-center justify-center bg-gray-100 group-data-[state=open]:bg-[#007BFF] transition-colors duration-300">
                        <Plus className="w-4 h-4 text-gray-600 group-data-[state=open]:hidden" />
                        <Minus className="w-4 h-4 text-white hidden group-data-[state=open]:block" />
                      </div>
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#E1F5FE] flex items-center justify-center text-[#007BFF]">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <h3 className="text-lg font-medium text-[#001A41] font-jakarta text-left">{item.question}</h3>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-6 py-5 bg-gray-50 border-t border-gray-200 font-jakarta text-[#475467] leading-relaxed text-left">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>
    </>
  );
};

export default WhyBookUs;
