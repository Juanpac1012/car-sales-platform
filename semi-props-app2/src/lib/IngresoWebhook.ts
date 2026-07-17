const N8N_BASE_URL = "https://n8n-n8n.kwu5pq.easypanel.host/webhook";

export const N8N_WEBHOOKS = {
  crearCarpetas: `${N8N_BASE_URL}/dd607462-9a18-4048-9813-647fb591913d`,
  crearVehiculo: `${N8N_BASE_URL}/af491f5b-08e4-4f45-a29c-6d3de5b1ea09`,
  subirFoto: `${N8N_BASE_URL}/7438fde9-e49a-430b-bdc6-411134746927`,
  actualizarFotos: `${N8N_BASE_URL}/f2c18214-6001-4b2a-9c34-5e530406b32a`,
};

//Interfaz para crear carpetas
 
export interface CreateCarpetasPayload {
  marca: string;
  modelo: string;
  vehiculo: string; // placa del vehículo
}

//Interfaz para crear vehículo
export interface CreateVehiclePayload {
  p_make_id: number;
  p_model_id: number;
  p_year: number;
  p_vin: string;
  p_trim_id?: number | null;
  p_color_ext: string;
  p_color_int: string;
  p_transmission: string;
  p_fuel_type?: string;
  p_engine?: string;
  p_drive_type?: string;
  p_odometer_km?: number;
  p_seats: number;
  p_doors: number;
  p_price1: number;
  p_price2: number;
  p_license: string;
  p_notes?: string;
  p_supplier_id?: string;
}

//subir foto

export interface UploadFotoPayload {
  fileName: string;
  folderId: string;
  id: string;
  foto: string; // base64
  skipDbUpdate?: boolean; // Nueva opción para NO actualizar BD al subir
}

//actualizar URLs de fotos en BD

export interface ActualizarFotosPayload {
  id: string; // vehicle_id
  image_urls: string; // URLs separadas por coma
}

//carpetas en Google Drive

export async function crearCarpetasN8N(
  payload: CreateCarpetasPayload
): Promise<{ carpetaURL: string; folderId: string; vehiculoFolderId: string }> {
  try {
    const response = await fetch(N8N_WEBHOOKS.crearCarpetas, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error HTTP en webhook carpetas:", response.status, errorText);
      throw new Error(`Error en webhook de carpetas (${response.status}): ${errorText || response.statusText}`);
    }

    // Verificar si hay contenido en la respuesta
    const contentType = response.headers.get("content-type");
    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === "") {
      throw new Error("El webhook de carpetas retornó una respuesta vacía. Verifica que n8n esté funcionando.");
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Error parseando JSON:", parseError);
      throw new Error(`Respuesta inválida del webhook de carpetas: ${responseText.substring(0, 100)}`);
    }
    
    let folderId = data.folderId || "";
    if (!folderId && data.carpetaURL) {
      // formato que se ocupa: https://drive.google.com/drive/folders/{folderId}
      const match = data.carpetaURL.match(/folders\/([a-zA-Z0-9_-]+)/);
      folderId = match ? match[1] : "";
    }
    
    if (!folderId) {
      throw new Error("No se pudo obtener folderId del webhook de carpetas");
    }
    
    const vehiculoFolderId = folderId;
    
    return {
      carpetaURL: data.carpetaURL || "",
      folderId: folderId,
      vehiculoFolderId: vehiculoFolderId,
    };
  } catch (error) {
    console.error("Error en crearCarpetasN8N:", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// Crear vehículo en base de datos
 
export async function crearVehiculoN8N(
  payload: CreateVehiclePayload
): Promise<{ create_vehicle?: string; vehicleId?: string; success?: boolean; error?: string }> {
  try {
    const response = await fetch(N8N_WEBHOOKS.crearVehiculo, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error HTTP en webhook vehículo:", response.status, errorText);
      throw new Error(`Error en webhook de vehículo (${response.status}): ${errorText || response.statusText}`);
    }

    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === "") {
      throw new Error("El webhook de vehículo retornó una respuesta vacía");
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Error parseando JSON:", parseError);
      throw new Error(`Respuesta inválida del webhook de vehículo: ${responseText.substring(0, 100)}`);
    }
    
    // Verificar si hay error de VIN duplicado
    if (data.success === false && data.error) {
      throw new Error(data.error);
    }

    return data;
  } catch (error) {
    console.error("Error en crearVehiculoN8N:", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

// Subir foto a Google Drive
 
export async function subirFotoN8N(
  payload: UploadFotoPayload
): Promise<{ imageUrl: string }> {
  try {
    // Crear AbortController con timeout de 120 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    
    const response = await fetch(N8N_WEBHOOKS.subirFoto, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error HTTP en webhook foto:", response.status, errorText);
      throw new Error(`Error en webhook de foto (${response.status}): ${errorText || response.statusText}`);
    }

    // Intentar parsear la respuesta
    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === "") {
      throw new Error("El webhook de foto retornó una respuesta vacía");
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Error parseando JSON de foto:", parseError);
      console.error("Contenido recibido:", responseText.substring(0, 200));
      throw new Error(`Respuesta inválida del webhook de foto. Verifica la configuración en n8n.`);
    }
    
    let imageUrl = "";
    
    function buscarURL(obj: any): string {
      if (!obj) return "";
      
      if (Array.isArray(obj)) {
        return buscarURL(obj[0]);
      }
      
      if (typeof obj === 'object') {
        return (
          obj.thumbnailLink ||       
          obj.webContentLink ||      
          obj.webViewLink ||         
          obj.imageUrl ||
          obj.image_url ||
          obj.url ||
          obj.photo ||
          obj.image ||
          obj.link ||
          obj.href ||
          buscarURL(obj.data) ||
          buscarURL(obj.result) ||
          buscarURL(obj.output) ||
          buscarURL(obj.body)
        );
      }
      
      return "";
    }
    
    imageUrl = buscarURL(data);
    
    return {
      imageUrl: imageUrl || "",
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error("El servidor tardó demasiado. Intenta de nuevo.");
    }
    throw error;
  }
}

//Convertir archivo a base64

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

/**
 * Comprimir imagen antes de enviar (reduce ~40-50% del tamaño)
 * Maneja PNG, JPEG, GIF, WebP y soporta transparencia
 */
export function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement("canvas");
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                throw new Error("No se pudo obtener contexto canvas");
              }

              // Reducir tamaño manteniendo aspecto
              let width = img.width;
              let height = img.height;
              const MAX_WIDTH = 1200;
              const MAX_HEIGHT = 900;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height = Math.round((height * MAX_WIDTH) / width);
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width = Math.round((width * MAX_HEIGHT) / height);
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              
              // Si es PNG con transparencia, preservar fondo blanco
              const mimeType = file.type.toLowerCase();
              if (mimeType === "image/png" || mimeType === "image/webp") {
                ctx.fillStyle = "white";
                ctx.fillRect(0, 0, width, height);
              }
              
              ctx.drawImage(img, 0, 0, width, height);

              // Convertir según tipo original - JPEG para otros, PNG para PNG
              let compressedBase64 = "";
              if (mimeType === "image/png") {
                // PNG: calidad máxima sin compresión destructiva
                compressedBase64 = canvas.toDataURL("image/png").split(",")[1];
              } else {
                // JPEG, WebP, GIF: convertir a JPEG con calidad 75%
                compressedBase64 = canvas.toDataURL("image/jpeg", 0.75).split(",")[1];
              }
              
              if (!compressedBase64) {
                throw new Error("Falló al convertir imagen a base64");
              }
              
              resolve(compressedBase64);
            } catch (error) {
              reject(new Error(`Error al procesar canvas: ${error instanceof Error ? error.message : String(error)}`));
            }
          };
          img.onerror = () => reject(new Error("Error al cargar imagen - archivo corrupto o formato no soportado"));
          img.src = e.target?.result as string;
        } catch (error) {
          reject(new Error(`Error en reader.onload: ${error instanceof Error ? error.message : String(error)}`));
        }
      };
      reader.onerror = () => reject(new Error("Error al leer archivo"));
      reader.readAsDataURL(file);
    } catch (error) {
      reject(new Error(`Error en compressImage: ${error instanceof Error ? error.message : String(error)}`));
    }
  });
}

/**
 * Subir foto con reintentos automáticos
 */
export async function subirFotoN8NConReintentos(
  payload: UploadFotoPayload,
  maxIntentos: number = 3
): Promise<{ imageUrl: string }> {
  let ultimoError: Error | null = null;

  for (let intento = 1; intento <= maxIntentos; intento++) {
    try {
      const response = await subirFotoN8N(payload);
      return response;
    } catch (error) {
      ultimoError = error instanceof Error ? error : new Error(String(error));

      if (intento < maxIntentos) {
        // Esperar progresivamente más tiempo entre reintentos
        const delay = 1000 * intento; // 1s, 2s, 3s
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Falló después de ${maxIntentos} intentos: ${ultimoError?.message}`);
}

/**
 * Actualizar las URLs de todas las fotos de un vehículo
 * Se llama después de subir todas las fotos
 */
export async function actualizarFotosVehiculoN8N(
  payload: ActualizarFotosPayload
): Promise<{ success: boolean }> {
  try {
    const response = await fetch(N8N_WEBHOOKS.actualizarFotos, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error HTTP actualizando fotos:", response.status, errorText);
      throw new Error(`Error actualizando fotos (${response.status}): ${errorText || response.statusText}`);
    }

    const data = await response.json();
    
    return { success: true };
  } catch (error) {
    console.error("Error en actualizarFotosVehiculoN8N:", error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}
