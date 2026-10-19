import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import SetNavbar from '../../../components/SetNavbar';
import BibliotecaEditorPage from '../components/BibliotecaEditorPage';
import type { PublicacaoBiblioteca } from '../../../../types/biblioteca';

export default async function EditarBibliotecaPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cookieStore = await cookies();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServerComponentClient({ cookies: () => cookieStore as any });

    const [{ data: post }, { data: { user } }] = await Promise.all([
        supabase.from('publicacoes_blog').select('*').eq('id', id).single(),
        supabase.auth.getUser(),
    ]);

    if (!post) notFound();

    return (
        <>
            <SetNavbar title="Editar Publicação" backLink="/admin/biblioteca" />
            <BibliotecaEditorPage post={post as PublicacaoBiblioteca} autorId={user?.id ?? ''} />
        </>
    );
}
