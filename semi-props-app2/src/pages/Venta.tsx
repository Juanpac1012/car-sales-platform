import { useState, useEffect } from "react";
import * as InspeccionApi from "@/lib/InspeccionApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getExchangeRate, formatCRC } from "@/lib/exchangeRateService";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, Loader2, Plus, Eye, DollarSign, TrendingUp } from "lucide-react";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import * as VentasApi from "@/lib/VentasApi";
import * as VendedoresApi from "@/lib/VendedoresApi";
import * as adminAuth from "@/lib/adminAuth";

const formSchema = z.object({
  vehicle_id: z.string().min(1, "Seleccione un vehículo"),
  customer_id: z.string().min(1, "Seleccione un cliente"),
  price_final: z.coerce.number().min(0, "Precio debe ser mayor a 0"),
  price_final_crc: z.coerce.number().optional(),
  payment_method: z.string().min(1, "Método de pago es requerido"),
  sales_person: z.string().optional(),
  notes: z.string().optional(),
});

const customerSchema = z.object({
  name: z.string().min(1, "Nombre es requerido").max(100),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  government_id: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
});

const ITEMS_PER_PAGE = 10;

export default function Venta() {

  type RolePermsRaw = Record<string, string>;

const norm = (v: any) =>
  (v ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const [rolePerms, setRolePerms] = useState<RolePermsRaw>({});
const [permLoaded, setPermLoaded] = useState(false);

useEffect(() => {
  try {
    const raw = localStorage.getItem("current_role_perms");
    const parsed = raw ? (JSON.parse(raw) as RolePermsRaw) : {};
    setRolePerms(parsed || {});
  } catch {
    setRolePerms({});
  } finally {
    setPermLoaded(true);
  }
}, []);

const hasPerm = (code: string, required: string = "accion") => {
  const got = rolePerms?.[code];
  if (!got) return false;

  const g = norm(got);
  const r = norm(required);

  if (g === "accion") return true;
  if (["manage", "write", "action", "accion"].includes(g) && r === "accion")
    return true;

  return g === r;
};

const canManageVenta = permLoaded && hasPerm("work.venta", "accion");

    // Manejar apertura de diálogo con vehículo seleccionado
    const handleOpenDialogWithVehicle = (vehicleId: string) => {
      const selectedVehicle = readyVehicles.find(v => v.id === vehicleId);
      let defaultPrice = 0;
      if (selectedVehicle) {
        defaultPrice = selectedVehicle.price2 || selectedVehicle.price1 || 0;
      }
      form.reset();
      form.setValue("vehicle_id", vehicleId);
      form.setValue("price_final", defaultPrice);
      setIsDialogOpen(true);
    };
  // Vehículos listos para venta (publicados)
  const [readyVehicles, setReadyVehicles] = useState<any[]>([]);
  const [loadingReady, setLoadingReady] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);

  useEffect(() => {
    InspeccionApi.listVehiclesByStatus(6)
      .then(setReadyVehicles)
      .catch(() => setReadyVehicles([]))
      .finally(() => setLoadingReady(false));
    getExchangeRate().then(setExchangeRate);
  }, []);

  // Componente VehiculosListosParaVenta
  function VehiculosListosParaVenta() {
    // Filtrar vehículos que NO estén en el historial de ventas
    const soldVehicleIds = new Set(sales.map((s) => s.vehicle_id));
    const vehiclesToShow = readyVehicles.filter((v) => !soldVehicleIds.has(v.id));

    return (
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Registro de Venta</h2>
        {loadingReady ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : vehiclesToShow.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay vehículos listos para venta
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-4 text-left">Foto</th>
                  <th className="p-4 text-left">Marca</th>
                  <th className="p-4 text-left">Modelo</th>
                  <th className="p-4 text-left">Año</th>
                  <th className="p-4 text-left">Precio</th>
                  <th className="p-4 text-left">Placa</th>
                  <th className="p-4 text-left">Acción</th>
                </tr>
              </thead>
              <tbody>
                {vehiclesToShow.map((v) => {
                  const firstImage = v.image_url?.split(",")[0];
                  return (
                    <tr key={v.id} className="border-b">
                      <td className="p-4">
                        <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                          {firstImage ? (
                            <img 
                              src={firstImage} 
                              className="w-full h-full object-cover" 
                              crossOrigin="anonymous"
                              referrerPolicy="no-referrer"
                              alt={`${v.make?.name || ''} ${v.model?.name || ''}`}
                            />
                          ) : (
                            <span className="text-xs text-gray-400 flex items-center justify-center h-full">Sin foto</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">{v.make?.name || v.make_id}</td>
                      <td className="p-4">{v.model?.name || v.model_id}</td>
                      <td className="p-4">{v.year}</td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span>${v.price2?.toLocaleString() || v.price1?.toLocaleString() || 0} USD</span>
                          {exchangeRate && v.price2 ? (
                            <span className="text-xs text-gray-500">
                              {formatCRC(Math.round(v.price2 * exchangeRate))} CRC
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="p-4">{v.license_plate}</td>
                      <td className="p-4">
                        {canManageVenta ? (
                          <Button variant="outline" onClick={() => handleOpenDialogWithVehicle(v.id)}>
                            Registrar Venta
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    );
  }
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [goToPageInput, setGoToPageInput] = useState("");

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sales, setSales] = useState<VentasApi.SaleWithDetails[]>([]);
  const [availableVehicles, setAvailableVehicles] = useState<any[]>([]);
  const [customers, setCustomers] = useState<VentasApi.Customer[]>([]);
  const [salesPersons, setSalesPersons] = useState<VendedoresApi.SalesPerson[]>([]);
  const [dealers, setDealers] = useState<any[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState("");
  const [customerSearchTerm, setCustomerSearchTerm] = useState("");
  const [salesPersonSearchTerm, setSalesPersonSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCRC, setEditingCRC] = useState(false);
  const [crcInputValue, setCrcInputValue] = useState("");
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<VentasApi.SaleWithDetails | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    avgSalePrice: 0,
  });

  // --- Paginación Historial de Ventas ---
  const totalCount = sales.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleGoToPage = () => {
    const n = Number(goToPageInput);
    if (!Number.isFinite(n)) return;
    const target = Math.max(1, Math.min(totalPages, Math.trunc(n)));
    setCurrentPage(target);
  };

  const getPageItems = () => {
    const items: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
      return items;
    }

    const showLeftDots = currentPage > 4;
    const showRightDots = currentPage < totalPages - 3;

    items.push(1);

    if (showLeftDots) {
      items.push("...");
    } else {
      items.push(2, 3);
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      if (!items.includes(i)) items.push(i);
    }

    if (showRightDots) {
      items.push("...");
    } else {
      for (let i = totalPages - 2; i <= totalPages - 1; i++) {
        if (i > 1 && i < totalPages && !items.includes(i)) {
          items.push(i);
        }
      }
    }

    if (!items.includes(totalPages)) items.push(totalPages);

    return items;
  };

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedSales = sales.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [sales, pageSize]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle_id: "",
      customer_id: "",
      price_final: 0,
      payment_method: "Transferencia",
      sales_person: "",
      notes: "",
    },
  });

  const customerForm = useForm<z.infer<typeof customerSchema>>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      government_id: "",
      address: "",
      notes: "",
    },
  });

  // Get dealer_id from selected dealer
  const getDealerId = (): string => {
    if (!selectedDealerId) {
      throw new Error("No dealer seleccionado");
    }
    return selectedDealerId;
  };

  const getAuthToken = async (): Promise<string> => {
    try {
      const { token } = await adminAuth.ensureAuth();
      return token;
    } catch (error) {
      console.error("Error getting auth token:", error);
      throw error;
    }
  };

  useEffect(() => {
    loadDealers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedDealerId) {
      loadSales();
      loadAvailableVehicles();
      loadCustomers();
      loadSalesPersons();
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, selectedDealerId]);

  useEffect(() => {
    if (searchTerm.length >= 3) {
      searchCustomers();
    } else {
      setCustomers([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const loadDealers = async () => {
    try {
      const token = await getAuthToken();
      const data = await VentasApi.listDealers(token);
      setDealers(data);

      // Auto-select first dealer if available
      if (data.length > 0 && !selectedDealerId) {
        setSelectedDealerId(data[0].id);
      }
    } catch (error: any) {
      console.error("Error loading dealers:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los dealers",
        variant: "destructive",
      });
    }
  };

  const loadSales = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const dealerId = getDealerId();

      const filters: any = { limit: 50 };
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const data = await VentasApi.listSales(dealerId, filters, token);
      console.log("Loaded sales:", data);
      setSales(data || []);
    } catch (error) {
      console.error("Error loading sales:", error);
      setSales([]);
      toast({
        title: "Error",
        description: "Error al cargar ventas: " + (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

const loadAvailableVehicles = async () => {
  try {
    const token = await getAuthToken();
    const dealerId = getDealerId();
    const data = await VentasApi.listAvailableVehicles(dealerId, token);
    console.log("Loaded available vehicles:", data);

    // ✅ FILTRO GLOBAL: no mostrar vendidos (status_id === 6)
    const filtered = (data || []).filter((v: any) => (v.vehicle?.status_id ?? 0) !== 6);

    setAvailableVehicles(filtered);
  } catch (error) {
    console.error("Error loading vehicles:", error);
    setAvailableVehicles([]);
    toast({
      title: "Error",
      description: "Error al cargar vehículos: " + (error as Error).message,
      variant: "destructive",
    });
  }
};


  const loadStats = async () => {
    try {
      const token = await getAuthToken();
      const dealerId = getDealerId();

      const filters: any = {};
      if (startDate) filters.startDate = startDate;
      if (endDate) filters.endDate = endDate;

      const data = await VentasApi.getSalesStats(dealerId, filters, token);
      setStats(data || { totalSales: 0, totalRevenue: 0, avgSalePrice: 0 });
    } catch (error) {
      console.error("Error loading stats:", error);
      setStats({ totalSales: 0, totalRevenue: 0, avgSalePrice: 0 });
    }
  };

  const loadCustomers = async () => {
    try {
      const token = await getAuthToken();
      const dealerId = getDealerId();
      const data = await VentasApi.searchCustomers(dealerId, "", token);
      setCustomers(data);
    } catch (error: any) {
      console.error("Error loading customers:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    }
  };

  const loadSalesPersons = async () => {
    try {
      const token = await getAuthToken();
      const data = await VendedoresApi.GetSalesPersons(token);
      setSalesPersons(data);
    } catch (error: any) {
      console.error("Error loading sales persons:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los vendedores",
        variant: "destructive",
      });
    }
  };

  const searchCustomers = async () => {
    try {
      const token = await getAuthToken();
      const dealerId = getDealerId();
      const data = await VentasApi.searchCustomers(dealerId, searchTerm, token);
      console.log("Found customers:", data);
      setCustomers(data);
    } catch (error) {
      console.error("Error searching customers:", error);
      toast({
        title: "Error",
        description: "No se pudieron buscar clientes",
        variant: "destructive",
      });
    }
  };

  const onSubmitSale = async (values: z.infer<typeof formSchema>) => {
    try {
      setSaving(true);
      const token = await getAuthToken();
      const dealerId = getDealerId();

      console.log("Creating sale with values:", values);

      const sale = await VentasApi.createSale(
        dealerId,
        {
          vehicle_id: values.vehicle_id,
          customer_id: values.customer_id,
          price_final: values.price_final,
          price_final_crc: values.price_final_crc,
          payment_method: values.payment_method,
          sales_person: values.sales_person,
          notes: values.notes,
        },
        token
      );

      console.log("Created sale:", sale);

      await VentasApi.markVehicleAsSold(values.vehicle_id, 6, token);

      // --- OPTIMISTIC UPDATE: Remover vehículo vendido de la lista local ---
      setReadyVehicles(prev => prev.filter(v => v.id !== values.vehicle_id));

      // Reload readyVehicles desde backend (por si hay cambios externos)
      await InspeccionApi.listVehiclesByStatus(6)
        .then(setReadyVehicles)
        .catch(() => setReadyVehicles([]));

      toast({
        title: "Venta registrada",
        description: "La venta se ha registrado y el vehículo marcado como vendido",
      });

      form.reset();
      setIsDialogOpen(false);
      await loadSales();
      await loadAvailableVehicles();
      await loadStats();
    } catch (error: any) {
      console.error("Error creating sale:", error);
      toast({
        title: "Error",
        description:
          error.message ||
          "No se pudo registrar la venta. Asegúrese de haber seleccionado un dealer válido.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const onSubmitCustomer = async (values: z.infer<typeof customerSchema>) => {
    try {
      setSaving(true);
      const token = await getAuthToken();
      const dealerId = getDealerId();

      const customer = await VentasApi.createCustomer(
        dealerId,
        {
          name: values.name,
          phone: values.phone || undefined,
          email: values.email || undefined,
          government_id: values.government_id || undefined,
          address: values.address || undefined,
          notes: values.notes || undefined,
        },
        token
      );

      toast({
        title: "Éxito",
        description: "Cliente creado exitosamente",
      });

      form.setValue("customer_id", customer.id!);
      setIsCustomerDialogOpen(false);
      customerForm.reset();
      setCustomers([customer, ...customers]);
    } catch (error: any) {
      console.error("Error creating customer:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo crear el cliente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openDialog = () => {
    form.reset();
    setVehicleSearchTerm("");
    setCustomerSearchTerm("");
    setSalesPersonSearchTerm("");
    setIsDialogOpen(true);
  };

  const openSaleDetail = async (saleId: string) => {
    try {
      const token = await getAuthToken();
      const sale = await VentasApi.getSaleById(saleId, token);
      setSelectedSale(sale);
    } catch (error) {
      console.error("Error loading sale details:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el detalle de la venta",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb section="Operación" page="Ventas" />
      <VehiculosListosParaVenta />

      {/* Dealer Selection */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Label className="text-sm font-medium">Dealer:</Label>
          <Select value={selectedDealerId} onValueChange={setSelectedDealerId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Seleccione un dealer" />
            </SelectTrigger>
            <SelectContent>
              {dealers.map((dealer) => (
                <SelectItem key={dealer.id} value={dealer.id}>
                  {dealer.name || dealer.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Ventas</h1>
          <p className="text-muted-foreground mt-2">
            Registro y seguimiento de ventas realizadas
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ventas</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
            <p className="text-xs text-muted-foreground">
              {startDate || endDate ? "En el período seleccionado" : "Total histórico"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">USD</p>
            {exchangeRate && (
              <div className="text-sm text-gray-500 mt-1">
                {formatCRC(Math.round(stats.totalRevenue * exchangeRate))} CRC
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precio Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgSalePrice.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Por vehículo</p>
            {exchangeRate && (
              <div className="text-sm text-gray-500 mt-1">
                {formatCRC(Math.round(stats.avgSalePrice * exchangeRate))} CRC
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasa de cambio del día */}
      {exchangeRate && (
        <div className="mt-2 mb-4 text-sm text-muted-foreground">
          Tasa de cambio del día: <span className="font-semibold">₡{exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 2 })} por USD</span>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
              >
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Ventas</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : totalCount === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No hay ventas registradas
            </div>
          ) : (
            <>
              {/* Controles superiores: tamaño de página + rango */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Mostrar</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Por página" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 por página</SelectItem>
                      <SelectItem value="20">20 por página</SelectItem>
                      <SelectItem value="50">50 por página</SelectItem>
                      <SelectItem value="100">100 por página</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-muted-foreground">
                  Mostrando {totalCount === 0 ? 0 : startIndex + 1}
                  {"–"}
                  {Math.min(startIndex + pageSize, totalCount)}
                  {" de "}
                  {totalCount}
                </div>
              </div>

              {/* Tabla paginada */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Estado Vehículo</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Método Pago</TableHead>
                      <TableHead>Estado</TableHead>
                      {/* <TableHead className="text-right">Acciones</TableHead> */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSales.map((sale) => {
                      const statusId = (sale.vehicle as any)?.status_id || 0;
                      const statusName = VentasApi.getStatusNameById(statusId);

                      return (
                        <TableRow key={sale.id}>
                          <TableCell>
                            {sale.sold_at ? new Date(sale.sold_at).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{sale.customer?.name || "N/A"}</div>
                              <div className="text-sm text-muted-foreground">
                                {sale.customer?.phone || "-"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {sale.vehicle
                                  ? `Vehículo ${sale.vehicle.year} ${
                                      sale.vehicle.license_plate || sale.vehicle.vin || ""
                                    }`
                                  : "N/A"}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {sale.vehicle?.license_plate || sale.vehicle?.vin || "Sin placa"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                statusId === 6
                                  ? "default"
                                  : statusId === 1 || statusId === 2
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {statusName}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold">
                              ${sale.price_final?.toLocaleString() || "0"} USD
                              {sale.price_final_crc ? (
                                <div className="text-xs text-gray-500">
                                  {formatCRC(sale.price_final_crc)} CRC
                                </div>
                              ) : exchangeRate && sale.price_final ? (
                                <div className="text-xs text-gray-500">
                                  {formatCRC(Math.round(sale.price_final * exchangeRate))} CRC
                                </div>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>{sale.payment_method || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="default">Completada</Badge>
                          </TableCell>
                          {/* <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openSaleDetail(sale.id!)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell> */}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Barra de paginación + Ir a la página */}
              {totalCount > 0 && (
                <div className="flex justify-end mt-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                    {/* Paginación principal */}
                    <div className="flex items-center gap-1 rounded-full border bg-card px-2 py-1 shadow-sm">
                      {canGoPrev && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full h-7 w-7"
                          onClick={() => handlePageChange(currentPage - 1)}
                        >
                          {"<"}
                        </Button>
                      )}

                      {getPageItems().map((item, idx) =>
                        item === "..." ? (
                          <div
                            key={`dots-${idx}`}
                            className="px-2 text-xs text-muted-foreground select-none"
                          >
                            ...
                          </div>
                        ) : (
                          <Button
                            key={`page-${item}-${idx}`}
                            variant="ghost"
                            size="sm"
                            className={
                              item === currentPage
                                ? "h-7 min-w-[2rem] rounded-full border border-gray-300 bg-white/50 text-gray-900 shadow-sm"
                                : "h-7 min-w-[2rem] rounded-full"
                            }
                            onClick={() => handlePageChange(item as number)}
                          >
                            {item}
                          </Button>
                        )
                      )}

                      {canGoNext && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full h-7 w-7"
                          onClick={() => handlePageChange(currentPage + 1)}
                        >
                          {">"}
                        </Button>
                      )}
                    </div>

                    {/* Ir a la página */}
                    <div className="flex items-center gap-2 text-xs md:text-sm">
                      <span className="text-muted-foreground">Ir a la página</span>
                      <Input
                        value={goToPageInput}
                        onChange={(e) => setGoToPageInput(e.target.value)}
                        className="h-8 w-14 text-center text-xs md:text-sm"
                        inputMode="numeric"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleGoToPage();
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs md:text-sm"
                        onClick={handleGoToPage}
                      >
                        Ir &gt;
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Register Sale Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Venta</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitSale)} className="space-y-4">
              <FormField
                control={form.control}
                name="vehicle_id"
                render={({ field }) => {
                  // Buscar el vehículo seleccionado para mostrar nombre
                  const selectedVehicle = readyVehicles.find(v => v.id === field.value);
                  const vehicleName = selectedVehicle ? `${selectedVehicle.make?.name || selectedVehicle.make_id} ${selectedVehicle.model?.name || selectedVehicle.model_id} ${selectedVehicle.year}` : field.value;
                  return (
                    <FormItem>
                      <FormLabel>Vehículo</FormLabel>
                      <FormControl>
                        <div className="font-bold text-lg">{vehicleName}</div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cliente</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="price_final"
                render={({ field }) => {
                  // Usar field.value directamente para que reaccione a setValue
                  const priceUSD = field.value || 0;
                  
                  // Obtener CRC guardado manualmente (si existe)
                  const savedCRC = form.getValues("price_final_crc");
                  
                  // Si hay CRC guardado manualmente, mostrar ese; si no, calcular desde USD
                  const crcValue = savedCRC 
                    ? savedCRC.toLocaleString("es-CR")
                    : (exchangeRate && priceUSD
                        ? Math.round(priceUSD * exchangeRate).toLocaleString("es-CR")
                        : "0");

                  const handleCrcClick = () => {
                    setEditingCRC(true);
                    // Pre-llenar con el valor actual sin formato (remover puntos, espacios, comas)
                    const raw = crcValue.replace(/[\s.,]/g, "");
                    setCrcInputValue(raw);
                  };

                  const handleCrcInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                    // Remover cualquier caracter no numérico
                    const raw = e.target.value.replace(/\D/g, "");
                    // Formatear con separador de miles (espacio)
                    const formatted = Number(raw).toLocaleString("es-CR");
                    console.log('[CRC DEBUG] onChange - raw:', raw, 'formatted:', formatted);
                    setCrcInputValue(formatted);
                  };

                  const handleCrcInputBlur = () => {
                    // Remover puntos, espacios y comas para obtener el número limpio
                    const raw = crcInputValue.replace(/[\s.,]/g, "");
                    const crcNumber = Number(raw);
                    
                    if (crcNumber > 0) {
                      // Solo guardar el CRC editado manualmente, NO modificar USD
                      form.setValue("price_final_crc", crcNumber, {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true
                      });
                      
                      toast({
                        title: "Colones actualizado",
                        description: `₡${crcNumber.toLocaleString("es-CR")} guardado`,
                      });
                    }
                    setEditingCRC(false);
                  };

                  return (
                    <FormItem>
                      <FormLabel>Precio Final (USD)</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          {/* Input USD */}
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={priceUSD === 0 ? "" : `$${priceUSD}`}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^\d.]/g, "");
                              field.onChange(val ? Number(val) : 0);
                            }}
                            placeholder="$0"
                            className="pl-2 placeholder-gray-400"
                          />
                          {/* Display/Input CRC */}
                          <div className="text-sm text-gray-500 mt-1">
                            {editingCRC ? (
                              <div className="flex gap-2 items-center">
                                <div className="relative w-full">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₡</span>
                                  <Input
                                    autoFocus
                                    value={crcInputValue}
                                    onChange={handleCrcInputChange}
                                    placeholder="0"
                                    className="w-full pl-7"
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleCrcInputBlur();
                                      }
                                      if (e.key === "Escape") {
                                        setEditingCRC(false);
                                      }
                                    }}
                                  />
                                </div>
                                <Button 
                                  type="button" 
                                  size="sm" 
                                  className={crcInputValue ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                                  variant={crcInputValue ? "default" : "outline"}
                                  onClick={handleCrcInputBlur} 
                                  title="Confirmar CRC"
                                >
                                  Confirmar
                                </Button>
                              </div>
                            ) : (
                              <span
                                onClick={handleCrcClick}
                                className="cursor-pointer hover:underline hover:text-foreground transition-colors"
                              >
                                ≈ ₡{crcValue} (click para editar)
                              </span>
                            )}
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={form.control}
                name="payment_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de Pago</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione método de pago" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Transferencia">Transferencia</SelectItem>
                          <SelectItem value="Efectivo">Efectivo</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Campos ocultos o por defecto: dealer_id, currency, status, sold_at, created_by */}
              {canManageVenta ? (
                <Button type="submit" className="w-full mt-4">
                  Registrar Venta
                </Button>
              ) : null}
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Create Customer Dialog */}
      <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <Form {...customerForm}>
            <form
              onSubmit={customerForm.handleSubmit(onSubmitCustomer)}
              className="space-y-4"
            >
              {/* ...formulario de cliente... */}
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Sale Detail Dialog */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalle de Venta</DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="space-y-6">
              {/* ...detalle de venta... */}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
