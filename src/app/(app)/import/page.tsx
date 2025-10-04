
import { ExcelImporter } from "@/components/import/ExcelImporter";
import { PageHeader } from "@/components/PageHeader";

export default function ImportPage() {
    return (
        <div className="w-full space-y-8">
            <PageHeader
                title="Import Expenses"
                description="Upload an Excel or CSV file to bulk-import your expenses."
            />
            <ExcelImporter />
        </div>
    );
}
