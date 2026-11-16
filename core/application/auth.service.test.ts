/**
 * @jest-environment node
 */
import { AuthService } from "@/core/application/auth.service";
import { PermissionError } from "@/core/domain/errors";
import type { TokenIssuer } from "@/core/ports/security";
import { hashPassword, ScryptPasswordHasher } from "@/adapters/security/password";
import { mockRepositories, type MockRepositories } from "@/__test__/helpers/mockRepositories";

describe("AuthService", () => {
  let repos: MockRepositories;
  let tokens: { issue: jest.MockedFunction<TokenIssuer["issue"]> };
  let service: AuthService;
  let stored: any;

  beforeAll(async () => {
    stored = { id: "u1", email: "a@b.com", role: "CUSTOMER", activated: true, password: await hashPassword("right") };
  });

  beforeEach(() => {
    repos = mockRepositories();
    tokens = { issue: jest.fn().mockResolvedValue("signed-token") };
    service = new AuthService(repos.users, new ScryptPasswordHasher(), tokens);
  });

  describe("authenticate", () => {
    test("throws PermissionError for an unknown email", async () => {
      repos.users.findByEmail.mockResolvedValue(null);
      await expect(service.authenticate("a@b.com", "right")).rejects.toBeInstanceOf(PermissionError);
    });

    test("throws PermissionError on a wrong password", async () => {
      repos.users.findByEmail.mockResolvedValue(stored);
      await expect(service.authenticate("a@b.com", "wrong")).rejects.toBeInstanceOf(PermissionError);
    });

    test("rejects a legacy plaintext password, even when it matches", async () => {
      repos.users.findByEmail.mockResolvedValue({ ...stored, password: "right" });
      await expect(service.authenticate("a@b.com", "right")).rejects.toBeInstanceOf(PermissionError);
    });

    test("throws PermissionError when the account is deactivated", async () => {
      repos.users.findByEmail.mockResolvedValue({ ...stored, activated: false });
      await expect(service.authenticate("a@b.com", "right")).rejects.toBeInstanceOf(PermissionError);
    });

    test("returns the user on valid, activated credentials", async () => {
      repos.users.findByEmail.mockResolvedValue(stored);
      await expect(service.authenticate("a@b.com", "right")).resolves.toEqual(stored);
    });
  });

  describe("login", () => {
    test("issues a token with the user's claims and stores it on the account", async () => {
      repos.users.findByEmail.mockResolvedValue(stored);
      repos.users.update.mockResolvedValue(stored);

      const result = await service.login({ email: "a@b.com", password: "right" });

      expect(result).toEqual({ user: stored, token: "signed-token" });
      expect(tokens.issue).toHaveBeenCalledWith({ id: "u1", email: "a@b.com", role: "CUSTOMER" });
      expect(repos.users.update).toHaveBeenCalledWith("u1", { token: "signed-token" });
    });

    test("issues nothing on bad credentials", async () => {
      repos.users.findByEmail.mockResolvedValue(stored);
      await expect(service.login({ email: "a@b.com", password: "wrong" })).rejects.toBeInstanceOf(PermissionError);
      expect(tokens.issue).not.toHaveBeenCalled();
      expect(repos.users.update).not.toHaveBeenCalled();
    });
  });
});
