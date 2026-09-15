// Runs once when the Next.js server boots (Node.js runtime only).
// On first run, this provisions the "founder" account (super admin / website
// owner) using the credentials configured in the .env file, so the site
// always has exactly one founder without any manual setup step.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const bcrypt = (await import("bcryptjs")).default;

    const founderEmail = (process.env.FOUNDER_EMAIL || "").trim().toLowerCase();
    const founderPassword = process.env.FOUNDER_PASSWORD || "";
    const founderName = process.env.FOUNDER_NAME?.trim() || "بنیان‌گذار";
    const founderPhone = process.env.FOUNDER_PHONE?.trim() || null;

    if (!founderEmail || !founderPassword) {
      console.warn(
        "[founder-setup] FOUNDER_EMAIL / FOUNDER_PASSWORD are not set in .env — skipping automatic founder account creation."
      );
      return;
    }

    // Is there already a founder in the system at all?
    const existingFounders = await db.select().from(users).where(eq(users.role, "founder")).limit(1);

    if (existingFounders.length > 0) {
      // A founder already exists. If its email no longer matches the one
      // configured in .env, leave it alone — we never silently demote or
      // duplicate founders. This keeps the "first run only" behaviour safe
      // across restarts/deploys.
      return;
    }

    // No founder yet. If a user already registered with the founder email
    // (e.g. someone signed up before the env var was set), promote them.
    const [existingByEmail] = await db.select().from(users).where(eq(users.email, founderEmail)).limit(1);

    if (existingByEmail) {
      await db
        .update(users)
        .set({
          role: "founder",
          // Keep the founder's phone number in sync with .env in case it
          // wasn't set (or has changed) when this account was first created.
          phone: founderPhone || existingByEmail.phone,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingByEmail.id));
      console.log(`[founder-setup] Promoted existing user "${founderEmail}" to founder.`);
      return;
    }

    const hashedPassword = await bcrypt.hash(founderPassword, 12);
    await db.insert(users).values({
      name: founderName,
      email: founderEmail,
      password: hashedPassword,
      phone: founderPhone,
      role: "founder",
    });

    console.log(`[founder-setup] Founder account created for ${founderEmail}.`);
  } catch (error) {
    // Don't crash server boot if the DB isn't reachable yet (e.g. during
    // certain build steps). The next successful boot will retry.
    console.error("[founder-setup] Failed to provision founder account:", error);
  }
}
