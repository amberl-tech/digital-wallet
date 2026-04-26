import "@supabase/functions-js/edge-runtime.d.ts"
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.224.0/encoding/base64.ts"
import { Sha1 } from "https://deno.land/std@0.224.0/hash/sha1.ts"
import { ZipWriter } from "https://deno.land/x/zipjs@v2.7.20/index.js"

type PassRequest = {
  fullName: string
  badgeId: string
  role: string
  photoUrl?: string
  qrValue: string
  expiresAt?: string
  tier?: string
  points?: number
  organization?: string
  backgroundColor?: string
  labelColor?: string
}

const APPLE_PASS_CERT = Deno.env.get("APPLE_PASS_CERT") // base64 .p12
const APPLE_PASS_CERT_PASSWORD = Deno.env.get("APPLE_PASS_CERT_PASSWORD")
const PASS_TYPE_ID = Deno.env.get("PASS_TYPE_ID")

if (!APPLE_PASS_CERT || !APPLE_PASS_CERT_PASSWORD || !PASS_TYPE_ID) {
  console.error("Missing required Apple Wallet env vars")
}

async function sha1(data: Uint8Array): Promise<string> {
  const hash = new Sha1()
  hash.update(data)
  return hash.toString()
}

async function signManifest(manifest: Uint8Array): Promise<Uint8Array> {
  const p12Bytes = base64Decode(APPLE_PASS_CERT!)
  const p12Blob = new Blob([p12Bytes], { type: "application/x-pkcs12" })

  const pkcs12 = await crypto.subtle.importKey(
    "pkcs12",
    await p12Blob.arrayBuffer(),
    {
      name: "PKCS12",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign(
    {
      name: "PKCS1-v1_5",
    },
    pkcs12,
    manifest
  )

  return new Uint8Array(signature)
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 })
  }

  try {
    const body = (await req.json()) as Partial<PassRequest>

    if (!body.fullName || !body.badgeId || !body.qrValue) {
      return new Response(
        JSON.stringify({
          error: "fullName, badgeId, and qrValue are required fields",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      )
    }

    const now = new Date()
    const serialNumber = crypto.randomUUID()

    const organizationName = body.organization ?? "Amber Wellness"
    const tier = body.tier ?? "Member"
    const points = body.points ?? 0
    const backgroundColor = body.backgroundColor ?? "0,122,255"
    const labelColor = body.labelColor ?? "255,255,255"

    const passJson: Record<string, unknown> = {
      formatVersion: 1,
      passTypeIdentifier: PASS_TYPE_ID,
      serialNumber,
      teamIdentifier: "",
      organizationName,
      description: "Digital Wellness Badge",
      logoText: organizationName,
      foregroundColor: labelColor,
      backgroundColor,
      labelColor,
      expirationDate: body.expiresAt ?? undefined,
      voided: false,
      generic: {
        primaryFields: [
          { key: "name", label: "Name", value: body.fullName },
        ],
        secondaryFields: [
          { key: "role", label: "Role", value: body.role ?? "Member" },
          { key: "tier", label: "Tier", value: tier },
        ],
        auxiliaryFields: [
          { key: "badgeId", label: "Badge ID", value: body.badgeId },
          { key: "points", label: "Points", value: String(points) },
        ],
        backFields: [
          { key: "issued", label: "Issued", value: now.toISOString() },
          body.expiresAt
            ? { key: "expires", label: "Expires", value: body.expiresAt }
            : undefined,
        ].filter(Boolean),
      },
      barcode: {
        format: "PKBarcodeFormatQR",
        message: body.qrValue,
        messageEncoding: "iso-8859-1",
        altText: body.badgeId,
      },
    }

    // Load images from templates/
    const icon = await Deno.readFile("./templates/icon.png")
    const icon2x = await Deno.readFile("./templates/icon@2x.png")
    const logo = await Deno.readFile("./templates/logo.png")

    // Build manifest.json
    const manifestObj: Record<string, string> = {
      "pass.json": await sha1(new TextEncoder().encode(JSON.stringify(passJson))),
      "icon.png": await sha1(icon),
      "icon@2x.png": await sha1(icon2x),
      "logo.png": await sha1(logo),
    }

    const manifestJson = new TextEncoder().encode(JSON.stringify(manifestObj))

    // Sign manifest
    const signature = await signManifest(manifestJson)

    // Build .pkpass ZIP
    const zipWriter = new ZipWriter()
    zipWriter.add("pass.json", new TextEncoder().encode(JSON.stringify(passJson)))
    zipWriter.add("manifest.json", manifestJson)
    zipWriter.add("signature", signature)
    zipWriter.add("icon.png", icon)
    zipWriter.add("icon@2x.png", icon2x)
    zipWriter.add("logo.png", logo)

    const pkpassBytes = await zipWriter.close()

    return new Response(pkpassBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.apple.pkpass",
        "Content-Disposition": `attachment; filename="badge.pkpass"`,
      },
    })

  } catch (err) {
    console.error("Error generating pass:", err)
    return new Response(
      JSON.stringify({
        error: "Failed to generate pass",
        details: String(err),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
})
