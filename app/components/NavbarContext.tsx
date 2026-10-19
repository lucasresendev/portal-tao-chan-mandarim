'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export type NavbarState = {
    title: string;
    rightContent: React.ReactNode;
    backLink?: string;
    onBack?: () => void;
    hideSidebarToggle?: boolean;
};

export type NavbarDispatch = (s: NavbarState) => void;

type NavbarContextType = {
    state: NavbarState;
    setNavbar: NavbarDispatch;
};

const DEFAULT_STATE: NavbarState = { title: '', rightContent: null, hideSidebarToggle: false };

const NavbarStateContext = createContext<NavbarState>(DEFAULT_STATE);
const NavbarDispatchContext = createContext<NavbarDispatch>(() => {});

export function NavbarProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<NavbarState>(DEFAULT_STATE);
    const clearTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const setNavbar = useCallback((s: NavbarState) => {
        // Se havia uma limpeza pendente de desmonte da rota anterior, cancela imediatamente
        if (clearTimerRef.current) {
            clearTimeout(clearTimerRef.current);
            clearTimerRef.current = null;
        }

        const isEmpty = !s.title && !s.rightContent && !s.backLink && !s.onBack;

        if (isEmpty) {
            // Atrasa a limpeza em 50ms para permitir que a nova página monte e defina seu título
            // diretamente em 1 único commit sem passar por um estado intermediário vazio
            clearTimerRef.current = setTimeout(() => {
                setState(prev => {
                    if (!prev.title && !prev.rightContent && !prev.backLink && !prev.onBack && prev.hideSidebarToggle === s.hideSidebarToggle) {
                        return prev;
                    }
                    return s;
                });
            }, 50);
            return;
        }

        setState(prev => {
            if (
                prev.title === s.title &&
                prev.backLink === s.backLink &&
                prev.hideSidebarToggle === s.hideSidebarToggle &&
                prev.onBack === s.onBack &&
                prev.rightContent === s.rightContent
            ) {
                return prev;
            }
            return s;
        });
    }, []);

    React.useEffect(() => {
        return () => {
            if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        };
    }, []);

    return (
        <NavbarDispatchContext.Provider value={setNavbar}>
            <NavbarStateContext.Provider value={state}>
                {children}
            </NavbarStateContext.Provider>
        </NavbarDispatchContext.Provider>
    );
}

/** Hook otimizado para componentes que apenas precisam LER o estado da Navbar */
export function useNavbarState() {
    return useContext(NavbarStateContext);
}

/** Hook estável para páginas que apenas precisam REGISTRAR dados na Navbar sem re-renderizar */
export function useNavbarDispatch() {
    return useContext(NavbarDispatchContext);
}

/** Hook unificado retrocompatível */
export function useNavbar(): NavbarContextType {
    const state = useNavbarState();
    const setNavbar = useNavbarDispatch();
    return useMemo(() => ({ state, setNavbar }), [state, setNavbar]);
}
