const card = (title: string) => cy.contains("main article", title);

describe("Demo: customer", () => {
  beforeEach(() => {
    cy.visit("/demo/customer");
    cy.location("pathname").should("eq", "/demo/customer/shop");
  });

  it("only shows customer pages", () => {
    cy.get('nav[aria-label="Main"]').within(() => {
      cy.contains("a", "Shop");
      cy.contains("a", "Orders");
      cy.contains("My shops").should("not.exist");
      cy.contains("Users").should("not.exist");
    });
  });

  it("lists, searches and filters products", () => {
    cy.get("main article").should("have.length", 9);
    card("Bud vase").contains("Out of stock");
    card("Bud vase").find("button").should("be.disabled");

    // Search matches product text and shop names.
    cy.get('input[aria-label="Search products"]').type("coffee");
    cy.get("main article").should("have.length", 1).contains("Single-origin coffee");
    cy.get('input[aria-label="Search products"]').clear().type("roast & co");
    cy.get("main article").should("have.length", 2);
    cy.get('input[aria-label="Search products"]').clear();

    cy.contains('[role="tab"]', "Hive Goods").click();
    cy.get("main article").should("have.length", 2).each(($a) => expect($a.text()).to.contain("Hive Goods"));
  });

  it("checks out a basket from two shops as two orders", () => {
    card("Hand-thrown mug").contains("button", "Add").click();
    card("Beeswax candle").contains("button", "Add").click();
    card("Hand-thrown mug").contains("button", "Added");
    cy.get('button[aria-label="Basket, 2 items"]').click();

    cy.dialog("Your basket").within(() => {
      cy.contains("Ceramic Studio");
      cy.contains("Hive Goods");
      cy.contains("Your items come from 2 shops");
      cy.contains("button", "Place order").click();
    });
    cy.dialog("Order placed").within(() => {
      cy.contains("2 orders have been created, one per shop.");
      cy.contains("a", "Track my orders").click();
    });

    cy.location("pathname").should("eq", "/demo/customer/orders");
    cy.contains("h1", "My orders");
    // Camille starts with 3 orders.
    cy.get("main article").should("have.length", 5);
    cy.contains('[role="tab"]', "Pending").invoke("text").should("match", /^Pending\s*2$/);
  });

  it("removes items from the basket", () => {
    card("Wildflower honey").contains("button", "Add").click();
    cy.get('button[aria-label="Basket, 1 item"]').click();
    cy.dialog("Your basket").within(() => {
      cy.get('button[aria-label="Remove Wildflower honey"]').click();
      cy.contains("Your basket is empty");
    });
  });

  it("Reset puts the sample data back", () => {
    card("Linen tote bag").contains("button", "Add").click();
    cy.get('button[aria-label="Basket, 1 item"]').click();
    cy.dialog("Your basket").contains("button", "Place order").click();
    cy.dialog("Order placed").contains("a", "Track my orders").click();
    cy.get("main article").should("have.length", 4);

    cy.contains("button", "Reset").click();
    cy.get("main article").should("have.length", 3);
  });
});
