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
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal
} from '@/components/ui/dropdown-menu';
import { useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { LogOut, User, Palette, Sun, Moon, MessageSquare, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

export function UserNav() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { setTheme } = useTheme();

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

  const isAppPage = usePathname().startsWith('/d'); // Cheap check if we are in the app
  const buttonClass = isAppPage 
    ? "w-full justify-start text-base h-14 px-4 relative text-sidebar-muted-foreground hover:bg-sidebar-active/20 hover:text-sidebar-foreground" 
    : "relative h-10 w-10 rounded-full";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className={buttonClass}>
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.photoURL || undefined} alt={user?.displayName || 'User'} />
              <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
            </Avatar>
            
          </div>
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
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
           <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette className="mr-2 h-4 w-4" />
              <span>Theme</span>
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

// Custom hook to get the pathname
function usePathname() {
    const [path, setPath] = React.useState(
        typeof window !== 'undefined' ? window.location.pathname : ''
    );
    React.useEffect(() => {
        if (typeof window === 'undefined') return;

        const onLocationChange = () => {
            setPath(window.location.pathname);
        };

        window.addEventListener('popstate', onLocationChange);
        
        // Also listen for pushState changes, which Next.js uses for navigation
        const originalPushState = history.pushState;
        history.pushState = function(...args) {
            originalPushState.apply(this, args);
            onLocationChange();
        };

        return () => {
            window.removeEventListener('popstate', onLocationChange);
            history.pushState = originalPushState; // Restore original
        };
    }, []);
    return path;
}
