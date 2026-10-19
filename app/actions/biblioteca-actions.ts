'use server';

import { revalidateTag, revalidatePath } from 'next/cache';

export async function revalidateBibliotecaCacheAction(slug?: string) {
    try {
        // Purga a listagem geral da biblioteca e blog
        revalidateTag('biblioteca-posts', 'max');
        revalidateTag('blog-posts', 'max');
        revalidatePath('/dashboard/biblioteca');
        revalidatePath('/dashboard/blog');
        revalidatePath('/admin/biblioteca');
        revalidatePath('/admin/blog');
        
        // Se houver um slug específico, purga a página daquele artigo também
        if (slug) {
            revalidateTag(`biblioteca-post-${slug}`, 'max');
            revalidateTag(`blog-post-${slug}`, 'max');
            revalidatePath(`/dashboard/biblioteca/${slug}`);
            revalidatePath(`/dashboard/blog/${slug}`);
        }
        
        return { success: true };
    } catch (err) {
        const error = err as Error;
        console.error("Erro ao invalidar cache da biblioteca:", error);
        return { error: error?.message || "Erro desconhecido" };
    }
}

// Alias para compatibilidade legada
export const revalidateBlogCacheAction = revalidateBibliotecaCacheAction;
