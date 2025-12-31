
import { LoginForm } from '@/components/auth/LoginForm';
import { Logo } from '@/components/Logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import pkg from '../../../package.json';

const appVersion = pkg.version;


export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <Logo />
          <CardTitle className="text-2xl font-headline pt-4">Welcome Back!</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
       <div className="mt-6 text-center text-xs text-muted-foreground space-y-1">
            <p>version v {appVersion}</p>
        </div>
    </div>
  );
}
