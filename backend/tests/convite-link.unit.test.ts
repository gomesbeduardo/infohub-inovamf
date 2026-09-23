import { describe, expect, it } from "vitest";
import { linkConvite } from "../src/utils/convite.js";

describe("linkConvite", () => {
  it("sem base configurada, sai relativo para o front completar com a origem", () => {
    expect(linkConvite("abc.def", "/convite")).toBe("/convite?token=abc.def");
  });

  it("com base absoluta configurada, usa a base", () => {
    expect(linkConvite("abc.def", "https://infohub.exemplo/convite")).toBe(
      "https://infohub.exemplo/convite?token=abc.def",
    );
  });

  it("codifica o token na query", () => {
    expect(linkConvite("a+b/c", "/convite")).toBe("/convite?token=a%2Bb%2Fc");
  });
});
