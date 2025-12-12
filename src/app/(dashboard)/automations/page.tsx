'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Plus,
  Mail,
  Clock,
  ArrowRight,
  Play,
  Pause,
  MoreHorizontal,
  UserPlus,
  ShoppingCart,
  Calendar,
} from 'lucide-react';

const automationTemplates = [
  {
    icon: UserPlus,
    title: 'Welcome Series',
    description: 'Send a series of welcome emails to new subscribers',
    steps: 3,
  },
  {
    icon: ShoppingCart,
    title: 'Abandoned Cart',
    description: 'Remind customers about items left in their cart',
    steps: 2,
  },
  {
    icon: Calendar,
    title: 'Birthday Email',
    description: 'Send personalized birthday greetings',
    steps: 1,
  },
];

const activeAutomations = [
  {
    id: 1,
    name: 'Welcome Email Sequence',
    status: 'active',
    trigger: 'New subscriber',
    emails: 3,
    sent: 1250,
    lastRun: '2 hours ago',
  },
  {
    id: 2,
    name: 'Re-engagement Campaign',
    status: 'paused',
    trigger: 'Inactive for 30 days',
    emails: 2,
    sent: 340,
    lastRun: '5 days ago',
  },
  {
    id: 3,
    name: 'Purchase Thank You',
    status: 'active',
    trigger: 'Purchase completed',
    emails: 1,
    sent: 892,
    lastRun: '30 minutes ago',
  },
];

export default function AutomationsPage() {
  const [automations, setAutomations] = useState(activeAutomations);

  const toggleStatus = (id: number) => {
    setAutomations((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, status: a.status === 'active' ? 'paused' : 'active' }
          : a
      )
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-medium tracking-tight">Automations</h1>
          <p className="text-muted-foreground text-lg">
            Create automated email workflows to engage your audience
          </p>
        </div>
        <Button className="h-11">
          <Plus className="mr-2 h-4 w-4" />
          Create Automation
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-foreground/5 rounded-lg p-3">
                <Zap className="text-foreground/70 h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-medium tracking-tight">
                  {automations.filter((a) => a.status === 'active').length}
                </p>
                <p className="text-muted-foreground text-sm">
                  Active Automations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-foreground/5 rounded-lg p-3">
                <Mail className="text-foreground/70 h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-medium tracking-tight">
                  {automations
                    .reduce((acc, a) => acc + a.sent, 0)
                    .toLocaleString()}
                </p>
                <p className="text-muted-foreground text-sm">Emails Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-foreground/5 rounded-lg p-3">
                <Clock className="text-foreground/70 h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-medium tracking-tight">24/7</p>
                <p className="text-muted-foreground text-sm">
                  Running Continuously
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Templates */}
      <div className="space-y-4">
        <h2 className="text-xl font-medium tracking-tight">
          Quick Start Templates
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {automationTemplates.map((template) => (
            <Card
              key={template.title}
              className="hover:bg-accent cursor-pointer transition-all"
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="bg-foreground/5 w-fit rounded-lg p-3">
                    <template.icon className="text-foreground/70 h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-medium tracking-tight">
                      {template.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {template.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">
                      {template.steps} email{template.steps > 1 ? 's' : ''} in
                      sequence
                    </span>
                    <ArrowRight className="text-muted-foreground h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Active Automations */}
      <div className="space-y-4">
        <h2 className="text-xl font-medium tracking-tight">Your Automations</h2>
        <Card>
          <CardContent className="p-0">
            <div className="divide-border divide-y">
              {automations.map((automation) => (
                <div
                  key={automation.id}
                  className="hover:bg-accent/50 flex items-center justify-between p-4 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`rounded-lg p-2 ${
                        automation.status === 'active'
                          ? 'bg-success/10'
                          : 'bg-muted'
                      }`}
                    >
                      <Zap
                        className={`h-4 w-4 ${
                          automation.status === 'active'
                            ? 'text-success'
                            : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium tracking-tight">
                          {automation.name}
                        </h3>
                        <Badge
                          variant={
                            automation.status === 'active'
                              ? 'default'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {automation.status}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Trigger: {automation.trigger} • {automation.emails}{' '}
                        email
                        {automation.emails > 1 ? 's' : ''} •{' '}
                        {automation.sent.toLocaleString()} sent
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground hidden text-xs sm:block">
                      Last run: {automation.lastRun}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleStatus(automation.id)}
                    >
                      {automation.status === 'active' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Empty State (hidden when there are automations) */}
      {automations.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted mb-4 rounded-full p-4">
              <Zap className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="mb-1 text-lg font-medium tracking-tight">
              No automations yet
            </h3>
            <p className="text-muted-foreground mb-4 max-w-sm text-sm">
              Create your first automation to start sending targeted emails
              automatically based on user behavior.
            </p>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Automation
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
