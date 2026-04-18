import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CandidateTermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-stone-200 px-6 py-4 backdrop-blur-sm bg-white/95">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/terms" className="text-blue-600 hover:text-blue-700 font-medium">
            ← Back to Terms
          </Link>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="prose prose-lg max-w-none">
          <h1 className="text-4xl font-bold text-stone-900 mb-8">
            SkillVee Candidate Terms of Service
          </h1>

          <p className="text-stone-600 mb-8">
            This Agreement is made between the individual using our platform (&apos;Candidate&apos;) and SkillVee Corporation (&apos;SkillVee&apos;).
            Candidates may access interview practice, skill validation, and job placement services through our AI-powered platform.
          </p>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">1. Platform Usage and Account</h2>
          <p className="text-stone-700 mb-4">
            Candidates agree to use the SkillVee platform for legitimate career development and job-seeking purposes. By creating an account, you warrant that:
          </p>
          <ul className="list-disc list-inside text-stone-700 mb-6 ml-4">
            <li>All information provided is accurate and truthful</li>
            <li>You are the authorized owner of your credentials and work samples</li>
            <li>You will maintain the security of your account credentials</li>
            <li>You will not share your account with others or create multiple accounts</li>
          </ul>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">2. Assessment and Interview Conduct</h2>
          <p className="text-stone-700 mb-4">
            When participating in assessments, practice interviews, or company evaluations, Candidates agree to:
          </p>
          <ul className="list-disc list-inside text-stone-700 mb-6 ml-4">
            <li>Complete assessments independently without unauthorized assistance</li>
            <li>Consent to screen and audio/video recording during evaluation sessions</li>
            <li>Represent their own skills and experience authentically</li>
            <li>Not attempt to manipulate, cheat, or circumvent the AI evaluation systems</li>
            <li>Maintain professional conduct during all platform interactions</li>
          </ul>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">3. Platform-Exclusive Communications</h2>
          <p className="text-stone-700 mb-4">
            When introduced to a Company through SkillVee, Candidates agree to conduct all initial communications, interview scheduling,
            and hiring discussions exclusively through the SkillVee platform.
          </p>
          <p className="text-stone-700 mb-6">
            This includes refraining from directly contacting Companies outside the platform until a formal offer has been extended and
            the placement has been properly recorded through SkillVee.
          </p>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">4. Non-Circumvention Agreement</h2>
          <p className="text-stone-700 mb-4">
            SkillVee invests significant resources in connecting Candidates with employment opportunities. Candidates acknowledge this
            investment and agree not to circumvent the platform when engaging with Companies introduced through SkillVee.
          </p>
          <p className="text-stone-700 mb-4">
            For a period of <strong>12 months</strong> following an introduction to a Company through SkillVee, Candidates agree not to:
          </p>
          <ul className="list-disc list-inside text-stone-700 mb-6 ml-4">
            <li>Directly apply to or contact the Company outside the platform to circumvent placement fees</li>
            <li>Accept employment with the Company without completing the SkillVee placement process</li>
            <li>Refer other candidates to the Company as a means of circumvention</li>
          </ul>
          <p className="text-stone-700 mb-6">
            Violations may result in account termination and legal action to recover applicable placement fees.
          </p>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">5. Data Usage and Privacy</h2>
          <p className="text-stone-700 mb-4">
            By using SkillVee, Candidates consent to the collection and use of their data as follows:
          </p>
          <ul className="list-disc list-inside text-stone-700 mb-6 ml-4">
            <li>Profile information, resume, and portfolio materials may be shared with Companies for evaluation purposes</li>
            <li>Assessment recordings, screen captures, and AI-generated insights become part of your SkillVee profile</li>
            <li>Anonymized performance data may be used to improve our AI systems and platform</li>
            <li>Communication logs within the platform may be reviewed for quality assurance and dispute resolution</li>
          </ul>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">6. Your Rights to Your Data</h2>
          <p className="text-stone-700 mb-4">Candidates retain the following rights regarding their personal data:</p>
          <ul className="list-disc list-inside text-stone-700 mb-6 ml-4">
            <li>Request access to all data SkillVee holds about you</li>
            <li>Request correction of inaccurate information</li>
            <li>Request deletion of your account and associated data (subject to legal retention requirements)</li>
            <li>Withdraw consent for future data processing (may limit platform functionality)</li>
            <li>Export your profile data in a portable format</li>
          </ul>
          <p className="text-stone-700 mb-6">
            Data deletion requests will be processed within 30 days. Note that some data may be retained for legal compliance or
            ongoing business obligations with Companies.
          </p>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">7. Intellectual Property</h2>
          <p className="text-stone-700 mb-4">
            Candidates retain ownership of their original work, including code samples, portfolio pieces, and other materials submitted
            to the platform. However, by submitting materials, Candidates grant SkillVee a license to:
          </p>
          <ul className="list-disc list-inside text-stone-700 mb-6 ml-4">
            <li>Display materials to Companies for evaluation purposes</li>
            <li>Use anonymized code samples to improve AI assessment systems</li>
            <li>Store and process materials as necessary for platform operation</li>
          </ul>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">8. Free Services and Paid Features</h2>
          <p className="text-stone-700 mb-6">
            SkillVee provides core interview practice and job placement services at no cost to Candidates. Premium features,
            enhanced visibility, or additional services may be offered for a fee and will be clearly disclosed before purchase.
          </p>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">9. Prohibited Conduct</h2>
          <p className="text-stone-700 mb-4">Candidates agree not to:</p>
          <ul className="list-disc list-inside text-stone-700 mb-6 ml-4">
            <li>Provide false or misleading information about their qualifications</li>
            <li>Use automated tools to interact with the platform without authorization</li>
            <li>Attempt to access other users&apos; accounts or data</li>
            <li>Share confidential assessment content or Company information with third parties</li>
            <li>Use the platform for any unlawful purpose</li>
          </ul>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">10. Account Termination</h2>
          <p className="text-stone-700 mb-4">
            Either party may terminate this agreement at any time. Candidates may delete their account through account settings.
            SkillVee may terminate accounts for violations of these terms. Upon termination:
          </p>
          <ul className="list-disc list-inside text-stone-700 mb-6 ml-4">
            <li>Non-circumvention obligations remain in effect for the specified period</li>
            <li>Data will be deleted per our retention policy unless legally required otherwise</li>
            <li>Access to the platform and all services will be revoked</li>
          </ul>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">11. Limitation of Liability</h2>
          <p className="text-stone-700 mb-6">
            SkillVee provides the platform &quot;as is&quot; and does not guarantee employment outcomes. We are not responsible for
            hiring decisions made by Companies, interview outcomes, or career impacts resulting from platform use. Our liability
            is limited to the fees paid by the Candidate, if any, in the 12 months preceding any claim.
          </p>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">12. Modification of Terms</h2>
          <p className="text-stone-700 mb-6">
            SkillVee reserves the right to modify these Terms of Service with 30 days notice to Candidates via email or platform
            notification. Continued use of the platform after the notice period constitutes acceptance of revised terms.
          </p>

          <h2 className="text-2xl font-semibold text-stone-900 mt-8 mb-4">13. Governing Law and Disputes</h2>
          <p className="text-stone-700 mb-6">
            This agreement shall be governed by the laws of the State of California, USA. Any disputes will be resolved through
            binding arbitration, with the prevailing party entitled to reasonable attorneys&apos; fees.
          </p>

          <hr className="my-8 border-stone-300" />

          <p className="text-sm text-stone-500 italic">
            <strong>Last Updated:</strong> November 26, 2025<br/>
            By using SkillVee&apos;s platform, you acknowledge acceptance of these Terms of Service and agree to be legally bound by their provisions.
          </p>
        </div>
      </div>
    </div>
  );
}
