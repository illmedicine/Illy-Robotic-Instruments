/**
 * Cloud Functions for illyrobotic-ai.com
 * ---------------------------------------
 * Square payment processing. Static hosting (GitHub Pages) cannot do this because
 * completing a Square charge requires a SERVER that holds the secret access token
 * and calls Square's Payments API with the card token produced in the browser.
 *
 * Exposed via Firebase Hosting rewrite:  POST /api/pay  ->  this `api` function.
 *
 * SETUP (owner, one time):
 *   1. Create a Square account + application at https://developer.squareup.com
 *   2. Grab the Access Token (start with SANDBOX) and a Location ID.
 *   3. Store the secret (never commit it):
 *        firebase functions:secrets:set SQUARE_ACCESS_TOKEN
 *   4. Set non-secret config in .env (functions/.env), e.g.:
 *        SQUARE_ENVIRONMENT=sandbox
 *        SQUARE_LOCATION_ID=XXXXXXXXXXXXX
 *   5. Requires the Blaze (pay-as-you-go) plan to deploy functions.
 */

import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import express from "express";
import cors from "cors";
import { randomUUID } from "crypto";
import { SquareClient, SquareEnvironment } from "square";

// Secret injected at runtime (set via `firebase functions:secrets:set`).
const SQUARE_ACCESS_TOKEN = defineSecret("SQUARE_ACCESS_TOKEN");

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

/**
 * POST /api/pay
 * body: { sourceId: string (card token from Web Payments SDK), amount: number (USD dollars), currency?: string, note?: string }
 */
app.post("/api/pay", async (req, res) => {
  try {
    const { sourceId, amount, currency = "USD", note } = req.body || {};

    if (!sourceId || !amount) {
      return res.status(400).json({ success: false, error: "Missing sourceId or amount." });
    }

    const environment =
      process.env.SQUARE_ENVIRONMENT === "production"
        ? SquareEnvironment.Production
        : SquareEnvironment.Sandbox;

    const client = new SquareClient({
      token: SQUARE_ACCESS_TOKEN.value(),
      environment,
    });

    // Square expects the smallest currency unit (cents for USD) as a BigInt.
    const amountCents = BigInt(Math.round(Number(amount) * 100));

    const result = await client.payments.create({
      sourceId,
      idempotencyKey: randomUUID(),
      amountMoney: {
        amount: amountCents,
        currency,
      },
      locationId: process.env.SQUARE_LOCATION_ID,
      note,
    });

    // BigInt values are not JSON-serializable — coerce before sending.
    const payment = result.payment;
    return res.json({
      success: true,
      paymentId: payment?.id,
      status: payment?.status,
      receiptUrl: payment?.receiptUrl,
    });
  } catch (err) {
    console.error("Square payment error:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Payment failed.",
    });
  }
});

// Simple health check: GET /api/health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

export const api = onRequest({ secrets: [SQUARE_ACCESS_TOKEN] }, app);
