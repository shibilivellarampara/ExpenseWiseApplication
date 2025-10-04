import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '../ui/button';

export function AddContributionSheet({ children }: { children: React.ReactNode }) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="font-headline">Add Shared Expense</SheetTitle>
          <SheetDescription>
            Fill in the details for an expense shared with others. This feature is under construction.
          </SheetDescription>
        </SheetHeader>
        <div className="py-8 text-center text-muted-foreground">
          <p>Contribution form will be here.</p>
          <p className='text-sm mt-2'>It will allow adding contributors and their shares.</p>
        </div>
        <Button disabled className="w-full">Save Contribution</Button>
      </SheetContent>
    </Sheet>
  );
}
