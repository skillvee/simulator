"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FolderOpen,
  ClipboardCheck,
  PanelLeftClose,
  PanelLeft,
  Plus,
  LogOut,
  ChevronsUpDown,
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
    { href: "/recruiter/assessments", label: "Assessments", icon: ClipboardCheck },
    { href: "/recruiter/simulations", label: "Simulations", icon: FolderOpen },
  ];

  const isActive = (href: string) => {
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
          <Link href="/recruiter/simulations" className="flex items-center gap-2">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {sidebarOpen ? (
              <button className="flex items-center gap-3 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors w-full cursor-pointer">
                <div className="h-9 w-9 rounded-full bg-blue-600/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-blue-300">
                    {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-white truncate">
                    {user.name || "Recruiter"}
                  </p>
                  <p className="text-xs text-white/50 truncate">{user.email}</p>
                </div>
                <ChevronsUpDown className="h-4 w-4 text-white/40 flex-shrink-0" />
              </button>
            ) : (
              <button className="flex w-full justify-center cursor-pointer">
                <div className="h-9 w-9 rounded-full bg-blue-600/30 hover:bg-blue-600/50 transition-colors flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-300">
                    {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                  </span>
                </div>
              </button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="start"
            className="w-56 bg-slate-900 border-white/10 text-white mb-1"
          >
            <div className="px-3 py-2.5 border-b border-white/10">
              <p className="font-medium text-sm text-white">{user.name || "Recruiter"}</p>
              <p className="text-xs truncate mt-0.5 text-slate-400">{user.email}</p>
            </div>
            <div className="p-1">
              <DropdownMenuItem asChild variant="destructive">
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </DropdownMenuItem>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
