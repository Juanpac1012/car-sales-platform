import React, { useEffect, useState } from "react";
import { Edit2, Save, XCircle, LogOut, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

import * as adminAuth from "@/lib/adminAuth";
import {
  getLocalUsers,
  setLocalUserPassword,
  type LocalUser,
} from "@/lib/AdminApi";

const Cuenta: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [localUser, setLocalUser] = useState<LocalUser | null>(null);
  const [roleCode, setRoleCode] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState({
    new: false,
    confirm: false,
  });
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Cargar usuario actual y rol desde la API / localStorage
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Usa la misma lógica de auth que el resto de la app
        const { token, userId } = await adminAuth.ensureAuth();

        // Traer todos los usuarios locales y quedarnos con el actual
        const users = await getLocalUsers(token);
        const me = users.find((u) => u.user_id === userId) || null;

        setLocalUser(me);
      } catch (error) {
        console.error("Error cargando datos de cuenta:", error);
      } finally {
        setLoadingUser(false);
      }
    };

    loadUser();

    const storedRole = localStorage.getItem("current_role_code");
    setRoleCode(storedRole);
  }, []);

  const getRoleLabel = (code: string | null) => {
    if (!code) return "Sin rol asignado";
    switch (code) {
      case "admin":
        return "Administrador";
      case "dealer":
        return "Dealer";
      case "sales":
        return "Vendedor";
      default:
        return code;
    }
  };

  const displayName =
    localUser?.display_name ||
    (localUser?.email ? localUser.email.split("@")[0] : "Usuario sin nombre");

  const email = localUser?.email || "—";

  const handlePasswordEdit = () => {
    setIsEditingPassword(true);
    setPasswordError("");
  };

  const handlePasswordSave = async () => {
    if (passwordData.newPassword.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("Las contraseñas no coinciden");
      return;
    }

    try {
      setSavingPassword(true);
      const { token, userId } = await adminAuth.ensureAuth();

      await setLocalUserPassword(userId, passwordData.newPassword, token);

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña se guardó correctamente.",
      });

      setIsEditingPassword(false);
      setPasswordData({ newPassword: "", confirmPassword: "" });
      setPasswordError("");
    } catch (error: any) {
      console.error("Error actualizando contraseña:", error);
      setPasswordError(
        error?.message || "Ocurrió un error al actualizar la contraseña"
      );
      toast({
        title: "Error al actualizar la contraseña",
        description:
          error?.message || "Inténtalo de nuevo en unos minutos, por favor.",
        variant: "destructive",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  const handlePasswordCancel = () => {
    setIsEditingPassword(false);
    setPasswordData({ newPassword: "", confirmPassword: "" });
    setPasswordError("");
  };

  const handleLogout = () => {
    // Misma lógica que el botón del sidebar
    adminAuth.clearAuth();
    localStorage.removeItem("current_role_code");
    navigate("/login");
  };

  return (
    <div className="w-full flex justify-center mt-6 px-4">
      <div className="w-full max-w-6xl space-y-6">
        {/* Header + botón salir */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Cuenta</h1>
            <p className="text-muted-foreground text-sm">
              Gestiona tu información personal y tu seguridad.
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="
              flex items-center gap-2
              h-9 px-4
              rounded-xl
              border border-slate-200
              bg-white
              text-sm font-medium text-slate-700
              shadow-sm
              hover:bg-red-50 hover:text-red-700 hover:border-red-300
              transition-colors
            "
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Información del usuario</CardTitle>
            <CardDescription>
              Datos básicos de tu perfil dentro del sistema.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Datos del usuario */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>Nombre</Label>
                <div className="bg-muted border border-border rounded-lg px-4 py-3 text-sm">
                  {loadingUser ? "Cargando..." : displayName}
                </div>
              </div>

              <div>
                <Label>Correo electrónico</Label>
                <div className="bg-muted border border-border rounded-lg px-4 py-3 text-sm">
                  {loadingUser ? "Cargando..." : email}
                </div>
              </div>

              <div>
                <Label>Rol</Label>
                <div className="bg-muted border border-border rounded-lg px-4 py-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                    {getRoleLabel(roleCode)}
                  </span>
                </div>
              </div>

              <div>
                <Label>Contraseña</Label>
                <div className="bg-muted border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                  <span>••••••••</span>
                  {!isEditingPassword && (
                    <button
                      type="button"
                      onClick={handlePasswordEdit}
                      className="text-primary hover:text-primary/90 flex items-center gap-1 text-xs font-medium"
                    >
                      <Edit2 className="h-4 w-4" />
                      Editar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Cambiar contraseña */}
            {isEditingPassword && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                  <Edit2 className="h-5 w-5" />
                  Cambiar contraseña
                </h3>

                <div>
                  <Label>Nueva contraseña</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword.new ? "text" : "password"}
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((prev) => ({
                          ...prev,
                          new: !prev.new,
                        }))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword.new ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <Label>Confirmar nueva contraseña</Label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword.confirm ? "text" : "password"}
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword((prev) => ({
                          ...prev,
                          confirm: !prev.confirm,
                        }))
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword.confirm ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {passwordError && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {passwordError}
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-3">
                  <Button
                    className="flex-1 flex gap-2"
                    onClick={handlePasswordSave}
                    disabled={savingPassword}
                  >
                    <Save className="h-4 w-4" />
                    {savingPassword ? "Guardando..." : "Guardar cambios"}
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 flex gap-2"
                    type="button"
                    onClick={handlePasswordCancel}
                    disabled={savingPassword}
                  >
                    <XCircle className="h-4 w-4" />
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Cuenta;
