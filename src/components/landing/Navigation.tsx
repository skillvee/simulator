"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { AuthButton, useAuth } from "@/components/auth";

interface NavigationProps {
  currentPage?: string;
}

export default function Navigation({ currentPage }: NavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);

  // Get sign-in URL with callback (skip for homepage)
  const getSignInUrl = () => {
    if (pathname === '/') return '/sign-in';
    return `/sign-in?callbackUrl=${encodeURIComponent(pathname)}`;
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 px-6 py-4 backdrop-blur-sm bg-white/95">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3">
          <Image
            src="/skillvee-logo.png"
            alt="Skillvee"
            width={120}
            height={32}
            className="object-contain"
            style={{ height: "auto" }}
            priority
          />
        </Link>

        {/* Desktop Navigation & Auth - Right Aligned */}
        <div className="hidden md:flex items-center space-x-6">
          <Link
            href="/product"
            className={`${
              currentPage === "product"
                ? "text-primary font-medium"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Product
          </Link>

          <Link
            href="/pricing"
            className={`${
              currentPage === "pricing"
                ? "text-primary font-medium"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Pricing
          </Link>

          <Link
            href="/faq"
            className={`${
              currentPage === "faq"
                ? "text-primary font-medium"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            FAQ
          </Link>

          {isSignedIn ? (
              <>
                <Link href="/dashboard">
                  <Button variant="outline">Dashboard</Button>
                </Link>
                <AuthButton
                  appearance={{
                    elements: {
                      avatarBox: "w-8 h-8",
                      userButtonTrigger: "focus:shadow-none",
                    },
                  }}
                />
              </>
            ) : (
              <>
                <Link href={getSignInUrl()}>
                  <Button variant="outline">Sign in</Button>
                </Link>
                <Link href="/demo">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Request Demo
                  </Button>
                </Link>
              </>
            )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden">
          <button
            onClick={toggleMenu}
            className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:text-gray-900 focus:ring-2 focus:ring-primary rounded-lg"
            aria-label="Toggle mobile menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-6 py-4 space-y-4">
            <Link
              href="/product"
              className={`block py-2 px-2 text-lg rounded-lg transition-colors ${
                currentPage === "product"
                  ? "text-primary font-medium bg-primary/5"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              onClick={() => setIsOpen(false)}
            >
              Product
            </Link>

            <Link
              href="/pricing"
              className={`block py-2 px-2 text-lg rounded-lg transition-colors ${
                currentPage === "pricing"
                  ? "text-primary font-medium bg-primary/5"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              onClick={() => setIsOpen(false)}
            >
              Pricing
            </Link>

            <Link
              href="/faq"
              className={`block py-2 px-2 text-lg rounded-lg transition-colors ${
                currentPage === "faq"
                  ? "text-primary font-medium bg-primary/5"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
              onClick={() => setIsOpen(false)}
            >
              FAQ
            </Link>

            <div className="pt-4 border-t border-gray-200 space-y-4">
              {isSignedIn ? (
                <div className="space-y-4">
                  <Link href="/dashboard" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full">Dashboard</Button>
                  </Link>
                  <AuthButton
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8",
                        userButtonTrigger: "focus:shadow-none",
                      },
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <Link href={getSignInUrl()} onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full">Sign in</Button>
                  </Link>
                  <Link href="/demo" onClick={() => setIsOpen(false)}>
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                      Request Demo
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
