import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  User,
  FileText,
  Share2,
  Printer,
  DollarSign,
  CheckCircle,
  Wrench,
  Eye,
  Car,
} from "lucide-react";
import { dataStore, buildTimeline, findImg, type Vehiculo } from "@/lib/dataStore";
import { useToast } from "@/hooks/use-toast";
import { PricingPanel } from "./PricingPanel";

const etapaIcons = {
  INGRESO: DollarSign,
  INSPECCION: CheckCircle,
  RETOQUES: Wrench,
  PUBLICACION: Eye,
  VENTA: Calendar,
};

const etapaLabels = {
  INGRESO: "Ingreso",
  INSPECCION: "Inspección",
  RETOQUES: "Retoques",
  PUBLICACION: "Publicación",
  VENTA: "Venta",
};

const etapaColors: Record<string, string> = {
  INGRESO: "bg-blue-500",
  INSPECCION: "bg-yellow-500",
  RETOQUES: "bg-orange-500",
  PUBLICACION: "bg-green-500",
  VENTA: "bg-purple-500",
};

interface VehicleDetailModalProps {
  vehiculo: Vehiculo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VehicleDetailModal({ vehiculo, open, onOpenChange }: VehicleDetailModalProps) {
  const { toast } = useToast();
  const timeline = buildTimeline(vehiculo.id);
  const defaultImg = findImg(vehiculo.marca, vehiculo.modelo);

  const handleSharePublic = () => {
    window.open(`/share/${vehiculo.id}`, "_blank");
  };

  const handleExportPDF = () => {
    window.open(`/share/${vehiculo.id}`, "_blank");
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleApplyPrice = (price: number) => {
    vehiculo.precioSugerido = price;
    toast({
      title: "Precio actualizado",
      description: `Precio sugerido actualizado a $${price.toLocaleString()}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">
              <Car className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="historial">
              <Calendar className="h-4 w-4 mr-2" />
              Historial
            </TabsTrigger>
            <TabsTrigger value="pricing">
              <DollarSign className="h-4 w-4 mr-2" />
              Pricing
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <img
                  src={timeline.allPhotos[0] || defaultImg}
                  alt={`${vehiculo.marca} ${vehiculo.modelo}`}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-3">Especificaciones</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">VIN:</span>
                      <p className="font-medium">{vehiculo.vin}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Placa:</span>
                      <p className="font-medium">{vehiculo.placa}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Color Ext.:</span>
                      <p className="font-medium">{vehiculo.colorExterior}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Color Int.:</span>
                      <p className="font-medium">{vehiculo.colorInterior}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Transmisión:</span>
                      <p className="font-medium">{vehiculo.transmision}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Pasajeros:</span>
                      <p className="font-medium">{vehiculo.pasajeros}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Puertas:</span>
                      <p className="font-medium">{vehiculo.puertas}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Estado:</span>
                      <Badge>{vehiculo.estado}</Badge>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Costo Compra:</span>
                    <p className="font-semibold text-lg">
                      ${vehiculo.costoCompra.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Precio Sugerido:</span>
                    <p className="font-semibold text-lg text-primary">
                      ${vehiculo.precioSugerido.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {vehiculo.notas && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Notas</h3>
                <p className="text-sm text-muted-foreground">{vehiculo.notas}</p>
              </div>
            )}
          </TabsContent>

          {/* Historial Tab */}
          <TabsContent value="historial" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Timeline del Vehículo</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleSharePublic}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Ver Página Pública
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportPDF}>
                  <Printer className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>
            </div>

            {timeline.events.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No hay eventos registrados para este vehículo
              </div>
            ) : (
              <div className="relative">
                {/* Timeline Line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                {/* Timeline Events */}
                <div className="space-y-6">
                  {timeline.events.map((event, index) => {
                    const Icon = etapaIcons[event.etapa];
                    const isLast = index === timeline.events.length - 1;

                    return (
                      <div key={event.id} className="relative pl-12">
                        {/* Icon */}
                        <div
                          className={`absolute left-0 w-8 h-8 rounded-full ${
                            etapaColors[event.etapa]
                          } flex items-center justify-center z-10`}
                        >
                          <Icon className="h-4 w-4 text-white" />
                        </div>

                        {/* Content */}
                        <div className={!isLast ? "pb-6" : ""}>
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">
                              {etapaLabels[event.etapa]}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {new Date(event.fecha).toLocaleDateString("es-ES")}
                            </Badge>
                            {event.responsable && (
                              <Badge variant="secondary" className="text-xs">
                                <User className="h-3 w-3 mr-1" />
                                {event.responsable}
                              </Badge>
                            )}
                          </div>

                          {event.notas && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {event.notas}
                            </p>
                          )}

                          {event.fotos && event.fotos.length > 0 && (
                            <div className="flex gap-2 flex-wrap mb-3">
                              {event.fotos.map((foto, idx) => (
                                <img
                                  key={idx}
                                  src={foto}
                                  alt={`${etapaLabels[event.etapa]} ${idx + 1}`}
                                  className="w-20 h-20 object-cover rounded border"
                                />
                              ))}
                            </div>
                          )}

                          {event.documentos && event.documentos.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {event.documentos.map((doc, idx) => (
                                <Button
                                  key={idx}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(doc, "_blank")}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  Doc {idx + 1}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <PricingPanel
              vehiculo={vehiculo}
              onApplyPrice={handleApplyPrice}
              onCreateOffer={() => {
                onOpenChange(false);
                // You can add logic to open offer dialog here
              }}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
