import { Plus, Search, UserRound, CalendarDays, MessageSquare, Brain, Heart, Sparkles, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const WhyBookSection = () => {
  return (
    <div className="relative py-20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-indigo-50 -z-10" />
      
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(#4B7BF5_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>
      
      {/* Animated orbs */}
      <motion.div
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-r from-brand-blue/30 to-brand-purple/30 blur-3xl -z-10"
        animate={{
          x: [0, 30, 0],
          y: [0, 20, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div
        className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-r from-brand-purple/20 to-brand-blue/20 blur-3xl -z-10"
        animate={{
          x: [0, -30, 0],
          y: [0, -20, 0],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <div className="container mx-auto px-4">
        <div className="text-left mb-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-brand-blue to-brand-purple rounded-full text-white text-sm font-medium mb-6 shadow-lg shadow-brand-blue/20"
          >
            Why Choose Us
          </motion.div>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#001233] to-[#0066FF] bg-clip-text text-transparent mb-6"
          >
            Compelling Reasons to Choose Us
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-xl text-slate-600 mb-12"
          >
            Emotions is a Platform where your journey to a better mental health begins. With our platform, 
            you'll find expert guidance, personalized support, and innovative tools designed to nurture your 
            emotional wellbeing in a safe, accessible environment.
          </motion.p>
        </div>

        {/* Mental Wellness Journey Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16 relative">
          {featureCards.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10, transition: { duration: 0.3 } }}
              className="relative group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/10 to-brand-purple/10 rounded-3xl -m-2 group-hover:from-brand-blue/20 group-hover:to-brand-purple/20 transition-colors duration-500" />
              <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl shadow-blue-200/30 border border-white/50">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-r from-brand-blue to-brand-purple flex items-center justify-center text-white mb-6 shadow-lg shadow-brand-blue/20 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-[#001233]">{feature.title}</h3>
                <p className="text-slate-600">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex justify-center mt-12">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-brand-blue to-brand-purple hover:from-brand-blue/90 hover:to-brand-purple/90 shadow-lg shadow-brand-blue/20"
            >
              <Link to="/patient-signup" className="flex items-center">
                Start Your Journey
              </Link>
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

const featureCards = [
  {
    title: "Expert Mood Mentors",
    description: "Connect with mood mentors specializing in various mental health areas.",
    icon: UserRound,
  },
  {
    title: "Flexible Sessions",
    description: "Choose from various session types and scheduling options that work for you.",
    icon: CalendarDays,
  },
  {
    title: "Safe Space",
    description: "Experience support in a confidential and judgment-free environment.",
    icon: ShieldCheck,
  },
  {
    title: "Personalized Care",
    description: "Receive tailored support plans designed specifically for your mental health needs.",
    icon: Brain,
  },
  {
    title: "Holistic Approach",
    description: "Address all aspects of your wellbeing with our comprehensive mental health services.",
    icon: Heart,
  },
  {
    title: "Proven Results",
    description: "Join thousands who have transformed their mental wellness with our platform.",
    icon: Sparkles,
  },
];

const CommitmentSection = () => {
  const [openItem, setOpenItem] = useState<string>("vision");

  return (
    <div className="relative py-24 overflow-hidden bg-[#001233]">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(#4B7BF5_1px,transparent_1px)] [background-size:16px_16px]" />
      </div>

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-start mb-20">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="col-span-2">
              <div className="w-full h-[300px] rounded-2xl overflow-hidden mb-4">
                <img 
                  src="/lovable-uploads/c0ecda45-8d74-4c20-9198-0f3620d7413b.png" 
                  alt="Group therapy session"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div className="h-[200px] rounded-2xl overflow-hidden">
              <img 
                src="/lovable-uploads/ebd631eb-989a-4aec-9a94-bcf4b77476b6.png"
                alt="Therapy consultation" 
                className="w-full h-full object-cover"
              />
            </div>
            <motion.div 
              className="h-[200px] rounded-2xl overflow-hidden"
              animate={{
                y: [0, -10, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <img 
                src="/lovable-uploads/8451f6cd-2176-491c-8c66-b9934388c3de.png"
                alt="One-on-one therapy session"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-white space-y-8"
          >
            <div className="inline-flex items-center px-4 py-2 bg-[#0066FF] rounded-full text-white text-sm font-medium">
              ● Why Choose Our Platform ●
            </div>

            <h2 className="text-4xl md:text-5xl font-display font-bold leading-tight">
              We are committed to understanding your{" "}
              <span className="text-[#0066FF]">mental wellness</span>{" "}
              and providing expert{" "}
              <span className="text-[#0066FF]">support</span>.
            </h2>

            <p className="text-slate-300 text-lg leading-relaxed">
              As a trusted mental health platform, we are dedicated to making support accessible and comfortable. Our network of mood mentors provides personalized care through individual sessions, group support, and ongoing guidance.
            </p>

            <Accordion type="single" value={openItem} onValueChange={setOpenItem} collapsible>
              <AccordionItem value="vision" className="mb-4 rounded-2xl bg-[#00091C] overflow-hidden border-none">
                <AccordionTrigger className="w-full hover:no-underline p-8 transition-all duration-300">
                  <div className="flex-1 text-left">
                    <h3 className="text-2xl font-semibold text-white">
                      <span className="text-[#0066FF] mr-2">01.</span>
                      Our Vision
                    </h3>
                  </div>
                  <div className="ml-4">
                    <Plus className={`h-6 w-6 text-[#0066FF] transition-transform duration-300 ${openItem === 'vision' ? 'rotate-45' : ''}`} />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-8">
                  <p className="text-slate-300 text-lg leading-relaxed">
                    We envision a world where mental health support is readily available, stigma-free, and tailored to each individual's unique journey toward emotional well-being and personal growth.
                  </p>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="mission" className="rounded-2xl bg-[#00091C] overflow-hidden border-none">
                <AccordionTrigger className="w-full hover:no-underline p-8 transition-all duration-300">
                  <div className="flex-1 text-left">
                    <h3 className="text-2xl font-semibold text-white">
                      <span className="text-[#0066FF] mr-2">02.</span>
                      Our Mission
                    </h3>
                  </div>
                  <div className="ml-4">
                    <Plus className={`h-6 w-6 text-[#0066FF] transition-transform duration-300 ${openItem === 'mission' ? 'rotate-45' : ''}`} />
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-8 pb-8">
                  <p className="text-slate-300 text-lg leading-relaxed">
                    To transform mental healthcare through innovative technology and compassionate care. We strive to make quality mental health services accessible to all, breaking down barriers and creating a supportive environment where everyone can thrive.
                  </p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mt-16">
          {[
            {
              icon: Search,
              title: "Find Your Mood Mentor",
              description: "Search for mood mentors based on specialization, approach, and availability that match your needs.",
              color: '#0066FF'
            },
            {
              icon: UserRound,
              title: "Review Detailed Profiles",
              description: "Explore detailed mood mentor profiles, backgrounds, and specialties to find your ideal match.",
              color: '#FF4D00'
            },
            {
              icon: CalendarDays,
              title: "Book Sessions",
              description: "Schedule your therapy sessions at times that work best for your schedule.",
              color: '#00B8D4'
            },
            {
              icon: MessageSquare,
              title: "Start Sessions",
              description: "Begin your mental health journey with secure video sessions and ongoing support.",
              color: '#4A3AFF'
            }
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center space-y-4"
            >
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                style={{ backgroundColor: item.color }}
              >
                <item.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl text-white font-semibold">{item.title}</h3>
              <p className="text-slate-400 leading-relaxed max-w-xs mx-auto">{item.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CommitmentSection;
