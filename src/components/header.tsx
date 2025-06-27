"use client";

import { useAuth } from "@/context/auth-context";
import { Button } from "./ui/button";
import { Computer, LogOut, User as UserIcon } from "lucide-react";

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-card shadow-md sticky top-0 z-40">
      <div className="container mx-auto flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Computer className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-primary">Computer Skill Academy - ADCA Test</h1>
        </div>
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">{user.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
