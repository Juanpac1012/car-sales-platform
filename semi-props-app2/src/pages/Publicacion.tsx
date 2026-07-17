import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Edit, Plus, Trash2, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as InspeccionApi from "@/lib/InspeccionApi";
import { getExchangeRate, formatCRC, crcToUsd } from "@/lib/exchangeRateService";
import { updateVehiclePriceCRC } from "@/lib/IngresoApi";
import * as WorkOrdersApi from "@/lib/WorkOrdersApi";
import * as adminAuth from "@/lib/adminAuth";

export default function Publicacion() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // ---- Permisos (vista vs acción) ----
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

      // code puede venir con distintos nombres
      const code =
        p.code ??
        p.permission_code ??
        p.perm_code ??
        p.permission?.code ??
        p.permission?.permission_code;

      // scope puede venir con distintos nombres
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
      // si te guardan { "inv.publicacion": "accion", ... }
      for (const [k, v] of Object.entries(parsed)) {
        // ojo: aquí v puede ser string o objeto
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

const canViewCode = (code: string) => {
  if (!permLoaded) return false;
  const s = scopeOf(code);
  return s === "vista" || s === "accion";
};

const canActCode = (code: string) => permLoaded && scopeOf(code) === "accion";

// ✅ tus codes conocidos
const PUB_CODES = [
  "inv.publicacion",
  "intel.publicacion",
  "op.publicacion",
  "pub.publicacion",
  "inv.listings",
  "listing.write",
];

// ✅ fallback por patrón: si el code real no está en la lista pero contiene “publicacion/listing”
const canActByPattern = () => {
  if (!permLoaded) return false;
  return Object.entries(permMap).some(([k, s]) => {
    if (s !== "accion") return false;
    return k.includes("publicacion") || k.includes("listing");
  });
};

const canViewPublicacion =
  PUB_CODES.some(canViewCode) || Object.keys(permMap).some(k => k.includes("publicacion") || k.includes("listing"));

const canActPublicacion =
  PUB_CODES.some(canActCode) || canActByPattern();

  // Función para obtener el token
  const getAuthToken = async (): Promise<string> => {
    try {
      const { token } = await adminAuth.ensureAuth();
      return token;
    } catch (error) {
      console.error("Error getting auth token:", error);
      return "";
    }
  };

  // Estados para listings
  const [listings, setListings] = useState<InspeccionApi.VehicleListing[]>([]);
  const [vehicles, setVehicles] = useState<InspeccionApi.Vehicle[]>([]);
  const [publishedVehicles, setPublishedVehicles] = useState<InspeccionApi.Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [editingCrcId, setEditingCrcId] = useState<string | null>(null);
  const [editingCrcValue, setEditingCrcValue] = useState<string>("");

useEffect(() => {
  if (!canActPublicacion && editingCrcId) {
    setEditingCrcId(null);
    setEditingCrcValue("");
  }
}, [canActPublicacion, editingCrcId]);

  // Estados para modales
  const [showModal, setShowModal] = useState(false);
  const [viewingListing, setViewingListing] = useState<InspeccionApi.VehicleListing | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([]);

  // Estados para formulario
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [titulo, setTitulo] = useState("");
  const [precio, setPrecio] = useState("");
  const [descripcion, setDescripcion] = useState("");

  // Estado para el total de retoques del vehículo en vista
  const [retoquesTotal, setRetoquesTotal] = useState<{ totalUSD: number; totalCRC: number } | null>(null);
  const [loadingRetoques, setLoadingRetoques] = useState(false);
  
  // Estado para datos completos del vehículo (incluyendo colores)
  const [vehicleDetails, setVehicleDetails] = useState<InspeccionApi.Vehicle | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  // ⭐ Cargar datos completos del vehículo cuando se abre el drawer (para obtener colores)
  useEffect(() => {
    const loadVehicleDetails = async () => {
      console.log('[Publicacion] useEffect vehicleDetails - vehicle_id:', viewingListing?.vehicle_id);
      if (viewingListing?.vehicle_id) {
        try {
          console.log('[Publicacion] Cargando detalles del vehículo...');
          const details = await InspeccionApi.getVehicleById(viewingListing.vehicle_id);
          console.log('[Publicacion] Detalles obtenidos:', details);
          console.log('[Publicacion] Colores:', { 
            exteriorColor: details?.exteriorColor, 
            interiorColor: details?.interiorColor 
          });
          setVehicleDetails(details);
        } catch (error) {
          console.error('[Publicacion] Error loading vehicle details:', error);
          setVehicleDetails(null);
        }
      } else {
        setVehicleDetails(null);
      }
    };
    loadVehicleDetails();
  }, [viewingListing?.vehicle_id]);

  // Cargar retoques cuando se abre el drawer de vista
  useEffect(() => {
    const loadRetoquesTotal = async () => {
      console.log('[Publicacion] viewingListing:', viewingListing);
      console.log('[Publicacion] vehicle_id:', viewingListing?.vehicle_id);
      console.log('[Publicacion] exchangeRate:', exchangeRate);
      
      if (viewingListing?.vehicle_id && exchangeRate) {
        setLoadingRetoques(true);
        try {
          const token = await getAuthToken();
          
          // Usar la misma lógica que Inventario Interno
          console.log('[Publicacion] Buscando work orders para vehicle_id:', viewingListing.vehicle_id);
          const workOrders = await WorkOrdersApi.listWorkOrders(viewingListing.vehicle_id, token);
          console.log('[Publicacion] Work orders encontradas:', workOrders);
          
          if (!workOrders || workOrders.length === 0) {
            console.log('[Publicacion] No hay work orders para vehículo:', viewingListing.vehicle_id);
            setRetoquesTotal({ totalUSD: 0, totalCRC: 0 });
            return;
          }

          let totalUSD = 0;
          let totalCRC = 0;

          for (const wo of workOrders) {
            console.log('[Publicacion] Procesando work order:', wo.id);
            if (wo.id) {
              const tasks = await WorkOrdersApi.listWorkOrderTasks(wo.id, token);
              console.log('[Publicacion] Tasks encontradas:', tasks);
              for (const task of tasks) {
                console.log('[Publicacion] Task:', task.task_name, 'cost:', task.cost);
                totalUSD += task.cost || 0;
                totalCRC += task.cost_crc ?? Math.round((task.cost || 0) * exchangeRate);
              }
            }
          }

          console.log('[Publicacion] Total retoques calculado:', { totalUSD, totalCRC });
          setRetoquesTotal({ totalUSD, totalCRC });
        } catch (error) {
          console.error("[Publicacion] Error loading retoques:", error);
          setRetoquesTotal({ totalUSD: 0, totalCRC: 0 });
        } finally {
          setLoadingRetoques(false);
        }
      } else {
        console.log('[Publicacion] No se cargaron retoques - falta vehicle_id o exchangeRate');
        setRetoquesTotal(null);
      }
    };
    loadRetoquesTotal();
  }, [viewingListing, exchangeRate]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadListings(),
        loadVehicles(),
        loadPublishedVehicles()
      ]);
      // Load exchange rate once
      const rate = await getExchangeRate();
      setExchangeRate(rate);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadListings = async () => {
    try {
      const data = await InspeccionApi.listVehicleListings();
      // Filtrar SOLO status_id 4 o 5
      const filtered = data.filter(l => {
        const statusId = l.vehicle?.status_id;
        return statusId === 4 || statusId === 5;
      });
      setListings(filtered);
    } catch (error) {
      console.error("Error loading listings:", error);
    }
  };

  const loadVehicles = async () => {
    try {
      // Carga vehículos listos para publicar (status 4)
      const data = await InspeccionApi.listPublicacionVehicles();
      setVehicles(data);
    } catch (error) {
      console.error("Error loading vehicles:", error);
    }
  };

  const loadPublishedVehicles = async () => {
    try {
      // Carga vehículos ya publicados (status 5)
      const data = await InspeccionApi.listPublishedVehicles();
      setPublishedVehicles(data);
    } catch (error) {
      console.error("Error loading published vehicles:", error);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setSelectedVehicleId("");
    setTitulo("");
    setPrecio("");
    setDescripcion("");
    setShowModal(true);
  };

  const handleOpenEditModal = (listingId: string) => {
    const listing = listings.find((l) => l.id === listingId);
    if (!listing) return;
    setEditingId(listingId);
    setSelectedVehicleId(listing.vehicle_id);
    setTitulo(listing.title);
    setPrecio(listing.price.toString());
    setDescripcion(listing.description || "");
    setShowModal(true);
  };

  const handleSavePublicacion = async () => {
    if (!selectedVehicleId || !titulo || !precio) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }
    try {
      // For create we need dealer_id; for edit we can skip auth lookup
      let dealerId: string | undefined;
      if (!editingId) {
        const authData = localStorage.getItem("adminAuthData");
        if (!authData) {
          toast({
            title: "Error",
            description: "No se encontró información de autenticación",
            variant: "destructive",
          });
          return;
        }
        const parsedAuth = JSON.parse(authData);
        dealerId = parsedAuth.dealer_id ||
          parsedAuth.user?.dealer_id ||
          parsedAuth.user?.id ||
          parsedAuth.user?.sub?.split(':')[1] ||
          parsedAuth.sub?.split(':')[1];
        if (!dealerId) {
          toast({
            title: "Error",
            description: "No se pudo obtener el dealer ID. Por favor inicia sesión nuevamente.",
            variant: "destructive",
          });
          return;
        }
      }
      const listingData = {
        vehicle_id: selectedVehicleId,
        dealer_id: dealerId!,
        title: titulo,
        description: descripcion || null,
        price: parseFloat(precio),
        currency: 'USD',
        status: 'published' as const,
        visibility: 'public' as const,
        featured: false,
        published_at: new Date().toISOString(),
      };
      if (editingId) {
        // Edit existing listing
        const updateData = {
          title: titulo,
          description: descripcion || null,
          price: parseFloat(precio),
          status: 'published' as const,
        };
        await InspeccionApi.updateVehicleListing(editingId, updateData);
        toast({
          title: "Éxito",
          description: "El anuncio se ha actualizado correctamente",
        });
      } else {
        // Create new listing
        await InspeccionApi.createVehicleListing(listingData);
        toast({
          title: "Éxito",
          description: "El anuncio se ha creado correctamente",
        });
      }
      setShowModal(false);
      await loadData();
    } catch (error: any) {
      const message = typeof error?.message === 'string' ? error.message : '';
      toast({
        title: "Error",
        description: message || "No se pudo guardar la publicación.",
        variant: "destructive",
      });
    }

  };

  const handleDeleteListing = async (listingId: string) => {
  if (!canActPublicacion) return;
    try {
      await InspeccionApi.deleteVehicleListing(listingId);
      toast({
        title: "Eliminado",
        description: "La publicación fue eliminada.",
      });
      setDeletingId(null);
      await loadData();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar la publicación.",
        variant: "destructive",
      });
    }
  };


  // Activa/desactiva publicación
  const handleToggleActivo = async (listingId: string) => {
    if (!canActPublicacion) return;
    const listing = listings.find((l) => l.id === listingId);
    if (!listing) return;
    const isPublished = listing.status === 'published';
    const action = isPublished ? InspeccionApi.archiveListing : InspeccionApi.publishListing;
    const actionName = isPublished ? "archivado" : "publicado";
    try {
      await action(listingId);
      // Cambiar el status_id del vehículo según la acción
      if (listing.vehicle_id) {
        if (isPublished) {
          // Si se archiva, volver a "Listo" (4)
          await InspeccionApi.updateVehicleStatus(listing.vehicle_id, 4);
        } else {
          // Si se publica, pasar a "Publicado" (5)
          await InspeccionApi.updateVehicleStatus(listing.vehicle_id, 5);
        }
      }
      toast({
        title: "\u00c9xito",
        description: `El anuncio ha sido ${actionName} correctamente.`,
      });
      await loadData(); // Recargar datos para reflejar el cambio
      // Notificar al sidebar para actualizar contadores
      window.dispatchEvent(new CustomEvent("vehicleDataChanged"));
    } catch (error: any) {
      const message = typeof error?.message === 'string' ? error.message : '';
      const status = error?.status ?? error?.response?.status ?? null;
      const isForbidden = status === 403 || /403|forbidden/i.test(message);

      toast({
        title: isForbidden ? "Permiso requerido" : "Error",
        description: isForbidden
          ? "No tienes permiso para publicar/archivar. Solicita el permiso 'listing.write' al administrador."
          : (message || `No se pudo cambiar el estado del anuncio.`),
        variant: "destructive",
      });
    }
  };

  // Handler para llevar a venta
  const handleLlevarAVenta = async (listing: InspeccionApi.VehicleListing) => {
  if (!canActPublicacion) return;
    if (!listing.vehicle_id) {
      toast({
        title: "Error",
        description: "No se pudo identificar el vehículo",
        variant: "destructive"
      });
      return;
    }

    const vehicleId = listing.vehicle_id;
    console.group('🛒 [handleLlevarAVenta] Iniciando proceso');
    console.log('1. Vehicle ID:', vehicleId);
    console.log('2. Status actual:', listing.vehicle?.status_id);
    console.log('3. Listing ID:', listing.id);

    try {
      // PASO 1: Actualización optimista - Remover del estado local INMEDIATAMENTE
      console.log('4. Removiendo del estado local (optimistic update)...');
      setListings(prevListings => {
        const filtered = prevListings.filter(l => l.vehicle_id !== vehicleId);
        console.log('   - Listings antes:', prevListings.length);
        console.log('   - Listings después:', filtered.length);
        return filtered;
      });

      // PASO 2: Actualizar status en el backend a "Vendido" (6)
      console.log('5. Actualizando status en backend a 6 (Vendido)...');
      await InspeccionApi.updateVehicleStatus(vehicleId, 6);

      // PASO 3: Diagnóstico después del cambio
      if (InspeccionApi.diagnoseVehicleStatusUpdate) {
        const diagAfter = await InspeccionApi.diagnoseVehicleStatusUpdate(vehicleId, 6);
        console.log('[handleLlevarAVenta] Diagnóstico después del update:', diagAfter);
      }

      toast({
        title: 'Vehículo vendido',
        description: 'El vehículo ha sido trasladado a la sección de venta.',
        variant: 'default'
      });

      // PASO 4: Recargar datos para asegurar consistencia
      await loadData();

      // PASO 5: Redirigir a la sección de Venta
      navigate('/venta');

      console.groupEnd();
    } catch (error: any) {
      console.error('❌ Error en handleLlevarAVenta:', error);
      console.groupEnd();

      // ROLLBACK: Revertir la actualización optimista
      await loadData();

      toast({
        title: 'Error',
        description: error?.message || 'No se pudo llevar el vehículo a venta.',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Publicación</h1>
          <p className="text-muted-foreground mt-2">
            Anuncio, fotos y precio sugerido contextual.
          </p>
        </div>
        {/* Botón Crear Anuncio eliminado */}
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Mis Anuncios</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : listings.length === 0 && publishedVehicles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No hay anuncios creados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Foto</th>
                  <th className="text-left p-4">Título</th>
                  <th className="text-left p-4">Vehículo</th>
                  <th className="text-left p-4">Precio</th>
                  <th className="text-left p-4">Estado</th>
                  <th className="text-left p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {/* Render listings SOLO status_id 4 o 5 */}
                {listings.filter(listing => {
                  const statusId = listing.vehicle?.status_id;
                  return statusId === 4 || statusId === 5;
                }).map((listing) => {
                  const vehiculo = listing.vehicle;
                  const titulo = listing.title || `${vehiculo?.make?.name || ''} ${vehiculo?.model?.name || ''} ${vehiculo?.year || ''}`;
                  const precio = listing.price || vehiculo?.price2 || vehiculo?.price1 || 0;
                  const isPublished = listing.status === 'published';
                  const crcDisplay = vehiculo?.price2_crc || (exchangeRate ? Math.round(precio * exchangeRate) : null);
                  // Filtrar URLs vacías o inválidas, pero permitir rutas relativas y base64
                  const imageUrls = vehiculo?.image_url?.split(',')
                    .map(u => u.trim())
                    .filter(u => !!u) || [];
                  // Si la URL no empieza con http(s) o data:, igual intentar mostrarla
                  const firstImage = imageUrls[0];

                  return (
                    <tr key={`listing-${listing.id}`} className="border-b">
                      {/* ...existing code... */}
                      <td className="p-4">
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                          {firstImage ? (
                            <img
                              src={firstImage}
                              alt={titulo}
                              className="w-full h-full object-cover cursor-zoom-in"
                              crossOrigin="anonymous"
                              referrerPolicy="no-referrer"
                              onClick={() => {
                                if (imageUrls.length > 0) {
                                  setImagePreviewUrls(imageUrls);
                                  setImagePreviewOpen(true);
                                }
                              }}
                            />
                          ) : (
                            <span className="text-xs text-gray-400">Sin foto</span>
                          )}
                        </div>
                      </td>
                      {/* ...existing code... */}
                      <td className="p-4 font-medium">{titulo}</td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div>{vehiculo?.make?.name || 'N/A'} {vehiculo?.model?.name || 'N/A'}</div>
                          <div className="text-gray-500">{vehiculo?.year || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold">${precio.toLocaleString()}</span>
                          {exchangeRate && (
                            <div className="text-sm text-muted-foreground">
                            {canActPublicacion ? (
                              editingCrcId === listing.id ? (
                                <div className="flex items-center gap-2">
                                  <Input
                                    autoFocus
                                    value={editingCrcValue}
                                    onChange={(e) => setEditingCrcValue(e.target.value)}
                                    className="h-8 w-36"
                                  />
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const normalized = editingCrcValue
                                          .replace(/[^0-9.,]/g, "")
                                          .replace(/,/g, "");
                                        const crcNum = Number(normalized);
                                      
                                        if (crcNum === crcDisplay) {
                                          setEditingCrcId(null);
                                          setEditingCrcValue("");
                                          return;
                                        }
                                        if (!Number.isFinite(crcNum) || crcNum <= 0) {
                                          toast({
                                            title: "Valor inválido",
                                            description: "Ingresa colones válidos.",
                                            variant: "destructive",
                                          });
                                          return;
                                        }
                                      
                                        await updateVehiclePriceCRC(listing.vehicle_id, undefined, crcNum);
                                      
                                        setListings((prev) =>
                                          prev.map((l) => {
                                            if (l.id === listing.id) {
                                              return {
                                                ...l,
                                                vehicle: { ...l.vehicle!, price2_crc: crcNum },
                                              };
                                            }
                                            return l;
                                          })
                                        );
                                      
                                        toast({
                                          title: "Precio actualizado",
                                          description: `Nuevo precio: ${formatCRC(crcNum)}`,
                                        });
                                      
                                        setEditingCrcId(null);
                                        setEditingCrcValue("");
                                      } catch (err: any) {
                                        const msg = typeof err?.message === "string" ? err.message : "";
                                        const status = err?.status ?? err?.response?.status ?? null;
                                        const forbidden = status === 403 || /403|forbidden/i.test(msg);
                                      
                                        toast({
                                          title: forbidden ? "Permiso requerido" : "Error",
                                          description: forbidden
                                            ? "No tienes permiso para editar el precio. Solicita 'listing.write'."
                                            : msg || "No se pudo actualizar el precio.",
                                          variant: "destructive",
                                        });
                                      }
                                    }}
                                  >
                                    Guardar
                                  </Button>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setEditingCrcId(null);
                                      setEditingCrcValue("");
                                    }}
                                  >
                                    Cancelar
                                  </Button>
                                </div>
                              ) : (
                                <button
                                  className="underline decoration-dotted hover:decoration-solid"
                                  onClick={() => {
                                    setEditingCrcId(listing.id!);
                                    setEditingCrcValue(crcDisplay ? crcDisplay.toString() : "");
                                  }}
                                  title="Editar en colones"
                                >
                                  {formatCRC(crcDisplay || 0)}
                                </button>
                              )
                            ) : (
                              // ✅ VISTA: solo texto, sin click
                              <span className="text-sm text-muted-foreground">
                                {formatCRC(crcDisplay || 0)}
                              </span>
                            )}
                            </div>
                          )}
                        </div>
                      </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {canActPublicacion ? (
                        <>
                          <Switch
                            checked={isPublished}
                            onCheckedChange={() => handleToggleActivo(listing.id!)}
                          />
                          <Badge variant={isPublished ? "default" : "secondary"}>
                            {isPublished ? "Publicado" : "Borrador"}
                          </Badge>
                        </>
                      ) : (
                        <Badge variant={isPublished ? "default" : "secondary"}>
                          {isPublished ? "Publicado" : "Borrador"}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setViewingListing(listing)}
                        title="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      {canActPublicacion && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingId(listing.id!)}
                            title="Eliminar publicación"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                      
                          {isPublished && (
                            <Button
                              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-md hover:shadow-lg transition-all duration-200 border-0"
                              size="sm"
                              onClick={() => handleLlevarAVenta(listing)}
                              title="Llevar a venta"
                            >
                              <span role="img" aria-label="carrito" className="mr-0.1 text-lg"></span> 
                              Llevar a venta
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                    </tr>
                  );
                })}

                {/* Render published vehicles without listings SOLO status_id 4 o 5 */}
                {publishedVehicles.filter(v => (v.status_id === 4 || v.status_id === 5) && !listings.some(l => l.vehicle_id === v.id)).map((vehiculo) => {
                  const titulo = `${vehiculo.make?.name || ''} ${vehiculo.model?.name || ''} ${vehiculo.year}`;
                  const precio = vehiculo.price2 || vehiculo.price1 || 0;

                  return (
                    <tr key={`vehicle-${vehiculo.id}`} className="border-b">
                      {/* ...existing code... */}
                      <td className="p-4">
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-400">Sin foto</span>
                        </div>
                      </td>
                      <td className="p-4 font-medium">{titulo}</td>
                      <td className="p-4">
                        <div className="text-sm">
                          <div>{vehiculo.make?.name || 'N/A'} {vehiculo.model?.name || 'N/A'}</div>
                          <div className="text-gray-500">{vehiculo.year || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold">
                          ${precio.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary">
                          Borrador
                        </Badge>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                        {canActPublicacion && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedVehicleId(vehiculo.id);
                              handleOpenCreateModal();
                            }}
                            title="Crear listing"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl" hideClose>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Anuncio" : "Crear Nuevo Anuncio"}
            </DialogTitle>
            <DialogDescription>
              Completa los detalles del anuncio para publicar el vehículo
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {!editingId && (
              <div className="grid gap-2">
                <Label htmlFor="vehiculo">Vehículo *</Label>
                <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                  <SelectTrigger id="vehiculo">
                    <SelectValue placeholder="Selecciona un vehículo" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 z-50">
                    {loading ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="ml-2 text-sm">Cargando vehículos...</span>
                      </div>
                    ) : vehicles.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 text-center">
                        No hay vehículos disponibles para publicar
                      </div>
                    ) : (
                      vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.make?.name || "N/A"} {v.model?.name || "N/A"} {v.year} - {v.license_plate || v.vin || "N/A"}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {vehicles.length === 0 && !loading && (
                  <p className="text-xs text-gray-500">
                    Los vehículos deben estar en estado "Listo" (status 4) para poder ser publicados
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="titulo">Título del Anuncio *</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej: Toyota Corolla 2018 impecable"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="precio">Precio *</Label>
              <Input
                id="precio"
                type="number"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="14500"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descripcion">Descripción (Opcional)</Label>
              <Textarea
                id="descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe las características destacadas del vehículo..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePublicacion}>
              {editingId ? "Actualizar" : "Crear"} Anuncio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Drawer (right side) */}
      <Drawer open={!!viewingListing} onOpenChange={() => setViewingListing(null)}>
        <DrawerContent className="ml-auto w-full sm:w-[480px] md:w-[560px] lg:w-[640px] h-full max-h-screen rounded-l-lg">
          <DrawerHeader>
            <DrawerTitle>Detalle de publicación</DrawerTitle>
          </DrawerHeader>
          {viewingListing ? (() => {
            const vehicle = viewingListing.vehicle;
            const rate = exchangeRate || 500;
            
            // Costo original (price1)
            const costoOriginalUSD = vehicle?.price1 || 0;
            const costoOriginalCRC = Math.round(costoOriginalUSD * rate);
            
            // Precio sugerido (price2)
            const precioSugeridoUSD = vehicle?.price2 || 0;
            const precioSugeridoCRC = vehicle?.price2_crc ?? Math.round(precioSugeridoUSD * rate);
            
            // Retoques
            const retoquesUSD = retoquesTotal?.totalUSD || 0;
            const retoquesCRC = retoquesTotal?.totalCRC || 0;
            
            // Costo total agregado (costo original + retoques)
            const costoTotalAgregadoUSD = costoOriginalUSD + retoquesUSD;
            const costoTotalAgregadoCRC = costoOriginalCRC + retoquesCRC;
            
            // Precio sugerido agregado (precio sugerido + retoques)
            const precioSugeridoAgregadoUSD = precioSugeridoUSD + retoquesUSD;
            const precioSugeridoAgregadoCRC = precioSugeridoCRC + retoquesCRC;
            
            // Ganancia = Precio sugerido agregado - Costo original
            const gananciaUSD = precioSugeridoAgregadoUSD - costoOriginalUSD;
            const gananciaCRC = precioSugeridoAgregadoCRC - costoOriginalCRC;
            const isGanancia = gananciaUSD >= 0;
            
            // Helper para formatear colones
            const formatColones = (value: number) => value.toLocaleString('es-CR');

            return (
            <div className="space-y-4 px-6 pb-6 overflow-y-auto h-[calc(100vh-100px)]">
              {/* Imagenes del vehículo */}
              {(() => {
                const urls = viewingListing.vehicle?.image_url?.split(',').filter(Boolean) || [];
                if (urls.length === 0) return null;
                return (
                  <div>
                    <span className="text-sm text-gray-500">Imágenes</span>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {urls.map((u, idx) => (
                        <div
                          key={idx}
                          className="w-full h-28 bg-gray-100 rounded overflow-hidden cursor-zoom-in"
                          onClick={() => {
                            setImagePreviewUrls(urls);
                            setImagePreviewOpen(true);
                          }}
                        >
                          <img
                            src={u}
                            alt={`Foto ${idx + 1}`}
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Información básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Título</span>
                  <p className="font-medium">{viewingListing.title}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Precio de Listado</span>
                  <p className="font-medium text-lg">${viewingListing.price?.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Estado</span>
                  <p>
                    <Badge variant={viewingListing.status === 'published' ? "default" : "secondary"}>
                      {viewingListing.status === 'published' ? "Publicado" : "Borrador"}
                    </Badge>
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Vehículo</span>
                  <p className="font-medium">
                    {vehicle?.make?.name || 'N/A'} {vehicle?.model?.name || 'N/A'} {vehicle?.year || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Placa, VIN y Colores */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <span className="text-sm text-gray-500">Placa</span>
                  <p className="font-medium">{vehicle?.license_plate || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">VIN</span>
                  <p className="font-medium text-xs">{vehicle?.vin || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Color Exterior</span>
                  <p className="font-medium">{vehicleDetails?.exteriorColor || vehicle?.exteriorColor || 'No especificado'}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Color Interior</span>
                  <p className="font-medium">{vehicleDetails?.interiorColor || vehicle?.interiorColor || 'No especificado'}</p>
                </div>
              </div>

              {/* Sección de Precios */}
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-3">Precios</h3>
                
                {loadingRetoques ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-sm text-muted-foreground">Cargando...</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Costo Total Agregado (price1 + retoques) */}
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <span className="text-xs text-blue-600">Costo Total Agregado</span>
                      <p className="font-bold text-lg text-blue-700">${costoTotalAgregadoUSD.toLocaleString()} <span className="text-sm text-blue-400">USD</span></p>
                      <p className="text-sm text-blue-600">₡{formatColones(costoTotalAgregadoCRC)}</p>
                      <p className="text-xs text-blue-400 mt-1">
                        ${costoOriginalUSD.toLocaleString()} + ${retoquesUSD.toLocaleString()} retoques
                      </p>
                    </div>

                    {/* Precio Sugerido Agregado (price2 + retoques) */}
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                      <span className="text-xs text-purple-600">Precio Sugerido Agregado</span>
                      <p className="font-bold text-lg text-purple-700">${precioSugeridoAgregadoUSD.toLocaleString()} <span className="text-sm text-purple-400">USD</span></p>
                      <p className="text-sm text-purple-600">₡{formatColones(precioSugeridoAgregadoCRC)}</p>
                      <p className="text-xs text-purple-400 mt-1">
                        ${precioSugeridoUSD.toLocaleString()} + ${retoquesUSD.toLocaleString()} retoques
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {viewingListing.description && (
                <div>
                  <span className="text-sm text-gray-500">Descripción</span>
                  <p className="mt-1">{viewingListing.description}</p>
                </div>
              )}
            </div>
          )})() : null}
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent className="max-w-md" hideClose>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="bg-red-100 rounded-full p-2">
                <Trash2 className="h-6 w-6 text-red-500" />
              </span>
              Eliminar publicación
            </DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas eliminar esta publicación? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-center gap-4 mt-4">
            <Button
              variant="destructive"
              onClick={() => deletingId && handleDeleteListing(deletingId)}
            >
              Eliminar
            </Button>
            <Button variant="outline" onClick={() => setDeletingId(null)}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Modal */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Fotos del vehículo</DialogTitle>
          </DialogHeader>
          {imagePreviewUrls.length > 0 ? (
            <Carousel className="w-full">
              <CarouselContent>
                {imagePreviewUrls.map((url, idx) => (
                  <CarouselItem key={idx} className="flex justify-center">
                    <img
                      src={url}
                      alt={`Foto ${idx + 1}`}
                      className="max-h-[70vh] w-auto object-contain rounded"
                      crossOrigin="anonymous"
                      referrerPolicy="no-referrer"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          ) : (
            <div className="text-center text-muted-foreground">No hay imágenes disponibles</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}