import PlunkModule from "@plunk/node";
import dotenv from "dotenv";
import fs from "fs";
import path from "url";
import { fileURLToPath } from "url";
import pathModule from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = pathModule.dirname(__filename);

// Handle various ESM/CJS interop scenarios for Plunk
let Plunk = PlunkModule;
if (PlunkModule.default) {
  Plunk = PlunkModule.default;
  if (Plunk.default) {
    Plunk = Plunk.default;
  }
}

const getPlunk = () => {
  const apiKey = (process.env.PLUNK_SECRET_API_KEY || "").trim();
  if (!apiKey || apiKey === "your_plunk_secret_key_here") {
    return null;
  }
  return new Plunk(apiKey, {
    baseUrl: "https://next-api.useplunk.com/v1/",
  });
};

/**
 * Sends a welcome email to a newly registered user.
 * @param {string} email - The user's email address.
 * @param {string} name - The user's name.
 */
export const sendWelcomeEmail = async (email, name) => {
  const plunk = getPlunk();
  if (!plunk) {
    console.warn("[Plunk] PLUNK_SECRET_API_KEY is not set. Skipping welcome email.");
    return;
  }

  try {
    const templatePath = pathModule.join(__dirname, "../../mailTemp/welcome.html");
    let html = fs.readFileSync(templatePath, "utf8");

    html = html
      .replace(/{{name}}/g, name)
      .replace(/{{email}}/g, email)
      .replace(/{{year}}/g, new Date().getFullYear().toString());

    await plunk.emails.send({
      to: email,
      subject: "Welcome to VeritaBox: System Initialized",
      body: html,
      from: "hello@veritabox.com",
      name: "VeritaBox"
    });
    console.log(`[Plunk] Welcome email dispatched to ${email}`);
  } catch (error) {
    console.error(`[Plunk] Failed to dispatch welcome email to ${email}:`, error.message);
  }
};

/**
 * Sends an OTP verification email.
 * @param {string} email - The user's email address.
 * @param {string} otp - The 6-digit OTP code.
 */
export const sendOTPEmail = async (email, otp) => {
  const plunk = getPlunk();
  if (!plunk) {
    console.warn("[Plunk] PLUNK_SECRET_API_KEY is not set. Skipping OTP email.");
    return;
  }

  try {
    const templatePath = pathModule.join(__dirname, "../../mailTemp/otp.html");
    let html = fs.readFileSync(templatePath, "utf8");

    html = html
      .replace(/{{otp}}/g, otp)
      .replace(/{{email}}/g, email)
      .replace(/{{year}}/g, new Date().getFullYear().toString());

    const result = await plunk.emails.send({
      to: email,
      subject: `Verify Identity: ${otp}`,
      body: html,
      from: "security@veritabox.com",
      name: "VeritaBox Security"
    });
    
    if (result.success) {
      console.log(`[Plunk] OTP email (${otp}) dispatched to ${email}`);
    } else {
      console.error(`[Plunk] API returned failure for ${email}:`, result);
    }
  } catch (error) {
    console.error(`[Plunk] Failed to dispatch OTP email to ${email}:`, error.message);
  }
};


/**
 * Broadcasts a newsletter to an array of recipients.
 * @param {string} subject - The subject of the newsletter.
 * @param {string} htmlContent - The HTML content.
 * @param {string[]} recipients - Array of email addresses.
 */
export const sendNewsletterBroadcast = async (subject, htmlContent, recipients) => {
  const plunk = getPlunk();
  if (!plunk) {
    console.warn("[Plunk] PLUNK_SECRET_API_KEY is not set. Skipping newsletter broadcast.");
    return { success: false, error: 'API Key not configured' };
  }

  if (!recipients || recipients.length === 0) {
    return { success: true, count: 0 };
  }

  try {
    // Plunk supports sending to multiple recipients at once if passing an array
    const result = await plunk.emails.send({
      to: recipients,
      subject: subject,
      body: htmlContent,
      from: "newsletter@veritabox.com",
      name: "VeritaBox Newsletter"
    });
    
    if (result.success) {
      console.log(`[Plunk] Newsletter broadcasted to ${recipients.length} recipients.`);
      return { success: true, count: recipients.length };
    } else {
      console.error(`[Plunk] API returned failure for broadcast:`, result);
      return { success: false, error: 'Plunk API failed' };
    }
  } catch (error) {
    console.error(`[Plunk] Failed to dispatch newsletter broadcast:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Sends an event registration confirmation and ID card link.
 * @param {string} email - The user's email address.
 * @param {string} name - The user's name.
 * @param {object} event - Event details (title, date, location).
 * @param {string} ticketToken - The unique registration token.
 */
export const sendEventRegistrationEmail = async (email, name, event, ticketToken) => {
  const plunk = getPlunk();
  if (!plunk) {
    console.warn("[Plunk] PLUNK_SECRET_API_KEY is not set. Skipping event registration email.");
    return;
  }

  try {
    const idCardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/events/${event._id}/id-card/${ticketToken}`;
    const eventDate = event.eventDate ? new Date(event.eventDate).toLocaleString() : 'TBA';
    
    let html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #fff; background-color: #000; padding: 20px; border-radius: 8px;">
        <h2 style="color: #4ade80;">Registration Confirmed: ${event.title}</h2>
        <p>Hi ${name},</p>
        <p>You have successfully registered for <strong>${event.title}</strong>.</p>
        <div style="background-color: #111; padding: 15px; border-radius: 6px; margin: 20px 0; border: 1px solid #333;">
          <p style="margin: 5px 0;"><strong>Date & Time:</strong> ${eventDate}</p>
          <p style="margin: 5px 0;"><strong>Location:</strong> ${event.location || 'TBA'}</p>
        </div>
        <p>Please present your digital ID card at the venue.</p>
        <a href="${idCardUrl}" style="display: inline-block; background-color: #4ade80; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 10px;">View Digital ID Card</a>
        <p style="margin-top: 30px; font-size: 12px; color: #666;">If you didn't request this, you can ignore this email.</p>
      </div>
    `;

    const result = await plunk.emails.send({
      to: email,
      subject: `Registration Confirmed: ${event.title}`,
      body: html,
      from: "hello@veritabox.com",
      name: "VeritaBox"
    });
    
    if (result.success) {
      console.log(`[Plunk] Event registration email dispatched to ${email}`);
    } else {
      console.error(`[Plunk] API returned failure for event registration ${email}:`, result);
    }
  } catch (error) {
    console.error(`[Plunk] Failed to dispatch event registration email to ${email}:`, error.message);
  }
};

