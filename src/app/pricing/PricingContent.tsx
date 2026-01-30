"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle } from "lucide-react";

const PRICING = {
  starter: {
    monthly: 95,
    annual: 79, // $948/year
  },
  pro: {
    monthly: 239,
    annual: 199, // $2,388/year
  },
};

export default function PricingContent() {
  const [isAnnual, setIsAnnual] = useState(true);

  const starterPrice = isAnnual ? PRICING.starter.annual : PRICING.starter.monthly;
  const proPrice = isAnnual ? PRICING.pro.annual : PRICING.pro.monthly;

  return (
    <>
      {/* Billing Toggle */}
      <div className="flex justify-center mb-10">
        <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
              !isAnnual
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
              isAnnual
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Annual
            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
              Save 17%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
        {/* Free Tier */}
        <Card className="bg-white hover:shadow-lg transition-shadow border-2 border-transparent hover:border-gray-200 relative">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Free</h3>
              <div className="mb-3">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-500 text-sm ml-1">/month</span>
              </div>
              <p className="text-gray-600 text-sm">Try before you commit</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">
                  <strong>{isAnnual ? "36 assessments" : "3 assessments"}</strong> per {isAnnual ? "year" : "month"}
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">Role-specific work simulations</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">AI-powered evaluation</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">Shareable assessment links</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">Community support</span>
              </div>
            </div>

            <Link href="/demo">
              <Button size="lg" variant="outline" className="w-full">
                Get Started Free
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Starter Tier */}
        <Card className="bg-white hover:shadow-lg transition-shadow border-2 border-transparent hover:border-blue-100 relative">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Starter</h3>
              <div className="mb-3">
                <span className="text-4xl font-bold text-gray-900">${starterPrice}</span>
                <span className="text-gray-500 text-sm ml-1">/month</span>
              </div>
              <p className="text-gray-600 text-sm">For small hiring teams</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">
                  <strong>{isAnnual ? "180 assessments" : "15 assessments"}</strong> per {isAnnual ? "year" : "month"}
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">Everything in Free</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">Candidate comparison dashboard</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">Assessment analytics</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">Email support</span>
              </div>
            </div>

            <Link href="/demo">
              <Button size="lg" variant="outline" className="w-full">
                Start Trial
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Pro Tier */}
        <Card className="bg-white hover:shadow-lg transition-shadow border-2 border-blue-200 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-blue-600 text-white border-blue-600 text-xs">Best Value</Badge>
          </div>
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Pro</h3>
              <div className="mb-3">
                <span className="text-4xl font-bold text-gray-900">${proPrice}</span>
                <span className="text-gray-500 text-sm ml-1">/month</span>
              </div>
              <p className="text-gray-600 text-sm">For growing teams</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">
                  <strong>{isAnnual ? "600 assessments" : "50 assessments"}</strong> per {isAnnual ? "year" : "month"}
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">Everything in Starter</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">Custom simulation scenarios</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">Team collaboration tools</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">Priority support</span>
              </div>
            </div>

            <Link href="/demo">
              <Button size="lg" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Start Trial
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Enterprise Tier */}
        <Card className="bg-white hover:shadow-lg transition-shadow border-2 border-transparent hover:border-gray-200 relative">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold mb-3 text-gray-900">Enterprise</h3>
              <div className="mb-3">
                <span className="text-4xl font-bold text-gray-900">Custom</span>
              </div>
              <p className="text-gray-600 text-sm">For teams hiring at scale</p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">
                  <strong>Unlimited</strong> assessments
                </span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">Everything in Pro</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">ATS integration</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">Dedicated success manager</span>
              </div>
              <div className="flex items-start space-x-2">
                <CheckCircle className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700 text-sm">SSO & advanced security</span>
              </div>
            </div>

            <Link href="/demo">
              <Button size="lg" variant="outline" className="w-full">
                Talk to Sales
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
