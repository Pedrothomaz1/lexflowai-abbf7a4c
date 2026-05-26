import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound, Eye, EyeOff } from "lucide-react";

const MIN_LEN = 12;

function validatePassword(pwd: string): string | null {
  if (pwd.length < MIN_LEN) return `A senha deve ter pelo menos ${MIN_LEN} caracteres.`;
  if (!/[A-Z]/.test(pwd)) return "Inclua pelo menos uma letra maiúscula.";
  if (!/[a-z]/.test(pwd)) return "Inclua pelo menos uma letra minúscula.";
  if (!/[0-9]/.test(pwd)) return "Inclua pelo menos um número.";
  if (!/[^A-Za-z0-9]/.test(pwd)) return "Inclua pelo menos um caractere especial.";
  return null;
}

export const ChangePasswordCard = () => {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (next !== confirm) {
      toast({ variant: "destructive", title: "Senhas não conferem", description: "A nova senha e a confirmação devem ser iguais." });
      return;
    }
    const err = validatePassword(next);
    if (err) {
      toast({ variant: "destructive", title: "Senha fraca", description: err });
      return;
    }

    setLoading(true);
    try {
      // 1. Re-autentica com a senha atual para garantir titularidade
      const { data: userData } = await supabase.auth.getUser();
      const email = userData.user?.email;
      if (!email) throw new Error("Sessão inválida. Faça login novamente.");

      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password: current });
      if (signInErr) {
        toast({ variant: "destructive", title: "Senha atual incorreta", description: "Verifique e tente novamente." });
        setLoading(false);
        return;
      }

      // 2. Atualiza a senha
      const { error: updateErr } = await supabase.auth.updateUser({ password: next });
      if (updateErr) {
        const msg = updateErr.message || "";
        let description = "Não foi possível atualizar a senha.";
        if (/pwned|leaked|compromised/i.test(msg)) {
          description = "Esta senha aparece em vazamentos públicos. Escolha uma senha única.";
        } else if (/same.*password|new password should be different/i.test(msg)) {
          description = "A nova senha deve ser diferente da atual.";
        }
        toast({ variant: "destructive", title: "Erro ao alterar senha", description });
        setLoading(false);
        return;
      }

      toast({ title: "Senha alterada", description: "Sua nova senha já está ativa." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro", description: err.message || "Falha inesperada." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          Alterar Senha
        </CardTitle>
        <CardDescription>
          Mínimo {MIN_LEN} caracteres, com maiúscula, minúscula, número e caractere especial.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label htmlFor="current-password">Senha atual</Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showCurrent ? "text" : "password"}
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showCurrent ? "Ocultar senha" : "Mostrar senha"}
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Nova senha</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showNext ? "text" : "password"}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowNext((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showNext ? "Ocultar senha" : "Mostrar senha"}
              >
                {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar nova senha</Label>
            <Input
              id="confirm-password"
              type={showNext ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <Button type="submit" disabled={loading || !current || !next || !confirm}>
            {loading ? "Atualizando..." : "Alterar senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ChangePasswordCard;
