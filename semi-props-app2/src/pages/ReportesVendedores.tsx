import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, TrendingUp, Clock, XCircle } from "lucide-react";
import { dataStore, calcSellerKPIs, leaderboard } from "@/lib/dataStore";

export default function ReportesVendedores() {
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth.toISOString().split("T")[0]);
  const [dateTo, setDateTo] = useState(today.toISOString().split("T")[0]);
  const [selectedTeam, setSelectedTeam] = useState<string>("todos");
  const [selectedSeller, setSelectedSeller] = useState<string>("todos");

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatNumber = (value: number) => value.toLocaleString();

  // Get unique teams
  const teams = useMemo(() => {
    const uniqueTeams = Array.from(new Set(dataStore.vendedores.map((v) => v.equipo).filter(Boolean)));
    return uniqueTeams;
  }, []);

  // Filter sellers
  const filteredSellers = useMemo(() => {
    return dataStore.vendedores.filter((v) => {
      if (!v.activo) return false;
      if (selectedTeam !== "todos" && v.equipo !== selectedTeam) return false;
      if (selectedSeller !== "todos" && v.id !== selectedSeller) return false;
      return true;
    });
  }, [selectedTeam, selectedSeller]);

  // Calculate leaderboard
  const leaderboardData = useMemo(() => {
    const periodo = { desde: dateFrom, hasta: dateTo };
    const leaders = leaderboard(periodo);
    
    return leaders
      .filter((l) => filteredSellers.some((s) => s.id === l.vendedor.id))
      .slice(0, 8);
  }, [dateFrom, dateTo, filteredSellers]);

  // Conversion per seller
  const conversionData = useMemo(() => {
    const periodo = { desde: dateFrom, hasta: dateTo };
    
    return filteredSellers
      .map((vendedor) => {
        const kpis = calcSellerKPIs(vendedor.id, periodo);
        return {
          nombre: vendedor.nombre.split(" ")[0],
          conversion: kpis.conversion,
          vendedorId: vendedor.id,
        };
      })
      .sort((a, b) => b.conversion - a.conversion)
      .slice(0, 8);
  }, [dateFrom, dateTo, filteredSellers]);

  // Average time to close per seller
  const timeToCloseData = useMemo(() => {
    const periodo = { desde: dateFrom, hasta: dateTo };
    
    return filteredSellers
      .map((vendedor) => {
        const kpis = calcSellerKPIs(vendedor.id, periodo);
        return {
          nombre: vendedor.nombre.split(" ")[0],
          dias: kpis.tiempoMedioCierre,
          vendedorId: vendedor.id,
        };
      })
      .filter((d) => d.dias > 0)
      .sort((a, b) => a.dias - b.dias)
      .slice(0, 8);
  }, [dateFrom, dateTo, filteredSellers]);

  // Loss reasons stacked by seller
  const lossReasonsData = useMemo(() => {
    const fromDate = new Date(dateFrom);
    const toDate = new Date(dateTo);
    
    // Get all loss reasons
    const motivosMap = new Map<string, Map<string, number>>();
    
    dataStore.motivosPerdida.forEach((motivo) => {
      motivosMap.set(motivo.id, new Map());
    });

    filteredSellers.forEach((vendedor) => {
      const vendedorOfertas = dataStore.ofertas.filter(
        (o) =>
          o.vendedorId === vendedor.id &&
          o.estado === "PERDIDA" &&
          o.motivoPerdidaId &&
          new Date(o.updatedAt) >= fromDate &&
          new Date(o.updatedAt) <= toDate
      );

      vendedorOfertas.forEach((oferta) => {
        if (oferta.motivoPerdidaId) {
          const motivoMap = motivosMap.get(oferta.motivoPerdidaId);
          if (motivoMap) {
            motivoMap.set(vendedor.id, (motivoMap.get(vendedor.id) || 0) + 1);
          }
        }
      });
    });

    // Convert to chart data
    const chartData = filteredSellers.slice(0, 6).map((vendedor) => {
      const row: any = {
        nombre: vendedor.nombre.split(" ")[0],
      };

      dataStore.motivosPerdida.forEach((motivo) => {
        const motivoMap = motivosMap.get(motivo.id);
        row[motivo.nombre] = motivoMap?.get(vendedor.id) || 0;
      });

      return row;
    });

    return {
      data: chartData,
      motivos: dataStore.motivosPerdida.map((m) => m.nombre),
    };
  }, [dateFrom, dateTo, filteredSellers]);

  const handleResetFilters = () => {
    setDateFrom(firstDayOfMonth.toISOString().split("T")[0]);
    setDateTo(today.toISOString().split("T")[0]);
    setSelectedTeam("todos");
    setSelectedSeller("todos");
  };

  // Color palette for stacked chart
  const colors = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reportes por Vendedor</h1>
        <p className="text-muted-foreground">Análisis detallado del desempeño de vendedores</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Fecha Desde</Label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <Label>Fecha Hasta</Label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
            <div>
              <Label>Equipo</Label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team} value={team || ""}>
                      {team}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendedor</Label>
              <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {dataStore.vendedores
                    .filter((v) => v.activo && (selectedTeam === "todos" || v.equipo === selectedTeam))
                    .map((vendedor) => (
                      <SelectItem key={vendedor.id} value={vendedor.id}>
                        {vendedor.nombre}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Button variant="outline" onClick={handleResetFilters}>
              Resetear Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <CardTitle>Leaderboard</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {leaderboardData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay datos para el período seleccionado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead className="text-center">Equipo</TableHead>
                  <TableHead className="text-center">Ventas</TableHead>
                  <TableHead className="text-right">Monto Total</TableHead>
                  <TableHead className="text-center">Conversión</TableHead>
                  <TableHead className="text-right">Ticket Prom</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboardData.map((item, index) => {
                  const vendedor = item.vendedor;
                  return (
                    <TableRow key={vendedor.id}>
                      <TableCell className="font-bold">
                        {index === 0 && <Trophy className="h-4 w-4 inline text-yellow-500" />}
                        {index > 0 && index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={vendedor?.foto} />
                            <AvatarFallback>
                              {vendedor?.nombre.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{vendedor?.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {vendedor?.equipo || "-"}
                      </TableCell>
                      <TableCell className="text-center font-semibold">{item.ventas}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(item.monto)}
                      </TableCell>
                      <TableCell className="text-center">{item.conversion.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.ticketProm)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Conversión por Vendedor</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {conversionData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No hay datos para mostrar
              </div>
            ) : (
              <div className="w-full h-[300px]">
                <ChartContainer
                  config={{
                    conversion: {
                      label: "Conversión %",
                      color: "hsl(var(--primary))",
                    },
                  }}
                  className="h-full w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={conversionData}
                      layout="vertical"
                      margin={{ top: 8, right: 16, bottom: 8, left: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <YAxis dataKey="nombre" type="category" tick={{ fontSize: 12 }} />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(value) => `${Number(value).toFixed(1)}%`} />}
                      />
                      <Bar dataKey="conversion" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time to Close Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <CardTitle>Tiempo Medio a Cierre (días)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {timeToCloseData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No hay datos para mostrar
              </div>
            ) : (
              <div className="w-full h-[300px]">
                <ChartContainer
                  config={{
                    dias: {
                      label: "Días",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-full w-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={timeToCloseData}
                      layout="vertical"
                      margin={{ top: 8, right: 16, bottom: 8, left: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, "auto"]} tick={{ fontSize: 12 }} />
                      <YAxis dataKey="nombre" type="category" tick={{ fontSize: 12 }} />
                      <ChartTooltip
                        content={<ChartTooltipContent formatter={(value) => `${Number(value).toFixed(1)} días`} />}
                      />
                      <Bar dataKey="dias" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Loss Reasons Stacked Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-primary" />
            <CardTitle>Motivos de Pérdida por Vendedor</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {lossReasonsData.data.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay pérdidas registradas en el período seleccionado
            </div>
          ) : (
            <div className="w-full h-[300px]">
              <ChartContainer
                config={lossReasonsData.motivos.reduce((acc, motivo, index) => {
                  acc[motivo] = {
                    label: motivo,
                    color: colors[index % colors.length],
                  };
                  return acc;
                }, {} as any)}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={lossReasonsData.data}
                    margin={{ top: 8, right: 16, bottom: 8, left: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, "auto"]} allowDecimals={false} tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    {lossReasonsData.motivos.map((motivo, index) => (
                      <Bar
                        key={motivo}
                        dataKey={motivo}
                        stackId="a"
                        fill={colors[index % colors.length]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
