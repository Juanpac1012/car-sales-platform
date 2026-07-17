import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Calendar, Clock, FileDown, BarChart3 } from "lucide-react";
import { dataStore, calcConversion, calcEmbudo, calcClienteKPIs } from "@/lib/dataStore";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

const ReportesCRM = () => {
  const { toast } = useToast();
  const [periodo, setPeriodo] = useState<"30" | "90">("30");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("es-CR").format(value);
  };

  // Calculate date range
  const getPeriodoFechas = () => {
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - parseInt(periodo));
    return {
      desde: desde.toISOString().split("T")[0],
      hasta: hasta.toISOString().split("T")[0],
    };
  };

  // Metrics
  const metricas = useMemo(() => {
    const fechas = getPeriodoFechas();
    const conversion = calcConversion(fechas);
    
    // Calculate average time to close (GANADA)
    const ofertasGanadas = dataStore.ofertas.filter((o) => {
      const created = new Date(o.createdAt);
      const updated = new Date(o.updatedAt);
      const desde = new Date(fechas.desde);
      const hasta = new Date(fechas.hasta);
      return o.estado === "GANADA" && created >= desde && updated <= hasta;
    });

    let tiempoPromedioCierre = 0;
    if (ofertasGanadas.length > 0) {
      const tiempos = ofertasGanadas.map((o) => {
        const inicio = new Date(o.createdAt);
        const fin = new Date(o.updatedAt);
        return Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      });
      tiempoPromedioCierre = Math.round(tiempos.reduce((a, b) => a + b, 0) / tiempos.length);
    }

    return {
      ...conversion,
      tiempoPromedioCierre,
    };
  }, [periodo]);

  // Top motivos de pérdida
  const motivosPerdida = useMemo(() => {
    const fechas = getPeriodoFechas();
    const ofertas = dataStore.ofertas.filter((o) => {
      const created = new Date(o.createdAt);
      const desde = new Date(fechas.desde);
      const hasta = new Date(fechas.hasta);
      return o.estado === "PERDIDA" && created >= desde && created <= hasta;
    });

    const conteo: Record<string, number> = {};
    ofertas.forEach((o) => {
      if (o.motivoPerdidaId) {
        const motivo = dataStore.motivosPerdida.find((m) => m.id === o.motivoPerdidaId);
        if (motivo) {
          conteo[motivo.nombre] = (conteo[motivo.nombre] || 0) + 1;
        }
      }
    });

    return Object.entries(conteo)
      .map(([nombre, cantidad]) => ({ nombre, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad);
  }, [periodo]);

  // Funnel data
  const embudoData = useMemo(() => {
    const embudo = calcEmbudo();
    return [
      { etapa: "Enviadas", cantidad: embudo.enviados, fill: "#94a3b8" },
      { etapa: "Negociando", cantidad: embudo.enNegociacion, fill: "#3b82f6" },
      { etapa: "Ganadas", cantidad: embudo.ganados, fill: "#22c55e" },
      { etapa: "Perdidas", cantidad: embudo.perdidos, fill: "#ef4444" },
      { etapa: "Caducadas", cantidad: embudo.caducados, fill: "#64748b" },
    ];
  }, []);

  // Conversion by source
  const conversionPorFuente = useMemo(() => {
    const porFuente: Record<string, { total: number; ganadas: number }> = {
      INVENTARIO: { total: 0, ganadas: 0 },
      PROVEEDOR: { total: 0, ganadas: 0 },
      CRAUTOS: { total: 0, ganadas: 0 },
    };

    dataStore.ofertas.forEach((o) => {
      porFuente[o.fuente].total++;
      if (o.estado === "GANADA") {
        porFuente[o.fuente].ganadas++;
      }
    });

    return Object.entries(porFuente).map(([fuente, datos]) => ({
      fuente,
      conversion: datos.total > 0 ? ((datos.ganadas / datos.total) * 100).toFixed(1) : "0",
      total: datos.total,
      ganadas: datos.ganadas,
    }));
  }, []);

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      "ID",
      "Cliente",
      "Vehículo",
      "Estado",
      "Fuente",
      "Precio",
      "Fecha Creación",
      "Fecha Actualización",
      "Motivo Pérdida",
    ];

    const rows = dataStore.ofertas.map((oferta) => {
      const cliente = dataStore.clientes.find((c) => c.id === oferta.clienteId);
      const motivoPerdida = oferta.motivoPerdidaId
        ? dataStore.motivosPerdida.find((m) => m.id === oferta.motivoPerdidaId)?.nombre
        : "";

      return [
        oferta.id,
        cliente?.nombre || "",
        `${oferta.vehiculo?.marca} ${oferta.vehiculo?.modelo} ${oferta.vehiculo?.anio}`,
        oferta.estado,
        oferta.fuente,
        oferta.precioOfertado,
        oferta.createdAt,
        oferta.updatedAt,
        motivoPerdida || "",
      ];
    });

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ofertas-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    toast({
      title: "Exportado",
      description: "Los datos se han exportado a CSV",
    });
  };

  const COLORS = ["#3b82f6", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes CRM</h1>
          <p className="text-muted-foreground">Métricas y análisis de ofertas</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={periodo} onValueChange={(v: "30" | "90") => setPeriodo(v)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToCSV} variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              Tasa de Conversión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.conversionGlobal.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Últimos {periodo} días</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              Total Ofertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.totalOfertas}</div>
            <p className="text-xs text-muted-foreground">
              {metricas.ganadas} ganadas / {metricas.perdidas} perdidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Tiempo a Cierre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.tiempoPromedioCierre} días</div>
            <p className="text-xs text-muted-foreground">Promedio para cerrar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metricas.negociando + metricas.enviadas}</div>
            <p className="text-xs text-muted-foreground">
              {metricas.enviadas} enviadas / {metricas.negociando} negociando
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Embudo de Ofertas</CardTitle>
            <CardDescription>Distribución de ofertas por estado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] md:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={embudoData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="etapa" />
                  <YAxis allowDecimals={false} domain={[0, "auto"]} />
                  <Tooltip formatter={(value) => formatNumber(value as number)} />
                  <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                    {embudoData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Motivos de Pérdida</CardTitle>
            <CardDescription>Razones más comunes de rechazo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[220px] md:h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={motivosPerdida} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="nombre" />
                  <YAxis allowDecimals={false} domain={[0, "auto"]} />
                  <Tooltip formatter={(value) => formatNumber(value as number)} />
                  <Bar dataKey="cantidad" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversion by Source */}
      <Card>
        <CardHeader>
          <CardTitle>Conversión por Fuente</CardTitle>
          <CardDescription>Tasa de éxito según origen de la oferta</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[220px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionPorFuente} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fuente" />
                <YAxis allowDecimals={false} domain={[0, 100]} />
                <Tooltip
                  formatter={(value: any, name: string) => {
                    if (name === "conversion") return `${value}%`;
                    return formatNumber(value);
                  }}
                />
                <Legend />
                <Bar dataKey="conversion" name="Conversión (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-4">
            {conversionPorFuente.map((item) => (
              <div key={item.fuente} className="text-center p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">{item.fuente}</p>
                <p className="text-2xl font-bold text-primary">{item.conversion}%</p>
                <p className="text-xs text-muted-foreground">
                  {item.ganadas}/{item.total} ofertas
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Ofertas</CardTitle>
          <CardDescription>Todas las ofertas registradas en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead>Motivo Pérdida</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataStore.ofertas.map((oferta) => {
                  const cliente = dataStore.clientes.find((c) => c.id === oferta.clienteId);
                  const motivoPerdida = oferta.motivoPerdidaId
                    ? dataStore.motivosPerdida.find((m) => m.id === oferta.motivoPerdidaId)
                    : null;

                  const estadoVariant: Record<
                    string,
                    "default" | "secondary" | "destructive" | "outline"
                  > = {
                    ENVIADA: "outline",
                    NEGOCIANDO: "secondary",
                    GANADA: "default",
                    PERDIDA: "destructive",
                    CADUCADA: "outline",
                  };

                  return (
                    <TableRow key={oferta.id}>
                      <TableCell className="font-medium">{oferta.id}</TableCell>
                      <TableCell>{cliente?.nombre}</TableCell>
                      <TableCell>
                        {oferta.vehiculo?.marca} {oferta.vehiculo?.modelo} {oferta.vehiculo?.anio}
                      </TableCell>
                      <TableCell>
                        <Badge variant={estadoVariant[oferta.estado] || "outline"}>
                          {oferta.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{oferta.fuente}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(oferta.precioOfertado)}
                      </TableCell>
                      <TableCell>{oferta.createdAt}</TableCell>
                      <TableCell>
                        {motivoPerdida ? (
                          <span className="text-sm text-muted-foreground">{motivoPerdida.nombre}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportesCRM;
