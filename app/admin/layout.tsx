import '@/lib/demo/supabaseSandbox';
import { isPortfolioDemoMode } from '@/lib/demo/supabaseSandbox';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import NavbarShell from '../components/NavbarShell';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    if (!isPortfolioDemoMode()) {
        const cookieStore = await cookies();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

        const { data: { user }, error } = await supabase.auth.getUser();

        if (error || !user) redirect('/login');

        // Verifica se o usuário é administrador
        const { data: userProfile } = await supabase
            .from('alunos')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!userProfile?.is_admin) redirect('/dashboard');
    }

    return (
        <>
            <NavbarShell />
            {children}
        </>
    );
}
