'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { usePathname } from 'next/navigation';
import React from 'react';

const pathNameMap: Record<string, string> = {
  dashboard: 'Dashboard',
  contacts: 'Contacts',
  lists: 'Lists',
  campaigns: 'Campaigns',
  templates: 'Templates',
  analytics: 'Analytics',
  'ai-assistant': 'AI Assistant',
  automations: 'Automations',
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
  import: 'Import',
};

export function Header() {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  const breadcrumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const isLast = index === segments.length - 1;
    const label = pathNameMap[segment] || segment;

    return {
      href,
      label,
      isLast,
    };
  });

  return (
    <header className="border-border/50 bg-background/80 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-6 backdrop-blur-sm">
      <SidebarTrigger className="text-muted-foreground hover:text-foreground -ml-2 h-8 w-8 transition-colors" />
      <Separator orientation="vertical" className="bg-border/50 mx-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList className="text-sm">
          {breadcrumbs.map((crumb) => (
            <React.Fragment key={crumb.href}>
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage className="text-foreground font-medium">
                    {crumb.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    href={crumb.href}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!crumb.isLast && (
                <BreadcrumbSeparator className="text-muted-foreground/50" />
              )}
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
