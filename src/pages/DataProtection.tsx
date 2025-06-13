import { motion } from "framer-motion";
import { useEffect } from "react";

const DataProtection = () => {
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
              Data Protection Policy
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
                Emotions is committed to protecting the personal data of all users of our emotional wellness tracking platform. This Data Protection Policy outlines our practices concerning the collection, storage, and processing of your personal data in accordance with the <strong>General Data Protection Regulation (EU) 2016/679</strong> ("GDPR") and other applicable data protection laws.
              </p>
              <p className="mb-6 text-gray-700 text-left">
                This policy should be read in conjunction with our Privacy Policy, which provides more detailed information about how we handle your data.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">2. Data Protection Principles</h3>
              <p className="mb-4 text-gray-700 text-left">
                We adhere to the following principles when processing your personal data:
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li><strong>Lawfulness, fairness, and transparency</strong>: We process data lawfully, fairly, and in a transparent manner.</li>
                <li><strong>Purpose limitation</strong>: We collect data for specified, explicit, and legitimate purposes.</li>
                <li><strong>Data minimization</strong>: We limit data collection to what is necessary for the intended purposes.</li>
                <li><strong>Accuracy</strong>: We take reasonable steps to ensure personal data is accurate and up to date.</li>
                <li><strong>Storage limitation</strong>: We retain data only as long as necessary for the intended purposes.</li>
                <li><strong>Integrity and confidentiality</strong>: We process data securely to protect against unauthorized access or damage.</li>
                <li><strong>Accountability</strong>: We take responsibility for complying with these principles and can demonstrate compliance.</li>
              </ul>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">3. Data Protection Measures</h3>
              <p className="mb-3 text-gray-700 text-left">
                To protect your personal data, we implement robust technical and organizational measures:
              </p>
              
              <h4 className="text-lg font-semibold text-[#001A41] mb-3 text-left">3.1 Technical Measures</h4>
              <ul className="list-disc pl-5 mb-4 text-gray-700 text-left">
                <li><strong>Encryption</strong>: All sensitive data is encrypted both in transit and at rest.</li>
                <li><strong>Access Controls</strong>: System access is strictly controlled through robust authentication mechanisms.</li>
                <li><strong>Network Security</strong>: We utilize firewalls, intrusion detection systems, and regular security scans.</li>
                <li><strong>Backup Systems</strong>: Regular data backups with secure storage to prevent data loss.</li>
                <li><strong>Regular Updates</strong>: Systems are kept up-to-date with security patches and updates.</li>
              </ul>
              
              <h4 className="text-lg font-semibold text-[#001A41] mb-3 text-left">3.2 Organizational Measures</h4>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li><strong>Staff Training</strong>: Regular data protection and security awareness training for all staff.</li>
                <li><strong>Access Management</strong>: Strict need-to-know basis for data access with proper authorization protocols.</li>
                <li><strong>Data Protection Impact Assessments</strong>: Conducted for high-risk processing activities.</li>
                <li><strong>Internal Audits</strong>: Regular reviews of data protection practices and security measures.</li>
                <li><strong>Documented Procedures</strong>: Clear policies for data breach response, subject access requests, and data retention.</li>
              </ul>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">4. Data Breach Response</h3>
              <p className="mb-3 text-gray-700 text-left">
                In the event of a personal data breach, we will:
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li>Identify and contain the breach as quickly as possible.</li>
                <li>Assess the risk to individuals whose data has been compromised.</li>
                <li>Notify relevant supervisory authorities within 72 hours, where feasible and when required by law.</li>
                <li>Inform affected individuals without undue delay when the breach is likely to result in a high risk to their rights and freedoms.</li>
                <li>Document all breaches, including facts, effects, and remedial actions taken.</li>
                <li>Review and update security measures as necessary following any breach.</li>
              </ul>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">5. Data Subject Rights</h3>
              <p className="mb-3 text-gray-700 text-left">
                We respect and uphold your rights under data protection law, including:
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li><strong>Right to information</strong>: Clear information about how we process your data.</li>
                <li><strong>Right of access</strong>: Obtain confirmation of whether we process your data and request a copy.</li>
                <li><strong>Right to rectification</strong>: Correct inaccurate data and complete incomplete data.</li>
                <li><strong>Right to erasure</strong>: Request deletion of your data under certain circumstances.</li>
                <li><strong>Right to restrict processing</strong>: Limit how we use your data in specific cases.</li>
                <li><strong>Right to data portability</strong>: Receive your data in a structured, commonly used format.</li>
                <li><strong>Right to object</strong>: Object to processing based on legitimate interests or for direct marketing.</li>
                <li><strong>Rights related to automated decision-making</strong>: Safeguards against purely automated decisions with legal effects.</li>
              </ul>
              <p className="mb-6 text-gray-700 text-left">
                To exercise these rights, please contact us at <strong>info@emotionsapp.org</strong>. We will respond to your request within one month, which may be extended by up to two additional months if necessary, considering the complexity and number of requests.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">6. Data Processing Records</h3>
              <p className="mb-6 text-gray-700 text-left">
                We maintain detailed records of all data processing activities, including:
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li>Categories of data subjects and personal data processed</li>
                <li>Purposes of the processing</li>
                <li>Categories of recipients to whom personal data has been or will be disclosed</li>
                <li>Information about international data transfers</li>
                <li>Envisaged time limits for deletion of different categories of data</li>
                <li>Description of technical and organizational security measures</li>
              </ul>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">7. Data Protection Impact Assessments</h3>
              <p className="mb-6 text-gray-700 text-left">
                For processing that is likely to result in high risks to individuals' rights and freedoms, we conduct Data Protection Impact Assessments (DPIAs) to:
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li>Identify and assess potential risks to individuals</li>
                <li>Identify measures to mitigate those risks</li>
                <li>Ensure compliance with data protection requirements</li>
                <li>Document our decision-making process and justify our approach</li>
              </ul>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">8. Data Protection Officer</h3>
              <p className="mb-6 text-gray-700 text-left">
                While not legally required to appoint a Data Protection Officer (DPO), we have designated a Data Protection Coordinator to oversee compliance with data protection laws. You may contact our Data Protection Coordinator at <strong>dpc@emotionsapp.org</strong> for any data protection matters.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">9. International Data Transfers</h3>
              <p className="mb-6 text-gray-700 text-left">
                When transferring personal data outside the European Economic Area (EEA), we implement appropriate safeguards such as:
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li>European Commission's Standard Contractual Clauses</li>
                <li>Binding Corporate Rules for transfers within a corporate group</li>
                <li>Transfers to countries with an adequacy decision from the European Commission</li>
                <li>Explicit consent from the data subject after being informed of the risks</li>
              </ul>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">10. Employee Training</h3>
              <p className="mb-6 text-gray-700 text-left">
                All our employees receive comprehensive training on data protection and security practices, including:
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li>Core principles of data protection</li>
                <li>Individual rights under GDPR and other data protection laws</li>
                <li>Recognizing and reporting data breaches</li>
                <li>Secure data handling procedures</li>
                <li>Confidentiality obligations</li>
                <li>Regular updates on changes to data protection laws and best practices</li>
              </ul>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">11. Third-Party Data Processors</h3>
              <p className="mb-6 text-gray-700 text-left">
                When we engage third-party processors to handle personal data on our behalf, we:
              </p>
              <ul className="list-disc pl-5 mb-6 text-gray-700 text-left">
                <li>Conduct due diligence to ensure they provide sufficient guarantees regarding data protection</li>
                <li>Enter into data processing agreements that specify the processor's obligations</li>
                <li>Require processors to implement appropriate technical and organizational measures</li>
                <li>Regularly review and audit their compliance</li>
                <li>Ensure they only process data in accordance with our documented instructions</li>
              </ul>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">12. Updates to This Policy</h3>
              <p className="mb-6 text-gray-700 text-left">
                We regularly review and update this Data Protection Policy to reflect changes in our practices, technology, and legal requirements. We will notify you of any significant changes through our platform or via email.
              </p>
              
              <hr className="my-8 border-gray-200" />
              
              <h3 className="text-xl font-bold text-[#001A41] mb-4 text-left">13. Contact Information</h3>
              <p className="mb-4 text-gray-700 text-left">
                If you have any questions or concerns about our data protection practices, please contact us at:
              </p>
              <p className="mb-6 text-gray-700 text-left">
                <strong>Email</strong>: info@emotionsapp.org<br />
                <strong>Phone</strong>: +250786468892
              </p>
              <p className="mb-6 text-gray-700 text-left">
                You also have the right to lodge a complaint with your national data protection authority if you believe we have not handled your data in accordance with applicable law.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default DataProtection; 