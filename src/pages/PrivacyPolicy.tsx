import { motion } from "framer-motion";
import { useEffect } from "react";

const PrivacyPolicy = () => {
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
              Privacy Policy
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
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">1. Introduction</h3>
              <p className="mb-6 text-gray-700 text-left">
                Welcome to Emotions. We are committed to safeguarding your privacy and ensuring that your personal data is protected in accordance with applicable data protection laws, including the <strong>General Data Protection Regulation (EU) 2016/679</strong> ("GDPR").
              </p>
              <p className="mb-6 text-gray-700 text-left">
                This Privacy Policy outlines how we collect, use, disclose, and protect your personal information when you use our emotional wellness tracking platform via our mobile and web applications.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">2. Data Controller</h3>
              <p className="mb-4 text-gray-700 text-left">
                EmotionsApp is the data controller of your personal data.<br />
                If you have any questions or concerns regarding your data, you may contact us at:
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li><strong>Email</strong>: info@emotionsapp.org</li>
                <li><strong>Phone</strong>: +250786468892</li>
              </ul>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">3. Information We Collect</h3>
              
              <h4 className="text-lg font-semibold text-[#001A41] mb-3 text-left">3.1 Personal Information</h4>
              <p className="mb-3 text-gray-700 text-left">
                We collect the following personal data when you create or update your profile:
              </p>
              <ul className="list-disc pl-5 mb-4 text-gray-700 text-left">
                <li>Full name</li>
                <li>Email address</li>
                <li>Phone number (if provided)</li>
                <li>Login credentials (e.g., username and hashed password)</li>
                <li>Profile photo (optional)</li>
                <li>Emergency contact details</li>
              </ul>
              
              <h4 className="text-lg font-semibold text-[#001A41] mb-3 text-left">3.2 Health and Sensitive Information</h4>
              <p className="mb-3 text-gray-700 text-left">
                As part of our services, we collect data considered sensitive under GDPR:
              </p>
              <ul className="list-disc pl-5 mb-4 text-gray-700 text-left">
                <li>Mood tracking inputs</li>
                <li>Emotional wellness assessments</li>
                <li>Journal entries and reflections</li>
                <li>Notes from therapy or support sessions (if applicable)</li>
                <li>Crisis mode activations</li>
              </ul>
              <p className="mb-6 text-gray-700 text-left">
                We only process this sensitive data based on your <strong>explicit consent</strong>, which you may withdraw at any time.
              </p>
              
              <h4 className="text-lg font-semibold text-[#001A41] mb-3 text-left">3.3 Automatically Collected Information</h4>
              <p className="mb-3 text-gray-700 text-left">
                When you use the app, we automatically collect:
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li>Device information (e.g., device type, OS, browser)</li>
                <li>IP address</li>
                <li>Usage data (e.g., app interactions, error logs)</li>
                <li>Cookies or similar tracking technologies (see section on Cookies)</li>
              </ul>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">4. Legal Basis for Processing</h3>
              <p className="mb-3 text-gray-700 text-left">
                We process your personal data on the following legal bases:
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li><strong>Consent</strong> – for mood tracking, journal entries, and any health-related data.</li>
                <li><strong>Contractual necessity</strong> – to provide you with core services (e.g., account management).</li>
                <li><strong>Legitimate interests</strong> – to analyze and improve our platform.</li>
                <li><strong>Legal obligation</strong> – to comply with applicable laws and regulations.</li>
              </ul>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">5. How We Use Your Information</h3>
              <p className="mb-3 text-gray-700 text-left">
                Your information is used to:
              </p>
              <ul className="list-disc pl-5 mb-4 text-gray-700 text-left">
                <li>Provide and personalize our services</li>
                <li>Analyze emotional wellness patterns (anonymized or aggregated where applicable)</li>
                <li>Improve platform functionality and user experience</li>
                <li>Communicate important updates or support-related information</li>
                <li>Ensure security and integrity of the platform</li>
                <li>Facilitate crisis support or emergency contact when necessary</li>
              </ul>
              <p className="mb-6 text-gray-700 text-left">
                We will <strong>never use your data for marketing purposes</strong> without your explicit opt-in consent.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">6. Data Retention</h3>
              <p className="mb-3 text-gray-700 text-left">
                We retain your personal data only for as long as necessary for the purposes set out in this Privacy Policy.
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li>Account data is retained while your account is active and for a limited period afterward (e.g., 12 months) unless you request deletion earlier.</li>
                <li>Health data is retained only with your ongoing consent.</li>
                <li>Legal and operational records may be retained as required by law.</li>
              </ul>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">7. Data Sharing and Disclosure</h3>
              <p className="mb-3 text-gray-700 text-left">
                We do not sell or rent your data. Your data may be shared with:
              </p>
              <ul className="list-disc pl-5 mb-4 text-gray-700 text-left">
                <li><strong>Healthcare professionals</strong>, therapists, or support staff (only with your explicit consent)</li>
                <li><strong>Service providers and data processors</strong>, such as cloud storage, analytics tools, or customer support tools – bound by strict confidentiality and data protection agreements</li>
                <li><strong>Authorities or regulators</strong> when legally required (e.g., subpoenas or legal investigations)</li>
              </ul>
              <p className="mb-6 text-gray-700 text-left">
                All third-party processors are GDPR-compliant and undergo due diligence.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">8. International Data Transfers</h3>
              <p className="mb-3 text-gray-700 text-left">
                Where data is transferred outside the European Economic Area (EEA), we ensure appropriate safeguards are in place, such as:
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li><strong>EU Standard Contractual Clauses (SCCs)</strong></li>
                <li>Transfers to countries recognized by the European Commission as having adequate data protection laws</li>
              </ul>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">9. Data Security</h3>
              <p className="mb-3 text-gray-700 text-left">
                We implement industry-standard technical and organizational measures, including:
              </p>
              <ul className="list-disc pl-5 mb-4 text-gray-700 text-left">
                <li><strong>Data encryption</strong> (in transit and at rest)</li>
                <li><strong>Access control and user authentication mechanisms</strong></li>
                <li><strong>Regular vulnerability scans and security audits</strong></li>
                <li><strong>Anonymization and pseudonymization where applicable</strong></li>
              </ul>
              <p className="mb-6 text-gray-700 text-left">
                Despite our efforts, no system is completely secure. In the event of a data breach, we will notify affected users and regulators as required by law.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">10. Your Rights Under GDPR</h3>
              <p className="mb-3 text-gray-700 text-left">
                You have the following rights regarding your personal data:
              </p>
              <ul className="list-disc pl-5 mb-4 text-gray-700 text-left">
                <li><strong>Right to access</strong> – You can request a copy of your data.</li>
                <li><strong>Right to rectification</strong> – You can request correction of inaccurate or incomplete data.</li>
                <li><strong>Right to erasure</strong> – You can request deletion of your data ("right to be forgotten").</li>
                <li><strong>Right to restrict processing</strong> – You can ask us to limit how we use your data.</li>
                <li><strong>Right to data portability</strong> – You can receive your data in a portable format.</li>
                <li><strong>Right to object</strong> – You can object to processing based on our legitimate interests.</li>
                <li><strong>Right to withdraw consent</strong> – You can withdraw your consent at any time without affecting the lawfulness of prior processing.</li>
              </ul>
              <p className="mb-6 text-gray-700 text-left">
                To exercise these rights, contact us at: <strong>info@emotionsapp.org</strong>
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">11. Children's Privacy</h3>
              <p className="mb-6 text-gray-700 text-left">
                Our services are intended for users aged <strong>16 and above</strong>. We do not knowingly collect personal data from children without parental consent.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">12. Cookies and Tracking</h3>
              <p className="mb-6 text-gray-700 text-left">
                We use cookies and similar technologies to enhance your experience. You can control or disable cookies in your browser settings. More details are provided in our <strong>Cookie Policy</strong>.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">13. Updates to This Policy</h3>
              <p className="mb-6 text-gray-700 text-left">
                We may update this Privacy Policy from time to time. Changes will be posted on this page and, where appropriate, notified to you via email or app notification. We encourage you to review the policy periodically.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">14. Contact & Complaints</h3>
              <p className="mb-3 text-gray-700 text-left">
                If you have questions or concerns about this Privacy Policy, or wish to lodge a complaint, contact:
              </p>
              <p className="mb-4 text-gray-700 text-left">
                <strong>Email</strong>: info@emotionsapp.org<br />
                <strong>Phone</strong>: +250786468892
              </p>
              <p className="mb-6 text-gray-700 text-left">
                You also have the right to lodge a complaint with your <strong>national data protection authority</strong> if you believe your rights under GDPR have been violated.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 