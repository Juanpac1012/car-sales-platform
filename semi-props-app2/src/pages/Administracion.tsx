import React, { useEffect, useMemo, useState } from "react";
import { dbErrorToSpanishMessage } from "@/lib/errors/EnumDbError";
import { userHasAccess } from "../lib/roleUtils";
import { Navigate } from "react-router-dom";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  User,
  Shield,
  Key,
  Building,
  Car,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ensureAuth, syncCurrentRolePerms, syncCurrentRoleCode } from "@/lib/adminAuth";

import {
  AppRole,
  AppPerm,
  AppUserRole,
  LocalUser,
  DealerUser,
  Dealer,
  Make,
  Model,

  // roles
  getAppRoles,
  createAppRole,
  updateAppRole,
  deleteAppRole,

  // perms catálogo
  getAppPerms,

  // user roles
  getAppUserRoles,
  setSingleUserRole,

  AppRolePermissionRow,
  getAllRolePermissions,
  getAppRolePermissions,
  createRolePermission,
  deleteRolePermission,

  // local users
  getLocalUsers,
  createLocalUserWithPassword,
  updateLocalUser,
  deleteLocalUser,
  setLocalUserPassword,

  // dealer_users (✅ modelo correcto)
  getDealerUsers,
  createDealerUser,
  updateDealerUserRole,
  deleteDealerUser,

  // dealers
  getDealers,

  // makes/models
  getMakes,
  createMake,
  updateMake,
  deleteMake,
  getModels,
  createModel,
  updateModel,
  deleteModel,
} from "@/lib/AdminApi";

type DealerUserRow = DealerUser & {
  dealer_role?: string | null; // ✅ viene de dealer_users.dealer_role (text)
};

type PermScope = "vista" | "accion";
type RolePermState = Record<string, PermScope>; // permission_id -> scope

export default function Administracion() {
  const { toast } = useToast();

  const [roleCode, setRoleCode] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [rolePermRows, setRolePermRows] = useState<AppRolePermissionRow[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [perms, setPerms] = useState<AppPerm[]>([]);
  const [userRoles, setUserRoles] = useState<AppUserRole[]>([]);
  const [localUsers, setLocalUsers] = useState<LocalUser[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [dealerUsers, setDealerUsers] = useState<DealerUserRow[]>([]);
  const [makes, setMakes] = useState<Make[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  // Dialog states
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [localUserDialogOpen, setLocalUserDialogOpen] = useState(false);
  const [dealerUserDialogOpen, setDealerUserDialogOpen] = useState(false);
  const [dealerUserRoleDialogOpen, setDealerUserRoleDialogOpen] =
    useState(false);
  const [rolePermsDialogOpen, setRolePermsDialogOpen] = useState(false);
  const [makeDialogOpen, setMakeDialogOpen] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Edit states
  const [editingRole, setEditingRole] = useState<AppRole | null>(null);
  const [editingLocalUser, setEditingLocalUser] = useState<LocalUser | null>(
    null
  );
  const [editingMake, setEditingMake] = useState<Make | null>(null);
  const [editingModel, setEditingModel] = useState<Model | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: string;
    id: string;
    name: string;
  } | null>(null);

  // Forms
  const [roleForm, setRoleForm] = useState({
    code: "",
    name: "",
    description: "",
  });

  const [localUserForm, setLocalUserForm] = useState({
    display_name: "",
    email: "",
    password: "",
    passwordConfirm: "",
    role_id: "",
  });

  // Dealer user create form (membresía + rol)
  // ✅ OJO: acá guardamos role_code (texto), NO role_id (uuid)
  const [dealerUserForm, setDealerUserForm] = useState({
    dealer_id: "",
    user_id: "",
    dealer_role: "", // ✅ texto: "admin" | "team_admin" | "sales_person" ...
  });

  // Dealer user edit role form
  const [dealerUserRoleForm, setDealerUserRoleForm] = useState({
    dealer_id: "",
    user_id: "",
    dealer_role: "", // ✅ texto
  });

  // Role-perms modal state
  const [rolePermsRole, setRolePermsRole] = useState<AppRole | null>(null);

const [rolePermsSelected, setRolePermsSelected] = useState<RolePermState>({});


  // Makes/models master-detail
  const [selectedMakeId, setSelectedMakeId] = useState<string | null>(null);

  const [makeForm, setMakeForm] = useState({ name: "" });
  const [modelForm, setModelForm] = useState({ make_id: "", name: "" });

  // ==================== HELPERS ====================

  const handleTabsWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (e.deltaY === 0) return;
    e.preventDefault();
    e.currentTarget.scrollLeft += e.deltaY;
  };

  const isAdminRole = (r?: AppRole | null) => (r?.code ?? "") === "admin";
// Permisos que NO se pueden asignar (Administración)
const isAdministracionPerm = (code: string) => {
  const c = (code || "").toLowerCase().trim();
  return (
    c === "admin.administracion" ||
    c.startsWith("admin.") ||
    c.includes("administracion") ||
    c.includes("administración")
  );
};

  // Roles asignables dentro de dealer (según tu UI: no permitir admin)
  const dealerAssignableRoles = useMemo(
    () => roles.filter((r) => r.code !== "admin"),
    [roles]
  );

  // Map user_id -> role (global)
const roleByUserId = useMemo(() => {
  const map = new Map<string, AppRole>();

  for (const rel of userRoles) {
    const r = roles.find((x) => String(x.id) === String(rel.role_id));
    if (r) map.set(String(rel.user_id), r);
  }

  return map;
}, [userRoles, roles]);

  const dealerRoleUserLabel = useMemo(() => {
    const u = localUsers.find((lu) => lu.user_id === dealerUserRoleForm.user_id);
    return u?.display_name || u?.email || dealerUserRoleForm.user_id;
  }, [localUsers, dealerUserRoleForm.user_id]);

  const permCountByRoleId = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of rolePermRows) {
      const key = String(row.role_id);
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  }, [rolePermRows]);

  const dealerRoleDealerLabel = useMemo(() => {
    const d = dealers.find((x) => x.id === dealerUserRoleForm.dealer_id);
    return d?.name || dealerUserRoleForm.dealer_id;
  }, [dealers, dealerUserRoleForm.dealer_id]);

  const modelsForSelectedMake = useMemo(() => {
    if (!selectedMakeId) return [];
    return models.filter((m) => m.make_id === selectedMakeId);
  }, [models, selectedMakeId]);

  // ==================== LOAD DATA ====================

const loadAllData = async () => {
  try {
    setLoading(true);
    const { token } = await ensureAuth();

const [
  rolesR,
  permsR,
  userRolesR,
  rolePermsR,
  localUsersR,
  dealersR,
  dealerUsersR,
  makesR,
  modelsR,
] = await Promise.allSettled([
  getAppRoles(token),
  getAppPerms(token),
  getAppUserRoles(token),
  getAllRolePermissions(token),
  getLocalUsers(token),
  getDealers(token),
  getDealerUsers(token),
  getMakes(token),
  getModels(token),
]);

    const safe = (r: PromiseSettledResult<any>, label: string) => {
      if (r.status === "fulfilled") return r.value;
      console.warn(`Error cargando ${label}:`, r.reason);
      return [];
    };

setRoles(safe(rolesR, "roles"));
setPerms(safe(permsR, "permisos"));
setUserRoles(safe(userRolesR, "usuario-rol"));

setRolePermRows(safe(rolePermsR, "app_role_permissions"));

setLocalUsers(safe(localUsersR, "local-users"));
setDealers(safe(dealersR, "dealers"));
setDealerUsers(safe(dealerUsersR, "dealer-users"));

setMakes(safe(makesR, "makes"));
setModels(safe(modelsR, "models"));

  } catch (error: any) {
    console.error("Error cargando datos:", error);
    toast({
      title: "Error",
      description: "No se pudieron cargar los datos.",
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};


  // Leer rol desde localStorage una sola vez
useEffect(() => {
  (async () => {
    try {
      const { token } = await ensureAuth();
      // fuerza sync de role_code por si cambió
      await syncCurrentRoleCode(token, undefined, { force: true });
      setRoleCode(localStorage.getItem("current_role_code"));
    } finally {
      setRoleChecked(true);
    }
  })();
}, []);


  // Cargar data una vez (cuando entra admin)
  useEffect(() => {
    if (!roleChecked) return;
    const user = roleCode ? { role_code: roleCode } : null;
    if (!userHasAccess(user, ["admin"])) return;
    loadAllData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleChecked, roleCode]);

  const user = roleCode ? { role_code: roleCode } : null;

  if (!roleChecked) return null;
  if (!userHasAccess(user, ["admin"])) return <Navigate to="/" replace />;

  // ==================== LOCAL USERS ====================

  const openNewLocalUserDialog = () => {
    setEditingLocalUser(null);
    setLocalUserForm({
      display_name: "",
      email: "",
      password: "",
      passwordConfirm: "",
      role_id: "",
    });
    setLocalUserDialogOpen(true);
  };

  const openEditLocalUserDialog = (u: LocalUser) => {
    const currentRole = roleByUserId.get(u.user_id);
    setEditingLocalUser(u);
    setLocalUserForm({
      display_name: u.display_name ?? "",
      email: u.email,
      password: "",
      passwordConfirm: "",
      role_id: currentRole ? String(currentRole.id) : "",
    });
    setLocalUserDialogOpen(true);
  };

const handleSaveLocalUser = async () => {
  try {
    const { token, userId } = await ensureAuth();
  
    // ================= VALIDACIONES FRONTEND =================
  
    if (!localUserForm.display_name.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar el nombre del usuario.",
        variant: "destructive",
      });
      return;
    }
  
    if (!localUserForm.email.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar un email.",
        variant: "destructive",
      });
      return;
    }
  
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(localUserForm.email)) {
      toast({
        title: "Error",
        description: "El correo electrónico no es válido.",
        variant: "destructive",
      });
      return;
    }
  
    // Rol obligatorio
    if (!localUserForm.role_id) {
      toast({
        title: "Error",
        description: "Debes seleccionar un rol para el usuario.",
        variant: "destructive",
      });
      return;
    }
  
    // Solo al CREAR usuario
    if (!editingLocalUser && !localUserForm.password.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar una contraseña para el nuevo usuario.",
        variant: "destructive",
      });
      return;
    }
  
    // Solo al CREAR usuario
    if (!editingLocalUser && localUserForm.password.length < 8) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 8 caracteres.",
        variant: "destructive",
      });
      return;
    }
  
    if (localUserForm.password !== localUserForm.passwordConfirm) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden.",
        variant: "destructive",
      });
      return;
    }
  
    // ================= BACKEND =================
  
    if (editingLocalUser) {
      await updateLocalUser(
        editingLocalUser.user_id,
        {
          email: localUserForm.email,
          display_name: localUserForm.display_name,
        },
        token
      );
    
      if (localUserForm.password.trim()) {
        await setLocalUserPassword(
          editingLocalUser.user_id,
          localUserForm.password,
          token
        );
      }
    
      if (localUserForm.role_id) {
        await setSingleUserRole(editingLocalUser.user_id, localUserForm.role_id, token);
      
        // ✅ Si el usuario editado es el que está logueado, refrescar cache + state
        if (String(editingLocalUser.user_id) === String(userId)) {
          await syncCurrentRoleCode(token, undefined, { force: true });
          await syncCurrentRolePerms(token, undefined, { force: true });
          setRoleCode(localStorage.getItem("current_role_code"));
        }
      }
    
      toast({ title: "Usuario actualizado" });
    } else {
      const result = await createLocalUserWithPassword(
        {
          email: localUserForm.email,
          display_name: localUserForm.display_name,
          password: localUserForm.password,
        },
        token
      );
    
      if (localUserForm.role_id) {
        await setSingleUserRole(result.user_id, localUserForm.role_id, token);
      
        // ✅ Si el usuario creado es el mismo que está logueado (raro, pero posible)
        if (String(result.user_id) === String(userId)) {
          await syncCurrentRoleCode(token, undefined, { force: true });
          await syncCurrentRolePerms(token, undefined, { force: true });
          setRoleCode(localStorage.getItem("current_role_code"));
        }
      }
    
      toast({ title: "Usuario creado correctamente" });
    }
  
    setLocalUserDialogOpen(false);
    setEditingLocalUser(null);
    setLocalUserForm({
      display_name: "",
      email: "",
      password: "",
      passwordConfirm: "",
      role_id: "",
    });
  
    await loadAllData();
  } catch (error: any) {
    const message = dbErrorToSpanishMessage(error);
  
    toast({
      title: "Error al guardar usuario",
      description: message,
      variant: "destructive",
    });
  }
};

  // ==================== ROLES ====================

  const openRolePermsModal = async (role: AppRole) => {
    try {
      setRolePermsRole(role);

      // admin siempre todo (solo lectura)
      if (role.code === "admin") {
        const all: RolePermState = {};
for (const p of perms) all[p.id] = "accion";
setRolePermsSelected(all);
        setRolePermsDialogOpen(true);
        return;
      }

      const { token } = await ensureAuth();
const rows = await getAppRolePermissions(role.id, token);
// rows: [{ role_id, permission_id, scope }...]

const next: RolePermState = {};
for (const r of rows) {
  // si viniera null, lo tratamos como vista
  next[r.permission_id] = (r.scope ?? "vista") as PermScope;
}

setRolePermsSelected(next);

      setRolePermsDialogOpen(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

const saveRolePerms = async () => {
  try {
    if (!rolePermsRole) return;
    if (rolePermsRole.code === "admin") {
      toast({
        title: "Acción no permitida",
        description: "El rol admin siempre tiene todos los permisos.",
        variant: "destructive",
      });
      setRolePermsDialogOpen(false);
      return;
    }
    

    const { token } = await ensureAuth();

    const currentRows = await getAppRolePermissions(rolePermsRole.id, token);
    const current: RolePermState = {};
    for (const r of currentRows) {
      current[r.permission_id] = (r.scope ?? "vista") as PermScope;
    }

    const next = rolePermsSelected;

    // 1) eliminar los que ya no existen
    for (const permId of Object.keys(current)) {
      if (!next[permId]) {
        await deleteRolePermission(rolePermsRole.id, permId, token);
      }
    }

    // 2) agregar nuevos o actualizar scope (si cambia)
    for (const permId of Object.keys(next)) {
      const nextScope = next[permId];
      const curScope = current[permId];

      if (!curScope) {
        // nuevo
        await createRolePermission(rolePermsRole.id, permId, nextScope, token);
      } else if (curScope !== nextScope) {
        // no hay update directo: hacemos delete + insert
        await deleteRolePermission(rolePermsRole.id, permId, token);
        await createRolePermission(rolePermsRole.id, permId, nextScope, token);
      }
    }

  toast({ title: "Permisos actualizados" });
  setRolePermsDialogOpen(false);
  setRolePermsRole(null);

  await syncCurrentRolePerms(token, undefined, { force: true });
  await syncCurrentRoleCode(token, undefined, { force: true });
  setRoleCode(localStorage.getItem("current_role_code"));

  } catch (error: any) {
    toast({ title: "Error", description: error.message, variant: "destructive" });
  } finally {
    await loadAllData();
  }
};

  const handleSaveRole = async () => {
    try {
      const { token } = await ensureAuth();

      // no permitir cambiar código de admin
      if (editingRole?.code === "admin" && roleForm.code !== "admin") {
        toast({
          title: "Acción no permitida",
          description: "No se puede cambiar el código del rol admin.",
          variant: "destructive",
        });
        return;
      }

      if (editingRole) {
        await updateAppRole(editingRole.id, roleForm, token);
        toast({ title: "Rol actualizado" });
      } else {
        await createAppRole(roleForm, token);
        toast({ title: "Rol creado" });
      }

      setRoleDialogOpen(false);
      setEditingRole(null);
      setRoleForm({ code: "", name: "", description: "" });
      await loadAllData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ==================== DEALER USERS ====================
  // ✅ dealer_users maneja dealer_role (text) en la misma tabla.
  // ✅ Ya NO usamos app_user_dealer_roles.

  const handleSaveDealerUser = async () => {
    try {
      const { token } = await ensureAuth();

      if (
        !dealerUserForm.dealer_id ||
        !dealerUserForm.user_id ||
        !dealerUserForm.dealer_role
      ) {
        toast({
          title: "Error",
          description: "Debes seleccionar dealer, usuario y rol.",
          variant: "destructive",
        });
        return;
      }

      // 1) crear membresía (dealer_users)
      // Nota: si ya existe, puede tirar 409. En ese caso igual seguimos a actualizar rol.
      try {
await createDealerUser(
  {
    dealer_id: dealerUserForm.dealer_id,
    user_id: dealerUserForm.user_id,
    dealer_role: dealerUserForm.dealer_role,
  },
  token
);

      } catch (e: any) {
        // Si ya existe, PostgREST puede responder 409. No bloqueamos.
        const msg = String(e?.message ?? "");
        if (!msg.includes("409") && !msg.includes("duplicate")) throw e;
      }

      // 2) asignar rol dentro del dealer (dealer_users.dealer_role)
      await updateDealerUserRole(
        dealerUserForm.dealer_id,
        dealerUserForm.user_id,
        dealerUserForm.dealer_role,
        token
      );

      toast({
        title: "Usuario asignado al dealer",
        description: "Relación creada/actualizada exitosamente",
      });

      setDealerUserDialogOpen(false);
      setDealerUserForm({ dealer_id: "", user_id: "", dealer_role: "" });
      await loadAllData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveDealerUserRole = async () => {
    try {
      const { token } = await ensureAuth();

      if (
        !dealerUserRoleForm.dealer_id ||
        !dealerUserRoleForm.user_id ||
        !dealerUserRoleForm.dealer_role
      ) {
        toast({
          title: "Error",
          description: "Debes seleccionar un rol.",
          variant: "destructive",
        });
        return;
      }

      await updateDealerUserRole(
        dealerUserRoleForm.dealer_id,
        dealerUserRoleForm.user_id,
        dealerUserRoleForm.dealer_role,
        token
      );

      toast({ title: "Rol de dealer actualizado" });

      setDealerUserRoleDialogOpen(false);
      setDealerUserRoleForm({ dealer_id: "", user_id: "", dealer_role: "" });
      await loadAllData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ==================== MAKES & MODELS ====================

  const handleSaveMake = async () => {
    try {
      const { token } = await ensureAuth();

      if (!makeForm.name.trim()) {
        toast({
          title: "Error",
          description: "El nombre de la marca es requerido",
          variant: "destructive",
        });
        return;
      }

      if (editingMake) {
        await updateMake(editingMake.id, makeForm, token);
        toast({ title: "Marca actualizada" });
      } else {
        await createMake(makeForm, token);
        toast({ title: "Marca creada" });
      }

      setMakeDialogOpen(false);
      setEditingMake(null);
      setMakeForm({ name: "" });
      await loadAllData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveModel = async () => {
    try {
      const { token } = await ensureAuth();

      if (!modelForm.name.trim() || !modelForm.make_id) {
        toast({
          title: "Error",
          description: "Debes seleccionar una marca e ingresar un nombre",
          variant: "destructive",
        });
        return;
      }

      if (editingModel) {
        await updateModel(editingModel.id, modelForm, token);
        toast({ title: "Modelo actualizado" });
      } else {
        await createModel(modelForm, token);
        toast({ title: "Modelo creado" });
      }

      setModelDialogOpen(false);
      setEditingModel(null);
      setModelForm({ make_id: "", name: "" });
      await loadAllData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ==================== DELETE ====================

  const confirmDelete = (type: string, id: string, name: string) => {
    // bloquear delete admin role
    if (type === "role") {
      const r = roles.find((x) => x.id === id);
      if (r?.code === "admin") {
        toast({
          title: "Acción no permitida",
          description: "El rol admin no se puede eliminar.",
          variant: "destructive",
        });
        return;
      }
    }

    setDeleteTarget({ type, id, name });
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      const { token } = await ensureAuth();
      const { type, id } = deleteTarget;

      switch (type) {
        case "role":
          await deleteAppRole(id, token);
          break;
        case "local_user":
          await deleteLocalUser(id, token);
          break;
        case "dealer_user": {
          const [dealerId, userId] = id.split(":");
          await deleteDealerUser(dealerId, userId, token);
          break;
        }
        case "make":
          await deleteMake(id, token);
          break;
        case "model":
          await deleteModel(id, token);
          break;
      }

      toast({ title: "Eliminado exitosamente" });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await loadAllData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ==================== UI ====================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-hidden">
      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6 px-6 ps-1">
          <div>
            <h1 className="text-3xl font-bold">Administración</h1>
            <p className="text-muted-foreground">
              Gestión de usuarios, roles, permisos y configuración del sistema
            </p>
          </div>

          <Tabs defaultValue="local_users" className="w-full space-y-4">
            <div
              className="w-full overflow-x-auto whitespace-nowrap no-scrollbar"
              onWheel={handleTabsWheel}
            >
              <TabsList className="inline-flex gap-2 bg-transparent px-1 py-2">
                <TabsTrigger
                  value="local_users"
                  className="flex items-center px-4 py-2 rounded-full text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <User className="h-4 w-4 mr-2" />
                  Usuarios
                </TabsTrigger>

                <TabsTrigger
                  value="roles"
                  className="flex items-center px-4 py-2 rounded-full text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Roles
                </TabsTrigger>

                <TabsTrigger
                  value="perms"
                  className="flex items-center px-4 py-2 rounded-full text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Key className="h-4 w-4 mr-2" />
                  Permisos
                </TabsTrigger>

                <TabsTrigger
                  value="dealer_users"
                  className="flex items-center px-4 py-2 rounded-full text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Building className="h-4 w-4 mr-2" />
                  Usuarios Dealer
                </TabsTrigger>

                <TabsTrigger
                  value="makes_models"
                  className="flex items-center px-4 py-2 rounded-full text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  <Car className="h-4 w-4 mr-2" />
                  Marcas y Modelos
                </TabsTrigger>

              </TabsList>
            </div>

            {/* ============ LOCAL USERS TAB ============ */}
            <TabsContent value="local_users">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Usuarios</CardTitle>
                    <CardDescription>
                      Crear, editar y eliminar usuarios + asignar rol
                    </CardDescription>
                  </div>
                  <Button onClick={openNewLocalUserDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Usuario
                  </Button>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Creado</TableHead>
                        <TableHead className="w-[70px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {localUsers.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground"
                          >
                            No hay usuarios registrados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        localUsers.map((u) => {
                          const r = roleByUserId.get(u.user_id);
                          return (
                            <TableRow key={u.user_id}>
                              <TableCell className="font-medium">
                                {u.display_name ?? "—"}
                              </TableCell>
                              <TableCell>{u.email}</TableCell>
                              <TableCell>{r?.name ?? "—"}</TableCell>
                              <TableCell>
                                {u.created_at
                                  ? new Date(u.created_at).toLocaleDateString()
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => openEditLocalUserDialog(u)}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        confirmDelete(
                                          "local_user",
                                          u.user_id,
                                          u.display_name || u.email
                                        )
                                      }
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============ ROLES TAB ============ */}
            <TabsContent value="roles">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Roles</CardTitle>
                    <CardDescription>
                      Crea roles y asigna permisos (admin es intocable)
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setEditingRole(null);
                      setRoleForm({ code: "", name: "", description: "" });
                      setRoleDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Rol
                  </Button>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="w-[140px]">Permisos</TableHead>
                        <TableHead className="w-[70px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roles.map((role) => {
                        const count =
                          role.code === "admin"
                            ? perms.length
                            : permCountByRoleId.get(String(role.id)) ?? 0;

                        return (
                          <TableRow key={role.id}>
                            <TableCell className="font-medium">
                              {role.name}
                            </TableCell>
                            <TableCell>{role.description || "-"}</TableCell>

                            <TableCell>
                              <Button
                                variant="link"
                                className="px-0"
                                onClick={() => openRolePermsModal(role)}
                              >
                                {count}
                              </Button>
                            </TableCell>

                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingRole(role);
                                      setRoleForm({
                                        code: role.code,
                                        name: role.name,
                                        description: role.description || "",
                                      });
                                      setRoleDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => openRolePermsModal(role)}
                                  >
                                    <Key className="h-4 w-4 mr-2" />
                                    Permisos
                                  </DropdownMenuItem>

                                  {!isAdminRole(role) && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() =>
                                          confirmDelete("role", role.id, role.name)
                                        }
                                        className="text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

{/* ============ PERMISOS TAB (solo lectura) ============ */}
<TabsContent value="perms">
  <Card>
    <CardHeader>
      <CardTitle>Permisos</CardTitle>
      <CardDescription>Catálogo de permisos (solo lectura)</CardDescription>
    </CardHeader>

    <CardContent>
      <div className="max-h-[420px] overflow-auto border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Descripción</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {perms.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={2}
                  className="text-center text-muted-foreground"
                >
                  No hay permisos registrados.
                </TableCell>
              </TableRow>
            ) : (
              perms.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.code}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.description || "-"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
</TabsContent>

            {/* ============ DEALER USERS TAB ============ */}
            <TabsContent value="dealer_users">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Usuarios Dealer</CardTitle>
                    <CardDescription>
                      Asigna usuarios a dealers y define su rol dentro del dealer
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => {
                      setDealerUserForm({
                        dealer_id: "",
                        user_id: "",
                        dealer_role: "",
                      });
                      setDealerUserDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Usuario Dealer
                  </Button>
                </CardHeader>

                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuario</TableHead>
                        <TableHead>Dealer</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Creado</TableHead>
                        <TableHead className="w-[70px]">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dealerUsers.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="text-center text-muted-foreground"
                          >
                            No hay usuarios dealer registrados.
                          </TableCell>
                        </TableRow>
                      ) : (
                        dealerUsers.map((rel) => {
                          const u = localUsers.find(
                            (x) => x.user_id === rel.user_id
                          );
                          const d = dealers.find((x) => x.id === rel.dealer_id);

                          // ✅ dealer_role viene directo en dealer_users
                          const role = roles.find(
                            (r) => r.code === (rel.dealer_role ?? "")
                          );

                          const userLabel =
                            u?.display_name ?? u?.email ?? rel.user_id;
                          const dealerLabel = d?.name ?? rel.dealer_id;
                          const label = `${userLabel} - ${dealerLabel}`;

                          return (
                            <TableRow key={`${rel.dealer_id}-${rel.user_id}`}>
                              <TableCell className="font-medium">
                                {userLabel}
                              </TableCell>
                              <TableCell>{dealerLabel}</TableCell>
                              <TableCell>{role?.name ?? "—"}</TableCell>
                              <TableCell>
                                {rel.created_at
                                  ? new Date(rel.created_at).toLocaleDateString()
                                  : "-"}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setDealerUserRoleForm({
                                          dealer_id: rel.dealer_id,
                                          user_id: rel.user_id,
                                          dealer_role: rel.dealer_role ?? "",
                                        });
                                        setDealerUserRoleDialogOpen(true);
                                      }}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar (rol)
                                    </DropdownMenuItem>

                                    <DropdownMenuSeparator />

                                    <DropdownMenuItem
                                      onClick={() =>
                                        confirmDelete(
                                          "dealer_user",
                                          `${rel.dealer_id}:${rel.user_id}`,
                                          label
                                        )
                                      }
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ============ MAKES & MODELS TAB ============ */}
            <TabsContent value="makes_models">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* MARCAS */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Marcas</CardTitle>
                      <CardDescription>
                        Selecciona una marca para ver sus modelos
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => {
                        setEditingMake(null);
                        setMakeForm({ name: "" });
                        setMakeDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nueva Marca
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nombre</TableHead>
                          <TableHead className="w-[70px]">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {makes.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={2}
                              className="text-center text-muted-foreground"
                            >
                              No hay marcas registradas.
                            </TableCell>
                          </TableRow>
                        ) : (
                          makes.map((make) => (
                            <TableRow
                              key={make.id}
                              className={
                                selectedMakeId === make.id
                                  ? "bg-muted/60"
                                  : "cursor-pointer"
                              }
                              onClick={() => setSelectedMakeId(make.id)}
                            >
                              <TableCell className="font-medium">
                                {make.name}
                              </TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setEditingMake(make);
                                        setMakeForm({ name: make.name });
                                        setMakeDialogOpen(true);
                                      }}
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() =>
                                        confirmDelete("make", make.id, make.name)
                                      }
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Eliminar
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* MODELOS */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Modelos</CardTitle>
                      <CardDescription>
                        {selectedMakeId
                          ? `Modelos de: ${
                              makes.find((m) => m.id === selectedMakeId)?.name ??
                              selectedMakeId
                            }`
                          : "Selecciona una marca para ver modelos"}
                      </CardDescription>
                    </div>
                    <Button
                      disabled={!selectedMakeId}
                      onClick={() => {
                        if (!selectedMakeId) return;
                        setEditingModel(null);
                        setModelForm({ make_id: selectedMakeId, name: "" });
                        setModelDialogOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nuevo Modelo
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {!selectedMakeId ? (
                      <div className="text-sm text-muted-foreground">
                        Selecciona una marca a la izquierda para administrar sus
                        modelos.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Modelo</TableHead>
                            <TableHead className="w-[70px]">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {modelsForSelectedMake.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={2}
                                className="text-center text-muted-foreground"
                              >
                                No hay modelos para esta marca.
                              </TableCell>
                            </TableRow>
                          ) : (
                            modelsForSelectedMake.map((model) => (
                              <TableRow key={model.id}>
                                <TableCell className="font-medium">
                                  {model.name}
                                </TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditingModel(model);
                                          setModelForm({
                                            make_id: model.make_id,
                                            name: model.name,
                                          });
                                          setModelDialogOpen(true);
                                        }}
                                      >
                                        <Edit className="h-4 w-4 mr-2" />
                                        Editar
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() =>
                                          confirmDelete("model", model.id, model.name)
                                        }
                                        className="text-destructive"
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Eliminar
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ============ STATUS TAB ============ */}
          </Tabs>

          {/* ==================== DIALOGOS ==================== */}

          {/* Role Dialog */}
          <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingRole ? "Editar Rol" : "Nuevo Rol"}
                </DialogTitle>
                <DialogDescription>Complete los datos del rol</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="role_code">Código</Label>
                  <Input
                    id="role_code"
                    value={roleForm.code}
                    disabled={editingRole?.code === "admin"}
                    onChange={(e) =>
                      setRoleForm({ ...roleForm, code: e.target.value })
                    }
                    placeholder="admin, team_admin, sales_person..."
                  />
                </div>
                <div>
                  <Label htmlFor="role_name">Nombre</Label>
                  <Input
                    id="role_name"
                    value={roleForm.name}
                    onChange={(e) =>
                      setRoleForm({ ...roleForm, name: e.target.value })
                    }
                    placeholder="Administrador, Vendedor..."
                  />
                </div>
                <div>
                  <Label htmlFor="role_desc">Descripción</Label>
                  <Textarea
                    id="role_desc"
                    value={roleForm.description}
                    onChange={(e) =>
                      setRoleForm({ ...roleForm, description: e.target.value })
                    }
                    placeholder="Descripción del rol"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveRole}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Role Perms Modal */}
          <Dialog open={rolePermsDialogOpen} onOpenChange={setRolePermsDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Permisos del rol</DialogTitle>
                <DialogDescription>
                  {rolePermsRole
                    ? `${rolePermsRole.name} (${rolePermsRole.code})`
                    : ""}
                  {isAdminRole(rolePermsRole) ? " — (solo lectura)" : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="max-h-[420px] overflow-auto border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]"></TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Descripción</TableHead>
                    </TableRow>
                  </TableHeader>
<TableBody>
  {perms.map((p) => {
    const isBlocked = !isAdminRole(rolePermsRole) && isAdministracionPerm(p.code);
    const readOnly = isAdminRole(rolePermsRole);

    const scope = rolePermsSelected[p.id]; // undefined | "vista" | "accion"
    const canView = !!scope;
    const canAction = scope === "accion";

    const toggleView = () => {
      if (readOnly || isBlocked) return;
    
      setRolePermsSelected((prev) => {
        const next: RolePermState = { ...prev };
      
        // Si no tiene nada -> asignar vista
        if (!next[p.id]) {
          next[p.id] = "vista";
          return next;
        }
      
        // Si tiene vista -> quitar permiso
        if (next[p.id] === "vista") {
          delete next[p.id];
          return next;
        }
      
        // Si tiene accion y quitan view -> quitar TODO (accion implica view)
        if (next[p.id] === "accion") {
          delete next[p.id];
          return next;
        }
      
        return next;
      });
    };

    const toggleAction = () => {
      if (readOnly || isBlocked) return;
    
      setRolePermsSelected((prev) => {
        const next: RolePermState = { ...prev };
      
        // Si no tenía nada o tenía vista -> pasar a accion
        if (!next[p.id] || next[p.id] === "vista") {
          next[p.id] = "accion";
          return next;
        }
      
        // Si tenía accion -> bajar a vista
        if (next[p.id] === "accion") {
          next[p.id] = "vista";
          return next;
        }
      
        return next;
      });
    };

    return (
      <TableRow key={p.id}>
        <TableCell className="w-[120px]">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={canView}
                disabled={readOnly || isBlocked}
                onChange={toggleView}
              />
              Ver
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={canAction}
                disabled={readOnly || isBlocked || !canView}
                onChange={toggleAction}
              />
              Accionar
            </label>
            {isBlocked && (
              <span className="ml-2 text-[11px] text-muted-foreground">
                admin
              </span>
            )}
          </div>
        </TableCell>

        <TableCell className="font-medium">{p.code}</TableCell>
        <TableCell className="text-muted-foreground">
          {p.description || "-"}
        </TableCell>
      </TableRow>
    );
  })}
</TableBody>

                </Table>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setRolePermsDialogOpen(false)}
                >
                  Cerrar
                </Button>
                {!isAdminRole(rolePermsRole) && (
                  <Button onClick={saveRolePerms}>Guardar</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* LOCAL USERS DIALOG */}
          <Dialog open={localUserDialogOpen} onOpenChange={setLocalUserDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingLocalUser ? "Editar Usuario" : "Nuevo Usuario"}
                </DialogTitle>
                <DialogDescription>
                  Ingrese nombre, email, contraseña y rol.
                  {editingLocalUser &&
                    " Si la dejas en blanco, la contraseña no cambiará."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={localUserForm.display_name}
                    onChange={(e) =>
                      setLocalUserForm((prev) => ({
                        ...prev,
                        display_name: e.target.value,
                      }))
                    }
                    placeholder="Nombre del usuario"
                  />
                </div>

                <div>
                  <Label>Email</Label>
                  <Input
                    value={localUserForm.email}
                    onChange={(e) =>
                      setLocalUserForm((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <Label>Rol</Label>
                  <Select
                    value={localUserForm.role_id}
                    onValueChange={(val) =>
                      setLocalUserForm((prev) => ({ ...prev, role_id: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={String(r.id)} value={String(r.id)}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Contraseña {editingLocalUser && "(opcional)"}</Label>
                  <Input
                    type="password"
                    value={localUserForm.password}
                    onChange={(e) =>
                      setLocalUserForm((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    placeholder="Ingresa una contraseña"
                  />
                </div>

                <div>
                  <Label>Confirmar Contraseña</Label>
                  <Input
                    type="password"
                    value={localUserForm.passwordConfirm}
                    onChange={(e) =>
                      setLocalUserForm((prev) => ({
                        ...prev,
                        passwordConfirm: e.target.value,
                      }))
                    }
                    placeholder="Repite la contraseña"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setLocalUserDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveLocalUser}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dealer User Dialog (create) */}
          <Dialog open={dealerUserDialogOpen} onOpenChange={setDealerUserDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Usuario Dealer</DialogTitle>
                <DialogDescription>
                  Asigna un usuario existente a un dealer con un rol.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div>
                  <Label>Dealer</Label>
                  <Select
                    value={dealerUserForm.dealer_id}
                    onValueChange={(val) =>
                      setDealerUserForm((prev) => ({ ...prev, dealer_id: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un dealer" />
                    </SelectTrigger>
                    <SelectContent>
                      {dealers.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Usuario</Label>
                  <Select
                    value={dealerUserForm.user_id}
                    onValueChange={(val) =>
                      setDealerUserForm((prev) => ({ ...prev, user_id: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un usuario" />
                    </SelectTrigger>
                    <SelectContent>
                      {localUsers.map((u) => (
                        <SelectItem key={u.user_id} value={u.user_id}>
                          {u.display_name || u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Rol</Label>
                  <Select
                    value={dealerUserForm.dealer_role}
                    onValueChange={(val) =>
                      setDealerUserForm((prev) => ({ ...prev, dealer_role: val }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {dealerAssignableRoles.map((r) => (
                        <SelectItem key={r.code} value={r.code}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Nota: por defecto no permitimos asignar <b>admin</b> como rol de dealer.
                  </p>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setDealerUserDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveDealerUser}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dealer User Role Dialog (edit role) */}
          <Dialog
            open={dealerUserRoleDialogOpen}
            onOpenChange={setDealerUserRoleDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar rol en dealer</DialogTitle>
                <DialogDescription>
                  Cambia el rol del usuario dentro del dealer.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div>
                  <Label>Usuario</Label>
                  <p className="text-sm text-muted-foreground">
                    {dealerRoleUserLabel}
                  </p>
                </div>

                <div>
                  <Label>Dealer</Label>
                  <p className="text-sm text-muted-foreground">
                    {dealerRoleDealerLabel}
                  </p>
                </div>

                <div>
                  <Label>Rol</Label>
                  <Select
                    value={dealerUserRoleForm.dealer_role}
                    onValueChange={(val) =>
                      setDealerUserRoleForm((prev) => ({
                        ...prev,
                        dealer_role: val,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un rol" />
                    </SelectTrigger>
                    <SelectContent>
                      {dealerAssignableRoles.map((r) => (
                        <SelectItem key={r.code} value={r.code}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setDealerUserRoleDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveDealerUserRole}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Make Dialog */}
          <Dialog open={makeDialogOpen} onOpenChange={setMakeDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingMake ? "Editar Marca" : "Nueva Marca"}
                </DialogTitle>
                <DialogDescription>Ingresa el nombre de la marca</DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={makeForm.name}
                    onChange={(e) => setMakeForm({ name: e.target.value })}
                    placeholder="Ej: Toyota, Honda..."
                  />
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setMakeDialogOpen(false);
                    setEditingMake(null);
                    setMakeForm({ name: "" });
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveMake}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Model Dialog */}
          <Dialog open={modelDialogOpen} onOpenChange={setModelDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingModel ? "Editar Modelo" : "Nuevo Modelo"}
                </DialogTitle>
                <DialogDescription>
                  Selecciona la marca y el nombre del modelo
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-2">
                <div>
                  <Label>Marca</Label>
                  <Select
                    value={modelForm.make_id}
                    onValueChange={(v) =>
                      setModelForm((prev) => ({
                        ...prev,
                        make_id: v,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {makes.map((make) => (
                        <SelectItem key={make.id} value={make.id}>
                          {make.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Modelo</Label>
                  <Input
                    value={modelForm.name}
                    onChange={(e) =>
                      setModelForm((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Ej: Corolla, Civic..."
                  />
                </div>
              </div>

              <DialogFooter className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setModelDialogOpen(false);
                    setEditingModel(null);
                    setModelForm({ make_id: "", name: "" });
                  }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSaveModel}>Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirmar Eliminación</DialogTitle>
                <DialogDescription>
                  ¿Está seguro de que desea eliminar "{deleteTarget?.name}"?
                  Esta acción no se puede deshacer.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Eliminar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
