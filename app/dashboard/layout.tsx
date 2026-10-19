import NavbarShell from '../components/NavbarShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <NavbarShell />
            {children}
        </>
    );
}
