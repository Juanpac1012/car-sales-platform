import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/assets/provicional.png";
import * as adminAuth from "@/lib/adminAuth";
import { dbErrorToSpanishMessage, logDbError } from "@/lib/errors/EnumDbError";

const API = (
   import.meta.env.VITE_API_URL ||
  "https://postrest-dealercar-semi-props.kwu5pq.easypanel.host"
).replace(/\/+$/, "");

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [exiting, setExiting] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();
    setLoading(true);

    try {
      const url = `${API}/rpc/login_local`;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p_email: email,
          p_password: password,
        }),
      });

      // ✅ Leer el body UNA sola vez (evita "body already used")
      let payload: any = null;
      try {
        payload = await res.json();
      } catch {
        payload = await res.text();
      }

      // ✅ Si el servidor respondió error, lanzar mensaje mapeado
      if (!res.ok) {
        logDbError(payload); // solo consola
        throw new Error(dbErrorToSpanishMessage(payload));
      }

      const data = payload;

      if (!data || !data.access_token || !data.user?.id) {
        throw new Error("Respuesta de login inválida");
      }

      // Guardar token y datos de usuario
      adminAuth.setToken(data.access_token);
      adminAuth.setUserId(data.user.id);
      if (data.expires_at) {
        adminAuth.setTokenExpiresAt(data.expires_at);
      }

      // Resolver rol REAL desde backend (whoami)
try {
const meRes = await fetch(`${API}/rpc/whoami`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${data.access_token}`,
    "Accept-Profile": "api",
    "Content-Profile": "api",
  },
  body: JSON.stringify({}),
});

  if (!meRes.ok) throw new Error("No se pudo resolver el rol del usuario");

const meJson = await meRes.json();
const me = Array.isArray(meJson) ? meJson[0] : meJson;

  if (me?.role_code) {
    localStorage.setItem("current_role_code", me.role_code);
  } else {
    localStorage.removeItem("current_role_code");
    console.warn("Usuario sin rol asignado");
  }
} catch (roleError) {
  console.error("Error resolviendo rol (whoami):", roleError);
  localStorage.removeItem("current_role_code");
}

      toast({
        title: "Inicio de sesión exitoso",
        description: `Bienvenido ${data.user?.email || ""}`,
      });

    setExiting(true);
setTimeout(() => window.location.assign("/"), 240);

    } catch (error: any) {
      const safeMessage =
        error?.message === "Respuesta de login inválida"
          ? "No se pudo iniciar sesión. Intentá de nuevo."
          : (error?.message || "Ocurrió un error inesperado. Intenta nuevamente.");

      console.error("Error en login:", error);

      toast({
        title: "Error al iniciar sesión",
        description: safeMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <Card
        className={`w-full max-w-md animate-fadeInUp ${
          loading ? "login-submitting" : ""
        } ${exiting ? "login-exit" : ""}`}
      >
        <CardHeader className="space-y-4">
          <div className="flex justify-center animate-fadeInUp animate-delay-1">
            <img src={Logo} alt="Dealer" className="h-16 w-auto" />
          </div>

          <div className="space-y-2 text-center animate-fadeInUp animate-delay-2">
            <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
            <CardDescription>
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="animate-fadeInUp animate-delay-3">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="animate-fadeInUp animate-delay-3"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="animate-fadeInUp animate-delay-4"
              />
            </div>

            <Button
              type="submit"
              className={`w-full animate-fadeInUp animate-delay-4 ${
                loading ? "btn-pulse-loading" : ""
              }`}
              disabled={loading}
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
