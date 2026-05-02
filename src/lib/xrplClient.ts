import * as xrpl from "xrpl";

const XRPL_WSS =
  process.env.EXPO_PUBLIC_XRPL_WSS ||
  "wss://s.altnet.rippletest.net:51233";

let client: xrpl.Client | null = null;

export async function getXrplClient() {
  try {
    if (client && client.isConnected()) {
      return client;
    }

    client = new xrpl.Client(XRPL_WSS);
    await client.connect();

    return client;
  } catch (error) {
    console.error("Failed to connect XRPL client", error);

    client = new xrpl.Client(XRPL_WSS);
    await client.connect();

    return client;
  }
}

export async function resetXrplClient() {
  try {
    if (client && client.isConnected()) {
      await client.disconnect();
    }
  } catch (error) {
    console.error("Failed to disconnect XRPL client", error);
  } finally {
    client = null;
  }
}

export async function disconnectXrpl() {
  await resetXrplClient();
}