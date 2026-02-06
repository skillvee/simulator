"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogOut } from "lucide-react";

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    isSignedIn: status === "authenticated",
    isLoading: status === "loading",
    user: session?.user,
    session,
  };
}

interface AuthButtonProps {
  variant?: "light" | "dark";
  appearance?: {
    elements?: {
      avatarBox?: string;
      userButtonTrigger?: string;
    };
  };
}

export function AuthButton({ variant = "light", appearance }: AuthButtonProps) {
  const { user } = useAuth();

  if (!user) return null;

  const isDark = variant === "dark";

  const initials = user.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`relative h-9 w-9 rounded-full ${
            isDark
              ? "hover:bg-white/10 focus-visible:ring-white/20"
              : "hover:bg-stone-100 focus-visible:ring-stone-300"
          } ${appearance?.elements?.userButtonTrigger || ""}`}
        >
          <Avatar className={appearance?.elements?.avatarBox || "h-8 w-8"}>
            <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
            <AvatarFallback
              className={`text-sm font-medium ${
                isDark
                  ? "bg-primary/20 text-blue-300"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className={`w-52 ${
          isDark
            ? "bg-slate-900 border-white/10 text-white"
            : ""
        }`}
      >
        <div className={`px-3 py-2.5 ${isDark ? "border-b border-white/10" : "border-b border-stone-100"}`}>
          <p className={`font-medium text-sm ${isDark ? "text-white" : "text-stone-900"}`}>{user.name}</p>
          <p className={`text-xs truncate mt-0.5 ${isDark ? "text-slate-400" : "text-stone-500"}`}>{user.email}</p>
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
  );
}
