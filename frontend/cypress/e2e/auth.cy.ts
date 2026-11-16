/**
 * Real sign-up and sign-in against the API (not the demo). Accounts are
 * e2e-…@example.test and are deleted from the database after the spec.
 * Skipped when the API isn't reachable through the frontend.
 */
const PASSWORD = "E2e-password-1";
const uniqueEmail = () => `e2e-${Date.now()}-${Cypress._.random(1e6)}@example.test`;

function createAccount(email: string) {
  cy.request("POST", "/api/auth/newaccount", { email, password: PASSWORD, role: "CUSTOMER" });
}

function signIn(email: string, password: string) {
  cy.visit("/login");
  cy.field("Email").type(email);
  cy.field("Password").type(password, { log: false });
  cy.get("form").contains("button", "Sign in").click();
}

describe("Auth against the real API", () => {
  before(function () {
    // 401 means the API answered (unauthenticated); anything 5xx means it's down.
    cy.request({ url: "/api/product", failOnStatusCode: false }).then((res) => {
      if (res.status >= 500) this.skip();
    });
  });

  after(() => {
    cy.task("deleteE2eUsers");
  });

  it("sends signed-out visitors to sign in, then back", () => {
    cy.visit("/orders");
    cy.location("pathname").should("eq", "/login");
    cy.location("search").should("eq", "?next=%2Forders");
  });

  it("signs up as a customer and signs out", () => {
    const email = uniqueEmail();
    cy.visit("/signup");
    cy.contains('[role="radio"]', "I want to shop").should("have.attr", "aria-checked", "true");
    cy.field("Name").type("E2E Customer");
    cy.field("Email").type(email);
    cy.field("Password").type(PASSWORD);
    cy.field("Confirm password").type(PASSWORD);
    cy.get("form").contains("button", "Create account").click();

    cy.toast("Your account is ready");
    cy.location("pathname").should("eq", "/shop");
    cy.contains("h1", "Discover the marketplace");

    cy.get('button[aria-label="Account menu"]').click();
    cy.contains(email);
    cy.contains("customer");
    cy.contains("button", "Sign out").click();
    cy.toast("You're signed out.");
    cy.get("header").contains("a", "Sign in");
  });

  it("checks the password fields before calling the API", () => {
    cy.visit("/signup");
    cy.field("Email").type(uniqueEmail());
    cy.field("Password").type("short");
    cy.field("Confirm password").type("different");
    cy.get("form").contains("button", "Create account").click();
    cy.contains("Use at least 8 characters.");
    cy.contains("Passwords don't match.");
    cy.location("pathname").should("eq", "/signup");
  });

  it("refuses an email that is already registered", () => {
    const email = uniqueEmail();
    createAccount(email);
    cy.visit("/signup");
    cy.field("Email").type(email);
    cy.field("Password").type(PASSWORD);
    cy.field("Confirm password").type(PASSWORD);
    cy.get("form").contains("button", "Create account").click();
    cy.contains('[role="alert"]', "An account with this email already exists.");
  });

  it("signs in, and rejects a wrong password", () => {
    const email = uniqueEmail();
    createAccount(email);

    signIn(email, "not-the-password");
    cy.contains('[role="alert"]', "Wrong email or password.");
    cy.location("pathname").should("eq", "/login");

    signIn(email, PASSWORD);
    cy.toast("Welcome back!");
    cy.location("pathname").should("eq", "/shop");
  });

  it("returns to the requested page after signing in", () => {
    const email = uniqueEmail();
    createAccount(email);
    cy.visit("/orders");
    cy.location("pathname").should("eq", "/login");
    cy.field("Email").type(email);
    cy.field("Password").type(PASSWORD, { log: false });
    cy.get("form").contains("button", "Sign in").click();
    cy.location("pathname").should("eq", "/orders");
    cy.contains("h1", "My orders");
  });
});
