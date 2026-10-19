import { redirect } from 'next/navigation';

export default async function BlogSlugRedirectPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    redirect(`/dashboard/biblioteca/${slug}`);
}
