import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// ✅ IMPORTAR EL HOOK PERSONALIZADO
import { useAuthToken } from "@/hooks/useAuthToken";
import { getExchangeRate } from "@/lib/exchangeRateService";

// Formatea colones con puntos cada tres cifras
function formatColones(value: number): string {
  return value ? value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "0";
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { dataStore, addVehicleEvent } from "@/lib/dataStore";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import {
  VehicleStepper,
  type VehicleStatus,
} from "@/components/VehicleStepper";
import * as InspeccionApi from "@/lib/InspeccionApi";
import * as ProveedoresApi from "@/lib/ProveedoresApi";
import * as WorkOrdersApi from "@/lib/WorkOrdersApi";

// ✅ CHANGE: mapa de status real (según tu tabla)
const STATUS_LABEL: Record<number, VehicleStatus> = {
  1: "Ingreso",
  2: "Inspección",
  3: "Retoques",
  4: "Listo",
  5: "Publicado",
  6: "Vendido",
  7: "Oferta",
};

function getStatusLabel(id?: number | null) {
  if (!id) return "Desconocido";
  return STATUS_LABEL[id] ?? (`Status ${id}` as any);
}

// ✅ Para el stepper (TIPADO)
function getStepperStatus(id?: number | null): VehicleStatus {
  if (!id) return "Ingreso";
  return STATUS_LABEL[id] ?? "Ingreso";
}

function getStatusBadgeClasses(id?: number | null) {
  switch (id) {
    case 1:
      return "bg-slate-100 text-slate-800";
    case 2:
      return "bg-blue-100 text-blue-800";
    case 3:
      return "bg-orange-100 text-orange-800";
    case 4:
      return "bg-emerald-100 text-emerald-800";
    case 5:
      return "bg-purple-100 text-purple-800";
    case 6:
      return "bg-gray-200 text-gray-900";
    case 7:
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-muted text-foreground";
  }
}

// ✅ CHANGE: opciones de filtro (QUITAMOS VENDIDO 6 para que nunca se muestre aquí)
const VEHICLE_STATUS_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "1", label: "Ingreso" },
  { value: "2", label: "Inspección" },
  { value: "3", label: "Retoques" },
  { value: "4", label: "Listo" },
  { value: "5", label: "Publicado" },
  // { value: "6", label: "Vendido" }, // ❌ NO mostrar en Retoques
  { value: "7", label: "Oferta" },
];

// ✅ Status que NO debe aparecer en Retoques
const EXCLUDED_STATUS_IDS = new Set<number>([6]); // Vendido

export default function Retoques() {
  const navigate = useNavigate();
  
  // Estado para el modal de publicación
  const [publishModalVehicleId, setPublishModalVehicleId] = useState<
    string | null
  >(null);
  const [publishing, setPublishing] = useState(false);
  
  // Estado para rastrear qué vehículos ya tienen listings
  const [vehiclesWithListings, setVehiclesWithListings] = useState<Set<string>>(new Set());

  const ITEMS_PER_PAGE = 10;
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [vehicles, setVehicles] = useState<
    (InspeccionApi.Vehicle & {
      totalRetoques?: number;
      totalRetoquesCRC?: number;
    })[]
  >([]);

  // ✅ CHANGE: filtro persistente (para que NO se quite)
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    // ✅ si antes alguien guardó "6" en localStorage, lo forzamos a "all"
    const saved = localStorage.getItem("vehicleStatusFilter") ?? "all";
    return saved === "6" ? "all" : saved;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    // ✅ si por alguna razón cae en 6, lo corrige
    if (vehicleStatusFilter === "6") {
      localStorage.setItem("vehicleStatusFilter", "all");
      setVehicleStatusFilter("all");
      return;
    }
    localStorage.setItem("vehicleStatusFilter", vehicleStatusFilter);
  }, [vehicleStatusFilter]);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null
  );
  const [currentWorkOrder, setCurrentWorkOrder] =
    useState<WorkOrdersApi.WorkOrder | null>(null);
  const [tasks, setTasks] = useState<WorkOrdersApi.WorkOrderTask[]>([]);
  const [fotosRetoques, setFotosRetoques] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTarea, setEditingTarea] =
    useState<WorkOrdersApi.WorkOrderTask | null>(null);

  const [talleres, setTalleres] = useState<ProveedoresApi.GetSupplierParams[]>(
    []
  );

  type DealerUnified = ProveedoresApi.Dealer & { external?: boolean };
  const [dealers, setDealers] = useState<DealerUnified[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<string>("");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [goToPageInput, setGoToPageInput] = useState("");

  // Exchange rate state
  const [exchangeRate, setExchangeRate] = useState<number>(520);

  // Inline editing for CRC per task
  type EditingCRC = { id: number; value: string; saving?: boolean };
  const [editingCRC, setEditingCRC] = useState<EditingCRC | null>(null);

  // Dummy state to force re-render
  const [crcEditTick, setCrcEditTick] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _forceRerender = crcEditTick;

  // Load exchange rate on mount
  useEffect(() => {
    getExchangeRate().then(setExchangeRate);
  }, []);

  // ✅ SOLUCIÓN: Usar el hook personalizado
  const token = useAuthToken();

// ---- Permisos (vista vs acción) ----
const [permMap, setPermMap] = useState<Record<string, string>>({});
const [permLoaded, setPermLoaded] = useState(false);

useEffect(() => {
  try {
    const raw = localStorage.getItem("current_role_perms");
    const parsed = raw ? JSON.parse(raw) : null;

    const m: Record<string, string> = {};

    if (Array.isArray(parsed)) {
      for (const p of parsed) if (p?.code) m[String(p.code)] = String(p.scope ?? "");
    } else if (parsed?.permissions && Array.isArray(parsed.permissions)) {
      for (const p of parsed.permissions) if (p?.code) m[String(p.code)] = String(p.scope ?? "");
    } else if (parsed && typeof parsed === "object") {
      Object.assign(m, parsed);
    }

    setPermMap(m);
  } catch {
    setPermMap({});
  } finally {
    setPermLoaded(true);
  }
}, []);

const norm = (v?: string) =>
  (v ?? "")
    .toString()
    .trim()
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

// ✅ tus permisos reales (según screenshot): intel.reportes, etc.
// Para Retoques define el code real, ejemplo:
const RETOQUES_PERM = "work.retoques"; // <-- si este es el que tienes en DB
const canViewRetoques = canViewCode(RETOQUES_PERM);
const canActRetoques = canActCode(RETOQUES_PERM);

  // Form state
  const [formData, setFormData] = useState({
    task_name: "",
    responsible: "",
    cost: 0,
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    notes: "",
    supplier_id: "",
  });

  // Estado para modal de inspección
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [inspectionChecklist, setInspectionChecklist] = useState<any[]>([]);
  const [inspectionLoading, setInspectionLoading] = useState(false);
  const [inspectionError, setInspectionError] = useState<string | null>(null);
  const [inspectionDiag, setInspectionDiag] = useState<any | null>(null);
  const [inspectionGeneralNote, setInspectionGeneralNote] =
    useState<string>("");
  const [inspectionData, setInspectionData] = useState<InspeccionApi.Inspection | null>(null);

  const handleShowInspection = async () => {
    if (!selectedVehicleId) return;
    setInspectionLoading(true);
    setInspectionError(null);
    setInspectionChecklist([]);
    setInspectionDiag(null);
    setInspectionData(null);

    try {
      const inspection = await InspeccionApi.getInspectionByVehicleId(
        selectedVehicleId
      );
      if (!inspection) {
        setInspectionError("No existe inspección para este vehículo");
        setInspectionChecklist([]);
        setShowInspectionModal(true);
        setInspectionGeneralNote("");
        return;
      }

      // Guardar datos de la inspección para mostrar resumen
      setInspectionData(inspection);
      setInspectionGeneralNote(inspection.notes || inspection.notas_generales || "");

      const checklist = await InspeccionApi.loadChecklistItems(inspection.id);
      setInspectionChecklist(checklist);
      setShowInspectionModal(true);
    } catch (err: any) {
      setInspectionError(
        err?.message || "Error desconocido al cargar la inspección"
      );
      setInspectionChecklist([]);
      setInspectionGeneralNote("");
    } finally {
      setInspectionLoading(false);
    }
  };

  // Cargar vehículos según filtro de estado
  useEffect(() => {
    loadVehicles();
    loadTalleres();
    loadDealers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadVehicles();
    setCurrentPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleStatusFilter]);

  const loadDealers = async () => {
    try {
      const internal = await ProveedoresApi.GetDealers();
      let external: ProveedoresApi.Dealer[] = [];
      if (ProveedoresApi.GetDealersExternal) {
        try {
          external = await ProveedoresApi.GetDealersExternal();
        } catch {}
      }

      const unified: DealerUnified[] = [
        ...internal.map((d) => ({ ...d, external: false })),
        ...external.map((d) => ({ ...d, external: true })),
      ];

      setDealers(unified);
      if (unified.length > 0) setSelectedDealerId(unified[0].id);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los dealers",
        variant: "destructive",
      });
    }
  };

  // Load work order and tasks when vehicle is selected
  useEffect(() => {
    if (selectedVehicleId) {
      loadWorkOrderForVehicle(selectedVehicleId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId]);

  const loadVehicles = async () => {
    try {
      setLoading(true);

      // ✅ si intentan filtrar por vendido, lo bloqueamos igual
      if (vehicleStatusFilter === "6") {
        setVehicles([]);
        return;
      }

      let data: InspeccionApi.Vehicle[] = [];
      if (vehicleStatusFilter === "all") {
        data = await InspeccionApi.listAllVehicles();
      } else {
        data = await InspeccionApi.listVehiclesByStatus(
          Number(vehicleStatusFilter)
        );
      }

      // ✅ NUEVO: nunca mostrar vendidos
      const filtered = data.filter(
        (v) => !EXCLUDED_STATUS_IDS.has(Number(v.status_id))
      );

      // ✅ Cargar listings existentes para mostrar indicador visual
      const allListings = await InspeccionApi.listVehicleListings();
      const listingVehicleIds = new Set(allListings.map(l => l.vehicle_id));
      setVehiclesWithListings(listingVehicleIds);

      const vehiclesWithCosts = await Promise.all(
        filtered.map(async (vehicle) => {
          try {
            const workOrders = await WorkOrdersApi.listWorkOrders(
              vehicle.id,
              token
            );
            if (workOrders.length > 0) {
              const t = await WorkOrdersApi.listWorkOrderTasks(
                workOrders[0].id!,
                token
              );

              const totalRetoques = t.reduce(
                (sum, task) => sum + (task.cost || 0),
                0
              );
              const totalRetoquesCRC = t.reduce((sum, task) => {
                return (
                  sum +
                  (task.cost_crc ??
                    Math.round((task.cost || 0) * exchangeRate))
                );
              }, 0);

              return { ...vehicle, totalRetoques, totalRetoquesCRC };
            }
          } catch (error) {
            console.error(
              `Failed to get work order for vehicle ${vehicle.id}`,
              error
            );
          }

          return { ...vehicle, totalRetoques: 0, totalRetoquesCRC: 0 };
        })
      );

      setVehicles(vehiclesWithCosts);
    } catch (error) {
      console.error("Error loading vehicles:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los vehículos en retoques",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTalleres = async () => {
    try {
      const data = await ProveedoresApi.GetSuppliers();
      console.log("Loaded talleres:", data);
      setTalleres(data);
    } catch (error) {
      console.error("Error loading talleres:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los talleres",
        variant: "destructive",
      });
    }
  };

  const loadWorkOrderForVehicle = async (vehicleId: string) => {
    try {
      const workOrders = await WorkOrdersApi.listWorkOrders(vehicleId, token);
      let workOrder = workOrders[0];

      if (!workOrder) {
        workOrder = await WorkOrdersApi.createWorkOrder(
          vehicleId,
          { dealer_id: selectedDealerId },
          token
        );
      }

      setCurrentWorkOrder(workOrder);

      const workOrderTasks = await WorkOrdersApi.listWorkOrderTasks(
        workOrder.id!,
        token
      );
      setTasks(workOrderTasks);
    } catch (error) {
      console.error("Error loading work order:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la orden de trabajo",
        variant: "destructive",
      });
    }
  };

  const vehiculoSeleccionado = vehicles.find((v) => v.id === selectedVehicleId);
  const totalCosto = tasks.reduce((sum, t) => sum + (t.cost || 0), 0);

  const totalCount = vehicles.length;
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

  // Lista paginada
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedVehicles = vehicles.slice(startIndex, startIndex + pageSize);

  const handleFotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newUrls = Array.from(files).map((file) =>
        URL.createObjectURL(file)
      );
      setFotosRetoques([...fotosRetoques, ...newUrls]);

      const vehiculo = dataStore.vehiculos.find(
        (v) => v.id === selectedVehicleId
      );
      if (vehiculo) {
        vehiculo.fotos.retoques = [...fotosRetoques, ...newUrls];
      }
    }
  };

  const handleSaveTarea = async () => {
    if (!currentWorkOrder || !formData.task_name || !formData.supplier_id) {
      toast({
        title: "Error",
        description: "La tarea y el proveedor son requeridos",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      if (editingTarea) {
        await WorkOrdersApi.updateWorkOrderTask(
          editingTarea.id!,
          {
            task_name: formData.task_name,
            supplier_id: formData.supplier_id,
            responsible: formData.responsible,
            cost: formData.cost,
            start_date: formData.start_date,
            end_date: formData.end_date || undefined,
            notes: formData.notes,
          },
          token
        );

        toast({
          title: "Éxito",
          description: "La tarea ha sido actualizada exitosamente.",
        });
      } else {
        await WorkOrdersApi.createWorkOrderTask(
          currentWorkOrder.id!,
          formData,
          token
        );

        const proveedor = talleres.find((p) => p.id === formData.supplier_id);

        addVehicleEvent({
          vehiculoId: selectedVehicleId!,
          etapa: "RETOQUES",
          fecha: formData.start_date,
          notas: `${formData.task_name} - ${
            proveedor?.name || formData.responsible
          } - $${formData.cost}`,
          responsable: proveedor?.name || formData.responsible,
        });

        toast({
          title: "Éxito",
          description: "La tarea ha sido agregada exitosamente.",
        });
      }

      setFormData({
        task_name: "",
        responsible: "",
        cost: 0,
        start_date: new Date().toISOString().split("T")[0],
        end_date: "",
        notes: "",
        supplier_id: "",
      });
      setEditingTarea(null);
      setIsDialogOpen(false);

      await loadWorkOrderForVehicle(selectedVehicleId!);
    } catch (error: any) {
      console.error("Error saving task:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la tarea",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEditTarea = (tarea: WorkOrdersApi.WorkOrderTask) => {
    setEditingTarea(tarea);
    setFormData({
      task_name: tarea.task_name,
      responsible: tarea.responsible,
      cost: tarea.cost,
      start_date: tarea.start_date,
      end_date: tarea.end_date || "",
      notes: tarea.notes || "",
      supplier_id: tarea.supplier_id,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteTarea = async (tareaId: number) => {
    try {
      await WorkOrdersApi.deleteWorkOrderTask(tareaId, token);

      toast({
        title: "Éxito",
        description: "La tarea ha sido eliminada exitosamente.",
      });

      await loadWorkOrderForVehicle(selectedVehicleId!);
    } catch (error) {
      console.error("Error deleting task:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la tarea",
        variant: "destructive",
      });
    }
  };

  const handleFinalizarRetoques = async () => {
    if (!selectedVehicleId || !currentWorkOrder) return;

    try {
      await WorkOrdersApi.completeWorkOrder(currentWorkOrder.id!, token);

      const vehiculo = dataStore.vehiculos.find(
        (v) => v.id === selectedVehicleId
      );
      if (vehiculo) {
        if (
          vehiculo.fotos.finales.length === 0 &&
          vehiculo.fotos.retoques.length > 0
        ) {
          vehiculo.fotos.finales = [...vehiculo.fotos.retoques];
        }

        addVehicleEvent({
          vehiculoId: selectedVehicleId,
          etapa: "RETOQUES",
          fecha: new Date().toISOString().split("T")[0],
          fotos: vehiculo.fotos.retoques,
          notas: `Retoques finalizados - Total: $${totalCosto}`,
          responsable: "Coordinador de Retoques",
        });

        toast({
          title: "Retoques finalizados",
          description: `El vehículo está listo para publicación.`,
          action: (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/share/${selectedVehicleId}`, "_blank")}
            >
              Ver vehículo
            </Button>
          ),
        });
      }

      await loadVehicles();
      setSelectedVehicleId(null);
      setCurrentWorkOrder(null);
      setTasks([]);
    } catch (error) {
      console.error("Error completing work order:", error);
      toast({
        title: "Error",
        description: "No se pudieron finalizar los retoques",
        variant: "destructive",
      });
    }
  };

  const openDialog = () => {
    setEditingTarea(null);
    setFormData({
      task_name: "",
      responsible: "",
      cost: 0,
      start_date: new Date().toISOString().split("T")[0],
      end_date: "",
      notes: "",
      supplier_id: "",
    });
    setIsDialogOpen(true);
  };

  const handlePublishVehicle = async () => {
    if (!publishModalVehicleId) return;
    setPublishing(true);

    try {
      const vehiculo = vehicles.find((v) => v.id === publishModalVehicleId);
      if (!vehiculo) throw new Error("No se encontró el vehículo para publicar");

      const totalRetoquesUSD = vehiculo.totalRetoques || 0;

      // El precio del listing es el costo total (price1 + retoques)
      const precioListingUSD = (vehiculo.price1 || 0) + totalRetoquesUSD;

      // NO sobrescribir price2, ya fue ingresado al crear el vehículo
      // Usar upsert para actualizar si ya existe un listing, o crear uno nuevo si no
      const { isUpdate } = await InspeccionApi.upsertVehicleListing({
        vehicle_id: vehiculo.id,
        dealer_id: selectedDealerId,
        title: `${vehiculo.make?.name || ""} ${vehiculo.model?.name || ""} ${vehiculo.year}`,
        price: Math.max(0, Math.round(precioListingUSD)),
        status: "draft",
        visibility: "public",
      });

      const workOrders = await WorkOrdersApi.listWorkOrders(
        publishModalVehicleId,
        token
      );
      const workOrderId = workOrders[0]?.id;
      if (workOrderId) {
        await WorkOrdersApi.completeWorkOrder(workOrderId, token);
      }

      // Finalmente, cambiar el status_id a "Listo" (4)
      await InspeccionApi.updateVehicleStatus(publishModalVehicleId, 4);

      toast({
        title: "Éxito",
        description: isUpdate 
          ? "Listing actualizado correctamente con los nuevos retoques."
          : "Vehículo enviado a Publicación correctamente.",
      });

      // Notificar al sidebar para actualizar contadores
      window.dispatchEvent(new CustomEvent("vehicleDataChanged"));
      
      setPublishModalVehicleId(null);
      
      // Redirigir a la página de Publicación
      navigate("/publicacion");
    } catch (error: any) {
      console.error("Error al publicar el vehículo:", error);
      toast({
        title: "Error al Publicar",
        description:
          error.message ||
          "No se pudo crear el anuncio para el vehículo. Revisa la consola para más detalles.",
        variant: "destructive",
      });
    } finally {
      setPublishing(false);
    }
  };

  // Totales
  const totalCostoRetoquesUSD = useMemo(() => {
    return tasks.reduce((sum, t) => sum + (t.cost || 0), 0);
  }, [tasks]);

  const totalCostoRetoquesCRC = useMemo(() => {
    return tasks.reduce((sum, t) => {
      if (
        editingCRC &&
        editingCRC.id === t.id &&
        editingCRC.value !== null &&
        editingCRC.value !== undefined
      ) {
        const tempCRC = parseFloat(editingCRC.value);
        if (!isNaN(tempCRC)) return sum + tempCRC;
      }
      return (
        sum +
        (typeof t.cost_crc === "number"
          ? t.cost_crc
          : Math.round((t.cost || 0) * exchangeRate))
      );
    }, 0);
  }, [tasks, editingCRC, exchangeRate]);

  const precioCompraUSD = vehiculoSeleccionado?.price1 || 0;
  const precioCompraCRC = Math.round(precioCompraUSD * exchangeRate);
  const totalVehiculoUSD = precioCompraUSD + totalCostoRetoquesUSD;
  const totalVehiculoCRC = precioCompraCRC + totalCostoRetoquesCRC;
  
  // Precio sugerido (price2) + retoques
  const precioSugeridoUSD = vehiculoSeleccionado?.price2 || 0;
  const precioSugeridoCRC = vehiculoSeleccionado?.price2_crc || Math.round(precioSugeridoUSD * exchangeRate);
  const precioSugeridoAgregadoUSD = precioSugeridoUSD + totalCostoRetoquesUSD;
  const precioSugeridoAgregadoCRC = precioSugeridoCRC + totalCostoRetoquesCRC;

  return (
    <div className="space-y-6">
      <PageBreadcrumb section="Operación" page="Retoques" />

      <div>
        <h1 className="text-3xl font-bold text-foreground">Retoques:</h1>
        <p className="text-muted-foreground mt-2">
          Gestión de reparaciones y mejoras de vehículos.
        </p>
      </div>

      {/* Bloque visual de totales */}
      {vehiculoSeleccionado && (
        <>
          {/* Fila 1: Costo original y Precio sugerido (estáticos) */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Costo original del vehículo (precio de compra) - ESTÁTICO */}
            <div className="p-5 rounded-xl bg-white shadow flex flex-col items-start justify-center">
              <div className="text-sm font-semibold mb-2 text-muted-foreground">
                Costo original del vehículo
              </div>
              <div className="text-2xl font-bold text-foreground">
                ${precioCompraUSD.toLocaleString()}{" "}
                <span className="text-lg text-muted-foreground">USD</span>
              </div>
              <div className="text-xl font-bold text-slate-600 mt-1">
                ₡{formatColones(precioCompraCRC)}{" "}
                <span className="text-sm text-muted-foreground">CRC</span>
              </div>
            </div>

            {/* Precio sugerido - ESTÁTICO */}
            <div className="p-5 rounded-xl bg-white shadow flex flex-col items-start justify-center">
              <div className="text-sm font-semibold mb-2 text-muted-foreground">
                Precio sugerido
              </div>
              <div className="text-2xl font-bold text-foreground">
                ${precioSugeridoUSD.toLocaleString()}{" "}
                <span className="text-lg text-muted-foreground">USD</span>
              </div>
              <div className="text-xl font-bold text-purple-700 mt-1">
                ₡{formatColones(precioSugeridoCRC)}{" "}
                <span className="text-sm text-muted-foreground">CRC</span>
              </div>
            </div>
          </div>

          {/* Fila 2: Costo total de retoques (dinámico) */}
          <div className="mb-4">
            <div className="p-5 rounded-xl bg-white shadow flex flex-col items-start justify-center">
              <div className="text-sm font-semibold mb-2 text-muted-foreground">
                Costo total de retoques
              </div>
              <div className="text-2xl font-bold text-foreground">
                ${totalCostoRetoquesUSD.toLocaleString()}{" "}
                <span className="text-lg text-muted-foreground">USD</span>
              </div>
              <div className="text-xl font-bold text-orange-600 mt-1">
                ₡{formatColones(totalCostoRetoquesCRC)}{" "}
                <span className="text-sm text-muted-foreground">CRC</span>
              </div>
            </div>
          </div>

          {/* Fila 3: Totales agregados (dinámicos) */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Costo total del vehículo (original + retoques) */}
            <div className="p-5 rounded-xl bg-blue-50 border border-blue-200 shadow flex flex-col items-start justify-center">
              <div className="text-sm font-semibold mb-2 text-blue-700">
                Costo total del vehículo agregado
              </div>
              <div className="text-2xl font-bold text-blue-800">
                ${totalVehiculoUSD.toLocaleString()}{" "}
                <span className="text-lg text-blue-600">USD</span>
              </div>
              <div className="text-xl font-bold text-blue-700 mt-1">
                ₡{formatColones(totalVehiculoCRC)}{" "}
                <span className="text-sm text-blue-500">CRC</span>
              </div>
              <p className="text-xs text-blue-500 mt-2">
                = Costo original + Retoques
              </p>
            </div>

            {/* Precio sugerido agregado (precio sugerido + retoques) */}
            <div className="p-5 rounded-xl bg-purple-50 border border-purple-200 shadow flex flex-col items-start justify-center">
              <div className="text-sm font-semibold mb-2 text-purple-700">
                Precio sugerido agregado
              </div>
              <div className="text-2xl font-bold text-purple-800">
                ${precioSugeridoAgregadoUSD.toLocaleString()}{" "}
                <span className="text-lg text-purple-600">USD</span>
              </div>
              <div className="text-xl font-bold text-purple-700 mt-1">
                ₡{formatColones(precioSugeridoAgregadoCRC)}{" "}
                <span className="text-sm text-purple-500">CRC</span>
              </div>
              <p className="text-xs text-purple-500 mt-2">
                = Precio sugerido + Retoques
              </p>
            </div>
          </div>
        </>
      )}

      {selectedVehicleId && vehiculoSeleccionado && (
        <>
          <VehicleStepper
            currentStatus={getStepperStatus(vehiculoSeleccionado.status_id)}
            className="mb-6"
          />

          <div className="mb-4">
            <Label htmlFor="dealer-select">Dealer</Label>
            <Select value={selectedDealerId} onValueChange={setSelectedDealerId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Selecciona un dealer" />
              </SelectTrigger>
              <SelectContent>
                {dealers.map((dealer) => (
                  <SelectItem key={dealer.id} value={dealer.id}>
                    {dealer.name} {dealer.external ? "(Externo)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {!selectedVehicleId ? (
        <Card>
          <CardHeader>
            <CardTitle>Vehículos en Retoques</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* ✅ CONTROLES SIEMPRE VISIBLES */}
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
                    Mostrando {totalCount === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, totalCount)} de{" "}
                    {totalCount}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      Filtrar por estado:
                    </span>

                    <Select
                      value={vehicleStatusFilter}
                      onValueChange={(v) => {
                        // ✅ bloqueo extra por si alguien intenta meter "6"
                        if (v === "6") return;
                        setVehicleStatusFilter(v);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        {VEHICLE_STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* ✅ BOTÓN PARA QUITAR FILTRO */}
                    {vehicleStatusFilter !== "all" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setVehicleStatusFilter("all");
                          setCurrentPage(1);
                        }}
                      >
                        Quitar filtro
                      </Button>
                    )}
                  </div>
                </div>

                {/* ✅ LISTA: si no hay resultados, igual queda el filtro visible */}
                {totalCount === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No hay vehículos para este filtro.
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {paginatedVehicles.map((vehiculo) => (
                        <div
                          key={vehiculo.id}
                          className={
                            "flex items-center justify-between p-4 border rounded-lg transition-colors " +
                            (canActRetoques ? "cursor-pointer hover:bg-muted" : "cursor-default opacity-95")
                          }
                        >
                          <div
                            className="flex-1"
                            onClick={() => {
                              if (!canActRetoques) return; // ✅ vista => no hace nada
                              setSelectedVehicleId(vehiculo.id);
                              setFotosRetoques([]);
                            }}
                          >
                            <h3 className="font-semibold">
                              {vehiculo.make?.name || "N/A"}{" "}
                              {vehiculo.model?.name || "N/A"} {vehiculo.year}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {vehiculo.license_plate &&
                                `Placa: ${vehiculo.license_plate}`}
                              {vehiculo.vin && ` | VIN: ${vehiculo.vin}`}
                            </p>

                            {vehiculo.totalRetoques !== undefined && (
                              <div className="mt-1">
                                <p className="text-sm font-semibold text-blue-600">
                                  Costo Total: $
                                  {(
                                    (vehiculo.price1 || 0) +
                                    (vehiculo.totalRetoques || 0)
                                  ).toLocaleString()}
                                </p>
                                <p className="text-sm font-semibold text-green-700">
                                  CRC: ₡
                                  {formatColones(
                                    (vehiculo.price1 || 0) * exchangeRate +
                                      (vehiculo.totalRetoquesCRC || 0)
                                  )}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={getStatusBadgeClasses(
                                vehiculo.status_id
                              )}
                            >
                              {getStatusLabel(vehiculo.status_id)}
                            </Badge>

                            <Badge
                              variant="outline"
                              className="bg-orange-100 text-orange-800"
                            >
                              Retoques
                            </Badge>

                          {canActRetoques && (
                            <Button
                              variant={vehiclesWithListings.has(vehiculo.id) ? "secondary" : "outline"}
                              className={`ml-2 ${vehiclesWithListings.has(vehiculo.id) ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setPublishModalVehicleId(vehiculo.id);
                              }}
                            >
                              {vehiclesWithListings.has(vehiculo.id) ? "Actualizar Listing" : "Publicar"}
                            </Button>
                          )}
                          </div>
                        </div>
                      ))}

                      {publishModalVehicleId && (
                        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                          <div className="bg-white p-8 rounded-2xl shadow-xl min-w-[340px] flex flex-col items-center">
                            <div className="flex flex-col items-center mb-4">
                              <div className={`${vehiclesWithListings.has(publishModalVehicleId) ? "bg-blue-100" : "bg-yellow-100"} rounded-full p-3 mb-2`}>
                                <svg
                                  width="32"
                                  height="32"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    fill={vehiclesWithListings.has(publishModalVehicleId) ? "#3b82f6" : "#eab308"}
                                    d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 15a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm1-4.5a1 1 0 0 1-2 0V8a1 1 0 0 1 2 0v4.5z"
                                  />
                                </svg>
                              </div>
                              <h2 className="text-xl font-bold text-center mb-1">
                                {vehiclesWithListings.has(publishModalVehicleId) ? "¿Desea actualizar el listing existente?" : "¿Está seguro que desea publicar este vehículo?"}
                              </h2>
                              <p className="text-sm text-muted-foreground text-center">
                                {vehiclesWithListings.has(publishModalVehicleId) ? "Se actualizará el precio con los nuevos retoques incluidos." : 'Esta acción moverá el vehículo a "Listo".'}
                              </p>
                            </div>

                            <div className="flex justify-center gap-4 mt-2 w-full">
                              <Button
                                variant="default"
                                className="px-6 py-2 font-bold text-lg"
                                onClick={handlePublishVehicle}
                                disabled={publishing}
                              >
                                {publishing ? "Procesando..." : "Sí, continuar"}
                              </Button>
                              <Button
                                variant="outline"
                                className="px-6 py-2 font-bold text-lg"
                                onClick={() => setPublishModalVehicleId(null)}
                                disabled={publishing}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Paginación */}
                    {totalCount > 0 && (
                      <div className="flex justify-end mt-4">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                          <div className="flex items-center gap-1 rounded-full border bg-card px-2 py-1 shadow-sm">
                            {canGoPrev && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full h-7 w-7"
                                onClick={() =>
                                  handlePageChange(currentPage - 1)
                                }
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
                                  onClick={() =>
                                    handlePageChange(item as number)
                                  }
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
                                onClick={() =>
                                  handlePageChange(currentPage + 1)
                                }
                              >
                                {">"}
                              </Button>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-xs md:text-sm">
                            <span className="text-muted-foreground">
                              Ir a la página
                            </span>
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
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>
                Retoques: {vehiculoSeleccionado?.make?.name || "N/A"}{" "}
                {vehiculoSeleccionado?.model?.name || "N/A"}{" "}
                {vehiculoSeleccionado?.year}
              </CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedVehicleId(null)}
                >
                  Volver
                </Button>
                <Button
                  variant="default"
                  onClick={handleShowInspection}
                  disabled={inspectionLoading}
                >
                  {inspectionLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Ver Inspección
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={openDialog}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Tarea
                    </Button>
                  </DialogTrigger>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingTarea ? "Editar" : "Agregar"} Reparación
                      </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 pt-4">
                      <div>
                        <Label htmlFor="task_name">Nombre de la Tarea *</Label>
                        <Input
                          id="task_name"
                          value={formData.task_name}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              task_name: e.target.value,
                            })
                          }
                          placeholder="Ej: Pintura completa"
                        />
                      </div>

                      <div>
                        <Label htmlFor="supplier_id">Proveedor/Taller *</Label>
                        <Select
                          value={formData.supplier_id}
                          onValueChange={(value) =>
                            setFormData({ ...formData, supplier_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un taller" />
                          </SelectTrigger>
                          <SelectContent>
                            {talleres.map((taller) => (
                              <SelectItem key={taller.id} value={taller.id}>
                                {taller.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="responsible">Responsable</Label>
                        <Input
                          id="responsible"
                          value={formData.responsible}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              responsible: e.target.value,
                            })
                          }
                          placeholder="Nombre del responsable"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="cost">Costo</Label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              id="cost"
                              type="number"
                              min={0}
                              className="pl-7"
                              value={formData.cost === 0 ? "" : formData.cost}
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value;
                                setFormData({
                                  ...formData,
                                  cost:
                                    val === ""
                                      ? 0
                                      : Math.max(0, parseFloat(val)),
                                });
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="start_date">Fecha Inicio</Label>
                          <Input
                            id="start_date"
                            type="date"
                            value={formData.start_date}
                            onChange={(e) => {
                              const newStart = e.target.value;
                              let newEnd = formData.end_date;

                              if (formData.end_date && newStart > formData.end_date) {
                                newEnd = "";
                              }

                              setFormData({
                                ...formData,
                                start_date: newStart,
                                end_date: newEnd,
                              });
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="end_date">Fecha Fin (Opcional)</Label>
                        <Input
                          id="end_date"
                          type="date"
                          disabled={!formData.start_date}
                          min={formData.start_date}
                          value={formData.end_date}
                          onChange={(e) =>
                            setFormData({ ...formData, end_date: e.target.value })
                          }
                          title={
                            !formData.start_date
                              ? "Seleccione primero la fecha de inicio"
                              : ""
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="notes">Notas</Label>
                        <Textarea
                          id="notes"
                          value={formData.notes}
                          onChange={(e) =>
                            setFormData({ ...formData, notes: e.target.value })
                          }
                          placeholder="Detalles adicionales"
                        />
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={handleSaveTarea} disabled={saving}>
                        {saving && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {editingTarea ? "Actualizar" : "Guardar"} Tarea
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Tasks Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tarea</TableHead>
                      <TableHead>Proveedor</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Costo</TableHead>
                      <TableHead>Fecha Inicio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {tasks.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground"
                        >
                          No hay tareas registradas
                        </TableCell>
                      </TableRow>
                    ) : (
                      tasks.map((tarea) => (
                        <TableRow key={tarea.id}>
                          <TableCell className="font-medium">
                            {tarea.task_name}
                          </TableCell>

                          <TableCell>
                            {talleres.find((t) => t.id === tarea.supplier_id)
                              ?.name || "N/A"}
                          </TableCell>

                          <TableCell>{tarea.responsible || "-"}</TableCell>

                          <TableCell>
                            <div className="flex flex-col">
                              <div className="font-medium">
                                ${tarea.cost.toLocaleString()}
                                <span className="ml-2 text-xs text-muted-foreground">
                                  {editingCRC?.id === tarea.id ? (
                                    <>
                                      <input
                                        type="text"
                                        className="w-20 h-6 text-xs border rounded px-1 ml-1"
                                        value={editingCRC.value}
                                        autoFocus
                                        disabled={!!editingCRC?.saving}
                                        onChange={(e) => {
                                          setEditingCRC({
                                            ...editingCRC,
                                            value: e.target.value.replace(/\D/g, ""),
                                          });
                                          setCrcEditTick((tick) => tick + 1);
                                        }}
                                        onBlur={async () => {
                                          if (editingCRC && editingCRC.saving) return;

                                          const nuevoCRC = Number(editingCRC.value) || 0;
                                          const anteriorCRC =
                                            tarea.cost_crc ||
                                            Math.round((tarea.cost || 0) * exchangeRate);

                                          if (nuevoCRC !== anteriorCRC) {
                                            setEditingCRC({ ...editingCRC, saving: true });
                                            setTasks((prev) =>
                                              prev.map((t) =>
                                                t.id === tarea.id
                                                  ? { ...t, cost_crc: nuevoCRC }
                                                  : t
                                              )
                                            );

                                            try {
                                              await WorkOrdersApi.updateWorkOrderTask(
                                                tarea.id!,
                                                { cost_crc: nuevoCRC },
                                                token
                                              );
                                              await loadWorkOrderForVehicle(selectedVehicleId!);
                                              toast({
                                                title: "Precio actualizado",
                                                description: `El costo en colones fue actualizado a ₡${formatColones(
                                                  nuevoCRC
                                                )}`,
                                              });
                                            } catch (err) {
                                              toast({
                                                title: "Error",
                                                description:
                                                  "No se pudo actualizar el costo en colones",
                                                variant: "destructive",
                                              });
                                            }
                                            setEditingCRC(null);
                                          } else {
                                            setEditingCRC(null);
                                          }
                                        }}
                                        onKeyDown={async (e) => {
                                          if (editingCRC && editingCRC.saving) return;

                                          if (e.key === "Enter" || e.key === "Escape") {
                                            const nuevoCRC = Number(editingCRC.value) || 0;
                                            const anteriorCRC =
                                              tarea.cost_crc ||
                                              Math.round((tarea.cost || 0) * exchangeRate);

                                            if (nuevoCRC !== anteriorCRC && e.key === "Enter") {
                                              setEditingCRC({ ...editingCRC, saving: true });
                                              setTasks((prev) =>
                                                prev.map((t) =>
                                                  t.id === tarea.id
                                                    ? { ...t, cost_crc: nuevoCRC }
                                                    : t
                                                )
                                              );

                                              try {
                                                await WorkOrdersApi.updateWorkOrderTask(
                                                  tarea.id!,
                                                  { cost_crc: nuevoCRC },
                                                  token
                                                );
                                                await loadWorkOrderForVehicle(selectedVehicleId!);
                                                toast({
                                                  title: "Precio actualizado",
                                                  description: `El costo en colones fue actualizado a ₡${formatColones(
                                                    nuevoCRC
                                                  )}`,
                                                });
                                              } catch (err) {
                                                toast({
                                                  title: "Error",
                                                  description:
                                                    "No se pudo actualizar el costo en colones",
                                                  variant: "destructive",
                                                });
                                              }
                                              setEditingCRC(null);
                                            } else {
                                              setEditingCRC(null);
                                            }
                                          }
                                        }}
                                      />
                                      <span className="ml-2 font-bold text-blue-700">
                                        ₡{formatColones(Number(editingCRC.value) || 0)}
                                      </span>
                                    </>
                                  ) : (
                                    <span
                                      className="cursor-pointer hover:text-foreground border-b border-transparent hover:border-gray-300 ml-1"
                                      onClick={() =>
                                        setEditingCRC({
                                          id: tarea.id!,
                                          value: (
                                            tarea.cost_crc ??
                                            Math.round((tarea.cost || 0) * exchangeRate)
                                          ).toString(),
                                        })
                                      }
                                    >
                                      ₡
                                      {formatColones(
                                        tarea.cost_crc ??
                                          Math.round((tarea.cost || 0) * exchangeRate)
                                      )}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell>
                            {new Date(tarea.start_date).toLocaleDateString()}
                          </TableCell>

                          <TableCell>
                            <Badge
                              variant={
                                tarea.status === "completed" ? "default" : "secondary"
                              }
                            >
                              {tarea.status === "completed"
                                ? "Completada"
                                : tarea.status === "in_progress"
                                ? "En progreso"
                                : "Pendiente"}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTarea(tarea)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteTarea(tarea.id!)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Photos Upload */}
              <div>
                <Label htmlFor="fotos-retoques">Fotos de Retoques</Label>
                <Input
                  id="fotos-retoques"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFotosChange}
                  className="mt-2"
                />
                {fotosRetoques.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {fotosRetoques.map((foto, idx) => (
                      <img
                        key={idx}
                        src={foto}
                        alt={`Retoque ${idx + 1}`}
                        className="w-full h-32 object-cover rounded border"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Finalize Button */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  onClick={handleFinalizarRetoques}
                  size="lg"
                  disabled={tasks.length === 0}
                >
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Finalizar Retoques
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Modal de inspección */}
          <Dialog open={showInspectionModal} onOpenChange={setShowInspectionModal}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Checklist de Inspección</DialogTitle>
              </DialogHeader>

              {inspectionLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Cargando inspección...
                </div>
              ) : inspectionError ? (
                <div className="text-red-600 py-4 text-center">
                  <strong>Error:</strong> {inspectionError}
                  {inspectionDiag?.rawCheck &&
                    Array.isArray(inspectionDiag.rawCheck) &&
                    inspectionDiag.rawCheck.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        (Datos crudos en DB: {JSON.stringify(inspectionDiag.rawCheck[0])})
                      </div>
                    )}
                </div>
              ) : (
                <>
                  {/* Checklist detallado o mensaje */}
                  {inspectionChecklist.length === 0 || !inspectionChecklist.some(item => item.aprobado !== undefined) ? (
                    <div className="py-4 text-center text-muted-foreground border rounded-lg bg-muted/30">
                      <p>No hay detalle de ítems del checklist para esta inspección.</p>
                      {inspectionData && (inspectionData.aprobados || inspectionData.rechazados) && (
                        <p className="mt-2 text-sm">
                          La inspección fue completada con {inspectionData.aprobados ?? 0} ítems aprobados 
                          y {inspectionData.rechazados ?? 0} rechazados.
                        </p>
                      )}
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ítem</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Comentario</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {inspectionChecklist.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.item || item.nombre}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline"
                                className={
                                  item.aprobado === true
                                    ? "bg-green-100 text-green-800"
                                    : item.aprobado === false
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }
                              >
                                {item.aprobado !== undefined
                                  ? item.aprobado
                                    ? "Aprobado"
                                    : "Rechazado"
                                  : item.estado
                                  ? item.estado
                                  : "-"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {item.comentario !== undefined
                                ? item.comentario && item.comentario.trim() !== ""
                                  ? item.comentario
                                  : "-"
                                : item.descripcion || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  {/* Nota general */}
                  <div className="mt-4">
                    <strong>Nota general:</strong>
                    <div className="border rounded p-2 bg-muted-foreground/10 text-muted-foreground min-h-[40px]">
                      {inspectionGeneralNote || (
                        <span className="italic">Sin nota general</span>
                      )}
                    </div>
                  </div>
                </>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInspectionModal(false)}>
                  Cerrar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}




