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
  appearance?: {
    elements?: {
      avatarBox?: string;
      userButtonTrigger?: string;
    };
  };
}

export function AuthButton({ appearance }: AuthButtonProps) {
  const { user } = useAuth();

  if (!user) return null;

  const initials = user.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0]?.toUpperCase() || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={`relative h-10 w-10 rounded-full ${appearance?.elements?.userButtonTrigger || ""}`}
        >
          <Avatar className={appearance?.elements?.avatarBox || "h-8 w-8"}>
            <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
            <AvatarFallback className="bg-blue-100 text-blue-600 text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <div className="px-2 py-1.5 text-sm">
          <p className="font-medium">{user.name}</p>
          <p className="text-gray-500 text-xs truncate">{user.email}</p>
        </div>
        <DropdownMenuItem asChild>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full flex items-center gap-2 cursor-pointer text-red-600"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
