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
    {
      href: "/recruiter/assessments",
      label: "Assessments",
      icon: ClipboardCheck,
    },
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
      <div className="flex h-[72px] items-center justify-between border-b border-white/10 px-4">
        {sidebarOpen && (
          <Link
            href="/recruiter/simulations"
            className="flex items-center gap-2"
          >
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
          className="h-8 w-8 text-white/60 hover:bg-white/10 hover:text-white"
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
                    : "text-white/60 hover:bg-white/10 hover:text-white"
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
              <button className="flex w-full cursor-pointer items-center gap-3 rounded-lg bg-white/5 p-2 transition-colors hover:bg-white/10">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-600/30">
                  <span className="text-sm font-medium text-blue-300">
                    {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                  </span>
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-medium text-white">
                    {user.name || "Recruiter"}
                  </p>
                  <p className="truncate text-xs text-white/50">{user.email}</p>
                </div>
                <ChevronsUpDown className="h-4 w-4 flex-shrink-0 text-white/40" />
              </button>
            ) : (
              <button className="flex w-full cursor-pointer justify-center">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/30 transition-colors hover:bg-blue-600/50">
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
            className="mb-1 w-56 border-white/10 bg-slate-900 text-white"
          >
            <div className="border-b border-white/10 px-3 py-2.5">
              <p className="text-sm font-medium text-white">
                {user.name || "Recruiter"}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-400">
                {user.email}
              </p>
            </div>
            <div className="p-1">
              <DropdownMenuItem asChild variant="destructive">
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex w-full cursor-pointer items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
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
