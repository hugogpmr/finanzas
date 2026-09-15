import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
