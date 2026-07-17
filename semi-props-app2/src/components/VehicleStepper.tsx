import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type VehicleStatus =
  | "Ingreso"
  | "Inspección"
  | "Retoques"
  | "Listo"
  | "Publicado"
  | "Vendido"
  | "Oferta";

const steps: { id: number; name: string; status: VehicleStatus }[] = [
  { id: 1, name: "Ingreso", status: "Ingreso" },
  { id: 2, name: "Inspección", status: "Inspección" },
  { id: 3, name: "Retoques", status: "Retoques" },
  { id: 4, name: "Listo", status: "Listo" },
  { id: 5, name: "Publicado", status: "Publicado" },
  { id: 6, name: "Venta", status: "Vendido" },
  { id: 7, name: "Oferta", status: "Oferta" },
];

interface VehicleStepperProps {
  currentStatus: VehicleStatus;
  className?: string;
}

export function VehicleStepper({ currentStatus, className }: VehicleStepperProps) {
  const currentStepIndex = steps.findIndex((step) => step.status === currentStatus);

  const getStepState = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) return "completed";
    if (stepIndex === currentStepIndex) return "current";
    return "upcoming";
  };

  return (
    <nav aria-label="Progreso del vehículo" className={className}>
      <ol className="flex items-center w-full">
        {steps.map((step, stepIdx) => {
          const state = getStepState(stepIdx);
          const isLast = stepIdx === steps.length - 1;

          return (
            <li key={step.id} className={cn("flex items-center", !isLast && "flex-1")}>
              <div className="flex items-center">
                {/* Step Circle */}
                <div className="relative flex items-center justify-center">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                      state === "completed" && "border-primary bg-primary text-primary-foreground",
                      state === "current" && "border-primary bg-background text-primary",
                      state === "upcoming" && "border-muted-foreground/30 bg-background text-muted-foreground"
                    )}
                  >
                    {state === "completed" ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="text-sm font-semibold">{step.id}</span>
                    )}
                  </div>
                </div>

                {/* Step Label */}
                <div className="ml-3 hidden sm:block">
                  <p
                    className={cn(
                      "text-sm font-medium transition-colors",
                      state === "completed" && "text-primary",
                      state === "current" && "text-primary",
                      state === "upcoming" && "text-muted-foreground"
                    )}
                  >
                    {step.name}
                  </p>
                </div>
              </div>

              {/* Connector Line */}
              {!isLast && (
                <div
                  className={cn(
                    "mx-4 h-0.5 flex-1 transition-colors",
                    stepIdx < currentStepIndex ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
