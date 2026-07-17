// Ingreso.tsx
import { useState, useEffect, ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { type Vehiculo } from "@/lib/dataStore";
import { Badge } from "@/components/ui/badge";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
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
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ✅ Importa tu vehicleStates (asegurate de haber agregado "Oferta" ahí también)
import {
  estadoLabels,
  estadoBadgeVariants,
  getEstadoBadgeClass,
} from "@/lib/vehicleStates";

import {
  getMakes,
  getModels,
  getSuppliers,
  getRecentVehicles,
  getVehicleById,
  deleteVehicle,
  updateVehicle,
  updateVehiclePriceCRC,
  existsPlate,
  existsVin,
  Make,
  Model,
  Supplier,
  getVehiclesCountExcludingSold,
  getVehiclesCountByStatus,
} from "@/lib/IngresoApi";

import {
  crearVehiculoN8N,
  crearCarpetasN8N,
  compressImage,
  subirFotoN8NConReintentos,
  actualizarFotosVehiculoN8N,
} from "@/lib/IngresoWebhook";
import { getExchangeRate } from "@/lib/exchangeRateService";

// ✅ Error handling (mapeable)
import { dbErrorToSpanishMessage, logDbError } from "@/lib/errors/EnumDbError";

// Formatea colones con puntos cada tres cifras
function formatColones(value: number): string {
  return value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function getSafeErrorMessage(
  err: any,
  fallback = "Ocurrió un error. Intenta nuevamente.",
) {
  if (err instanceof Error && err.message) {
    if (err.message === "AUTH_REDIRECT")
      return "Tu sesión expiró. Inicia sesión nuevamente.";
    return err.message;
  }

  try {
    const msg = dbErrorToSpanishMessage(err);
    return msg || fallback;
  } catch {
    return fallback;
  }
}

const ITEMS_PER_PAGE = 10;

// Schema para el formulario de edición
const editFormSchema = z.object({
  año: z.coerce
    .number()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  colorExterior: z.string().min(1, "Color exterior es requerido").max(30),
  colorInterior: z.string().min(1, "Color interior es requerido").max(30),
  transmision: z.enum(["Manual", "Automática", "Híbrida"]),
  combustible: z
    .enum(["Gasolina", "Diesel", "Eléctrico", "Híbrido"])
    .optional(),
  motor: z.string().max(50).optional(),
  traccion: z.enum(["Delantera", "Trasera", "4x4", "AWD"]).optional(),
  kilometraje: z.coerce.number().min(0).optional(),
  pasajeros: z.coerce.number().min(1).max(50),
  puertas: z.coerce.number().min(1).max(10),
  vin: z.string().min(1, "VIN es requerido").max(17),
  placa: z.string().max(20).optional(),
  costoCompra: z.coerce.number().min(0),
  precioSugerido: z.coerce.number().min(0),
  proveedor: z.string().optional(),
  notas: z.string().optional(),
});

// Componente para editar vehículo
interface EditVehicleDialogProps {
  vehicle: Vehiculo;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  makes: Make[];
  models: Model[];
  suppliers: Supplier[];
  exchangeRate: number;
  onSuccess: () => void;
}

function EditVehicleDialog({
  vehicle,
  open,
  onOpenChange,
  makes,
  models,
  suppliers,
  exchangeRate,
  onSuccess,
}: EditVehicleDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [newPhotosPreview, setNewPhotosPreview] = useState<string[]>([]);

  const editForm = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      año: vehicle.anio || new Date().getFullYear(),
      colorExterior: vehicle.colorExterior || "",
      colorInterior: vehicle.colorInterior || "",
      transmision: vehicle.transmision || "Manual",
      combustible: vehicle.combustible,
      motor: vehicle.motor || "",
      traccion: vehicle.traccion,
      kilometraje: vehicle.kilometraje || 0,
      pasajeros: vehicle.pasajeros || 5,
      puertas: vehicle.puertas || 4,
      vin: vehicle.vin || "",
      placa: vehicle.placa || "",
      costoCompra: vehicle.costoCompra || undefined,
      precioSugerido: vehicle.precioSugerido || undefined,
      proveedor: vehicle.proveedor || "",
      notas: vehicle.notas || "",
    },
  });

  useEffect(() => {
    if (open) {
      editForm.reset({
        año: vehicle.anio || new Date().getFullYear(),
        colorExterior: vehicle.colorExterior || "",
        colorInterior: vehicle.colorInterior || "",
        transmision: vehicle.transmision || "Manual",
        combustible: vehicle.combustible,
        motor: vehicle.motor || "",
        traccion: vehicle.traccion,
        kilometraje: vehicle.kilometraje || 0,
        pasajeros: vehicle.pasajeros || 5,
        puertas: vehicle.puertas || 4,
        vin: vehicle.vin || "",
        placa: vehicle.placa || "",
        costoCompra: vehicle.costoCompra || undefined,
        precioSugerido: vehicle.precioSugerido || undefined,
        proveedor: vehicle.proveedor || "",
        notas: vehicle.notas || "",
      });
      setNewPhotos([]);
      setNewPhotosPreview([]);
    }
  }, [open, vehicle, editForm]);

  const handleNewPhotosChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);

      if (files.length > 8 || files.length + newPhotos.length > 8) {
        toast({
          title: "Máximo 8 imágenes",
          description: "Solo se permiten hasta 8 imágenes por vehículo.",
          variant: "destructive",
        });
        return;
      }

      setNewPhotos(files);
      const previews = files.map((file) => URL.createObjectURL(file));
      setNewPhotosPreview(previews);
    }
  };

  const handleRemoveNewPhoto = (index: number) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== index));
    setNewPhotosPreview((prev) => prev.filter((_, i) => i !== index));
  };

  const onEditSubmit = async (values: z.infer<typeof editFormSchema>) => {
    setIsSubmitting(true);

    try {
      const transmissionMap: Record<
        "Manual" | "Automática" | "Híbrida",
        "manual" | "automatic" | "hybrid"
      > = {
        Manual: "manual",
        Automática: "automatic",
        Híbrida: "hybrid",
      };

      const fuelTypeMap: Record<NonNullable<typeof values.combustible>, string> =
        {
          Gasolina: "gasoline",
          Diesel: "diesel",
          Eléctrico: "electric",
          Híbrido: "hybrid",
        };

      const driveTypeMap: Record<NonNullable<typeof values.traccion>, string> =
        {
          Delantera: "fwd",
          Trasera: "rwd",
          "4x4": "4wd",
          AWD: "awd",
        };

      await updateVehicle(vehicle.id, {
        year: values.año,
        vin: values.vin,
        license_plate: values.placa,
        color_ext: values.colorExterior,
        color_int: values.colorInterior,
        transmission: transmissionMap[values.transmision],
        fuel_type: values.combustible
          ? fuelTypeMap[values.combustible]
          : "gasoline",
        engine: values.motor || "",
        drive_type: values.traccion ? driveTypeMap[values.traccion] : "fwd",
        odometer_km: values.kilometraje || 0,
        doors: values.puertas,
        seats: values.pasajeros,
        price1: values.costoCompra,
        price2: values.precioSugerido,
        notes: values.notas,
        supplier_id: values.proveedor || null,
      });

      const price1CRC =
        Math.round(values.costoCompra * exchangeRate * 100) / 100;
      const price2CRC =
        Math.round(values.precioSugerido * exchangeRate * 100) / 100;
      await updateVehiclePriceCRC(vehicle.id, price1CRC, price2CRC);

      // 🔥 IMPORTANTE: si subieron fotos nuevas, también actualizamos en n8n/DB
      if (newPhotos.length > 0) {
        // Nota: aquí estamos reusando el flujo de "subirFotoN8NConReintentos"
        // usando el mismo folderId que ya tenga el vehículo NO lo tenemos acá.
        // Si tu webhook requiere folderId, necesitás traerlo desde API (ej. freshVehicleData.folder_id)
        // Como en tu código original era "solo UI", dejamos la UI pero sin subir.
        // Si querés habilitarlo, decime qué campo trae el folderId para implementarlo.
      }

      toast({
        title: "Vehículo actualizado",
        description: "Los cambios se han guardado exitosamente",
      });

      window.dispatchEvent(new CustomEvent("vehicleDataChanged"));
      onSuccess();
    } catch (error) {
      logDbError(error);
      console.error("Error actualizando vehículo:", error);

      toast({
        title: "Error",
        description: getSafeErrorMessage(error, "No se pudo actualizar el vehículo"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Editar Vehículo - {vehicle.marca} {vehicle.modelo} {vehicle.anio}
          </DialogTitle>
        </DialogHeader>

        <Form {...editForm}>
          <form
            onSubmit={editForm.handleSubmit(onEditSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={editForm.control}
                name="año"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Año</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="vin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>VIN</FormLabel>
                    <FormControl>
                      <Input maxLength={17} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="colorExterior"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color Exterior</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar color" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="Blanco">Blanco</SelectItem>
                        <SelectItem value="Negro">Negro</SelectItem>
                        <SelectItem value="Gris">Gris</SelectItem>
                        <SelectItem value="Plata">Plata</SelectItem>
                        <SelectItem value="Rojo">Rojo</SelectItem>
                        <SelectItem value="Azul">Azul</SelectItem>
                        <SelectItem value="Verde">Verde</SelectItem>
                        <SelectItem value="Amarillo">Amarillo</SelectItem>
                        <SelectItem value="Naranja">Naranja</SelectItem>
                        <SelectItem value="Café">Café</SelectItem>
                        <SelectItem value="Beige">Beige</SelectItem>
                        <SelectItem value="Dorado">Dorado</SelectItem>
                        <SelectItem value="Vino">Vino</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="colorInterior"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color Interior</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar color" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-[300px]">
                        <SelectItem value="Negro">Negro</SelectItem>
                        <SelectItem value="Gris">Gris</SelectItem>
                        <SelectItem value="Beige">Beige</SelectItem>
                        <SelectItem value="Café">Café</SelectItem>
                        <SelectItem value="Blanco">Blanco</SelectItem>
                        <SelectItem value="Crema">Crema</SelectItem>
                        <SelectItem value="Rojo">Rojo</SelectItem>
                        <SelectItem value="Azul">Azul</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="transmision"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transmisión</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Automática">Automática</SelectItem>
                        <SelectItem value="Manual">Manual</SelectItem>
                        <SelectItem value="Híbrida">Híbrida</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="combustible"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Combustible</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Gasolina">Gasolina</SelectItem>
                        <SelectItem value="Diesel">Diesel</SelectItem>
                        <SelectItem value="Eléctrico">Eléctrico</SelectItem>
                        <SelectItem value="Híbrido">Híbrido</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="motor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Motor</FormLabel>
                    <FormControl>
                      <Input placeholder="2.0L" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="traccion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tracción</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Delantera">Delantera</SelectItem>
                        <SelectItem value="Trasera">Trasera</SelectItem>
                        <SelectItem value="4x4">4x4</SelectItem>
                        <SelectItem value="AWD">AWD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="kilometraje"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kilometraje</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="pasajeros"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pasajeros</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="puertas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Puertas</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="placa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Placa</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="costoCompra"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo de Compra (USD)</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          className="pl-7 pr-32"
                          {...field}
                       value={field.value ?? ""}
                          onChange={(event) =>
                            field.onChange(
                              event.target.value === ""
                                ? undefined
                                : event.target.value,
                            )
                          }
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground whitespace-nowrap">
                          Tasa: ₡{exchangeRate.toFixed(2)} por $1
                        </span>
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {`₡${(field.value
                        ? Math.round(field.value * exchangeRate * 100) / 100
                        : 0
                      ).toLocaleString("es-CR")}`}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="precioSugerido"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio Sugerido (USD)</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          type="number"
                          min="0"
                          placeholder="0"
                          className="pl-7 pr-32"
                          {...field}
                          value={field.value ?? ""}
                          onChange={(event) =>
                            field.onChange(
                              event.target.value === ""
                                ? undefined
                                : event.target.value,
                            )
                          }
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground whitespace-nowrap">
                          Tasa: ₡{exchangeRate.toFixed(2)} por $1
                        </span>
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {`₡${
                        (field.value
                          ? Math.round(field.value * exchangeRate * 100) / 100
                          : 0
                        ).toLocaleString("es-CR")
                      }`}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="proveedor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar proveedor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={String(supplier.id)}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="notas"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observaciones adicionales..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Sección para reemplazar fotos (solo UI) */}
            <div className="space-y-4 border-t pt-4">
              <div>
                <Label htmlFor="newPhotos">Reemplazar Fotos</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Sube nuevas fotos para reemplazar las actuales del vehículo
                </p>
                <div className="mt-2 flex items-center gap-4">
                  <Input
                    id="newPhotos"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleNewPhotosChange}
                    className="hidden"
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("newPhotos")?.click()}
                    disabled={isSubmitting}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Seleccionar Fotos ({newPhotos.length})
                  </Button>
                </div>

                {newPhotosPreview.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2 text-blue-600">
                      Nuevas fotos a subir:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {newPhotosPreview.map((preview, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={preview}
                            alt={`Nueva foto ${index + 1}`}
                            className="w-20 h-20 object-cover rounded border border-blue-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewPhoto(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const formSchema = z.object({
  marca: z.string().min(1, "Marca es requerida").max(50),
  modelo: z.string().min(1, "Modelo es requerido").max(50),
  año: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  colorExterior: z.string().min(1, "Color exterior es requerido").max(30),
  colorInterior: z.string().min(1, "Color interior es requerido").max(30),
  transmision: z.enum(["Manual", "Automática", "Híbrida"]),
  combustible: z.enum(["Gasolina", "Diesel", "Eléctrico", "Híbrido"]).optional(),
  motor: z.string().max(50).optional(),
  traccion: z.enum(["Delantera", "Trasera", "4x4", "AWD"]).optional(),
  kilometraje: z.coerce.number().min(0).optional(),
  pasajeros: z.coerce.number().min(1).max(50),
  puertas: z.coerce.number().min(1).max(10),
  vin: z.string().min(1, "VIN es requerido").max(17),
  placa: z.string().min(1, "Placa es requerida").max(20),
  costoCompra: z.coerce.number().min(0),
  fechaIngreso: z.string().min(1, "Fecha de ingreso es requerida"),
  proveedor: z.string().optional(),
  notas: z.string().optional(),
  precioSugerido: z.coerce.number().min(0).optional(),
});

export default function Ingreso() {
  const { toast } = useToast();
  const navigate = useNavigate();

   // ✅ permisos (tu formato real: { "work.ingreso": "accion", ... })
  type RolePermsRaw = Record<string, string>;
 
  const [rolePerms, setRolePerms] = useState<RolePermsRaw>({});
  const [permLoaded, setPermLoaded] = useState(false);
 
  const norm = (v: any) =>
    (v ?? "")
      .toString()
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const hasPerm = (code: string, required: string = "accion") => {
    const got = rolePerms?.[code]; // en tu caso: "accion"
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
 
  // ✅ Aquí está la clave: tu permiso real es work.ingreso
  const canManageIngreso = permLoaded && hasPerm("work.ingreso", "accion");
 
  const canCreate = canManageIngreso;
  const canEdit = canManageIngreso;
  const canDelete = canManageIngreso;
  const showActions = canEdit || canDelete;

  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [fotosIngreso, setFotosIngreso] = useState<File[]>([]);
  const [fotosPreview, setFotosPreview] = useState<string[]>([]);
  const isPhotoLimitExceeded = fotosIngreso.length > 8;

  const [makes, setMakes] = useState<Make[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedMakeId, setSelectedMakeId] = useState<number | null>(null);
  const [exchangeRate, setExchangeRate] = useState<number>(520);

  const [ingresosRecientes, setIngresosRecientes] = useState<Vehiculo[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);

  const [totalVehicles, setTotalVehicles] = useState(0);
  const [ingresoOnlyCount, setIngresoOnlyCount] = useState(0);

  const [goToPageInput, setGoToPageInput] = useState("");

  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehiculo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehiculo | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalVehicles / pageSize));
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      marca: "",
      modelo: "",
      año: new Date().getFullYear(),
      colorExterior: "",
      colorInterior: "",
      transmision: "Automática",
      combustible: "Gasolina",
      motor: "",
      traccion: "Delantera",
      kilometraje: 0,
      pasajeros: 5,
      puertas: 4,
      vin: "",
      placa: "",
      costoCompra: undefined,
      fechaIngreso: new Date().toISOString().split("T")[0],
      proveedor: "",
      notas: "",
      precioSugerido: undefined,
    },
  });

  // ✅ evita parpadeos/cierres antes de cargar permisos
  useEffect(() => {
    if (permLoaded && !canCreate && showForm) setShowForm(false);
  }, [permLoaded, canCreate, showForm]);

  // ✅ Cargar catálogos
  useEffect(() => {
    const loadCatalogs = async () => {
      try {
        const [makesData, modelsData, suppliersData] = await Promise.all([
          getMakes(),
          getModels(),
          getSuppliers(),
        ]);
        setMakes(makesData);
        setModels(modelsData);
        setSuppliers(suppliersData);
      } catch (error) {
        logDbError(error);
        console.error("Error cargando catálogos:", error);

        toast({
          title: "Error cargando catálogos",
          description: getSafeErrorMessage(
            error,
            "No se pudieron cargar los catálogos. Verifica tu conexión."
          ),
          variant: "destructive",
        });
      }
    };
    loadCatalogs();
  }, [toast]);

  // ✅ Cargar tasa
  useEffect(() => {
    const loadExchangeRate = async () => {
      try {
        const rate = await getExchangeRate();
        setExchangeRate(rate);
      } catch (error) {
        console.error("Error cargando tasa de cambio:", error);
      }
    };
    loadExchangeRate();
  }, []);

  // ✅ Cargar tabla desde API
  const loadRecentFromApi = async () => {
    try {
      if (!makes.length || !models.length) return;

      const offset = (currentPage - 1) * pageSize;

      const [vehicles, totalNotSold, totalIngreso] = await Promise.all([
        getRecentVehicles(pageSize, offset),
        getVehiclesCountExcludingSold(),
        getVehiclesCountByStatus(1),
      ]);

      const makeMap = new Map(makes.map((m) => [m.id, m.name]));
      const modelMap = new Map(models.map((m) => [m.id, m.name]));

      const mapped: Vehiculo[] = vehicles.map((v: any) => {
        let estadoTexto: any = "Ingreso";

        const estadoRaw = (v.estado ?? "").toString().trim();
        const estadoNormalizedMap: Record<string, any> = {
          ingreso: "Ingreso",
          inspección: "Inspección",
          inspeccion: "Inspección",
          retoques: "Retoques",
          listo: "Listo",
          publicado: "Publicado",
          vendido: "Vendido",
          oferta: "Oferta",
        };

        if (estadoRaw) {
          const key = estadoRaw.toLowerCase();
          estadoTexto = estadoNormalizedMap[key] ?? "Ingreso";
        } else if (v.status_id) {
          const statusMap: Record<number, any> = {
            1: "Ingreso",
            2: "Inspección",
            3: "Retoques",
            4: "Listo",
            5: "Publicado",
            6: "Vendido",
            7: "Oferta",
          };
          estadoTexto = statusMap[v.status_id] ?? "Ingreso";
        }

        return {
          id: v.id,
          marca: makeMap.get(v.make_id) ?? "N/D",
          modelo: modelMap.get(v.model_id) ?? "N/D",
          anio: v.year,
          colorExterior: v.color_exterior ?? v.color_ext ?? "",
          colorInterior: v.color_interior ?? v.color_int ?? "",
          transmision:
            (v.transmision ?? v.transmission) === "automatic" ||
            (v.transmision ?? v.transmission) === "Automática"
              ? "Automática"
              : (v.transmision ?? v.transmission) === "hybrid" ||
                (v.transmision ?? v.transmission) === "Híbrida"
              ? "Híbrida"
              : "Manual",
          combustible:
            v.fuel_type === "gasoline" || v.fuel_type === "Gasolina"
              ? "Gasolina"
              : v.fuel_type === "diesel" || v.fuel_type === "Diesel"
              ? "Diesel"
              : v.fuel_type === "electric" || v.fuel_type === "Eléctrico"
              ? "Eléctrico"
              : v.fuel_type === "hybrid" || v.fuel_type === "Híbrido"
              ? "Híbrido"
              : undefined,
          motor: v.engine ?? undefined,
          traccion:
            v.drive_type === "fwd" || v.drive_type === "Delantera"
              ? "Delantera"
              : v.drive_type === "rwd" || v.drive_type === "Trasera"
              ? "Trasera"
              : v.drive_type === "4wd" || v.drive_type === "4x4"
              ? "4x4"
              : v.drive_type === "awd" || v.drive_type === "AWD"
              ? "AWD"
              : undefined,
          kilometraje: v.odometer_km ?? undefined,
          pasajeros: v.seats ?? 5,
          puertas: v.doors ?? 4,
          vin: v.vin ?? "",
          placa: v.license ?? v.license_plate ?? v.placa ?? "",
          precioSugerido: v.price2 ?? 0,
          costoCompra: v.price1 ?? 0,
          precioSugeridoCRC: v.price2_crc ?? undefined,
          costoCompraCRC: v.price1_crc ?? undefined,
          estado: estadoTexto,
          fotos: v.fotos ?? {
            ingreso: v.image_url
              ? v.image_url.split(",").filter((url: string) => url.trim())
              : [],
            revision: [],
            retoques: [],
            finales: [],
          },
          fechaIngreso: v.created_at?.slice(0, 10),
          proveedor: undefined,
          notas: v.notes ?? "",
        };
      });

      setIngresosRecientes(mapped);
      setTotalVehicles(totalNotSold);
      setIngresoOnlyCount(totalIngreso);
    } catch (error) {
      logDbError(error);
      console.error("❌ Error cargando vehículos desde API:", error);

      toast({
        title: "Error cargando vehículos",
        description: getSafeErrorMessage(
          error,
          "No se pudieron cargar los vehículos."
        ),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadRecentFromApi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [makes, models, currentPage, pageSize]);

  const filteredModels = selectedMakeId
    ? models.filter((model) => model.make_id === selectedMakeId)
    : models;

  const handleImageClick = (images: string[], startIndex: number = 0) => {
    setSelectedImages(images);
    setCurrentImageIndex(startIndex);
    setImageModalOpen(true);
  };

  const handleNextImage = () =>
    setCurrentImageIndex((prev) => (prev + 1) % selectedImages.length);
  const handlePrevImage = () =>
    setCurrentImageIndex(
      (prev) => (prev - 1 + selectedImages.length) % selectedImages.length
    );

  const handleFotosChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setFotosIngreso((prev) => [...prev, ...newFiles]);
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
      setFotosPreview((prev) => [...prev, ...newPreviews]);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setFotosIngreso((prev) => prev.filter((_, i) => i !== index));
    setFotosPreview((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!canCreate) return;
    setIsLoading(true);

    try {
      const costoCompraUSD = values.costoCompra;
      const precioSugeridoUSD = values.precioSugerido || 0;

      const transmissionMap: Record<
        "Manual" | "Automática" | "Híbrida",
        "manual" | "automatic" | "hybrid"
      > = {
        Manual: "manual",
        Automática: "automatic",
        Híbrida: "hybrid",
      };

      const fuelTypeMap: Record<NonNullable<typeof values.combustible>, string> =
        {
          Gasolina: "gasoline",
          Diesel: "diesel",
          Eléctrico: "electric",
          Híbrido: "hybrid",
        };

      const driveTypeMap: Record<NonNullable<typeof values.traccion>, string> = {
        Delantera: "fwd",
        Trasera: "rwd",
        "4x4": "4wd",
        AWD: "awd",
      };

      const make = makes.find((m) => m.name === values.marca);
      const model = models.find((m) => m.name === values.modelo);

      if (!make || !model) {
        throw new Error("Marca o modelo no encontrados en catálogos");
      }

      const plateClean = (values.placa || "").trim();
      const vinClean = (values.vin || "").trim();

      if (plateClean && (await existsPlate(plateClean))) {
        throw new Error(`La placa "${plateClean}" ya existe. Usa otra.`);
      }

      if (vinClean && (await existsVin(vinClean))) {
        throw new Error(`El VIN "${vinClean}" ya existe. Verifica el dato.`);
      }

      const payload = {
        p_make_id: make.id,
        p_model_id: model.id,
        p_year: values.año,
        p_vin: vinClean,
        p_trim_id: null,
        p_color_ext: values.colorExterior,
        p_color_int: values.colorInterior,
        p_transmission: transmissionMap[values.transmision],
        p_fuel_type: values.combustible
          ? fuelTypeMap[values.combustible]
          : "gasoline",
        p_engine: values.motor || "",
        p_drive_type: values.traccion ? driveTypeMap[values.traccion] : "fwd",
        p_odometer_km: values.kilometraje || 0,
        p_seats: values.pasajeros,
        p_doors: values.puertas,
        p_price1: costoCompraUSD,
        p_price2: precioSugeridoUSD,
        p_license: plateClean,
        p_notes: values.notas || "",
        p_supplier_id: values.proveedor || null,
      };

      const vehicleResponse = await crearVehiculoN8N(payload);
      const vehicleId =
        vehicleResponse.create_vehicle ||
        vehicleResponse.vehicleId ||
        `VEH-${Date.now()}`;

      if (!vehicleId) throw new Error("No se pudo obtener el ID del vehículo");

      const carpetasResponse = await crearCarpetasN8N({
        marca: values.marca,
        modelo: values.modelo,
        vehiculo: plateClean,
      });

      const folderId = carpetasResponse.folderId;
      if (!folderId) throw new Error("No se pudo obtener el folderId");

      const uploadedPhotos: string[] = [];
      if (fotosIngreso.length > 0) {
        for (let i = 0; i < fotosIngreso.length; i++) {
          const file = fotosIngreso[i];

          toast({
            title: `Procesando foto ${i + 1} de ${fotosIngreso.length}...`,
            description: `${file.name} - Comprimiendo y subiendo`,
          });

          try {
            const base64Comprimida = await compressImage(file);

            const fotoResponse = await subirFotoN8NConReintentos({
              fileName: `${plateClean}-${i + 1}.jpg`,
              folderId: folderId,
              id: vehicleId,
              foto: base64Comprimida,
            });

            if (fotoResponse.imageUrl) {
              uploadedPhotos.push(fotoResponse.imageUrl);
              toast({
                title: `Foto ${i + 1} subida correctamente`,
                description: "Continuando con la siguiente...",
              });
            } else {
              throw new Error("No se obtuvo URL de la foto");
            }
          } catch (photoError) {
            console.error(`Error en foto ${i + 1}:`, photoError);
            toast({
              title: `Error en foto ${i + 1}`,
              description: getSafeErrorMessage(
                photoError,
                "Error desconocido subiendo la foto"
              ),
              variant: "destructive",
            });
          }
        }
      }

      if (uploadedPhotos.length > 0) {
        try {
          await actualizarFotosVehiculoN8N({
            id: vehicleId,
            image_urls: uploadedPhotos.join(","),
          });
        } catch (error) {
          console.error("Error actualizando fotos en BD:", error);
          toast({
            title: "Error actualizando fotos",
            description: getSafeErrorMessage(
              error,
              "No se pudieron guardar las fotos en la base de datos."
            ),
            variant: "destructive",
          });
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      await loadRecentFromApi();
      
      // Notificar al sidebar para actualizar contadores
      window.dispatchEvent(new CustomEvent("vehicleDataChanged"));

      toast({
        title: "¡Éxito!",
        description: `${values.marca} ${values.modelo} ${values.año} registrado. Redirigiendo a Inspección...`,
      });

      form.reset();
      setFotosIngreso([]);
      setFotosPreview([]);
      setShowForm(false);
      
      // Redirigir a Inspección después de crear el vehículo
      setTimeout(() => {
        navigate("/inspeccion");
      }, 1500);
    } catch (error: any) {
      logDbError(error);
      console.error("Error completo en onSubmit:", error);

      toast({
        title: "Error",
        description: getSafeErrorMessage(error, "No se pudo registrar el vehículo"),
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminar
  const handleDeleteClick = (vehiculo: Vehiculo) => {
    if (!canDelete) return;
    setVehicleToDelete(vehiculo);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return;

    setIsDeleting(true);
    try {
      await deleteVehicle(vehicleToDelete.id);

      toast({
        title: "Vehículo eliminado",
        description: `${vehicleToDelete.marca} ${vehicleToDelete.modelo} ha sido eliminado exitosamente`,
      });

      setDeleteDialogOpen(false);
      setVehicleToDelete(null);

      await loadRecentFromApi();
      window.dispatchEvent(new CustomEvent("vehicleDataChanged"));
    } catch (error) {
      logDbError(error);
      console.error("Error eliminando vehículo:", error);

      toast({
        title: "Error al eliminar",
        description: getSafeErrorMessage(error, "No se pudo eliminar el vehículo"),
        variant: "destructive",
        duration: 8000,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Editar
  const handleEditClick = async (vehiculo: Vehiculo) => {
    if (!canEdit) return;
    setVehicleToEdit(vehiculo);
    setEditDialogOpen(true);

    try {
      const freshVehicleData = await getVehicleById(vehiculo.id);

      const makeMap = new Map(makes.map((m) => [m.id, m.name]));
      const modelMap = new Map(models.map((m) => [m.id, m.name]));

      const mappedVehicle: Vehiculo = {
        id: freshVehicleData.id,
        marca: makeMap.get(freshVehicleData.make_id) ?? vehiculo.marca,
        modelo: modelMap.get(freshVehicleData.model_id) ?? vehiculo.modelo,
        anio: freshVehicleData.year,
        colorExterior: freshVehicleData.color_ext ?? "",
        colorInterior: freshVehicleData.color_int ?? "",
        transmision:
          freshVehicleData.transmission === "automatic"
            ? "Automática"
            : freshVehicleData.transmission === "hybrid"
            ? "Híbrida"
            : "Manual",
        combustible:
          freshVehicleData.fuel_type === "gasoline"
            ? "Gasolina"
            : freshVehicleData.fuel_type === "diesel"
            ? "Diesel"
            : freshVehicleData.fuel_type === "electric"
            ? "Eléctrico"
            : freshVehicleData.fuel_type === "hybrid"
            ? "Híbrido"
            : undefined,
        motor: freshVehicleData.engine ?? undefined,
        traccion:
          freshVehicleData.drive_type === "fwd"
            ? "Delantera"
            : freshVehicleData.drive_type === "rwd"
            ? "Trasera"
            : freshVehicleData.drive_type === "4wd"
            ? "4x4"
            : freshVehicleData.drive_type === "awd"
            ? "AWD"
            : undefined,
        kilometraje: freshVehicleData.odometer_km ?? undefined,
        pasajeros: freshVehicleData.seats ?? 5,
        puertas: freshVehicleData.doors ?? 4,
        vin: freshVehicleData.vin ?? "",
        placa: freshVehicleData.license_plate ?? "",
        precioSugerido: freshVehicleData.price2 ?? 0,
        costoCompra: freshVehicleData.price1 ?? 0,
        precioSugeridoCRC: freshVehicleData.price2_crc ?? undefined,
        costoCompraCRC: freshVehicleData.price1_crc ?? undefined,
        estado: vehiculo.estado,
        fotos: freshVehicleData.fotos ?? vehiculo.fotos,
        fechaIngreso: freshVehicleData.created_at?.slice(0, 10),
        notas: freshVehicleData.notes ?? "",
        proveedor: freshVehicleData.supplier_id ?? undefined,
      };

      setVehicleToEdit(mappedVehicle);
    } catch (error) {
      console.warn(
        "No se pudo refrescar vehículo (se mantiene lo ya cargado):",
        error
      );
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb section="Ingreso" page="Ingreso de Vehículos" />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Ingreso</h1>
          <p className="text-muted-foreground">
            Registro inicial de vehículos al inventario
          </p>
        </div>

        {canCreate && (
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancelar" : "Nuevo Ingreso"}
          </Button>
        )}
      </div>

      {/* Recent */}
      {!showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Ingresos Recientes ({ingresoOnlyCount})</CardTitle>
          </CardHeader>

          <CardContent>
            {ingresosRecientes.length > 0 ? (
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
                    {totalVehicles === 0 ? (
                      "Sin resultados"
                    ) : (
                      <>
                        Mostrando {(currentPage - 1) * pageSize + 1}–
                        {Math.min(currentPage * pageSize, totalVehicles)} de{" "}
                        {totalVehicles}
                      </>
                    )}
                  </div>
                </div>

                <div className="overflow-x-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Imagen</TableHead>
                        <TableHead>Marca</TableHead>
                        <TableHead>Modelo</TableHead>
                        <TableHead>Año</TableHead>
                        <TableHead>Placa</TableHead>
                        <TableHead>VIN</TableHead>
                        <TableHead>Transmisión</TableHead>
                        <TableHead>Fecha Ingreso</TableHead>
                        <TableHead className="min-w-[140px]">
                          Costo Compra
                        </TableHead>
                        <TableHead className="min-w-[140px]">
                          Precio Sugerido
                        </TableHead>
                        <TableHead>Estado</TableHead>
                        {showActions && <TableHead>Acciones</TableHead>}
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {ingresosRecientes.map((vehiculo) => {
                        const fechaIngreso =
                          vehiculo.fechaIngreso ||
                          new Date().toISOString().split("T")[0];

                        return (
                          <TableRow key={vehiculo.id}>
                            <TableCell>
                              {vehiculo.fotos?.ingreso?.[0] ? (
                                <div className="relative">
                                  <img
                                    src={vehiculo.fotos.ingreso[0]}
                                    alt={`${vehiculo.marca} ${vehiculo.modelo}`}
                                    className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() =>
                                      handleImageClick(
                                        vehiculo.fotos!.ingreso,
                                        0
                                      )
                                    }
                                    crossOrigin="anonymous"
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                  />
                                  {vehiculo.fotos.ingreso.length > 1 && (
                                    <span className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1 rounded-tl">
                                      +{vehiculo.fotos.ingreso.length - 1}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                                  Sin foto
                                </div>
                              )}
                            </TableCell>

                            <TableCell className="font-medium">
                              {vehiculo.marca}
                            </TableCell>
                            <TableCell>{vehiculo.modelo}</TableCell>
                            <TableCell>{vehiculo.anio}</TableCell>
                            <TableCell>{vehiculo.placa}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {vehiculo.vin || "-"}
                            </TableCell>
                            <TableCell>{vehiculo.transmision || "-"}</TableCell>
                            <TableCell>{fechaIngreso}</TableCell>

                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">
                                  $
                                  {vehiculo.costoCompra?.toLocaleString() ||
                                    "0"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ≈ ₡
                                  {formatColones(
                                    vehiculo.costoCompraCRC ||
                                      (vehiculo.costoCompra || 0) *
                                        exchangeRate
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <div className="text-sm">
                                <div className="font-medium">
                                  $
                                  {vehiculo.precioSugerido?.toLocaleString() ||
                                    "0"}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  ≈ ₡
                                  {formatColones(
                                    vehiculo.precioSugeridoCRC ||
                                      (vehiculo.precioSugerido || 0) *
                                        exchangeRate
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            <TableCell>
                              <Badge
                                variant={
                                  estadoBadgeVariants[vehiculo.estado as any]
                                }
                                className={getEstadoBadgeClass(
                                  vehiculo.estado as any
                                )}
                              >
                                {estadoLabels[vehiculo.estado as any] ??
                                  vehiculo.estado}
                              </Badge>
                            </TableCell>

                            {showActions && (
                              <TableCell>
                                <div className="flex gap-2">
                                  {canEdit && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEditClick(vehiculo)}
                                      title="Editar vehículo"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  )}

                                  {canDelete && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() =>
                                        handleDeleteClick(vehiculo)
                                      }
                                      title="Eliminar vehículo"
                                      className="text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {totalVehicles > 0 && (
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
                          )
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
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-lg mb-2">No hay vehículos registrados</p>
                <p className="text-sm">
                  Haz clic en &quot;Nuevo Ingreso&quot; para agregar tu primer
                  vehículo
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formulario */}
      {showForm && canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Formulario de Ingreso</CardTitle>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="marca"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Marca</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            const make = makes.find((m) => m.name === value);
                            setSelectedMakeId(make?.id || null);
                            form.setValue("modelo", "");
                          }}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar marca" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {makes.map((make) => (
                              <SelectItem key={make.id} value={make.name}>
                                {make.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="modelo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Modelo</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar modelo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredModels.map((model) => (
                              <SelectItem key={model.id} value={model.name}>
                                {model.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="año"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Año</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="2020" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="colorExterior"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color Exterior</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar color" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px]">
                            <SelectItem value="Blanco">Blanco</SelectItem>
                            <SelectItem value="Negro">Negro</SelectItem>
                            <SelectItem value="Gris">Gris</SelectItem>
                            <SelectItem value="Plata">Plata</SelectItem>
                            <SelectItem value="Rojo">Rojo</SelectItem>
                            <SelectItem value="Azul">Azul</SelectItem>
                            <SelectItem value="Verde">Verde</SelectItem>
                            <SelectItem value="Amarillo">Amarillo</SelectItem>
                            <SelectItem value="Naranja">Naranja</SelectItem>
                            <SelectItem value="Café">Café</SelectItem>
                            <SelectItem value="Beige">Beige</SelectItem>
                            <SelectItem value="Dorado">Dorado</SelectItem>
                            <SelectItem value="Vino">Vino</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="colorInterior"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color Interior</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar color" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="max-h-[300px]">
                            <SelectItem value="Negro">Negro</SelectItem>
                            <SelectItem value="Gris">Gris</SelectItem>
                            <SelectItem value="Beige">Beige</SelectItem>
                            <SelectItem value="Café">Café</SelectItem>
                            <SelectItem value="Blanco">Blanco</SelectItem>
                            <SelectItem value="Crema">Crema</SelectItem>
                            <SelectItem value="Rojo">Rojo</SelectItem>
                            <SelectItem value="Azul">Azul</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="transmision"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Transmisión</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Automática">Automática</SelectItem>
                            <SelectItem value="Manual">Manual</SelectItem>
                            <SelectItem value="Híbrida">Híbrida</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="combustible"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Combustible</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Gasolina">Gasolina</SelectItem>
                            <SelectItem value="Diesel">Diesel</SelectItem>
                            <SelectItem value="Eléctrico">Eléctrico</SelectItem>
                            <SelectItem value="Híbrido">Híbrido</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="motor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Motor</FormLabel>
                        <FormControl>
                          <Input placeholder="2.0L" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="traccion"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tracción</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Delantera">Delantera</SelectItem>
                            <SelectItem value="Trasera">Trasera</SelectItem>
                            <SelectItem value="4x4">4x4</SelectItem>
                            <SelectItem value="AWD">AWD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="kilometraje"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kilometraje</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pasajeros"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pasajeros</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="puertas"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Puertas</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="vin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VIN</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="1HGBH41JXMN109186"
                            maxLength={17}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="placa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Placa</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="costoCompra"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Costo de Compra (USD)</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              className="pl-7 pr-32"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(event) =>
                                field.onChange(
                                  event.target.value === ""
                                    ? undefined
                                    : event.target.value,
                                )
                              }
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground whitespace-nowrap">
                              Tasa: ₡{exchangeRate.toFixed(2)} por $1
                            </span>
                          </div>
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          {`₡${
                            (field.value
                              ? Math.round(field.value * exchangeRate * 100) /
                                100
                              : 0
                            ).toLocaleString("es-CR")
                          }`}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="precioSugerido"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio Sugerido (USD)</FormLabel>
                        <FormControl>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              type="number"
                              min="0"
                              placeholder="0"
                              className="pl-7 pr-32"
                              {...field}
                              value={field.value ?? ""}
                              onChange={(event) =>
                                field.onChange(
                                  event.target.value === ""
                                    ? undefined
                                    : event.target.value,
                                )
                              }
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground whitespace-nowrap">
                              Tasa: ₡{exchangeRate.toFixed(2)} por $1
                            </span>
                          </div>
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          {`₡${
                            (field.value
                              ? Math.round(field.value * exchangeRate * 100) /
                                100
                              : 0
                            ).toLocaleString("es-CR")
                          }`}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fechaIngreso"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fecha de Ingreso</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="proveedor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Proveedor</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar Proveedor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem
                                key={supplier.id}
                                value={String(supplier.id)}
                              >
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notas (Opcional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Observaciones adicionales..."
                          className="resize-none"
                          rows={4}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fotos">Fotos de Ingreso</Label>
                    <div className="mt-2 flex items-center gap-4">
                      <Input
                        id="fotos"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleFotosChange}
                        className="hidden"
                        disabled={isLoading || isPhotoLimitExceeded}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          document.getElementById("fotos")?.click()
                        }
                        disabled={isLoading || isPhotoLimitExceeded}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Subir Fotos ({fotosIngreso.length})
                      </Button>
                      {isPhotoLimitExceeded && (
                        <span
                          style={{
                            color: "red",
                            marginLeft: "8px",
                            fontWeight: "bold",
                          }}
                        >
                          No se pueden subir más de 8 imágenes
                        </span>
                      )}
                    </div>

                    {fotosPreview.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {fotosPreview.map((preview, index) => (
                          <div
                            key={index}
                            className="relative group flex flex-col items-center"
                          >
                            <img
                              src={preview}
                              alt={`Foto ${index + 1}`}
                              className="w-20 h-20 object-cover rounded border"
                            />
                            <span className="text-xs text-muted-foreground mt-1">
                              {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading || isPhotoLimitExceeded}
                  >
                    {isLoading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isLoading ? "Registrando..." : "Registrar Vehículo"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      {/* Modal imágenes */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>
              Imagen {currentImageIndex + 1} de {selectedImages.length}
            </DialogTitle>
          </DialogHeader>

          {selectedImages.length > 0 && (
            <div className="relative">
              <div className="flex justify-center items-center min-h-[60vh]">
                <img
                  src={selectedImages[currentImageIndex]}
                  alt={`Vista completa ${currentImageIndex + 1}`}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  crossOrigin="anonymous"
                  referrerPolicy="no-referrer"
                />
              </div>

              {selectedImages.length > 1 && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={handlePrevImage}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
                    onClick={handleNextImage}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </Button>
                </>
              )}

              {selectedImages.length > 1 && (
                <div className="flex justify-center gap-2 mt-4 overflow-x-auto pb-2">
                  {selectedImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className={`w-16 h-16 object-cover rounded cursor-pointer border-2 transition-all ${
                        idx === currentImageIndex
                          ? "border-blue-500 scale-110"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                      onClick={() => setCurrentImageIndex(idx)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmación eliminar */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de eliminar este vehículo?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el vehículo{" "}
              <strong>
                {vehicleToDelete?.marca} {vehicleToDelete?.modelo}{" "}
                {vehicleToDelete?.anio}
              </strong>{" "}
              con placa <strong>{vehicleToDelete?.placa}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit dialog */}
      {vehicleToEdit && (
        <EditVehicleDialog
          vehicle={vehicleToEdit}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          makes={makes}
          models={models}
          suppliers={suppliers}
          exchangeRate={exchangeRate}
          onSuccess={async () => {
            await loadRecentFromApi();
            setEditDialogOpen(false);
            setVehicleToEdit(null);
          }}
        />
      )}
    </div>
  );
}
