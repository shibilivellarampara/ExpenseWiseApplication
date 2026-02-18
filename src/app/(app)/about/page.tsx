'use client';

import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import pkg from '@/../package.json';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { cn } from "@/lib/utils";

const appVersion = pkg.version;

const changelog = [
    {
        version: "1.8.5",
        date: "Feb 18, 2026",
        changes: [
            { type: 'Logic', description: "Optimized transaction loading with dual-query architecture: 50-record pagination for speed + accurate summary totals." },
            { type: 'Fix', description: "Resolved critical JSX syntax errors in AssetsList that caused production build failures." },
            { type: 'Feature', description: "Implemented specific Month & Year picker in Analysis filters for historical deep-dives." },
            { type: 'UI/UX', description: "Redesigned Category Analysis list with a tiered metadata stack and full-width progress bars." },
            { type: 'UI/UX', description: "Enhanced 'Hidden Categories' management with a descriptive popover and inline toggle." },
            { type: 'UI/UX', description: "Added 'All Tags' clear option to Analysis filters for faster interaction." },
            { type: 'UI/UX', description: "Integrated Tag icons and corrected alignment in the nested category breakdown." },
            { type: 'Logic', description: "Refined 'Net' view by hiding percentages to avoid balance-based calculation confusion." },
        ]
    },
    {
        version: "1.8.4",
        date: "Feb 18, 2026",
        changes: [
            { type: 'UI/UX', description: "Implemented responsive typography for summary cards, ensuring amounts scale gracefully on mobile devices." },
            { type: 'UI/UX', description: "Aligned Asset performance visuals with semantic themes: primary for gains and destructive for losses." },
            { type: 'UI/UX', description: "Applied global shadow-md elevation to all major dashboard cards for enhanced visual depth." },
            { type: 'Fix', description: "Resolved critical ReferenceErrors for 'orderBy' and 'Badge' across various holding components." },
            { type: 'Logic', description: "Standardized the premium fintech UI setup across Accounts, Debts, and Assets screens." },
        ]
    }
];

const getTagColor = (type: string) => {
    switch (type) {
        case 'Feature':
            return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
        case 'UI':
        case 'UI/UX':
            return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
        case 'Fix':
        case 'Security':
            return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
        case 'Logic':
            return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
        default:
            return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
    }
};

export default function AboutPage() {
    const latestVersion = changelog.slice(0, 1).map(v => v.version);

    return (
        <div className="w-full max-w-2xl mx-auto pb-32">
            <PageHeader
                title="Release Notes"
                description="Release notes and improvements."
            >
                <Button variant="outline" asChild size="sm" className="text-muted-foreground hover:text-foreground">
                    <Link href="/profile">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Link>
                </Button>
            </PageHeader>

            <div className="relative mt-10 pl-10 border-l-[2px] border-primary/10 chat:border-primary/20 fintech:border-primary/20 space-y-16">
                <Accordion type="multiple" defaultValue={latestVersion} className="space-y-12">
                    {changelog.map((entry) => (
                        <div key={entry.version} className="relative group">
                            <div className="absolute -left-[49px] top-1.5 h-[18px] w-[18px] rounded-full bg-background border-[3px] border-primary/20 chat:border-primary/30 fintech:border-primary/30 group-data-[state=open]:border-primary group-data-[state=open]:chat:border-primary group-data-[state=open]:fintech:border-primary z-10 transition-colors" />
                            
                            <AccordionItem value={entry.version} className="border-none transition-all duration-300 rounded-xl data-[state=open]:bg-primary/[0.03] data-[state=open]:px-4 data-[state=open]:-mx-4">
                                <AccordionTrigger className="hover:no-underline py-0 items-start gap-2 text-left">
                                    <div className="flex flex-col items-start space-y-2">
                                        <h3 className="text-[18px] font-bold tracking-tight text-foreground/90 group-data-[state=open]:text-foreground">
                                            Version {entry.version}
                                        </h3>
                                        <p className="text-[14px] font-medium text-muted-foreground/70 uppercase tracking-widest">
                                            {entry.date}
                                        </p>
                                    </div>
                                </AccordionTrigger>
                                
                                <AccordionContent className="pt-6 pb-4">
                                    <div className="space-y-5">
                                        <ul className="space-y-5">
                                            {entry.changes.map((change, changeIndex) => (
                                                <li key={changeIndex} className="flex flex-col sm:flex-row sm:items-start gap-3 group/item">
                                                    <Badge 
                                                        variant="outline"
                                                        className={cn(
                                                            "w-fit px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest transition-colors shrink-0",
                                                            getTagColor(change.type)
                                                        )}
                                                    >
                                                        {change.type}
                                                    </Badge>
                                                    <p className="text-[15px] leading-relaxed text-foreground/70 group-hover/item:text-foreground transition-colors">
                                                        {change.description}
                                                    </p>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </div>
                    ))}
                </Accordion>
            </div>
            
            <div className="text-center pt-16 mt-8 border-t border-muted/50">
                <p className="text-xs font-medium text-muted-foreground/50 tracking-wide uppercase">
                    ExpenseWise &bull; v{appVersion} &bull; Built with pride.
                </p>
            </div>
        </div>
    );
}
