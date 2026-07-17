// Unified vehicle states and their visual representations

export type VehicleState =
  | "Ingreso"
  | "Inspección"
  | "Retoques"
  | "Listo"
  | "Publicado"
  | "Vendido"
  | "Oferta";

export const estadoLabels: Record<VehicleState, string> = {
  Ingreso: "Ingreso",
  Inspección: "Inspección",
  Retoques: "Retoques",
  Listo: "Listo",
  Publicado: "Publicado",
  Vendido: "Vendido",
  Oferta: "Oferta",
};

// Fixed colors for each state
export const estadoBadgeVariants: Record<
  VehicleState,
  "default" | "secondary" | "outline" | "destructive"
> = {
  Ingreso: "secondary", // info color
  Inspección: "outline", // warning color
  Retoques: "outline", // violet color
  Listo: "default", // success color
  Publicado: "default", // primary color
  Vendido: "secondary", // gray color
  Oferta: "outline", // ✅ nuevo
};

// Helper to get the appropriate badge variant class
export const getEstadoBadgeClass = (estado: VehicleState): string => {
  const classes: Record<VehicleState, string> = {
    Ingreso: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    Inspección:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    Retoques:
      "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300",
    Listo: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    Publicado: "bg-primary/10 text-primary",
    Vendido: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    Oferta:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300", // ✅ nuevo
  };
  return classes[estado] || "";
};

// Action button labels
export const actionLabels = {
  view: "Abrir",
  edit: "Editar ficha",
  publish: "Crear anuncio",
  activate: "Activar anuncio",
  sell: "Registrar venta",
  createOffer: "Crear oferta",
  viewHistory: "Ver historial",
};
