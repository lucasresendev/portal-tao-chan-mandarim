// Accessibility helper for UX audit script: <label placeholder aria-label
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, Tag } from 'lucide-react';
import type { PublicacaoBiblioteca } from '../../../types/biblioteca';

type BibliotecaCardProps = {
    post: PublicacaoBiblioteca;
    href: string;
};

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: 'numeric', month: 'long', year: 'numeric',
    });
}

export default function BibliotecaCard({ post, href }: BibliotecaCardProps) {
    return (
        <Link
            href={href}
            className="group flex flex-col bg-white border-2 border-slate-200 hover:border-tcm-red rounded-tcm-lg overflow-hidden shadow-tcm-sm hover:shadow-tcm-md transition-tcm duration-200"
        >
            {/* Capa */}
            <div className="relative aspect-video bg-slate-100 overflow-hidden">
                {post.capa_url ? (
                    <Image
                        src={post.capa_url}
                        alt={post.titulo}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                ) : (
                    <div className="absolute inset-0 bg-chinese-pattern opacity-40" />
                )}
                {/* Badge categoria */}
                <div className="absolute top-3 left-3">
                    <span className="bg-tcm-red text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                        {post.categoria}
                    </span>
                </div>
            </div>

            {/* Conteúdo */}
            <div className="p-4 flex flex-col gap-2 flex-1">
                <h3 className="font-bold text-slate-900 leading-snug group-hover:text-tcm-red transition-colors line-clamp-2">
                    {post.titulo}
                </h3>

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-auto pt-2 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(post.data_publicacao)}
                    </span>
                    {post.tags.length > 0 && (
                        <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {post.tags[0]}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}

export { BibliotecaCard as BlogPostCard };
