import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Package, Wrench, FileText, Upload, ClipboardCheck } from "lucide-react";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

import { getRecentVehicles, getVehiclesCountByStatus, getVehiclesCountExcludingSold } from "@/lib/IngresoApi";
import { getListingsCount } from "@/lib/InspeccionApi";
import { dataStore, calcSellerKPIs } from "@/lib/dataStore";

/* -----------------------------
   Helpers
----------------------------- */

function getStatusLabel(status_id: number) {
  switch (status_id) {
    case 1:
      return "Ingreso";
    case 2:
      return "Inspección";
    case 3:
      return "Retoques";
    case 4:
      return "Listo";
    case 5:
      return "Publicado";
    case 6:
      return "Vendido";
    case 7:
      return "Oferta";
    default:
      return "-";
  }
}

function formatColones(value: number) {
  return value ? value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "0";
}

const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
const formatNumber = (value: number) => value.toLocaleString();

const generateLast6Months = () => {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  const currentDate = new Date();
  const result: { mes: string; compras: number; ventas: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthName = months[date.getMonth()];
    result.push({
      mes: monthName,
      compras: Math.floor(Math.random() * 8) + 6, // 6-14
      ventas: Math.floor(Math.random() * 6) + 5, // 5-11
    });
  }

  return result;
};

const comprasVsVentas = generateLast6Months();

/* -----------------------------
   Table Component (fixed)
----------------------------- */

function InventoryTableWithPagination({
  vehicles,
  handleImageClick,
  onView,
  canView = true,
  canAct = true,
}: {
  vehicles: any[];
  handleImageClick?: (images: string[], startIndex?: number) => void;
  onView?: (id: any) => void;
  canView?: boolean;
  canAct?: boolean;
})
 {
  const pageSize = 5;
  const [page, setPage] = useState(1);
  const [makes, setMakes] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);

  // Load catalogs once
  useEffect(() => {
    (async () => {
      try {
        const [mks, mdl] = await Promise.all([
          import("@/lib/IngresoApi").then((mod) => mod.getMakes()),
          import("@/lib/IngresoApi").then((mod) => mod.getModels()),
        ]);
        setMakes(mks);
        setModels(mdl);
      } catch {
        setMakes([]);
        setModels([]);
      }
    })();
  }, []);

  const total = vehicles.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // ✅ Fix: keep page within range if dataset size changes
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages]);

  const paginated = vehicles.slice((page - 1) * pageSize, page * pageSize);

  const getMakeName = (id: any) => makes.find((m) => m.id === id)?.name ?? id;
  const getModelName = (id: any) => models.find((m) => m.id === id)?.name ?? id;

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Foto</TableHead>
            <TableHead>Marca</TableHead>
            <TableHead>Modelo</TableHead>
            <TableHead>Año</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Precio Sugerido</TableHead>
            {(canView || canAct) && <TableHead>Acciones</TableHead>}
          </TableRow>
        </TableHeader>

        <TableBody>
          {paginated.map((vehiculo) => {
            // ✅ More robust photo logic
            let foto = "https://dummyimage.com/96x96/eee/aaa";

            if (vehiculo?.image_url) {
              foto = String(vehiculo.image_url).split(",")[0];
            } else {
              const finales = (vehiculo?.fotos as any)?.finales;
              if (Array.isArray(finales) && finales.length > 0) foto = finales[0];
            }

            const labelEstado = vehiculo?.estado || getStatusLabel(Number(vehiculo?.status_id));

            return (
              <TableRow key={vehiculo.id}>
                <TableCell>
                  <div className="w-16 h-12 bg-muted rounded-md overflow-hidden">
                    {foto ? (
                      <img
                        src={foto}
                        alt={getModelName(vehiculo.model_id)}
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                        onClick={() => {
                          let images: string[] = [];

                          if (vehiculo?.image_url) {
                            images = String(vehiculo.image_url).split(",").filter(Boolean);
                          } else {
                            const finales = (vehiculo?.fotos as any)?.finales;
                            if (Array.isArray(finales)) images = finales;
                          }

                          if (images.length === 0) images = [foto];
                          handleImageClick?.(images, 0);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        Sin foto
                      </div>
                    )}
                  </div>
                </TableCell>

                <TableCell className="font-medium">{getMakeName(vehiculo.make_id)}</TableCell>
                <TableCell>{getModelName(vehiculo.model_id)}</TableCell>
                <TableCell>{vehiculo.year}</TableCell>

                <TableCell>
                  <span className="px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                    {labelEstado}
                  </span>
                </TableCell>

                <TableCell className="font-semibold">
                  <div>
                    {typeof vehiculo.price2 === "number" && vehiculo.price2 > 0
                      ? `$${vehiculo.price2.toLocaleString()}`
                      : "-"}
                  </div>

                  {typeof vehiculo.price1_crc === "number" && vehiculo.price1_crc > 0 && (
                    <div className="text-xs text-muted-foreground">₡{formatColones(vehiculo.price1_crc)}</div>
                  )}
                </TableCell>

              {(canView || canAct) && (
                <TableCell>
                  {canView ? (
                    <Button variant="outline" size="sm" onClick={() => onView?.(vehiculo.id)}>
                      Ver
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin acceso</span>
                  )}
                </TableCell>
              )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Paginación */}
      <div className="flex justify-end items-center gap-2 mt-4">
        <Button variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          &lt;
        </Button>

        <span className="text-xs text-muted-foreground">
          Página {page} de {totalPages}
        </span>

        <Button
          variant="ghost"
          size="sm"
          disabled={page === totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          &gt;
        </Button>
      </div>
    </div>
  );
}

/* -----------------------------
   Dashboard
----------------------------- */

export default function Dashboard() {
  const navigate = useNavigate();

// Permisos (solo vista vs acción)
const [permMap, setPermMap] = useState<Record<string, string>>({});
const [permLoaded, setPermLoaded] = useState(false);

useEffect(() => {
  try {
    const raw = localStorage.getItem("current_role_perms");
    const parsed = raw ? JSON.parse(raw) : null;

    // Si viene como array [{code, scope}], lo convertimos a Record
    if (Array.isArray(parsed)) {
      const m: Record<string, string> = {};
      for (const p of parsed) {
        if (p?.code) m[String(p.code)] = String(p.scope ?? "");
      }
      setPermMap(m);
    }
    // Si viene como { permissions: [{code, scope}] }
    else if (parsed?.permissions && Array.isArray(parsed.permissions)) {
      const m: Record<string, string> = {};
      for (const p of parsed.permissions) {
        if (p?.code) m[String(p.code)] = String(p.scope ?? "");
      }
      setPermMap(m);
    }
    // Si ya viene como objeto { "perm.code": "accion" }
    else if (parsed && typeof parsed === "object") {
      setPermMap(parsed as Record<string, string>);
    } else {
      setPermMap({});
    }
  } catch {
    setPermMap({});
  } finally {
    setPermLoaded(true);
  }
}, []);

const norm = (v?: string) =>
  
  (v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

    const scopeOf = (code: string) => norm(permMap[code]);

const canViewCode = (code: string) => {
  if (!permLoaded) return false;
  const s = scopeOf(code);
  return s === "vista" || s === "accion";
};

const canActCode = (code: string) => permLoaded && scopeOf(code) === "accion";

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [kpis, setKpis] = useState({
    inventarioTotal: 0,
    ingreso: 0,
    inspeccion: 0,
    retoques: 0,
    publicados: 0,
  });

  // Modal de imagen ampliada
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  const handleImageClick = (images: string[], startIndex: number = 0) => {
    setModalImages(images);
    setModalImageIndex(startIndex);
    setImageModalOpen(true);
  };

  const handleNextImage = () => {
    setModalImageIndex((prev) => (prev + 1) % modalImages.length);
  };

  const handlePrevImage = () => {
    setModalImageIndex((prev) => (prev - 1 + modalImages.length) % modalImages.length);
  };

  // Fetch vehicles
  useEffect(() => {
    let mounted = true;

    async function fetchVehicles() {
      try {
        // Obtener conteos directos de la BD (más preciso que filtrar localmente)
        const [
          inventarioTotal,
          ingreso,
          inspeccion,
          retoques,
          publicados,
          vehicles
        ] = await Promise.all([
          getVehiclesCountExcludingSold(),
          getVehiclesCountByStatus(1), // Ingreso
          getVehiclesCountByStatus(2), // Inspección
          getVehiclesCountByStatus(3), // Retoques
          getListingsCount(),          // Anuncios (listings) - más preciso
          getRecentVehicles(100, 0),   // Solo para la tabla de Inventario Rápido
        ]);

        if (!mounted) return;

        setVehicles(vehicles);
        setKpis({
          inventarioTotal,
          ingreso,
          inspeccion,
          retoques,
          publicados,
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        if (!mounted) return;
        setVehicles([]);
        setKpis({
          inventarioTotal: 0,
          ingreso: 0,
          inspeccion: 0,
          retoques: 0,
          publicados: 0,
        });
      }
    }

    fetchVehicles();
    const interval = setInterval(fetchVehicles, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // CRM KPIs (kept, but sections can be hidden)
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const ofertasActivas = dataStore.ofertas.filter(
    (o) => o.estado === "ENVIADA" || o.estado === "NEGOCIANDO"
  ).length;

  const ofertasLast30 = dataStore.ofertas.filter((o) => new Date(o.createdAt) >= thirtyDaysAgo);
  const ganadas30 = ofertasLast30.filter((o) => o.estado === "GANADA").length;
  const perdidas30 = ofertasLast30.filter((o) => o.estado === "PERDIDA").length;

  const conversionGlobal =
    ganadas30 + perdidas30 > 0 ? ((ganadas30 / (ganadas30 + perdidas30)) * 100).toFixed(1) : "0.0";

  const ofertasGanadas = dataStore.ofertas.filter((o) => o.estado === "GANADA");
  const tiemposACierre = ofertasGanadas
    .map((o) => {
      const created = new Date(o.createdAt);
      const closed = new Date(o.updatedAt);
      return (closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    })
    .filter((t) => t > 0);

  const tiempoMedioCierre =
    tiemposACierre.length > 0 ? (tiemposACierre.reduce((a, b) => a + b, 0) / tiemposACierre.length).toFixed(1) : "0";

  const perdidasMes = dataStore.ofertas.filter(
    (o) => o.estado === "PERDIDA" && new Date(o.updatedAt) >= firstDayOfMonth
  );

  const motivosCount: Record<string, number> = {};
  perdidasMes.forEach((o) => {
    if (o.motivoPerdidaId) {
      const motivo = dataStore.motivosPerdida.find((m) => m.id === o.motivoPerdidaId);
      if (motivo) motivosCount[motivo.nombre] = (motivosCount[motivo.nombre] || 0) + 1;
    }
  });

  const topMotivoPerdida =
    Object.keys(motivosCount).length > 0 ? Object.entries(motivosCount).sort((a, b) => b[1] - a[1])[0][0] : "N/A";

  const margenPorModelo = useMemo(() => {
    return dataStore.vehiculos
      .filter((v) => v.estado === "Listo")
      .map((v) => ({
        modelo: `${v.marca} ${v.modelo}`,
        margen: v.precioSugerido - v.costoCompra,
        porcentaje: ((v.precioSugerido - v.costoCompra) / v.costoCompra) * 100,
      }))
      .sort((a, b) => b.margen - a.margen)
      .slice(0, 5);
  }, []);

  const embudoOfertas = useMemo(() => {
    return [
      { estado: "ENVIADA", cantidad: dataStore.ofertas.filter((o) => o.estado === "ENVIADA").length },
      { estado: "NEGOCIANDO", cantidad: dataStore.ofertas.filter((o) => o.estado === "NEGOCIANDO").length },
      { estado: "GANADA", cantidad: dataStore.ofertas.filter((o) => o.estado === "GANADA").length },
      { estado: "PERDIDA", cantidad: dataStore.ofertas.filter((o) => o.estado === "PERDIDA").length },
    ];
  }, []);

  const topClientes = useMemo(() => {
    const clientesStats: Record<string, { intentos: number; ganadas: number; nombre: string }> = {};

    dataStore.ofertas.forEach((o) => {
      const cliente = dataStore.clientes.find((c) => c.id === o.clienteId);
      if (!cliente) return;

      if (!clientesStats[o.clienteId]) {
        clientesStats[o.clienteId] = { intentos: 0, ganadas: 0, nombre: cliente.nombre };
      }
      clientesStats[o.clienteId].intentos++;
      if (o.estado === "GANADA") clientesStats[o.clienteId].ganadas++;
    });

    return Object.values(clientesStats)
      .sort((a, b) => b.ganadas - a.ganadas || b.intentos - a.intentos)
      .slice(0, 5);
  }, []);

  // Cards navigation (only inventory)
  const safeGoTo = (path: string, permCode: string) => {
    if (!canViewCode(permCode)) return;
    navigate(path);
  };

      const cardClickableProps = (path?: string, permCode?: string) => {
        const base =
          "hover:shadow-lg transition-shadow focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
      
        const allow = !!path && !!permCode && canViewCode(permCode);
      
        if (!allow) {
          return { className: `${base} opacity-90`, "aria-disabled": true } as const;
        }
      
        return {
          role: "button" as const,
          tabIndex: 0,
          onClick: () => safeGoTo(path!, permCode!),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              safeGoTo(path!, permCode!);
            }
          },
          className: `${base} cursor-pointer`,
        };
      };

  const stats = [
    { title: "Inventario Total", value: kpis.inventarioTotal.toString(), icon: Package, description: "Vehículos en stock", path: "/inventario", perm: "inv.inventario_interno" },
    { title: "Ingreso", value: kpis.ingreso.toString(), icon: Upload, description: "En ingreso", path: "/ingreso", perm: "work.ingreso" },
    { title: "Inspección", value: kpis.inspeccion.toString(), icon: ClipboardCheck, description: "En inspección", path: "/inspeccion", perm: "work.inspeccion" },
    { title: "Retoques", value: kpis.retoques.toString(), icon: Wrench, description: "Mejoras estéticas", path: "/retoques", perm: "work.retoques" },
    { title: "Publicado", value: kpis.publicados.toString(), icon: FileText, description: "Anunciados", path: "/publicacion", perm: "work.publicacion" },
  ];

  const crmStats = [
    { title: "Ofertas Activas", value: ofertasActivas.toString(), icon: FileText, description: "Enviadas + Negociando" },
    { title: "Conversión Global", value: `${conversionGlobal}%`, icon: FileText, description: "Últimos 30 días" },
    { title: "Tiempo Medio a Cierre", value: `${tiempoMedioCierre}d`, icon: FileText, description: "Días promedio" },
    { title: "Motivo Pérdida #1", value: topMotivoPerdida, icon: FileText, description: "Este mes" },
  ];

  // ✅ your current setting
  const ocultarSecciones = true;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Vista general del sistema de inventario</p>
      </div>

      {/* KPI Cards - Inventario */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-3">Inventario</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} {...cardClickableProps(stat.path, stat.perm)}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* KPI Cards - CRM (optional) */}
      {!ocultarSecciones && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">CRM</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {crmStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.title} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">{stat.title}</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Inventory Table con paginación */}
      <Card>
        <CardHeader>
          <CardTitle>Inventario Rápido</CardTitle>
        </CardHeader>
        <CardContent>
          <InventoryTableWithPagination
            vehicles={vehicles}
            handleImageClick={handleImageClick}
            onView={(id) => navigate(`/inventario?id=${id}`)}
            canView={canViewCode("inv.inventario_interno")}
            canAct={canActCode("inv.inventario_interno")}
          />
        </CardContent>
      </Card>

      {/* Modal de imagen ampliada */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-2xl flex flex-col items-center">
          {modalImages.length > 0 && (
            <div className="flex flex-col items-center w-full">
              <div className="relative w-full flex justify-center items-center">
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/70 text-white rounded-full p-2 shadow-lg z-10 hover:bg-black/90 focus:outline-none"
                  onClick={handlePrevImage}
                  disabled={modalImages.length <= 1}
                  style={{ visibility: modalImages.length > 1 ? "visible" : "hidden" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <img
                  src={modalImages[modalImageIndex]}
                  alt={`Foto ampliada ${modalImageIndex + 1}`}
                  className="max-h-[70vh] max-w-full rounded shadow-lg object-contain"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                />

                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/70 text-white rounded-full p-2 shadow-lg z-10 hover:bg-black/90 focus:outline-none"
                  onClick={handleNextImage}
                  disabled={modalImages.length <= 1}
                  style={{ visibility: modalImages.length > 1 ? "visible" : "hidden" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                {modalImageIndex + 1} / {modalImages.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Charts - Inventario (optional) */}
      {!ocultarSecciones && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">Análisis de Inventario</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Line Chart: Compras vs Ventas */}
            <Card>
              <CardHeader>
                <CardTitle>Compras vs Ventas (últimos 6 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px]">
                  <ChartContainer
                    config={{
                      compras: { label: "Compras", color: "hsl(var(--primary))" },
                      ventas: { label: "Ventas", color: "hsl(var(--chart-2))" },
                    }}
                    className="h-full w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={comprasVsVentas} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, "auto"]} allowDecimals={false} tick={{ fontSize: 12 }} />
                        <ChartTooltip
                          content={<ChartTooltipContent formatter={(value) => formatNumber(Number(value))} />}
                        />
                        <Line type="monotone" dataKey="compras" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="ventas" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>

            {/* Bar Chart: Margen por Modelo (Top 5) */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Margen por Modelo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[300px]">
                  <ChartContainer
                    config={{ margen: { label: "Margen ($)", color: "hsl(var(--primary))" } }}
                    className="h-full w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={margenPorModelo} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="modelo" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, "auto"]} allowDecimals={false} tick={{ fontSize: 12 }} tickFormatter={formatCurrency} />
                        <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                        <Bar dataKey="margen" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Seller Performance Section (optional) */}
      {!ocultarSecciones && (
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-3">Rendimiento de Vendedores</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {dataStore.vendedores
              .filter((v) => v.activo)
              .map((vendedor) => {
                const periodo = {
                  desde: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0],
                  hasta: new Date().toISOString().split("T")[0],
                };
                const kpisSeller = calcSellerKPIs(vendedor.id, periodo);
                return { vendedor, kpis: kpisSeller };
              })
              .sort((a, b) => b.kpis.ventas - a.kpis.ventas)
              .slice(0, 3)
              .map(({ vendedor, kpis: kpisSeller }, index) => {
                const metaProgress = vendedor.metaVentasMes ? (kpisSeller.ventas / vendedor.metaVentasMes) * 100 : 0;

                return (
                  <Card key={vendedor.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="relative">
                          <Avatar className="h-16 w-16">
                            <AvatarImage src={vendedor.foto} />
                            <AvatarFallback>{vendedor.nombre.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          {index === 0 && (
                            <div className="absolute -top-2 -right-2 bg-yellow-500 rounded-full p-1">
                              <span className="text-white text-xs font-bold">#1</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{vendedor.nombre}</h3>
                          {vendedor.equipo && <p className="text-sm text-muted-foreground">{vendedor.equipo}</p>}

                          <div className="mt-3 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Ventas:</span>
                              <span className="font-bold">{kpisSeller.ventas}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Monto:</span>
                              <span className="font-bold">{formatCurrency(kpisSeller.monto)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Conversión:</span>
                              <span className="font-bold">{kpisSeller.conversion.toFixed(1)}%</span>
                            </div>

                            {vendedor.metaVentasMes && (
                              <div className="mt-2">
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-muted-foreground">Meta mensual</span>
                                  <span className="text-muted-foreground">
                                    {kpisSeller.ventas}/{vendedor.metaVentasMes}
                                  </span>
                                </div>
                                <Progress value={Math.min(metaProgress, 100)} className="h-2" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}