import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Iniciar Sesión • CPCE Salud",
    description: "Iniciar sesión en el sistema de auditoría médica",
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Layout sin sidebar ni header para páginas de autenticación
    return <>{children}</>;
}
