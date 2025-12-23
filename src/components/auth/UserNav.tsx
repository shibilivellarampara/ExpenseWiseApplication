

'use client';

import * as React from "react"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent
} from '@/components/ui/dropdown-menu';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, Settings, Moon, Sun, MessageSquare, Cog } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { PageSettingsDialog } from "./PageSettingsDialog";

// Define the mapping from routes to settings components
import { DashboardSettings } from "@/components/profile/DashboardSettings";
import { TransactionFieldOrderSettings } from "@/components/profile/TransactionFieldOrderSettings";
import { AnalysisSettings } from "@/components/profile/AnalysisSettings";

const pageSettingsMap: Record<string, { label: string; component: React.ComponentType<any> }> = {
    '/dashboard': { label: 'Dashboard Settings', component: DashboardSettings },
    '/transactions': { label: 'Transaction Settings', component: TransactionFieldOrderSettings },
    '/expenses': { label: 'Transaction Settings', component: TransactionFieldOrderSettings },
    '/analysis': { label: 'Analysis Settings', component: AnalysisSettings },
};


export function UserNav() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { setTheme } = useTheme();
  const pathname = usePathname();

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      // Clear user session cookie
      document.cookie = 'user-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
    router.push('/login');
  };

  const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const currentPageSetting = Object.keys(pageSettingsMap).find(key => pathname.startsWith(key));
  const settingsDetails = currentPageSetting ? pageSettingsMap[currentPageSetting] : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
            <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.displayName}</p>
            <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <Settings className="mr-2 h-4 w-4" />
              <span>All Settings</span>
            </Link>
          </DropdownMenuItem>

           {settingsDetails && (
             <PageSettingsDialog
                title={settingsDetails.label}
                description={`Customize settings for the ${pathname.split('/')[1] || 'current'} page.`}
                SettingsComponent={settingsDetails.component}
              >
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <Cog className="mr-2 h-4 w-4" />
                      <span>{settingsDetails.label}</span>
                  </DropdownMenuItem>
             </PageSettingsDialog>
          )}

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span>Toggle theme</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  <Sun className="mr-2 h-4 w-4" />
                  <span>Light</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  <Moon className="mr-2 h-4 w-4" />
                  <span>Dark</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("chat")}>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span>Chat</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
