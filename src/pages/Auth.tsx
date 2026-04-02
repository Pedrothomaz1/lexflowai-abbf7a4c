import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Scale, ArrowRight, Shield, BarChart3, Bell, Lock, Eye, EyeOff, Wrench, FileText } from "lucide-react";

import { cn } from "@/lib/utils";
import { handleDbError } from "@/utils/dbErrorHandler";

const TERMS_VERSION = "1.0";
const PRIVACY_VERSION = "1.0";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    // Check if user is already logged in and redirect
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/auth/callback");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        // Redirect to callback to handle proper module routing
        navigate("/auth/callback");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Function to register LGPD consent
  const registrarAceiteLGPD = async (userId: string) => {
    try {
      const { error } = await supabase.functions.invoke("registrar-aceite-lgpd", {
        body: {
          user_id: userId,
          versao_termos: TERMS_VERSION,
          versao_privacidade: PRIVACY_VERSION,
        },
      });

      if (error) {
        console.error("Error registering LGPD consent:", error);
        // Don't block authentication if consent logging fails
      } else {
        console.log("LGPD consent registered successfully");
      }
    } catch (err) {
      console.error("Failed to register LGPD consent:", err);
    }
  };


  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!termsAccepted) {
      toast({
        variant: "destructive",
        title: "Aceite obrigatório",
        description: "Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.",
      });
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: handleDbError(error).message,
      });
    } else if (data.user) {
      // Register LGPD consent after successful login
      await registrarAceiteLGPD(data.user.id);
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!termsAccepted) {
      toast({
        variant: "destructive",
        title: "Aceite obrigatório",
        description: "Você precisa aceitar os Termos de Uso e a Política de Privacidade para continuar.",
      });
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Erro ao criar conta",
        description: handleDbError(error).message,
      });
    } else {
      // Register LGPD consent after successful signup
      if (data.user) {
        await registrarAceiteLGPD(data.user.id);
      }
      toast({
        title: "Conta criada com sucesso!",
        description: "Você já pode fazer login.",
      });
    }

    setLoading(false);
  };

  const features = [
    {
      icon: FileText,
      title: "Gestão de Contratos",
      description: "Controle total de prazos",
    },
    {
      icon: Wrench,
      title: "Serviços Periódicos",
      description: "Renovações automáticas",
    },
    {
      icon: Bell,
      title: "Alertas Automáticos",
      description: "Notificações inteligentes",
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-semibold">LexFlow</span>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold leading-tight">
                Gestão Inteligente
                <br />
                <span className="text-white/80">de Contratos e Serviços</span>
              </h1>
              <p className="text-lg text-white/70 max-w-md">
                Dois módulos integrados para gestão completa: contratos com fornecedores 
                e serviços periódicos com renovações automáticas.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm animate-fade-in"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">{feature.title}</p>
                    <p className="text-sm text-white/60">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-sm text-white/50">
            © {new Date().getFullYear()} LexFlowAI. Todos os direitos reservados.
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile Logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Scale className="h-7 w-7 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">LexFlow</span>
          </div>

          <div className="space-y-6">
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h2>
              <p className="text-sm text-muted-foreground">
                Entre com sua conta para continuar
              </p>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 h-11">
                <TabsTrigger value="login" className="text-sm">Login</TabsTrigger>
                <TabsTrigger value="signup" className="text-sm">Cadastro</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-6">
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 text-sm font-medium"
                    onClick={handleGoogleLogin}
                    disabled={loading || !termsAccepted}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Entrar com Google
                  </Button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        ou continue com email
                      </span>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      required
                      className="h-11"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-sm font-medium">
                      Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="login-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        required
                        className="h-11 pr-10"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 text-sm font-medium"
                    disabled={loading || !termsAccepted}
                  >
                    {loading ? (
                      "Entrando..."
                    ) : (
                      <>
                        Entrar
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-6">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="text-sm font-medium">
                      Nome Completo
                    </Label>
                    <Input
                      id="signup-name"
                      name="fullName"
                      type="text"
                      placeholder="João Silva"
                      required
                      className="h-11"
                      autoComplete="name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="text-sm font-medium">
                      Email
                    </Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="seu@email.com"
                      required
                      className="h-11"
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="text-sm font-medium">
                      Senha
                    </Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••"
                        required
                        minLength={12}
                        pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$"
                        title="A senha deve ter pelo menos 12 caracteres, incluindo maiúscula, minúscula, número e caractere especial"
                        className="h-11 pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Mínimo 12 caracteres com maiúscula, minúscula, número e especial
                    </p>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 text-sm font-medium"
                    disabled={loading || !termsAccepted}
                  >
                    {loading ? (
                      "Criando conta..."
                    ) : (
                      <>
                        Criar conta
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* LGPD Checkbox - Required */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="terms-checkbox"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                  className="mt-1"
                />
                <Label
                  htmlFor="terms-checkbox"
                  className="text-sm leading-relaxed cursor-pointer text-muted-foreground"
                >
                  Declaro que li e concordo com os{" "}
                  <Link
                    to="/termos"
                    className="text-primary underline hover:no-underline font-medium"
                    target="_blank"
                  >
                    Termos de Uso
                  </Link>{" "}
                  e estou ciente da{" "}
                  <Link
                    to="/privacidade"
                    className="text-primary underline hover:no-underline font-medium"
                    target="_blank"
                  >
                    Política de Privacidade
                  </Link>
                  .
                </Label>
              </div>

              {/* Legal Text */}
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ao continuar, você declara que leu e concorda com os{" "}
                <Link to="/termos" className="underline hover:text-foreground transition-colors">
                  Termos de Uso
                </Link>{" "}
                e está ciente da{" "}
                <Link to="/privacidade" className="underline hover:text-foreground transition-colors">
                  Política de Privacidade
                </Link>
                , inclusive quanto ao tratamento de dados pessoais nos termos da Lei nº 13.709/2018 (LGPD).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
