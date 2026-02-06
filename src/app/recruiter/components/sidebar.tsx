"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  PanelLeftClose,
  PanelLeft,
  Plus,
} from "lucide-react";

interface RecruiterSidebarProps {
  user: {
    name: string | null;
    email: string | null;
  };
}

export function RecruiterSidebar({ user }: RecruiterSidebarProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const pathname = usePathname();

  const navItems = [
    { href: "/recruiter/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/recruiter/simulations", label: "Simulations", icon: FolderOpen },
    { href: "/recruiter/candidates", label: "Candidates", icon: Users },
  ];

  const isActive = (href: string) => {
    if (href === "/recruiter/dashboard") {
      return pathname === "/recruiter/dashboard" || pathname === "/recruiter";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside
      className={`${
        sidebarOpen ? "w-64" : "w-16"
      } flex flex-col bg-[#0B1437] transition-all duration-300`}
    >
      {/* Logo */}
      <div className="flex h-[72px] items-center justify-between px-4 border-b border-white/10">
        {sidebarOpen && (
          <Link href="/recruiter/dashboard" className="flex items-center gap-2">
            <Image
              src="/skillvee-logo.png"
              alt="SkillVee"
              width={140}
              height={36}
              className="brightness-0 invert"
            />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="h-4 w-4" />
          ) : (
            <PanelLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Create Button */}
      {sidebarOpen && (
        <div className="p-3">
          <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
            <Link href="/recruiter/simulations/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Simulation
            </Link>
          </Button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Button
                key={item.href}
                asChild
                variant="ghost"
                className={`w-full justify-start gap-2 ${
                  active
                    ? "bg-white/10 text-white hover:bg-white/15"
                    : "text-white/60 hover:text-white hover:bg-white/10"
                } ${!sidebarOpen && "justify-center px-2"}`}
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  {sidebarOpen && item.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="flex h-[72px] items-center border-t border-white/10 px-3">
        {sidebarOpen ? (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-white/5 w-full">
            <div className="h-9 w-9 rounded-full bg-blue-600/30 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-blue-300">
                {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.name || "Recruiter"}
              </p>
              <p className="text-xs text-white/50 truncate">{user.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex w-full justify-center">
            <div className="h-9 w-9 rounded-full bg-blue-600/30 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-300">
                {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
