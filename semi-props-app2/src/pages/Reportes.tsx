// ...existing code...
import { useState, useMemo, useEffect } from "react";
import { useAuthToken } from "@/hooks/useAuthToken";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Download, TrendingUp, AlertCircle, Clock, DollarSign, Calendar, ShoppingCart } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const API = (
  import.meta.env.VITE_API_URL ||
  "https://postrest-dealercar-semi-props.kwu5pq.easypanel.host"
).replace(/\/+$/, "");

// Bloque visual reutilizable para errores de acceso o carga de reportes reales
function ReportErrorBlock({ title = "Acceso restringido", description }: { title?: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Alert variant="destructive" className="w-full max-w-lg mx-auto text-center text-lg">
        <AlertCircle className="h-8 w-8 mb-2 mx-auto text-red-500" />
        <AlertTitle className="text-xl font-bold">{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
    </div>
  );
}
import { Badge } from "@/components/ui/badge";

// Types for real data from PostgREST

interface VehiclesEnteredByMonth {
  year: number;
  month: number;
  vehicles_entered: number;
}

interface VehiclesSoldByMonth {
  year: number;
  month: number;
  vehicles_sold: number;
}


interface ProfitByMonth {
  year: number;
  month: number;
  total_profit: number;
}

interface SalesTotalByMonth {
  year: number;
  month: number;
  total_sales: number;
}

// Mock in-memory data (would be shared across components in real app)
interface Vehicle {
  id: string;
  marca: string;
  modelo: string;
  fechaIngreso: string;
  fechaVenta?: string;
  costoCompra: number;
  precioVenta?: number;
  estado: string;
}

interface Retoque {
  vehiculoId: string;
  tareas: { costo: number }[];
}

interface Inspeccion {
  vehiculoId: string;
  checklist: Record<string, boolean>;
}

// Simulated data
const vehiculos: Vehicle[] = [
  {
    id: "v1",
    marca: "Toyota",
    modelo: "Corolla",
    fechaIngreso: "2025-08-01",
    fechaVenta: "2025-09-15",
    costoCompra: 12000,
    precioVenta: 14500,
    estado: "vendido",
  },
  {
    id: "v2",
    marca: "Honda",
    modelo: "CR-V",
    fechaIngreso: "2025-08-15",
    fechaVenta: "2025-10-01",
    costoCompra: 22000,
    precioVenta: 25500,
    estado: "vendido",
  },
  {
    id: "v3",
    marca: "Toyota",
    modelo: "Corolla",
    fechaIngreso: "2025-09-01",
    fechaVenta: "2025-10-10",
    costoCompra: 11800,
    precioVenta: 14200,
    estado: "vendido",
  },
  {
    id: "v4",
    marca: "Nissan",
    modelo: "Sentra",
    fechaIngreso: "2025-09-10",
    costoCompra: 8500,
    estado: "listo",
  },
  {
    id: "v5",
    marca: "Honda",
    modelo: "CR-V",
    fechaIngreso: "2025-09-20",
    costoCompra: 23000,
    estado: "retoques",
  },
];

const retoques: Retoque[] = [
  {
    vehiculoId: "v1",
    tareas: [{ costo: 500 }, { costo: 300 }],
  },
  {
    vehiculoId: "v2",
    tareas: [{ costo: 1200 }, { costo: 800 }],
  },
  {
    vehiculoId: "v3",
    tareas: [{ costo: 600 }],
  },
];

const inspecciones: Inspeccion[] = [
  {
    vehiculoId: "v1",
    checklist: { motor: true, frenos: false, suspension: true, llantas: true, interior: true, exterior: false },
  },
  {
    vehiculoId: "v2",
    checklist: { motor: true, frenos: true, suspension: false, llantas: true, interior: false, exterior: true },
  },
  {
    vehiculoId: "v3",
    checklist: { motor: false, frenos: true, suspension: true, llantas: false, interior: true, exterior: true },
  },
  {
    vehiculoId: "v4",
    checklist: { motor: true, frenos: false, suspension: true, llantas: true, interior: false, exterior: true },
  },
];

export default function Reportes() {
  const { toast } = useToast();
  const token = useAuthToken();

    // ---- Permisos (vista vs acción) ----
  const [permMap, setPermMap] = useState<Record<string, string>>({});
  const [permLoaded, setPermLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("current_role_perms");
      const parsed = raw ? JSON.parse(raw) : null;

      if (Array.isArray(parsed)) {
        const m: Record<string, string> = {};
        for (const p of parsed) if (p?.code) m[String(p.code)] = String(p.scope ?? "");
        setPermMap(m);
      } else if (parsed?.permissions && Array.isArray(parsed.permissions)) {
        const m: Record<string, string> = {};
        for (const p of parsed.permissions) if (p?.code) m[String(p.code)] = String(p.scope ?? "");
        setPermMap(m);
      } else if (parsed && typeof parsed === "object") {
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
    .toString()
    .trim() // ✅ MUY importante (quita "accion " o " vista")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const scopeOf = (code: string) => norm(permMap?.[code]);

  const canViewCode = (code: string) => {
    if (!permLoaded) return false;
    const s = scopeOf(code);
    return s === "vista" || s === "accion";
  };

const canActCode = (code: string) => permLoaded && scopeOf(code) === "accion";

const canActPrefix = (prefix: string) => {
  if (!permLoaded) return false;
  return Object.entries(permMap).some(([code, scope]) => code.startsWith(prefix) && norm(scope) === "accion");
};

const REPORTS_PERM = "intel.reportes";
const canExport = canActCode(REPORTS_PERM);

  // State para el reporte real de vehículos ingresados por mes
  const [vehiclesEnteredData, setVehiclesEnteredData] = useState<VehiclesEnteredByMonth[]>([]);
  const [loadingVehiclesEntered, setLoadingVehiclesEntered] = useState(true);
  const [vehiclesEnteredError, setVehiclesEnteredError] = useState<string | null>(null);

  // State para el reporte de vehículos vendidos por mes
  const [vehiclesSoldData, setVehiclesSoldData] = useState<VehiclesSoldByMonth[]>([]);
  const [loadingVehiclesSold, setLoadingVehiclesSold] = useState(true);
  const [vehiclesSoldError, setVehiclesSoldError] = useState<string | null>(null);

  // State para el reporte de ganancias por mes
  const [profitData, setProfitData] = useState<ProfitByMonth[]>([]);
  const [loadingProfit, setLoadingProfit] = useState(true);
  const [profitError, setProfitError] = useState<string | null>(null);

  // State para el reporte de ventas totales por mes
  const [salesTotalData, setSalesTotalData] = useState<SalesTotalByMonth[]>([]);
  const [loadingSalesTotal, setLoadingSalesTotal] = useState(true);
  const [salesTotalError, setSalesTotalError] = useState<string | null>(null);

  // Fetch real data for vehicles entered by month
  useEffect(() => {
    const fetchVehiclesEnteredByMonth = async () => {
      try {
        const response = await fetch(
          `${API}/report_vehicles_entered_by_month`,
          {
            method: "GET",
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
            },
          }
        );
        if (!response.ok) {
          if (response.status === 401) {
            setVehiclesEnteredError("No tienes permisos para ver este reporte. Contacta al administrador para solicitar acceso.");
          }
          throw new Error("Error al cargar datos de vehículos ingresados");
        }
        const data = await response.json();
        // Adaptar los datos al formato esperado por el renderizado
        const mapped = Array.isArray(data)
          ? data.map((row: any) => {
              const date = new Date(row.month);
              return {
                year: date.getFullYear(),
                month: date.getMonth() + 1, // getMonth() es 0-indexed
                vehicles_entered: row.total_vehicles,
              };
            })
          : [];
        setVehiclesEnteredData(mapped);
        setVehiclesEnteredError(null);
      } catch (error) {
        console.error("Error fetching vehicles entered by month:", error);
        if (!vehiclesEnteredError) {
          toast({
            title: "Error",
            description: "No se pudieron cargar los datos de vehículos ingresados",
            variant: "destructive",
          });
        }
      } finally {
        setLoadingVehiclesEntered(false);
      }
    };
    fetchVehiclesEnteredByMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, token]);

  // Fetch real data for vehicles sold by month
  useEffect(() => {
    const fetchVehiclesSoldByMonth = async () => {
      try {
        const response = await fetch(
          `${API}/report_sales_by_month`,
          {
            method: "GET",
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );
        if (!response.ok) {
          if (response.status === 401) {
            setVehiclesSoldError("No tienes permisos para ver este reporte.");
          }
          throw new Error("Error al cargar datos de vehículos vendidos");
        }
        const data = await response.json();
        const mapped = Array.isArray(data)
          ? data.map((row: any) => {
              const date = new Date(row.month);
              return {
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                vehicles_sold: row.total_sales,
              };
            })
          : [];
        setVehiclesSoldData(mapped);
        setVehiclesSoldError(null);
      } catch (error) {
        console.error("Error fetching vehicles sold by month:", error);
        if (!vehiclesSoldError) {
          toast({
            title: "Error",
            description: "No se pudieron cargar los datos de vehículos vendidos",
            variant: "destructive",
          });
        }
      } finally {
        setLoadingVehiclesSold(false);
      }
    };
    fetchVehiclesSoldByMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, token]);

  // Fetch real data for profit by month
  useEffect(() => {
    const fetchProfitByMonth = async () => {
      try {
        const response = await fetch(
          `${API}/report_profit_by_month`,
          {
            method: "GET",
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );
        if (!response.ok) {
          if (response.status === 401) {
            setProfitError("No tienes permisos para ver este reporte.");
          }
          throw new Error("Error al cargar datos de ganancias");
        }
        const data = await response.json();
        const mapped = Array.isArray(data)
          ? data.map((row: any) => {
              const date = new Date(row.month);
              return {
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                total_profit: row.total_profit, // este valor ya es la suma de price_final - costo - retoques
              };
            })
          : [];
        setProfitData(mapped);
        setProfitError(null);
      } catch (error) {
        // Si falla el backend, usar datos locales agrupados
        const vendidos = vehiculos.filter((v) => v.estado === "vendido" && v.fechaVenta && v.precioVenta);
        // Agrupar por año y mes
        const grouped: Record<string, { year: number; month: number; total_profit: number }> = {};
        vendidos.forEach((v) => {
          const date = new Date(v.fechaVenta!);
          const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          if (!grouped[key]) {
            grouped[key] = { year: date.getFullYear(), month: date.getMonth() + 1, total_profit: 0 };
          }
          grouped[key].total_profit += v.precioVenta!;
        });
        const mapped = Object.values(grouped).sort((a, b) => b.year - a.year || b.month - a.month);
        setProfitData(mapped);
        setProfitError(null);
      } finally {
        setLoadingProfit(false);
      }
    };
    fetchProfitByMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, token]);

  // Fetch real data for sales total by month
  useEffect(() => {
    const fetchSalesTotalByMonth = async () => {
      try {
        const response = await fetch(
          `${API}/report_sales_total_by_month`,
          {
            method: "GET",
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          }
        );
        if (!response.ok) {
          if (response.status === 401) {
            setSalesTotalError("No tienes permisos para ver este reporte.");
          }
          throw new Error("Error al cargar datos de ventas totales");
        }
        const data = await response.json();
        const mapped = Array.isArray(data)
          ? data.map((row: any) => {
              const date = new Date(row.month);
              return {
                year: date.getFullYear(),
                month: date.getMonth() + 1,
                total_sales: row.total_sales,
              };
            })
          : [];
        setSalesTotalData(mapped);
        setSalesTotalError(null);
      } catch (error) {
        console.error("Error fetching sales total by month:", error);
        if (!salesTotalError) {
          toast({
            title: "Error",
            description: "No se pudieron cargar los datos de ventas totales",
            variant: "destructive",
          });
        }
      } finally {
        setLoadingSalesTotal(false);
      }
    };
    fetchSalesTotalByMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast, token]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const vehiculosVendidos = vehiculos.filter((v) => v.estado === "vendido" && v.fechaVenta);

    // Average time to sale
    const tiemposVenta = vehiculosVendidos.map((v) => {
      const inicio = new Date(v.fechaIngreso);
      const fin = new Date(v.fechaVenta!);
      return Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    });
    const tiempoPromedioVenta = tiemposVenta.length > 0
      ? Math.round(tiemposVenta.reduce((a, b) => a + b, 0) / tiemposVenta.length)
      : 0;

    // Margin per vehicle
    const margenesPorVehiculo = vehiculosVendidos.map((v) => {
      const costosRetoques = retoques
        .find((r) => r.vehiculoId === v.id)
        ?.tareas.reduce((sum, t) => sum + t.costo, 0) || 0;
      const margen = (v.precioVenta || 0) - v.costoCompra - costosRetoques;
      const porcentajeRetoques = (costosRetoques / (v.precioVenta || 1)) * 100;
      return {
        vehiculo: `${v.marca} ${v.modelo} (${v.id})`,
        costoCompra: v.costoCompra,
        costosRetoques,
        precioVenta: v.precioVenta || 0,
        margen,
        porcentajeRetoques,
      };
    });

    // Models with highest turnover
    const ventasPorModelo: Record<string, number> = {};
    vehiculosVendidos.forEach((v) => {
      const key = `${v.marca} ${v.modelo}`;
      ventasPorModelo[key] = (ventasPorModelo[key] || 0) + 1;
    });
    const modelosRotacion = Object.entries(ventasPorModelo)
      .map(([modelo, ventas]) => ({ modelo, ventas }))
      .sort((a, b) => b.ventas - a.ventas);

    // Common inspection failures
    const fallasInspeccion: Record<string, number> = {
      motor: 0,
      frenos: 0,
      suspension: 0,
      llantas: 0,
      interior: 0,
      exterior: 0,
    };
    inspecciones.forEach((insp) => {
      Object.entries(insp.checklist).forEach(([key, passed]) => {
        if (!passed) {
          fallasInspeccion[key] = (fallasInspeccion[key] || 0) + 1;
        }
      });
    });
    const fallasData = Object.entries(fallasInspeccion).map(([item, count]) => ({
      item,
      fallas: count,
    }));

    return {
      tiempoPromedioVenta,
      margenesPorVehiculo,
      modelosRotacion,
      fallasData,
    };
  }, []);

  // Recommendations
  const recommendations = useMemo(() => {
    const recs = [];

    // High turnover, low inventory
    metrics.modelosRotacion.forEach((modelo) => {
      const stockActual = vehiculos.filter(
        (v) => `${v.marca} ${v.modelo}` === modelo.modelo && v.estado !== "vendido"
      ).length;
      if (modelo.ventas >= 2 && stockActual <= 1) {
        recs.push({
          type: "stock",
          title: "Incrementar stock",
          description: `${modelo.modelo} tiene alta rotación (${modelo.ventas} ventas) pero solo ${stockActual} en inventario.`,
        });
      }
    });

    // High touch-up costs
    metrics.margenesPorVehiculo.forEach((m) => {
      if (m.porcentajeRetoques > 12) {
        recs.push({
          type: "costs",
          title: "Optimizar costos de retoques",
          description: `${m.vehiculo}: costos de retoques representan ${m.porcentajeRetoques.toFixed(1)}% del precio de venta ($${m.costosRetoques}).`,
        });
      }
    });

    return recs;
  }, [metrics]);

  // Export to CSV
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay datos para exportar",
        variant: "destructive",
      });
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => row[h]).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Exportación exitosa",
      description: `${filename} descargado correctamente`,
    });
  };


  // Si hay error 401 en cualquier fetch de datos reales, bloquear toda la sección
  if (vehiclesEnteredError || vehiclesSoldError || profitError || salesTotalError) {
    const errorMsg = vehiclesEnteredError || vehiclesSoldError || profitError || salesTotalError;
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reportes</h1>
          <p className="text-muted-foreground mt-2">Análisis y métricas del negocio</p>
        </div>
        <ReportErrorBlock description={errorMsg || ""} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reportes</h1>
        <p className="text-muted-foreground mt-2">
          Análisis y métricas del negocio
        </p>
      </div>

      {/* KPIs */}
      {/* ...existing code... */}
      {/* Recommendations */}
      {/* ...existing code... */}
      {/* Charts */}
      {/* ...existing code... */}
      {/* Margin per vehicle table */}
      {/* ...existing code... */}
      {/* Real data: Vehicles entered by month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>Vehículos Ingresados por Mes</CardTitle>
          </div>

          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToCSV(vehiclesEnteredData, "vehiculos-ingresados-mes.csv")
              }
              disabled={loadingVehiclesEntered || vehiclesEnteredData.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingVehiclesEntered ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Cargando datos...</div>
            </div>
          ) : vehiclesEnteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Año</TableHead>
                    <TableHead>Mes</TableHead>
                    <TableHead>Vehículos Ingresados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehiclesEnteredData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.year}</TableCell>
                      <TableCell>{
                        new Date(row.year, row.month - 1).toLocaleString("es-ES", { month: "long" })
                      }</TableCell>
                      <TableCell className="font-bold text-primary">
                        {row.vehicles_entered}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real data: Vehicles sold by month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <CardTitle>Vehículos Vendidos por Mes</CardTitle>
          </div>

          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToCSV(vehiclesSoldData, "vehiculos-vendidos-mes.csv")
              }
              disabled={loadingVehiclesSold || vehiclesSoldData.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingVehiclesSold ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Cargando datos...</div>
            </div>
          ) : vehiclesSoldData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Año</TableHead>
                    <TableHead>Mes</TableHead>
                    <TableHead>Vehículos Vendidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vehiclesSoldData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.year}</TableCell>
                      <TableCell>
                        {new Date(row.year, row.month - 1).toLocaleString("es-ES", { month: "long" })}
                      </TableCell>
                      <TableCell className="font-bold text-primary">
                        {row.vehicles_sold}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real data: Profit by month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle>Ganancias por Mes</CardTitle>
          </div>

          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToCSV(profitData, "ganancias-mes.csv")
              }
              disabled={loadingProfit || profitData.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingProfit ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Cargando datos...</div>
            </div>
          ) : profitData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Año</TableHead>
                    <TableHead>Mes</TableHead>
                    <TableHead>Ganancia Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profitData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.year}</TableCell>
                      <TableCell>
                        {new Date(row.year, row.month - 1).toLocaleString("es-ES", { month: "long" })}
                      </TableCell>
                      <TableCell className="font-bold text-green-600">
                        ${row.total_profit.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real data: Ventas totales por mes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Ventas Totales por Mes</CardTitle>
          </div>
                
          {canExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToCSV(salesTotalData, "ventas-totales-mes.csv")
              }
              disabled={loadingSalesTotal || salesTotalData.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {loadingSalesTotal ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Cargando datos...</div>
            </div>
          ) : salesTotalData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay datos disponibles
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Año</TableHead>
                    <TableHead>Mes</TableHead>
                    <TableHead>Ventas Totales</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesTotalData.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{row.year}</TableCell>
                      <TableCell>
                        {new Date(row.year, row.month - 1).toLocaleString("es-ES", { month: "long" })}
                      </TableCell>
                      <TableCell className="font-bold text-blue-600">
                        ${row.total_sales.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
