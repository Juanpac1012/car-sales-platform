const HACIENDA_API_URL = "https://api.hacienda.go.cr/indicadores/tc/dolar";
const CACHE_KEY = "exchange_rate_usd_crc";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas en milisegundos
const DEFAULT_RATE = 520; // Fallback si la API falla

interface ExchangeRateCache {
  rate: number;
  timestamp: number;
}

interface HaciendaResponse {
  venta?: { valor?: string | number };
  compra?: { valor?: string | number };
}

export async function getExchangeRate(): Promise<number> {
  // 1. Intentar obtener del cache
  const cached = getCachedRate();
  if (cached) {
    console.log("Using cached exchange rate:", cached);
    return cached;
  }

  // 2. Obtener desde la API
  try {
    console.log("Fetching exchange rate from Hacienda API...");
    const response = await fetch(HACIENDA_API_URL);
    
    if (!response.ok) {
      throw new Error(`Hacienda API returned ${response.status}`);
    }

    const data: HaciendaResponse = await response.json();
    
    const ventaValue = data.venta?.valor;
    
    if (!ventaValue) {
      throw new Error("Invalid response format from Hacienda API");
    }

    const rate = typeof ventaValue === 'string' ? parseFloat(ventaValue) : ventaValue;
    
    if (isNaN(rate) || rate <= 0) {
      throw new Error("Invalid exchange rate value");
    }

    // Guardar en cache
    setCachedRate(rate);
    console.log("Exchange rate fetched successfully:", rate);
    
    return rate;
  } catch (error) {
    console.error("Error fetching exchange rate from Hacienda:", error);
    
    // 3. Fallback al valor por defecto
    console.warn(`Using default exchange rate: ${DEFAULT_RATE}`);
    return DEFAULT_RATE;
  }
}

function getCachedRate(): number | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: ExchangeRateCache = JSON.parse(cached);
    const now = Date.now();

    // Verificar si el cache no ha expirado
    if (now - data.timestamp < CACHE_DURATION) {
      return data.rate;
    }

    // Cache expirado, limpiar
    localStorage.removeItem(CACHE_KEY);
    return null;
  } catch (error) {
    console.error("Error reading cached exchange rate:", error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
}

function setCachedRate(rate: number): void {
  try {
    const data: ExchangeRateCache = {
      rate,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error caching exchange rate:", error);
  }
}

export async function usdToCrc(usdAmount: number): Promise<number> {
  const rate = await getExchangeRate();
  return Math.round(usdAmount * rate * 100) / 100; // Redondear a 2 decimales
}

export async function crcToUsd(crcAmount: number): Promise<number> {
  const rate = await getExchangeRate();
  return Math.round((crcAmount / rate) * 100) / 100; // Redondear a 2 decimales
}

export function formatCRC(amount: number): string {
  return new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export async function formatDualCurrency(usdAmount: number): Promise<string> {
  const crcAmount = await usdToCrc(usdAmount);
  return `${formatUSD(usdAmount)} / ${formatCRC(crcAmount)}`;
}


export function refreshExchangeRate(): void {
  localStorage.removeItem(CACHE_KEY);
  console.log("Exchange rate cache cleared. Next call will fetch from API.");
}
