import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import SetNavbar from '../../../components/SetNavbar';
import BibliotecaEditorPage from '../components/BibliotecaEditorPage';

export default async function NovaBibliotecaPage() {
    const cookieStore = await cookies();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerComponentClient({ cookies: () => cookieStore as any });
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <>
            <SetNavbar title="Nova Publicação" backLink="/admin/biblioteca" />
            <BibliotecaEditorPage autorId={user?.id ?? ''} />
        </>
    );
}
