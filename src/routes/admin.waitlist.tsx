import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useServerFn } from '@tanstack/react-start';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { getWaitlistEntries } from '@/lib/waitlist.functions';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Users, Mail, Building2, Loader2 } from 'lucide-react';

export const Route = createFileRoute('/admin/waitlist')({
  head: () => ({
    meta: [
      { title: 'Waitlist Admin — carforms' },
      { name: 'robots', content: 'noindex, nofollow' },
    ],
  }),
  component: WaitlistAdminPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold">Fehler</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Erneut versuchen
        </button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-8">Nicht gefunden</div>,
});

function WaitlistAdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const fetchWaitlist = useServerFn(getWaitlistEntries);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setIsAdmin(false); return; }
    supabase
      .rpc('has_role', { _user_id: user.id, _role: 'admin' })
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user, authLoading]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-waitlist'],
    queryFn: () => fetchWaitlist(),
    enabled: isAdmin === true,
  });

  if (authLoading || isAdmin === null) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold">Anmeldung erforderlich</h1>
        <p className="mt-2 text-sm text-muted-foreground">Bitte melde dich an, um diese Seite zu sehen.</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold">Zugriff verweigert</h1>
        <p className="mt-2 text-sm text-muted-foreground">Nur Admins haben Zugriff auf diese Seite.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Waitlist</h1>
          <p className="text-sm text-muted-foreground">Alle Anmeldungen für die Warteliste</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2">
          <Users className="h-4 w-4 text-yellow-400" />
          <span className="text-sm font-medium">{data?.count ?? 0} Einträge</span>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error).message}
        </div>
      )}

      {data && data.entries.length === 0 && (
        <div className="rounded-lg border border-border bg-card p-12 text-center text-sm text-muted-foreground">
          Noch keine Waitlist-Einträge.
        </div>
      )}

      {data && data.entries.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">E-Mail</th>
                <th className="px-4 py-3">Typ</th>
                <th className="px-4 py-3">Rolle</th>
                <th className="px-4 py-3">Unternehmen</th>
                <th className="px-4 py-3">Marketing</th>
                <th className="px-4 py-3">Registriert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.entries.map((e) => (
                <tr key={e.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{e.full_name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <a href={`mailto:${e.email}`} className="inline-flex items-center gap-1 text-yellow-400 hover:underline">
                      <Mail className="h-3 w-3" /> {e.email}
                    </a>
                  </td>
                  <td className="px-4 py-3 capitalize">{e.account_type}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(e.role as string[]).map((r) => (
                        <span key={r} className="rounded-full bg-muted px-2 py-0.5 text-xs">{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {e.company_name ? (
                      <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {e.company_name}</span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">{e.marketing_consent ? 'Ja' : 'Nein'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(e.created_at).toLocaleString('de-DE')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
