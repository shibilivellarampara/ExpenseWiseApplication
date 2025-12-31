
'use client';

import { PageHeader } from "@/components/PageHeader";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, List, BarChart2, Tags, Database, User, Info, FileUp, LayoutDashboard, Shapes } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";


const settingsLinks = [
    { href: '/profile/details', icon: User, title: 'Profile & Security', description: 'Update your personal information and password.' },
    { href: '/profile/form', icon: List, title: 'Transaction Settings', description: 'Customize transaction form and list appearance.' },
    { href: '/profile/categories', icon: Shapes, title: 'Categories', description: 'Manage your expense categories.' },
    { href: '/profile/tags', icon: Tags, title: 'Tags', description: 'Manage your expense tags/labels.' },
    { href: '/profile/dashboard', icon: LayoutDashboard, title: 'Dashboard Settings', description: 'Customize your dashboard appearance.' },
    { href: '/profile/analysis', icon: BarChart2, title: 'Analysis Settings', description: 'Customize which categories to exclude.' },
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
             <Card>
                <CardContent className="p-0">
                    <div className="space-y-0">
                        {settingsLinks.map((link, index) => (
                            <Link key={link.href} href={link.href} className="block">
                                <div className="p-4 flex items-center gap-4 hover:bg-accent transition-colors">
                                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-muted flex-shrink-0">
                                        <link.icon className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className="font-semibold">{link.title}</h3>
                                        <p className="text-sm text-muted-foreground">{link.description}</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                                {index < settingsLinks.length - 1 && <Separator />}
                            </Link>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

