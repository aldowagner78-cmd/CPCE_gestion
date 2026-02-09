export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Este layout ahora es transparente porque el layout global (src/app/layout.tsx)
    // maneja el Sidebar y el Header mediante MainLayout.
    return <>{children}</>;
}
