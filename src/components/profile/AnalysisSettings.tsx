
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnalysisSettingsContent } from "./AnalysisSettingsContent";

export function AnalysisSettings() {
    return (
        <Card>
            <CardHeader>
                <h3 className="text-base font-semibold font-headline">Analysis Settings</h3>
                <CardDescription className="text-sm">Customize which categories to exclude.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
                <AnalysisSettingsContent />
            </CardContent>
        </Card>
    );
}
