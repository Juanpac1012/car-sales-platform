// Global in-memory data store
// This file contains all the seed data and helper functions for the application

// Standard images from Pexels
export const IMG = {
  toyota_corolla: "https://images.pexels.com/photos/170811/pexels-photo-170811.jpeg",
  honda_crv: "https://images.pexels.com/photos/210019/pexels-photo-210019.jpeg",
  hyundai_accent: "https://images.pexels.com/photos/248539/pexels-photo-248539.jpeg",
  nissan_sentra: "https://images.pexels.com/photos/358070/pexels-photo-358070.jpeg",
  mazda_3: "https://images.pexels.com/photos/1335077/pexels-photo-1335077.jpeg",
  kia_sportage: "https://images.pexels.com/photos/1402787/pexels-photo-1402787.jpeg",
  toyota_yaris: "https://images.pexels.com/photos/305070/pexels-photo-305070.jpeg",
  chevrolet_onix: "https://images.pexels.com/photos/1149831/pexels-photo-1149831.jpeg",
};

// Types
export interface Vehiculo {
  id: string;
  marca: string;
  modelo: string;
  anio: number;
  colorExterior: string;
  colorInterior: string;
  transmision: "Manual" | "Automática" | "Híbrida";
  combustible?: "Gasolina" | "Diesel" | "Eléctrico" | "Híbrido";
  motor?: string;
  traccion?: "Delantera" | "Trasera" | "4x4" | "AWD";
  kilometraje?: number;
  pasajeros: number;
  puertas: number;
  vin: string;
  placa: string;
  precioSugerido: number;
  costoCompra: number;
  precioSugeridoCRC?: number;  // Precio sugerido en colones
  costoCompraCRC?: number;     // Costo compra en colones
  precioVenta?: number;
  estado: "Ingreso" | "Inspección" | "Retoques" | "Listo" | "Publicado" | "Vendido";
  fotos: {
    ingreso: string[];
    revision: string[];
    retoques: string[];
    finales: string[];
  };
  fechaIngreso?: string;
  fechaVenta?: string;
  proveedor?: string;
  notas?: string;
}

export interface Inspeccion {
  id: string;
  vehiculoId: string;
  checklist: {
    motor: boolean;
    frenos: boolean;
    suspension: boolean;
    llantas: boolean;
    interior: boolean;
    exterior: boolean;
  };
  notas: string;
  fotosRevision: string[];
  resultado: "listo" | "retoques";
  fecha: string;
}

export interface RetoqueTarea {
  id: string;
  tarea: string;
  responsable: string;
  costo: number;
  fechaInicio: string;
  fechaFin: string;
  notas: string;
  proveedorId?: string;
}

export interface Retoque {
  vehiculoId: string;
  tareas: RetoqueTarea[];
  fotosRetoques: string[];
}

export interface Publicacion {
  id: string;
  vehiculoId: string;
  titulo: string;
  activo: boolean;
  precio: number;
  imagenes: string[];
}

export interface Vendedor {
  id: string;
  nombre: string;
  telefono?: string;
  email?: string;
  activo: boolean;
  foto?: string;
  equipo?: string;
  metaVentasMes?: number;
  createdAt: string;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  email?: string;
   ownerId?: string;
  preferencia?: {
    marca?: string;
    modelo?: string;
    anioDesde?: number;
    anioHasta?: number;
    presupuestoMax?: number;
  };
  createdAt?: string;            // fecha en formato YYYY-MM-DD
  updatedAt?: string;            // fecha en formato YYYY-MM-DD
  syncStatus?: "local" | "syncing" | "synced" | "error";
}

export interface MotivoPerdida {
  id: string;
  nombre: string;
}

export interface Oferta {
  id: string;
  clienteId: string;
  fuente: "INVENTARIO" | "PROVEEDOR" | "CRAUTOS";
  vehiculo?: {
    id?: string;
    marca: string;
    modelo: string;
    anio: number;
  };
  linkExterno?: string;
  proveedorId?: string;
  precioOfertado: number;
  estado: "ENVIADA" | "NEGOCIANDO" | "GANADA" | "PERDIDA" | "CADUCADA";
  validez: {
    desde: string;
    hasta: string;
  };
  notas?: string;
  motivoPerdidaId?: string;
  vendedorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Interaccion {
  id: string;
  ofertaId: string;
  fecha: string;
  canal: "WHATSAPP" | "LLAMADA" | "EMAIL" | "PRESENCIAL";
  nota: string;
}

export interface Venta {
  id: string;
  vehiculoId: string;
  clienteId?: string;
  cliente?: {
    nombre: string;
    telefono: string;
    email?: string;
  };
  precioFinal: number;
  metodoPago: string;
  vendedor: string; // Legacy: keep for display
  vendedorId: string;
  vendedorNombre?: string; // Normalized name
  fecha: string;
}

export interface Proveedor {
  id: string;
  nombre: string;
  tipo: "Casa Comercial" | "Taller/Servicio";
  url?: string;
  contacto: string;
  telefono: string;
  logo?: string;
  servicios?: string[];
}

export interface ProveedorInventario {
  proveedorId: string;
  marca: string;
  modelo: string;
  anio: number;
  precioRef: number;
  transmision: string;
  url: string;
  thumb: string;
}

export interface MarketComp {
  marca: string;
  modelo: string;
  anio: number;
  precio: number;
  origen?: string;
  km?: number;
  link?: string;
}

export interface PricingRules {
  targetMarginPct: number;
  daysToSaleTarget: number;
  markdownPerWeekPct: number;
  minRangePct: number;
  maxRangePct: number;
}

export interface PricingResult {
  market: number;
  recon: number;
  days: number;
  recommended: number;
  range: [number, number];
  margin: number;
  marginPct: number;
}

export interface VehicleEvent {
  id: string;
  vehiculoId: string;
  etapa: "INGRESO" | "INSPECCION" | "RETOQUES" | "PUBLICACION" | "VENTA";
  fecha: string;
  notas?: string;
  fotos?: string[];
  documentos?: string[];
  responsable?: string;
}

// Global data store
export const dataStore = {
  vendedores: [
    {
      id: "S001",
      nombre: "Eric Gómez",
      email: "eric@demo.com",
      telefono: "+506 7000-0001",
      activo: true,
      equipo: "Centro",
      metaVentasMes: 4,
      foto: "https://i.pravatar.cc/96?u=eric",
      createdAt: "2025-01-01",
    },
    {
      id: "S002",
      nombre: "Ana Rojas",
      email: "ana@demo.com",
      telefono: "+506 7000-0002",
      activo: true,
      equipo: "Oeste",
      metaVentasMes: 5,
      foto: "https://i.pravatar.cc/96?u=ana",
      createdAt: "2025-01-01",
    },
    {
      id: "S003",
      nombre: "Luis Mora",
      email: "luis@demo.com",
      telefono: "+506 7000-0003",
      activo: true,
      equipo: "Norte",
      metaVentasMes: 3,
      foto: "https://i.pravatar.cc/96?u=luis",
      createdAt: "2025-01-01",
    },
  ] as Vendedor[],

  vehiculos: [
    {
      id: "V001",
      marca: "Toyota",
      modelo: "Corolla",
      anio: 2018,
      colorExterior: "Blanco",
      colorInterior: "Negro",
      transmision: "Automática" as const,
      pasajeros: 5,
      puertas: 4,
      vin: "1HG...9186",
      placa: "ABC-123",
      precioSugerido: 14500,
      costoCompra: 7200,
      estado: "Listo" as const,
      fechaIngreso: "2025-09-01",
      fotos: {
        ingreso: [IMG.toyota_corolla],
        revision: [IMG.toyota_corolla],
        retoques: [],
        finales: [IMG.toyota_corolla],
      },
    },
    {
      id: "V002",
      marca: "Honda",
      modelo: "CR-V",
      anio: 2020,
      colorExterior: "Gris",
      colorInterior: "Negro",
      transmision: "Automática" as const,
      pasajeros: 5,
      puertas: 5,
      vin: "2HG...9187",
      placa: "XYZ-789",
      precioSugerido: 25500,
      costoCompra: 11800,
      estado: "Retoques" as const,
      fechaIngreso: "2025-09-15",
      fotos: {
        ingreso: [IMG.honda_crv],
        revision: [IMG.honda_crv],
        retoques: [IMG.honda_crv],
        finales: [],
      },
    },
    {
      id: "V003",
      marca: "Hyundai",
      modelo: "Accent",
      anio: 2017,
      colorExterior: "Gris",
      colorInterior: "Beige",
      transmision: "Manual" as const,
      pasajeros: 5,
      puertas: 4,
      vin: "3HG...9188",
      placa: "HJK-456",
      precioSugerido: 11000,
      costoCompra: 5500,
      estado: "Vendido" as const,
      fechaIngreso: "2025-08-20",
      fechaVenta: "2025-10-05",
      precioVenta: 10700,
      fotos: {
        ingreso: [IMG.hyundai_accent],
        revision: [IMG.hyundai_accent],
        retoques: [],
        finales: [IMG.hyundai_accent],
      },
    },
    {
      id: "V004",
      marca: "Nissan",
      modelo: "Sentra",
      anio: 2016,
      colorExterior: "Azul",
      colorInterior: "Negro",
      transmision: "Automática" as const,
      pasajeros: 5,
      puertas: 4,
      vin: "4HG...9189",
      placa: "LMN-852",
      precioSugerido: 10500,
      costoCompra: 6000,
      estado: "Inspección" as const,
      fechaIngreso: "2025-10-01",
      fotos: {
        ingreso: [IMG.nissan_sentra],
        revision: [],
        retoques: [],
        finales: [],
      },
    },
    {
      id: "V005",
      marca: "Mazda",
      modelo: "3",
      anio: 2019,
      colorExterior: "Rojo",
      colorInterior: "Negro",
      transmision: "Automática" as const,
      pasajeros: 5,
      puertas: 4,
      vin: "5HG...9190",
      placa: "MAZ-333",
      precioSugerido: 16500,
      costoCompra: 9800,
      estado: "Ingreso" as const,
      fechaIngreso: "2025-10-12",
      fotos: {
        ingreso: [IMG.mazda_3],
        revision: [],
        retoques: [],
        finales: [],
      },
    },
    {
      id: "V006",
      marca: "Kia",
      modelo: "Sportage",
      anio: 2018,
      colorExterior: "Negro",
      colorInterior: "Negro",
      transmision: "Automática" as const,
      pasajeros: 5,
      puertas: 5,
      vin: "6HG...9191",
      placa: "KIA-222",
      precioSugerido: 18900,
      costoCompra: 12000,
      estado: "Vendido" as const,
      fechaIngreso: "2025-09-05",
      fechaVenta: "2025-10-08",
      precioVenta: 18500,
      fotos: {
        ingreso: [IMG.kia_sportage],
        revision: [IMG.kia_sportage],
        retoques: [],
        finales: [IMG.kia_sportage],
      },
    },
    {
      id: "V007",
      marca: "Toyota",
      modelo: "Yaris",
      anio: 2017,
      colorExterior: "Plata",
      colorInterior: "Negro",
      transmision: "Manual" as const,
      pasajeros: 5,
      puertas: 4,
      vin: "7HG...9192",
      placa: "TOY-717",
      precioSugerido: 9800,
      costoCompra: 6100,
      estado: "Listo" as const,
      fechaIngreso: "2025-09-20",
      fotos: {
        ingreso: [IMG.toyota_yaris],
        revision: [IMG.toyota_yaris],
        retoques: [],
        finales: [IMG.toyota_yaris],
      },
    },
    {
      id: "V008",
      marca: "Chevrolet",
      modelo: "Onix",
      anio: 2021,
      colorExterior: "Blanco",
      colorInterior: "Negro",
      transmision: "Automática" as const,
      pasajeros: 5,
      puertas: 4,
      vin: "8HG...9193",
      placa: "ONX-101",
      precioSugerido: 12900,
      costoCompra: 8500,
      estado: "Listo" as const,
      fechaIngreso: "2025-09-25",
      fotos: {
        ingreso: [IMG.chevrolet_onix],
        revision: [IMG.chevrolet_onix],
        retoques: [],
        finales: [IMG.chevrolet_onix],
      },
    },
  ] as Vehiculo[],

  inspecciones: [] as Inspeccion[],

  retoques: [] as Retoque[],

  publicaciones: [
    {
      id: "P001",
      vehiculoId: "V001",
      titulo: "Toyota Corolla 2018 impecable",
      activo: true,
      precio: 14500,
      imagenes: [IMG.toyota_corolla],
    },
  ] as Publicacion[],

  clientes: [
 
  ] as Cliente[],

  motivosPerdida: [
    { id: "MP01", nombre: "Precio alto" },
    { id: "MP02", nombre: "Financiamiento no aprobado" },
    { id: "MP03", nombre: "Encontró alternativa" },
    { id: "MP04", nombre: "Tiempo de entrega" },
    { id: "MP05", nombre: "Otro" },
  ] as MotivoPerdida[],

  ofertas: [
    {
      id: "O001",
      clienteId: "C001",
      fuente: "INVENTARIO" as const,
      vehiculo: {
        id: "V001",
        marca: "Toyota",
        modelo: "Corolla",
        anio: 2018,
      },
      precioOfertado: 14500,
      estado: "GANADA" as const,
      validez: {
        desde: "2025-10-05",
        hasta: "2025-10-12",
      },
      vendedorId: "S001",
      createdAt: "2025-10-05",
      updatedAt: "2025-10-08",
    },
    {
      id: "O002",
      clienteId: "C002",
      fuente: "PROVEEDOR" as const,
      proveedorId: "PR02",
      vehiculo: {
        marca: "Toyota",
        modelo: "RAV4",
        anio: 2020,
      },
      precioOfertado: 28900,
      estado: "NEGOCIANDO" as const,
      validez: {
        desde: "2025-10-07",
        hasta: "2025-10-14",
      },
      vendedorId: "S002",
      createdAt: "2025-10-07",
      updatedAt: "2025-10-10",
    },
    {
      id: "O003",
      clienteId: "C003",
      fuente: "CRAUTOS" as const,
      linkExterno: "https://crautos.com/...",
      vehiculo: {
        marca: "Nissan",
        modelo: "Kicks",
        anio: 2020,
      },
      precioOfertado: 17900,
      estado: "PERDIDA" as const,
      motivoPerdidaId: "MP03",
      validez: {
        desde: "2025-10-04",
        hasta: "2025-10-11",
      },
      vendedorId: "S003",
      createdAt: "2025-10-04",
      updatedAt: "2025-10-06",
    },
  ] as Oferta[],

  interacciones: [
    {
      id: "I001",
      ofertaId: "O002",
      fecha: "2025-10-08",
      canal: "WHATSAPP" as const,
      nota: "Envía fotos y ficha técnica",
    },
    {
      id: "I002",
      ofertaId: "O002",
      fecha: "2025-10-09",
      canal: "LLAMADA" as const,
      nota: "Negocia precio y accesorios",
    },
    {
      id: "I003",
      ofertaId: "O003",
      fecha: "2025-10-05",
      canal: "EMAIL" as const,
      nota: "Cliente pide ver opciones similares",
    },
  ] as Interaccion[],

  ventas: [
    {
      id: "S001",
      vehiculoId: "V003",
      cliente: {
        nombre: "María López",
        telefono: "+506 8888-1111",
      },
      precioFinal: 10700,
      metodoPago: "Transferencia",
      vendedor: "Eric",
      vendedorId: "S001",
      vendedorNombre: "Eric Gómez",
      fecha: "2025-10-05",
    },
    {
      id: "S002",
      vehiculoId: "V006",
      cliente: {
        nombre: "Juan Pérez",
        telefono: "+506 7777-2222",
      },
      precioFinal: 18500,
      metodoPago: "Efectivo",
      vendedor: "Eric",
      vendedorId: "S001",
      vendedorNombre: "Eric Gómez",
      fecha: "2025-10-08",
    },
  ] as Venta[],

  proveedores: [
    {
      id: "PR01",
      nombre: "Grupo Q",
      tipo: "Casa Comercial" as const,
      url: "https://grupoq.com",
      contacto: "ventas@grupoq.com",
      telefono: "+506 2222-0001",
      logo: "https://dummyimage.com/96x96/edf2f7/1a202c&text=GQ",
    },
    {
      id: "PR02",
      nombre: "Grupo Purdy / Toyota CR",
      tipo: "Casa Comercial" as const,
      url: "https://www.grupopurdy.com",
      contacto: "ventas@grupopurdy.com",
      telefono: "+506 2222-0002",
      logo: "https://dummyimage.com/96x96/edf2f7/1a202c&text=GP",
    },
    {
      id: "PR03",
      nombre: "Excel Automotriz",
      tipo: "Casa Comercial" as const,
      url: "https://www.excelautomotriz.com",
      contacto: "ventas@excelautomotriz.com",
      telefono: "+506 2222-0003",
      logo: "https://dummyimage.com/96x96/edf2f7/1a202c&text=EX",
    },
    {
      id: "TL01",
      nombre: "DetailPro",
      tipo: "Taller/Servicio" as const,
      servicios: ["Detallado", "Pulido", "Lavado"],
      contacto: "soporte@detailpro.com",
      telefono: "+506 8888-1001",
      logo: "https://dummyimage.com/96x96/e6fffa/234e52&text=DP",
    },
    {
      id: "TL02",
      nombre: "CarFix",
      tipo: "Taller/Servicio" as const,
      servicios: ["Mecánica ligera", "Frenos", "Suspensión"],
      contacto: "taller@carfix.com",
      telefono: "+506 8888-1002",
      logo: "https://dummyimage.com/96x96/ebf4ff/1e3a8a&text=CF",
    },
    {
      id: "TL03",
      nombre: "PinturaExpress",
      tipo: "Taller/Servicio" as const,
      servicios: ["Pintura", "Hojalatería"],
      contacto: "pintura@express.com",
      telefono: "+506 8888-1003",
      logo: "https://dummyimage.com/96x96/fff7ed/7c2d12&text=PX",
    },
  ] as Proveedor[],

  proveedorInventario: [
    {
      proveedorId: "PR01",
      marca: "Hyundai",
      modelo: "Tucson",
      anio: 2019,
      precioRef: 19900,
      transmision: "Automática",
      url: "https://grupoq.com",
      thumb: IMG.hyundai_accent,
    },
    {
      proveedorId: "PR01",
      marca: "Kia",
      modelo: "Rio",
      anio: 2020,
      precioRef: 12900,
      transmision: "Manual",
      url: "https://grupoq.com",
      thumb: IMG.kia_sportage,
    },
    {
      proveedorId: "PR02",
      marca: "Toyota",
      modelo: "RAV4",
      anio: 2020,
      precioRef: 28900,
      transmision: "Automática",
      url: "https://www.grupopurdy.com",
      thumb: IMG.toyota_yaris,
    },
    {
      proveedorId: "PR02",
      marca: "Toyota",
      modelo: "Hilux",
      anio: 2018,
      precioRef: 27900,
      transmision: "Manual",
      url: "https://www.grupopurdy.com",
      thumb: IMG.toyota_corolla,
    },
    {
      proveedorId: "PR03",
      marca: "Chevrolet",
      modelo: "Tracker",
      anio: 2021,
      precioRef: 21500,
      transmision: "Automática",
      url: "https://www.excelautomotriz.com",
      thumb: IMG.chevrolet_onix,
    },
    {
      proveedorId: "PR03",
      marca: "Nissan",
      modelo: "Kicks",
      anio: 2020,
      precioRef: 17900,
      transmision: "Automática",
      url: "https://www.excelautomotriz.com",
      thumb: IMG.nissan_sentra,
    },
  ] as ProveedorInventario[],

  pricingRules: {
    targetMarginPct: 0.12,
    daysToSaleTarget: 30,
    markdownPerWeekPct: 0.015,
    minRangePct: 0.03,
    maxRangePct: 0.08,
  } as PricingRules,

  marketComps: [
    { marca: "Toyota", modelo: "Corolla", anio: 2018, precio: 14800, origen: "CRautos" },
    { marca: "Toyota", modelo: "Corolla", anio: 2018, precio: 15100, origen: "CRautos" },
    { marca: "Toyota", modelo: "Corolla", anio: 2018, precio: 14300, origen: "CRautos" },
    { marca: "Hyundai", modelo: "Accent", anio: 2017, precio: 10800, origen: "CRautos" },
    { marca: "Hyundai", modelo: "Accent", anio: 2017, precio: 11150, origen: "CRautos" },
    { marca: "Honda", modelo: "CR-V", anio: 2019, precio: 19500, origen: "Proveedor" },
    { marca: "Honda", modelo: "CR-V", anio: 2019, precio: 20100, origen: "Proveedor" },
    { marca: "Nissan", modelo: "Sentra", anio: 2017, precio: 11200, origen: "CRautos" },
    { marca: "Mazda", modelo: "3", anio: 2016, precio: 10500, origen: "CRautos" },
    { marca: "Mazda", modelo: "3", anio: 2016, precio: 10800, origen: "CRautos" },
  ] as MarketComp[],

  vehicleEvents: [
    {
      id: "E001",
      vehiculoId: "V001",
      etapa: "INGRESO",
      fecha: "2025-09-01",
      fotos: [IMG.toyota_corolla],
      notas: "Comprado a particular; documentación verificada",
      responsable: "Juan Pérez",
    },
    {
      id: "E002",
      vehiculoId: "V001",
      etapa: "INSPECCION",
      fecha: "2025-09-02",
      fotos: [IMG.toyota_corolla],
      notas: "Check motor/frenos OK; sin fugas",
      responsable: "Mecánico Principal",
    },
    {
      id: "E003",
      vehiculoId: "V002",
      etapa: "RETOQUES",
      fecha: "2025-09-04",
      notas: "Pintura lateral con PinturaExpress (TL03) $320",
      responsable: "Taller Externo",
    },
    {
      id: "E004",
      vehiculoId: "V001",
      etapa: "PUBLICACION",
      fecha: "2025-09-05",
      fotos: [IMG.toyota_corolla],
      notas: "Anuncio activo en plataformas principales",
    },
  ] as VehicleEvent[],

  kpis: {} as Record<string, any>,
};

// Helper functions
export const getKpis = () => {
  const inventarioTotal = dataStore.vehiculos.length;
  const enRetoques = dataStore.vehiculos.filter((v) => v.estado === "Retoques").length;
  const listos = dataStore.vehiculos.filter((v) => v.estado === "Listo").length;
  const publicados = dataStore.vehiculos.filter((v) => v.estado === "Publicado").length;

  // Vendidos este mes
  const now = new Date();
  const vendidosEsteMes = dataStore.ventas.filter((v) => {
    const ventaFecha = new Date(v.fecha);
    return (
      ventaFecha.getMonth() === now.getMonth() &&
      ventaFecha.getFullYear() === now.getFullYear()
    );
  }).length;

  // Margen promedio
  const ventasConMargen = dataStore.ventas.map((v) => {
    const vehiculo = dataStore.vehiculos.find((veh) => veh.id === v.vehiculoId);
    if (!vehiculo) return { margen: 0, porcentaje: 0 };

    const retoques = dataStore.retoques.find((r) => r.vehiculoId === v.vehiculoId);
    const costosRetoques = retoques?.tareas.reduce((sum, t) => sum + t.costo, 0) || 0;

    const margen = v.precioFinal - vehiculo.costoCompra - costosRetoques;
    const porcentaje = (margen / v.precioFinal) * 100;

    return { margen, porcentaje };
  });

  const margenPromedio =
    ventasConMargen.length > 0
      ? ventasConMargen.reduce((sum, v) => sum + v.porcentaje, 0) / ventasConMargen.length
      : 0;

  return {
    inventarioTotal,
    enRetoques,
    listos,
    publicados,
    vendidosEsteMes,
    margenPromedio,
  };
};

export const findImg = (marca: string, modelo: string): string => {
  const key = `${marca.toLowerCase()}_${modelo.toLowerCase().replace(/\s+/g, "_")}`;
  
  // Try exact match
  if (key in IMG) {
    return IMG[key as keyof typeof IMG];
  }

  // Try brand match
  const brandKey = marca.toLowerCase();
  const matchingKeys = Object.keys(IMG).filter((k) => k.startsWith(brandKey));
  if (matchingKeys.length > 0) {
    return IMG[matchingKeys[0] as keyof typeof IMG];
  }

  // Default fallback
  return IMG.toyota_corolla;
};

// CRM Helper functions
export const calcConversion = (periodo?: { desde: string; hasta: string }) => {
  let ofertas = dataStore.ofertas;

  // Filter by period if provided
  if (periodo) {
    const desde = new Date(periodo.desde);
    const hasta = new Date(periodo.hasta);
    ofertas = ofertas.filter((o) => {
      const created = new Date(o.createdAt);
      return created >= desde && created <= hasta;
    });
  }

  const ganadas = ofertas.filter((o) => o.estado === "GANADA").length;
  const perdidas = ofertas.filter((o) => o.estado === "PERDIDA").length;
  const negociando = ofertas.filter((o) => o.estado === "NEGOCIANDO").length;
  const enviadas = ofertas.filter((o) => o.estado === "ENVIADA").length;
  const totalOfertas = ofertas.length;

  const conversionGlobal =
    ganadas + perdidas > 0 ? (ganadas / (ganadas + perdidas)) * 100 : 0;

  return {
    conversionGlobal,
    totalOfertas,
    ganadas,
    perdidas,
    negociando,
    enviadas,
  };
};

export const calcEmbudo = () => {
  const enviados = dataStore.ofertas.filter((o) => o.estado === "ENVIADA").length;
  const enNegociacion = dataStore.ofertas.filter((o) => o.estado === "NEGOCIANDO").length;
  const ganados = dataStore.ofertas.filter((o) => o.estado === "GANADA").length;
  const perdidos = dataStore.ofertas.filter((o) => o.estado === "PERDIDA").length;
  const caducados = dataStore.ofertas.filter((o) => o.estado === "CADUCADA").length;

  return {
    enviados,
    enNegociacion,
    ganados,
    perdidos,
    caducados,
  };
};

export const calcClienteKPIs = (clienteId: string) => {
  const clienteOfertas = dataStore.ofertas.filter((o) => o.clienteId === clienteId);
  
  const ofertasTotales = clienteOfertas.length;
  const ganadas = clienteOfertas.filter((o) => o.estado === "GANADA").length;
  const perdidas = clienteOfertas.filter((o) => o.estado === "PERDIDA").length;
  
  const conversion = ganadas + perdidas > 0 ? (ganadas / (ganadas + perdidas)) * 100 : 0;
  
  const ganadasOfertas = clienteOfertas.filter((o) => o.estado === "GANADA");
  const ticketPromedioGanado =
    ganadasOfertas.length > 0
      ? ganadasOfertas.reduce((sum, o) => sum + o.precioOfertado, 0) / ganadasOfertas.length
      : 0;

  return {
    ofertasTotales,
    ganadas,
    perdidas,
    conversion,
    ticketPromedioGanado,
  };
};

// Pricing Helper Functions
export const calcMarketPrice = (vehiculo: Vehiculo): number => {
  // Filter comps by marca/modelo/año
  let comps = dataStore.marketComps.filter(
    (c) =>
      c.marca.toLowerCase() === vehiculo.marca.toLowerCase() &&
      c.modelo.toLowerCase() === vehiculo.modelo.toLowerCase() &&
      c.anio === vehiculo.anio
  );

  // If less than 3 comps, expand to ±1 year and same modelo
  if (comps.length < 3) {
    comps = dataStore.marketComps.filter(
      (c) =>
        c.marca.toLowerCase() === vehiculo.marca.toLowerCase() &&
        c.modelo.toLowerCase() === vehiculo.modelo.toLowerCase() &&
        Math.abs(c.anio - vehiculo.anio) <= 1
    );
  }

  // If still no comps, use vehicle's suggested price or cost
  if (comps.length === 0) {
    return vehiculo.precioSugerido || vehiculo.costoCompra * 1.3;
  }

  // Calculate median
  const sortedPrices = comps.map((c) => c.precio).sort((a, b) => a - b);
  const mid = Math.floor(sortedPrices.length / 2);
  
  return sortedPrices.length % 2 !== 0
    ? sortedPrices[mid]
    : (sortedPrices[mid - 1] + sortedPrices[mid]) / 2;
};

export const calcSuggestedPriceRange = (
  vehiculo: Vehiculo,
  customDaysTarget?: number
): PricingResult => {
  const rules = dataStore.pricingRules;
  const daysTarget = customDaysTarget || rules.daysToSaleTarget;

  // Get market price
  const market = calcMarketPrice(vehiculo);

  // Calculate recon costs
  const retoque = dataStore.retoques.find((r) => r.vehiculoId === vehiculo.id);
  const recon = retoque?.tareas.reduce((sum, t) => sum + t.costo, 0) || 0;

  // Calculate days in stock
  const fechaIngreso = vehiculo.fechaIngreso || new Date().toISOString().split("T")[0];
  const days = Math.floor(
    (new Date().getTime() - new Date(fechaIngreso).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Days factor adjustment
  const weeksInStock = days / 7;
  const daysFactor = Math.max(0.9, 1 - rules.markdownPerWeekPct * weeksInStock);

  // Calculate target price
  const target = market * daysFactor;
  const minNeeded = (vehiculo.costoCompra + recon) * (1 + rules.targetMarginPct);
  const recommended = Math.max(target, minNeeded);

  // Calculate range
  const spreadBase = recommended * 0.05;
  const spread = Math.max(
    recommended * rules.minRangePct,
    Math.min(spreadBase, recommended * rules.maxRangePct)
  );
  const range: [number, number] = [
    Math.round(recommended - spread),
    Math.round(recommended + spread),
  ];

  // Calculate margin
  const margin = recommended - vehiculo.costoCompra - recon;
  const marginPct = (margin / recommended) * 100;

  return {
    market: Math.round(market),
    recon: Math.round(recon),
    days,
    recommended: Math.round(recommended),
    range,
    margin: Math.round(margin),
    marginPct: Math.round(marginPct * 10) / 10,
  };
};

// Timeline Helper Functions
export const buildTimeline = (vehiculoId: string) => {
  const events = dataStore.vehicleEvents
    .filter((e) => e.vehiculoId === vehiculoId)
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  // Group by etapa
  const grouped: Record<string, VehicleEvent[]> = {};
  events.forEach((event) => {
    if (!grouped[event.etapa]) {
      grouped[event.etapa] = [];
    }
    grouped[event.etapa].push(event);
  });

  return {
    events,
    grouped,
    allPhotos: events.flatMap((e) => e.fotos || []),
    allDocs: events.flatMap((e) => e.documentos || []),
  };
};

export const addVehicleEvent = (event: Omit<VehicleEvent, "id">) => {
  const newId = `E${String(dataStore.vehicleEvents.length + 1).padStart(3, "0")}`;
  const newEvent: VehicleEvent = {
    ...event,
    id: newId,
  };
  dataStore.vehicleEvents.push(newEvent);
  return newEvent;
};

// Seller Helper Functions
export const defaultSeller = (): string => {
  // Returns S001 (Eric) as default seller in demo mode
  return "S001";
};

export const calcSellerKPIs = (
  vendedorId: string,
  periodo?: { desde: string; hasta: string }
) => {
  // Filter ventas by vendedorId and period
  let ventas = dataStore.ventas.filter((v) => v.vendedorId === vendedorId);

  if (periodo) {
    const desde = new Date(periodo.desde);
    const hasta = new Date(periodo.hasta);
    ventas = ventas.filter((v) => {
      const fecha = new Date(v.fecha);
      return fecha >= desde && fecha <= hasta;
    });
  }

  const totalVentas = ventas.length;
  const montoTotal = ventas.reduce((sum, v) => sum + v.precioFinal, 0);

  // Calculate margin
  const ventasConMargen = ventas.map((v) => {
    const vehiculo = dataStore.vehiculos.find((veh) => veh.id === v.vehiculoId);
    if (!vehiculo) return { margen: 0 };

    const retoques = dataStore.retoques.find((r) => r.vehiculoId === v.vehiculoId);
    const costosRetoques = retoques?.tareas.reduce((sum, t) => sum + t.costo, 0) || 0;

    const margen = v.precioFinal - vehiculo.costoCompra - costosRetoques;
    return { margen };
  });

  const margenTotal = ventasConMargen.reduce((sum, v) => sum + v.margen, 0);
  const ticketProm = totalVentas > 0 ? montoTotal / totalVentas : 0;

  // Get seller's offers
  let ofertas = dataStore.ofertas.filter((o) => o.vendedorId === vendedorId);

  if (periodo) {
    const desde = new Date(periodo.desde);
    const hasta = new Date(periodo.hasta);
    ofertas = ofertas.filter((o) => {
      const created = new Date(o.createdAt);
      return created >= desde && created <= hasta;
    });
  }

  const ofertasActivas = ofertas.filter(
    (o) => o.estado === "ENVIADA" || o.estado === "NEGOCIANDO"
  ).length;

  const ganadas = ofertas.filter((o) => o.estado === "GANADA").length;
  const perdidas = ofertas.filter((o) => o.estado === "PERDIDA").length;
  const conversion = ganadas + perdidas > 0 ? (ganadas / (ganadas + perdidas)) * 100 : 0;

  // Calculate average time to close (simplified: use offer created to updated date)
  const ofertasGanadas = ofertas.filter((o) => o.estado === "GANADA");
  const tiemposCierre = ofertasGanadas.map((o) => {
    const created = new Date(o.createdAt);
    const updated = new Date(o.updatedAt);
    return Math.floor((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  });

  const tiempoMedioCierre =
    tiemposCierre.length > 0
      ? tiemposCierre.reduce((sum, t) => sum + t, 0) / tiemposCierre.length
      : 0;

  return {
    ventas: totalVentas,
    monto: Math.round(montoTotal),
    margen: Math.round(margenTotal),
    ticketProm: Math.round(ticketProm),
    ofertasActivas,
    conversion: Math.round(conversion * 10) / 10,
    tiempoMedioCierre: Math.round(tiempoMedioCierre * 10) / 10,
  };
};

export const leaderboard = (periodo?: { desde: string; hasta: string }) => {
  const vendedores = dataStore.vendedores
    .filter((v) => v.activo)
    .map((vendedor) => {
      const kpis = calcSellerKPIs(vendedor.id, periodo);
      return {
        vendedor,
        ...kpis,
      };
    });

  // Sort by ventas (descending), then by monto
  const sorted = vendedores.sort((a, b) => {
    if (b.ventas !== a.ventas) return b.ventas - a.ventas;
    return b.monto - a.monto;
  });

  return sorted;
};

export const reassignClient = (clienteId: string, nuevoVendedorId: string) => {
  // Update client owner
  const cliente = dataStore.clientes.find((c) => c.id === clienteId);
  if (cliente) {
    cliente.ownerId = nuevoVendedorId;
  }

  // Update all active offers (ENVIADA/NEGOCIANDO) for this client
  dataStore.ofertas.forEach((oferta) => {
    if (
      oferta.clienteId === clienteId &&
      (oferta.estado === "ENVIADA" || oferta.estado === "NEGOCIANDO")
    ) {
      oferta.vendedorId = nuevoVendedorId;
    }
  });

  return {
    clienteId,
    nuevoVendedorId,
    ofertasActualizadas: dataStore.ofertas.filter(
      (o) =>
        o.clienteId === clienteId &&
        (o.estado === "ENVIADA" || o.estado === "NEGOCIANDO")
    ).length,
  };
};

// Cargar vehículos guardados en localStorage
export const initializeVehiculos = () => {
  try {
    const saved = localStorage.getItem("vehiculos");
    if (saved) {
      const vehiculosSaved = JSON.parse(saved) as Vehiculo[];
      // Reemplazar vehículos por defecto con los guardados
      dataStore.vehiculos = vehiculosSaved;
      console.log(`${vehiculosSaved.length} vehículos cargados`);
    }
  } catch (error) {
    console.warn(`No se pudo cargar vehículos:`, error);
  }
};

// Export singleton instance
export default dataStore;

