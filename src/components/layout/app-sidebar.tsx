'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  LayoutDashboard,
  Users,
  List,
  Mail,
  FileText,
  BarChart3,
  Bot,
  Settings,
  Zap,
  ChevronUp,
  LogOut,
  User,
} from 'lucide-react';

const mainNavItems = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Contacts',
    url: '/dashboard/contacts',
    icon: Users,
  },
  {
    title: 'Lists',
    url: '/dashboard/lists',
    icon: List,
  },
  {
    title: 'Campaigns',
    url: '/dashboard/campaigns',
    icon: Mail,
  },
  {
    title: 'Templates',
    url: '/dashboard/templates',
    icon: FileText,
  },
];

const toolsNavItems = [
  {
    title: 'Analytics',
    url: '/dashboard/analytics',
    icon: BarChart3,
  },
  {
    title: 'AI Assistant',
    url: '/dashboard/ai-assistant',
    icon: Bot,
  },
  {
    title: 'Automations',
    url: '/dashboard/automations',
    icon: Zap,
  },
];

interface AppSidebarProps {
  user: {
    name: string;
    email: string;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname();

  const isActive = (url: string) => {
    if (url === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(url);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="bg-foreground flex h-9 w-9 items-center justify-center rounded-lg">
            <Mail className="text-background h-4 w-4" />
          </div>
          <span className="text-lg font-medium tracking-tight">Chronicle</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground px-2 text-xs font-medium tracking-wider uppercase">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="hover:bg-accent data-[active=true]:bg-accent h-10 rounded-lg px-3 font-normal transition-colors data-[active=true]:font-medium"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4 opacity-70" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground px-2 text-xs font-medium tracking-wider uppercase">
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    className="hover:bg-accent data-[active=true]:bg-accent h-10 rounded-lg px-3 font-normal transition-colors data-[active=true]:font-medium"
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4 opacity-70" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/dashboard/settings')}
                  className="hover:bg-accent data-[active=true]:bg-accent h-10 rounded-lg px-3 font-normal transition-colors data-[active=true]:font-medium"
                >
                  <Link href="/dashboard/settings">
                    <Settings className="h-4 w-4 opacity-70" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-border/50 border-t p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="hover:bg-accent h-auto rounded-lg px-3 py-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-foreground/10 text-foreground text-xs font-medium">
                      {getInitials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm">
                    <span className="font-medium tracking-tight">
                      {user.name}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {user.email}
                    </span>
                  </div>
                  <ChevronUp className="ml-auto h-4 w-4 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width] rounded-lg"
              >
                <DropdownMenuItem asChild className="rounded-md">
                  <Link href="/dashboard/settings">
                    <User className="mr-2 h-4 w-4 opacity-70" />
                    Account Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-destructive focus:text-destructive rounded-md"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
