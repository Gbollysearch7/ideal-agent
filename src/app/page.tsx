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
  Check,
  Star,
  Sparkles,
  Send,
  TrendingUp,
  Globe,
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
      <header className="bg-background/80 sticky top-0 z-50 border-b backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="from-primary to-primary/70 shadow-primary/25 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg">
              <Mail className="text-primary-foreground h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight">MailFlow</span>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="#features"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="#testimonials"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Testimonials
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="shadow-primary/25 shadow-lg">
              <Link href="/register">Get Started Free</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="bg-primary/5 absolute top-0 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" />
          <div className="absolute top-1/2 right-0 h-[400px] w-[400px] rounded-full bg-blue-500/5 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="bg-muted/50 mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm">
              <Sparkles className="text-primary h-4 w-4" />
              <span>AI-Powered Email Marketing</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl">
              Send emails that
              <span className="relative mx-2">
                <span className="from-primary to-primary relative z-10 bg-gradient-to-r via-blue-500 bg-clip-text text-transparent">
                  convert
                </span>
              </span>
              and engage
            </h1>
            <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg lg:text-xl">
              Create stunning campaigns, manage your subscribers, and grow your
              business with AI-powered insights. No credit card required to
              start.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button
                size="lg"
                className="shadow-primary/25 h-12 px-8 text-base shadow-lg"
                asChild
              >
                <Link href="/register">
                  Start for free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base"
                asChild
              >
                <Link href="#features">See how it works</Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="text-muted-foreground mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Free forever plan</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-muted/30 border-y">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <StatCard number="10M+" label="Emails sent monthly" />
            <StatCard number="99.9%" label="Delivery rate" />
            <StatCard number="5,000+" label="Happy customers" />
            <StatCard number="4.9/5" label="Customer rating" />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need for email success
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Powerful features to help you create, send, and analyze your email
              campaigns
            </p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Mail className="h-6 w-6" />}
              title="Campaign Builder"
              description="Create beautiful email campaigns with our intuitive drag-and-drop editor. No coding required."
              color="bg-blue-500/10 text-blue-500"
            />
            <FeatureCard
              icon={<Users className="h-6 w-6" />}
              title="Contact Management"
              description="Import, organize, and segment your contacts. Keep your lists clean and engaged."
              color="bg-green-500/10 text-green-500"
            />
            <FeatureCard
              icon={<Bot className="h-6 w-6" />}
              title="AI Writing Assistant"
              description="Get help writing subject lines, email content, and optimize campaigns with Claude AI."
              color="bg-purple-500/10 text-purple-500"
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Advanced Analytics"
              description="Track opens, clicks, and engagement. Make data-driven decisions with detailed reports."
              color="bg-orange-500/10 text-orange-500"
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Smart Automations"
              description="Set up automated workflows to engage contacts at the right time with the right message."
              color="bg-yellow-500/10 text-yellow-500"
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              title="99.9% Deliverability"
              description="Powered by Resend for reliable email delivery and high inbox placement rates."
              color="bg-red-500/10 text-red-500"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-muted/30 border-y py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Get started in 3 simple steps
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Launch your first campaign in minutes, not hours
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <StepCard
              step={1}
              icon={<Users className="h-6 w-6" />}
              title="Import your contacts"
              description="Upload your email list or add contacts manually. We'll keep them organized for you."
            />
            <StepCard
              step={2}
              icon={<Send className="h-6 w-6" />}
              title="Create your campaign"
              description="Use our templates or build from scratch. Let AI help you write compelling content."
            />
            <StepCard
              step={3}
              icon={<TrendingUp className="h-6 w-6" />}
              title="Send & analyze"
              description="Hit send and watch your analytics in real-time. Optimize based on insights."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              Start free, upgrade when you&apos;re ready
            </p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl gap-8 md:grid-cols-3">
            <PricingCard
              name="Starter"
              price="Free"
              period="forever"
              description="Perfect for getting started"
              features={[
                'Up to 500 contacts',
                '1,000 emails/month',
                'Basic templates',
                'Email support',
              ]}
              buttonText="Get Started"
              buttonVariant="outline"
            />
            <PricingCard
              name="Pro"
              price="$29"
              period="/month"
              description="For growing businesses"
              features={[
                'Up to 10,000 contacts',
                'Unlimited emails',
                'AI writing assistant',
                'Advanced analytics',
                'Priority support',
                'Custom templates',
              ]}
              buttonText="Start Free Trial"
              buttonVariant="default"
              popular
            />
            <PricingCard
              name="Enterprise"
              price="Custom"
              period=""
              description="For large organizations"
              features={[
                'Unlimited contacts',
                'Unlimited emails',
                'Dedicated account manager',
                'Custom integrations',
                'SLA guarantee',
                'On-premise option',
              ]}
              buttonText="Contact Sales"
              buttonVariant="outline"
            />
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
        id="testimonials"
        className="bg-muted/30 border-y py-20 lg:py-28"
      >
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Loved by marketers worldwide
            </h2>
            <p className="text-muted-foreground mt-4 text-lg">
              See what our customers have to say
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <TestimonialCard
              quote="MailFlow has transformed how we do email marketing. The AI assistant saves us hours every week."
              author="Sarah Chen"
              role="Marketing Director"
              company="TechCorp"
            />
            <TestimonialCard
              quote="Finally, an email platform that's both powerful and easy to use. Our open rates have increased by 40%."
              author="Michael Johnson"
              role="Founder"
              company="StartupXYZ"
            />
            <TestimonialCard
              quote="The analytics are incredible. We now understand our audience better than ever before."
              author="Emily Rodriguez"
              role="Head of Growth"
              company="ScaleUp Inc"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28">
        <div className="container mx-auto px-4">
          <div className="from-primary via-primary text-primary-foreground shadow-primary/25 relative overflow-hidden rounded-3xl bg-gradient-to-br to-blue-600 px-6 py-16 text-center shadow-2xl sm:px-12 lg:px-20">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute right-0 bottom-0 h-64 w-64 translate-x-1/2 translate-y-1/2 rounded-full bg-white/10 blur-3xl" />

            <div className="relative">
              <Globe className="mx-auto h-12 w-12 opacity-80" />
              <h2 className="mt-6 text-3xl font-bold sm:text-4xl">
                Ready to grow your audience?
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg opacity-90">
                Join thousands of marketers who trust MailFlow to deliver
                results. Start for free, no credit card required.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-12 px-8 text-base shadow-lg"
                  asChild
                >
                  <Link href="/register">
                    Get started for free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-lg">
                  <Mail className="text-primary-foreground h-4 w-4" />
                </div>
                <span className="text-lg font-bold">MailFlow</span>
              </div>
              <p className="text-muted-foreground mt-4 text-sm">
                AI-powered email marketing platform for modern businesses.
              </p>
            </div>
            <div>
              <h3 className="font-semibold">Product</h3>
              <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
                <li>
                  <Link
                    href="#features"
                    className="hover:text-foreground transition-colors"
                  >
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="#pricing"
                    className="hover:text-foreground transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="hover:text-foreground transition-colors"
                  >
                    Sign in
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Company</h3>
              <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
                <li>
                  <Link
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    About
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Careers
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold">Legal</h3>
              <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
                <li>
                  <Link
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Terms
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="hover:text-foreground transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="text-muted-foreground mt-12 border-t pt-8 text-center text-sm">
            <p>
              &copy; {new Date().getFullYear()} MailFlow. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl font-bold tracking-tight lg:text-4xl">
        {number}
      </div>
      <div className="text-muted-foreground mt-1 text-sm">{label}</div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="group bg-card hover:shadow-primary/5 relative rounded-2xl border p-6 transition-all hover:shadow-lg">
      <div
        className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${color}`}
      >
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="relative text-center">
      <div className="bg-primary text-primary-foreground shadow-primary/25 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl shadow-lg">
        {icon}
      </div>
      <div className="bg-muted absolute -top-2 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full text-sm font-bold">
        {step}
      </div>
      <h3 className="mt-2 text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-2 text-sm">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  buttonText,
  buttonVariant,
  popular,
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  buttonVariant: 'default' | 'outline';
  popular?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border p-8 ${popular ? 'border-primary shadow-primary/10 shadow-lg' : ''}`}
    >
      {popular && (
        <div className="bg-primary text-primary-foreground absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1 text-xs font-medium">
          Most Popular
        </div>
      )}
      <div>
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        <div className="mt-4">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-muted-foreground">{period}</span>
        </div>
      </div>
      <ul className="mt-6 space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <Button className="mt-8 w-full" variant={buttonVariant} asChild>
        <Link href="/register">{buttonText}</Link>
      </Button>
    </div>
  );
}

function TestimonialCard({
  quote,
  author,
  role,
  company,
}: {
  quote: string;
  author: string;
  role: string;
  company: string;
}) {
  return (
    <div className="bg-card rounded-2xl border p-6">
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed">&ldquo;{quote}&rdquo;</p>
      <div className="mt-6 flex items-center gap-3">
        <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full font-semibold">
          {author.charAt(0)}
        </div>
        <div>
          <div className="font-medium">{author}</div>
          <div className="text-muted-foreground text-sm">
            {role}, {company}
          </div>
        </div>
      </div>
    </div>
  );
}
