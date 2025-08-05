'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, FileText, Shield, Clock } from 'lucide-react';

// ===== BEAUTIFUL TEXT LOGO COMPONENT =====
const KareerFitLogo = ({ 
  variant = 'dark', 
  size = 'medium',
  className = '' 
}: { 
  variant?: 'dark' | 'light' | 'white';
  size?: 'small' | 'medium' | 'large';
  className?: string;
}) => {
  const sizeClasses = {
    small: 'text-lg',
    medium: 'text-2xl',
    large: 'text-3xl md:text-4xl'
  };

  const variantClasses = {
    dark: 'text-gray-800',
    light: 'text-white',
    white: 'text-white'
  };

  return (
    <div className={`font-bold ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      <span className="relative">
        KAREER
        <span className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] bg-clip-text text-transparent">
          fit
        </span>
        {/* Decorative dot */}
        <span className="inline-block w-2 h-2 bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] rounded-full ml-1 animate-pulse"></span>
      </span>
    </div>
  );
};

const PrivacyPolicyPage = () => {
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({});
  const [showTOC, setShowTOC] = useState(false);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setShowTOC(false);
    }
  };

  const sections = [
    { id: 'scope', title: '1. Scope and Application' },
    { id: 'data-collect', title: '2. Data We Collect' },
    { id: 'ownership', title: '3. Ownership of Data' },
    { id: 'usage', title: '4. How We Use Your Personal Data' },
    { id: 'legal-basis', title: '5. Legal Basis for Processing' },
    { id: 'disclosure', title: '6. Disclosure of Personal Data' },
    { id: 'storage', title: '7. Data Storage and Security' },
    { id: 'transfers', title: '8. International Data Transfers' },
    { id: 'rights', title: '9. Your Rights Under the PDPA' },
    { id: 'cookies', title: '10. Cookies and Tracking Technologies' },
    { id: 'third-party', title: '11. Third-Party Links and Services' },
    { id: 'development', title: '12. Ongoing Development' },
    { id: 'children', title: '13. Children Privacy' },
    { id: 'changes', title: '14. Changes to This Privacy Policy' },
    { id: 'governing', title: '15. Governing Law' },
    { id: 'contact', title: '16. Contact Us' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <KareerFitLogo variant="dark" size="medium" />
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              <span>Last Updated: July 19, 2025</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="lg:flex lg:gap-8">
          {/* Table of Contents - Desktop Sidebar */}
          <div className="hidden lg:block lg:w-80 lg:flex-shrink-0">
            <div className="sticky top-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
                <div className="flex items-center mb-4">
                  <FileText className="w-5 h-5 text-[#7e43f1] mr-2" />
                  <h3 className="text-lg font-semibold text-gray-800">Table of Contents</h3>
                </div>
                <nav className="space-y-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:text-[#7e43f1] hover:bg-blue-50 rounded-lg transition-colors duration-200"
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Mobile TOC Toggle */}
          <div className="lg:hidden mb-6">
            <button
              onClick={() => setShowTOC(!showTOC)}
              className="w-full bg-white rounded-xl shadow-lg p-4 border border-gray-200 flex items-center justify-between"
            >
              <div className="flex items-center">
                <FileText className="w-5 h-5 text-[#7e43f1] mr-2" />
                <span className="font-semibold text-gray-800">Table of Contents</span>
              </div>
              {showTOC ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {showTOC && (
              <div className="mt-4 bg-white rounded-xl shadow-lg p-4 border border-gray-200">
                <nav className="grid grid-cols-1 gap-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className="text-left px-3 py-2 text-sm text-gray-600 hover:text-[#7e43f1] hover:bg-blue-50 rounded-lg transition-colors duration-200"
                    >
                      {section.title}
                    </button>
                  ))}
                </nav>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-[#38b6ff] to-[#7e43f1] p-6 sm:p-8 text-white">
                <div className="flex items-center mb-4">
                  <Shield className="w-8 h-8 mr-3" />
                  <h1 className="text-3xl sm:text-4xl font-bold">Privacy Policy</h1>
                </div>
                <p className="text-xl text-white/90 mb-4">KAREERfit.com</p>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <p className="text-white/90 leading-relaxed">
                    KAREERfit, a brand of CAREERXPERT SOLUTIONS (SSM Registration No.: 003704811-M) ("KAREERfit," "we," "us," or "our"), is committed to protecting your privacy in accordance with the Personal Data Protection Act 2010 (PDPA) of Malaysia. This Privacy Policy explains how we collect, use, store, disclose, and protect your personal data when you use our website, www.KAREERfit.com (the "Website"), and any services, features, content, or affiliate programs offered online through the Website or offline (collectively, the "Services"). The Services include both free and paid services for KAREERfit Clients, who may make payments for access to certain features, and KAREERfit Affiliates, who may receive payments for commissions earned through the Affiliate Program. This Privacy Policy applies to all users, regardless of their country of residence, and all personal data matters are governed exclusively by Malaysian law.
                  </p>
                  <p className="text-white/90 leading-relaxed mt-4">
                    By using the Services, you consent to the collection, use, and disclosure of your personal data as described in this Privacy Policy. If you do not agree with this Privacy Policy, you must not use the Services.
                  </p>
                </div>
              </div>

              {/* Content Sections */}
              <div className="p-6 sm:p-8 space-y-8">
                {/* Section 1 */}
                <section id="scope" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Scope and Application</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      This Privacy Policy applies to all personal data collected from KAREERfit Clients and KAREERfit Affiliates through the Services, whether online or offline, including both free and paid services. Personal data refers to any information relating to an identified or identifiable individual, as defined under the PDPA. By using the Services, you acknowledge that all data you upload or submit, including personal data, becomes the property of KAREERfit, as outlined in our Terms of Service.
                    </p>
                  </div>
                </section>

                {/* Section 2 */}
                <section id="data-collect" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Data We Collect</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We collect the following types of personal data, depending on your interaction with the Services:
                    </p>
                    
                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">2.1 Information You Provide</h3>
                    <div className="ml-4">
                      <p className="text-gray-700 leading-relaxed mb-3"><strong>KAREERfit Clients:</strong></p>
                      <ul className="list-disc ml-6 text-gray-700 leading-relaxed mb-4">
                        <li><strong>Account Information:</strong> Name, email address, contact number, and, for paid services, payment details (e.g., credit card or bank account information) when you register for an account or make payments for career fit assessments, career guidance, or other premium features.</li>
                        <li><strong>Career-Related Data:</strong> Information provided during career assessments, such as education history, work experience, skills, preferences, resumes, or responses to career-related questions, whether using free or paid services.</li>
                      </ul>

                      <p className="text-gray-700 leading-relaxed mb-3"><strong>KAREERfit Affiliates:</strong></p>
                      <ul className="list-disc ml-6 text-gray-700 leading-relaxed mb-4">
                        <li><strong>Account Information:</strong> Name, email address, contact number, and payment details (e.g., bank account information) for receiving commission payments when you register for the Affiliate Program.</li>
                        <li><strong>Promotional Materials:</strong> Content you create or submit to promote the Services, such as marketing materials or referral links.</li>
                      </ul>

                      <p className="text-gray-700 leading-relaxed">
                        <strong>Other Submissions:</strong> Any additional information you provide through forms, surveys, or communications with us (e.g., feedback, inquiries), whether using free or paid services.
                      </p>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">2.2 Information Collected Automatically</h3>
                    <ul className="list-disc ml-6 text-gray-700 leading-relaxed mb-4">
                      <li><strong>Usage Data:</strong> Information about your interaction with the Services, such as IP address, browser type, device information, pages visited, and time spent on the Website, collected for both free and paid services.</li>
                      <li><strong>Cookies and Tracking Technologies:</strong> We use cookies, web beacons, and similar technologies to enhance user experience, analyze usage, and track referrals (e.g., for Affiliate commission calculations). You may manage cookie preferences through your browser settings, but disabling cookies may affect functionality of both free and paid services.</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">2.3 Information from Third Parties</h3>
                    <p className="text-gray-700 leading-relaxed">
                      We may receive personal data from third-party services, such as payment processors for Client payments or Affiliate commissions, or analytics providers, when you use their services in connection with ours. Such data is processed in accordance with their privacy policies and PDPA compliance.
                    </p>
                  </div>
                </section>

                {/* Section 3 */}
                <section id="ownership" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">3. Ownership of Data</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      All data you upload or submit to the Services, including personal data (e.g., profiles, resumes, assessment responses, or affiliate promotional materials), becomes the property of KAREERfit. By submitting such data, you irrevocably assign all rights, title, and interest in it to KAREERfit and waive any moral rights under the Copyright Act 1987. KAREERfit may use, reproduce, distribute, display, modify, or otherwise exploit this data for any purpose without compensation to you, as outlined in our Terms of Service.
                    </p>
                  </div>
                </section>

                {/* Section 4 */}
                <section id="usage" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">4. How We Use Your Personal Data</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We process your personal data in accordance with the PDPA for the following purposes:
                    </p>
                    <ul className="list-disc ml-6 text-gray-700 leading-relaxed space-y-2">
                      <li><strong>To Provide the Services:</strong><br />
                        For KAREERfit Clients: To deliver career fit assessments, generate career guidance, process payments for paid services, and manage your account for both free and paid services.<br />
                        For KAREERfit Affiliates: To administer the Affiliate Program, track referrals, calculate and disburse commissions, and manage your account.
                      </li>
                      <li><strong>To Improve the Services:</strong> To analyze usage data, conduct research, and enhance the functionality and user experience of both free and paid services.</li>
                      <li><strong>To Communicate:</strong> To respond to inquiries, provide customer support, send service-related updates (e.g., about free or paid features), or notify you of changes to our Terms or Privacy Policy.</li>
                      <li><strong>For Marketing:</strong> To send promotional materials or newsletters (with your consent, where required by the PDPA), including affiliate marketing campaigns for Affiliates.</li>
                      <li><strong>For Payment Processing:</strong> To process payments from KAREERfit Clients for paid services and disburse commissions to KAREERfit Affiliates, including sharing necessary data with payment processors.</li>
                      <li><strong>For Legal Compliance:</strong> To comply with Malaysian laws, such as tax reporting under the Income Tax Act 1967 or data protection obligations under the PDPA.</li>
                    </ul>
                  </div>
                </section>

                {/* Section 5 */}
                <section id="legal-basis" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">5. Legal Basis for Processing</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Under the PDPA, we process your personal data based on:
                    </p>
                    <ul className="list-disc ml-6 text-gray-700 leading-relaxed space-y-2">
                      <li><strong>Consent:</strong> When you provide explicit consent (e.g., by registering for an account, opting into marketing communications, or submitting payment details for paid services or commissions).</li>
                      <li><strong>Contractual Necessity:</strong> When processing is necessary to fulfill our obligations under the Terms of Service or Affiliate Program agreement (e.g., providing career assessments, processing Client payments, or disbursing Affiliate commissions).</li>
                      <li><strong>Legal Obligation:</strong> When required to comply with Malaysian laws.</li>
                      <li><strong>Legitimate Interests:</strong> For purposes such as improving the Services, preventing fraud, or ensuring security, provided these interests do not override your rights.</li>
                    </ul>
                  </div>
                </section>

                {/* Section 6 */}
                <section id="disclosure" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">6. Disclosure of Personal Data</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed mb-4">
                      We may disclose your personal data in the following circumstances, subject to PDPA compliance:
                    </p>
                    <ul className="list-disc ml-6 text-gray-700 leading-relaxed space-y-2">
                      <li><strong>Service Providers:</strong> To third-party service providers (e.g., payment processors for Client payments or Affiliate commissions, hosting providers, analytics services) who assist in delivering the Services, bound by confidentiality and PDPA obligations.</li>
                      <li><strong>Affiliate Program:</strong> For KAREERfit Affiliates, to track referrals and process commission payments, which may involve sharing data with payment platforms.</li>
                      <li><strong>Legal Requirements:</strong> When required by Malaysian law or to respond to legal processes (e.g., court orders, regulatory investigations).</li>
                      <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, where your personal data may be transferred to a third party, subject to PDPA protections.</li>
                      <li><strong>With Your Consent:</strong> When you explicitly agree to the disclosure of your personal data for specific purposes.</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mt-4">
                      We do not sell your personal data to third parties.
                    </p>
                  </div>
                </section>

                {/* Section 7 */}
                <section id="storage" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">7. Data Storage and Security</h2>
                  <div className="prose prose-gray max-w-none">
                    <ul className="list-disc ml-6 text-gray-700 leading-relaxed space-y-2">
                      <li><strong>Storage:</strong> Your personal data is stored on secure servers, which may be located in Malaysia or other jurisdictions, in compliance with the PDPA. We retain personal data only for as long as necessary to fulfill the purposes outlined in this Privacy Policy or as required by Malaysian law (e.g., for payment or commission records).</li>
                      <li><strong>Security:</strong> We implement reasonable technical and organizational measures to protect your personal data from unauthorized access, loss, or alteration, in accordance with PDPA standards. However, no system is completely secure, and we cannot guarantee absolute security.</li>
                    </ul>
                  </div>
                </section>

                {/* Section 8 */}
                <section id="transfers" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">8. International Data Transfers</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      If you are located outside Malaysia, your personal data may be transferred to and processed in Malaysia or other jurisdictions where our service providers operate (e.g., for payment processing or analytics). By using the Services, you consent to such transfers, and we ensure that any international data transfers comply with the PDPA, including implementing appropriate safeguards. All personal data matters are governed exclusively by Malaysian law, regardless of your country of residence.
                    </p>
                  </div>
                </section>

                {/* Section 9 */}
                <section id="rights" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">9. Your Rights Under the PDPA</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed mb-4">
                      As a data subject under the PDPA, you have the following rights, subject to applicable conditions:
                    </p>
                    <ul className="list-disc ml-6 text-gray-700 leading-relaxed space-y-2">
                      <li><strong>Access:</strong> Request access to your personal data held by us.</li>
                      <li><strong>Correction:</strong> Request correction of inaccurate or incomplete personal data.</li>
                      <li><strong>Withdrawal of Consent:</strong> Withdraw consent for processing your personal data, where processing is based on consent (e.g., marketing or optional features), which may affect your ability to use certain free or paid services.</li>
                      <li><strong>Objection:</strong> Object to the processing of your personal data for certain purposes, such as direct marketing.</li>
                      <li><strong>Data Portability:</strong> Request a copy of your personal data in a structured, commonly used format, where applicable.</li>
                    </ul>
                    <p className="text-gray-700 leading-relaxed mt-4">
                      To exercise these rights, contact us at support@KAREERfit.com. We will respond within a reasonable time, as required by the PDPA. Note that, as all data submitted to the Services becomes KAREERfit's property, requests for data deletion may be limited, but we will comply with PDPA obligations.
                    </p>
                  </div>
                </section>

                {/* Section 10 */}
                <section id="cookies" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">10. Cookies and Tracking Technologies</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      We use cookies and similar technologies to enhance user experience, track usage, and support the Affiliate Program (e.g., tracking referrals for commission calculations). These apply to both free and paid services. You can manage cookie preferences through your browser settings, but disabling cookies may limit functionality. We comply with PDPA requirements for obtaining consent for non-essential cookies.
                    </p>
                  </div>
                </section>

                {/* Section 11 */}
                <section id="third-party" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">11. Third-Party Links and Services</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      The Services may contain links to third-party websites or services (e.g., payment processors for Client payments or Affiliate commissions) not controlled by KAREERfit. We are not responsible for their privacy practices. You access such third-party services at your own risk, and any related data processing is subject to their privacy policies.
                    </p>
                  </div>
                </section>

                {/* Section 12 */}
                <section id="development" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">12. Ongoing Development</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      The Services are under ongoing development to improve functionality and user experience. Any personal data collected during this process, whether through free or paid services, is subject to this Privacy Policy. KAREERfit is not responsible for any shortcomings in data processing due to ongoing development, to the extent permitted by Malaysian law.
                    </p>
                  </div>
                </section>

                {/* Section 13 */}
                <section id="children" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">13. Children Privacy</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      The Services are not intended for users under 13 years old. Users under 18 must have parental or guardian consent to use the Services, including free or paid services or the Affiliate Program, as required by the PDPA. If we learn that we have collected personal data from a child under 13 without consent, we will take steps to delete it in accordance with Malaysian law.
                    </p>
                  </div>
                </section>

                {/* Section 14 */}
                <section id="changes" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">14. Changes to This Privacy Policy</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      We may update this Privacy Policy from time to time to reflect changes in our practices, legal requirements, or the addition of new free or paid services. Updates will be posted on the Website, and we will notify you of material changes via email or a notice on the Website. Your continued use of the Services after such changes constitutes your acceptance of the updated Privacy Policy.
                    </p>
                  </div>
                </section>

                {/* Section 15 */}
                <section id="governing" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">15. Governing Law</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      This Privacy Policy and all matters related to your personal data are governed exclusively by the laws of Malaysia, including the Personal Data Protection Act 2010, regardless of your country of residence or location. Any disputes arising from this Privacy Policy will be resolved through mediation or arbitration in Kuala Lumpur, Malaysia, in accordance with the rules of the Asian International Arbitration Centre (AIAC).
                    </p>
                  </div>
                </section>

                {/* Section 16 */}
                <section id="contact">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">16. Contact Us</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed mb-4">
                      If you have questions about this Privacy Policy or wish to exercise your rights under the PDPA, please contact us at:
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <p className="text-gray-700 leading-relaxed">
                        <strong>KAREERfit (CAREERXPERT SOLUTIONS, SSM Registration No.: 003704811-M)</strong><br />
                        Email: hellocoach@KAREERfit.com
                      </p>
                    </div>
                  </div>
                </section>

                {/* Final Notice */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
                  <p className="text-gray-700 leading-relaxed text-center">
                    By using KAREERfit.com or participating in the Affiliate Program, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy, including the application of Malaysian law regardless of your country of residence.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <KareerFitLogo variant="dark" size="medium" className="mb-4" />
            <p className="text-gray-600 text-sm">
              © {new Date().getFullYear()} CAREERXPERT SOLUTIONS (003704811-M). All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicyPage;