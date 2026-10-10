import { Accordion, AccordionItem } from "@/components/ui/accordion";
export const metadata = { title: "FAQ" };
const QA: [string, string][] = [
  ["How do I choose my size?", "Open the size guide on any product page. Our jerseys have a regular athletic fit — if you are between sizes or prefer a relaxed look, size up."],
  ["How long does delivery take?", "1–2 days inside Dhaka and 2–4 days for the rest of Bangladesh after dispatch. Personalised jerseys need about 48 hours of printing first."],
  ["Can I pay cash on delivery?", "Yes. Cash on Delivery is available nationwide. Online payment by card, bKash or Nagad is available when enabled at checkout."],
  ["Can I return a personalised jersey?", "Personalised items are made to order, so they can only be returned if they are faulty or misprinted. Non-personalised items can be exchanged within 7 days."],
  ["How does Virtual Try-On work?", "You upload a photo and our AI provider generates a preview of you wearing the selected jersey. It's an AI-generated visualisation — not an exact representation of fit, size or fabric. Photos are stored privately and deleted automatically."],
  ["Are these official club or federation products?", "No. Our jerseys are original Jersey Studio designs and supporters' editions. We don't sell counterfeit or unlicensed replicas."],
  ["How do I track my order?", "Use the Track order page with your order number and mobile number. Once a courier is booked you'll also see the tracking code."],
];
export default function FAQ() {
  return (
    <div className="container-x max-w-3xl py-12 md:py-20">
      <h1 className="font-heading text-[34px] font-extrabold md:text-[48px]">Frequently asked questions</h1>
      <Accordion type="single" collapsible className="mt-10 border-t border-border">
        {QA.map(([q, a], i) => <AccordionItem key={i} value={`q${i}`} title={q}><p>{a}</p></AccordionItem>)}
      </Accordion>
    </div>
  );
}
