import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const code = params.get("code")?.trim() || "";
  const token = params.get("token")?.trim() || ""; // Supabase invitation token
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const acceptDisabled = useMemo(() => (!code && !token) || !isAuthenticated || submitting, [code, token, isAuthenticated, submitting]);

  useEffect(() => {
    // SEO basics
    document.title = "Aceitar convite • aluno e professor";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "Aceite seu convite de aluno para vincular ao professor com segurança.");
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Aceite seu convite de aluno para vincular ao professor com segurança.";
      document.head.appendChild(m);
    }
    // Canonical
    const canonicalHref = window.location.origin + "/accept-invite" + (code ? `?code=${code}` : token ? `?token=${token}` : "");
    let linkEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!linkEl) {
      linkEl = document.createElement("link");
      linkEl.rel = "canonical";
      document.head.appendChild(linkEl);
    }
    linkEl.href = canonicalHref;
  }, [code, token]);

  const handleAccept = async () => {
    if (!code && !token) {
      toast({ title: "Código inválido", description: "O código do convite é obrigatório.", variant: "destructive" });
      return;
    }
    if (!user?.id) {
      toast({ title: "Faça login", description: "Entre para aceitar o convite." });
      return;
    }

    setSubmitting(true);
    try {
      if (token) {
        // Process Supabase invitation token first
        // The user metadata should contain the invitation code
        const metadata = user.user_metadata;
        const invitationCode = metadata?.invitationCode || code;
        
        if (invitationCode) {
          const { data, error } = await supabase.rpc("accept_invitation", { code: invitationCode });
          if (error) throw error;
        }
      } else if (code) {
        // Process manual invitation code
        const { data, error } = await supabase.rpc("accept_invitation", { code });
        if (error) throw error;
      }

      toast({ title: "Convite aceito", description: "Você foi vinculado ao professor com sucesso." });
      navigate("/", { replace: true });
    } catch (err: any) {
      console.error("[AcceptInvite] erro:", err);
      toast({ title: "Não foi possível aceitar", description: err?.message || "Tente novamente." , variant: "destructive"});
    } finally {
      setSubmitting(false);
    }
  };

  const shareUrl = `${window.location.origin}/accept-invite?code=${code || ""}`;

  return (
    <main className="container mx-auto px-4 py-10 max-w-2xl">
      <Card className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Aceitar convite</h1>
          <p className="text-muted-foreground mt-1">
            Confirme o vínculo entre aluno e professor. Seu acesso será sincronizado automaticamente.
          </p>
        </div>

        {code && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Código do convite</p>
            <div className="flex items-center gap-2">
              <code className="px-3 py-2 rounded-md border border-border text-sm">
                {code}
              </code>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigator.clipboard.writeText(shareUrl).then(() => toast({ title: "Link copiado" }))}
              >
                Copiar link
              </Button>
            </div>
          </div>
        )}

        {token && (
          <div className="p-3 bg-primary/10 rounded-md">
            <p className="text-sm font-medium">Convite por email</p>
            <p className="text-sm text-muted-foreground">
              Você recebeu este convite por email. Clique em "Aceitar convite" para continuar.
            </p>
          </div>
        )}

        {!isAuthenticated ? (
          <div className="space-y-3">
            <p className="text-sm">Você precisa entrar para aceitar o convite.</p>
            <div className="flex gap-2">
              <Button asChild>
                <Link to="/auth">Entrar / Criar conta</Link>
              </Button>
              {code && (
                <Button variant="outline" asChild>
                  <a href={shareUrl}>Recarregar com código</a>
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Button onClick={handleAccept} disabled={acceptDisabled}>
              {submitting ? "Aceitando..." : "Aceitar convite"}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/", { replace: true })}>Cancelar</Button>
          </div>
        )}

        <aside className="text-xs text-muted-foreground">
          Segurança: somente convites válidos e não expirados podem ser aceitos. Seu perfil e permissões são protegidos por RLS.
        </aside>
      </Card>
    </main>
  );
}
