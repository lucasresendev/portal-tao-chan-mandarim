import { redirect } from 'next/navigation';

export default async function AdminBlogIdRedirect({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    redirect(`/admin/biblioteca/${id}`);
}
