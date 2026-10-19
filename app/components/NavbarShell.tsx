'use client';

import TopNavbar from './TopNavbar';

/**
 * Inclua este componente nos layouts autenticados (admin, dashboard).
 * O login e páginas públicas NÃO devem renderizá-lo.
 */
export default function NavbarShell() {
    return <TopNavbar />;
}
