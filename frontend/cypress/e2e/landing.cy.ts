describe("Landing page", () => {
  beforeEach(() => cy.visit("/"));

  it("switches language and remembers it", () => {
    cy.get("html").should("have.attr", "lang", "en");
    cy.contains("h1", "Shop").should("be.visible");

    cy.get('button[aria-label="Language: English"]').click();
    cy.contains('[role="option"]', "Français").click();

    cy.get("html").should("have.attr", "lang", "fr");
    cy.contains("h1", "Achetez").should("be.visible");
    cy.getCookie("locale").should("have.property", "value", "fr");

    // Rendered in French by the server on the next load, not just client-side.
    cy.reload();
    cy.get("html").should("have.attr", "lang", "fr");
    cy.contains("a", "Découvrir la démo").should("be.visible");
  });

  it("scrolls the example gallery with its arrows", () => {
    cy.get('section[aria-label="Example products"]').scrollIntoView().within(() => {
      cy.get("li").should("have.length", 8);
      cy.get('button[aria-label="Previous products"]').should("be.disabled");
      cy.get('button[aria-label="Next products"]').should("be.enabled").click();
      cy.get('button[aria-label="Previous products"]').should("be.enabled");
    });
  });

  it("scrolls down from the hero cue, which then fades out", () => {
    cy.window().its("scrollY").should("eq", 0);
    cy.contains("button", "Scroll to explore").should("be.visible").click();
    // Smooth scroll: retry until the roles section settles just under the sticky nav.
    cy.get("#roles").should(($el) => expect($el[0].getBoundingClientRect().top).to.be.within(0, 100));
    cy.contains("button", "Scroll to explore")
      .parent()
      .should(($wrap) => expect(Number(getComputedStyle($wrap[0]).opacity)).to.be.lessThan(0.05));
  });

  it("links to the demo", () => {
    cy.contains("a", "Explore the demo").click();
    cy.location("pathname").should("eq", "/demo");
    cy.contains("h1", "See the marketplace from every side");
  });
});

describe("Landing page on phones", () => {
  for (const locale of ["en", "fr"]) {
    it(`never scrolls sideways at 320px (${locale})`, () => {
      cy.viewport(320, 740);
      cy.setCookie("locale", locale);
      cy.visit("/");
      // Scroll through so every reveal-on-scroll section has rendered.
      for (const y of [0, 800, 1600, 2400, 9999]) {
        cy.scrollTo(0, y, { ensureScrollable: false });
        cy.document().should((d) => expect(d.documentElement.scrollWidth).to.be.at.most(d.documentElement.clientWidth));
      }
    });
  }

  it("stacks the hero buttons and hides the desktop-only scroll cue", () => {
    cy.viewport(375, 740);
    cy.visit("/");
    cy.contains("main a", "Create an account").invoke("outerWidth").should("be.greaterThan", 300);
    cy.contains("button", "Scroll to explore").should("not.be.visible");
  });
});
