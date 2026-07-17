export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          created_at: string
          email: string | null
          id: string
          nombre: string
          telefono: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          nombre: string
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          nombre?: string
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      inspecciones: {
        Row: {
          checklist: Json
          created_at: string
          fecha: string
          id: string
          notas: string | null
          resultado: Database["public"]["Enums"]["inspeccion_resultado"]
          updated_at: string
          vehiculo_id: string
        }
        Insert: {
          checklist?: Json
          created_at?: string
          fecha?: string
          id?: string
          notas?: string | null
          resultado: Database["public"]["Enums"]["inspeccion_resultado"]
          updated_at?: string
          vehiculo_id: string
        }
        Update: {
          checklist?: Json
          created_at?: string
          fecha?: string
          id?: string
          notas?: string | null
          resultado?: Database["public"]["Enums"]["inspeccion_resultado"]
          updated_at?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspecciones_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      proveedores: {
        Row: {
          contacto: string | null
          created_at: string
          feed: Json | null
          id: string
          nombre: string
          tipo: Database["public"]["Enums"]["proveedor_tipo"]
          updated_at: string
          url: string | null
        }
        Insert: {
          contacto?: string | null
          created_at?: string
          feed?: Json | null
          id?: string
          nombre: string
          tipo: Database["public"]["Enums"]["proveedor_tipo"]
          updated_at?: string
          url?: string | null
        }
        Update: {
          contacto?: string | null
          created_at?: string
          feed?: Json | null
          id?: string
          nombre?: string
          tipo?: Database["public"]["Enums"]["proveedor_tipo"]
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      retoques: {
        Row: {
          costo: number | null
          created_at: string
          fecha_fin: string | null
          fecha_inicio: string | null
          id: string
          notas: string | null
          responsable: string | null
          tarea: string
          updated_at: string
          vehiculo_id: string
        }
        Insert: {
          costo?: number | null
          created_at?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          notas?: string | null
          responsable?: string | null
          tarea: string
          updated_at?: string
          vehiculo_id: string
        }
        Update: {
          costo?: number | null
          created_at?: string
          fecha_fin?: string | null
          fecha_inicio?: string | null
          id?: string
          notas?: string | null
          responsable?: string | null
          tarea?: string
          updated_at?: string
          vehiculo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retoques_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: false
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      vehiculos: {
        Row: {
          anio: number
          color_exterior: string | null
          color_interior: string | null
          costo_compra: number | null
          created_at: string
          documento_urls: string[] | null
          estado: Database["public"]["Enums"]["vehiculo_estado"]
          fecha_ingreso: string
          fotos: Json | null
          id: string
          marca: string
          modelo: string
          pasajeros: number | null
          placa: string | null
          precio_sugerido: number | null
          precio_venta: number | null
          proveedor_id: string | null
          puertas: number | null
          transmision: Database["public"]["Enums"]["transmision_tipo"]
          updated_at: string
          vin: string | null
        }
        Insert: {
          anio: number
          color_exterior?: string | null
          color_interior?: string | null
          costo_compra?: number | null
          created_at?: string
          documento_urls?: string[] | null
          estado?: Database["public"]["Enums"]["vehiculo_estado"]
          fecha_ingreso?: string
          fotos?: Json | null
          id?: string
          marca: string
          modelo: string
          pasajeros?: number | null
          placa?: string | null
          precio_sugerido?: number | null
          precio_venta?: number | null
          proveedor_id?: string | null
          puertas?: number | null
          transmision: Database["public"]["Enums"]["transmision_tipo"]
          updated_at?: string
          vin?: string | null
        }
        Update: {
          anio?: number
          color_exterior?: string | null
          color_interior?: string | null
          costo_compra?: number | null
          created_at?: string
          documento_urls?: string[] | null
          estado?: Database["public"]["Enums"]["vehiculo_estado"]
          fecha_ingreso?: string
          fotos?: Json | null
          id?: string
          marca?: string
          modelo?: string
          pasajeros?: number | null
          placa?: string | null
          precio_sugerido?: number | null
          precio_venta?: number | null
          proveedor_id?: string | null
          puertas?: number | null
          transmision?: Database["public"]["Enums"]["transmision_tipo"]
          updated_at?: string
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehiculos_proveedor_id_fkey"
            columns: ["proveedor_id"]
            isOneToOne: false
            referencedRelation: "proveedores"
            referencedColumns: ["id"]
          },
        ]
      }
      ventas: {
        Row: {
          cliente_id: string
          created_at: string
          fecha: string
          id: string
          metodo_pago: Database["public"]["Enums"]["metodo_pago"]
          precio_final: number
          updated_at: string
          vehiculo_id: string
          vendedor: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string
          fecha?: string
          id?: string
          metodo_pago: Database["public"]["Enums"]["metodo_pago"]
          precio_final: number
          updated_at?: string
          vehiculo_id: string
          vendedor?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string
          fecha?: string
          id?: string
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"]
          precio_final?: number
          updated_at?: string
          vehiculo_id?: string
          vendedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ventas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ventas_vehiculo_id_fkey"
            columns: ["vehiculo_id"]
            isOneToOne: true
            referencedRelation: "vehiculos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      inspeccion_resultado: "Listo" | "Retoques"
      metodo_pago:
        | "Efectivo"
        | "Transferencia"
        | "Tarjeta"
        | "Financiamiento"
        | "Mixto"
      proveedor_tipo: "Casa Comercial" | "Externo"
      transmision_tipo: "Manual" | "Automática"
      vehiculo_estado:
        | "Ingreso"
        | "Inspección"
        | "Retoques"
        | "Listo"
        | "Vendido"
        | "Reservado"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      inspeccion_resultado: ["Listo", "Retoques"],
      metodo_pago: [
        "Efectivo",
        "Transferencia",
        "Tarjeta",
        "Financiamiento",
        "Mixto",
      ],
      proveedor_tipo: ["Casa Comercial", "Externo"],
      transmision_tipo: ["Manual", "Automática"],
      vehiculo_estado: [
        "Ingreso",
        "Inspección",
        "Retoques",
        "Listo",
        "Vendido",
        "Reservado",
      ],
    },
  },
} as const
