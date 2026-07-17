import { useState, useEffect } from "react";
import { Plus, User, Car, Calendar, DollarSign, MessageSquare, Edit, Copy, CheckCircle, XCircle, Clock, ExternalLink, UserCog } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { dataStore, Oferta, Interaccion, defaultSeller } from "@/lib/dataStore";
import { useToast } from "@/hooks/use-toast";

const Ofertas = () => {
  const { toast } = useToast();
  // Dialog and state hooks (must be at the top)
  const [newOfertaOpen, setNewOfertaOpen] = useState(false);
  const [editOfertaOpen, setEditOfertaOpen] = useState(false);
  const [interaccionOpen, setInteraccionOpen] = useState(false);
  const [motivoPerdidaOpen, setMotivoPerdidaOpen] = useState(false);
  const [reasignarVendedorOpen, setReasignarVendedorOpen] = useState(false);
  const [newOferta, setNewOferta] = useState<{
    clienteId: string;
    vendedorId: string;
    fuente: "INVENTARIO" | "PROVEEDOR" | "CRAUTOS";
    vehiculoId: string;
    proveedorId: string;
    proveedorVehiculoIdx: number;
    linkExterno: string;
    marca: string;
    modelo: string;
    anio: number;
    precioOfertado: number;
    validezDesde: string;
    validezHasta: string;
    notas: string;
  }>({
    clienteId: "",
    vendedorId: "",
    fuente: "INVENTARIO",
    vehiculoId: "",
    proveedorId: "",
    proveedorVehiculoIdx: -1,
    linkExterno: "",
    marca: "",
    modelo: "",
    anio: new Date().getFullYear(),
    precioOfertado: 0,
    validezDesde: new Date().toISOString().split("T")[0],
    validezHasta: "",
    notas: "",
  });
  const [editOferta, setEditOferta] = useState<any>({});
  const [selectedOferta, setSelectedOferta] = useState<any>(null);
  const [newInteraccion, setNewInteraccion] = useState<{ canal: "WHATSAPP" | "LLAMADA" | "EMAIL" | "PRESENCIAL"; nota: string }>({ canal: "WHATSAPP", nota: "" });
  const [motivoPerdidaId, setMotivoPerdidaId] = useState("");
  const [nuevoVendedorId, setNuevoVendedorId] = useState("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar las ofertas reales desde la API
  useEffect(() => {
    const fetchListings = async () => {
      setLoading(true);
      try {
        const data = await import("@/lib/InspeccionApi").then(api => api.listVehicleListings());
        setListings(data.filter(l => l.is_oferta));
      } catch (err) {
        toast({ title: "Error", description: "No se pudieron cargar las ofertas", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getClienteNombre = (clienteId: string) => {
    const cliente = dataStore.clientes.find((c) => c.id === clienteId);
    return cliente?.nombre || "Cliente desconocido";
  };

  const getProveedorNombre = (proveedorId?: string) => {
    if (!proveedorId) return null;
    const proveedor = dataStore.proveedores.find((p) => p.id === proveedorId);
    return proveedor?.nombre;
  };

  /**
   * Crea una oferta en la base de datos usando el RPC de create_listing y luego actualiza is_oferta=true.
   * Documentación:
   * - POST /rpc/create_listing (ver docs/Project Dealer/Funciones CRUD BD.md)
   * - Luego PATCH /vehicle_listings para setear is_oferta=true
   *
   * NOTA: Si el RPC permite pasar is_oferta, puedes hacerlo directo. Si no, se hace update después.
   */
  const handleCreateOferta = async () => {
    if (!newOferta.clienteId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un cliente",
        variant: "destructive",
      });
      return;
    }

    // 1. Preparar datos para el RPC
    // Aquí debes mapear los datos de newOferta a los parámetros del RPC
    // Ejemplo: p_vehicle_id, p_dealer_id, p_title, p_description, p_price, etc.
    // NOTA: Debes tener el vehicle_id y dealer_id válidos
    const vehiculo =
      newOferta.fuente === "INVENTARIO"
        ? dataStore.vehiculos.find((v) => v.id === newOferta.vehiculoId)
        : null;
    const cliente = dataStore.clientes.find((c) => c.id === newOferta.clienteId);
    const vendedorId = newOferta.vendedorId || cliente?.ownerId || defaultSeller();

    // Obtener dealerId: si el modelo de vehiculo no tiene dealer_id, buscar en cliente o contexto
    // Puedes ajustar aquí según tu modelo real
    let dealerId = "";
    if (vehiculo && "dealerId" in vehiculo) {
      // @ts-ignore
      dealerId = vehiculo.dealerId;
    } else if (vehiculo && "dealer_id" in vehiculo) {
      // @ts-ignore
      dealerId = vehiculo.dealer_id;
    } else if (cliente && "dealerId" in cliente) {
      // @ts-ignore
      dealerId = cliente.dealerId;
    } else if (cliente && "dealer_id" in cliente) {
      // @ts-ignore
      dealerId = cliente.dealer_id;
    } else {
      // Si tienes un dealerId global/logueado, úsalo aquí
      // dealerId = session.dealerId || "";
    }

    // Si no hay vehicle_id o dealer_id, abortar
    if (!vehiculo?.id || !dealerId) {
      toast({
        title: "Error",
        description: "Falta información del vehículo o dealer",
        variant: "destructive",
      });
      return;
    }

    // 2. Llamar al RPC para crear el listing
    try {
      // Reemplaza URL_API con tu endpoint real
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://tu-api.com";
      // 2.1 Crear listing
      const res = await fetch(`${API_URL}/rpc/create_listing`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Profile": "api",
        },
        body: JSON.stringify({
          p_vehicle_id: vehiculo.id,
          p_dealer_id: dealerId,
          p_title: `${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}`,
          p_description: newOferta.notas,
          p_price: newOferta.precioOfertado,
          p_currency: "CRC",
          p_visibility: "private",
          p_featured: false,
          p_status: "draft",
        }),
      });
      if (!res.ok) throw new Error("Error creando listing");
      const listingId = await res.json();

      // 2.2 Actualizar is_oferta=true
      const res2 = await fetch(`${API_URL}/vehicle_listings?id=eq.${listingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Content-Profile": "api",
        },
        body: JSON.stringify({ is_oferta: true }),
      });
      if (!res2.ok) throw new Error("Error actualizando is_oferta");

      toast({
        title: "Oferta creada",
        description: `Oferta enviada a ${getClienteNombre(newOferta.clienteId)}`,
      });
      setNewOfertaOpen(false);
      resetNewOferta();
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo crear la oferta en la base de datos",
        variant: "destructive",
      });
    }
  };

  const resetNewOferta = () => {
    setNewOferta({
      clienteId: "",
      vendedorId: "",
      fuente: "INVENTARIO",
      vehiculoId: "",
      proveedorId: "",
      proveedorVehiculoIdx: -1,
      linkExterno: "",
      marca: "",
      modelo: "",
      anio: new Date().getFullYear(),
      precioOfertado: 0,
      validezDesde: new Date().toISOString().split("T")[0],
      validezHasta: "",
      notas: "",
    });
    setClienteSearch("");
  };

  const handleEditOferta = () => {
    if (!selectedOferta) return;

    Object.assign(selectedOferta, editOferta);
    selectedOferta.updatedAt = new Date().toISOString().split("T")[0];

    toast({
      title: "Oferta actualizada",
      description: "Los cambios han sido guardados",
    });

    setEditOfertaOpen(false);
    setSelectedOferta(null);
  };

  const handleAddInteraccion = () => {
    if (!selectedOferta) return;

    const interaccion: Interaccion = {
      id: `I${String(dataStore.interacciones.length + 1).padStart(3, "0")}`,
      ofertaId: selectedOferta.id,
      fecha: new Date().toISOString().split("T")[0],
      canal: newInteraccion.canal,
      nota: newInteraccion.nota,
    };

    dataStore.interacciones.push(interaccion);
    selectedOferta.updatedAt = new Date().toISOString().split("T")[0];

    toast({
      title: "Interacción registrada",
      description: `Nota añadida por ${newInteraccion.canal}`,
    });

    setInteraccionOpen(false);
    setNewInteraccion({ canal: "WHATSAPP", nota: "" });
  };

  const handleMarcarGanada = (oferta: Oferta) => {
    oferta.estado = "GANADA";
    oferta.updatedAt = new Date().toISOString().split("T")[0];

    toast({
      title: "Oferta ganada",
      description: "¡Felicidades por cerrar la venta!",
    });
  };

  const handleMarcarPerdida = () => {
    if (!selectedOferta || !motivoPerdidaId) return;

    selectedOferta.estado = "PERDIDA";
    selectedOferta.motivoPerdidaId = motivoPerdidaId;
    selectedOferta.updatedAt = new Date().toISOString().split("T")[0];

    toast({
      title: "Oferta perdida",
      description: "Se ha registrado el motivo de pérdida",
    });

    setMotivoPerdidaOpen(false);
    setMotivoPerdidaId("");
  };

  const handleCaducar = (oferta: Oferta) => {
    oferta.estado = "CADUCADA";
    oferta.updatedAt = new Date().toISOString().split("T")[0];

    toast({
      title: "Oferta caducada",
      description: "La oferta ha sido marcada como caducada",
    });
  };

  const handleDuplicar = (oferta: Oferta) => {
    const newOferta: Oferta = {
      ...oferta,
      id: `O${String(dataStore.ofertas.length + 1).padStart(3, "0")}`,
      estado: "ENVIADA",
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };

    dataStore.ofertas.push(newOferta);

    toast({
      title: "Oferta duplicada",
      description: "Se ha creado una copia de la oferta",
    });
  };

  const handleIniciarNegociacion = (oferta: Oferta) => {
    oferta.estado = "NEGOCIANDO";
    oferta.updatedAt = new Date().toISOString().split("T")[0];

    toast({
      title: "Negociación iniciada",
      description: "La oferta se ha movido a negociación",
    });
  };

  const handleReasignarVendedor = () => {
    if (!selectedOferta || !nuevoVendedorId) return;

    selectedOferta.vendedorId = nuevoVendedorId;
    selectedOferta.updatedAt = new Date().toISOString().split("T")[0];

    const vendedor = dataStore.vendedores.find((v) => v.id === nuevoVendedorId);

    toast({
      title: "Vendedor reasignado",
      description: `Oferta asignada a ${vendedor?.nombre || "nuevo vendedor"}`,
    });

    setReasignarVendedorOpen(false);
    setNuevoVendedorId("");
  };

  const getVendedorInfo = (vendedorId?: string) => {
    if (!vendedorId) return null;
    return dataStore.vendedores.find((v) => v.id === vendedorId);
  };

  const ofertasPorEstado = {
    ENVIADA: dataStore.ofertas.filter((o) => o.estado === "ENVIADA"),
    NEGOCIANDO: dataStore.ofertas.filter((o) => o.estado === "NEGOCIANDO"),
    GANADA: dataStore.ofertas.filter((o) => o.estado === "GANADA"),
    PERDIDA: dataStore.ofertas.filter((o) => o.estado === "PERDIDA"),
    CADUCADA: dataStore.ofertas.filter((o) => o.estado === "CADUCADA"),
  };

const renderOfertaCard = (oferta: Oferta) => {
    const cliente = dataStore.clientes.find((c) => c.id === oferta.clienteId);
    const proveedor = oferta.proveedorId ? getProveedorNombre(oferta.proveedorId) : null;
    const vendedor = getVendedorInfo(oferta.vendedorId);

    return (
      <Card key={oferta.id} className="mb-3 hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">{cliente?.nombre}</span>
              </div>
              <div className="flex items-center gap-2">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {oferta.vehiculo?.marca} {oferta.vehiculo?.modelo} {oferta.vehiculo?.anio}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-bold text-lg">{formatCurrency(oferta.precioOfertado)}</div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {oferta.fuente === "INVENTARIO" && <Badge variant="secondary">Inventario</Badge>}
            {oferta.fuente === "PROVEEDOR" && proveedor && <Badge variant="secondary">{proveedor}</Badge>}
            {oferta.fuente === "CRAUTOS" && <Badge variant="secondary">CRautos</Badge>}
            {vendedor && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={vendedor.foto} />
                  <AvatarFallback>{vendedor.nombre.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <span>{vendedor.nombre}</span>
              </Badge>
            )}
          </div>

          {oferta.linkExterno && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ExternalLink className="h-3 w-3" />
              <a href={oferta.linkExterno} target="_blank" rel="noopener noreferrer" className="hover:underline">
                Ver en CRautos
              </a>
            </div>
          )}

          {oferta.validez?.hasta && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Válida hasta: {oferta.validez.hasta}</span>
            </div>
          )}

          {oferta.notas && (
            <p className="text-xs text-muted-foreground line-clamp-2">{oferta.notas}</p>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {oferta.estado === "ENVIADA" && (
              <Button
                size="sm"
                variant="default"
                onClick={() => handleIniciarNegociacion(oferta)}
              >
                Iniciar Negociación
              </Button>
            )}
            {oferta.estado === "NEGOCIANDO" && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleMarcarGanada(oferta)}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Ganada
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setSelectedOferta(oferta);
                    setMotivoPerdidaOpen(true);
                  }}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Perdida
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedOferta(oferta);
                setReasignarVendedorOpen(true);
              }}
            >
              <UserCog className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedOferta(oferta);
                setEditOferta(oferta);
                setEditOfertaOpen(true);
              }}
            >
              <Edit className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelectedOferta(oferta);
                setInteraccionOpen(true);
              }}
            >
              <MessageSquare className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleDuplicar(oferta)}>
              <Copy className="h-3 w-3" />
            </Button>
            {oferta.estado !== "CADUCADA" && oferta.estado !== "GANADA" && oferta.estado !== "PERDIDA" && (
              <Button size="sm" variant="outline" onClick={() => handleCaducar(oferta)}>
                <Clock className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const filteredClientes = dataStore.clientes.filter((c) =>
    c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
    c.telefono.includes(clienteSearch)
  );

  const proveedorInventario = newOferta.proveedorId
    ? dataStore.proveedorInventario.filter((pi) => pi.proveedorId === newOferta.proveedorId)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ofertas</h1>
          <p className="text-muted-foreground">Gestiona las ofertas en proceso</p>
        </div>
        <Button onClick={() => setNewOfertaOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Oferta
        </Button>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* ENVIADA Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
            <h3 className="font-semibold text-sm">Enviada</h3>
            <Badge variant="secondary">{ofertasPorEstado.ENVIADA.length}</Badge>
          </div>
          <div className="space-y-2">
            {ofertasPorEstado.ENVIADA.map((oferta) => renderOfertaCard(oferta))}
          </div>
        </div>

        {/* NEGOCIANDO Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3 py-2 bg-blue-500/10 rounded-lg">
            <h3 className="font-semibold text-sm">Negociando</h3>
            <Badge variant="secondary">{ofertasPorEstado.NEGOCIANDO.length}</Badge>
          </div>
          <div className="space-y-2">
            {ofertasPorEstado.NEGOCIANDO.map((oferta) => renderOfertaCard(oferta))}
          </div>
        </div>

        {/* GANADA Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3 py-2 bg-green-500/10 rounded-lg">
            <h3 className="font-semibold text-sm">Ganada</h3>
            <Badge variant="secondary">{ofertasPorEstado.GANADA.length}</Badge>
          </div>
          <div className="space-y-2">
            {ofertasPorEstado.GANADA.map((oferta) => renderOfertaCard(oferta))}
          </div>
        </div>

        {/* PERDIDA Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3 py-2 bg-red-500/10 rounded-lg">
            <h3 className="font-semibold text-sm">Perdida</h3>
            <Badge variant="secondary">{ofertasPorEstado.PERDIDA.length}</Badge>
          </div>
          <div className="space-y-2">
            {ofertasPorEstado.PERDIDA.map((oferta) => renderOfertaCard(oferta))}
          </div>
        </div>

        {/* CADUCADA Column */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
            <h3 className="font-semibold text-sm">Caducada</h3>
            <Badge variant="secondary">{ofertasPorEstado.CADUCADA.length}</Badge>
          </div>
          <div className="space-y-2">
            {ofertasPorEstado.CADUCADA.map((oferta) => renderOfertaCard(oferta))}
          </div>
        </div>
      </div>

      {/* New Offer Dialog */}
      <Dialog open={newOfertaOpen} onOpenChange={setNewOfertaOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Oferta</DialogTitle>
            <DialogDescription>Crear una nueva oferta para un cliente</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cliente Search */}
            <div>
              <Label>Cliente</Label>
              <Input
                placeholder="Buscar por nombre o teléfono..."
                value={clienteSearch}
                onChange={(e) => setClienteSearch(e.target.value)}
                className="mb-2"
              />
              <Select value={newOferta.clienteId} onValueChange={(v) => setNewOferta({ ...newOferta, clienteId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  {filteredClientes.map((cliente) => (
                    <SelectItem key={cliente.id} value={cliente.id}>
                      {cliente.nombre} - {cliente.telefono}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vendedor */}
            <div>
              <Label>Vendedor</Label>
              <Select
                value={newOferta.vendedorId}
                onValueChange={(v) => {
                  setNewOferta({ ...newOferta, vendedorId: v });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar vendedor (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {dataStore.vendedores.filter((v) => v.activo).map((vendedor) => (
                    <SelectItem key={vendedor.id} value={vendedor.id}>
                      {vendedor.nombre} {vendedor.equipo && `(${vendedor.equipo})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Por defecto se asigna al dueño del cliente
              </p>
            </div>

            {/* Fuente */}
            <div>
              <Label>Origen</Label>
              <Select
                value={newOferta.fuente}
                onValueChange={(v: Oferta["fuente"]) =>
                  setNewOferta({ ...newOferta, fuente: v, vehiculoId: "", proveedorId: "", linkExterno: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INVENTARIO">Inventario</SelectItem>
                  <SelectItem value="PROVEEDOR">Proveedor</SelectItem>
                  <SelectItem value="CRAUTOS">CRautos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Inventario */}
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
                          {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio} - {formatCurrency(vehiculo.precioSugerido)}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Proveedor */}
            {newOferta.fuente === "PROVEEDOR" && (
              <>
                <div>
                  <Label>Proveedor</Label>
                  <Select
                    value={newOferta.proveedorId}
                    onValueChange={(v) => setNewOferta({ ...newOferta, proveedorId: v, proveedorVehiculoIdx: -1 })}
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

                {proveedorInventario.length > 0 && (
                  <div>
                    <Label>Vehículo del Proveedor</Label>
                    <Select
                      value={String(newOferta.proveedorVehiculoIdx)}
                      onValueChange={(v) => {
                        const idx = parseInt(v);
                        const veh = proveedorInventario[idx];
                        setNewOferta({
                          ...newOferta,
                          proveedorVehiculoIdx: idx,
                          marca: veh.marca,
                          modelo: veh.modelo,
                          anio: veh.anio,
                          precioOfertado: veh.precioRef,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar vehículo" />
                      </SelectTrigger>
                      <SelectContent>
                        {proveedorInventario.map((veh, idx) => (
                          <SelectItem key={idx} value={String(idx)}>
                            {veh.marca} {veh.modelo} {veh.anio} - {formatCurrency(veh.precioRef)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            {/* CRautos */}
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

            {/* Precio */}
            <div>
              <Label>Precio Ofertado</Label>
              <Input
                type="number"
                value={newOferta.precioOfertado}
                onChange={(e) => setNewOferta({ ...newOferta, precioOfertado: parseFloat(e.target.value) })}
              />
            </div>

            {/* Validez */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Válido Desde</Label>
                <Input
                  type="date"
                  value={newOferta.validezDesde}
                  onChange={(e) => setNewOferta({ ...newOferta, validezDesde: e.target.value })}
                />
              </div>
              <div>
                <Label>Válido Hasta</Label>
                <Input
                  type="date"
                  value={newOferta.validezHasta}
                  onChange={(e) => setNewOferta({ ...newOferta, validezHasta: e.target.value })}
                />
              </div>
            </div>

            {/* Notas */}
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
            <Button variant="outline" onClick={() => setNewOfertaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOferta}>Crear Oferta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Offer Dialog */}
      <Dialog open={editOfertaOpen} onOpenChange={setEditOfertaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Oferta</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Precio Ofertado</Label>
              <Input
                type="number"
                value={editOferta.precioOfertado || 0}
                onChange={(e) => setEditOferta({ ...editOferta, precioOfertado: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                value={editOferta.notas || ""}
                onChange={(e) => setEditOferta({ ...editOferta, notas: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOfertaOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditOferta}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Interaction Dialog */}
      <Dialog open={interaccionOpen} onOpenChange={setInteraccionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir Interacción</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Canal</Label>
              <Select
                value={newInteraccion.canal}
                onValueChange={(v: Interaccion["canal"]) => setNewInteraccion({ ...newInteraccion, canal: v })}
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
            <Button variant="outline" onClick={() => setInteraccionOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddInteraccion}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lost Reason Dialog */}
      <Dialog open={motivoPerdidaOpen} onOpenChange={setMotivoPerdidaOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como Perdida</DialogTitle>
            <DialogDescription>Selecciona el motivo de pérdida</DialogDescription>
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
            <Button variant="outline" onClick={() => setMotivoPerdidaOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleMarcarPerdida}>
              Confirmar Pérdida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reasignar Vendedor Dialog */}
      <Dialog open={reasignarVendedorOpen} onOpenChange={setReasignarVendedorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reasignar Vendedor</DialogTitle>
            <DialogDescription>
              Cambia el vendedor responsable de esta oferta
            </DialogDescription>
          </DialogHeader>

          <div>
            <Label>Nuevo Vendedor</Label>
            <Select value={nuevoVendedorId} onValueChange={setNuevoVendedorId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar vendedor" />
              </SelectTrigger>
              <SelectContent>
                {dataStore.vendedores.filter((v) => v.activo).map((vendedor) => (
                  <SelectItem key={vendedor.id} value={vendedor.id}>
                    <div className="flex items-center gap-2">
                      <span>{vendedor.nombre}</span>
                      {vendedor.equipo && (
                        <span className="text-xs text-muted-foreground">({vendedor.equipo})</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReasignarVendedorOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleReasignarVendedor}>
              Reasignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Ofertas;
