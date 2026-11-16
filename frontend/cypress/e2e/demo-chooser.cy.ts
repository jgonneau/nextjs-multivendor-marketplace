describe("Demo: chooser and banner", () => {
  it("offers one card per view", () => {
    cy.visit("/demo");
    cy.get('main a[href^="/demo/"]').should("have.length", 3);
    cy.contains("a", "Signed in as camille@demo.shop");
    cy.contains("a", "Signed in as victor@demo.shop");
    cy.contains("a", "Signed in as ada@demo.shop");
  });

  it("opens each view on its home page", () => {
    const homes = { customer: "/demo/customer/shop", vendor: "/demo/vendor/my-shops", admin: "/demo/admin/orders" };
    for (const [view, home] of Object.entries(homes)) {
      cy.visit("/demo");
      cy.get(`main a[href="/demo/${view}"]`).click();
      cy.location("pathname").should("eq", home);
    }
  });

  it("returns 404 for an unknown view", () => {
    cy.request({ url: "/demo/bogus/shop", failOnStatusCode: false }).its("status").should("eq", 404);
  });

  it("switches view, keeping the page when the other role has it", () => {
    cy.visit("/demo/customer/orders");
    cy.contains("h1", "My orders");

    cy.contains('[role="tab"]', "Vendor").click();
    cy.location("pathname").should("eq", "/demo/vendor/orders");
    cy.contains("h1", "Incoming orders");

    cy.contains('[role="tab"]', "Admin").click();
    cy.location("pathname").should("eq", "/demo/admin/orders");
    cy.contains("h1", "All orders");

    cy.visit("/demo/admin/admin/users");
    cy.contains('[role="tab"]', "Customer").click();
    cy.location("pathname").should("eq", "/demo/customer/shop");
  });

  it("exits back to the chooser", () => {
    cy.visit("/demo/vendor");
    cy.contains("a", "Exit demo").click();
    cy.location("pathname").should("eq", "/demo");
  });

  it("signing out leaves the demo", () => {
    cy.visit("/demo/customer");
    cy.get('button[aria-label="Account menu"]').click();
    cy.contains("button", "Sign out").click();
    cy.location("pathname").should("eq", "/demo");
  });
});
