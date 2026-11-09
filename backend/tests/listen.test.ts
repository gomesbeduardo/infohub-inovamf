import { afterEach, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express from "express";
import { escutar } from "../src/listen.js";

let servidor: Server | undefined;
afterEach(() => new Promise<void>((ok) => (servidor ? servidor.close(() => ok()) : ok())));

describe("escutar", () => {
  it("abre a porta só no loopback (127.0.0.1), não em todas as interfaces", async () => {
    servidor = await escutar(express(), 0);
    expect((servidor.address() as AddressInfo).address).toBe("127.0.0.1");
  });
});
