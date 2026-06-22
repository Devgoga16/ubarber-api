import { BufferJSON, initAuthCreds, makeCacheableSignalKeyStore } from "baileys";
import type { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from "baileys";
import { WhatsAppSession } from "../models/WhatsAppSession";

interface StoredState {
  creds: AuthenticationCreds;
  keys: Record<string, Record<string, unknown>>;
}

/**
 * Adaptador de auth state de Baileys persistido en Mongo (un documento por negocio),
 * en vez del default de archivos locales — así la sesión sobrevive a un redeploy/reinicio
 * del contenedor en Dokploy sin pedir escanear el QR de nuevo.
 */
export async function useMongoAuthState(businessId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const existing = await WhatsAppSession.findOne({ businessId });

  let stored: StoredState;
  if (existing?.authData) {
    stored = JSON.parse(existing.authData, BufferJSON.reviver) as StoredState;
  } else {
    stored = { creds: initAuthCreds(), keys: {} };
  }

  const persist = async () => {
    const payload = JSON.stringify(stored, BufferJSON.replacer);
    await WhatsAppSession.findOneAndUpdate(
      { businessId },
      { authData: payload },
      { upsert: true }
    );
  };

  const keyStore = makeCacheableSignalKeyStore(
    {
      get: async <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
        const bucket = stored.keys[type] ?? {};
        const result: { [id: string]: SignalDataTypeMap[T] } = {};
        for (const id of ids) {
          if (bucket[id] !== undefined) {
            result[id] = bucket[id] as SignalDataTypeMap[T];
          }
        }
        return result;
      },
      set: async (data) => {
        for (const type of Object.keys(data) as (keyof SignalDataTypeMap)[]) {
          stored.keys[type] = stored.keys[type] ?? {};
          const bucket = data[type] as Record<string, unknown> | undefined;
          if (!bucket) continue;
          for (const id of Object.keys(bucket)) {
            if (bucket[id] === null || bucket[id] === undefined) {
              delete stored.keys[type]![id];
            } else {
              stored.keys[type]![id] = bucket[id];
            }
          }
        }
        await persist();
      },
    },
    undefined
  );

  return {
    state: { creds: stored.creds, keys: keyStore },
    saveCreds: persist,
  };
}
