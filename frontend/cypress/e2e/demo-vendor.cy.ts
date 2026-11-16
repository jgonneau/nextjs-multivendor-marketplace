const shop = (name: string) => cy.contains("main section", name);

describe("Demo: vendor", () => {
  beforeEach(() => {
    cy.visit("/demo/vendor");
    cy.location("pathname").should("eq", "/demo/vendor/my-shops");
  });

  it("shows only Victor's shops", () => {
    shop("Ceramic Studio").contains("3 products");
    shop("Atelier Lin").contains("2 products");
    cy.contains("main h2", "Roast & Co").should("not.exist");
    cy.get('nav[aria-label="Main"]').contains("Users").should("not.exist");
  });

  it("adds a product to a shop", () => {
    shop("Ceramic Studio").contains("button", "Add product").click();
    cy.dialog("Add a product").within(() => {
      cy.field("Reference").type("TEAPOT01");
      cy.field("Price (€)").type("54");
      cy.field("Title").type("Stoneware teapot");
      cy.root().contains("button", "Add product").click();
    });
    cy.toast("Product added");
    shop("Ceramic Studio").within(() => {
      cy.contains("Stoneware teapot");
      cy.contains("4 products");
    });
  });

  it("opens a new shop, refusing a duplicate name", () => {
    cy.contains("button", "Open a shop").click();
    cy.dialog("Open a new shop").within(() => {
      cy.field("Shop name").type("Atelier Lin");
      cy.root().contains("button", "Open shop").click();
    });
    cy.toast("Couldn't open the shop");

    cy.dialog("Open a new shop").within(() => {
      cy.field("Shop name").clear().type("Paper Trail");
      cy.field("Address").type("3 rue du Papier, Nantes");
      cy.root().contains("button", "Open shop").click();
    });
    cy.toast("Shop opened");
    cy.contains("main h2", "Paper Trail");
  });

  it("moves an incoming order along", () => {
    cy.get('nav[aria-label="Main"]').contains("a", "Orders").click();
    cy.location("pathname").should("eq", "/demo/vendor/orders");
    cy.contains("h1", "Incoming orders");
    // Orders for Ceramic Studio and Atelier Lin only.
    cy.get("main article").should("have.length", 4);

    cy.contains('[role="tab"]', "Pending").click();
    cy.get("main article").should("have.length", 1).contains("button", "Update delivery").click();
    cy.dialog("Update delivery").within(() => {
      cy.contains('[role="radio"]', "Shipped").click();
      cy.root().contains("button", "Save changes").click();
    });
    cy.toast("Delivery updated");
    cy.contains("No pending orders");
    cy.contains('[role="tab"]', "Shipped").invoke("text").should("match", /^Shipped\s*2$/);
  });
});
