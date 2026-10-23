import { AdvancedCheckout } from "@/components/tools/selling";
import { CheckoutHeading } from "@/components/tools/checkout-heading";
export const metadata = { title: "New sale" };
export default function Page() {
  return (
    <>
      <CheckoutHeading />
      <AdvancedCheckout />
    </>
  );
}
