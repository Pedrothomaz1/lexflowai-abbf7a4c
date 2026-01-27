import { useState } from "react";
import { Link } from "react-router-dom";
import { Cookie, Settings, Shield, BarChart3, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCookieConsent } from "@/hooks/useCookieConsent";

export function CookieBanner() {
  const {
    hasConsent,
    preferences,
    acceptAll,
    rejectNonEssential,
    updatePreferences,
  } = useCookieConsent();

  const [showModal, setShowModal] = useState(false);
  const [tempAnalytics, setTempAnalytics] = useState(preferences.analytics);
  const [tempMarketing, setTempMarketing] = useState(preferences.marketing);

  if (hasConsent) {
    return null;
  }

  const handleOpenModal = () => {
    setTempAnalytics(preferences.analytics);
    setTempMarketing(preferences.marketing);
    setShowModal(true);
  };

  const handleSavePreferences = () => {
    updatePreferences({
      analytics: tempAnalytics,
      marketing: tempMarketing,
    });
    setShowModal(false);
  };

  return (
    <>
      {/* Banner Principal */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card p-4 shadow-lg animate-fade-in md:p-6"
        role="dialog"
        aria-label="Consentimento de cookies"
      >
        <div className="container mx-auto max-w-5xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3 md:items-center">
              <div className="rounded-full bg-primary/10 p-2">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground">
                  Utilizamos cookies para melhorar sua experiência. Ao continuar
                  navegando, você concorda com nossa política de cookies.
                </p>
                <Link
                  to="/privacidade"
                  className="mt-1 inline-block text-sm text-primary hover:underline"
                >
                  Política de Privacidade
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenModal}
                className="justify-start sm:justify-center"
                aria-label="Gerenciar preferências de cookies"
              >
                <Settings className="mr-2 h-4 w-4" />
                Gerenciar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={rejectNonEssential}
                aria-label="Rejeitar cookies não essenciais"
              >
                Rejeitar não essenciais
              </Button>
              <Button
                size="sm"
                onClick={acceptAll}
                aria-label="Aceitar todos os cookies"
              >
                Aceitar todos
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Gerenciamento */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Gerenciar Preferências de Cookies
            </DialogTitle>
            <DialogDescription>
              Escolha quais tipos de cookies você deseja permitir. Cookies
              essenciais são necessários para o funcionamento básico do site.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Essenciais */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Shield className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">
                    Cookies Essenciais
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Necessários para autenticação, sessão e funcionamento básico
                  </p>
                </div>
              </div>
              <Switch checked disabled aria-label="Cookies essenciais (sempre ativo)" />
            </div>

            <Separator />

            {/* Analíticos */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <BarChart3 className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">
                    Cookies Analíticos
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Nos ajudam a entender como você usa o site para melhorá-lo
                  </p>
                </div>
              </div>
              <Switch
                checked={tempAnalytics}
                onCheckedChange={setTempAnalytics}
                aria-label="Ativar cookies analíticos"
              />
            </div>

            <Separator />

            {/* Marketing */}
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Megaphone className="mt-0.5 h-5 w-5 text-accent-foreground" />
                <div>
                  <p className="font-medium text-foreground">
                    Cookies de Marketing
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Usados para publicidade personalizada e remarketing
                  </p>
                </div>
              </div>
              <Switch
                checked={tempMarketing}
                onCheckedChange={setTempMarketing}
                aria-label="Ativar cookies de marketing"
              />
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSavePreferences}
              className="w-full sm:w-auto"
            >
              Salvar preferências
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
