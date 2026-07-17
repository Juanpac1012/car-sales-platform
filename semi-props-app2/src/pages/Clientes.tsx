// OFERTAS DESHABILITADAS TEMPORALMENTE (enero 2026)

import React, { useEffect, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import { MoreVertical, Trash2 } from "lucide-react";

import {
  User, Phone, Mail, TrendingUp, Calendar, Plus, Eye, FileText,
  MessageSquare, ShoppingBag, Edit, Copy, CheckCircle, XCircle, UserCog
} from "lucide-react";

import type { Cliente } from "@/lib/customers/customers.types";
import { CustomersService } from "@/lib/customers/customers.service"; // nuevo

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import dataStoreDefault, { calcClienteKPIs, Cliente as ClienteType, Oferta as OfertaType, Interaccion as InteraccionType, defaultSeller, reassignClient } from "@/lib/dataStore";
import { useToast } from "@/hooks/use-toast";

// Cliente modular / API
import { client } from "@/lib/api.customer/client";
import type { APICreateCustomerRPC, APICreateInteractionRPC } from "@/lib/customers/customers.types";
import { InteractionsService } from "@/lib/customers/interactions.service";

const Clientes = () => {
  const dataStore = dataStoreDefault;
  const { toast } = useToast();

    // ✅ Permisos CRM (SIN hasPermission)
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

  // 👉 Ajustá este code si el tuyo es distinto en localStorage
  // Ejemplos comunes:
  // "crm.clientes": "accion"  ó  "crm.clientes": "vista"
  // "crm.clientes_crm": "accion"
  const crmScope =
    permLoaded
      ? (norm(permMap["crm.clientes"]) ||
         norm(permMap["crm.clientes_crm"]) ||
         norm(permMap["clientes"]))
      : "";

  //  Solo vista si NO es "accion"
  const isReadOnly = permLoaded && crmScope !== "accion";

  const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleString("es-CR") : "";

  //Paginacion
  const [goToPageInput, setGoToPageInput] = useState("");

  const handleGoToPage = () => {
  const n = Number(goToPageInput);
  if (!Number.isFinite(n)) return;

  const target = Math.max(1, Math.min(totalPages, Math.trunc(n)));
  setPage(target);
};

  const [comprasCliente, setComprasCliente] = useState<any[]>([]);
  const [loadingCompras, setLoadingCompras] = useState(false);

  // Búsqueda / filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [conversionFilter, setConversionFilter] = useState<"todos" | "alta" | "media" | "baja">("todos");

  const [selectedCliente, setSelectedCliente] = useState<ClienteType | null>(null);

  // Dialogs
  const [detailOpen, setDetailOpen] = useState(false);
  const [ofertaDialogOpen, setOfertaDialogOpen] = useState(false);
  const [interaccionDialogOpen, setInteraccionDialogOpen] = useState(false);
  const [motivoPerdidaDialogOpen, setMotivoPerdidaDialogOpen] = useState(false);
  const [reasignarDialogOpen, setReasignarDialogOpen] = useState(false);

  // Contexto
  const [selectedOferta, setSelectedOferta] = useState<OfertaType | null>(null);
  const [nuevoVendedorId, setNuevoVendedorId] = useState("");
  const [motivoPerdidaId, setMotivoPerdidaId] = useState("");

  // Nuevo cliente
  const [addClientOpen, setAddClientOpen] = useState(false);
  const [newClienteForm, setNewClienteForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
    preferenciaMarca: "",
    preferenciaModelo: "",
    presupuestoMax: "" as string,
      ownerId: "",
  });

type SalesPersonLight = {
  id: string;
  name: string;
  team?: string | null;
};

const [vendedoresReal, setVendedoresReal] = useState<SalesPersonLight[]>([]);
const [loadingVendedores, setLoadingVendedores] = useState(false);

useEffect(() => {
  if (!detailOpen || !selectedCliente) return;

  (async () => {
    setLoadingCompras(true);
    try {
      await client.ensureAuth();
      const apiBase = client.getApiBase();

      const res = await client.fetch(
        `${apiBase}/sales?customer_id=eq.${selectedCliente.id}&select=*,vehicle:vehicle_id(year,make:makes(name),model:models(name))&order=sold_at.desc`,
        { method: "GET" }
      );

      setComprasCliente(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Error cargando compras:", e);
      setComprasCliente([]);
    } finally {
      setLoadingCompras(false);
    }
  })();
}, [detailOpen, selectedCliente]);

useEffect(() => {
  let cancelled = false;

  (async () => {
    try {
      setLoadingVendedores(true);
      await client.ensureAuth();
      const apiBase = client.getApiBase();

      const res: any = await client.fetch(
        `${apiBase}/sales_person?is_active=eq.true&order=name.asc`,
        { method: "GET" }
      );

      if (cancelled) return;

      const arr = Array.isArray(res) ? res : [];

      setVendedoresReal(
        arr.map((u: any) => ({
          id: String(u.id),
          name: u.name ?? "",
          team: u.team ?? null,
        }))
      );
    } catch (error) {
      if (!cancelled) {
        console.error("Error cargando vendedores reales:", error);
      }
    } finally {
      if (!cancelled) {
        setLoadingVendedores(false);
      }
    }
  })();

  return () => {
    cancelled = true;
  };
}, []);

  // Editar cliente
  const [editClientOpen, setEditClientOpen] = useState(false);
  const [editClienteForm, setEditClienteForm] = useState({
    id: "",
    nombre: "",
    telefono: "",
    email: "",
    preferenciaMarca: "",
    preferenciaModelo: "",
    presupuestoMax: "" as string,
  });

      const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [clienteToDelete, setClienteToDelete] = useState<ClienteType | null>(null);

  // valida un UUID v4/simple (acepta 36 chars hex + guiones)
const isUuid = (s?: string | null): boolean => {
  if (!s || typeof s !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
};

  const [isSavingCliente, setIsSavingCliente] = useState(false);

  // Nueva oferta / interacción
  const [newOferta, setNewOferta] = useState({
    fuente: "INVENTARIO" as OfertaType["fuente"],
    vehiculoId: "",
    proveedorId: "",
    linkExterno: "",
    marca: "",
    modelo: "",
    anio: new Date().getFullYear(),
    precioOfertado: 0,
    validezDias: 7,
    notas: "",
  });

  const [newInteraccion, setNewInteraccion] = useState({
    canal: "WHATSAPP" as InteraccionType["canal"],
    nota: "",
  });

  // ----------------- Helpers -----------------
  const getUltimaActividad = (clienteId: string) => {
    const clienteOfertas = dataStore.ofertas.filter((o) => o.clienteId === clienteId);
    const clienteInteracciones = dataStore.interacciones.filter((i) => {
      const oferta = dataStore.ofertas.find((o) => o.id === i.ofertaId);
      return oferta?.clienteId === clienteId;
    });

    const fechas = [
      ...clienteOfertas.map((o) => new Date(o.updatedAt)),
      ...clienteInteracciones.map((i) => new Date(i.fecha)),
    ];

    if (fechas.length === 0) return "Sin actividad";
    const ultimaFecha = new Date(Math.max(...fechas.map((f) => f.getTime())));
    return ultimaFecha.toLocaleDateString("es-CR");
  };

  const getVendedorInfo = (vendedorId?: string) => {
  if (!vendedorId) return null;

  // 1) Buscar en vendedores reales (sales_person)
  const real = vendedoresReal.find((v) => String(v.id) === String(vendedorId));
  if (real) {
    return {
      id: real.id,
      nombre: real.name,
      equipo: real.team ?? "",
      email: undefined,
      telefono: undefined,
      activo: true,
      createdAt: "",
    } as any;
  }

  return dataStore.vendedores.find((v) => v.id === vendedorId) || null;
};

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // ----------------- Ofertas e Interacciones -----------------
  const handleCreateOferta = () => {
    if (!selectedCliente) return;

    const vehiculo = newOferta.fuente === "INVENTARIO"
      ? dataStore.vehiculos.find((v) => v.id === newOferta.vehiculoId)
      : null;

    const today = new Date();
    const validezHasta = new Date(today);
    validezHasta.setDate(validezHasta.getDate() + newOferta.validezDias);

    const oferta: OfertaType = {
      id: `O${String(dataStore.ofertas.length + 1).padStart(3, "0")}`,
      clienteId: selectedCliente.id,
      fuente: newOferta.fuente,
      vehiculo: vehiculo
        ? { id: vehiculo.id, marca: vehiculo.marca, modelo: vehiculo.modelo, anio: vehiculo.anio }
        : { marca: newOferta.marca, modelo: newOferta.modelo, anio: newOferta.anio },
      linkExterno: newOferta.fuente === "CRAUTOS" ? newOferta.linkExterno : undefined,
      proveedorId: newOferta.fuente === "PROVEEDOR" ? newOferta.proveedorId : undefined,
      precioOfertado: newOferta.precioOfertado,
      estado: "ENVIADA",
      validez: {
        desde: today.toISOString().split("T")[0],
        hasta: validezHasta.toISOString().split("T")[0],
      },
      notas: newOferta.notas,
      vendedorId: defaultSeller(),
      createdAt: today.toISOString().split("T")[0],
      updatedAt: today.toISOString().split("T")[0],
    };

    dataStore.ofertas.push(oferta);

    toast({
      title: "Oferta creada",
      description: `Se ha enviado la oferta a ${selectedCliente.nombre}`,
    });

    setOfertaDialogOpen(false);
    setNewOferta({
      fuente: "INVENTARIO",
      vehiculoId: "",
      proveedorId: "",
      linkExterno: "",
      marca: "",
      modelo: "",
      anio: new Date().getFullYear(),
      precioOfertado: 0,
      validezDias: 7,
      notas: "",
    });
  };

const handleAddInteraccion = async () => {
  if (!selectedOferta) return;

  const interaccion: InteraccionType = {
    id: `I${String(dataStore.interacciones.length + 1).padStart(3, "0")}`,
    ofertaId: selectedOferta.id,
    fecha: new Date().toISOString().split("T")[0],
    canal: newInteraccion.canal,
    nota: newInteraccion.nota,
  };

  // Actualizar store local
  dataStore.interacciones.push(interaccion);

  toast({
    title: "Interacción registrada",
    description: `Se ha añadido la nota en ${newInteraccion.canal}`,
  });

  try {
    const oferta = dataStore.ofertas.find((o) => o.id === selectedOferta.id);
    const customerId = oferta?.clienteId;

    if (customerId) {
      const payload: APICreateInteractionRPC = {
        p_customer_id: customerId,
        p_channel: interaccion.canal,
        p_subject: null,
        p_message: interaccion.nota,
        p_performed_by: null, // se completa en InteractionsService con el userId real
        p_performed_at: new Date().toISOString(),
      };

      // Ahora usamos el servicio que ya maneja login real
      await InteractionsService.create(payload);
    }
  } catch (err) {
    console.warn("No se pudo persistir la interacción al servidor:", err);
  }

  setInteraccionDialogOpen(false);
  setNewInteraccion({ canal: "WHATSAPP", nota: "" });
};

  // ----------------- Manejo de ofertas -----------------
  const handleMarcarGanada = (oferta: OfertaType) => {
    oferta.estado = "GANADA";
    oferta.updatedAt = new Date().toISOString().split("T")[0];
    toast({ title: "Oferta ganada", description: "La oferta se ha marcado como ganada" });
    setDetailOpen(false);
    setDetailOpen(true);
  };

  const handleMarcarPerdida = () => {
    if (!selectedOferta || !motivoPerdidaId) return;
    selectedOferta.estado = "PERDIDA";
    selectedOferta.motivoPerdidaId = motivoPerdidaId;
    selectedOferta.updatedAt = new Date().toISOString().split("T")[0];

    toast({ title: "Oferta perdida", description: "La oferta se ha marcado como perdida" });

    setMotivoPerdidaDialogOpen(false);
    setMotivoPerdidaId("");
    setDetailOpen(false);
    setDetailOpen(true);
  };

  const handleDuplicarOferta = (oferta: OfertaType) => {
    const newO: OfertaType = {
      ...oferta,
      id: `O${String(dataStore.ofertas.length + 1).padStart(3, "0")}`,
      estado: "ENVIADA",
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };
    dataStore.ofertas.push(newO);
    toast({ title: "Oferta duplicada", description: "Se ha creado una copia de la oferta" });
    setDetailOpen(false);
    setDetailOpen(true);
  };

  const getEstadoBadge = (estado: OfertaType["estado"]) => {
    const variants: Record<OfertaType["estado"], { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      ENVIADA: { variant: "outline", label: "Enviada" },
      NEGOCIANDO: { variant: "secondary", label: "Negociando" },
      GANADA: { variant: "default", label: "Ganada" },
      PERDIDA: { variant: "destructive", label: "Perdida" },
      CADUCADA: { variant: "outline", label: "Caducada" },
    };
    const { variant, label } = variants[estado];
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getFuenteBadge = (fuente: OfertaType["fuente"]) => {
    const labels: Record<OfertaType["fuente"], string> = {
      INVENTARIO: "Inventario",
      PROVEEDOR: "Proveedor",
      CRAUTOS: "Crautos",
    };
    return <Badge variant="outline">{labels[fuente]}</Badge>;
  };

const handleReasignarCliente = async () => {
  if (!selectedCliente || !nuevoVendedorId) return;

  try {
    await client.ensureAuth();

    // 1) Actualizar en el backend: government_id = nuevo vendedor
    await CustomersService.update(selectedCliente.id, {
      government_id: nuevoVendedorId,
    } as Partial<Cliente>);

    // 2) Actualizar localmente el cliente en dataStore
    const idx = dataStore.clientes.findIndex((c) => c.id === selectedCliente.id);
    if (idx >= 0) {
      dataStore.clientes[idx].ownerId = nuevoVendedorId;
    }

    // 3) (Opcional) Reutilizar tu lógica de ofertas existentes
    const result = reassignClient(selectedCliente.id, nuevoVendedorId);

    toast({
      title: "Cliente reasignado",
      description: `${selectedCliente.nombre} y ${result.ofertasActualizadas} ofertas activas reasignadas`,
    });

    setReasignarDialogOpen(false);
    setNuevoVendedorId("");
    setSelectedCliente(null);

    // 4) Recargar de backend para quedar alineados
    await loadData();
  } catch (e: any) {
    console.error("Error reasignando cliente:", e);
    toast({
      title: "No se pudo reasignar",
      description: e?.message || "Inténtalo nuevamente.",
      variant: "destructive",
    });
  }
};

// ----------------- Crear cliente -----------------
const handleCreateCliente = async () => {
  console.log("=== START handleCreateCliente ===");
  console.log("Form:", newClienteForm);

  // Validaciones
  if (!newClienteForm.nombre.trim() || !newClienteForm.telefono.trim()) {
    toast({ title: "Error", description: "Nombre y teléfono son obligatorios." });
    return;
  }
  if (newClienteForm.email?.trim()) {
    const email = newClienteForm.email.trim();
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) {
      toast({ title: "Error", description: "Formato de correo inválido." });
      return;
    }
  }

  // Cliente local temporal (optimistic UI)
  const tempId = `C${String(dataStore.clientes.length + 1).padStart(4, "0")}`;
  const clienteLocal: ClienteType & { syncStatus?: string } = {
    id: tempId,
    nombre: newClienteForm.nombre.trim(),
    telefono: newClienteForm.telefono.trim(),
    email: newClienteForm.email?.trim() || undefined,
    ownerId: newClienteForm.ownerId || undefined,
    preferencia:
      newClienteForm.preferenciaMarca ||
      newClienteForm.preferenciaModelo ||
      newClienteForm.presupuestoMax
        ? {
            marca: newClienteForm.preferenciaMarca || undefined,
            modelo: newClienteForm.preferenciaModelo || undefined,
            presupuestoMax: newClienteForm.presupuestoMax
              ? parseFloat(newClienteForm.presupuestoMax)
              : undefined,
          }
        : undefined,
    createdAt: new Date().toISOString().split("T")[0],
    updatedAt: new Date().toISOString().split("T")[0],
    syncStatus: "syncing",
  };

  // Agregar localmente
  dataStore.clientes.push(clienteLocal);
  toast({
    title: "Cliente agregado (local)",
    description: `Cliente ${clienteLocal.nombre} agregado al CRM. Intentando sincronizar con servidor...`,
  });

  // Reset UI del formulario
  setAddClientOpen(false);
  setNewClienteForm({
    nombre: "",
    telefono: "",
    email: "",
    preferenciaMarca: "",
    preferenciaModelo: "",
    presupuestoMax: "",
    ownerId: "",
  });

  // 🔐 Asegurar sesión (login/refresh si toca)
  await client.ensureAuth();

  setIsSavingCliente(true);
  try {
const created = await CustomersService.create({
  id: "",
  name: clienteLocal.nombre,
  phone: clienteLocal.telefono,
  email: clienteLocal.email ?? null,
  government_id: newClienteForm.ownerId || null,
  notes: clienteLocal.preferencia ? JSON.stringify(clienteLocal.preferencia) : null,
  ownerId: undefined,
} as any);

    const serverId = created?.id;
    const idx = dataStore.clientes.findIndex((c) => c.id === tempId);
    if (idx >= 0) {
      if (serverId) dataStore.clientes[idx].id = serverId;
      // @ts-ignore
      dataStore.clientes[idx].syncStatus = "synced";
    }

    // 🔄 Recargar para alinear con backend
    await loadData();

    toast({
      title: "Sincronización exitosa",
      description: `Cliente ${clienteLocal.nombre} guardado en servidor.`,
    });
  } catch (rpcErr: any) {
    const msg = String(rpcErr?.message || "");
    if (msg.includes("409") || msg.toLowerCase().includes("duplicate key")) {
      await loadData();
      const j = dataStore.clientes.findIndex((c: any) => c.telefono === clienteLocal.telefono);
      if (j >= 0) {
        // @ts-ignore
        dataStore.clientes[j].syncStatus = "synced";
      }
      toast({ title: "Ya existía", description: "El teléfono ya estaba registrado. Se sincronizó la lista." });
    } else {
      console.warn("create_customer falló:", rpcErr);
      const idx = dataStore.clientes.findIndex((c) => c.id === tempId);
      if (idx >= 0) {
        // @ts-ignore
        dataStore.clientes[idx].syncStatus = "error";
      }
      toast({
        title: "Error sincronizando cliente",
        description: rpcErr?.message || "No se pudo guardar el cliente en el servidor.",
        variant: "destructive",
      });
    }
  } finally {
    setIsSavingCliente(false);
  }
};

// --- actualizar cliente ---
const handleUpdateCliente = async () => {
  setIsSavingCliente(true);
  try {
    await client.ensureAuth();

    if (!editClienteForm.nombre.trim() || !editClienteForm.telefono.trim()) {
      toast({
        title: "Datos incompletos",
        description: "Nombre y teléfono son obligatorios.",
        variant: "destructive",
      });
      return;
    }

    // Preparar notas (preferencias)
    const preferencias: any = {};
    if (editClienteForm.preferenciaMarca) preferencias.marca = editClienteForm.preferenciaMarca;
    if (editClienteForm.preferenciaModelo) preferencias.modelo = editClienteForm.preferenciaModelo;
    if (editClienteForm.presupuestoMax) {
      const pMax = parseFloat(editClienteForm.presupuestoMax);
      if (!isNaN(pMax)) preferencias.presupuestoMax = pMax;
    }

    const payload: Partial<Cliente> = {
      name: editClienteForm.nombre,
      phone: editClienteForm.telefono,
      email: editClienteForm.email || null,
      notes: Object.keys(preferencias).length > 0 ? JSON.stringify(preferencias) : null,
    };

    // Llamar al servicio de actualización
    await CustomersService.update(editClienteForm.id, payload);

    // Actualizar localmente
    const idx = dataStore.clientes.findIndex((c) => c.id === editClienteForm.id);
    if (idx >= 0) {
      dataStore.clientes[idx].nombre = editClienteForm.nombre;
      dataStore.clientes[idx].telefono = editClienteForm.telefono;
      dataStore.clientes[idx].email = editClienteForm.email || "";
      if (Object.keys(preferencias).length > 0) {
        dataStore.clientes[idx].preferencia = preferencias;
      }
    }

    await loadData();
    setEditClientOpen(false);
    setEditClienteForm({
      id: "",
      nombre: "",
      telefono: "",
      email: "",
      preferenciaMarca: "",
      preferenciaModelo: "",
      presupuestoMax: "",
    });

    toast({
      title: "Cliente actualizado",
      description: `${editClienteForm.nombre} ha sido actualizado correctamente.`,
    });
  } catch (e: any) {
    console.error("handleUpdateCliente error:", e);
    toast({
      title: "Error actualizando cliente",
      description: e?.message || "No se pudo actualizar el cliente.",
      variant: "destructive",
    });
  } finally {
    setIsSavingCliente(false);
  }
};

// --- eliminar cliente ---
async function handleDeleteCliente(clienteId: string) {
  try {
    await client.ensureAuth();

    if (isUuid(clienteId)) {
      await CustomersService.delete(clienteId);
    } else {
      console.info("ID local temporal, se eliminará solo del store:", clienteId);
    }

    // 🧹 Limpieza local: ofertas e interacciones ligadas
    dataStore.interacciones = dataStore.interacciones.filter(i => {
      const of = dataStore.ofertas.find(o => o.id === i.ofertaId);
      return of ? of.clienteId !== clienteId : true;
    });
    dataStore.ofertas = dataStore.ofertas.filter(o => o.clienteId !== clienteId);

    // Y finalmente eliminar el cliente
    const idx = dataStore.clientes.findIndex((c) => c.id === clienteId);
    if (idx >= 0) dataStore.clientes.splice(idx, 1);

    await loadData();

    toast({
      title: "Cliente eliminado",
      description: "El cliente y sus datos relacionados fueron eliminados correctamente.",
    });
  } catch (e: any) {
    console.error("handleDeleteCliente error:", e);
    toast({
      title: "No se pudo eliminar",
      description: e?.message || "Inténtalo nuevamente.",
      variant: "destructive",
    });
  }
}

// --- estado/efectos para listado server-side ---
const [loadingList, setLoadingList] = useState(false);
const [errorList, setErrorList] = useState<string | null>(null);

const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(20);                // 👈 seleccionable
const [totalCount, setTotalCount] = useState(0);             // 👈 del backend
const [order, setOrder] = useState<"name.asc" | "name.desc">("name.asc"); // 👈


// Usa tu propio useDebounce si ya lo definiste antes
function useDebounce<T>(value: T, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
const debouncedSearch = useDebounce(searchTerm, 400);

const loadData = async () => {
  try {
    setLoadingList(true);
    setErrorList(null);

    await client.ensureAuth();

    const offset = (page - 1) * pageSize;
    const { items, total } = await CustomersService.list({
      search: debouncedSearch || null,
      limit: pageSize,
      offset,
      order,
    });

    // Mapea a tu shape local
dataStore.clientes = items.map((c) => ({
  id: c.id,
  nombre: c.name ?? "",
  telefono: c.phone ?? "",
  email: c.email ?? undefined,
  preferencia: (() => {
    try {
      return c.notes ? JSON.parse(c.notes) : undefined;
    } catch {
      return undefined;
    }
  })(),
  createdAt: new Date().toISOString().split("T")[0],
  updatedAt: new Date().toISOString().split("T")[0],
  ownerId: c.government_id ? String(c.government_id) : undefined,
}));


    setTotalCount(total);
  } catch (e: any) {
    setErrorList(e?.message || "No se pudo cargar el listado.");
  } finally {
    setLoadingList(false);
  }
};


useEffect(() => {
  setPage(1); // cada vez que cambia la búsqueda, vuelve a la primera página
}, [debouncedSearch]);

useEffect(() => {
  loadData();
}, [debouncedSearch, page, pageSize, order]);

const filteredClientes = dataStore.clientes.filter((c) => {
  if (conversionFilter === "todos") return true;
  const kpis = calcClienteKPIs(c.id);
  if (conversionFilter === "alta")  return kpis.conversion >= 70;
  if (conversionFilter === "media") return kpis.conversion >= 30 && kpis.conversion < 70;
  if (conversionFilter === "baja")  return kpis.conversion < 30;
  return true;
});


// Paginación simple
const canGoPrev = page > 1;
const canGoNext = page * pageSize < totalCount;
const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

const getPageItems = () => {
  const items: (number | "...")[] = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) items.push(i);
    return items;
  }

  const showLeftDots = page > 4;
  const showRightDots = page < totalPages - 3;

  // Siempre la primera página
  items.push(1);

  // Bloque izquierdo
  if (showLeftDots) {
    items.push("...");
  } else {
    items.push(2, 3);
  }

  // Bloque central alrededor de la página actual
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  for (let i = start; i <= end; i++) {
    if (!items.includes(i)) items.push(i);
  }

  // Bloque derecho (penúltimas páginas)
  if (showRightDots) {
    items.push("...");
  } else {
    for (let i = totalPages - 2; i <= totalPages - 1; i++) {
      if (i > 1 && i < totalPages && !items.includes(i)) {
        items.push(i);
      }
    }
  }

  // Siempre la última página
  if (!items.includes(totalPages)) items.push(totalPages);

  return items;
};

// --- Render (UI completo) ---
return (
  <div className="space-y-6">
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clientes CRM</h1>
        <p className="text-muted-foreground">Gestiona tus clientes y ofertas</p>
      </div>

      <div className="flex items-center gap-2">
      {!isReadOnly && (
        <Button onClick={() => setAddClientOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Agregar cliente
        </Button>
      )}
      </div>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Lista de Clientes</CardTitle>
        <CardDescription>Filtra y busca entre tus clientes</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filtros superiores */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
          {/* Búsqueda + campo */}
          <div className="flex-1 flex gap-2">
            <Input
              placeholder="Buscar por nombre, teléfono o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Conversión + tamaño página + orden */}
          <div className="flex gap-2">
            <Select value={conversionFilter} onValueChange={(v: any) => setConversionFilter(v)}>
              <SelectTrigger className="w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="alta">Conversión alta (≥70%)</SelectItem>
                <SelectItem value="media">Conversión media (30-70%)</SelectItem>
                <SelectItem value="baja">Conversión baja (&lt;30%)</SelectItem>
              </SelectContent>
            </Select>

            {/* NEW: tamaño de página */}
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

            {/* NEW: orden A–Z / Z–A */}
            <Select
              value={order}
              onValueChange={(v: any) => {
                setOrder(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Orden" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name.asc">Nombre (A–Z)</SelectItem>
                <SelectItem value="name.desc">Nombre (Z–A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Rango mostrado / total */}
        {!loadingList && (
          <div className="text-sm text-muted-foreground mb-2">
            Mostrando{" "}
            {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}
            {"–"}
            {Math.min(page * pageSize, totalCount)}
            {" de "}
            {totalCount}
          </div>
        )}

        {/* estados de carga/error */}
        {loadingList && (
          <div className="rounded-md border p-4 text-sm text-muted-foreground">
            Cargando clientes…
          </div>
        )}
        {errorList && !loadingList && (
          <div className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-700 mb-4">
            {errorList}
          </div>
        )}

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Dueño</TableHead>
                <TableHead className="text-center">Ofertas</TableHead>
                <TableHead className="text-center">Conversión</TableHead>
                <TableHead>Última Actividad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!loadingList && filteredClientes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    No hay clientes que coincidan con los filtros.
                  </TableCell>
                </TableRow>
              )}

              {filteredClientes.map((cliente) => {
                const kpis = calcClienteKPIs(cliente.id);
                const vendedor = getVendedorInfo(cliente.ownerId);
                return (
                  <TableRow key={cliente.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{cliente.nombre}</span>

                        {(cliente as any).syncStatus === "syncing" && (
                          <Badge variant="outline" className="ml-2">Sincronizando</Badge>
                        )}
                        {(cliente as any).syncStatus === "synced" && (
                          <Badge variant="secondary" className="ml-2">Sync</Badge>
                        )}
                        {(cliente as any).syncStatus === "error" && (
                          <Badge variant="destructive" className="ml-2">Error sync</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm space-y-1">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          <span>{cliente.telefono}</span>
                        </div>
                        {cliente.email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{cliente.email}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {vendedor ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={vendedor.foto} />
                            <AvatarFallback>{vendedor.nombre.slice(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{vendedor.nombre}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin asignar</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{kpis.ofertasTotales}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TrendingUp className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{kpis.conversion.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {getUltimaActividad(cliente.id)}
                      </div>
                    </TableCell>

                    {/* Acciones */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label="Abrir acciones">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-48">
                      {/* ✅ Ver siempre */}
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedCliente(cliente);
                          setDetailOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver
                      </DropdownMenuItem>
                      
                      {/* ✅ Todo lo demás solo si NO es vista */}
                      {!isReadOnly && (
                        <>
                          <DropdownMenuItem
                            onClick={() => {
                              setEditClienteForm({
                                id: cliente.id,
                                nombre: cliente.nombre,
                                telefono: cliente.telefono,
                                email: cliente.email || "",
                                preferenciaMarca: cliente.preferencia?.marca || "",
                                preferenciaModelo: cliente.preferencia?.modelo || "",
                                presupuestoMax: cliente.preferencia?.presupuestoMax?.toString() || "",
                              });
                              setEditClientOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedCliente(cliente);
                              setReasignarDialogOpen(true);
                            }}
                          >
                            <UserCog className="h-4 w-4 mr-2" />
                            Reasignar
                          </DropdownMenuItem>
                          
                          {/*
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedCliente(cliente);
                              setOfertaDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Nueva oferta
                          </DropdownMenuItem>
                          
                          {(cliente as any).syncStatus === "error" && (
                            <DropdownMenuItem
                              onClick={async () => {
                                setIsSavingCliente(true);
                                try {
                                  const payload: APICreateCustomerRPC = {
                                    p_name: cliente.nombre,
                                    p_phone: cliente.telefono,
                                    p_email: cliente.email || null,
                                    p_owner_id: (cliente as any).ownerId || null,
                                    p_notes: cliente.preferencia ? JSON.stringify(cliente.preferencia) : null,
                                    p_government_id: null,
                                  };
                                  const rpcRes = await client.rpc("create_customer", payload, client.getToken());
                                  const serverRecord = Array.isArray(rpcRes) ? rpcRes[0] : rpcRes;
                                  if (serverRecord && (serverRecord.id || serverRecord.customer_id)) {
                                    const serverId = serverRecord.id || serverRecord.customer_id;
                                    const idx = dataStore.clientes.findIndex((c) => c.id === cliente.id);
                                    if (idx >= 0) {
                                      dataStore.clientes[idx].id = serverId;
                                      // @ts-ignore
                                      dataStore.clientes[idx].syncStatus = "synced";
                                    }
                                  } else {
                                    // @ts-ignore
                                    (cliente as any).syncStatus = "synced";
                                  }
                                  toast({ title: "Reintento exitoso", description: `Cliente ${cliente.nombre} sincronizado.` });
                                } catch (e: any) {
                                  toast({ title: "Reintento fallido", description: e?.message || "No se pudo sincronizar." });
                                } finally {
                                  setIsSavingCliente(false);
                                }
                              }}
                            >
                              Reintentar sync
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />
                          */}

                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-700"
                            onSelect={(e) => {
                              e.preventDefault();
                              setClienteToDelete(cliente);
                              setConfirmDeleteOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

  
  <div className="flex justify-end mt-4">
  <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
    
    {/* Bloque de paginación principal */}
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
      key={`page-${item}-${idx}`}  // ✅ key única y estable
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

    {/* Bloque: Ir a la página */}
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

      </CardContent>
    </Card>

    {/* 🔔 AlertDialog GLOBAL (fuera del map y del menú) */}
    <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar cliente</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará el cliente
            <span className="font-semibold">{" "}{clienteToDelete?.nombre}</span> y sus datos asociados.
            ¿Deseas continuar?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            onClick={async () => {
              if (clienteToDelete) {
                await handleDeleteCliente(clienteToDelete.id);
              }
              setConfirmDeleteOpen(false);
              setClienteToDelete(null);
            }}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    {/* Client 360 Detail Dialog */}
    <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        {selectedCliente && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {selectedCliente.nombre}
              </DialogTitle>
              <DialogDescription>Vista completa del cliente</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="resumen" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="resumen">Resumen</TabsTrigger>

                {/*
                <TabsTrigger value="ofertas">Ofertas</TabsTrigger>
                <TabsTrigger value="interacciones">Interacciones</TabsTrigger>
                */}

                <TabsTrigger value="compras">Compras</TabsTrigger>
              </TabsList>


              <TabsContent value="resumen" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/*
                  {(() => {
                    const kpis = calcClienteKPIs(selectedCliente.id);
                    return (
                      <>
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Total Ofertas</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{kpis.ofertasTotales}</div>
                          </CardContent>
                        </Card>
                  
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Conversión</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">{kpis.conversion.toFixed(0)}%</div>
                            <p className="text-xs text-muted-foreground">
                              {kpis.ganadas} ganadas / {kpis.perdidas} perdidas
                            </p>
                          </CardContent>
                        </Card>
                  
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium">Ticket Promedio</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-bold">
                              {formatCurrency(kpis.ticketPromedioGanado)}
                            </div>
                          </CardContent>
                        </Card>
                      </>
                    );
                  })()}
                  */}

                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Preferencias</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedCliente.preferencia ? (
                      <div className="space-y-2 text-sm">
                        {selectedCliente.preferencia.marca && (
                          <div>
                            <span className="font-medium">Marca:</span> {selectedCliente.preferencia.marca}
                          </div>
                        )}
                        {selectedCliente.preferencia.modelo && (
                          <div>
                            <span className="font-medium">Modelo:</span> {selectedCliente.preferencia.modelo}
                          </div>
                        )}
                        {selectedCliente.preferencia.presupuestoMax && (
                          <div>
                            <span className="font-medium">Presupuesto máx:</span>{" "}
                            {formatCurrency(selectedCliente.preferencia.presupuestoMax)}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sin preferencias declaradas</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
{/*
                <TabsContent value="ofertas" className="space-y-4">
                  {dataStore.ofertas
                    .filter((o) => o.clienteId === selectedCliente.id)
                    .map((oferta) => (
                      <Card key={oferta.id}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <CardTitle className="text-base">
                                {oferta.vehiculo?.marca} {oferta.vehiculo?.modelo} {oferta.vehiculo?.anio}
                              </CardTitle>
                              <div className="flex gap-2">
                                {getEstadoBadge(oferta.estado)}
                                {getFuenteBadge(oferta.fuente)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">{formatCurrency(oferta.precioOfertado)}</div>
                              <div className="text-xs text-muted-foreground">
                                Válido: {oferta.validez.desde} - {oferta.validez.hasta}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {oferta.notas && (
                            <p className="text-sm text-muted-foreground mb-3">{oferta.notas}</p>
                          )}
                          {oferta.linkExterno && (
                            <a
                              href={oferta.linkExterno}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              Ver enlace externo →
                            </a>
                          )}
                          <div className="flex gap-2 mt-4 flex-wrap">
                            
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedOferta(oferta);
                                setInteraccionDialogOpen(true);
                              }}
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Añadir Nota
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDuplicarOferta(oferta)}
                            >
                              <Copy className="h-4 w-4 mr-1" />
                              Duplicar
                            </Button>
                            
                            {oferta.estado === "NEGOCIANDO" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => handleMarcarGanada(oferta)}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Marcar Ganada
                                </Button>

                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedOferta(oferta);
                                    setMotivoPerdidaDialogOpen(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Marcar Perdida
                                </Button>                        
                              </>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </TabsContent>
                
                <TabsContent value="interacciones" className="space-y-4">
                  {dataStore.interacciones
                    .filter((i) => {
                      const oferta = dataStore.ofertas.find((o) => o.id === i.ofertaId);
                      return oferta?.clienteId === selectedCliente.id;
                    })
                    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                    .map((interaccion) => {
                      const oferta = dataStore.ofertas.find((o) => o.id === interaccion.ofertaId);
                      return (
                        <Card key={interaccion.id}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{interaccion.canal}</Badge>
                                <span className="text-sm text-muted-foreground">{interaccion.fecha}</span>
                              </div>
                      
                              {oferta && (
                                <span className="text-xs text-muted-foreground">
                                  Ref: {oferta.vehiculo?.marca} {oferta.vehiculo?.modelo}
                                </span>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm">{interaccion.nota}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                </TabsContent>
              */}
                <TabsContent value="compras" className="space-y-4">
                  {loadingCompras && (
                    <p className="text-center text-muted-foreground py-8">Cargando compras…</p>
                  )}

                  {!loadingCompras &&
                    comprasCliente.map((venta: any) => {
                      const currency = String(venta.currency ?? "CRC").toUpperCase();
                    
                      const amount =
                        currency === "USD"
                          ? Number(venta.price_final ?? 0)
                          : Number(venta.price_final_crc ?? venta.price_final ?? 0);
                    
                      const montoFmt = new Intl.NumberFormat("es-CR", {
                        style: "currency",
                        currency: currency === "USD" ? "USD" : "CRC",
                        minimumFractionDigits: currency === "USD" ? 2 : 0,
                      }).format(amount);
                    
                      const fechaFmt = venta.sold_at
                        ? new Date(venta.sold_at).toLocaleString("es-CR")
                        : "—";
                    
                      return (
                        <Card key={venta.id}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div>
                                <CardTitle className="text-base">
                                  {venta.vehicle?.make?.name ?? "Marca"} {venta.vehicle?.model?.name ?? "Modelo"} {venta.vehicle?.year ?? ""}
                                </CardTitle>


                                <p className="text-sm text-muted-foreground">Fecha: {fechaFmt}</p>
                                <p className="text-xs text-muted-foreground">
                                  Estado: {venta.status ?? "—"}
                                </p>
                              </div>
                      
                              <div className="text-right">
                                <div className="text-lg font-bold">{montoFmt}</div>
                                <Badge variant="outline">{venta.payment_method ?? "—"}</Badge>
                              </div>
                            </div>
                          </CardHeader>
                        </Card>
                      );
                    })}
                  
                  {!loadingCompras && comprasCliente.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">Sin compras registradas</p>
                  )}
                </TabsContent>

              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>
{/*

      <Dialog open={ofertaDialogOpen} onOpenChange={setOfertaDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Oferta</DialogTitle>
            <DialogDescription>
              Crear oferta para {selectedCliente?.nombre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Fuente</Label>
              <Select
                value={newOferta.fuente}
                onValueChange={(v: OfertaType["fuente"]) => setNewOferta({ ...newOferta, fuente: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INVENTARIO">Inventario</SelectItem>
                  <SelectItem value="PROVEEDOR">Proveedor</SelectItem>
                  <SelectItem value="CRAUTOS">Crautos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newOferta.fuente === "INVENTARIO" && (
              <div>
                <Label>Vehículo</Label>
                <Select
                  value={newOferta.vehiculoId}
                  onValueChange={(v) => {
                    const vehiculo = dataStore.vehiculos.find((vh) => vh.id === v);
                    setNewOferta({
                      ...newOferta,
                      vehiculoId: v,
                      precioOfertado: vehiculo?.precioSugerido || 0,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar vehículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {dataStore.vehiculos
                      .filter((v) => v.estado === "Listo")
                      .map((vehiculo) => (
                        <SelectItem key={vehiculo.id} value={vehiculo.id}>
                          {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio} -{" "}
                          {formatCurrency(vehiculo.precioSugerido)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newOferta.fuente === "PROVEEDOR" && (
              <>
                <div>
                  <Label>Proveedor</Label>
                  <Select
                    value={newOferta.proveedorId}
                    onValueChange={(v) => setNewOferta({ ...newOferta, proveedorId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {dataStore.proveedores
                        .filter((p) => p.tipo === "Casa Comercial")
                        .map((proveedor) => (
                          <SelectItem key={proveedor.id} value={proveedor.id}>
                            {proveedor.nombre}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Marca</Label>
                    <Input
                      value={newOferta.marca}
                      onChange={(e) => setNewOferta({ ...newOferta, marca: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Modelo</Label>
                    <Input
                      value={newOferta.modelo}
                      onChange={(e) => setNewOferta({ ...newOferta, modelo: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Año</Label>
                    <Input
                      type="number"
                      value={newOferta.anio}
                      onChange={(e) => setNewOferta({ ...newOferta, anio: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </>
            )}

            {newOferta.fuente === "CRAUTOS" && (
              <>
                <div>
                  <Label>Link Externo</Label>
                  <Input
                    value={newOferta.linkExterno}
                    onChange={(e) => setNewOferta({ ...newOferta, linkExterno: e.target.value })}
                    placeholder="https://crautos.com/..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label>Marca</Label>
                    <Input
                      value={newOferta.marca}
                      onChange={(e) => setNewOferta({ ...newOferta, marca: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Modelo</Label>
                    <Input
                      value={newOferta.modelo}
                      onChange={(e) => setNewOferta({ ...newOferta, modelo: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Año</Label>
                    <Input
                      type="number"
                      value={newOferta.anio}
                      onChange={(e) => setNewOferta({ ...newOferta, anio: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Precio Ofertado</Label>
                <Input
                  type="number"
                  value={newOferta.precioOfertado}
                  onChange={(e) => setNewOferta({ ...newOferta, precioOfertado: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Validez (días)</Label>
                <Input
                  type="number"
                  value={newOferta.validezDias}
                  onChange={(e) => setNewOferta({ ...newOferta, validezDias: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                value={newOferta.notas}
                onChange={(e) => setNewOferta({ ...newOferta, notas: e.target.value })}
                placeholder="Observaciones adicionales..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOfertaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOferta}>Crear Oferta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      


      <Dialog open={interaccionDialogOpen} onOpenChange={setInteraccionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Interacción</DialogTitle>
            <DialogDescription>Registrar nota de contacto con el cliente</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Canal</Label>
              <Select
                value={newInteraccion.canal}
                onValueChange={(v: InteraccionType["canal"]) => setNewInteraccion({ ...newInteraccion, canal: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                  <SelectItem value="LLAMADA">Llamada</SelectItem>
                  <SelectItem value="EMAIL">Email</SelectItem>
                  <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Nota</Label>
              <Textarea
                value={newInteraccion.nota}
                onChange={(e) => setNewInteraccion({ ...newInteraccion, nota: e.target.value })}
                placeholder="Detalles de la interacción..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInteraccionDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddInteraccion}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/*
      <Dialog open={motivoPerdidaDialogOpen} onOpenChange={setMotivoPerdidaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como Perdida</DialogTitle>
            <DialogDescription>Selecciona el motivo de pérdida de la oferta</DialogDescription>
          </DialogHeader>

          <div>
            <Label>Motivo</Label>
            <Select value={motivoPerdidaId} onValueChange={setMotivoPerdidaId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar motivo" />
              </SelectTrigger>
              <SelectContent>
                {dataStore.motivosPerdida.map((motivo) => (
                  <SelectItem key={motivo.id} value={motivo.id}>
                    {motivo.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMotivoPerdidaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleMarcarPerdida}>
              Confirmar Pérdida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
*/}
      {/* Reasignar Dialog */}
      <Dialog open={reasignarDialogOpen} onOpenChange={setReasignarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reasignar Cliente</DialogTitle>
            <DialogDescription>
              Selecciona el nuevo vendedor para {selectedCliente?.nombre}
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label>Nuevo Vendedor</Label>
<Select
  value={nuevoVendedorId || "__DEFAULT__"}
  onValueChange={(v) => setNuevoVendedorId(v === "__DEFAULT__" ? "" : v)}
>
  <SelectTrigger>
    <SelectValue placeholder="Selecciona un vendedor" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="__DEFAULT__">
      (Seleccionar vendedor)
    </SelectItem>

    {vendedoresReal.map((v) => (
      <SelectItem key={v.id} value={v.id}>
        {v.name} {v.team ? `(${v.team})` : ""}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReasignarDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReasignarCliente}>
              Reasignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- NEW: Add Client Dialog UI --- */}
      <Dialog open={addClientOpen} onOpenChange={setAddClientOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Agregar Cliente</DialogTitle>
            <DialogDescription>Crear un nuevo cliente en el CRM</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
<div> 
  <Label>Nombre</Label> 
  <Input 
  value={newClienteForm.nombre} 
  onChange={(e) => setNewClienteForm({ 
    ...newClienteForm, nombre: e.target.value })} 
    placeholder="Nombre completo" 
    /> 
    </div>

    <div className="grid grid-cols-2 gap-4"> 
      <div> 
        <Label>Teléfono</Label> 
        <Input 
        value={newClienteForm.telefono} 
        onChange={(e) => setNewClienteForm({ 
          ...newClienteForm, telefono: e.target.value })} 
          placeholder="+506-8xxxxxxx" 
          /> 
          </div> 
          <div> 
            <Label>Email (opcional)</Label> 
            <Input 
            value={newClienteForm.email} 
            onChange={(e) => setNewClienteForm({ 
              ...newClienteForm, email: e.target.value })} 
              placeholder="correo@ejemplo.com" 
              /> 
              </div> 
              </div> 
              
<div>
  <Label>Vendedor (dueño)</Label>
  <Select
    // 👇 si no hay ownerId, usamos el sentinela "__DEFAULT__"
    value={newClienteForm.ownerId || "__DEFAULT__"}
    onValueChange={(v) =>
      setNewClienteForm({
        ...newClienteForm,
        // si el usuario elige "(Asignar por defecto)", guardamos "" en el formulario
        ownerId: v === "__DEFAULT__" ? "" : v,
      })
    }
  >
    <SelectTrigger>
      <SelectValue
        placeholder={
          loadingVendedores ? "Cargando vendedores..." : "Seleccionar vendedor"
        }
      />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="__DEFAULT__">
        (Asignar por defecto)
      </SelectItem>

      {vendedoresReal.map((v) => (
        <SelectItem key={v.id} value={v.id}>
          {v.name} {v.team ? `(${v.team})` : ""}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>
                       
                       <div className="grid grid-cols-3 gap-2"> 
                        <div> 
                          <Label>Marca preferida</Label> 
                          <Input 
                          value={newClienteForm.preferenciaMarca} 
                          onChange={(e) => setNewClienteForm({ 
                            ...newClienteForm, preferenciaMarca: e.target.value })} 
                            /> 
                            </div> 
                            <div> 
                              <Label>Modelo preferido</Label> 
                              <Input 
                              value={newClienteForm.preferenciaModelo} 
                              onChange={(e) => setNewClienteForm({ 
                                ...newClienteForm, preferenciaModelo: e.target.value })} 
                                /> 
                                </div> 
                                <div> 
                                  <Label>Presupuesto máx</Label> 
                                  <Input 
                                  type="number" 
                              value={newClienteForm.presupuestoMax} 
                            onChange={(e) => setNewClienteForm({ 
                          ...newClienteForm, presupuestoMax: e.target.value })}  
                        /> 
                      </div> 
                    </div> 
                  </div> 
                                    
                <DialogFooter> 
                  <Button variant="outline" onClick={() => 
                    setAddClientOpen(false)} disabled=
                    {isSavingCliente}>Cancelar</Button> 
                  <Button onClick={handleCreateCliente} disabled=
                  {isSavingCliente}> 
                  {isSavingCliente ? "Guardando..." : "Agregar cliente"} 
                </Button> 
              </DialogFooter> 
           </DialogContent> 
        </Dialog>

      {/* Edit Client Dialog */}
      <Dialog open={editClientOpen} onOpenChange={setEditClientOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>Actualizar información del cliente</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={editClienteForm.nombre}
                onChange={(e) => setEditClienteForm({ ...editClienteForm, nombre: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Teléfono</Label>
                <Input
                  value={editClienteForm.telefono}
                  onChange={(e) => setEditClienteForm({ ...editClienteForm, telefono: e.target.value })}
                  placeholder="+506-8xxxxxxx"
                />
              </div>
              <div>
                <Label>Email (opcional)</Label>
                <Input
                  value={editClienteForm.email}
                  onChange={(e) => setEditClienteForm({ ...editClienteForm, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Marca preferida</Label>
                <Input
                  value={editClienteForm.preferenciaMarca}
                  onChange={(e) => setEditClienteForm({ ...editClienteForm, preferenciaMarca: e.target.value })}
                />
              </div>
              <div>
                <Label>Modelo preferido</Label>
                <Input
                  value={editClienteForm.preferenciaModelo}
                  onChange={(e) => setEditClienteForm({ ...editClienteForm, preferenciaModelo: e.target.value })}
                />
              </div>
              <div>
                <Label>Presupuesto máx</Label>
                <Input
                  type="number"
                  value={editClienteForm.presupuestoMax}
                  onChange={(e) => setEditClienteForm({ ...editClienteForm, presupuestoMax: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClientOpen(false)} disabled={isSavingCliente}>Cancelar</Button>
            <Button onClick={handleUpdateCliente} disabled={isSavingCliente}>
              {isSavingCliente ? "Guardando..." : "Actualizar cliente"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clientes;