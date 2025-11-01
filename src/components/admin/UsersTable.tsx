'use client';

import { useFirestore, useUser, setDocumentNonBlocking } from '@/firebase';
import { UserProfile } from '@/lib/types';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Switch } from '../ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';

interface UsersTableProps {
  users: UserProfile[];
  isLoading: boolean;
}

const getInitials = (name?: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export function UsersTable({ users, isLoading }: UsersTableProps) {
  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleAdminToggle = (user: UserProfile, isAdmin: boolean) => {
    if (!firestore || !currentUser) return;

    if (user.id === currentUser.id) {
        toast({
            variant: 'destructive',
            title: "Action Forbidden",
            description: "You cannot change your own admin status.",
        });
        return;
    }

    const userDocRef = doc(firestore, `users/${user.id}`);
    setDocumentNonBlocking(userDocRef, { isAdmin }, { merge: true });
    
    toast({
        title: "Permissions Updated",
        description: `${user.name}'s admin status has been ${isAdmin ? 'granted' : 'revoked'}.`
    });
  };

  if (isLoading) {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
            </CardHeader>
            <CardContent>
                 <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                            <Skeleton className="h-6 w-12" />
                        </div>
                    ))}
                 </div>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone Number</TableHead>
              <TableHead className="text-center">Is Admin?</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.photoURL ?? undefined} alt={user.name ?? ''} />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="font-medium">{user.name}</div>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phoneNumber || 'Not provided'}</TableCell>
                <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                         <Switch
                            checked={user.isAdmin}
                            onCheckedChange={(checked) => handleAdminToggle(user, checked)}
                            disabled={user.id === currentUser?.id}
                        />
                        {user.id === currentUser?.id && <Badge variant="secondary">You</Badge>}
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
