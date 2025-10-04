import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { CheckCircle, BarChart, Users, FileUp } from 'lucide-react';
import { Logo } from '@/components/Logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cookies } from 'next/headers';
import { UserProfile } from '@/lib/types';
import { getCookie } from 'cookies-next';

async function getUser(): Promise<UserProfile | null> {
  // This is a simplified example. In a real app, you'd verify the session.
  // For this example, we'll assume a cookie indicates a logged-in user.
  // A more robust solution would involve server-side session validation with Firebase Admin SDK.
  try {
    const userCookie = getCookie('user-session', { cookies });
    if (!userCookie) return null;
    // In a real app you would verify the token here
    return JSON.parse(userCookie);
  } catch (error) {
    return null;
  }
}

const Nav = async () => {
  const user = await getUser();

  return (
    <header className="py-4 px-4 md:px-8 flex justify-between items-center bg-background/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
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
              <Link href="/signup">Get Started</Link>
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

  return (
    <div className="flex flex-col min-h-screen">
      <Nav />
      <main className="flex-grow">
        <section className="pt-32 pb-20 text-center bg-background">
          <div className="container mx-auto px-4">
            <h1 className="text-4xl md:text-6xl font-headline font-bold mb-4 text-gray-800">
              Smart spending starts here.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              ExpenseWise helps you take control of your finances. Track, analyze, and manage your expenses effortlessly.
            </p>
            <Button size="lg" asChild>
              <Link href="/signup">Start for Free</Link>
            </Button>
            {heroImage && (
              <div className="mt-12 relative w-full max-w-4xl mx-auto">
                <Image
                  src={heroImage.imageUrl}
                  alt={heroImage.description}
                  width={1200}
                  height={675}
                  className="rounded-xl shadow-2xl"
                  data-ai-hint={heroImage.imageHint}
                  priority
                />
              </div>
            )}
          </div>
        </section>

        <section id="features" className="py-20 bg-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-headline font-bold text-center mb-12 text-gray-800">
              All-in-One Expense Management
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="text-center p-6 bg-background rounded-lg shadow-md transition-transform hover:scale-105">
                  <div className="flex justify-center mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-headline font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 bg-gray-100">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ExpenseWise. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
