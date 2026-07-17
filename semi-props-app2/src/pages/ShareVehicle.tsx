import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  User,
  FileText,
  Download,
  Printer,
  CheckCircle,
  Clock,
  Wrench,
  Eye,
  DollarSign,
  Share2,
  Copy,
} from "lucide-react";
import { dataStore, buildTimeline, findImg } from "@/lib/dataStore";
import { useToast } from "@/hooks/use-toast";

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

export default function ShareVehicle() {
  const { vehiculoId } = useParams();
  const { toast } = useToast();

  const vehiculo = dataStore.vehiculos.find((v) => v.id === vehiculoId);
  const timeline = vehiculo ? buildTimeline(vehiculoId!) : null;

  if (!vehiculo || !timeline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold mb-2">Vehículo no encontrado</h2>
          <p className="text-muted-foreground">
            El vehículo que buscas no existe o ya no está disponible
          </p>
        </Card>
      </div>
    );
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}/share/${vehiculoId}?t=abc123`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Enlace copiado",
      description: "El enlace se ha copiado al portapapeles",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const maskVIN = (vin: string) => {
    if (vin.length <= 8) return vin;
    return vin.substring(0, 4) + "***" + vin.substring(vin.length - 4);
  };

  const defaultImg = findImg(vehiculo.marca, vehiculo.modelo);

  return (
    <div className="min-h-screen bg-muted/20 print:bg-white">
      {/* Public Header */}
      <div className="bg-background border-b border-border print:border-0">
        <div className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}
            </h1>
            <p className="text-muted-foreground text-sm">
              VIN: {maskVIN(vehiculo.vin)} • Placa: {vehiculo.placa}
            </p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-2" />
              Copiar Enlace
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Vehicle Header Card */}
        <Card className="p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <img
                src={timeline.allPhotos[0] || defaultImg}
                alt={`${vehiculo.marca} ${vehiculo.modelo}`}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Especificaciones
                </h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Color:</span>
                    <p className="font-medium">{vehiculo.colorExterior}</p>
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
                </div>
              </div>
              <Separator />
              <div>
                <Badge variant={vehiculo.estado === "Vendido" ? "secondary" : "default"}>
                  {vehiculo.estado}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Timeline Section */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Historial Completo
          </h2>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-border" />

            {/* Timeline Events */}
            <div className="space-y-8">
              {timeline.events.map((event, index) => {
                const Icon = etapaIcons[event.etapa];
                const isLast = index === timeline.events.length - 1;

                return (
                  <div key={event.id} className="relative pl-20">
                    {/* Icon */}
                    <div
                      className={`absolute left-4 w-8 h-8 rounded-full ${
                        etapaColors[event.etapa]
                      } flex items-center justify-center z-10`}
                    >
                      <Icon className="h-4 w-4 text-white" />
                    </div>

                    {/* Content */}
                    <div className={!isLast ? "pb-8" : ""}>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">
                          {etapaLabels[event.etapa]}
                        </h3>
                        <Badge variant="outline">
                          {new Date(event.fecha).toLocaleDateString("es-ES", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </Badge>
                      </div>

                      {event.responsable && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                          <User className="h-4 w-4" />
                          <span>{event.responsable}</span>
                        </div>
                      )}

                      {event.notas && (
                        <p className="text-muted-foreground mb-3">
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
                              className="w-24 h-24 object-cover rounded border"
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
                              Documento {idx + 1}
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
        </Card>

        {/* Documents Section */}
        {timeline.allDocs.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Documentos Disponibles
            </h2>
            <div className="grid md:grid-cols-2 gap-3">
              {timeline.allDocs.map((doc, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  className="justify-between"
                  onClick={() => window.open(doc, "_blank")}
                >
                  <span>Documento {idx + 1}</span>
                  <Download className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </Card>
        )}

        {/* Photo Gallery */}
        {timeline.allPhotos.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Galería Completa</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {timeline.allPhotos.map((foto, idx) => (
                <img
                  key={idx}
                  src={foto}
                  alt={`Foto ${idx + 1}`}
                  className="w-full h-40 object-cover rounded-lg"
                />
              ))}
            </div>
          </Card>
        )}

        {/* CTA Section */}
        <Card className="p-8 text-center bg-primary/5 print:hidden">
          <h2 className="text-2xl font-bold mb-2">¿Te interesa este vehículo?</h2>
          <p className="text-muted-foreground mb-6">
            Solicita más información o agenda una cita para verlo
          </p>
          <div className="flex gap-3 justify-center">
            <Button size="lg">
              <Calendar className="h-5 w-5 mr-2" />
              Solicitar Cita
            </Button>
            <Button size="lg" variant="outline">
              <Share2 className="h-5 w-5 mr-2" />
              Más Información
            </Button>
          </div>
        </Card>
      </div>

      {/* Print Footer */}
      <div className="hidden print:block mt-8 pt-4 border-t border-border text-center text-sm text-muted-foreground">
        <p>Documento generado el {new Date().toLocaleDateString("es-ES")}</p>
        <p>Historial completo del vehículo {vehiculo.marca} {vehiculo.modelo} {vehiculo.anio}</p>
      </div>
    </div>
  );
}
