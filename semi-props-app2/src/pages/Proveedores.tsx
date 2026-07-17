import { ExternalLink, Phone, Mail, Plus, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/Authentication";
import { useState, useEffect } from "react";
// Asegúrate de que todas estas exportaciones existan en tu ProveedoresApi.ts
import {
  GetSuppliers,
  CreateSupplier,
  UpdateSupplier,
  DeleteSupplier,
  GetDealers,
  Dealer,
  GetSlug,
  Slug,
  GetTax,
  Tax,
  GetVehiclesBySupplier,
  VehicleInventory,
  Make,
  Model,
  getMakes,
  getModels
} from "@/lib/ProveedoresApi";

export default function Proveedores() {
  const { toast } = useToast();
  const auth = useAuth();

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
  if (["manage", "write", "action", "accion"].includes(g) && r === "accion") return true;

  return g === r;
};

// Proveedores: inv.proveedores controla CRUD
const canManageProveedores = permLoaded && hasPerm("inv.proveedores", "accion");

  // --- ESTADOS PRINCIPALES ---
  const [showAddModalAgregar, setShowAddModalAgregar] = useState(false);
  const [showAddModalActualizar, setShowAddModalActualizar] = useState(false);
  const [showAddModalEliminar, setShowAddModalEliminar] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- ESTADOS DE CATÁLOGOS ---
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [slugs, setSlugs] = useState<Slug[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [makes, setMakes] = useState<Make[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  // --- ESTADOS DE INVENTARIO ---
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<string | null>(null);
  const [inventory, setInventory] = useState<VehicleInventory[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [activeSlug, setActiveSlug] = useState<string>("");

  // --- ESTADOS DE PAGINACIÓN (Basado en PDF) [cite: 14-15] ---
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [goToPageInput, setGoToPageInput] = useState("");

  // --- EFECTOS DE CARGA DE DATOS ---

  // 1. Fetch Dealers
  useEffect(() => {
    const fetchDealers = async () => {
      try {
        const data = await GetDealers();
        setDealers(data);
      } catch (error: any) {
        console.error("Error fetching dealers:", error);
      }
    };
    fetchDealers();
  }, [auth.token]);

  // 2. Fetch Slugs
  useEffect(() => {
    const fetchSlugs = async () => {
      try {
        const data = await GetSlug();
        setSlugs(data);
        if (data.length > 0) {
          setActiveSlug(data[0].id_slug);
        }
      } catch (error: any) {
        console.error("Error fetching slugs:", error);
      }
    };
    fetchSlugs();
  }, [auth.token]);

  // 3. Fetch Taxes
  useEffect(() => {
    const fetchTax = async () => {
      try {
        const data = await GetTax();
        setTaxes(data);
      } catch (error: any) {
        console.error("Error fetching taxes:", error);
      }
    };
    fetchTax();
  }, [auth.token]);

  // 4. Fetch Marcas y Modelos (Para nombres en inventario)
  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const [makesData, modelsData] = await Promise.all([
          getMakes(),
          getModels()
        ]);
        setMakes(makesData);
        setModels(modelsData);
      } catch (error) {
        console.error("Error cargando catálogos de vehículos:", error);
      }
    };
    fetchCatalogos();
  }, [auth.token]);

  // 5. Fetch Proveedores (Lista principal)
  const fetchSuppliers = async () => {
    try {
      const data = await GetSuppliers();
      setSuppliers(data);
    } catch (error: any) {
      console.error("Error al obtener proveedores:", error);
      toast({
        title: "Error al cargar proveedores",
        description: error.message || "Ocurrió un error al obtener los proveedores.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [auth.token]);

  // --- LÓGICA DE PAGINACIÓN ---

  // Resetear página al cambiar de tab [cite: 41-43]
  useEffect(() => {
    setPage(1);
    setGoToPageInput("");
  }, [activeSlug]);

  // Filtrado actual basado en el Slug seleccionado
  const currentSlugSuppliers = suppliers.filter(
    (s) => s.slug === activeSlug
  );

  // Cálculos de paginación [cite: 26, 51]
  const totalCount = currentSlugSuppliers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  
  // Datos a mostrar en la página actual
  const paginatedSuppliers = currentSlugSuppliers.slice(startIndex, endIndex);

  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  // Manejo de input "Ir a página" [cite: 5-10]
  const handleGoToPage = () => {
    const n = Number(goToPageInput);
    if (!Number.isFinite(n)) return;
    const target = Math.max(1, Math.min(totalPages, Math.trunc(n)));
    setPage(target);
    setGoToPageInput("");
  };

  // Generador de botones de paginación (1 ... 4 5 6 ... 10) [cite: 53-88]
  const getPageItems = () => {
    const items: (number | "...")[] = [];
    
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
      return items;
    }

    const showLeftDots = page > 4;
    const showRightDots = page < totalPages - 3;

    items.push(1);

    if (showLeftDots) {
      items.push("...");
    } else {
      items.push(2, 3);
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

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

  // --- FORMULARIOS (ESTADOS) ---

  const [formDataAddSuppliers, setFormDataAddSuppliers] = useState({
    dealer: "",
    nombre: "",
    slug: "",
    email: "",
    telefono: "",
    tax: "",
    notas: "",
  });

  const [formDataUpdateSuppliers, setFormDataUpdateSuppliers] = useState({
    id: "",
    nombre: "",
    slug: "",
    email: "",
    telefono: "",
    tax_id: "",
    notas: "",
  });

  const [formDataDeleteSuppliers, setFormDataDeleteSuppliers] = useState({
    id: "",
    nombre: "" // Agregado para mostrar nombre al eliminar
  });

  // --- FUNCIONES AUXILIARES ---

  const getTaxDescription = (taxId: string) => {
    const tax = taxes.find((t) => t.tax_id === taxId);
    return tax ? tax.description : taxId; // Muestra ID si no encuentra descripción
  };

  // Carga de inventario real
  const handleOpenInventory = async (proveedorId: string) => {
    setSelectedProveedor(proveedorId);
    setShowInventoryModal(true);
    setInventory([]); 
    setLoadingInventory(true);

    try {
      const data = await GetVehiclesBySupplier(proveedorId);
      setInventory(data);
    } catch (error: any) {
      console.error("Error fetching inventory:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar el inventario.",
        variant: "destructive",
      });
    } finally {
      setLoadingInventory(false);
    }
  };

  // --- HANDLERS CRUD ---

const handleAddProveedor = async () => {
  // ================= VALIDACIONES FRONT =================

   // Dealer obligatorio
  if (!formDataAddSuppliers.dealer) {
    toast({
      title: "Error",
      description: "Debes seleccionar un dealer.",
      variant: "destructive",
    });
    return;
  }

  // Nombre obligatorio
  if (!formDataAddSuppliers.nombre.trim()) {
    toast({
      title: "Error",
      description: "El nombre del proveedor es obligatorio.",
      variant: "destructive",
    });
    return;
  }

  // Slug obligatorio
  if (!formDataAddSuppliers.slug) {
    toast({
      title: "Error",
      description: "Debes seleccionar un tipo (slug).",
      variant: "destructive",
    });
    return;
  }

  // Tax obligatorio
  if (!formDataAddSuppliers.tax) {
    toast({
      title: "Error",
      description: "Debes seleccionar un tipo de Tax.",
      variant: "destructive",
    });
    return;
  }

  // 📧 Email obligatorio y válido
  if (!formDataAddSuppliers.email.trim()) {
    toast({
      title: "Error",
      description: "El correo electrónico es obligatorio.",
      variant: "destructive",
    });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formDataAddSuppliers.email)) {
    toast({
      title: "Error",
      description: "El correo electrónico no es válido.",
      variant: "destructive",
    });
    return;
  }

  // Teléfono obligatorio y válido
  if (!formDataAddSuppliers.telefono.trim()) {
    toast({
      title: "Error",
      description: "El teléfono es obligatorio.",
      variant: "destructive",
    });
    return;
  }

  if (formDataAddSuppliers.telefono.trim().length < 6) {
    toast({
      title: "Error",
      description: "El teléfono ingresado no es válido.",
      variant: "destructive",
    });
    return;
  }

  const supplierName = formDataAddSuppliers.nombre.trim();
  const duplicateSupplier = suppliers.some(
    (supplier) =>
      String(supplier.dealer_id ?? "") === formDataAddSuppliers.dealer &&
      norm(supplier.name) === norm(supplierName)
  );

  if (duplicateSupplier) {
    toast({
      title: "Proveedor duplicado",
      description:
        "Ya existe una casa comercial con ese nombre para el dealer seleccionado.",
      variant: "destructive",
    });
    return;
  }

  // ================= CREACIÓN =================
  try {
    await CreateSupplier({
      p_dealer_id: formDataAddSuppliers.dealer,
      p_name: supplierName,
      p_slug: formDataAddSuppliers.slug,
      p_email: formDataAddSuppliers.email.trim(),
      p_phone: formDataAddSuppliers.telefono.trim(),
      p_tax_id: formDataAddSuppliers.tax,
      p_notes: formDataAddSuppliers.notas.trim() || null,
    });

    toast({
      title: "Proveedor agregado",
      description: "El proveedor se creó correctamente.",
    });

    setFormDataAddSuppliers({
      dealer: "",
      nombre: "",
      slug: "",
      email: "",
      telefono: "",
      tax: "",
      notas: "",
    });

    setShowAddModalAgregar(false);
    fetchSuppliers();
  } catch (error: any) {
    const isDuplicate =
      error?.code === "23505" ||
      String(error?.details ?? error?.message ?? "").includes(
        "suppliers_dealer_id_name_key"
      );

    toast({
      title: isDuplicate ? "Proveedor duplicado" : "Error",
      description: isDuplicate
        ? "Ya existe una casa comercial con ese nombre para el dealer seleccionado."
        : error?.message || "No se pudo crear el proveedor.",
      variant: "destructive",
    });
  }
};


  const handleOpenUpdateModal = (supplier: any) => {
    setFormDataUpdateSuppliers({
      id: supplier.id,
      nombre: supplier.name || "",
      slug: supplier.slug || "",
      email: supplier.email || "",
      telefono: supplier.phone || "",
      tax_id: supplier.tax_id || "",
      notas: supplier.notes || "",
    });
    setShowAddModalActualizar(true);
  };

const handleUpdateProveedor = async () => {
  // ================= VALIDACIONES FRONT =================

  if (!formDataUpdateSuppliers.id) {
    toast({
      title: "Error",
      description: "ID del proveedor no encontrado.",
      variant: "destructive",
    });
    return;
  }

  // Nombre obligatorio
  if (!formDataUpdateSuppliers.nombre.trim()) {
    toast({
      title: "Error",
      description: "El nombre del proveedor es obligatorio.",
      variant: "destructive",
    });
    return;
  }

  // Slug obligatorio
  if (!formDataUpdateSuppliers.slug) {
    toast({
      title: "Error",
      description: "Debes seleccionar un tipo (slug).",
      variant: "destructive",
    });
    return;
  }

  // Tax obligatorio
  if (!formDataUpdateSuppliers.tax_id) {
    toast({
      title: "Error",
      description: "Debes seleccionar un tipo de Tax.",
      variant: "destructive",
    });
    return;
  }

  // 📧 Email obligatorio y válido
  if (!formDataUpdateSuppliers.email.trim()) {
    toast({
      title: "Error",
      description: "El correo electrónico es obligatorio.",
      variant: "destructive",
    });
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formDataUpdateSuppliers.email)) {
    toast({
      title: "Error",
      description: "El correo electrónico no es válido.",
      variant: "destructive",
    });
    return;
  }

  // 📞 Teléfono obligatorio y válido
  if (!formDataUpdateSuppliers.telefono.trim()) {
    toast({
      title: "Error",
      description: "El teléfono es obligatorio.",
      variant: "destructive",
    });
    return;
  }

  if (formDataUpdateSuppliers.telefono.trim().length < 6) {
    toast({
      title: "Error",
      description: "El teléfono ingresado no es válido.",
      variant: "destructive",
    });
    return;
  }

  // ================= UPDATE =================
  try {
    await UpdateSupplier({
      p_id: formDataUpdateSuppliers.id,
      p_name: formDataUpdateSuppliers.nombre,
      p_slug: formDataUpdateSuppliers.slug,
      p_email: formDataUpdateSuppliers.email,
      p_phone: formDataUpdateSuppliers.telefono,
      p_tax_id: formDataUpdateSuppliers.tax_id,
      p_notes: formDataUpdateSuppliers.notas || null,
    });

    toast({
      title: "Actualizado",
      description: "Proveedor actualizado correctamente",
    });

    fetchSuppliers();
    setShowAddModalActualizar(false);
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  }
};


  const handleOpenDeleteModal = (supplier: any) => {
    setFormDataDeleteSuppliers({
      id: supplier.id,
      nombre: supplier.name // Guardamos el nombre para mostrarlo
    });
    setShowAddModalEliminar(true);
  };

  const handleDeleteProveedor = async (id: string) => {
    try {
      const confirmDelete = window.confirm("¿Seguro que deseas eliminar este proveedor?");
      if (!confirmDelete) return;
      await DeleteSupplier(id);
      toast({ title: "Eliminado", description: "Proveedor eliminado correctamente" });
      fetchSuppliers();
      setShowAddModalEliminar(false);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // --- RENDER ---
  if (loading) {
    return <div className="text-center py-10 text-muted-foreground">Cargando proveedores...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Proveedores</h1>
          <p className="text-muted-foreground mt-2">
            Gestión de proveedores y catálogos
          </p>
        </div>
        {canManageProveedores ? (
        <Button onClick={() => setShowAddModalAgregar(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar Proveedor
        </Button>
      ) : null}
      </div>

      {/* TABS Y CONTENIDO */}
      <Tabs value={activeSlug} onValueChange={setActiveSlug} className="w-full">
        <TabsList className={`grid w-full max-w-md`} style={{ gridTemplateColumns: `repeat(${slugs.length}, minmax(0, 1fr))` }}>
          {slugs.map((slug) => (
            <TabsTrigger key={slug.id_slug} value={slug.id_slug.toString()}>
              {slug.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {slugs.map((slug) => (
          <TabsContent key={slug.id_slug} value={slug.id_slug.toString()}>
            
            {/* --- BARRA SUPERIOR PAGINACIÓN (Mostrar X de Y) [cite: 90-122] --- */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
              <div className="text-sm text-muted-foreground">
                Mostrando {totalCount === 0 ? 0 : startIndex + 1} - {endIndex} de {totalCount}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Ver:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) => {
                    setPageSize(Number(v));
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[130px] h-8">
                    <SelectValue placeholder="Por pág." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 por página</SelectItem>
                    <SelectItem value="12">12 por página</SelectItem>
                    <SelectItem value="24">24 por página</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* --- GRID DE TARJETAS (Paginada) --- */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paginatedSuppliers.length === 0 ? (
                <div className="col-span-full text-center py-10 text-muted-foreground">
                  No hay proveedores en esta categoría.
                </div>
              ) : (
                paginatedSuppliers.map((proveedor) => {
                   // Búsquedas de nombres para mostrar en tarjeta en lugar de IDs
                   const slugInfo = slugs.find(s => s.id_slug === proveedor.slug);
                   const slugNombre = slugInfo ? slugInfo.name : proveedor.slug;
                   const taxNombre = getTaxDescription(proveedor.tax_id);

                   // Condición para ocultar inventario en Talleres/Servicios
                   const esServicio = slug.name.toLowerCase().includes("taller") || slug.name.toLowerCase().includes("servicio");

                   return (
                    <Card key={proveedor.id} className="hover:shadow-lg transition-all duration-200">
                      <CardHeader>
                        <CardTitle className="text-lg">{proveedor.name}</CardTitle>
                        <CardDescription>{slugNombre}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>{proveedor.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{proveedor.phone}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            <span>{taxNombre}</span>
                          </div>
                        </div>
                      </CardContent>
                  <CardFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {!esServicio && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenInventory(proveedor.id)}
                        className="sm:mr-2"
                      >
                        Ver Inventario
                      </Button>
                    )}
                  
                    {canManageProveedores ? (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenUpdateModal(proveedor)}
                          className="sm:mr-2"
                        >
                          Editar
                        </Button>
                    
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenDeleteModal(proveedor)}
                        >
                          Eliminar
                        </Button>
                      </>
                    ) : null}
                  </CardFooter>
                    </Card>
                   );
                })
              )}
            </div>

            {/* --- BARRA INFERIOR PAGINACIÓN (Botones e Input) [cite: 123-153] --- */}
            {totalCount > 0 && (
              <div className="flex flex-col md:flex-row justify-end items-center mt-6 gap-4">
                {/* Botones numéricos */}
                <div className="flex items-center gap-1 rounded-full border bg-card px-2 py-1 shadow-sm">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-7 w-7"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!canGoPrev}
                  >
                    {"<"}
                  </Button>

                  {getPageItems().map((item, idx) =>
                    item === "..." ? (
                      <div key={`dots-${idx}`} className="px-2 text-xs text-muted-foreground select-none">...</div>
                    ) : (
                      <Button
                        key={`page-${item}-${idx}`}
                        variant="ghost"
                        size="sm"
                        className={
                          item === page
                            ? "h-7 min-w-[2rem] rounded-full border border-gray-300 bg-black text-white shadow-sm hover:bg-black/90 hover:text-white"
                            : "h-7 min-w-[2rem] rounded-full"
                        }
                        onClick={() => setPage(item as number)}
                      >
                        {item}
                      </Button>
                    )
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-7 w-7"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={!canGoNext}
                  >
                    {">"}
                  </Button>
                </div>

                {/* Input "Ir a página" */}
                <div className="flex items-center gap-2 text-xs md:text-sm">
                  <span className="text-muted-foreground">Ir a pág.</span>
                  <Input
                    value={goToPageInput}
                    onChange={(e) => setGoToPageInput(e.target.value)}
                    className="h-8 w-14 text-center text-xs"
                    placeholder="#"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={handleGoToPage}
                  >
                    Ir
                  </Button>
                </div>
              </div>
            )}

          </TabsContent>
        ))}
      </Tabs>

      {/* --- MODALES --- */}

      {/* Modal Agregar */}
      <Dialog open={showAddModalAgregar} onOpenChange={setShowAddModalAgregar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Proveedor</DialogTitle>
            <DialogDescription>Completa los detalles</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="dealer">Dealer *</Label>
            <Select onValueChange={(v) => setFormDataAddSuppliers({...formDataAddSuppliers, dealer: v})} value={formDataAddSuppliers.dealer}>
               <SelectTrigger><SelectValue placeholder="Seleccione dealer" /></SelectTrigger>
               <SelectContent>
                 {dealers.map(d => <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>)}
               </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
             <Label htmlFor="nombre">Nombre *</Label>
             <Input value={formDataAddSuppliers.nombre} onChange={(e) => setFormDataAddSuppliers({...formDataAddSuppliers, nombre: e.target.value})} />
          </div>
          <div className="grid gap-2">
             <Label>Slug</Label>
             <Select onValueChange={(v) => setFormDataAddSuppliers({...formDataAddSuppliers, slug: v})} value={formDataAddSuppliers.slug}>
               <SelectTrigger><SelectValue placeholder="Slug" /></SelectTrigger>
               <SelectContent>
                 {slugs.map(s => <SelectItem key={s.id_slug} value={s.id_slug.toString()}>{s.name}</SelectItem>)}
               </SelectContent>
             </Select>
          </div>
          <div className="grid gap-2"><Label>Email</Label><Input type="email" value={formDataAddSuppliers.email} onChange={(e) => setFormDataAddSuppliers({...formDataAddSuppliers, email: e.target.value})} /></div>
          <div className="grid gap-2"><Label>Teléfono</Label><Input value={formDataAddSuppliers.telefono} onChange={(e) => setFormDataAddSuppliers({...formDataAddSuppliers, telefono: e.target.value})} /></div>
          <div className="grid gap-2">
             <Label>Tax</Label>
             <Select onValueChange={(v) => setFormDataAddSuppliers({...formDataAddSuppliers, tax: v})} value={formDataAddSuppliers.tax}>
               <SelectTrigger><SelectValue placeholder="Tax" /></SelectTrigger>
               <SelectContent>
                 {taxes.map(t => <SelectItem key={t.tax_id} value={t.tax_id.toString()}>{t.description}</SelectItem>)}
               </SelectContent>
             </Select>
          </div>
          <div className="grid gap-2"><Label>Notas (opcional)</Label><Input value={formDataAddSuppliers.notas} onChange={(e) => setFormDataAddSuppliers({...formDataAddSuppliers, notas: e.target.value})} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModalAgregar(false)}>Cancelar</Button>
            {canManageProveedores ? <Button onClick={handleAddProveedor}>Agregar</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Actualizar */}
      <Dialog open={showAddModalActualizar} onOpenChange={setShowAddModalActualizar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Actualizar Proveedor</DialogTitle>
            <DialogDescription>Edita los detalles</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid gap-2"><Label>Nombre</Label><Input value={formDataUpdateSuppliers.nombre} onChange={(e) => setFormDataUpdateSuppliers({...formDataUpdateSuppliers, nombre: e.target.value})} /></div>
             <div className="grid gap-2">
               <Label>Slug</Label>
               <Select onValueChange={(v) => setFormDataUpdateSuppliers({...formDataUpdateSuppliers, slug: v})} value={formDataUpdateSuppliers.slug}>
                 <SelectTrigger><SelectValue placeholder="Slug" /></SelectTrigger>
                 <SelectContent>
                   {slugs.map(s => <SelectItem key={s.id_slug} value={s.id_slug.toString()}>{s.name}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
             <div className="grid gap-2"><Label>Email</Label><Input value={formDataUpdateSuppliers.email} onChange={(e) => setFormDataUpdateSuppliers({...formDataUpdateSuppliers, email: e.target.value})} /></div>
             <div className="grid gap-2"><Label>Teléfono</Label><Input value={formDataUpdateSuppliers.telefono} onChange={(e) => setFormDataUpdateSuppliers({...formDataUpdateSuppliers, telefono: e.target.value})} /></div>
             <div className="grid gap-2">
               <Label>Tax ID</Label>
               <Select onValueChange={(v) => setFormDataUpdateSuppliers({...formDataUpdateSuppliers, tax_id: v})} value={formDataUpdateSuppliers.tax_id}>
                 <SelectTrigger><SelectValue placeholder="Tax" /></SelectTrigger>
                 <SelectContent>
                   {taxes.map(t => <SelectItem key={t.tax_id} value={t.tax_id.toString()}>{t.description}</SelectItem>)}
                 </SelectContent>
               </Select>
             </div>
             <div className="grid gap-2"><Label>Notas</Label><Input value={formDataUpdateSuppliers.notas} onChange={(e) => setFormDataUpdateSuppliers({...formDataUpdateSuppliers, notas: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModalActualizar(false)}>Cancelar</Button>
            {canManageProveedores ? <Button onClick={handleUpdateProveedor}>Guardar</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar */}
      <Dialog open={showAddModalEliminar} onOpenChange={setShowAddModalEliminar}>
        <DialogContent>
          <DialogHeader>
             <DialogTitle>Eliminar Proveedor</DialogTitle>
             <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
               <Label>Proveedor a eliminar</Label>
               {/* Muestra el nombre visualmente pero usa ID internamente */}
               <Input readOnly value={formDataDeleteSuppliers.nombre} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModalEliminar(false)}>Cancelar</Button>
            {canManageProveedores ? (
              <Button onClick={() => handleDeleteProveedor(formDataDeleteSuppliers.id)}>Eliminar</Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Inventario */}
      <Dialog open={showInventoryModal} onOpenChange={setShowInventoryModal}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Inventario de {selectedProveedor ? suppliers.find((p) => p.id === selectedProveedor)?.name : ""}
            </DialogTitle>
            <DialogDescription>Vehículos disponibles en la base de datos</DialogDescription>
          </DialogHeader>

          {loadingInventory ? (
            <div className="py-8 text-center">Cargando inventario...</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Marca</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Año</TableHead>
                    <TableHead>Transmisión</TableHead>
                    <TableHead>Precio Ref.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">Este proveedor no tiene vehículos asignados.</TableCell>
                    </TableRow>
                  ) : (
                    inventory.map((item, idx) => {
                       // Lookup de nombres para Marca y Modelo
                       const marcaNombre = makes.find(m => m.id === Number(item.make_id))?.name || item.make_id;
                       const modeloNombre = models.find(m => m.id === Number(item.model_id))?.name || item.model_id;
                       
                       return (
                         <TableRow key={idx}>
                           <TableCell className="font-medium">{marcaNombre}</TableCell>
                           <TableCell>{modeloNombre}</TableCell>
                           <TableCell>{item.year}</TableCell>
                           <TableCell>{item.transmission}</TableCell>
                           <TableCell className="font-semibold">{item.price2 ? `$${Number(item.price2).toLocaleString()}` : "N/A"}</TableCell>
                         </TableRow>
                       );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInventoryModal(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}