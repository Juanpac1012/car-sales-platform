import React, { useEffect, useState } from "react";
import { getExchangeRate } from "@/lib/exchangeRateService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, Eye, Car } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import * as ExternalAPI from "@/lib/ExternalVehiclesApi";
import { getToken as getStoredToken } from "@/lib/adminAuth";

// ====== CONSTANTES PARA AÑOS ======
const MIN_YEAR = 1940;
const CURRENT_YEAR = new Date().getFullYear();
const MAX_YEAR = CURRENT_YEAR + 1;

// ====== INTERVALOS DE AÑOS (de 5 en 5) ======
type YearRange = { label: string; min: number; max: number };

function generateYearRanges(): YearRange[] {
  const ranges: YearRange[] = [];
  // Empezamos desde el año más reciente hacia atrás
  const startYear = Math.ceil(MAX_YEAR / 5) * 5; // Redondear hacia arriba al múltiplo de 5
  
  for (let endYear = startYear; endYear >= MIN_YEAR; endYear -= 5) {
    const startYearRange = endYear - 4;
    if (startYearRange < MIN_YEAR) continue;
    ranges.push({
      label: `${startYearRange}-${endYear}`,
      min: startYearRange,
      max: endYear,
    });
  }
  return ranges;
}

const YEAR_RANGES = generateYearRanges();

// ==== PRECIO EN COLONES ====

type EditableColonesProps = {
  usd: number;
  vehicleId: string;
  initialCRC?: number;
};

function EditableColones({ usd, vehicleId, initialCRC }: EditableColonesProps) {
  const [crc, setCRC] = useState<number>(
    initialCRC ?? Math.round((usd || 0) * 600),
  );
  const [editing, setEditing] = useState(false);
  const [rate, setRate] = useState<number>(0);

  useEffect(() => {
    let mounted = true;

    getExchangeRate()
      .then((r) => {
        if (!mounted) return;
        setRate(r);
        if (!initialCRC && usd > 0) {
          setCRC(Math.round(usd * r));
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [usd, initialCRC]);

  const handleSave = async () => {
    setEditing(false);
    // aquí iría el guardado real
    void vehicleId;
  };

  return (
    <div className="mt-1">
      {editing ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={crc}
            onChange={(e) => setCRC(Number(e.target.value))}
            className="w-32 h-8 text-sm border rounded px-2"
          />
          <button
            className="px-2 py-1 border rounded text-xs"
            onClick={handleSave}
          >
            Guardar
          </button>
          <button
            className="px-2 py-1 text-xs"
            onClick={() => setEditing(false)}
          >
            Cancelar
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            ₡{crc.toLocaleString()}
          </span>
          <button
            className="px-2 py-1 text-xs"
            onClick={() => setEditing(true)}
          >
            Editar
          </button>
        </div>
      )}
      {rate > 0 && (
        <span className="block text-[10px] text-muted-foreground">
          Tasa: ₡{rate.toFixed(2)} por $1
        </span>
      )}
    </div>
  );
}

// ==== PANTALLA PRINCIPAL ====

type SummarySortKey =
  "year" | "avg_price" | "pricemin" | "pricemax" | "vehicles_count";
type SortDir = "asc" | "desc";

export default function BusquedaExterna() {
  const { toast } = useToast();

  // ---- Permisos (vista vs acción) SOLO para "Ver resumen" ----
  const [permMap, setPermMap] = useState<Record<string, string>>({});
  const [permLoaded, setPermLoaded] = useState(false);

  const norm = (v?: any) =>
    (v ?? "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("current_role_perms");
      const parsed = raw ? JSON.parse(raw) : null;

      const m: Record<string, string> = {};

      const put = (code: any, scope: any) => {
        const k = norm(code);
        if (!k) return;
        m[k] = norm(scope);
      };

      const putFromAny = (p: any) => {
        if (!p || typeof p !== "object") return;

        const code =
          p.code ??
          p.permission_code ??
          p.perm_code ??
          p.permission?.code ??
          p.permission?.permission_code;

        const scope =
          p.scope ??
          p.permission_scope ??
          p.scope_name ??
          p.permission?.scope ??
          p.permission?.permission_scope;

        put(code, scope);
      };

      if (Array.isArray(parsed)) {
        parsed.forEach(putFromAny);
      } else if (parsed?.permissions && Array.isArray(parsed.permissions)) {
        parsed.permissions.forEach(putFromAny);
      } else if (parsed && typeof parsed === "object") {
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "string") put(k, v);
          else putFromAny({ code: k, ...(v as any) });
        }
      }

      setPermMap(m);
    } catch {
      setPermMap({});
    } finally {
      setPermLoaded(true);
    }
  }, []);

  const scopeOf = (code: string) => permMap[norm(code)] || "";

  const canViewCode = (code: string) =>
    permLoaded && ["vista", "accion"].includes(scopeOf(code));

// ✅ poné aquí el/los códigos reales de tu permiso de Busqueda Externa / Resumen
// te dejo varios candidatos para no pegarse

  const canViewResumen =
    permLoaded && ["vista", "accion"].includes(permMap["inv.busqueda_externa"]);

  const token = getStoredToken();

  // resumen
  const [summaryMakeIds, setSummaryMakeIds] = useState<string[]>([]);
  const [summaryModelIds, setSummaryModelIds] = useState<string[]>([]);
  const [summaryYearRanges, setSummaryYearRanges] = useState<string[]>([]); // guarda labels como "2020-2025"
  const [makesPopoverOpen, setMakesPopoverOpen] = useState(false);
  const [modelsPopoverOpen, setModelsPopoverOpen] = useState(false);
  const [yearsPopoverOpen, setYearsPopoverOpen] = useState(false);
  const [avgPriceSummary, setAvgPriceSummary] = useState<
    ExternalAPI.VehiclesAvgPriceSummary[]
  >([]);
  const [summaryPage, setSummaryPage] = useState(1);
  const [summaryPageSize, setSummaryPageSize] = useState(20);
  const [summaryGoToPageInput, setSummaryGoToPageInput] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // sort del resumen (click en encabezados)
  const [summarySortKey, setSummarySortKey] =
    useState<SummarySortKey>("vehicles_count");
  const [summarySortDir, setSummarySortDir] = useState<SortDir>("desc");

  // datos y filtros
  const [vehicles, setVehicles] = useState<ExternalAPI.ExternalVehicle[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [appliedFilters, setAppliedFilters] =
    useState<ExternalAPI.ExternalVehicleFilters>({});
  const [searchRevision, setSearchRevision] = useState(0);
  const [makes, setMakes] = useState<ExternalAPI.ExternalMake[]>([]);
  const [models, setModels] = useState<ExternalAPI.ExternalModel[]>([]);
  const [allModels, setAllModels] = useState<ExternalAPI.ExternalModel[]>([]);
  const [loading, setLoading] = useState(false);

  // paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [goToPageInput, setGoToPageInput] = useState("");

  // filtros
  const [selectedMake, setSelectedMake] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<string>("");
  const [yearMin, setYearMin] = useState<string>("");
  const [yearMax, setYearMax] = useState<string>("");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");

  const [selectedVehicle, setSelectedVehicle] =
    useState<ExternalAPI.ExternalVehicle | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  ///DESPUES ARREGLAR
  // SOLO VISUAL — NO SE USA EN API
  const [style, setStyle] = useState<string>("");
  const [fuelType, setFuelType] = useState<string>("");
  const [transmission, setTransmission] = useState<string>("");
  const [kmMax, setKmMax] = useState("");
  const [seatsMin, setSeatsMin] = useState("");
  const [doorsMin, setDoorsMin] = useState("");
  const [colorInterior, setColorInterior] = useState("");
  const [colorExterior, setColorExterior] = useState("");
  const [tradeIn, setTradeIn] = useState<string>("");
  const [negotiable, setNegotiable] = useState<string>("");
  const [province, setProvince] = useState<string>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [taxPaid, setTaxPaid] = useState<string>("");
  const [plateEnding, setPlateEnding] = useState("");

  const [budgetMode, setBudgetMode] = useState(false);
  const [budget, setBudget] = useState("");
  const [markup, setMarkup] = useState("");

  // ---- effects ----
  useEffect(() => {
    if (!budgetMode) return;

    const b = Number(budget);
    const m = Number(markup);
 
    if (!Number.isNaN(b) && !Number.isNaN(m) && b > m) {
      setPriceMax(String(b - m));
    } else {
      setPriceMax("");
    }
  }, [budgetMode, budget, markup]);

  useEffect(() => {
    loadCatalogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedMake) {
      loadModels(parseInt(selectedMake));
    } else {
      setModels([]);
      setSelectedModel("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMake]);

  // ---- carga de datos ----

  async function loadCatalogs() {
    try {
      const makesData = await ExternalAPI.listExternalMakes(token || undefined);
      setMakes(makesData || []);

      const allModelsData = await ExternalAPI.listExternalModels(
        undefined,
        token || undefined,
      );
      setAllModels(allModelsData || []);
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los catálogos externos",
        variant: "destructive",
      });
    }
  }

  async function loadModels(makeId: number) {
    try {
      const modelsData = await ExternalAPI.listExternalModels(
        makeId,
        token || undefined,
      );
      setModels(modelsData || []);
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron cargar los modelos",
        variant: "destructive",
      });
      setModels([]);
    }
  }

  const buildFiltersFromState = (): ExternalAPI.ExternalVehicleFilters => {
    const filters: ExternalAPI.ExternalVehicleFilters = {};

    // años
    if (yearMin) {
      const n = Number(yearMin);
      if (!Number.isNaN(n)) filters.year_min = n;
    }
    if (yearMax) {
      const n = Number(yearMax);
      if (!Number.isNaN(n)) filters.year_max = n;
    }

    // marca / modelo / fuente
    if (selectedMake) filters.make_external_id = parseInt(selectedMake);
    if (selectedModel) filters.model_external_id = parseInt(selectedModel);
    if (selectedSource) filters.source = selectedSource;

    // precios
    if (priceMin) {
      const n = Number(priceMin);
      if (!Number.isNaN(n)) filters.price_min = n;
    }
    if (priceMax) {
      const n = Number(priceMax);
      if (!Number.isNaN(n)) filters.price_max = n;
    }
    if (kmMax) filters.odometer_km_max = Number(kmMax);

    if (fuelType) filters.fuel_type = fuelType;
    if (transmission) filters.transmission = transmission;

    if (doorsMin) filters.doors_min = Number(doorsMin);
    if (seatsMin) filters.seats_min = Number(seatsMin);

    if (colorExterior) filters.color_ext = colorExterior;
    if (colorInterior) filters.color_int = colorInterior;

    //
    if (taxPaid) filters.taxes_included = taxPaid; // "Si" | "No"
    if (negotiable) filters.negotiable_price = negotiable; // "Si" | "No"
    if (tradeIn) filters.receives_vehicle = tradeIn; // "Si" | "No"

    if (province) filters.province = province;

    if (plateEnding) filters.plate_ending = plateEnding;

    if (dateFrom) filters.entry_date_from = dateFrom;
    if (dateTo) filters.entry_date_to = dateTo;
    if (style) filters.style = style;

    return filters;
  };

  async function loadVehicles(
    baseFilters: ExternalAPI.ExternalVehicleFilters,
    targetPage: number,
    targetPageSize: number,
  ) {
    setLoading(true);
    try {
      const filters: ExternalAPI.ExternalVehicleFilters = {
        ...baseFilters,
        limit: targetPageSize,
        offset: (targetPage - 1) * targetPageSize,
      };

      const result = await ExternalAPI.listExternalVehiclesPage(
        filters,
        token || undefined,
      );
      setVehicles(result.items || []);
      setTotalCount(result.total || 0);
    } catch (error) {
      console.error("Error cargando vehículos externos:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los vehículos externos",
        variant: "destructive",
      });
      setVehicles([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadVehicles(appliedFilters, page, pageSize);
    // La búsqueda se ejecuta solo con los filtros aplicados, no con cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters, page, pageSize, searchRevision, token]);

  // ---- handlers ----

  const handleSearch = () => {
    // validar rango de años
    if (yearMin && yearMax) {
      const ymin = Number(yearMin);
      const ymax = Number(yearMax);
      if (!Number.isNaN(ymin) && !Number.isNaN(ymax) && ymin > ymax) {
        toast({
          title: "Rango de años inválido",
          description: "El año inicial no puede ser mayor que el año final.",
          variant: "destructive",
        });
        return;
      }
    }

    // validar rango de precios
    if (priceMin && priceMax) {
      const pmin = Number(priceMin);
      const pmax = Number(priceMax);
      if (!Number.isNaN(pmin) && !Number.isNaN(pmax) && pmin > pmax) {
        toast({
          title: "Rango de precios inválido",
          description: "El precio mínimo no puede ser mayor que el máximo.",
          variant: "destructive",
        });
        return;
      }
    }

    setAppliedFilters(buildFiltersFromState());
    setPage(1);
    setGoToPageInput("");
    setSearchRevision((revision) => revision + 1);
  };

  const handleClearFilters = () => {
    // Marca / modelo
    setSelectedMake("");
    setSelectedModel("");
    setSelectedSource("");

    // Visuales tipo Select
    setStyle("");
    setFuelType("");
    setTransmission("");
    setTradeIn("");
    setNegotiable("");
    setTaxPaid("");
    setProvince("");
    setPlateEnding("");

    // Inputs numéricos / texto
    setKmMax("");
    setSeatsMin("");
    setDoorsMin("");
    setColorInterior("");
    setColorExterior("");

    // Fechas
    setDateFrom("");
    setDateTo("");

    // Rangos
    setYearMin("");
    setYearMax("");
    setPriceMin("");
    setPriceMax("");
    setBudgetMode(false);
    setBudget("");
    setMarkup("");

    setAppliedFilters({});
    setPage(1);
    setGoToPageInput("");
    setSearchRevision((revision) => revision + 1);
  };

  const handleViewDetails = (vehicle: ExternalAPI.ExternalVehicle) => {
    setSelectedVehicle(vehicle);
    setDetailOpen(true);
  };

  const handleOpenExternal = async (vehicle: ExternalAPI.ExternalVehicle) => {
    try {
      const urlFromListing = await ExternalAPI.getExternalListingUrl(
        vehicle.id,
        token || undefined,
      );
      const finalUrl =
        urlFromListing || vehicle.url || vehicle.listing_url || "#";

      if (!finalUrl || finalUrl === "#") {
        toast({
          title: "Sin enlace",
          description: "No se encontró un enlace externo para este vehículo.",
          variant: "destructive",
        });
        return;
      }

      window.open(finalUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error abriendo enlace externo", error);
      toast({
        title: "Error",
        description: "No se pudo abrir el enlace externo.",
        variant: "destructive",
      });
    }
  };

  const handleShowSummary = async () => {
    setLoadingSummary(true);
    setShowSummary(true);
    setSummaryPage(1);
    setSummaryGoToPageInput("");

    try {
      const summaryData = await ExternalAPI.getAveragePriceSummary(
        {
          page: 1,
          page_size: 1000, // evita respuestas excesivas en una sola petición
        },
        token || undefined,
      );
      setAvgPriceSummary(summaryData || []);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No se pudo cargar el resumen de precios",
        variant: "destructive",
      });
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleGoToPage = () => {
    const n = Number(goToPageInput);
    if (Number.isFinite(n)) {
      setPage(Math.max(1, Math.min(totalPages, Math.trunc(n))));
    }
  };

  const handleSummarySort = (key: SummarySortKey) => {
    setSummaryPage(1);
    setSummaryGoToPageInput("");

    setSummarySortKey((prevKey) => {
      if (prevKey !== key) {
        setSummarySortDir("desc");
        return key;
      }
      setSummarySortDir((prevDir) => (prevDir === "desc" ? "asc" : "desc"));
      return prevKey;
    });
  };

  const sortIndicator = (key: SummarySortKey) => {
    if (summarySortKey !== key) return "";
    return summarySortDir === "asc" ? " ▲" : " ▼";
  };

  const safeNum = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // ---- helpers ----

  const getSource = (v: ExternalAPI.ExternalVehicle) => v?.source || "external";
  const getMakeName = (v: ExternalAPI.ExternalVehicle) =>
    v?.make?.name || v?.make_name || "N/A";
  const getModelName = (v: ExternalAPI.ExternalVehicle) =>
    v?.model?.name || v?.model_name || "N/A";
  const getStyleName = (v: ExternalAPI.ExternalVehicle) =>
    (v as any)?.trim?.name || v?.trim_name || "N/A";
  const getPrice = (v: ExternalAPI.ExternalVehicle) => v?.price || 0;
  const getKm = (v: ExternalAPI.ExternalVehicle) =>
    v?.odometer_km || v?.km || 0;
  const getColor = (v: ExternalAPI.ExternalVehicle) =>
    v?.color_ext || v?.color_int || "N/A";
  const getLocation = (v: ExternalAPI.ExternalVehicle) => {
    if (v.province) return v.province;
    return "N/A";
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("es-CR");
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  const getPageItems = (currentPage: number, totalPagesParam: number) => {
    const items: (number | "...")[] = [];

    if (totalPagesParam <= 7) {
      for (let i = 1; i <= totalPagesParam; i++) items.push(i);
      return items;
    }

    const showLeftDots = currentPage > 4;
    const showRightDots = currentPage < totalPagesParam - 3;

    items.push(1);

    if (showLeftDots) {
      items.push("...");
    } else {
      items.push(2, 3);
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPagesParam - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      if (!items.includes(i)) items.push(i);
    }

    if (showRightDots) {
      items.push("...");
    } else {
      for (let i = totalPagesParam - 2; i < totalPagesParam; i++) {
        if (!items.includes(i)) items.push(i);
      }
    }

    if (!items.includes(totalPagesParam)) items.push(totalPagesParam);

    return items;
  };

  const paginatedVehicles = vehicles;
  const startIndex = totalCount === 0 ? 0 : (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + vehicles.length, totalCount);

  // ==== RENDER ====

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Búsqueda Externa</h1>
          <p className="text-muted-foreground mt-1">
            Explora vehículos de portales externos y proveedores autorizados
          </p>
        </div>
        {canViewResumen && (
          <Button variant="secondary" onClick={handleShowSummary}>
            Ver resumen
          </Button>
        )}
      </div>

      {/* MODAL RESUMEN */}
      {showSummary && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSummary(false);
              setSummaryMakeIds([]);
              setSummaryModelIds([]);
              setSummaryYearRanges([]);
            }
          }}
        >
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-8 relative max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-3xl"
              onClick={() => {
                setShowSummary(false);
                setSummaryMakeIds([]);
                setSummaryModelIds([]);
                setSummaryYearRanges([]);
              }}
            >
              ×
            </button>

            <h2 className="text-xl font-bold mb-4 text-center">
              Resumen de Precios Promedio
            </h2>

            {/* filtros resumen */}
            <div className="flex flex-row flex-wrap gap-4 mb-4 items-end justify-center">
              {/* MARCA - Selección múltiple */}
              <div>
                <label className="block text-xs mb-1">Marca(s)</label>
                <Popover
                  open={makesPopoverOpen}
                  onOpenChange={setMakesPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="border rounded px-2 py-1 text-sm w-48 font-normal bg-white shadow-sm text-left flex items-center justify-between"
                    >
                      <span className="truncate">
                        {summaryMakeIds.length === 0
                          ? "Todas las marcas"
                          : summaryMakeIds.length <= 2
                            ? makes
                                .filter((m) =>
                                  summaryMakeIds.includes(String(m.id)),
                                )
                                .map((m) => m.name)
                                .join(", ")
                            : `${summaryMakeIds.length} marcas`}
                      </span>
                      <svg
                        className="ml-2 w-4 h-4 text-gray-500 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    align="start"
                    className="bg-white rounded shadow-lg p-2 max-h-60 overflow-y-auto border w-56"
                  >
                    {makes.map((make) => (
                      <label
                        key={make.id}
                        className="flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          value={make.id}
                          checked={summaryMakeIds.includes(String(make.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSummaryMakeIds((prev) => [
                                ...prev,
                                String(make.id),
                              ]);
                            } else {
                              setSummaryMakeIds((prev) =>
                                prev.filter((id) => id !== String(make.id)),
                              );
                              // Limpiar modelos que ya no corresponden
                              setSummaryModelIds((prev) =>
                                prev.filter((modelId) => {
                                  const model = allModels.find(
                                    (m) => String(m.id) === modelId,
                                  );
                                  return (
                                    model &&
                                    summaryMakeIds
                                      .filter((id) => id !== String(make.id))
                                      .includes(String(model.make_id))
                                  );
                                }),
                              );
                            }
                            setSummaryPage(1);
                          }}
                        />
                        <span className="text-sm">{make.name}</span>
                      </label>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>

              {/* MODELO - Selección múltiple */}
              <div>
                <label className="block text-xs mb-1">Modelo(s)</label>
                <Popover
                  open={modelsPopoverOpen}
                  onOpenChange={setModelsPopoverOpen}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="border rounded px-2 py-1 text-sm w-48 font-normal bg-white shadow-sm text-left flex items-center justify-between"
                    >
                      <span className="truncate">
                        {summaryModelIds.length === 0
                          ? "Todos los modelos"
                          : summaryModelIds.length <= 2
                            ? allModels
                                .filter((m) =>
                                  summaryModelIds.includes(String(m.id)),
                                )
                                .map((m) => m.name)
                                .join(", ")
                            : `${summaryModelIds.length} modelos`}
                      </span>
                      <svg
                        className="ml-2 w-4 h-4 text-gray-500 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    align="start"
                    className="bg-white rounded shadow-lg p-2 max-h-60 overflow-y-auto border w-56"
                  >

                    {allModels
                      .filter(
                        (m) =>
                          summaryMakeIds.length === 0 ||
                          summaryMakeIds.includes(String(m.make_id)),
                      )
                      .map((model) => (
                        <label
                          key={model.id}
                          className="flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            value={model.id}
                            checked={summaryModelIds.includes(String(model.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSummaryModelIds((prev) => [
                                  ...prev,
                                  String(model.id),
                                  ]);
                              } else {
                                setSummaryModelIds((prev) =>
                                  prev.filter((id) => id !== String(model.id)),
                                );
                              }
                              setSummaryPage(1);
                            }}
                          />
                          <span className="text-sm">{model.name}</span>
                        </label>
                      ))}
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="block text-xs mb-1">Rango de Años</label>
                <Popover open={yearsPopoverOpen} onOpenChange={setYearsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="border rounded px-2 py-1 text-sm w-40 font-normal bg-white shadow-sm text-left flex items-center justify-between"
                    >
                      <span className="truncate">
                        {summaryYearRanges.length === 0
                          ? "Todos los años"
                          : summaryYearRanges.length <= 2
                            ? summaryYearRanges.join(", ")
                            : `${summaryYearRanges.length} rangos`}
                      </span>
                      <svg
                        className="ml-2 w-4 h-4 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    align="start"
                    className="bg-white rounded shadow-lg p-2 max-h-60 overflow-y-auto border"
                  >
                    {YEAR_RANGES.map((range, idx) => (
                      <label
                        key={idx}
                        className="flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          value={range.label}
                          checked={summaryYearRanges.includes(range.label)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSummaryYearRanges((prev) => [...prev, range.label]);
                            } else {
                              setSummaryYearRanges((prev) => prev.filter((r) => r !== range.label));
                            }
                            setSummaryPage(1);
                          }}
                        />
                        <span className="text-sm">{range.label}</span>
                      </label>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* contenido resumen */}
            {loadingSummary ? (
              <div className="text-center py-8">Cargando...</div>
            ) : avgPriceSummary.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay datos de resumen disponibles.
              </div>
            ) : (
              (() => {
                // Función auxiliar para verificar si un año está dentro de algún rango seleccionado
                const isYearInSelectedRanges = (year: number): boolean => {
                  if (summaryYearRanges.length === 0) return true;
                  return summaryYearRanges.some((rangeLabel) => {
                    const range = YEAR_RANGES.find((r) => r.label === rangeLabel);
                    return range ? year >= range.min && year <= range.max : false;
                  });
                };

                const filteredRowsBase = avgPriceSummary.filter((row) => {
                  if (summaryMakeIds.length > 0 && !summaryMakeIds.includes(String(row.make_id))) return false;
                  if (summaryModelIds.length > 0 && !summaryModelIds.includes(String(row.model_id))) return false;
                  if (!isYearInSelectedRanges(row.year)) return false;
                  return true;
                });

                if (filteredRowsBase.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      No existe un vehículo con las especificaciones indicadas.
                    </div>
                  );
                }

                // ✅ ordenar (asc/desc) por columna
                const filteredRows = [...filteredRowsBase].sort((a, b) => {
                  const aVal = safeNum((a as any)[summarySortKey]);
                  const bVal = safeNum((b as any)[summarySortKey]);

                  // nulls al final
                  if (aVal == null && bVal == null) return 0;
                  if (aVal == null) return 1;
                  if (bVal == null) return -1;

                  const diff = aVal - bVal;
                  return summarySortDir === "asc" ? diff : -diff;
                });

                const summaryTotalCount = filteredRows.length;
                const summaryTotalPages = Math.max(1, Math.ceil(summaryTotalCount / summaryPageSize));

                const safeSummaryPage = Math.min(summaryPage, summaryTotalPages);
                const summaryStartIndex = (safeSummaryPage - 1) * summaryPageSize;
                const summaryEndIndex = Math.min(summaryStartIndex + summaryPageSize, summaryTotalCount);

                const paginatedSummaryRows = filteredRows.slice(summaryStartIndex, summaryEndIndex);

                const canSummaryPrev = safeSummaryPage > 1;
                const canSummaryNext = safeSummaryPage < summaryTotalPages;

                const handleSummaryGoToPage = () => {
                  const n = Number(summaryGoToPageInput);
                  if (Number.isFinite(n)) {
                    setSummaryPage(Math.max(1, Math.min(summaryTotalPages, Math.trunc(n))));
                  }
                };

                const thBtn = "px-3 py-2 border-b text-left cursor-pointer select-none hover:bg-gray-200";

                return (
                  <>
                    {/* barra superior: Mostrar X y contador */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Mostrar</span>
                        <Select
                          value={String(summaryPageSize)}
                          onValueChange={(v) => {
                            setSummaryPageSize(Number(v));
                            setSummaryPage(1);
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
                        Mostrando{" "}
                        {summaryTotalCount === 0 ? 0 : summaryStartIndex + 1}–
                        {summaryEndIndex} de {summaryTotalCount}
                      </div>
                    </div>

                    {/* tabla paginada */}
                    <div className="max-h-[500px] overflow-y-auto border rounded-lg">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="bg-gray-100 sticky top-0">
                            <th className="px-3 py-2 border-b text-left">Marca</th>
                            <th className="px-3 py-2 border-b text-left">Modelo</th>

                            <th
                              className={thBtn}
                              onClick={() => handleSummarySort("year")}
                              title="Ordenar por Año"
                            >
                              Año{sortIndicator("year")}
                            </th>

                            <th
                              className={thBtn}
                              onClick={() => handleSummarySort("avg_price")}
                              title="Ordenar por Promedio"
                            >
                              Promedio (USD){sortIndicator("avg_price")}
                            </th>

                            <th
                              className={thBtn}
                              onClick={() => handleSummarySort("pricemin")}
                              title="Ordenar por Mínimo"
                            >
                              Mínimo (USD){sortIndicator("pricemin")}
                            </th>

                            <th
                              className={thBtn}
                              onClick={() => handleSummarySort("pricemax")}
                              title="Ordenar por Máximo"
                            >
                              Máximo (USD){sortIndicator("pricemax")}
                            </th>

                            <th
                              className={thBtn}
                              onClick={() => handleSummarySort("vehicles_count")}
                              title="Ordenar por Cantidad"
                            >
                              Cantidad{sortIndicator("vehicles_count")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedSummaryRows.map((row, idx) => (
                            <tr
                              key={idx}
                              className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                            >
                              <td className="px-3 py-2 border-b">{row.make_name}</td>
                              <td className="px-3 py-2 border-b">{row.model_name}</td>
                              <td className="px-3 py-2 border-b">{row.year}</td>

                              <td className="px-3 py-2 border-b">
                                {row.avg_price != null ? `$${Number(row.avg_price).toLocaleString()}` : "N/D"}
                              </td>

                              <td className="px-3 py-2 border-b">
                                {row.pricemin != null ? `$${Number(row.pricemin).toLocaleString()}` : "N/D"}
                              </td>

                              <td className="px-3 py-2 border-b">
                                {row.pricemax != null ? `$${Number(row.pricemax).toLocaleString()}` : "N/D"}
                              </td>

                              <td className="px-3 py-2 border-b text-center">{row.vehicles_count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* paginación igual a la de resultados */}
                    <div className="flex justify-end mt-4">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                        <div className="flex items-center gap-1 rounded-full border bg-card px-2 py-1 shadow-sm">
                          {canSummaryPrev && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full h-7 w-7"
                              onClick={() => setSummaryPage((p) => Math.max(1, p - 1))}
                            >
                              {"<"}
                            </Button>
                          )}

                          {getPageItems(safeSummaryPage, summaryTotalPages).map(
                            (item, idx) =>
                              item === "..." ? (
                                <div
                                  key={`summary-dots-${idx}`}
                                  className="px-2 text-xs text-muted-foreground select-none"
                                >
                                  ...
                                </div>
                              ) : (
                                <Button
                                  key={`summary-page-${item}-${idx}`}
                                  variant="ghost"
                                  size="sm"
                                  className={
                                    item === safeSummaryPage
                                      ? "h-7 min-w-[2rem] rounded-full border border-gray-300 bg-white/50 text-gray-900 shadow-sm"
                                      : "h-7 min-w-[2rem] rounded-full"
                                  }
                                  onClick={() => setSummaryPage(item as number)}
                                >
                                  {item}
                                </Button>
                              ),
                          )}

                          {canSummaryNext && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full h-7 w-7"
                              onClick={() => setSummaryPage((p) => Math.min(summaryTotalPages, p + 1))}
                            >
                              {">"}
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs md:text-sm">
                          <span className="text-muted-foreground">Ir a la página</span>
                          <Input
                            value={summaryGoToPageInput}
                            onChange={(e) => setSummaryGoToPageInput(e.target.value)}
                            className="h-8 w-14 text-center text-xs md:text-sm"
                            inputMode="numeric"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSummaryGoToPage();
                              }
                            }}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs md:text-sm"
                            onClick={handleSummaryGoToPage}
                          >
                            Ir &gt;
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()
            )}
          </div>
        </div>
      )}

      {/* CARD FILTROS */}

      {/* BÚSQUEDA CON PRESUPUESTO */}
      <div className="flex items-center gap-3 mb-4">
        <Button
          type="button"
          variant={budgetMode ? "default" : "outline"}
          onClick={() => {
            const next = !budgetMode;
            setBudgetMode(next);

            if (!next) {
              // apagar → limpiar
              setBudget("");
              setMarkup("");
              setPriceMax("");
            }
          }}
        >
          {budgetMode
            ? "Búsqueda con presupuesto ✓"
            : "Búsqueda con presupuesto"}
        </Button>
 
        <span className="text-xs text-muted-foreground">
          Calcula el precio máximo automáticamente
        </span>
      </div>

      {budgetMode && (
        <>
          {/* Presupuesto */}
          <div className="space-y-2">
            <Label>Presupuesto (USD)</Label>
            <Input
              type="number"
              placeholder="Ej: $20000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>

          {/* Markup */}
          <div className="space-y-2">
            <Label>Markup (USD)</Label>
            <Input
              type="number"
              placeholder="Ej: $3000"
              value={markup}
              onChange={(e) => setMarkup(e.target.value)}
            />
          </div>
        </>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Marca</Label>
              <Select
                value={selectedMake || "all"}
                onValueChange={(v) => {
                  if (v === "all") {
                    setSelectedMake("");
                    setSelectedModel("");
                  } else {
                    setSelectedMake(v);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las marcas" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Todas las marcas</SelectItem>
                  {makes.map((make) => (
                    <SelectItem key={make.id} value={String(make.id)}>
                      {make.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Modelo</Label>
              <Select
                value={selectedModel || "all"}
                disabled={!selectedMake}
                onValueChange={(v) => {
                  if (v === "all") {
                    setSelectedModel("");
                  } else {
                    setSelectedModel(v);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los modelos" />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="all">Todos los modelos</SelectItem>
                  {models.map((model) => (
                    <SelectItem key={model.id} value={String(model.id)}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Estilo (SOLO VISUAL) */}
            <div className="space-y-2">
              <Label>Estilo</Label>
              <Input
                placeholder="Ej: SUV, Sedán, Pick Up..."
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              />
            </div>

            {/* Combustible (SOLO VISUAL) */}
            <div className="space-y-2">
              <Label>Combustible</Label>
              <Select
                value={fuelType || "all"}
                onValueChange={(v) => setFuelType(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los combustibles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los combustibles</SelectItem>
                  <SelectItem value="Gasolina">Gasolina</SelectItem>
                  <SelectItem value="Diesel">Diesel</SelectItem>
                  <SelectItem value="Híbrido">Híbrido</SelectItem>
                  <SelectItem value="Eléctrico">Eléctrico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transmisión (SOLO VISUAL) */}
            <div className="space-y-2">
              <Label>Transmisión</Label>
              <Select
                value={transmission || "all"}
                onValueChange={(v) => setTransmission(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las transmisiones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las transmisiones</SelectItem>
                  <SelectItem value="Manual">Manual</SelectItem>
                  <SelectItem value="Automática">Automática</SelectItem>
                  <SelectItem value="Automática/Dual">Automática / Dual</SelectItem>
                </SelectContent>
              </Select>
            </div>

                  {/* Kilometraje */}
            <div className="space-y-2">
              <Label>Kilometraje máx</Label>
              <Input
                type="number"
                placeholder="Ej: 80000"
                value={kmMax}
                onChange={(e) => setKmMax(e.target.value)}
              />
            </div>

            {/* Terminación de placa */}
            <div className="space-y-2">
              <Label>Terminación de placa</Label>
              <Select
                value={plateEnding || "all"}
                onValueChange={(v) => setPlateEnding(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="6">6</SelectItem>
                  <SelectItem value="7">7</SelectItem>
                  <SelectItem value="8">8</SelectItem>
                  <SelectItem value="9">9</SelectItem>
                  <SelectItem value="0">0</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pasajeros */}
            <div className="space-y-2">
              <Label># Pasajeros</Label>
              <Input
                type="number"
                min={1}
                max={9}
                placeholder="Ej: 5"
                value={seatsMin}
                onChange={(e) => setSeatsMin(e.target.value)}
              />
            </div>

            {/* Puertas */}
            <div className="space-y-2">
              <Label># Puertas</Label>
              <Input
                type="number"
                min={1}
                max={10}
                step={1}
                placeholder="Ej: 4"
                value={doorsMin}
                onChange={(e) => setDoorsMin(e.target.value)}
              />
            </div>

            {/* Color interior */}
            <div className="space-y-2">
              <Label>Color interior</Label>
              <Input
                placeholder="Ej: Negro"
                value={colorInterior}
                onChange={(e) => setColorInterior(e.target.value)}
              />
            </div>

            {/* Color exterior  */}
            <div className="space-y-2">
              <Label>Color exterior</Label>
              <Input
                placeholder="Ej: Blanco"
                value={colorExterior}
                onChange={(e) => setColorExterior(e.target.value)}
              />
            </div>

            {/* Se recibe vehículo  */}
            <div className="space-y-2">
              <Label>Se recibe vehículo</Label>
              <Select
                value={tradeIn || "all"}
                onValueChange={(v) => setTradeIn(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="SI">Sí</SelectItem>
                  <SelectItem value="NO">No</SelectItem>
                </SelectContent>
              </Select>
            </div>


            {/* Precio negociable  */}

            <div className="space-y-2">
              <Label>Precio negociable</Label>
              <Select
                value={negotiable || "all"}
                onValueChange={(v) => setNegotiable(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="SI">Sí</SelectItem>
                  <SelectItem value="NO">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ya pagó impuestos */}
            <div className="space-y-2">
              <Label>Ya pagó impuestos</Label>
              <Select
                value={taxPaid || "all"}
                onValueChange={(v) => setTaxPaid(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="SI">Sí</SelectItem>
                  <SelectItem value="NO">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Provincia */}
            <div className="space-y-2">
              <Label>Provincia</Label>
              <Select
                value={province || "all"}
                onValueChange={(v) => setProvince(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las provincias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las provincias</SelectItem>
                  <SelectItem value="San José">San José</SelectItem>
                  <SelectItem value="Alajuela">Alajuela</SelectItem>
                  <SelectItem value="Cartago">Cartago</SelectItem>
                  <SelectItem value="Heredia">Heredia</SelectItem>
                  <SelectItem value="Guanacaste">Guanacaste</SelectItem>
                  <SelectItem value="Puntarenas">Puntarenas</SelectItem>
                  <SelectItem value="Limón">Limón</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/*
            <div className="space-y-2">
              <Label>Fecha ingreso desde</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            */}

            {/*
            <div className="space-y-2">
              <Label>Fecha ingreso hasta</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
            */}


            <div className="space-y-2">
              <Label>Año desde</Label>
              <Input
                type="number"
                min={MIN_YEAR}
                max={MAX_YEAR}
                placeholder={String(MIN_YEAR)}
                value={yearMin}
                onChange={(e) => setYearMin(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Año hasta</Label>
              <Input
                type="number"
                min={MIN_YEAR}
                max={MAX_YEAR}
                placeholder={String(MAX_YEAR)}
                value={yearMax}
                onChange={(e) => setYearMax(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Precio mín (USD)</Label>
              <Input
                type="number"
                placeholder="$5000"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Precio máx (USD)</Label>
              <Input
                type="number"
                placeholder="$50000"
                value={priceMax}
                disabled={budgetMode}
                className={budgetMode ? "bg-muted cursor-not-allowed" : ""}
                onChange={(e) => setPriceMax(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button onClick={handleSearch} className="gap-2">
              <Search className="h-4 w-4" />
              Buscar
            </Button>
            <Button variant="outline" onClick={handleClearFilters}>
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* CARD RESULTADOS */}
      <Card>
        <CardHeader>
          <CardTitle>Resultados ({totalCount})</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : totalCount === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No se encontraron vehículos con los filtros aplicados
            </div>
          ) : (
            <>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Mostrar</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setPage(1);
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
                  Mostrando {totalCount === 0 ? 0 : startIndex + 1}–{endIndex}{" "}
                  de {totalCount}
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Imagen</TableHead>
                      <TableHead>Fuente</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Año</TableHead>
                      <TableHead>Precio</TableHead>
                      <TableHead>Km</TableHead>
                      <TableHead>Transmisión</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginatedVehicles.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell>
                          {v.image_url ? (
                            <img
                              src={v.image_url}
                              loading="lazy"
                              className="w-16 h-12 object-cover rounded"
                              alt={`${getMakeName(v)} ${getModelName(v)}`}
                            />
                          ) : (
                            <div className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                              <Car className="h-4 w-4" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getSource(v)}</Badge>
                        </TableCell>
                        <TableCell>{getMakeName(v)}</TableCell>
                        <TableCell>{getModelName(v)}</TableCell>
                        <TableCell>{v.year ?? "N/A"}</TableCell>
                        <TableCell>
                          {getPrice(v) > 0 ? `$${getPrice(v).toLocaleString()}` : "N/A"}
                        </TableCell>
                        <TableCell>
                          {getKm(v) > 0 ? `${getKm(v).toLocaleString()} km` : "N/A"}
                        </TableCell>
                        
                        <TableCell>{v.transmission || "N/A"}</TableCell>
                        <TableCell>{getLocation(v)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleViewDetails(v)}
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenExternal(v)}
                              title="Abrir en sitio externo"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end mt-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                  <div className="flex items-center gap-1 rounded-full border bg-card px-2 py-1 shadow-sm">
                    {canGoPrev && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-7 w-7"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        {"<"}
                      </Button>
                    )}

                    {getPageItems(page, totalPages).map((item, idx) =>
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
                            item === page
                              ? "h-7 min-w-[2rem] rounded-full border border-gray-300 bg-white/50 text-gray-900 shadow-sm"
                              : "h-7 min-w-[2rem] rounded-full"
                          }
                          onClick={() => setPage(item as number)}
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
                        onClick={() => setPage((p) => p + 1)}
                      >
                        {">"}
                      </Button>
                    )}
                  </div>

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

      {/* SHEET DETALLE */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="overflow-y-auto sm:max-w-2xl">
          {selectedVehicle && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {getMakeName(selectedVehicle)} {getModelName(selectedVehicle)}{" "}
                  {selectedVehicle.year}
                </SheetTitle>
                <SheetDescription>Detalles del vehículo externo</SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {(selectedVehicle as any).fotos?.ingreso &&
                (selectedVehicle as any).fotos.ingreso.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(selectedVehicle as any).fotos.ingreso.map(
                      (foto: string, idx: number) => (
                        <img
                          key={idx}
                          src={foto}
                          alt={`Foto ${idx + 1}`}
                          className="w-24 h-24 object-cover rounded border"
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                        />
                      )
                    )}
                  </div>
                ) : selectedVehicle.image_url ? (
                  <div className="w-full h-48 rounded-lg overflow-hidden">
                    <img
                      src={selectedVehicle.image_url}
                      className="w-full h-full object-cover"
                      alt={`${getMakeName(selectedVehicle)} ${getModelName(selectedVehicle)}`}
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                    <Car className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">

                <div>
                  <p className="text-muted-foreground">Marca</p>
                  <p className="font-medium">
                    {getMakeName(selectedVehicle)}
                  </p>
                </div>

                <div>
                  <p className="text-muted-foreground">Modelo</p>
                  <p className="font-medium">
                    {getModelName(selectedVehicle)}
                  </p>
                </div>
                
                <div>
                  <p className="text-muted-foreground">Estilo</p>
                  <p className="font-medium">
                    {getStyleName(selectedVehicle)}
                  </p>
                </div>

                <div>
                    <p className="text-muted-foreground">Año</p>
                    <p className="font-medium">{selectedVehicle.year  || "N/A"}</p>
                </div>

                <div>
                    <p className="text-muted-foreground">Provincia</p>
                    <p className="font-medium">{selectedVehicle.province  || "N/A"}</p>
                </div>


                <div>
                    <p className="text-muted-foreground">Precio</p>
                    <p className="font-medium text-lg">
                      {getPrice(selectedVehicle) > 0
                          ? `$${getPrice(selectedVehicle).toLocaleString()}`
                          : "N/D"}
                    </p> 
                </div>

                  <div>
                    <p className="text-muted-foreground">Kilometraje</p>
                    <p className="font-medium">
                      {getKm(selectedVehicle) > 0
                        ? `${getKm(selectedVehicle).toLocaleString()} km`
                        : "N/D"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Transmisión</p>
                    <p className="font-medium">{selectedVehicle.transmission || "N/A"}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Combustible</p>
                    <p className="font-medium">{selectedVehicle.fuel_type || "N/A"}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Color exterior</p>
                    <p className="font-medium">
                      {selectedVehicle.color_ext || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Color interior</p>
                    <p className="font-medium">
                      {selectedVehicle.color_int || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Motor</p>
                    <p className="font-medium">{selectedVehicle.engine || "N/A"}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Puertas</p>
                    <p className="font-medium">{selectedVehicle.doors || "N/A"}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Pasajeros</p>
                      <p className="font-medium">
                        {(selectedVehicle as any).num_passengers ??
                          selectedVehicle.seats ??
                          "N/A"}
                      </p>
                    </div>

                  <div>
                    <p className="text-muted-foreground">Placa</p>
                    <p className="font-medium">
                      {selectedVehicle.plate || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Impuestos</p>
                    <p className="font-medium">
                      {selectedVehicle.taxes_included || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Precio negociable</p>
                    <p className="font-medium">
                      {selectedVehicle.negotiable_price || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Recibe vehículo</p>
                    <p className="font-medium">
                      {selectedVehicle.receives_vehicle || "N/A"}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Fecha de ingreso</p>
                    <p className="font-medium">
                      {selectedVehicle.vehicle_entry_date || "N/A"}
                    </p>
                  </div>
                </div>

                {selectedVehicle.description && (
                  <div>
                    <p className="text-muted-foreground mb-2">Descripción</p>
                    <p className="text-sm">{selectedVehicle.description}</p>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <Button className="w-full" onClick={() => handleOpenExternal(selectedVehicle)}>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver en portal externo
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}