'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Users,
  Edit,
  Trash2,
  Search,
  Mail,
  Plus,
  UserMinus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface List {
  id: string;
  name: string;
  description: string | null;
  contactCount: number;
  createdAt: string;
}

interface Contact {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  status: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ListDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [list, setList] = useState<List | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await fetch(`/api/lists/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setList(data);
        }
      } catch (error) {
        console.error('Failed to fetch list:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchList();
    }
  }, [params.id]);

  const fetchContacts = useCallback(async () => {
    if (!params.id) return;

    setContactsLoading(true);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', pagination.page.toString());
      queryParams.set('limit', pagination.limit.toString());
      if (search) queryParams.set('search', search);

      const res = await fetch(
        `/api/lists/${params.id}/contacts?${queryParams.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setContactsLoading(false);
    }
  }, [params.id, pagination.page, pagination.limit, search]);

  useEffect(() => {
    if (list) {
      fetchContacts();
    }
  }, [list, fetchContacts]);

  const handleRemoveContact = async (contactId: string) => {
    try {
      const response = await fetch(
        `/api/lists/${params.id}/contacts/${contactId}`,
        {
          method: 'DELETE',
        }
      );
      if (response.ok) {
        toast.success('Contact removed from list');
        fetchContacts();
      }
    } catch {
      toast.error('Failed to remove contact');
    }
  };

  const handleDeleteList = async () => {
    if (!list) return;
    try {
      const response = await fetch(`/api/lists/${list.id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        toast.success('List deleted successfully');
        router.push('/dashboard/lists');
      }
    } catch {
      toast.error('Failed to delete list');
    }
  };

  const statusColors: Record<string, string> = {
    SUBSCRIBED: 'bg-success/10 text-success',
    UNSUBSCRIBED: 'bg-muted text-muted-foreground',
    BOUNCED: 'bg-destructive/10 text-destructive',
    COMPLAINED: 'bg-warning/10 text-warning',
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="bg-muted h-8 w-48 animate-pulse rounded" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="bg-muted h-64 animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-medium tracking-tight">
            List Not Found
          </h1>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="bg-muted mb-4 rounded-full p-4">
              <Users className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="mb-1 text-lg font-medium tracking-tight">
              List not found
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              The list you&apos;re looking for doesn&apos;t exist or has been
              deleted.
            </p>
            <Button asChild>
              <Link href="/dashboard/lists">View All Lists</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-3xl font-medium tracking-tight">{list.name}</h1>
            {list.description && (
              <p className="text-muted-foreground">{list.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit List
          </Button>
          <Button variant="destructive" onClick={handleDeleteList}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-foreground/5 rounded-lg p-3">
                <Users className="text-foreground/70 h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-medium tracking-tight">
                  {list.contactCount}
                </p>
                <p className="text-muted-foreground text-sm">Total Contacts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-foreground/5 rounded-lg p-3">
                <Mail className="text-foreground/70 h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-medium tracking-tight">0</p>
                <p className="text-muted-foreground text-sm">Campaigns Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="bg-foreground/5 rounded-lg p-3">
                <Users className="text-foreground/70 h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-medium tracking-tight">
                  {new Date(list.createdAt).toLocaleDateString()}
                </p>
                <p className="text-muted-foreground text-sm">Created</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-medium tracking-tight">
                Contacts in this List
              </CardTitle>
              <CardDescription>Manage contacts in {list.name}</CardDescription>
            </div>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Contacts
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Contacts Table */}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contactsLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-[200px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[150px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-[80px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : contacts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="text-muted-foreground h-8 w-8" />
                        <p className="text-muted-foreground">
                          No contacts in this list
                        </p>
                        <Button variant="outline" size="sm">
                          Add contacts
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  contacts.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell className="font-medium">
                        {contact.email}
                      </TableCell>
                      <TableCell>
                        {contact.firstName || contact.lastName
                          ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            statusColors[contact.status] ||
                            'bg-muted text-muted-foreground'
                          }
                        >
                          {contact.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveContact(contact.id)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{' '}
                of {pagination.total} contacts
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page === 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
