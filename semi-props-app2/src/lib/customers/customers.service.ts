import { client } from "../api.customer/client";
import { Cliente } from "./customers.types";
import { fromApiCustomer } from "./customers.mappers";

export type ListParams = {
  search?: string | null;
  limit?: number;
  offset?: number;
  order?: "name.asc" | "name.desc";
};

export type ListResult = {
  items: Cliente[];
  total: number;
};

export const CustomersService = {
  list: async (params: ListParams = {}): Promise<ListResult> => {
    const apiBase = client.getApiBase();
    const { token } = await client.ensureAuth();

    const {
      search = null,
      limit = 20,
      offset = 0,
      order = "name.asc",
    } = params;

    // Construye query string
    const qs: string[] = [];
    if (search && search.trim()) {
      const q = encodeURIComponent(search.trim());
      // or=(name.ilike.*q*,phone.ilike.*q*,email.ilike.*q*)
      qs.push(`or=(name.ilike.*${q}*,phone.ilike.*${q}*,email.ilike.*${q}*)`);
    }
    qs.push(`order=${order}.nullslast`);
    qs.push(`limit=${limit}`);
    qs.push(`offset=${offset}`);

    const url = `${apiBase}/customers?${qs.join("&")}`;

    const res = await client.fetch(url, {
      method: "GET",
      token,
      headers: {
        Accept: "application/json",
        Prefer: "count=exact",
      },
      _returnMeta: true, // para leer headers
    }) as { data: any; headers: Headers; status: number };

    const rows = Array.isArray(res.data) ? res.data : [];

    // Content-Range: items 0-19/137
    const cr = res.headers.get("content-range") || "";
    const total = (() => {
      const slash = cr.lastIndexOf("/");
      if (slash >= 0) {
        const n = Number(cr.slice(slash + 1));
        return Number.isFinite(n) ? n : rows.length;
      }
      return rows.length;
    })();

    const items = rows.map(fromApiCustomer);
    return { items, total };
  },

  create: async (cliente: Cliente) => {
    const apiBase = client.getApiBase();
    const { token, userId } = await client.ensureAuth();

    const url = `${apiBase}/rpc/create_customer`;
    const payload = {
      p_name: cliente.name,
      p_phone: cliente.phone,
      p_email: cliente.email ?? null,
      p_government_id: cliente.government_id ?? null,
      p_notes: cliente.notes ?? null,
      p_owner_id: userId, // viene del login real
    };

    const res = await client.fetch(url, {
      method: "POST",
      token,
      headers: {
        "Content-Type": "application/json",
        "Content-Profile": "api",
        Prefer: "return=representation",
      },
      body: payload,
    });

    const item = Array.isArray(res) ? res[0] : res;
    return fromApiCustomer(item);
  },

  delete: async (id: string) => {
    const apiBase = client.getApiBase();
    const { token } = await client.ensureAuth();

    const url = `${apiBase}/rpc/delete_customer`;
    await client.fetch(url, {
      method: "POST",
      token,
      headers: {
        "Content-Type": "application/json",
        "Content-Profile": "api",
      },
      body: { p_id: id },
    });
  },

  getById: async (id: string) => {
    const apiBase = client.getApiBase();
    const { token } = await client.ensureAuth();

    const url = `${apiBase}/rpc/get_customer`;
    const res = await client.fetch(url, {
      method: "POST",
      token,
      headers: {
        "Content-Type": "application/json",
        "Accept-Profile": "api",
      },
      body: { p_id: id },
    });

    const item = Array.isArray(res) ? res[0] : res;
    return item ? fromApiCustomer(item) : null;
  },

  update: async (id: string, cliente: Partial<Cliente>) => {
    const apiBase = client.getApiBase();
    const { token } = await client.ensureAuth();

    const url = `${apiBase}/rpc/update_customer`;
    const payload = {
      p_id: id,
      p_name: cliente.name,
      p_phone: cliente.phone,
      p_email: cliente.email ?? null,
      p_government_id: cliente.government_id ?? null,
      p_notes: cliente.notes ?? null,
    };

    const res = await client.fetch(url, {
      method: "POST",
      token,
      headers: {
        "Content-Type": "application/json",
        "Content-Profile": "api",
        Prefer: "return=representation",
      },
      body: payload,
    });

    const item = Array.isArray(res) ? res[0] : res;
    return fromApiCustomer(item);
  },
};
