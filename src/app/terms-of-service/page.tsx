'use client';

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, FileText, Scale, Clock } from 'lucide-react';

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

const TermsOfServicePage = () => {
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
    { id: 'acceptance', title: '1. Acceptance of Terms' },
    { id: 'changes', title: '2. Changes to Terms' },
    { id: 'user-types', title: '3. User Types and Eligibility' },
    { id: 'affiliate-program', title: '4. Affiliate Program' },
    { id: 'user-content', title: '5. User Content and Ownership' },
    { id: 'intellectual-property', title: '6. Intellectual Property' },
    { id: 'privacy', title: '7. Privacy' },
    { id: 'third-party', title: '8. Third-Party Links and Services' },
    { id: 'termination', title: '9. Termination' },
    { id: 'disclaimers', title: '10. Disclaimers' },
    { id: 'development', title: '11. Ongoing Development' },
    { id: 'limitation', title: '12. Limitation of Liability' },
    { id: 'tax-obligations', title: '13. Tax Obligations' },
    { id: 'indemnification', title: '14. Indemnification' },
    { id: 'governing-law', title: '15. Governing Law and Dispute Resolution' },
    { id: 'international', title: '16. International Users' },
    { id: 'employment', title: '17. Non-Employment Relationship' },
    { id: 'miscellaneous', title: '18. Miscellaneous' },
    { id: 'contact', title: '19. Contact Us' }
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
                  <Scale className="w-8 h-8 mr-3" />
                  <h1 className="text-3xl sm:text-4xl font-bold">Terms of Service</h1>
                </div>
                <p className="text-xl text-white/90 mb-4">KAREERfit.com</p>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <p className="text-white/90 leading-relaxed">
                    Welcome to KAREERfit, a brand of CAREERXPERT SOLUTIONS (SSM Registration No.: 003704811-M) ("KAREERfit," "we," "us," or "our"). These Terms of Service ("Terms") govern your access to and use of our website, www.KAREERfit.com (the "Website"), and any services, features, content, or affiliate programs offered online through the Website or offline (collectively, the "Services"). KAREERfit provides Services to two types of users: (1) KAREERfit Clients, who pay to use the Services for career fit assessments or guidance, and (2) KAREERfit Affiliates, who voluntarily participate in the Affiliate Program to generate income based on agreed arrangements and rates. Neither KAREERfit Clients nor KAREERfit Affiliates are workers or employees of KAREERfit. By accessing or using the Services, you agree to be bound by these Terms and, regardless of your country of residence, to have all matters related to the Services governed exclusively by the laws of Malaysia. If you do not agree with these Terms, you must not use the Services.
                  </p>
                </div>
              </div>

              {/* Content Sections */}
              <div className="p-6 sm:p-8 space-y-8">
                {/* Section 1 */}
                <section id="acceptance" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">1. Acceptance of Terms</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      By accessing or using the Services, you confirm that you have the legal capacity to enter into these Terms under the Contracts Act 1950 and are at least 13 years old, as required for lawful participation in online services under Malaysian law, including the Personal Data Protection Act 2010. If you are using the Services on behalf of an organization (e.g., as a KAREERfit Affiliate), you represent that you have the authority to bind that organization to these Terms. By using the Services, you agree that, irrespective of your country of residence or location, all disputes, rights, and obligations arising from these Terms or the Services will be governed exclusively by Malaysian law.
                    </p>
                  </div>
                </section>

                {/* Section 2 */}
                <section id="changes" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">2. Changes to Terms</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      We reserve the right to modify or update these Terms at any time. Changes will be effective upon posting to the Website, with notification provided via email or a notice on the Website for material changes. Your continued use of the Services after such changes constitutes your acceptance of the updated Terms.
                    </p>
                  </div>
                </section>

                {/* Section 3 */}
                <section id="user-types" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">3. User Types and Eligibility</h2>
                  <div className="prose prose-gray max-w-none">
                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">3.1 KAREERfit Clients</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      KAREERfit Clients are individuals or organizations who pay to access the Services for career fit assessments, career guidance, or related features. Clients must be at least 13 years old to use the Services, as per Malaysian law governing online service usage. KAREERfit Clients are not workers or employees of KAREERfit, and their use of the Services is governed by these Terms and Malaysian law, regardless of their country of residence.
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">3.2 KAREERfit Affiliates</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      KAREERfit Affiliates are individuals or organizations who voluntarily participate in the KAREERfit Affiliate Program to generate income by promoting the Services, based on agreed arrangements and commission rates. Affiliates must be at least 13 years old to participate. KAREERfit Affiliates are not workers or employees of KAREERfit, and their participation is governed by these Terms and Malaysian law, regardless of their country of residence.
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">3.3 General Eligibility</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Both KAREERfit Clients and Affiliates must comply with these Terms and all applicable Malaysian laws, including the Contracts Act 1950, Personal Data Protection Act 2010, and Consumer Protection Act 1999. Users under 18 must have parental or guardian consent to use the Services, as required by Malaysian law.
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">3.4 Account Registration</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      To access certain features of the Services, such as career assessments for Clients or the Affiliate Program for Affiliates, you must create an account. You agree to provide accurate, current, and complete information during registration and to keep your account information updated. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">3.5 Prohibited Conduct</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Both KAREERfit Clients and Affiliates agree not to:
                    </p>
                    <ul className="list-disc ml-6 text-gray-700 leading-relaxed space-y-1">
                      <li>Use the Services for any unlawful purpose or in violation of Malaysian laws, including the Contracts Act 1950, Personal Data Protection Act 2010, or Consumer Protection Act 1999.</li>
                      <li>Attempt to gain unauthorized access to any portion of the Services or related systems.</li>
                      <li>Interfere with or disrupt the operation of the Services, including by introducing viruses or harmful code.</li>
                      <li>Use the Services to harass, abuse, or harm others.</li>
                      <li>Reproduce, distribute, or modify any part of the Services without our prior written consent.</li>
                    </ul>
                  </div>
                </section>

                {/* Section 4 */}
                <section id="affiliate-program" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">4. Affiliate Program</h2>
                  <div className="prose prose-gray max-w-none">
                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">4.1 Eligibility</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Individuals and organizations may participate in the KAREERfit Affiliate Program ("Affiliate Program") provided they are at least 13 years old and comply with Malaysian law. Affiliates must register for an affiliate account and agree to these Terms. Participation in the Affiliate Program does not establish an employment relationship with KAREERfit.
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">4.2 Affiliate Responsibilities</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      As a KAREERfit Affiliate, you agree to:
                    </p>
                    <ul className="list-disc ml-6 text-gray-700 leading-relaxed space-y-1 mb-4">
                      <li>Promote KAREERfit's Services in a lawful and ethical manner, adhering to Malaysian advertising standards and the Consumer Protection Act 1999.</li>
                      <li>Avoid using deceptive, misleading, or false marketing practices, including spamming or unsolicited communications.</li>
                      <li>Disclose your affiliate relationship with KAREERfit in all promotional materials, as required by applicable Malaysian laws.</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">4.3 Affiliate Commissions</h3>
                    <ul className="list-disc ml-6 text-gray-700 leading-relaxed space-y-2 mb-4">
                      <li>Affiliates will earn commissions based on valid referrals leading to completed transactions (e.g., paid subscriptions by KAREERfit Clients) through the Services, as outlined in the Affiliate Program agreement.</li>
                      <li>Commission rates and payment schedules will be agreed upon separately and communicated to Affiliates upon enrollment.</li>
                      <li>KAREERfit is not liable for any tax obligations arising from commissions or other payments, including income tax or service tax under the Income Tax Act 1967 or Service Tax Act 2018. Affiliates are solely responsible for reporting and paying any applicable taxes in Malaysia or their country of residence.</li>
                      <li>KAREERfit reserves the right to withhold or reverse commissions for referrals that violate these Terms or involve fraudulent activity.</li>
                    </ul>

                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">4.4 Affiliate Termination</h3>
                    <p className="text-gray-700 leading-relaxed">
                      KAREERfit may terminate your participation in the Affiliate Program at our discretion, with or without notice, if you violate these Terms, engage in prohibited conduct, or fail to comply with Malaysian laws. Upon termination, you will cease all promotional activities and forfeit any unpaid commissions.
                    </p>
                  </div>
                </section>

                {/* Section 5 */}
                <section id="user-content" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">5. User Content and Ownership</h2>
                  <div className="prose prose-gray max-w-none">
                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">5.1 Ownership by KAREERfit</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Any content or data you upload or submit to the Services, including but not limited to profiles, resumes, career assessment responses, or promotional materials as an Affiliate ("User Content"), becomes the property of KAREERfit. By submitting User Content, you irrevocably assign all rights, title, and interest in such content to KAREERfit, and you waive any moral rights under the Copyright Act 1987. KAREERfit may use, reproduce, distribute, display, modify, or otherwise exploit User Content for any purpose without compensation to you.
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">5.2 Responsibility</h3>
                    <p className="text-gray-700 leading-relaxed">
                      You are solely responsible for ensuring that your User Content complies with Malaysian laws, including the Personal Data Protection Act 2010 and the Defamation Act 1957, and does not infringe on any third-party rights. KAREERfit reserves the right to remove or modify any User Content that violates these Terms or is otherwise objectionable.
                    </p>
                  </div>
                </section>

                {/* Section 6 */}
                <section id="intellectual-property" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">6. Intellectual Property</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      All content, trademarks, logos, and other materials available through the Services, excluding User Content, are the property of KAREERfit, a brand of CAREERXPERT SOLUTIONS (SSM Registration No.: 003704811-M), or its licensors and are protected by Malaysian copyright, trademark, and intellectual property laws, including the Copyright Act 1987. You may not use, copy, or distribute any such materials without our prior written consent.
                    </p>
                  </div>
                </section>

                {/* Section 7 */}
                <section id="privacy" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">7. Privacy</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      Your use of the Services is subject to our Privacy Policy, available at www.KAREERfit.com/privacy-policy. We comply with the Personal Data Protection Act 2010, ensuring that your personal data is collected, processed, and stored with your consent and for lawful purposes. By using the Services, you consent to the collection, use, and sharing of your information as described in the Privacy Policy, and you agree that all data-related matters are governed by Malaysian law, regardless of your location.
                    </p>
                  </div>
                </section>

                {/* Section 8 */}
                <section id="third-party" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">8. Third-Party Links and Services</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      The Services may contain links to third-party websites or services not owned or controlled by KAREERfit. We are not responsible for the content, policies, or practices of such third-party websites or services. You access them at your own risk, and any related disputes will be subject to Malaysian law.
                    </p>
                  </div>
                </section>

                {/* Section 9 */}
                <section id="termination" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">9. Termination</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      We may suspend or terminate your access to the Services or Affiliate Program at our sole discretion, with or without notice, if you violate these Terms or applicable Malaysian laws. Upon termination, your right to use the Services will cease, and we may delete your account and User Content.
                    </p>
                  </div>
                </section>

                {/* Section 10 */}
                <section id="disclaimers" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">10. Disclaimers</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      The Services, whether provided online or offline, are provided on an "as is" and "as available" basis without warranties of any kind, whether express or implied, to the extent permitted by Malaysian law, including the Contracts Act 1950. We do not guarantee that the Services will be uninterrupted, error-free, or secure.
                    </p>
                  </div>
                </section>

                {/* Section 11 */}
                <section id="development" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">11. Ongoing Development</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      The Services are subject to ongoing development and improvement. KAREERfit is not responsible for any shortcomings, limitations, or issues arising from the ongoing development of the Services, including but not limited to temporary unavailability, incomplete features, or technical errors, to the extent permitted by Malaysian law.
                    </p>
                  </div>
                </section>

                {/* Section 12 */}
                <section id="limitation" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">12. Limitation of Liability</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      To the fullest extent permitted by Malaysian law, KAREERfit, CAREERXPERT SOLUTIONS, and its affiliates, officers, directors, employees, and agents will not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or data, arising out of or in connection with your use of the Services, including any shortcomings due to ongoing development. Our total liability for any claim arising from these Terms or the Services will not exceed the amount you paid to us, if any, for the use of the Services in the six months prior to the claim.
                    </p>
                  </div>
                </section>

                {/* Section 13 */}
                <section id="tax-obligations" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">13. Tax Obligations</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      KAREERfit is not liable for any tax obligations arising from your use of the Services, including but not limited to income tax, service tax, or other taxes under the Income Tax Act 1967 or Service Tax Act 2018. Both KAREERfit Clients and Affiliates are solely responsible for reporting and paying any applicable taxes in Malaysia or their country of residence.
                    </p>
                  </div>
                </section>

                {/* Section 14 */}
                <section id="indemnification" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">14. Indemnification</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      You agree to indemnify, defend, and hold harmless KAREERfit, CAREERXPERT SOLUTIONS, and its affiliates, officers, directors, employees, and agents from any claims, liabilities, damages, losses, or expenses, including reasonable legal fees, arising out of your use of the Services, your User Content, your participation in the Affiliate Program, or your violation of these Terms or Malaysian laws, regardless of your country of residence.
                    </p>
                  </div>
                </section>

                {/* Section 15 */}
                <section id="governing-law" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">15. Governing Law and Dispute Resolution</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      These Terms and all matters arising from or related to the Services, whether online or offline, are governed exclusively by the laws of Malaysia, including the Contracts Act 1950, Personal Data Protection Act 2010, and Consumer Protection Act 1999, without regard to conflict of laws principles, regardless of your country of residence or location. Any disputes arising under these Terms will be resolved through mediation or arbitration in Kuala Lumpur, Malaysia, in accordance with the rules of the Asian International Arbitration Centre (AIAC). You waive any right to participate in a class action lawsuit or class-wide arbitration.
                    </p>
                  </div>
                </section>

                {/* Section 16 */}
                <section id="international" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">16. International Users</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Regardless of your country of residence or location, by accessing or using the Services, you agree that:
                    </p>
                    <ul className="list-disc ml-6 text-gray-700 leading-relaxed space-y-1">
                      <li>All disputes, rights, and obligations arising from these Terms or the Services are governed exclusively by Malaysian law.</li>
                      <li>Any legal proceedings will take place in Malaysia, as outlined in Section 15.</li>
                      <li>You are responsible for ensuring that your use of the Services complies with any applicable local laws in your jurisdiction, but such local laws will not supersede or alter the application of Malaysian law to these Terms or the Services.</li>
                    </ul>
                  </div>
                </section>

                {/* Section 17 */}
                <section id="employment" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">17. Non-Employment Relationship</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed">
                      Neither KAREERfit Clients nor KAREERfit Affiliates are considered workers, employees, or agents of KAREERfit or CAREERXPERT SOLUTIONS. Your use of the Services or participation in the Affiliate Program does not create an employment relationship under the Employment Act 1955 or any other Malaysian law. Accordingly, KAREERfit is not responsible for providing employment-related benefits.
                    </p>
                  </div>
                </section>

                {/* Section 18 */}
                <section id="miscellaneous" className="border-b border-gray-200 pb-8">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">18. Miscellaneous</h2>
                  <div className="prose prose-gray max-w-none">
                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">18.1 Entire Agreement</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      These Terms, together with the Privacy Policy and any Affiliate Program agreement, constitute the entire agreement between you and KAREERfit regarding the use of the Services.
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">18.2 Severability</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      If any provision of these Terms is found to be invalid or unenforceable under Malaysian law, the remaining provisions will remain in full force and effect.
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">18.3 No Waiver</h3>
                    <p className="text-gray-700 leading-relaxed mb-4">
                      Our failure to enforce any right or provision of these Terms will not constitute a waiver of such right or provision.
                    </p>

                    <h3 className="text-lg font-semibold text-gray-800 mt-6 mb-3">18.4 Assignment</h3>
                    <p className="text-gray-700 leading-relaxed">
                      You may not assign or transfer your rights or obligations under these Terms without our prior written consent. We may assign or transfer these Terms at our discretion.
                    </p>
                  </div>
                </section>

                {/* Section 19 */}
                <section id="contact">
                  <h2 className="text-2xl font-bold text-gray-800 mb-4">19. Contact Us</h2>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-gray-700 leading-relaxed mb-4">
                      If you have any questions about these Terms, please contact us at:
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
                    By using KAREERfit.com or participating in the Affiliate Program, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service, including the application of Malaysian law regardless of your country of residence.
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

export default TermsOfServicePage;