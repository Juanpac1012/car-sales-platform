import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { dataStore, Oferta, Interaccion, defaultSeller } from "@/lib/dataStore";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface CrearOfertaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preloadedData?: {
    fuente?: Oferta["fuente"];
    vehiculoId?: string;
    proveedorId?: string;
    linkExterno?: string;
    marca?: string;
    modelo?: string;
    anio?: number;
    precio?: number;
  };
}

export function CrearOfertaDialog({ open, onOpenChange, preloadedData }: CrearOfertaDialogProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [clienteSearch, setClienteSearch] = useState("");

  const [formData, setFormData] = useState({
    clienteId: "",
    fuente: (preloadedData?.fuente || "INVENTARIO") as Oferta["fuente"],
    vehiculoId: preloadedData?.vehiculoId || "",
    proveedorId: preloadedData?.proveedorId || "",
    proveedorVehiculoIdx: -1,
    linkExterno: preloadedData?.linkExterno || "",
    marca: preloadedData?.marca || "",
    modelo: preloadedData?.modelo || "",
    anio: preloadedData?.anio || new Date().getFullYear(),
    precioOfertado: preloadedData?.precio || 0,
    validezDesde: new Date().toISOString().split("T")[0],
    validezHasta: "",
    notas: "",
  });

  useEffect(() => {
    if (preloadedData) {
      setFormData((prev) => ({
        ...prev,
        fuente: preloadedData.fuente || prev.fuente,
        vehiculoId: preloadedData.vehiculoId || "",
        proveedorId: preloadedData.proveedorId || "",
        linkExterno: preloadedData.linkExterno || "",
        marca: preloadedData.marca || "",
        modelo: preloadedData.modelo || "",
        anio: preloadedData.anio || new Date().getFullYear(),
        precioOfertado: preloadedData.precio || 0,
      }));
    }
  }, [preloadedData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleSubmit = () => {
    if (!formData.clienteId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un cliente",
        variant: "destructive",
      });
      return;
    }

    const vehiculo =
      formData.fuente === "INVENTARIO"
        ? dataStore.vehiculos.find((v) => v.id === formData.vehiculoId)
        : null;

    const oferta: Oferta = {
      id: `O${String(dataStore.ofertas.length + 1).padStart(3, "0")}`,
      clienteId: formData.clienteId,
      fuente: formData.fuente,
      vehiculo: vehiculo
        ? { id: vehiculo.id, marca: vehiculo.marca, modelo: vehiculo.modelo, anio: vehiculo.anio }
        : { marca: formData.marca, modelo: formData.modelo, anio: formData.anio },
      linkExterno: formData.fuente === "CRAUTOS" ? formData.linkExterno : undefined,
      proveedorId: formData.fuente === "PROVEEDOR" ? formData.proveedorId : undefined,
      precioOfertado: formData.precioOfertado,
      estado: "ENVIADA",
      validez: {
        desde: formData.validezDesde,
        hasta: formData.validezHasta,
      },
      notas: formData.notas,
      vendedorId: defaultSeller(),
      createdAt: new Date().toISOString().split("T")[0],
      updatedAt: new Date().toISOString().split("T")[0],
    };

    dataStore.ofertas.push(oferta);

    // Create initial interaction
    const interaccion: Interaccion = {
      id: `I${String(dataStore.interacciones.length + 1).padStart(3, "0")}`,
      ofertaId: oferta.id,
      fecha: new Date().toISOString().split("T")[0],
      canal: "WHATSAPP",
      nota: "Oferta creada y enviada al cliente",
    };
    dataStore.interacciones.push(interaccion);

    const cliente = dataStore.clientes.find((c) => c.id === formData.clienteId);

    toast({
      title: "Oferta creada",
      description: `Oferta enviada a ${cliente?.nombre}`,
      action: (
        <Button variant="outline" size="sm" onClick={() => navigate("/crm/ofertas")}>
          Ver ofertas
        </Button>
      ),
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      clienteId: "",
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

  const filteredClientes = dataStore.clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(clienteSearch.toLowerCase()) ||
      c.telefono.includes(clienteSearch)
  );

  const proveedorInventario = formData.proveedorId
    ? dataStore.proveedorInventario.filter((pi) => pi.proveedorId === formData.proveedorId)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Oferta</DialogTitle>
          <DialogDescription>Crear una nueva oferta para un cliente</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cliente Search */}
          <div>
            <Label>Cliente *</Label>
            <Input
              placeholder="Buscar por nombre o teléfono..."
              value={clienteSearch}
              onChange={(e) => setClienteSearch(e.target.value)}
              className="mb-2"
            />
            <Select
              value={formData.clienteId}
              onValueChange={(v) => setFormData({ ...formData, clienteId: v })}
            >
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

          {/* Fuente */}
          <div>
            <Label>Origen</Label>
            <Select
              value={formData.fuente}
              onValueChange={(v: Oferta["fuente"]) =>
                setFormData({ ...formData, fuente: v, vehiculoId: "", proveedorId: "", linkExterno: "" })
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
          {formData.fuente === "INVENTARIO" && (
            <div>
              <Label>Vehículo</Label>
              <Select
                value={formData.vehiculoId}
                onValueChange={(v) => {
                  const vehiculo = dataStore.vehiculos.find((vh) => vh.id === v);
                  setFormData({
                    ...formData,
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
          {formData.fuente === "PROVEEDOR" && (
            <>
              <div>
                <Label>Proveedor</Label>
                <Select
                  value={formData.proveedorId}
                  onValueChange={(v) => setFormData({ ...formData, proveedorId: v, proveedorVehiculoIdx: -1 })}
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
                    value={String(formData.proveedorVehiculoIdx)}
                    onValueChange={(v) => {
                      const idx = parseInt(v);
                      const veh = proveedorInventario[idx];
                      setFormData({
                        ...formData,
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
          {formData.fuente === "CRAUTOS" && (
            <>
              <div>
                <Label>Link Externo</Label>
                <Input
                  value={formData.linkExterno}
                  onChange={(e) => setFormData({ ...formData, linkExterno: e.target.value })}
                  placeholder="https://crautos.com/..."
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Marca</Label>
                  <Input value={formData.marca} onChange={(e) => setFormData({ ...formData, marca: e.target.value })} />
                </div>
                <div>
                  <Label>Modelo</Label>
                  <Input
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Año</Label>
                  <Input
                    type="number"
                    value={formData.anio}
                    onChange={(e) => setFormData({ ...formData, anio: parseInt(e.target.value) })}
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
              value={formData.precioOfertado}
              onChange={(e) => setFormData({ ...formData, precioOfertado: parseFloat(e.target.value) })}
            />
          </div>

          {/* Validez */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Válido Desde</Label>
              <Input
                type="date"
                value={formData.validezDesde}
                onChange={(e) => setFormData({ ...formData, validezDesde: e.target.value })}
              />
            </div>
            <div>
              <Label>Válido Hasta</Label>
              <Input
                type="date"
                value={formData.validezHasta}
                onChange={(e) => setFormData({ ...formData, validezHasta: e.target.value })}
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label>Notas</Label>
            <Textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              placeholder="Observaciones adicionales..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>Crear Oferta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
