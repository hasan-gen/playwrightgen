import { describe, expect, it } from "vitest";

import {
  EnvironmentValidationError,
  validateRedisEnvironment,
  validateStripeCheckoutEnvironment,
  validateStripeClientEnvironment,
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
        STRIPE_PRO_PRICE_ID: "price_example",
        NEXT_PUBLIC_APP_URL: "https://preview.playwrightgen.example",
        UNRELATED_SECRET: "must-not-be-returned",
      }),
    ).toEqual({
      STRIPE_SECRET_KEY: "sk_test_example",
      STRIPE_PRO_PRICE_ID: "price_example",
      NEXT_PUBLIC_APP_URL: "https://preview.playwrightgen.example",
    });
  });

  it("rejects an invalid checkout application URL", () => {
    expect(() =>
      validateStripeCheckoutEnvironment({
        STRIPE_SECRET_KEY: "sk_test_example",
        STRIPE_PRO_PRICE_ID: "price_example",
        NEXT_PUBLIC_APP_URL: "javascript:alert(1)",
      }),
    ).toThrowError(EnvironmentValidationError);
  });

  it("requires complete Redis and Stripe webhook configuration", () => {
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
        UPSTASH_REDIS_REST_URL: "https://redis.example",
        UPSTASH_REDIS_REST_TOKEN: "redis-token",
      }),
    ).toMatchObject({
      STRIPE_WEBHOOK_SECRET: "whsec_example",
      UPSTASH_REDIS_REST_URL: "https://redis.example",
    });
  });

  it("validates standalone Redis configuration", () => {
    expect(() => validateRedisEnvironment({})).toThrowError(
      EnvironmentValidationError,
    );
  });
});
