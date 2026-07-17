// src/lib/customers/interactions.service.ts
import { client } from "../api.customer/client";
import { APICreateInteractionRPC } from "./customers.types";

export const InteractionsService = {
  create: async (interaction: APICreateInteractionRPC) => {
    const { token, userId } = await client.ensureAuth();

    const payload = {
      ...interaction,
      p_performed_by: interaction.p_performed_by ?? userId ?? null,
    };

    return client.rpc("create_customer_interaction", payload, token);
  },
};
