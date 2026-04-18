import Link from "next/link";
import { type Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Privacy Policy - Your Data, Your Control | SkillVee",
  description:
    "Learn how SkillVee protects your privacy and handles your data. Our commitment to transparency and data security in AI-powered interview practice.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-stone-200 bg-white/95 px-6 py-4 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            href="/"
            className="font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to Home
          </Link>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 py-16">
        <div className="prose prose-lg max-w-none">
          <h1 className="mb-8 text-4xl font-bold text-stone-900">
            SkillVee Privacy Policy
          </h1>

          <p className="mb-8 text-stone-600">
            At SkillVee, we are committed to protecting the privacy and security
            of our users&apos; personal information. This Privacy Policy
            outlines how we collect, use, and share data provided by individuals
            (&quot;Users&quot;) who use our AI-powered interview platform to
            practice interviews, validate skills, and connect with potential
            employers. By using the SkillVee platform, you acknowledge and
            consent to the data practices described in this Privacy Policy.
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold text-stone-900">
            Information We Collect
          </h2>

          <h3 className="mb-3 mt-6 text-xl font-semibold text-stone-900">
            Personal Information
          </h3>
          <p className="mb-4 text-stone-700">
            We collect personal information you provide directly to us,
            including:
          </p>
          <ul className="mb-6 ml-4 list-inside list-disc text-stone-700">
            <li>Name, email address, and contact information</li>
            <li>Resume, work history, and professional qualifications</li>
            <li>Educational background and certifications</li>
            <li>Skills, competencies, and career preferences</li>
            <li>Salary expectations and job preferences</li>
          </ul>

          <h3 className="mb-3 mt-6 text-xl font-semibold text-stone-900">
            Interview and Assessment Data
          </h3>
          <p className="mb-4 text-stone-700">
            When you use our AI interview platform, we collect:
          </p>
          <ul className="mb-6 ml-4 list-inside list-disc text-stone-700">
            <li>Video and audio recordings of practice interviews</li>
            <li>Transcriptions of your responses and conversations</li>
            <li>
              Screen recordings and shared content during technical assessments
            </li>
            <li>AI-generated performance evaluations and feedback</li>
            <li>
              Response times, interaction patterns, and platform usage data
            </li>
          </ul>

          <h3 className="mb-3 mt-6 text-xl font-semibold text-stone-900">
            Technical Data
          </h3>
          <p className="mb-6 text-stone-700">
            We automatically collect technical information including IP
            addresses, browser type, device information, operating system, and
            usage analytics to improve platform performance and user experience.
          </p>

          <h3 className="mb-3 mt-6 text-xl font-semibold text-stone-900">
            Google Sign-In Data
          </h3>
          <p className="mb-4 text-stone-700">
            When you sign in using Google, we receive the following information
            from your Google account:
          </p>
          <ul className="mb-4 ml-4 list-inside list-disc text-stone-700">
            <li>Your email address</li>
            <li>Your name (first and last)</li>
            <li>Your profile picture URL</li>
          </ul>
          <p className="mb-4 text-stone-700">
            This information is used solely to create and authenticate your
            SkillVee account and personalize your experience. We do not access
            your Google Drive, Gmail, Google Calendar, or any other Google
            services data.
          </p>
          <p className="mb-6 text-stone-700">
            You can revoke SkillVee&apos;s access to your Google account at any
            time through your Google Account settings at{" "}
            <a
              href="https://myaccount.google.com/permissions"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              https://myaccount.google.com/permissions
            </a>
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold text-stone-900">
            How We Use Your Data
          </h2>

          <h3 className="mb-3 mt-6 text-xl font-semibold text-stone-900">
            Core Platform Services
          </h3>
          <ul className="mb-6 ml-4 list-inside list-disc text-stone-700">
            <li>
              Conducting AI-powered interview simulations and assessments
            </li>
            <li>Providing personalized feedback and performance analytics</li>
            <li>Validating and certifying your demonstrated skills</li>
            <li>Creating professional profiles for employer matching</li>
            <li>
              Facilitating connections between candidates and hiring companies
            </li>
          </ul>

          <h3 className="mb-3 mt-6 text-xl font-semibold text-stone-900">
            Platform Improvement
          </h3>
          <p className="mb-6 text-stone-700">
            We may use aggregated and anonymized interview data to improve our
            AI models, assessment accuracy, and platform functionality. This
            helps us provide better interview simulations and more accurate
            skill evaluations.
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold text-stone-900">
            Data Usage and Sharing
          </h2>

          <h3 className="mb-3 mt-6 text-xl font-semibold text-stone-900">
            Third-Party AI Services
          </h3>
          <p className="mb-4 text-stone-700">
            Your interview recordings, transcriptions, and assessment data may
            be processed by external AI services, including large language model
            providers (such as Google&apos;s Gemini AI), for evaluation and
            analysis purposes. These services help us provide accurate feedback
            and skill assessments.
          </p>

          <h3 className="mb-3 mt-6 text-xl font-semibold text-stone-900">
            Employer Access
          </h3>
          <p className="mb-4 text-stone-700">
            When you participate in our job matching program, the following
            information may be shared with potential employers:
          </p>
          <ul className="mb-6 ml-4 list-inside list-disc text-stone-700">
            <li>Your professional profile, resume, and qualifications</li>
            <li>Validated skill assessments and performance metrics</li>
            <li>
              Interview recordings and transcriptions (with your explicit
              consent)
            </li>
            <li>
              AI-generated professional photos derived from interview footage
            </li>
            <li>Salary expectations and job preferences</li>
          </ul>

          <h3 className="mb-3 mt-6 text-xl font-semibold text-stone-900">
            Professional Profile Enhancement
          </h3>
          <p className="mb-6 text-stone-700">
            We may use images from your interview sessions to generate
            high-quality, professional photos for your profile. This process may
            involve third-party image processing APIs to create polished
            headshots that present you professionally to potential employers.
          </p>

          <h3 className="mb-3 mt-6 text-xl font-semibold text-stone-900">
            External Profile Information
          </h3>
          <p className="mb-6 text-stone-700">
            To provide a comprehensive view to employers, we may supplement your
            profile with publicly available professional information from
            platforms like LinkedIn, GitHub, or personal websites where you
            maintain a presence.
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold text-stone-900">
            Data Security and Protection
          </h2>
          <p className="mb-6 text-stone-700">
            We implement industry-standard security measures to protect your
            personal information, including encryption, secure data
            transmission, access controls, and regular security audits. However,
            no system is completely secure, and we cannot guarantee absolute
            security of data transmitted over the internet.
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold text-stone-900">
            Data Retention
          </h2>
          <p className="mb-6 text-stone-700">
            We retain your personal information and interview data for as long
            as necessary to provide our services, comply with legal obligations,
            and fulfill the purposes outlined in this policy. Interview
            recordings and assessments may be retained indefinitely to maintain
            the integrity of skill validations and employer references.
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold text-stone-900">
            Your Rights and Choices
          </h2>

          <h3 className="mb-3 mt-6 text-xl font-semibold text-stone-900">
            Data Access and Portability
          </h3>
          <p className="mb-4 text-stone-700">You have the right to:</p>
          <ul className="mb-6 ml-4 list-inside list-disc text-stone-700">
            <li>Access and review your personal data stored on our platform</li>
            <li>Request a copy of your data in a portable format</li>
            <li>Update or correct inaccurate information in your profile</li>
          </ul>

          <h3 className="mb-3 mt-6 text-xl font-semibold text-stone-900">
            Data Deletion
          </h3>
          <p className="mb-4 text-stone-700">
            If you wish to have your data deleted from SkillVee&apos;s systems,
            you may submit a request through our support channels. We will
            comply with such requests in accordance with applicable laws and
            regulations.
          </p>
          <p className="mb-6 text-stone-700">
            <strong>Important Note:</strong> Certain data may be retained for
            legal, regulatory, or business purposes even after a deletion
            request, including data needed to honor existing employer
            commitments, skill validations, or comply with legal obligations.
          </p>

          <h3 className="mb-3 mt-6 text-xl font-semibold text-stone-900">
            Opt-Out Options
          </h3>
          <p className="mb-6 text-stone-700">
            You can opt out of certain data uses, including job matching
            services and marketing communications, through your account settings
            or by contacting our support team.
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold text-stone-900">
            Cookies and Tracking
          </h2>
          <p className="mb-6 text-stone-700">
            We use cookies and similar technologies to enhance your experience,
            remember your preferences, and analyze platform usage. You can
            control cookie settings through your browser preferences, though
            some features may not function properly with cookies disabled.
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold text-stone-900">
            International Data Transfers
          </h2>
          <p className="mb-6 text-stone-700">
            Your information may be transferred to and processed in countries
            other than your country of residence. We ensure appropriate
            safeguards are in place to protect your data in accordance with
            applicable privacy laws.
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold text-stone-900">
            Changes to This Policy
          </h2>
          <p className="mb-6 text-stone-700">
            We may update this Privacy Policy periodically to reflect changes in
            our practices or legal requirements. We will notify you of
            significant changes through email or platform notifications and
            encourage you to review this policy regularly.
          </p>

          <h2 className="mb-4 mt-8 text-2xl font-semibold text-stone-900">
            Contact Information
          </h2>
          <p className="mb-6 text-stone-700">
            If you have questions about this Privacy Policy or our data
            practices, please contact us through our support channels or privacy
            inquiry form available on our platform.
          </p>

          <hr className="my-8 border-stone-300" />

          <p className="text-sm italic text-stone-500">
            <strong>Last Updated:</strong> November 26, 2025
            <br />
            By using SkillVee, you acknowledge that you have read, understood,
            and agree to the collection, use, and sharing of your information as
            described in this Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
