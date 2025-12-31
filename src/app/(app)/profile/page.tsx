
'use client';

import { PageHeader } from "@/components/PageHeader";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Cog, Palette, List, BarChart2, Tags, Database, User, Info, FileUp } from "lucide-react";
import Link from "next/link";


const settingsLinks = [
    { href: '/profile/details', icon: User, title: 'Profile & Security', description: 'Update your personal information and password.' },
    { href: '/profile/form', icon: List, title: 'Form Customization', description: 'Customize transaction form fields.' },
    { href: '/profile/dashboard', icon: Palette, title: 'Dashboard Settings', description: 'Customize your dashboard appearance.' },
    { href: '/profile/analysis', icon: BarChart2, title: 'Analysis Settings', description: 'Customize which categories to exclude.' },
    { href: '/profile/categories', icon: Cog, title: 'Categories', description: 'Manage your expense categories.' },
    { href: '/profile/tags', icon: Tags, title: 'Tags', description: 'Manage your expense tags/labels.' },
    { href: '/data', icon: FileUp, title: 'Import & Export', description: 'Backup, restore, or import data.' },
    { href: '/about', icon: Info, title: 'About', description: 'View application details and version history.' },
    { href: '/profile/data', icon: Database, title: 'Data Management', description: 'Reset or delete your account data.' },
]


export default function ProfilePage() {
    return (
        <div className="w-full space-y-8">
            <PageHeader
                title="Settings"
                description="Manage your account settings and preferences."
            />
            <div className="space-y-4">
                {settingsLinks.map((link) => (
                    <Link key={link.href} href={link.href} className="block">
                         <Card className="hover:bg-accent transition-colors">
                            <CardHeader className="flex flex-row items-center justify-between p-4">
                                <div className="flex items-center gap-4">
                                    <div className="bg-muted p-3 rounded-lg">
                                        <link.icon className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold">{link.title}</h3>
                                        <p className="text-sm text-muted-foreground">{link.description}</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </CardHeader>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
