import { describe, expect, it } from "vitest";

import {
  EnvironmentValidationError,
  validateOpenAiEnvironment,
  validateRedisEnvironment,
  validateResendEnvironment,
  validateStripeCheckoutEnvironment,
  validateStripeClientEnvironment,
  validateStripePortalEnvironment,
  validateStripeWebhookEnvironment,
} from "@/lib/env";

describe("runtime integration environment validation", () => {
  it("allows the application to load before Stripe is configured", () => {
    expect(() => validateStripeClientEnvironment({})).toThrowError(
      EnvironmentValidationError,
    );
  });

  it("returns only validated Stripe checkout configuration", () => {
    expect(
      validateStripeCheckoutEnvironment({
        STRIPE_SECRET_KEY: "sk_test_example",
        STRIPE_TEAM_PRICE_ID: "price_example",
        STRIPE_CHECKOUT_ENABLED: "true",
        STRIPE_ENVIRONMENT: "test",
        NEXT_PUBLIC_APP_URL: "https://preview.playwrightgen.example",
        UNRELATED_SECRET: "must-not-be-returned",
      }),
    ).toEqual({
      STRIPE_SECRET_KEY: "sk_test_example",
      STRIPE_TEAM_PRICE_ID: "price_example",
      STRIPE_CHECKOUT_ENABLED: "true",
      STRIPE_ENVIRONMENT: "test",
      NEXT_PUBLIC_APP_URL: "https://preview.playwrightgen.example",
    });
  });

  it("rejects an invalid checkout application URL", () => {
    expect(() =>
      validateStripeCheckoutEnvironment({
        STRIPE_SECRET_KEY: "sk_test_example",
        STRIPE_TEAM_PRICE_ID: "price_example",
        STRIPE_CHECKOUT_ENABLED: "true",
        STRIPE_ENVIRONMENT: "test",
        NEXT_PUBLIC_APP_URL: "javascript:alert(1)",
      }),
    ).toThrowError(EnvironmentValidationError);
  });

  it("requires a signed Stripe webhook and the exact Team price", () => {
    expect(() =>
      validateStripeWebhookEnvironment({
        STRIPE_SECRET_KEY: "sk_test_example",
        STRIPE_WEBHOOK_SECRET: "whsec_example",
      }),
    ).toThrowError(EnvironmentValidationError);

    expect(
      validateStripeWebhookEnvironment({
        STRIPE_SECRET_KEY: "sk_test_example",
        STRIPE_WEBHOOK_SECRET: "whsec_example",
        STRIPE_TEAM_PRICE_ID: "price_example",
        STRIPE_ENVIRONMENT: "test",
      }),
    ).toMatchObject({
      STRIPE_WEBHOOK_SECRET: "whsec_example",
      STRIPE_TEAM_PRICE_ID: "price_example",
      STRIPE_ENVIRONMENT: "test",
    });
  });

  it("keeps the customer portal available when new checkout is disabled", () => {
    expect(
      validateStripePortalEnvironment({
        STRIPE_SECRET_KEY: "sk_test_example",
        NEXT_PUBLIC_APP_URL: "https://preview.playwrightgen.example",
      }),
    ).toEqual({
      STRIPE_SECRET_KEY: "sk_test_example",
      NEXT_PUBLIC_APP_URL: "https://preview.playwrightgen.example",
    });
  });

  it("validates standalone Redis configuration", () => {
    expect(() => validateRedisEnvironment({})).toThrowError(
      EnvironmentValidationError,
    );
  });

  it("requires runtime AI and email credentials only when used", () => {
    expect(() => validateOpenAiEnvironment({})).toThrowError(
      EnvironmentValidationError,
    );
    expect(() => validateResendEnvironment({})).toThrowError(
      EnvironmentValidationError,
    );

    expect(validateOpenAiEnvironment({ OPENAI_API_KEY: "ai-key" })).toEqual({
      OPENAI_API_KEY: "ai-key",
    });
    expect(validateResendEnvironment({ RESEND_API_KEY: "email-key" })).toEqual({
      RESEND_API_KEY: "email-key",
    });
  });
});
