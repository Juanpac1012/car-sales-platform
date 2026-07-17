import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Calendar, Wrench, ExternalLink } from "lucide-react";
import { calcSuggestedPriceRange, dataStore, type Vehiculo, type MarketComp } from "@/lib/dataStore";

interface PricingPanelProps {
  vehiculo: Vehiculo;
  onApplyPrice?: (price: number) => void;
  onCreateOffer?: () => void;
}

export function PricingPanel({ vehiculo, onApplyPrice, onCreateOffer }: PricingPanelProps) {
  const [daysTarget, setDaysTarget] = useState(30);
  const [customPrice, setCustomPrice] = useState("");

  const pricing = calcSuggestedPriceRange(vehiculo, daysTarget);

  // Get relevant comparables
  const relevantComps = dataStore.marketComps
    .filter(
      (c) =>
        c.marca.toLowerCase() === vehiculo.marca.toLowerCase() &&
        c.modelo.toLowerCase() === vehiculo.modelo.toLowerCase() &&
        Math.abs(c.anio - vehiculo.anio) <= 1
    )
    .slice(0, 10);

  // Calculate margin with custom price
  const calcCustomMargin = () => {
    const price = parseFloat(customPrice) || pricing.recommended;
    const margin = price - vehiculo.costoCompra - pricing.recon;
    const marginPct = (margin / price) * 100;
    return {
      margin: Math.round(margin),
      marginPct: Math.round(marginPct * 10) / 10,
    };
  };

  const customMargin = calcCustomMargin();

  return (
    <Card className="p-6 space-y-6" style={{ boxShadow: "var(--shadow-card)" }}>
      <div>
        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Precio Sugerido Contextual
        </h3>
        <p className="text-sm text-muted-foreground">
          Análisis de mercado y recomendación de pricing basada en comparables
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>Mercado (Mediana)</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            ${pricing.market.toLocaleString()}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wrench className="h-4 w-4" />
            <span>Retoques</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            ${pricing.recon.toLocaleString()}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Días en Stock</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{pricing.days}</p>
        </div>

        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">Margen Objetivo</div>
          <p className="text-2xl font-bold text-foreground">
            {(dataStore.pricingRules.targetMarginPct * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Recommended Price Range */}
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              Precio Recomendado
            </div>
            <p className="text-3xl font-bold text-primary">
              ${pricing.recommended.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Margen: ${pricing.margin.toLocaleString()} ({pricing.marginPct}%)
            </p>
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-1">Rango Sugerido</div>
            <p className="text-2xl font-semibold text-foreground">
              ${pricing.range[0].toLocaleString()} - $
              {pricing.range[1].toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Basado en condiciones de mercado actuales
            </p>
          </div>
        </div>
      </div>

      {/* Days Target Simulator */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">
          Simulador: Días Objetivo a Venta
        </Label>
        <div className="flex items-center gap-4">
          <Slider
            value={[daysTarget]}
            onValueChange={(value) => setDaysTarget(value[0])}
            min={15}
            max={60}
            step={5}
            className="flex-1"
          />
          <Badge variant="secondary" className="text-base px-3 py-1">
            {daysTarget} días
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Ajusta el objetivo de días para ver cómo impacta el precio recomendado
        </p>
      </div>

      {/* Custom Price Input */}
      <div className="space-y-3">
        <Label htmlFor="customPrice" className="text-base font-semibold">
          Previsualización de Margen
        </Label>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              id="customPrice"
              type="number"
              placeholder={pricing.recommended.toString()}
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4 px-4 py-2 bg-muted rounded-md">
            <div className="text-sm">
              <span className="text-muted-foreground">Margen: </span>
              <span className="font-semibold">
                ${customMargin.margin.toLocaleString()}
              </span>
            </div>
            <Badge
              variant={customMargin.marginPct >= 12 ? "default" : "secondary"}
            >
              {customMargin.marginPct}%
            </Badge>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {onApplyPrice && (
          <Button
            onClick={() =>
              onApplyPrice(
                parseFloat(customPrice) || pricing.recommended
              )
            }
            className="flex-1"
          >
            Aplicar Precio
          </Button>
        )}
        {onCreateOffer && (
          <Button onClick={onCreateOffer} variant="outline" className="flex-1">
            Crear Oferta
          </Button>
        )}
      </div>

      {/* Comparables Table */}
      {relevantComps.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-base font-semibold">
            Comparables de Mercado ({relevantComps.length})
          </h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Fuente</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relevantComps.map((comp, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">
                      {comp.marca} {comp.modelo}
                    </TableCell>
                    <TableCell>{comp.anio}</TableCell>
                    <TableCell className="font-semibold">
                      ${comp.precio.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{comp.origen || "N/A"}</Badge>
                    </TableCell>
                    <TableCell>
                      {comp.link && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(comp.link, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </Card>
  );
}
