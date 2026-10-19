'use client';

import { useEffect } from 'react';
import { useNavbarDispatch } from './NavbarContext';
import React from 'react';

type SetNavbarProps = {
    title: string;
    rightContent?: React.ReactNode;
    backLink?: string;
    onBack?: () => void;
    hideSidebarToggle?: boolean;
};

/**
 * Renderize este componente dentro de qualquer page para registrar 
 * o título e os botões da navbar. No unmount (durante navegação),
 * a navbar fica sem esses dados até a próxima página montar.
 */
export default function SetNavbar({ title, rightContent, backLink, onBack, hideSidebarToggle }: SetNavbarProps) {
    const setNavbar = useNavbarDispatch();

    useEffect(() => {
        setNavbar({ title, rightContent: rightContent ?? null, backLink, onBack, hideSidebarToggle });
    }, [title, rightContent, backLink, onBack, hideSidebarToggle, setNavbar]);

    // Limpa ao desmontar (navegação)
    useEffect(() => {
        return () => {
            setNavbar({ title: '', rightContent: null, hideSidebarToggle: false });
        };
    }, [setNavbar]);

    return null; // não renderiza nada visivelmente
}
