import { motion } from "framer-motion";
import { useEffect } from "react";

const TermsOfService = () => {
  // Scroll to top when the component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
              <span className="text-white">Legal Document</span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl md:text-5xl font-bold text-[#001A41] mb-3 font-jakarta"
            >
              Terms of Service
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-gray-500 font-jakarta"
            >
              Last Updated: March 2025
            </motion.p>
          </div>
        </div>
        
        {/* Main Content - Left-aligned text */}
        <div className="container mx-auto px-4 pb-16">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm p-8 mb-8"
          >
            <div className="prose prose-blue max-w-none text-left">
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">1. Acceptance of Terms</h3>
              <p className="mb-6 text-gray-700 text-left">
                By accessing or using the Emotions platform, whether through our website or mobile applications (collectively, the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
              </p>
              <p className="mb-6 text-gray-700 text-left">
                These Terms of Service constitute a legally binding agreement between you and Emotions regarding your use of the Service. Please read them carefully.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">2. Eligibility</h3>
              <p className="mb-6 text-gray-700 text-left">
                You must be at least 16 years old to use our Service. If you are under 18, you represent that you have your parent's or legal guardian's permission to use the Service and that they have read and agree to these Terms of Service on your behalf.
              </p>
              <p className="mb-6 text-gray-700 text-left">
                By using our Service, you represent and warrant that you have the legal capacity to enter into these Terms of Service in your jurisdiction.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">3. Service Description</h3>
              <p className="mb-6 text-gray-700 text-left">
                Emotions provides a digital platform for emotional wellness tracking, journaling, and connecting with mental health resources. Our Service is designed to help you monitor and understand your emotional health, but it is not a substitute for professional medical advice, diagnosis, or treatment.
              </p>
              <p className="mb-6 text-gray-700 text-left">
                <strong>IMPORTANT:</strong> Our Service is not intended for use in medical emergencies or crisis situations. If you are experiencing a mental health emergency, please call your local emergency services immediately or visit the nearest emergency room.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">4. Account Registration</h3>
              <p className="mb-3 text-gray-700 text-left">
                To access certain features of our Service, you may need to create an account. When registering, you agree to:
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Keep your password secure and confidential</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Accept responsibility for all activities that occur under your account</li>
              </ul>
              <p className="mb-6 text-gray-700 text-left">
                We reserve the right to disable or terminate your account if we have reason to believe that information you provided is untrue, inaccurate, or incomplete, or if you have violated these Terms of Service.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">5. User Responsibilities</h3>
              <p className="mb-3 text-gray-700 text-left">
                As a user of our Service, you agree not to:
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li>Use the Service for any illegal purpose or in violation of any laws</li>
                <li>Post or transmit content that is harmful, offensive, obscene, abusive, invasive of privacy, defamatory, hateful, or otherwise objectionable</li>
                <li>Impersonate any person or entity or falsely state or misrepresent your affiliation with a person or entity</li>
                <li>Interfere with or disrupt the Service or servers or networks connected to the Service</li>
                <li>Attempt to gain unauthorized access to any part of the Service</li>
                <li>Use the Service to collect or harvest any personally identifiable information</li>
                <li>Use the Service for any commercial solicitation purposes without our prior written consent</li>
                <li>Attempt to decompile, reverse engineer, disassemble, or hack the Service</li>
                <li>Transmit any viruses, worms, defects, Trojan horses, or other items of a destructive nature</li>
              </ul>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">6. Intellectual Property Rights</h3>
              <p className="mb-3 text-gray-700 text-left">
                The Service and its original content, features, and functionality are and will remain the exclusive property of Emotions and its licensors. The Service is protected by copyright, trademark, and other laws of both the United States and foreign countries.
              </p>
              <p className="mb-6 text-gray-700 text-left">
                Our trademarks and trade dress may not be used in connection with any product or service without the prior written consent of Emotions.
              </p>
              <p className="mb-6 text-gray-700 text-left">
                You retain ownership of any content you submit, post, or display on or through the Service. By submitting content to the Service, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute, and display such content in connection with providing the Service.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">7. Privacy</h3>
              <p className="mb-6 text-gray-700 text-left">
                Your privacy is important to us. Our <strong>Privacy Policy</strong> and <strong>Data Protection Policy</strong> explain how we collect, use, and protect your personal information. By using our Service, you agree to our collection and use of your information as described in these policies.
              </p>
              <p className="mb-6 text-gray-700 text-left">
                You acknowledge that emotional health data is sensitive personal information, and you expressly consent to our processing of this data as described in our Privacy Policy.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">8. Subscription and Payment</h3>
              <p className="mb-3 text-gray-700 text-left">
                Our Service may offer both free and paid subscription plans. For paid subscriptions:
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li>You agree to pay all fees in accordance with the pricing and payment terms in effect at the time of your subscription</li>
                <li>Subscription fees are billed in advance on a monthly or annual basis, depending on your selected plan</li>
                <li>Payment must be made using a valid payment method</li>
                <li>Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period</li>
                <li>No refunds or credits will be provided for partial subscription periods or unused features</li>
              </ul>
              <p className="mb-6 text-gray-700 text-left">
                We reserve the right to change our subscription plans or adjust pricing at any time. Any changes will be communicated to you in advance.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">9. Termination</h3>
              <p className="mb-6 text-gray-700 text-left">
                We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including, without limitation, if you breach these Terms of Service.
              </p>
              <p className="mb-6 text-gray-700 text-left">
                Upon termination, your right to use the Service will immediately cease. If you wish to terminate your account, you may simply discontinue using the Service or request account deletion through the app settings.
              </p>
              <p className="mb-6 text-gray-700 text-left">
                All provisions of these Terms of Service which by their nature should survive termination shall survive, including, without limitation, ownership provisions, warranty disclaimers, indemnity, and limitations of liability.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">10. Disclaimer of Warranties</h3>
              <p className="mb-6 text-gray-700 text-left">
                The Service is provided "as is" and "as available" without warranties of any kind, either express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
              </p>
              <p className="mb-6 text-gray-700 text-left">
                We do not guarantee that the Service will be uninterrupted, secure, or error-free, that defects will be corrected, or that the Service or the server that makes it available are free of viruses or other harmful components.
              </p>
              <p className="mb-6 text-gray-700 text-left">
                <strong>IMPORTANT:</strong> Our Service is not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">11. Limitation of Liability</h3>
              <p className="mb-6 text-gray-700 text-left">
                To the maximum extent permitted by law, Emotions and its directors, employees, partners, agents, suppliers, or affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from:
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li>Your use or inability to use the Service</li>
                <li>Any unauthorized access to or use of our servers and/or any personal information stored therein</li>
                <li>Any interruption or cessation of transmission to or from the Service</li>
                <li>Any bugs, viruses, Trojan horses, or the like that may be transmitted to or through the Service</li>
                <li>Any errors or omissions in any content or for any loss or damage incurred as a result of the use of any content posted, emailed, transmitted, or otherwise made available through the Service</li>
              </ul>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">12. Indemnification</h3>
              <p className="mb-6 text-gray-700 text-left">
                You agree to defend, indemnify, and hold harmless Emotions and its licensors, service providers, and their respective officers, directors, employees, contractors, agents, licensors, suppliers, successors, and assigns from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees (including reasonable attorneys' fees) arising out of or relating to your violation of these Terms of Service or your use of the Service.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">13. Governing Law</h3>
              <p className="mb-6 text-gray-700 text-left">
                These Terms of Service shall be governed by and construed in accordance with the laws of Rwanda, without regard to its conflict of law provisions.
              </p>
              <p className="mb-6 text-gray-700 text-left">
                Any dispute arising from or relating to the subject matter of these Terms of Service shall be resolved through arbitration in Kigali, Rwanda, under the rules of the Rwanda Arbitration Center.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">14. Changes to Terms</h3>
              <p className="mb-6 text-gray-700 text-left">
                We reserve the right to modify or replace these Terms of Service at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
              </p>
              <p className="mb-6 text-gray-700 text-left">
                By continuing to access or use our Service after any revisions become effective, you agree to be bound by the revised terms. If you do not agree to the new terms, you are no longer authorized to use the Service.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">15. Severability</h3>
              <p className="mb-6 text-gray-700 text-left">
                If any provision of these Terms of Service is found to be unenforceable or invalid, that provision will be limited or eliminated to the minimum extent necessary so that the Terms of Service will otherwise remain in full force and effect and enforceable.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">16. Entire Agreement</h3>
              <p className="mb-6 text-gray-700 text-left">
                These Terms of Service, together with our Privacy Policy and any other legal notices published by us on the Service, constitute the entire agreement between you and Emotions concerning the Service.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">17. Contact Information</h3>
              <p className="mb-4 text-gray-700 text-left">
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <p className="mb-6 text-gray-700 text-left">
                <strong>Email</strong>: info@emotionsapp.org<br />
                <strong>Phone</strong>: +250786468892
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService; 