
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ArrowRight, BarChart, CheckCircle, FileUp, Users } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { cookies } from 'next/headers';
import { UserProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

async function getUser(): Promise<UserProfile | null> {
  try {
    const cookieStore = cookies();
    const userCookie = cookieStore.get('user-session');
    if (!userCookie) return null;
    return JSON.parse(userCookie.value);
  } catch (error) {
    return null;
  }
}

const Nav = async () => {
  const user = await getUser();

  return (
    <header className="py-4 px-4 md:px-8 flex justify-between items-center bg-transparent fixed top-0 left-0 right-0 z-50">
      <Logo />
      <nav>
        {user ? (
          <Button asChild>
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">Get Started <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        )}
      </nav>
    </header>
  );
};

export default function Home() {
  const heroImage = PlaceHolderImages.find((img) => img.id === 'hero');
  const features = [
    {
      icon: <BarChart className="w-8 h-8 text-primary" />,
      title: 'Insightful Dashboard',
      description: 'Visualize your spending with interactive charts and graphs.',
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: 'Shared Expenses',
      description: 'Easily track and manage contributions for group expenses.',
    },
    {
      icon: <FileUp className="w-8 h-8 text-primary" />,
      title: 'Effortless Import',
      description: 'Import your existing expenses from Excel or CSV files in seconds.',
    },
    {
      icon: <CheckCircle className="w-8 h-8 text-primary" />,
      title: 'Category Tracking',
      description: 'Organize your expenses into categories for better budget management.',
    },
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Create Your Account',
      description: 'Sign up for free in seconds. No credit card required.',
    },
    {
      step: 2,
      title: 'Add Your Transactions',
      description: 'Easily log your income and expenses, or import them from a file.',
    },
    {
      step: 3,
      title: 'Visualize Your Finances',
      description: 'See where your money is going with our intuitive dashboard and reports.',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Nav />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 text-center overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-background z-0"></div>
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-[150%] rounded-full bg-primary/5 -z-10"></div>
          <div className="container mx-auto px-4 relative z-10">
            <h1 className="text-4xl md:text-6xl font-headline font-bold mb-4 text-foreground">
              Smart spending starts here.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              ExpenseWise helps you take control of your finances. Track, analyze, and manage your expenses effortlessly.
            </p>
            <Button size="lg" asChild>
              <Link href="/signup">Start for Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            {heroImage && (
              <div className="mt-16 relative w-full max-w-5xl mx-auto">
                <div className="relative rounded-xl shadow-2xl p-2 bg-white/50 backdrop-blur-sm border">
                    <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    width={1200}
                    height={675}
                    className="rounded-lg"
                    data-ai-hint={heroImage.imageHint}
                    priority
                    />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-center mb-2 text-foreground">
              All-in-One Expense Management
            </h2>
            <p className="text-lg text-muted-foreground text-center mb-12">Everything you need to master your money.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="text-left p-6 bg-card rounded-lg border shadow-sm transition-transform hover:scale-105 hover:shadow-lg">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-headline font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 bg-card/50">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-center mb-12 text-foreground">
              Get Started in 3 Simple Steps
            </h2>
            <div className="relative">
                {/* Dotted Line */}
                <div className="absolute left-1/2 top-5 h-full w-px border-l-2 border-dashed border-primary/30 hidden md:block"></div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                {howItWorks.map((step, index) => (
                    <div key={index} className="relative flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold z-10 border-4 border-background">
                        {step.step}
                    </div>
                    <div className={cn("w-px h-12 md:hidden", index < howItWorks.length - 1 ? "bg-primary/30" : "")}></div>
                    <h3 className="text-2xl font-headline font-semibold mt-6 mb-2">{step.title}</h3>
                    <p className="text-muted-foreground max-w-xs">{step.description}</p>
                    </div>
                ))}
                </div>
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section id="cta" className="py-20 bg-background">
            <div className="container mx-auto px-4 text-center">
                 <h2 className="text-3xl md:text-4xl font-headline font-bold mb-4 text-foreground">
                    Ready to take control?
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                    Join thousands of users who are managing their finances smarter with ExpenseWise.
                </p>
                <Button size="lg" asChild>
                    <Link href="/signup">Sign Up Now - It's Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
            </div>
        </section>

      </main>

      <footer className="py-8 bg-card/30 border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ExpenseWise. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
