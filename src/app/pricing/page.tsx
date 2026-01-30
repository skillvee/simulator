import Link from "next/link";
import { type Metadata } from "next";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/landing/Navigation";
import Footer from "@/components/landing/Footer";
import PricingContent from "./PricingContent";

export const metadata: Metadata = {
  title: "Pricing - Work Simulation Assessments for Technical Hiring",
  description:
    "Start free with 3 assessments/month. Upgrade to Starter ($79/mo), Pro ($199/mo), or Enterprise for unlimited. No per-assessment fees.",
  keywords: [
    "technical assessment pricing",
    "work simulation cost",
    "hiring assessment platform",
    "pre-hire evaluation",
    "technical screening pricing",
    "interview assessment cost",
    "free technical assessment",
    "monthly assessment subscription",
  ],
};

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation currentPage="pricing" />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-white py-20">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-6 leading-tight">
              Simple pricing that scales with you
            </h1>
            <p className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto">
              Start free, upgrade when you need more. No per-assessment fees, no surprises.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
            <PricingContent />

            {/* Value Props */}
            <div className="mt-16 max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">$0</div>
                  <p className="text-gray-600">Setup fees</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">Cancel</div>
                  <p className="text-gray-600">Anytime, no contracts</p>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">14-day</div>
                  <p className="text-gray-600">Free trial on paid plans</p>
                </div>
              </div>
            </div>

            {/* FAQ Teaser */}
            <div className="mt-16 max-w-3xl mx-auto bg-white rounded-xl p-8 border border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                Common Questions
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-gray-900">What counts as an assessment?</p>
                  <p className="text-gray-600 text-sm">Each unique candidate who completes a work simulation counts as one assessment. You can send unlimited invitations.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">What happens if I exceed my monthly limit?</p>
                  <p className="text-gray-600 text-sm">We&apos;ll notify you when you&apos;re approaching your limit. You can upgrade anytime, or purchase additional assessments at $10 each.</p>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Do unused assessments roll over?</p>
                  <p className="text-gray-600 text-sm">Monthly allocations reset each billing cycle. Annual plans get a 20% bonus and more flexibility.</p>
                </div>
              </div>
              <div className="mt-6 text-center">
                <Link href="/faq" className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                  View all FAQs →
                </Link>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-16 text-center">
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  Not sure which plan fits?
                </h3>
                <p className="text-gray-600 mb-6">
                  Start with Free and upgrade when you need more capacity.
                </p>
                <Link href="/demo">
                  <Button variant="outline" className="mr-4">
                    Schedule a Demo
                  </Button>
                </Link>
                <Link href="/faq">
                  <Button variant="outline">
                    View FAQ
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
