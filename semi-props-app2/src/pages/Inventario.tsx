// Formatea colones con puntos cada tres cifras
function formatColones(value: number): string {
  return value ? value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "0";
}

import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, FileText, Edit, Eye, ShoppingCart, Loader2, Car } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import * as InventarioApi from "@/lib/InventarioApi";
import * as adminAuth from "@/lib/adminAuth";
import * as WorkOrdersApi from "@/lib/WorkOrdersApi";
import { getExchangeRate } from "@/lib/exchangeRateService";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const ITEMS_PER_PAGE = 10;

// Status mapping: id -> name
const STATUS_MAP: Record<number, string> = {
  1: "Ingreso",
  2: "Inspección",
  3: "Retoques",
  4: "Listo",
  5: "Publicado",
  6: "Vendido",
  7: "Oferta", // ✅ NUEVO
};

const STATUS_BADGE_VARIANTS: Record<string, string> = {
  Ingreso: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  Inspección: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  Retoques: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  Listo: "bg-green-500/10 text-green-500 border-green-500/20",
  Publicado: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  Vendido: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  Oferta: "bg-red-500/10 text-red-500 border-red-500/20", // ✅ NUEVO
};

export default function Inventario() {
// ✅ permisos (SIN hasPermission)
const [permMap, setPermMap] = useState<Record<string, string>>({});
const [permLoaded, setPermLoaded] = useState(false);

useEffect(() => {
  try {
    const raw = localStorage.getItem("current_role_perms");
    const parsed = raw ? JSON.parse(raw) : {};
    setPermMap(parsed || {});
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

// En tu storage: "inv.inventario_interno":"accion"
const invScope = permLoaded ? norm(permMap["inv.inventario_interno"]) : "";

// ✅ si NO es accion => solo vista
const isReadOnly = permLoaded && invScope !== "accion";

// ✅ admin especial: solo si tiene admin.administracion = accion
const isAdmin = permLoaded && norm(permMap["admin.administracion"]) === "accion";

// (si querés conservar el nombre que venías usando)
const canManageInventario = !isReadOnly;

  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<InventarioApi.VehicleListItem[]>([]);
  const [makes, setMakes] = useState<Array<{ id: number; name: string }>>([]);
  const [makesMap, setMakesMap] = useState<Record<number, string>>({});
  const [modelsMap, setModelsMap] = useState<Record<number, string>>({});
  const [years, setYears] = useState<number[]>([]);
  const [totalInManagement, setTotalInManagement] = useState(0);

  const [searchText, setSearchText] = useState("");
  const [estadoFilters, setEstadoFilters] = useState<number[]>([]);
  const [marcaFilter, setMarcaFilter] = useState<string>("all");
  const [anioFilter, setAnioFilter] = useState<string>("all");
  const [transmisionFilter, setTransmisionFilter] = useState<string>("all");
  const [precioMin, setPrecioMin] = useState("");
  const [precioMax, setPrecioMax] = useState("");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [goToPageInput, setGoToPageInput] = useState("");

  // Detalle
  const [selectedVehicle, setSelectedVehicle] =
    useState<InventarioApi.VehicleListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  
  // Estado para retoques del vehículo seleccionado
  const [vehicleRetoques, setVehicleRetoques] = useState<{ totalUSD: number; totalCRC: number } | null>(null);
  const [loadingRetoques, setLoadingRetoques] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(500);

  // Imagen ampliada
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState<string[]>([]);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  // Get auth token and dealer ID
  const getAuthToken = async (): Promise<string> => {
    try {
      const { token } = await adminAuth.ensureAuth();
      return token;
    } catch (error) {
      console.error("Error getting auth token:", error);
      return "";
    }
  };

  const getDealerId = (): string => {
    // TODO: obtener de auth real
    return "00000000-0000-0000-0000-000000000001";
  };

  useEffect(() => {
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadVehicles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estadoFilters, marcaFilter, anioFilter, transmisionFilter, precioMin, precioMax]);

  // Cuando cambian filtros / búsqueda, volvemos a página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, estadoFilters, marcaFilter, anioFilter, transmisionFilter, precioMin, precioMax]);

  // Cargar exchange rate al inicio
  useEffect(() => {
    getExchangeRate().then(setExchangeRate).catch(console.error);
  }, []);

  // Cargar retoques cuando se abre el detalle de un vehículo
  useEffect(() => {
    const loadRetoques = async () => {
      if (detailOpen && selectedVehicle) {
        setLoadingRetoques(true);
        try {
          // Usar la misma lógica que Retoques.tsx
          const token = await getAuthToken();
          const workOrders = await WorkOrdersApi.listWorkOrders(selectedVehicle.id, token);
          
          if (!workOrders || workOrders.length === 0) {
            console.log('[Inventario] No hay work orders para vehículo:', selectedVehicle.id);
            setVehicleRetoques({ totalUSD: 0, totalCRC: 0 });
            return;
          }

          let totalUSD = 0;
          let totalCRC = 0;

          for (const wo of workOrders) {
            if (wo.id) {
              const tasks = await WorkOrdersApi.listWorkOrderTasks(wo.id, token);
              console.log('[Inventario] Tasks encontradas:', tasks.length, 'para work order:', wo.id);
              for (const task of tasks) {
                totalUSD += task.cost || 0;
                totalCRC += task.cost_crc ?? Math.round((task.cost || 0) * exchangeRate);
              }
            }
          }

          console.log('[Inventario] Total retoques:', { totalUSD, totalCRC });
          setVehicleRetoques({ totalUSD, totalCRC });
        } catch (error) {
          console.error("[Inventario] Error loading retoques:", error);
          setVehicleRetoques({ totalUSD: 0, totalCRC: 0 });
        } finally {
          setLoadingRetoques(false);
        }
      } else {
        setVehicleRetoques(null);
      }
    };
    
    loadRetoques();
  }, [detailOpen, selectedVehicle, exchangeRate]);

  const loadInitialData = async () => {
    const token = await getAuthToken();
    const dealerId = getDealerId();

    try {
      const [makesData, makesMapData, modelsMapData, yearsData, count] =
        await Promise.all([
          InventarioApi.getMakes(token),
          InventarioApi.getMakesMap(token),
          InventarioApi.getModelsMap(token),
          InventarioApi.getYears(token),
          InventarioApi.countVehiclesInManagement(dealerId, token),
        ]);

      setMakes(makesData);
      setMakesMap(makesMapData);
      setModelsMap(modelsMapData);
      setYears(yearsData);
      setTotalInManagement(count);
    } catch (error) {
      console.error("Error loading initial data:", error);
      toast({
        title: "Error",
        description:
          "No se pudieron cargar los datos iniciales. Verifica tu autenticación.",
        variant: "destructive",
      });
    }
  };

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();
      const dealerId = getDealerId();

      const filters: InventarioApi.FilterOptions = {};

      if (estadoFilters.length === 1) {
        filters.status_id = estadoFilters[0];
      }
      if (marcaFilter !== "all") {
        const selectedMake = makes.find((m) => m.name === marcaFilter);
        if (selectedMake) filters.make_id = selectedMake.id;
      }
      if (anioFilter !== "all") {
        filters.year = parseInt(anioFilter);
      }
      if (transmisionFilter !== "all") {
        filters.transmission = transmisionFilter;
      }
      if (precioMin) {
        filters.price_min = parseFloat(precioMin);
      }
      if (precioMax) {
        filters.price_max = parseFloat(precioMax);
      }
      if (searchText) {
        filters.search = searchText;
      }

      const data = await InventarioApi.listVehicles(dealerId, filters, token);
      
      // Cargar retoques para cada vehículo y calcular costo total
      const vehiclesWithRetoques = await Promise.all(
        data.map(async (vehicle) => {
          try {
            const workOrders = await WorkOrdersApi.listWorkOrders(vehicle.id, token);
            if (workOrders && workOrders.length > 0) {
              let totalRetoquesUSD = 0;
              let totalRetoquesCRC = 0;
              
              for (const wo of workOrders) {
                if (wo.id) {
                  const tasks = await WorkOrdersApi.listWorkOrderTasks(wo.id, token);
                  for (const task of tasks) {
                    totalRetoquesUSD += task.cost || 0;
                    totalRetoquesCRC += task.cost_crc ?? Math.round((task.cost || 0) * exchangeRate);
                  }
                }
              }
              
              return {
                ...vehicle,
                totalRetoques: totalRetoquesUSD,
                totalRetoquesCRC: totalRetoquesCRC,
                costoTotalAgregado: (vehicle.price1 || 0) + totalRetoquesUSD,
                costoTotalAgregadoCRC: ((vehicle as any).price1_crc || Math.round((vehicle.price1 || 0) * exchangeRate)) + totalRetoquesCRC,
              };
            }
          } catch (error) {
            console.error(`Error loading retoques for vehicle ${vehicle.id}:`, error);
          }
          
          return {
            ...vehicle,
            totalRetoques: 0,
            totalRetoquesCRC: 0,
            costoTotalAgregado: vehicle.price1 || 0,
            costoTotalAgregadoCRC: (vehicle as any).price1_crc || Math.round((vehicle.price1 || 0) * exchangeRate),
          };
        })
      );
      
      setVehicles(vehiclesWithRetoques);
    } catch (error: any) {
      console.error("Error loading vehicles:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudieron cargar los vehículos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleEstadoFilter = (statusId: number) => {
    setEstadoFilters((prev) =>
      prev.includes(statusId) ? prev.filter((e) => e !== statusId) : [...prev, statusId]
    );
  };

  // Client-side filtering for multi-status and search
  const filteredVehicles = useMemo(() => {
    let filtered = [...vehicles];

    // Multi-status filter (when more than one status is selected)
    if (estadoFilters.length > 1) {
      filtered = filtered.filter((v) => estadoFilters.includes(v.status_id));
    }

    // Search filter (marca, modelo, placa, año)
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter((v) => {
        const makeName = (v.make_id ? makesMap[v.make_id] : "")?.toLowerCase() || "";
        const modelName = (v.model_id ? modelsMap[v.model_id] : "")?.toLowerCase() || "";
        const plate = v.license_plate?.toLowerCase() || "";
        const year = v.year?.toString() || "";

        return (
          makeName.includes(search) ||
          modelName.includes(search) ||
          plate.includes(search) ||
          year.includes(search)
        );
      });
    }

    return filtered;
  }, [vehicles, estadoFilters, searchText, makesMap, modelsMap]);

  // Pagination (estilo avanzado)
  const totalCount = filteredVehicles.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const paginatedVehicles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredVehicles.slice(start, start + pageSize);
  }, [filteredVehicles, currentPage, pageSize]);

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

    // Siempre la primera
    items.push(1);

    // Bloque izquierdo
    if (showLeftDots) items.push("...");
    else items.push(2, 3);

    // Bloque central alrededor de la actual
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      if (!items.includes(i)) items.push(i);
    }

    // Bloque derecho
    if (showRightDots) items.push("...");
    else {
      for (let i = totalPages - 2; i <= totalPages - 1; i++) {
        if (i > 1 && i < totalPages && !items.includes(i)) items.push(i);
      }
    }

    // Siempre la última
    if (!items.includes(totalPages)) items.push(totalPages);

    return items;
  };

  const handleViewVehicle = (vehicle: InventarioApi.VehicleListItem) => {
    (async () => {
      try {
        const token = await getAuthToken();
        const freshVehicle = await InventarioApi.getVehicleById(vehicle.id, token);
        setSelectedVehicle(freshVehicle);
      } catch (e) {
        setSelectedVehicle(vehicle);
      } finally {
        setDetailOpen(true);
      }
    })();
  };

const handleEditVehicle = (vehicleId: string) => {
  navigate(`/ingreso?edit=${vehicleId}`);
};

const handleCreateListing = (vehicleId: string) => {
  navigate(`/publicacion?vehicle=${vehicleId}`);
};

const handleSellVehicle = (vehicleId: string) => {
  navigate(`/venta?vehicle=${vehicleId}`);
};


  // Helpers para el detalle
  const getStatusName = (vehicle: InventarioApi.VehicleListItem) =>
    STATUS_MAP[vehicle.status_id] ||
    "Desconocido";

  const getMakeName = (vehicle: InventarioApi.VehicleListItem) =>
    vehicle.make_id ? makesMap[vehicle.make_id] || "" : "";

  const getModelName = (vehicle: InventarioApi.VehicleListItem) =>
    vehicle.model_id ? modelsMap[vehicle.model_id] || "" : "";

  const getPrice = (vehicle: InventarioApi.VehicleListItem) =>
    typeof (vehicle as any).costoTotalAgregado === "number" 
      ? (vehicle as any).costoTotalAgregado 
      : (vehicle.price1 || 0);

  // Campos opcionales vía any para no romper tipos
  const getTransmission = (vehicle: InventarioApi.VehicleListItem) =>
    (vehicle as any).transmission || "N/A";

  const getFuelType = (vehicle: InventarioApi.VehicleListItem) =>
    (vehicle as any).fuel_type || "N/A";

  const getKm = (vehicle: InventarioApi.VehicleListItem) => {
    const v: any = vehicle as any;
    const km = v.odometer_km ?? v.km;
    return typeof km === "number" ? km : null;
  };

  const getColor = (vehicle: InventarioApi.VehicleListItem) => {
    const v: any = vehicle as any;
    return v.color_ext || v.color_int || "N/A";
  };

  // Manejo de click en imagen para ampliar
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventario Interno</h1>
          <p className="text-muted-foreground mt-2">
            Autos propios en gestión ({totalInManagement} total)
          </p>
        </div>
        {canManageInventario ? (
          <Button onClick={() => navigate("/ingreso")}>
            Agregar Vehículo
          </Button>
        ) : null}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por marca, modelo, año, placa..."
                className="pl-9"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Estado (Multi-select) */}
              <div className="space-y-2">
                <Label>Estado</Label>
                <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                  {[1, 2, 3, 4, 5, 6, 7].map((statusId) => (
                    <div key={statusId} className="flex items-center space-x-2">
                      <Checkbox
                        id={`estado-${statusId}`}
                        checked={estadoFilters.includes(statusId)}
                        onCheckedChange={() => toggleEstadoFilter(statusId)}
                      />
                      <label
                        htmlFor={`estado-${statusId}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {STATUS_MAP[statusId] || "Desconocido"}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Marca */}
              <div className="space-y-2">
                <Label htmlFor="marca">Marca</Label>
                <Select value={marcaFilter} onValueChange={setMarcaFilter}>
                  <SelectTrigger id="marca">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {makes.map((make) => (
                      <SelectItem key={make.id} value={make.name}>
                        {make.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Año */}
              <div className="space-y-2">
                <Label htmlFor="anio">Año</Label>
                <Select value={anioFilter} onValueChange={setAnioFilter}>
                  <SelectTrigger id="anio">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transmisión */}
              <div className="space-y-2">
                <Label htmlFor="transmision">Transmisión</Label>
                <Select value={transmisionFilter} onValueChange={setTransmisionFilter}>
                  <SelectTrigger id="transmision">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="Automática">Automática</SelectItem>
                    <SelectItem value="Manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Precio */}
              <div className="space-y-2">
                <Label>Precio</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={precioMin}
                    onChange={(e) => setPrecioMin(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={precioMax}
                    onChange={(e) => setPrecioMax(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button variant="outline" onClick={loadVehicles} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Aplicar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ---------------- RESULTADOS ---------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados ({totalCount})</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : totalCount === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron vehículos con los filtros aplicados
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
                    <SelectTrigger className="w-[140px]">
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
                  Mostrando {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                  {"–"}
                  {Math.min(currentPage * pageSize, totalCount)}
                  {" de "}
                  {totalCount}
                </div>
              </div>

              {/* Tabla */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">Foto</TableHead>
                      <TableHead>Vehículo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Días en Stock</TableHead>
                      <TableHead style={{ minWidth: 120 }}>Dólares</TableHead>
                      <TableHead style={{ minWidth: 120 }}>Colones</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginatedVehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No se encontraron vehículos
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedVehicles.map((vehicle) => {
                        const statusName = getStatusName(vehicle);
                        const makeName = getMakeName(vehicle);
                        const modelName = getModelName(vehicle);

                        return (
                          <TableRow key={vehicle.id}>
                            <TableCell>
                              <div className="w-16 h-16 bg-muted rounded-md overflow-hidden">
                                {vehicle.image_url ? (
                                  <img
                                    src={vehicle.image_url.split(",")[0]}
                                    alt={`${makeName} ${modelName}`}
                                    className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                    crossOrigin="anonymous"
                                    referrerPolicy="no-referrer"
                                    onClick={() => handleImageClick(vehicle.image_url!.split(","), 0)}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                                    Sin foto
                                  </div>
                                )}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="font-medium">
                                {makeName} {modelName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {vehicle.year} • {vehicle.license_plate || "Sin placa"}
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge variant="outline" className={STATUS_BADGE_VARIANTS[statusName]}>
                                {statusName}
                              </Badge>
                            </TableCell>

                            <TableCell>{vehicle.days_in_stock || 0} días</TableCell>

                            <TableCell style={{ minWidth: 120 }}>
                              <div className="font-medium">
                                ${getPrice(vehicle)?.toLocaleString() ?? "0"}
                              </div>
                            </TableCell>

                            <TableCell style={{ minWidth: 120 }}>
                              <div className="font-medium">
                                {typeof (vehicle as any).costoTotalAgregadoCRC === "number" &&
                                (vehicle as any).costoTotalAgregadoCRC > 0
                                  ? `₡${formatColones((vehicle as any).costoTotalAgregadoCRC)}`
                                  : ""}
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="flex items-center justify-end gap-2">

                            {/* Ver detalles (sheet) - SIEMPRE */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleViewVehicle(vehicle)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver detalles</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                                                            
                            {/* ✅ Acciones SOLO si puede gestionar */}
                            {canManageInventario ? (
                              <>
                                {/* Editar */}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" onClick={() => handleEditVehicle(vehicle.id)}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Editar</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                            
                                {/* Crear publicación (Listo) */}
                                {vehicle.status_id === 4 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleCreateListing(vehicle.id)}>
                                          <FileText className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Crear publicación</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                            
                                {/* Vender (Publicado) */}
                                {vehicle.status_id === 5 && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" onClick={() => handleSellVehicle(vehicle.id)}>
                                          <ShoppingCart className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Vender</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                              </>
                            ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Barra de paginación + Ir a la página */}
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Sheet de detalle (al hacer clic en el ojo) */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-2xl">
          {selectedVehicle && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {getMakeName(selectedVehicle)} {getModelName(selectedVehicle)} {selectedVehicle.year}
                </SheetTitle>
                <SheetDescription>Detalles del vehículo interno</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Imágenes grandes (todas las fotos) */}
                {selectedVehicle.image_url ? (
                  <div className="flex gap-2 flex-wrap">
                    {selectedVehicle.image_url.split(",").map((url: string, idx: number) => (
                      <div key={idx} className="w-32 h-32 rounded-lg overflow-hidden bg-muted">
                        <img
                          src={url}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          onClick={() => handleImageClick(selectedVehicle.image_url!.split(","), idx)}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                    <Car className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                {/* Info principal */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Estado</p>
                    <p className="font-medium">{getStatusName(selectedVehicle)}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Placa</p>
                    <p className="font-medium">{selectedVehicle.license_plate || "Sin placa"}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Precio</p>
                    <p className="font-medium text-lg">
                      {getPrice(selectedVehicle) !== null
                        ? `$${getPrice(selectedVehicle)!.toLocaleString()}`
                        : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {typeof (selectedVehicle as any).price1_crc === "number" &&
                      (selectedVehicle as any).price1_crc > 0
                        ? `≈ ₡${formatColones((selectedVehicle as any).price1_crc)}`
                        : ""}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Días en stock</p>
                    <p className="font-medium">{selectedVehicle.days_in_stock || 0} días</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Transmisión</p>
                    <p className="font-medium">{getTransmission(selectedVehicle)}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Kilometraje</p>
                    <p className="font-medium">
                      {getKm(selectedVehicle) !== null
                        ? `${getKm(selectedVehicle)!.toLocaleString()} km`
                        : "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Combustible</p>
                    <p className="font-medium">{getFuelType(selectedVehicle)}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Color</p>
                    <p className="font-medium">{getColor(selectedVehicle)}</p>
                  </div>
                </div>

                {/* Sección de Análisis de Costos y Ganancia */}
              {/* ✅ Sección de Análisis de Costos: SOLO ADMIN */}
              {isAdmin ? (
                <div className="mt-6 pt-6 border-t">
                  <h3 className="text-lg font-semibold mb-4">Análisis de Costos</h3>
              
                  {loadingRetoques ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Costo Original */}
                      <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Costo original del vehículo</p>
                          <p className="font-semibold text-lg">
                            ${(selectedVehicle.price1 || 0).toLocaleString()} USD
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ≈ ₡{formatColones((selectedVehicle.price1 || 0) * exchangeRate)}
                          </p>
                        </div>
                      </div>

                      {/* Costo de Retoques */}
                      <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Costo total de retoques</p>
                          <p className="font-semibold text-lg text-green-700">
                            ${(vehicleRetoques?.totalUSD || 0).toLocaleString()} USD
                          </p>
                          <p className="text-xs text-green-600">
                            ≈ ₡{formatColones(vehicleRetoques?.totalCRC || 0)}
                          </p>
                        </div>
                      </div>

                      {/* Costo Total (Original + Retoques) */}
                      <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Costo total del vehículo</p>
                          {(() => {
                            const costoOriginal = selectedVehicle.price1 || 0;
                            const costoRetoques = vehicleRetoques?.totalUSD || 0;
                            const costoTotal = costoOriginal + costoRetoques;
                            const costoTotalCRC = (costoOriginal * exchangeRate) + (vehicleRetoques?.totalCRC || 0);
                            return (
                              <>
                                <p className="font-semibold text-lg text-blue-700">
                                  ${costoTotal.toLocaleString()} USD
                                </p>
                                <p className="text-xs text-blue-600">
                                  ≈ ₡{formatColones(costoTotalCRC)}
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Precio Sugerido (Original) */}
                      <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Precio sugerido (original)</p>
                          <p className="font-semibold text-lg text-purple-700">
                            ${(selectedVehicle.price2 || 0).toLocaleString()} USD
                          </p>
                          <p className="text-xs text-purple-600">
                            ≈ ₡{formatColones((selectedVehicle as any).price2_crc || (selectedVehicle.price2 || 0) * exchangeRate)}
                          </p>
                        </div>
                      </div>

                      {/* Precio Sugerido Agregado (Sugerido + Retoques) */}
                      <div className="flex justify-between items-center p-3 bg-violet-100 rounded-lg border border-violet-200">
                        <div>
                          <p className="text-sm text-muted-foreground">Precio sugerido agregado</p>
                          {(() => {
                            const precioSugerido = selectedVehicle.price2 || 0;
                            const costoRetoques = vehicleRetoques?.totalUSD || 0;
                            const precioSugeridoAgregado = precioSugerido + costoRetoques;
                            const precioSugeridoCRC = (selectedVehicle as any).price2_crc || precioSugerido * exchangeRate;
                            const precioSugeridoAgregadoCRC = precioSugeridoCRC + (vehicleRetoques?.totalCRC || 0);
                            return (
                              <>
                                <p className="font-semibold text-lg text-violet-700">
                                  ${precioSugeridoAgregado.toLocaleString()} USD
                                </p>
                                <p className="text-xs text-violet-600">
                                  ≈ ₡{formatColones(precioSugeridoAgregadoCRC)}
                                </p>
                                <p className="text-xs text-violet-500 mt-1">
                                  = Precio sugerido + Retoques
                                </p>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Ganancia = Precio Sugerido Agregado - Costo Original */}
                      {(() => {
                        const costoOriginal = selectedVehicle.price1 || 0;
                        const costoOriginalCRC = costoOriginal * exchangeRate;
                        const precioSugerido = selectedVehicle.price2 || 0;
                        const costoRetoques = vehicleRetoques?.totalUSD || 0;
                        const precioSugeridoAgregado = precioSugerido + costoRetoques;
                        const precioSugeridoCRC = (selectedVehicle as any).price2_crc || precioSugerido * exchangeRate;
                        const precioSugeridoAgregadoCRC = precioSugeridoCRC + (vehicleRetoques?.totalCRC || 0);
                        const ganancia = precioSugeridoAgregado - costoOriginal;
                        const gananciaCRC = precioSugeridoAgregadoCRC - costoOriginalCRC;
                        const isGanancia = ganancia >= 0;

                        return (
                          <div className={`flex justify-between items-center p-4 rounded-lg ${isGanancia ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                            <div className="flex-1">
                              <p className="text-sm text-muted-foreground">
                                {isGanancia ? 'Ganancia estimada entre costo inicial y precio sugerido agregado' : 'Pérdida estimada'}
                              </p>
                              <p className={`font-bold text-2xl ${isGanancia ? 'text-emerald-600' : 'text-red-600'}`}>
                                {isGanancia ? '+' : ''}{ganancia.toLocaleString()} USD
                              </p>
                              <p className={`text-sm ${isGanancia ? 'text-emerald-500' : 'text-red-500'}`}>
                                ≈ {isGanancia ? '+' : ''}₡{formatColones(gananciaCRC)}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ) : null}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

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
                  <ChevronLeft className="w-8 h-8" />
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
                  <ChevronRight className="w-8 h-8" />
                </button>
              </div>

              <div className="mt-2 text-xs text-muted-foreground">
                {modalImageIndex + 1} / {modalImages.length}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
