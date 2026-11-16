const userRow = (text: string) => cy.contains("main li", text);

describe("Demo: admin", () => {
  it("sees every order and the admin pages", () => {
    cy.visit("/demo/admin");
    cy.location("pathname").should("eq", "/demo/admin/orders");
    cy.contains("h1", "All orders");
    cy.get("main article").should("have.length", 7);
    cy.get('nav[aria-label="Main"]').within(() => {
      cy.contains("a", "Users").should("have.attr", "href", "/demo/admin/admin/users");
      cy.contains("a", "Catalog").should("have.attr", "href", "/demo/admin/admin/catalog");
    });
  });

  it("opens an order's details", () => {
    cy.visit("/demo/admin/orders");
    // Sam's most recent order: a tote bag from Atelier Lin.
    cy.contains("main article", "sam@demo.shop").contains("button", "Details").click();
    cy.dialog("Order details").within(() => {
      cy.contains("sam@demo.shop");
      cy.contains("Atelier Lin");
      cy.contains("Linen tote bag");
    });
  });

  describe("users", () => {
    beforeEach(() => {
      cy.visit("/demo/admin/admin/users");
      cy.contains("h1", "Users");
    });

    it("lists everyone and marks the current user", () => {
      cy.get("main ul > li").should("have.length", 8);
      userRow("Ada Laurent").within(() => {
        cy.contains("(you)");
        cy.contains("superadmin");
        cy.get('button[aria-label="Delete ada@demo.shop"]').should("not.exist");
      });
    });

    it("edits a user", () => {
      cy.get('button[aria-label="Edit sam@demo.shop"]').click({ force: true });
      cy.dialog("Edit user").within(() => {
        cy.field("Name").clear().type("Sam Rivera");
        cy.root().contains("button", "Save changes").click();
      });
      cy.toast("User updated");
      userRow("Sam Rivera").contains("sam@demo.shop");
    });

    it("refuses to delete a user who still owns shops", () => {
      cy.get('button[aria-label="Delete victor@demo.shop"]').click({ force: true });
      cy.dialog("Delete this user?").contains("button", "Delete").click();
      cy.toast("They still own shops or have orders.");
      userRow("victor@demo.shop").should("exist");
    });

    it("deletes a user with nothing attached", () => {
      cy.get('button[aria-label="Delete newcomer@demo.shop"]').click({ force: true });
      cy.dialog("Delete this user?").contains("button", "Delete").click();
      cy.toast("User deleted");
      cy.contains("main li", "newcomer@demo.shop").should("not.exist");
      cy.get("main ul > li").should("have.length", 7);
    });
  });

  describe("catalog", () => {
    beforeEach(() => {
      cy.visit("/demo/admin/admin/catalog");
      cy.contains("h1", "Catalog");
    });

    it("lists every shop", () => {
      for (const name of ["Ceramic Studio", "Atelier Lin", "Roast & Co", "Hive Goods"]) cy.contains("main h2", name);
    });

    it("refuses to delete a shop that still has products", () => {
      cy.get('button[aria-label="Delete Hive Goods"]').click({ force: true });
      cy.dialog("Delete this shop?").contains("button", "Delete").click();
      cy.toast("This shop still has products or orders.");
      cy.contains("main h2", "Hive Goods");
    });

    it("deletes a product", () => {
      cy.get('button[aria-label="Delete Bud vase"]').click({ force: true });
      cy.dialog("Delete this product?").contains("button", "Delete").click();
      cy.toast("Product deleted");
      cy.contains("main", "Bud vase").should("not.exist");
    });
  });
});
