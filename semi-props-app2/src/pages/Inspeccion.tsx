import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Wrench, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { VehicleStepper } from "@/components/VehicleStepper";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import * as InspeccionApi from "@/lib/InspeccionApi";
import * as ProveedoresApi from "@/lib/ProveedoresApi";

/**
 * ✅ ESTA es la ruta que SÍ debe existir (la del menú “Publicación”)
 * Si tu app usa plural, cambiá a "/publicaciones"
 */
const PUBLICACION_PATH = "/publicacion";
const RETOQUES_PATH = "/retoques";

type RolePermsRaw = Record<string, string>;
const norm = (v: any) =>
  (v ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export default function Inspeccion() {
  const navigate = useNavigate();

  const goToPublicacion = () => navigate(PUBLICACION_PATH, { replace: true });
  const goToRetoques = () => navigate(RETOQUES_PATH, { replace: true });

  const ITEMS_PER_PAGE = 10;

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [goToPageInput, setGoToPageInput] = useState("");

  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // ✅ permisos (igual que Ingreso)
  const [rolePerms, setRolePerms] = useState<RolePermsRaw>({});
  const [permLoaded, setPermLoaded] = useState(false);

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

  // ✅ permiso real según tu storage: work.inspeccion
  const canManageInspeccion =
    permLoaded && hasPerm("work.inspeccion", "accion");

  const [vehicles, setVehicles] = useState<InspeccionApi.Vehicle[]>([]);
  const [checklistTemplate, setChecklistTemplate] = useState<
    InspeccionApi.InspectionChecklistItem[]
  >([]);

  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null,
  );
  const [currentInspectionId, setCurrentInspectionId] = useState<string | null>(
    null,
  );

  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [notasGenerales, setNotasGenerales] = useState("");

  // Solo dealers internos: vehicle_listings.dealer_id tiene FK a dealers.
  const [dealers, setDealers] = useState<ProveedoresApi.Dealer[]>([]);
  const [selectedDealerId, setSelectedDealerId] = useState<string>("");

  useEffect(() => {
    loadVehicles();
    loadChecklistTemplate();
    loadDealers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadVehicles = async () => {
    try {
      const data = await InspeccionApi.listPendingVehicles();
      setVehicles(data);
    } catch (error) {
      console.error("Error loading vehicles:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los vehículos pendientes",
        variant: "destructive",
      });
    }
  };

  const loadDealers = async () => {
    try {
      const internal = await ProveedoresApi.GetDealers();
      setDealers(internal);
      setSelectedDealerId((current) => {
        if (internal.some((dealer) => dealer.id === current)) return current;
        return internal[0]?.id ?? "";
      });
    } catch (error) {
      console.error("Error loading dealers:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los dealers",
        variant: "destructive",
      });
    }
  };

  const loadChecklistTemplate = async () => {
    try {
      const items = await InspeccionApi.loadChecklistItems();
      setChecklistTemplate(items);

      const initialChecklist: Record<string, boolean> = {};
      const initialComentarios: Record<string, string> = {};
      items.forEach((item) => {
        initialChecklist[item.nombre] = false;
        initialComentarios[item.nombre] = "";
      });
      setChecklist(initialChecklist);
      setComentarios(initialComentarios);
    } catch (error) {
      console.error("Error loading checklist template:", error);

      const defaultItems = [
        "Carrocería exterior",
        "Interior y tapicería",
        "Motor y mecánica",
        "Frenos y suspensión",
        "Llantas y alineación",
        "Sistemas eléctricos",
      ];
      const initialChecklist: Record<string, boolean> = {};
      const initialComentarios: Record<string, string> = {};
      defaultItems.forEach((item) => {
        initialChecklist[item] = false;
        initialComentarios[item] = "";
      });
      setChecklist(initialChecklist);
      setComentarios(initialComentarios);
    }
  };

  const handleSelectVehicle = async (vehicleId: string) => {
    // ✅ MODO SOLO VISTA: no hace nada
    if (!canManageInspeccion) {
      toast({
        title: "Solo lectura",
        description: "No tienes permiso para iniciar inspecciones.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Status a "Inspección" (2)
      await InspeccionApi.updateVehicleStatus(vehicleId, 2);

      setSelectedVehicleId(vehicleId);
      setCurrentInspectionId(null);

      // Reset form
      const resetChecklist: Record<string, boolean> = {};
      const resetComentarios: Record<string, string> = {};
      Object.keys(checklist).forEach((key) => {
        resetChecklist[key] = false;
        resetComentarios[key] = "";
      });
      setChecklist(resetChecklist);
      setComentarios(resetComentarios);
      setNotasGenerales("");

      toast({
        title: "Inspección iniciada",
        description: "El vehículo ha sido marcado como 'En Inspección'",
      });
    } catch (error) {
      console.error("Error starting inspection:", error);
      toast({
        title: "Error",
        description: "No se pudo iniciar la inspección",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistToggle = (item: string) => {
    if (!canManageInspeccion) return; // ✅ solo vista: no permite cambiar
    setChecklist((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const handleComentarioChange = (item: string, value: string) => {
    if (!canManageInspeccion) return; // ✅ solo vista: no permite cambiar
    setComentarios((prev) => ({
      ...prev,
      [item]: value,
    }));
  };

  const validateListingDealer = () => {
    if (!selectedDealerId) {
      throw new Error(
        "Debe seleccionar un dealer antes de crear la publicación.",
      );
    }

    if (!dealers.some((dealer) => dealer.id === selectedDealerId)) {
      throw new Error(
        "El dealer seleccionado no pertenece al catálogo interno de dealers.",
      );
    }
  };

  const createListingAndSetReady = async (vehicleId: string) => {
    validateListingDealer();

    const veh = vehicles.find((v) => v.id === vehicleId);
    if (!veh) throw new Error("No se encontró el vehículo para publicar");

    const basePrice =
      (veh as any)?.price2 ?? (veh as any)?.price1 ?? (veh as any)?.price ?? 0;

    await InspeccionApi.createVehicleListing({
      vehicle_id: vehicleId,
      dealer_id: selectedDealerId,
      title: `${veh.make?.name || ""} ${veh.model?.name || ""} ${veh.year}`,
      price: Math.max(0, Math.round(basePrice)),
      status: "draft",
      visibility: "public",
    });

    // Status 4 (Listo)
    await InspeccionApi.updateVehicleStatus(vehicleId, 4);
  };

  const handleFinalizarInspeccion = async () => {
    if (!canManageInspeccion) return; // ✅ solo vista: no hace nada
    if (!selectedVehicleId) return;

    setLoading(true);
    try {
      const passed = Object.values(checklist).filter(Boolean).length;

      // Validar el dealer antes de finalizar la inspección. Así un dealer inválido
      // no deja una inspección cerrada sin poder crear su publicación.
      if (passed >= 4) {
        validateListingDealer();
      }
      let inspectionId = currentInspectionId;

      if (!inspectionId) {
        const inspectorId = "admin"; // ajusta si tienes user real
        const inspection = await InspeccionApi.createInspection(
          selectedVehicleId,
          inspectorId,
        );
        inspectionId = inspection.id;
        setCurrentInspectionId(inspection.id);
      }

      const items = Object.keys(checklist).map((key) => ({
        nombre_item: key,
        estado: checklist[key]
          ? ("aprobado" as "aprobado")
          : ("rechazado" as "rechazado"),
        comentarios: comentarios[key] || "",
      }));

      await InspeccionApi.completeInspectionFlow(
        selectedVehicleId,
        inspectionId!,
        items,
        notasGenerales,
      );

      if (passed >= 4) {
        await createListingAndSetReady(selectedVehicleId);

        toast({
          title: "Éxito",
          description: "Publicación creada. Abriendo sección Publicación...",
        });

        goToPublicacion();
        return;
      }

      await InspeccionApi.updateVehicleStatus(selectedVehicleId, 3);

      toast({
        title: "Inspección finalizada",
        description: `Se guardaron ${items.length} ítems del checklist. Redirigiendo a Retoques...`,
      });

      // Esperar un momento para que el usuario vea el toast y luego redirigir a Retoques
      setTimeout(() => {
        goToRetoques();
      }, 1500);

      await loadVehicles();
      setSelectedVehicleId(null);
      setCurrentInspectionId(null);
      setNotasGenerales("");

      const resetChecklist: Record<string, boolean> = {};
      const resetComentarios: Record<string, string> = {};
      Object.keys(checklist).forEach((key) => {
        resetChecklist[key] = false;
        resetComentarios[key] = "";
      });
      setChecklist(resetChecklist);
      setComentarios(resetComentarios);
    } catch (error: any) {
      console.error("Error finalizing inspection:", error);
      toast({
        title: "Error",
        description: error?.message || "No se pudo finalizar la inspección",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checksPassed = Object.values(checklist).filter(Boolean).length;
  const checksTotal = Object.keys(checklist).length;

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
    if (showLeftDots) items.push("...");
    else items.push(2, 3);

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) {
      if (!items.includes(i)) items.push(i);
    }

    if (showRightDots) items.push("...");
    else {
      for (let i = totalPages - 2; i <= totalPages - 1; i++) {
        if (i > 1 && i < totalPages && !items.includes(i)) items.push(i);
      }
    }

    if (!items.includes(totalPages)) items.push(totalPages);
    return items;
  };

  const startIndex = (currentPage - 1) * pageSize;
  const paginatedVehicles = vehicles.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [vehicles, pageSize]);

  return (
    <div className="space-y-6 p-6">
      <PageBreadcrumb
        section="Inicio"
        sectionUrl="/"
        page="Inspección Técnica"
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inspección Técnica</h1>
          <p className="text-muted-foreground">
            Revisión de vehículos recién ingresados
          </p>

          {/* ✅ indicador de modo */}
          {permLoaded && !canManageInspeccion && (
            <p className="mt-1 text-sm text-muted-foreground">
              Modo: <span className="font-medium">Solo lectura</span>
            </p>
          )}
        </div>
      </div>

      {!selectedVehicleId ? (
        <Card>
          <CardHeader>
            <CardTitle>Vehículos Pendientes de Inspección</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : totalCount === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay vehículos pendientes de inspección
              </p>
            ) : (
              <>
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

                <div className="space-y-2">
                  {paginatedVehicles.map((vehicle) => {
                    const clickable = canManageInspeccion; // ✅ clave

                    return (
                      <div
                        key={vehicle.id}
                        onClick={
                          clickable
                            ? () => handleSelectVehicle(vehicle.id)
                            : undefined
                        }
                        className={[
                          "flex items-center justify-between p-4 border rounded-lg transition-colors",
                          clickable
                            ? "cursor-pointer hover:bg-muted"
                            : "cursor-default opacity-70",
                        ].join(" ")}
                        title={
                          clickable
                            ? "Abrir inspección"
                            : "Solo lectura: no puedes iniciar inspecciones"
                        }
                      >
                        <div>
                          <p className="font-medium">
                            {vehicle.make?.name || "N/A"}{" "}
                            {vehicle.model?.name || "N/A"} {vehicle.year}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {vehicle.license_plate &&
                              `Placa: ${vehicle.license_plate}`}
                            {vehicle.vin && ` | VIN: ${vehicle.vin}`}
                            <span className="ml-2 text-xs">
                              (ID Status: {vehicle.status_id})
                            </span>
                          </p>
                        </div>

                        <Badge
                          variant={
                            vehicle.status_id === 1 ? "secondary" : "outline"
                          }
                          className={
                            vehicle.status_id === 1
                              ? "bg-blue-100 text-blue-800"
                              : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {vehicle.status_id === 1
                            ? "Ingreso"
                            : "En Inspección"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>

                {totalCount > 0 && (
                  <div className="flex justify-end mt-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
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
                          ),
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
          </CardContent>
        </Card>
      ) : (
        <>
          <VehicleStepper currentStatus="Inspección" />

          {/* Dealer */}
          <Card>
            <CardHeader>
              <CardTitle>Dealer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-sm">
                <Label htmlFor="dealer-select">Selecciona un dealer</Label>
                <Select
                  value={selectedDealerId}
                  onValueChange={setSelectedDealerId}
                  disabled={!canManageInspeccion} // ✅ solo vista
                >
                  <SelectTrigger id="dealer-select" className="mt-2">
                    <SelectValue placeholder="Selecciona un dealer" />
                  </SelectTrigger>
                  <SelectContent>
                    {dealers.map((dealer) => (
                      <SelectItem key={dealer.id} value={dealer.id}>
                        {dealer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Checklist de Inspección</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {checksPassed}/{checksTotal} aprobados
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.keys(checklist).map((item) => (
                <div key={item} className="space-y-2 pb-4 border-b last:border-b-0">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={item} className="text-base font-medium capitalize">
                      {item}
                    </Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {checklist[item] ? "Aprobado" : "Rechazado"}
                      </span>
                      <Switch
                        id={item}
                        checked={checklist[item]}
                        onCheckedChange={() => handleChecklistToggle(item)}
                        disabled={!canManageInspeccion} // ✅ solo vista
                      />
                    </div>
                  </div>
                  <Textarea
                    placeholder="Comentarios adicionales (opcional)"
                    value={comentarios[item]}
                    onChange={(e) => handleComentarioChange(item, e.target.value)}
                    className="min-h-[60px]"
                    disabled={!canManageInspeccion} // ✅ solo vista
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notas Generales</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Observaciones generales de la inspección..."
                value={notasGenerales}
                onChange={(e) => {
                  if (!canManageInspeccion) return;
                  setNotasGenerales(e.target.value);
                }}
                className="min-h-[120px]"
                disabled={!canManageInspeccion} // ✅ solo vista
              />
            </CardContent>
          </Card>

          <div className="flex gap-4 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedVehicleId(null);
                setCurrentInspectionId(null);
              }}
              disabled={loading}
            >
              Volver
            </Button>

            {/* ✅ si es solo lectura, no mostrar el botón de finalizar */}
            {canManageInspeccion && (
              <Button
                onClick={handleFinalizarInspeccion}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : checksPassed >= 4 ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Crear publicación y abrir
                  </>
                ) : (
                  <>
                    <Wrench className="h-4 w-4" />
                    Enviar a Retoques
                  </>
                )}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
