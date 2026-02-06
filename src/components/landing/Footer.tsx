import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="relative bg-slate-900 text-slate-300 py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="mb-4">
              <Image
                src="/skillvee-logo.png"
                alt="Skillvee"
                width={120}
                height={32}
                className="object-contain brightness-0 invert"
              />
            </div>
            <p className="text-blue-200/80 mb-4">
              See how candidates actually work before you hire them.
            </p>
            <p className="text-blue-200/80">
              <a href="mailto:hi@skillvee.com" className="hover:text-white transition-colors">
                hi@skillvee.com
              </a>
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-white">Product</h3>
            <ul className="space-y-2 text-blue-200/70">
              <li>
                <Link href="/product" className="hover:text-white transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/demo" className="hover:text-white transition-colors">
                  Request Demo
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-white transition-colors">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-white">Resources</h3>
            <ul className="space-y-2 text-blue-200/70">
              <li>
                <Link href="/interview-questions" className="hover:text-white transition-colors">
                  Question Bank
                </Link>
              </li>
              <li>
                <Link href="/interview-guides" className="hover:text-white transition-colors">
                  Interview Guides
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 text-white">Legal</h3>
            <ul className="space-y-2 text-blue-200/70">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800/50 pt-8 text-center">
          <p className="text-slate-400/60">
            © {new Date().getFullYear()} Skillvee. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
