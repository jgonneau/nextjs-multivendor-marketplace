/// <reference types="cypress" />

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** The input, textarea or select whose <label> reads `label`. */
      field(label: string | RegExp): Chainable<JQuery<HTMLElement>>;
      /** The open modal or drawer titled `title`. */
      dialog(title: string): Chainable<JQuery<HTMLElement>>;
      /** A toast (success = status, error = alert) containing `text`. */
      toast(text: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

Cypress.Commands.add("field", (label: string | RegExp) =>
  cy
    // Exact match, so "Password" doesn't pick "Confirm password".
    .contains("label", typeof label === "string" ? new RegExp(`^${Cypress._.escapeRegExp(label)}$`) : label)
    .invoke("attr", "for")
    .then((id) => cy.get(`#${CSS.escape(String(id))}`))
);

Cypress.Commands.add("dialog", (title: string) => cy.get(`[role="dialog"][aria-label="${title}"]`));

Cypress.Commands.add("toast", (text: string) => cy.contains('[role="status"], [role="alert"]', text));

beforeEach(() => {
  // Deterministic language, and no remote photos (the landing gallery uses picsum).
  cy.setCookie("locale", "en");
  cy.intercept("https://picsum.photos/**", { statusCode: 204 });
});

export {};
