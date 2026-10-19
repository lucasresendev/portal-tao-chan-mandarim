import { redirect } from 'next/navigation';

export default async function BlogRedirectPage({ searchParams }: { searchParams: Promise<{ categoria?: string }> }) {
    const { categoria } = await searchParams;
    if (categoria) {
        redirect(`/dashboard/biblioteca?categoria=${encodeURIComponent(categoria)}`);
    }
    redirect('/dashboard/biblioteca');
}
