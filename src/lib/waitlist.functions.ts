import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const getWaitlistEntries = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc('has_role', {
      _user_id: context.userId,
      _role: 'admin',
    });
    if (roleErr) throw new Error('Berechtigung konnte nicht geprüft werden');
    if (!isAdmin) throw new Error('Forbidden');

    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data, error, count } = await supabaseAdmin
      .from('waitlist_signups')
      .select('id, full_name, email, role, account_type, company_name, marketing_consent, created_at', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return { entries: data ?? [], count: count ?? 0 };
  });
