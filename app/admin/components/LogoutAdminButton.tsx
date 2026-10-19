'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import posthog from 'posthog-js';

export default function LogoutAdminButton() {
    const supabase = createClientComponentClient();
    const router = useRouter();

    const handleLogout = async () => {
        posthog.capture('admin_logged_out');
        posthog.reset();
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <button
            onClick={handleLogout}
            className="p-2 text-white hover:text-red-300 hover:bg-tcm-dark-red rounded-lg transition-colors cursor-pointer"
            title="Sair do Painel"
        >
            <LogOut className="w-5 h-5" />
        </button>
    );
}