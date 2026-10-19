import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { normalizeDemoStorageUrl } from '@/lib/demo/supabaseSandbox';

const BUCKET = 'blog-assets';

function sanitizeBibliotecaPath(str: string): string {
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9-\s]/g, '')
        .replace(/[\s-]+/g, '_')
        .slice(0, 60);
}

function randomToken(len = 6): string {
    return Math.random().toString(36).slice(2, 2 + len);
}

export function buildBibliotecaImagePath(slug: string, filename: string): string {
    const ext = filename.split('.').pop() ?? 'jpg';
    const sanitizedName = sanitizeBibliotecaPath(filename.replace(/\.[^/.]+$/, ''));
    return `images/${slug}/${sanitizedName}_${Date.now()}_${randomToken()}.${ext}`;
}

export function buildBibliotecaAudioPath(slug: string, filename: string): string {
    const ext = filename.split('.').pop() ?? 'mp3';
    const sanitizedName = sanitizeBibliotecaPath(filename.replace(/\.[^/.]+$/, ''));
    return `audio/${slug}/${sanitizedName}_${Date.now()}_${randomToken()}.${ext}`;
}

export async function uploadBibliotecaImage(slug: string, file: File): Promise<string> {
    const supabase = createClientComponentClient();
    const path = buildBibliotecaImagePath(slug, file.name);

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
    });

    if (error) throw new Error(`Erro ao fazer upload da imagem: ${error.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return normalizeDemoStorageUrl(data.publicUrl);
}

export async function uploadBibliotecaAudio(slug: string, file: File): Promise<string> {
    const supabase = createClientComponentClient();
    const path = buildBibliotecaAudioPath(slug, file.name);

    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: false,
    });

    if (error) throw new Error(`Erro ao fazer upload do áudio: ${error.message}`);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return normalizeDemoStorageUrl(data.publicUrl);
}

export function generateSlug(title: string): string {
    return title
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/[\s-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

// Aliases para compatibilidade legada
export const uploadBlogImage = uploadBibliotecaImage;
export const uploadBlogAudio = uploadBibliotecaAudio;
export const buildBlogImagePath = buildBibliotecaImagePath;
export const buildBlogAudioPath = buildBibliotecaAudioPath;
