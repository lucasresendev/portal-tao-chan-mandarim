import type { JSONContent } from '@tiptap/react';

export type BibliotecaStatus = 'rascunho' | 'publicado';
export type BlogStatus = BibliotecaStatus;

export type PublicacaoBiblioteca = {
    id: string;
    titulo: string;
    slug: string;
    capa_url: string | null;
    conteudo: JSONContent;
    status: BibliotecaStatus;
    autor_id: string | null;
    categoria: string;
    tags: string[];
    ordem_exibicao: number;
    e_destaque: boolean;
    data_publicacao: string;
    created_at: string;
    updated_at: string;
};

export type PublicacaoBlog = PublicacaoBiblioteca;

export type PublicacaoBibliotecaFormData = {
    titulo: string;
    capa_url: string | null;
    conteudo: JSONContent;
    status: BibliotecaStatus;
    categoria: string;
    tags: string[];
    ordem_exibicao: number;
    e_destaque: boolean;
    data_publicacao: string;
};

export type PublicacaoBlogFormData = PublicacaoBibliotecaFormData;
