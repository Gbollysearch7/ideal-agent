import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  Mail,
  Zap,
  Users,
  BarChart3,
  Bot,
  Shield,
  ArrowRight,
} from 'lucide-react';

export default async function HomePage() {
  const session = await auth();

  // If user is logged in, redirect to dashboard
  if (session?.user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Mail className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Email Platform</span>
          </div>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1">
        <div className="container mx-auto px-4 py-24 text-center">
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Email marketing powered by{' '}
            <span className="text-primary">AI</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Create stunning email campaigns, manage your contacts, and grow your
            audience with our AI-powered email marketing platform.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/register">
                Start for free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="border-t bg-muted/30 py-24">
          <div className="container mx-auto px-4">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Everything you need for email success
            </h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={<Mail className="h-6 w-6" />}
                title="Campaign Builder"
                description="Create beautiful email campaigns with our drag-and-drop editor. No coding required."
              />
              <FeatureCard
                icon={<Users className="h-6 w-6" />}
                title="Contact Management"
                description="Import, organize, and segment your contacts. Keep your lists clean and engaged."
              />
              <FeatureCard
                icon={<Bot className="h-6 w-6" />}
                title="AI Assistant"
                description="Get help writing subject lines, email content, and campaign optimization from AI."
              />
              <FeatureCard
                icon={<BarChart3 className="h-6 w-6" />}
                title="Analytics"
                description="Track opens, clicks, and engagement. Make data-driven decisions."
              />
              <FeatureCard
                icon={<Zap className="h-6 w-6" />}
                title="Automations"
                description="Set up automated workflows to engage contacts at the right time."
              />
              <FeatureCard
                icon={<Shield className="h-6 w-6" />}
                title="Deliverability"
                description="Powered by Resend for reliable email delivery and high inbox placement."
              />
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="border-t py-24">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold">Ready to grow your audience?</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start sending emails that convert. No credit card required.
            </p>
            <Button size="lg" className="mt-8" asChild>
              <Link href="/register">
                Get started for free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Email Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
