import { useState, useEffect, useMemo } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { hasPermission, type PermissionMap } from "@/lib/permissionUtils";
import Logo from "@/assets/provicional.png";
import {
  LayoutDashboard,
  Package,
  Upload,
  ClipboardCheck,
  Wrench,
  Megaphone,
  ShoppingCart,
  Users,
  Search,
  BarChart3,
  UserCircle,
  UserCog,
  Settings,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import * as adminAuth from "@/lib/adminAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { dataStore } from "@/lib/dataStore";
import { getVehiclesCountByStatus, getVehiclesCountExcludingSold } from "@/lib/IngresoApi";
import { getListingsCount } from "@/lib/InspeccionApi";

type MenuItem = {
  title: string;
  url: string;
  icon: any;
  badge: string | null;
  perm?: string; // code de BD (ej: "work.ingreso")
};

const operacionItems: MenuItem[] = [
  { title: "Ingreso", url: "/ingreso", icon: Upload, badge: "ingreso", perm: "work.ingreso" },
  { title: "Inspección", url: "/inspeccion", icon: ClipboardCheck, badge: "inspeccion", perm: "work.inspeccion" },
  { title: "Retoques", url: "/retoques", icon: Wrench, badge: "retoques", perm: "work.retoques" },
  { title: "Publicación", url: "/publicacion", icon: Megaphone, badge: "publicaciones", perm: "work.publicacion" },
  { title: "Venta", url: "/venta", icon: ShoppingCart, badge: "ventas", perm: "work.venta" },
];

const inventarioItems: MenuItem[] = [
  { title: "Inventario Interno", url: "/inventario", icon: Package, badge: "inventario", perm: "inv.inventario_interno" },
  { title: "Proveedores", url: "/proveedores", icon: Users, badge: null, perm: "inv.proveedores" },
  { title: "Búsqueda Externa", url: "/busqueda-externa", icon: Search, badge: null, perm: "inv.busqueda_externa" },
];

const crmItems: MenuItem[] = [
  { title: "Clientes", url: "/crm/clientes", icon: UserCircle, badge: "clientes", perm: "crm.clientes" },
  { title: "Vendedores", url: "/crm/vendedores", icon: UserCog, badge: "vendedores", perm: "crm.vendedores" },
];



const inteligenciaItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, badge: null, perm: "intel.dashboard" },
  { title: "Reportes", url: "/reportes", icon: BarChart3, badge: null, perm: "intel.reportes" },
];

const administracionItems: MenuItem[] = [
  { title: "Administración", url: "/administracion", icon: Settings, badge: null, perm: "admin.administracion" },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const navigate = useNavigate();

  const [roleCode, setRoleCode] = useState<string | null>(null);
  const [permMap, setPermMap] = useState<PermissionMap | null>(null);

  const [vehicleStats, setVehicleStats] = useState({
    totalVehicles: 0,
    inspeccion: 0,
    retoques: 0,
    ingreso: 0,
    publicados: 0,
    listings: 0, // Conteo de anuncios en página Publicación
  });

  const isAdmin = roleCode === "admin";

  const handleLogout = () => {
    adminAuth.clearAuth();
    localStorage.removeItem("current_role_code");
    localStorage.removeItem("current_role_perms");
    localStorage.removeItem("current_role_id");
    navigate("/login");
  };

  // Lee rol + permisos cacheados del localStorage
  useEffect(() => {
    const storedRole = localStorage.getItem("current_role_code");
    setRoleCode(storedRole);

    try {
      const raw = localStorage.getItem("current_role_perms");
      setPermMap(raw ? JSON.parse(raw) : null);
    } catch {
      setPermMap(null);
    }
  }, []);

  // Cargar contadores desde la API
  useEffect(() => {
    const refreshPermsFromLocalStorage = () => {
      try {
        const raw = localStorage.getItem("current_role_perms");
        setPermMap(raw ? JSON.parse(raw) : null);
      } catch {
        // ignore
      }
    };

    const loadVehicleStats = async () => {
      try {
        // Usar conteos directos de la BD (más preciso que filtrar localmente)
        const [totalVehicles, ingreso, inspeccion, retoques, publicados, listings] = await Promise.all([
          getVehiclesCountExcludingSold(),
          getVehiclesCountByStatus(1), // Ingreso
          getVehiclesCountByStatus(2), // Inspección
          getVehiclesCountByStatus(3), // Retoques
          getVehiclesCountByStatus(5), // Publicado
           getListingsCount(),          // Anuncios (listings)
         ]);
 
        console.log("[AppSidebar] Conteos obtenidos:", { totalVehicles, ingreso, inspeccion, retoques, publicados, listings });

         setVehicleStats({
           totalVehicles,
           ingreso,
          inspeccion,
          retoques,
          publicados,
          listings,
        });

        // Importante: después del primer request suele llenarse current_role_perms (ensureAuth)
        refreshPermsFromLocalStorage();
      } catch (error) {
        console.error("[AppSidebar] Error cargando estadísticas:", error);
      }
    };

    loadVehicleStats();

    const handleVehicleUpdate = () => loadVehicleStats();
    window.addEventListener("vehicleDataChanged", handleVehicleUpdate);
    const interval = setInterval(loadVehicleStats, 30000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("vehicleDataChanged", handleVehicleUpdate);
    };
  }, []);

  const getBadgeCount = (badge: string | null) => {
    if (!badge) return null;

    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    switch (badge) {
      case "inventario":
        return vehicleStats.totalVehicles;
      case "ingreso":
        return vehicleStats.ingreso;
      case "inspeccion":
        return vehicleStats.inspeccion;
      case "retoques":
        return vehicleStats.retoques;
      case "publicaciones":
        return vehicleStats.listings; // Conteo de anuncios (listings)
      case "ventas":
        return dataStore.ventas.filter((v) => {
          const fecha = new Date(v.fecha);
          return fecha.getMonth() === thisMonth && fecha.getFullYear() === thisYear;
        }).length;
      case "clientes":
        return dataStore.clientes.length;
      case "vendedores":
        return dataStore.vendedores.filter((v) => v.activo).length;
      default:
        return null;
    }
  };

  const filterByPerms = (items: MenuItem[]) => {
    // Admin ve todo
    if (isAdmin) return items;

    // Fallback útil: si aún no hay permMap (primer render),
    // no “mate” el sidebar: muestra Dashboard como mínimo.
    if (!permMap) {
      return items.filter((i) => i.perm === "intel.dashboard");
    }

    return items.filter((item) => {
      if (!item.perm) return true;
      return hasPermission(permMap, item.perm, "vista");
    });
  };

  const renderMenuSection = (items: MenuItem[]) => {
    const visibleItems = filterByPerms(items);
    if (visibleItems.length === 0) return null;

    return (
      <SidebarMenu>
        {visibleItems.map((item) => {
          const badgeCount = getBadgeCount(item.badge);
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className={({ isActive }) =>
                    isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : ""
                  }
                >
                  <item.icon className="h-4 w-4" />
                  <span className="flex-1">{item.title}</span>
                  {badgeCount !== null && badgeCount > 0 && !isCollapsed && (
                    <Badge variant="secondary" className="ml-auto">
                      {badgeCount}
                    </Badge>
                  )}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    );
  };

  // Evitar llamar renderMenuSection 2 veces (side effects / rendimiento / inconsistencias)
  const adminMenu = useMemo(() => renderMenuSection(administracionItems), [roleCode, permMap, isCollapsed, vehicleStats]);

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarContent>
        <div className="px-4 py-4 flex justify-center border-b border-white/10">
          <img
            src={Logo}
            alt="Dealer"
            className="w-full max-w-[210px] h-auto object-contain rounded-md shadow-sm"
          />
        </div>

        <SidebarGroup>
          <SidebarGroupLabel>Operación</SidebarGroupLabel>
          <SidebarGroupContent>{renderMenuSection(operacionItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Inventario & Catálogos</SidebarGroupLabel>
          <SidebarGroupContent>{renderMenuSection(inventarioItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Clientes & CRM</SidebarGroupLabel>
          <SidebarGroupContent>{renderMenuSection(crmItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Inteligencia</SidebarGroupLabel>
          <SidebarGroupContent>{renderMenuSection(inteligenciaItems)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {adminMenu && (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>{adminMenu}</SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => navigate("/cuenta")}
            >
              <UserCircle className="h-4 w-4 mr-2" />
              <span>Cuenta</span>
            </Button>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-red-600 hover:text-red-700"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Cerrar sesión</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}