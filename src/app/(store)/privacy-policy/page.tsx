import { getSettings } from "@/lib/settings";
import { ProsePage } from "@/components/store/prose-page";
export const metadata = { title: "Privacy policy" };
export default async function Privacy() {
  const s = await getSettings();
  return (
    <ProsePage title="Privacy policy" updated="October 2026">
      <p>This policy explains what personal data {s.brand.name} collects, why, and the choices you have.</p>
      <h2>What we collect</h2>
      <ul><li>Order details: name, phone, address, email (optional), items and payment status.</li><li>Account details if you register: name, email, phone, hashed password, saved addresses, wishlist and designs.</li><li>Anonymous usage analytics (pages viewed, products viewed) using a random first-party session id.</li><li>Optional marketing cookies (Google Analytics, Meta Pixel, TikTok Pixel) only after you accept them.</li></ul>
      <h2>How we use it</h2>
      <p>To process and deliver orders (shared with our courier partners and payment processor as needed), provide customer support, prevent fraud, and — only with your consent — send marketing emails.</p>
      <h2 id="tryon">Virtual Try-On photos</h2>
      <ul>
        <li>Your photo is processed only after you explicitly agree, and only to generate the try-on preview you request.</li>
        <li>Photos are re-encoded on upload, which removes location and camera metadata.</li>
        <li>Photos and generated images are stored privately and are visible only to you. They are deleted automatically after {s.tryon.retentionHours} hours unless you choose to save the preview to your account.</li>
        <li>Your photo is sent to our AI provider (Google Cloud Vertex AI, when enabled) solely to create the preview. We do not use your photos for advertising or to train models.</li>
        <li>You can delete your images at any time from the try-on page or Account → Privacy &amp; data.</li>
      </ul>
      <h2>Your rights</h2>
      <p>You can access, correct or delete your data. Request account deletion from Account → Privacy &amp; data or contact {s.brand.supportEmail}.</p>
      <h2>Security</h2>
      <p>Passwords are hashed, sessions are secure cookies, integration credentials are encrypted at rest, and staff access is permission-controlled and audited.</p>
    </ProsePage>
  );
}
