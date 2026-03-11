import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="relative bg-slate-900 py-12 text-slate-300 sm:py-16">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-6">
        <div className="mb-12 grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
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
            <p className="mb-4 text-blue-200/80">
              See how candidates actually work before you hire them.
            </p>
            <p className="text-blue-200/80">
              <a
                href="mailto:hi@skillvee.com"
                className="transition-colors hover:text-white"
              >
                hi@skillvee.com
              </a>
            </p>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">Product</h3>
            <ul className="space-y-2 text-blue-200/70">
              <li>
                <Link
                  href="/product"
                  className="transition-colors hover:text-white"
                >
                  How It Works
                </Link>
              </li>
              <li>
                <Link
                  href="/demo"
                  className="transition-colors hover:text-white"
                >
                  Request Demo
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="transition-colors hover:text-white"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">Resources</h3>
            <ul className="space-y-2 text-blue-200/70">
              <li>
                <Link
                  href="/interview-questions"
                  className="transition-colors hover:text-white"
                >
                  Question Bank
                </Link>
              </li>
              <li>
                <Link
                  href="/interview-guides"
                  className="transition-colors hover:text-white"
                >
                  Interview Guides
                </Link>
              </li>
              <li>
                <Link
                  href="/faq"
                  className="transition-colors hover:text-white"
                >
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-4 font-semibold text-white">Legal</h3>
            <ul className="space-y-2 text-blue-200/70">
              <li>
                <Link
                  href="/privacy"
                  className="transition-colors hover:text-white"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="transition-colors hover:text-white"
                >
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
