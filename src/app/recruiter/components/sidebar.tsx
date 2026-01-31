"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  Settings,
  LogOut,
  PanelLeftClose,
  PanelLeft,
  FileText,
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
    { href: "/recruiter/scenarios", label: "Scenarios", icon: FolderOpen },
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
      } flex flex-col border-r border-stone-200 bg-white transition-all duration-300`}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-stone-200">
        {sidebarOpen && (
          <Link href="/recruiter/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-stone-900">Skillvee</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="h-8 w-8"
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
            <Link href="/recruiter/scenarios/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Scenario
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
                variant={active ? "secondary" : "ghost"}
                className={`w-full justify-start gap-2 ${
                  active
                    ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                    : "text-stone-600"
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
      <div className="border-t border-stone-200 p-3">
        {sidebarOpen && (
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start gap-2 text-stone-600 mb-2"
          >
            <Link href="/">
              <LogOut className="h-4 w-4" />
              Exit to Home
            </Link>
          </Button>
        )}
        {sidebarOpen ? (
          <div className="flex items-center gap-3 p-2 rounded-lg bg-stone-50">
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-700">
                {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900 truncate">
                {user.name || "Recruiter"}
              </p>
              <p className="text-xs text-stone-500 truncate">{user.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="h-9 w-9">
              <Link href="/">
                <LogOut className="h-4 w-4" />
              </Link>
            </Button>
            <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-medium text-blue-700">
                {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
