'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from '../ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Checkbox } from '../ui/checkbox';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '@/lib/types';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { useMediaQuery } from '@/hooks/use-media-query';


const contributionSchema = z.object({
  description: z.string().min(1, 'Description is required.'),
  totalAmount: z.coerce.number().positive('Total amount must be positive.'),
  date: z.date({ required_error: 'A date is required.' }),
  paidById: z.string().min(1, 'You must select who paid.'),
  contributorIds: z.array(z.string()).min(1, 'At least one contributor must be selected.'),
});


function DatePicker({ field }: { field: any }) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant={'outline'}
              className={cn(
                'w-full pl-3 text-left font-normal',
                !field.value && 'text-muted-foreground'
              )}
            >
              {field.value ? (
                format(field.value, 'PPP')
              ) : (
                <span>Pick a date</span>
              )}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={field.value}
            onSelect={(date) => {
              field.onChange(date);
              setOpen(false);
            }}
            disabled={(date) =>
              date > new Date() || date < new Date('1900-01-01')
            }
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <FormControl>
            <Button
              variant={'outline'}
              className={cn(
                'w-full pl-3 text-left font-normal',
                !field.value && 'text-muted-foreground'
              )}
            >
              {field.value ? (
                format(field.value, 'PPP')
              ) : (
                <span>Pick a date</span>
              )}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
            <DrawerTitle>Select Date</DrawerTitle>
            <DrawerDescription>
                Choose the date when the expense occurred.
            </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
        <Calendar
          mode="single"
          selected={field.value}
          onSelect={(date) => {
            field.onChange(date);
            setOpen(false);
          }}
          disabled={(date) =>
            date > new Date() || date < new Date('1900-01-01')
          }
          initialFocus
        />
        </div>
        <DrawerFooter>
            <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
            </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

interface AddContributionSheetProps {
    children: React.ReactNode;
    users: UserProfile[];
}

export function AddContributionSheet({ children, users }: AddContributionSheetProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();

    const form = useForm<z.infer<typeof contributionSchema>>({
        resolver: zodResolver(contributionSchema),
        defaultValues: {
            description: '',
            totalAmount: 0,
            date: new Date(),
            paidById: user?.uid || '',
            contributorIds: user ? [user.uid] : [],
        },
    });

    // Reset form when sheet opens
    useEffect(() => {
        if(open) {
            form.reset({
                description: '',
                totalAmount: 0,
                date: new Date(),
                paidById: user?.uid || '',
                contributorIds: user ? [user.uid] : [],
            });
        }
    }, [open, user, form]);

    async function onSubmit(values: z.infer<typeof contributionSchema>) {
        setIsLoading(true);
        if (!firestore || !user) {
             toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
             setIsLoading(false);
             return;
        }

        const numContributors = values.contributorIds.length;
        const share = values.totalAmount / numContributors;

        const contributionData = {
            userId: user.uid,
            description: values.description,
            totalAmount: values.totalAmount,
            date: values.date,
            paidById: values.paidById,
            contributorShares: values.contributorIds.map(id => ({ userId: id, share })),
            createdAt: serverTimestamp(),
        };

        try {
            const contributionsCol = collection(firestore, `users/${user.uid}/contributions`);
            addDocumentNonBlocking(contributionsCol, contributionData);
            
            toast({
                title: 'Shared Expense Added!',
                description: 'The contribution has been recorded.',
            });
            setOpen(false);

        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setIsLoading(false);
        }
    }


  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-headline">Add Shared Expense</SheetTitle>
          <SheetDescription>
            Fill in the details for an expense shared with others. The amount will be split equally.
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                            <Textarea placeholder="e.g., Dinner with friends" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="totalAmount"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Total Amount</FormLabel>
                        <FormControl>
                           <Input type="number" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Date</FormLabel>
                            <DatePicker field={field} />
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="contributorIds"
                    render={() => (
                        <FormItem>
                            <div className="mb-4">
                                <FormLabel className="text-base">Contributors</FormLabel>
                                <FormDescription>Select who is splitting this expense.</FormDescription>
                            </div>
                            {users?.map((item) => (
                                <FormField
                                key={item.id}
                                control={form.control}
                                name="contributorIds"
                                render={({ field }) => {
                                    return (
                                    <FormItem
                                        key={item.id}
                                        className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                        <FormControl>
                                        <Checkbox
                                            checked={field.value?.includes(item.id)}
                                            onCheckedChange={(checked) => {
                                            return checked
                                                ? field.onChange([...(field.value || []), item.id])
                                                : field.onChange(
                                                    field.value?.filter(
                                                    (value) => value !== item.id
                                                    )
                                                )
                                            }}
                                        />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                            {item.name} {item.id === user?.uid && '(You)'}
                                        </FormLabel>
                                    </FormItem>
                                    )
                                }}
                                />
                            ))}
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="paidById"
                    render={({ field }) => (
                        <FormItem className="space-y-3">
                        <FormLabel>Who paid for this?</FormLabel>
                        <FormControl>
                            <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex flex-col space-y-1"
                            >
                            {users?.map(u => (
                               <FormItem key={u.id} className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                    <RadioGroupItem value={u.id} />
                                </FormControl>
                                <FormLabel className="font-normal">{u.name} {u.id === user?.uid && '(You)'}</FormLabel>
                                </FormItem>
                            ))}
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />


                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Contribution"}
                </Button>
            </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
