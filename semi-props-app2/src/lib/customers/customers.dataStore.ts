// src/lib/customers/customers.dataStore.ts
import { create } from "zustand";
import { Cliente } from "./customers.types";
import { CustomersService } from "./customers.service";

interface CustomersStore {
  customers: Cliente[];
  loading: boolean;
  error?: string | null;

  // --- acciones ---
  fetchCustomers: () => Promise<void>;
  addCustomer: (cliente: Cliente) => Promise<void>;
  updateCustomer: (id: string, cliente: Partial<Cliente>) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useCustomersStore = create<CustomersStore>((set, get) => ({
  customers: [],
  loading: false,
  error: null,

fetchCustomers: async () => {
  set({ loading: true, error: null });
  try {
    const { items } = await CustomersService.list(); // 👈 antes era solo list()
    set({ customers: items });                       // 👈 usamos items
  } catch (err: any) {
    console.error("Error al cargar clientes:", err);
    set({ error: err.message });
  } finally {
    set({ loading: false });
  }
},


  //  Agregar un nuevo cliente
  addCustomer: async (cliente) => {
    set({ loading: true, error: null });
    try {
      const newCustomer = await CustomersService.create(cliente);
      set({ customers: [...get().customers, newCustomer] });
    } catch (err: any) {
      console.error("Error al agregar cliente:", err);
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  //  Actualizar un cliente existente
  updateCustomer: async (id, cliente) => {
    set({ loading: true, error: null });
    try {
      const updatedCustomer = await CustomersService.update(id, cliente);
      set({ 
        customers: get().customers.map((c) => 
          c.id === id ? updatedCustomer : c
        ) 
      });
    } catch (err: any) {
      console.error("Error al actualizar cliente:", err);
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  //  Eliminar cliente por ID
  deleteCustomer: async (id) => {
    set({ loading: true, error: null });
    try {
      await CustomersService.delete(id);
      set({ customers: get().customers.filter((c) => c.id !== id) });
    } catch (err: any) {
      console.error("Error al eliminar cliente:", err);
      set({ error: err.message });
    } finally {
      set({ loading: false });
    }
  },

  // Limpiar error (por ejemplo, al cerrar alertas)
  clearError: () => set({ error: null }),
}));
