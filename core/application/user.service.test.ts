/**
 * @jest-environment node
 */
import { UserService } from "@/core/application/user.service";
import { NotFoundError, ValidationError } from "@/core/domain/errors";
import { isPasswordHash, ScryptPasswordHasher, verifyPassword } from "@/adapters/security/password";
import { mockRepositories, type MockRepositories } from "@/__test__/helpers/mockRepositories";

describe("UserService", () => {
  let repos: MockRepositories;
  let service: UserService;

  beforeEach(() => {
    repos = mockRepositories();
    service = new UserService(repos.users, new ScryptPasswordHasher());
  });

  describe("getUserById", () => {
    test("throws NotFoundError when no user matches", async () => {
      repos.users.findById.mockResolvedValue(null);
      await expect(service.getUserById("missing")).rejects.toBeInstanceOf(NotFoundError);
    });

    test("returns the user when found", async () => {
      const user = { id: "u1", email: "a@b.com" } as any;
      repos.users.findById.mockResolvedValue(user);
      await expect(service.getUserById("u1")).resolves.toEqual(user);
    });
  });

  describe("createUser", () => {
    test("throws ValidationError when email or password is missing", async () => {
      await expect(service.createUser({ email: "", password: "x" })).rejects.toBeInstanceOf(ValidationError);
    });

    test("throws ValidationError when the email is already taken", async () => {
      repos.users.findByEmail.mockResolvedValue({ id: "existing" } as any);
      await expect(service.createUser({ email: "a@b.com", password: "x" })).rejects.toBeInstanceOf(
        ValidationError
      );
    });

    test("creates the user with a default USER role", async () => {
      repos.users.findByEmail.mockResolvedValue(null);
      repos.users.create.mockResolvedValue({ id: "new", role: "USER" } as any);

      const created = await service.createUser({ email: "a@b.com", password: "x" });

      expect(created).toEqual({ id: "new", role: "USER" });
      expect(repos.users.create).toHaveBeenCalledWith(expect.objectContaining({ email: "a@b.com", role: "USER" }));
    });
  });

  describe("deleteUserById", () => {
    test("throws NotFoundError when the user doesn't exist, without deleting", async () => {
      repos.users.findById.mockResolvedValue(null);
      await expect(service.deleteUserById("missing")).rejects.toBeInstanceOf(NotFoundError);
      expect(repos.users.delete).not.toHaveBeenCalled();
    });

    test("deletes an existing user", async () => {
      const user = { id: "u1" } as any;
      repos.users.findById.mockResolvedValue(user);
      repos.users.delete.mockResolvedValue(user);
      await expect(service.deleteUserById("u1")).resolves.toBe(user);
      expect(repos.users.delete).toHaveBeenCalledWith("u1");
    });
  });

  describe("createUser hashing", () => {
    test("stores a hash, never the plaintext password", async () => {
      repos.users.findByEmail.mockResolvedValue(null);
      repos.users.create.mockResolvedValue({ id: "new" } as any);

      await service.createUser({ email: "a@b.com", password: "s3cret" });

      const saved = repos.users.create.mock.calls[0][0];
      expect(saved.password).not.toBe("s3cret");
      expect(isPasswordHash(saved.password)).toBe(true);
      await expect(verifyPassword("s3cret", saved.password)).resolves.toBe(true);
    });
  });

  describe("updateUser", () => {
    const existing = { id: "u1", email: "a@b.com", password: "old-hash", role: "USER" } as any;

    test("hashes a new password", async () => {
      repos.users.findById.mockResolvedValue(existing);
      repos.users.update.mockResolvedValue(existing);

      await service.updateUser("u1", { password: "n3w" });

      const [id, changes] = repos.users.update.mock.calls[0];
      expect(id).toBe("u1");
      await expect(verifyPassword("n3w", changes.password!)).resolves.toBe(true);
    });

    test("only sends the allowed fields (not id, token, activated)", async () => {
      repos.users.findById.mockResolvedValue(existing);
      repos.users.update.mockResolvedValue(existing);

      await service.updateUser("u1", { name: "Al", id: "other", token: "x", activated: false } as any);

      expect(repos.users.update).toHaveBeenCalledWith("u1", { name: "Al" });
    });

    test("throws NotFoundError for an unknown user, without updating", async () => {
      repos.users.findById.mockResolvedValue(null);
      await expect(service.updateUser("missing", { name: "Al" })).rejects.toBeInstanceOf(NotFoundError);
      expect(repos.users.update).not.toHaveBeenCalled();
    });
  });

  test("lets storage errors through instead of hiding them", async () => {
    repos.users.list.mockRejectedValue(new Error("connection refused"));
    await expect(service.listUsers()).rejects.toThrow("connection refused");
  });
});
