import { Link } from "react-router-dom";
import { Shield, FileText, HeadphonesIcon } from "lucide-react";

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-end px-4 md:px-6">
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/app/privacy"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <Shield className="w-4 h-4" />
              Privacidade
            </Link>
            <Link
              to="/app/terms"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Termos
            </Link>
            <Link
              to="/app/support"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
            >
              <HeadphonesIcon className="w-4 h-4" />
              Suporte
            </Link>
          </nav>
        </div>

        {/* Mobile Navigation */}
        <nav className="md:hidden border-t border-border bg-card">
          <div className="container px-4 py-2 flex justify-around">
            <Link
              to="/app/privacy"
              className="flex flex-col items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              <Shield className="w-5 h-5" />
              <span>Privacidade</span>
            </Link>
            <Link
              to="/app/terms"
              className="flex flex-col items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              <FileText className="w-5 h-5" />
              <span>Termos</span>
            </Link>
            <Link
              to="/app/support"
              className="flex flex-col items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              <HeadphonesIcon className="w-5 h-5" />
              <span>Suporte</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card">
        <div className="container px-4 md:px-6 py-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Brand */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-primary rounded-md flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-lg">S</span>
                </div>
                <span className="font-bold text-lg text-gradient">Prass Trainer</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Transformando vidas através do fitness personalizado.
              </p>
            </div>

            {/* Legal Links */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Informações Legais</h3>
              <nav className="flex flex-col gap-2">
                <Link
                  to="/app/privacy"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Política de Privacidade
                </Link>
                <Link
                  to="/app/terms"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Termos de Serviço
                </Link>
                <Link
                  to="/app/support"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Suporte
                </Link>
              </nav>
            </div>

            {/* Contact */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Contato</h3>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <a
                  href="mailto:suporte@seu-dominio.com"
                  className="hover:text-foreground transition-colors"
                >
                  suporte@seu-dominio.com
                </a>
                <a
                  href="https://seu-dominio.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  seu-dominio.com
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-8 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Prass Trainer. Todos os direitos reservados.</p>
            <p className="flex items-center gap-1">
              Feito com <span className="text-destructive">❤️</span> no Brasil
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
