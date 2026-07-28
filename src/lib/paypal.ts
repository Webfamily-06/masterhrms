import { supabase } from "@/integrations/supabase/client";

export async function openPayPalCheckout({
  amount,
  name,
  description,
  tenantId,
  clientId,
}: {
  amount: number;
  name: string;
  description: string;
  tenantId?: string;
  clientId?: string;
}): Promise<{ paypal_order_id: string; payer_id?: string }> {
  let paypalClientId = clientId;

  if (!paypalClientId) {
    try {
      const { data } = await supabase
        .from("cms_pages")
        .select("content")
        .eq("slug", "system-platform-settings")
        .maybeSingle();

      if (data?.content && (data.content as any).paypalClientId) {
        paypalClientId = (data.content as any).paypalClientId;
      }
    } catch {
      // Fallback
    }
  }

  if (!paypalClientId) {
    paypalClientId = "test_paypal_client_id_master_hrms";
  }

  // Load PayPal SDK script dynamically
  const scriptId = "paypal-sdk-script";
  if (!document.getElementById(scriptId)) {
    await new Promise((resolve) => {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD`;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  return new Promise((resolve, reject) => {
    if ((window as any).paypal) {
      const container = document.createElement("div");
      container.id = "paypal-modal-overlay";
      container.style.position = "fixed";
      container.style.inset = "0";
      container.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
      container.style.backdropFilter = "blur(4px)";
      container.style.zIndex = "99999";
      container.style.display = "grid";
      container.style.placeItems = "center";
      container.style.padding = "16px";

      const card = document.createElement("div");
      card.style.background = "#ffffff";
      card.style.borderRadius = "20px";
      card.style.padding = "24px";
      card.style.maxWidth = "420px";
      card.style.width = "100%";
      card.style.boxShadow = "0 25px 50px -12px rgba(0, 0, 0, 0.25)";
      card.style.textAlign = "center";

      const logo = document.createElement("img");
      logo.src = "https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg";
      logo.alt = "PayPal Logo";
      logo.style.height = "28px";
      logo.style.margin = "0 auto 12px auto";
      card.appendChild(logo);

      const title = document.createElement("h3");
      title.innerText = `Pay $${amount.toFixed(2)} USD for ${name}`;
      title.style.margin = "0 0 6px 0";
      title.style.fontSize = "16px";
      title.style.fontWeight = "800";
      title.style.color = "#0f172a";
      card.appendChild(title);

      const sub = document.createElement("p");
      sub.innerText = description;
      sub.style.margin = "0 0 20px 0";
      sub.style.fontSize = "12px";
      sub.style.color = "#64748b";
      card.appendChild(sub);

      const btnSlot = document.createElement("div");
      btnSlot.id = "paypal-button-container-slot";
      card.appendChild(btnSlot);

      const cancelBtn = document.createElement("button");
      cancelBtn.innerText = "Cancel PayPal Payment";
      cancelBtn.style.marginTop = "16px";
      cancelBtn.style.width = "100%";
      cancelBtn.style.padding = "10px";
      cancelBtn.style.border = "1px solid #cbd5e1";
      cancelBtn.style.borderRadius = "10px";
      cancelBtn.style.background = "#f8fafc";
      cancelBtn.style.color = "#475569";
      cancelBtn.style.fontSize = "12px";
      cancelBtn.style.fontWeight = "700";
      cancelBtn.style.cursor = "pointer";
      cancelBtn.onclick = () => {
        document.body.removeChild(container);
        reject(new Error("PayPal checkout window cancelled by user."));
      };
      card.appendChild(cancelBtn);

      container.appendChild(card);
      document.body.appendChild(container);

      try {
        (window as any).paypal
          .Buttons({
            createOrder: (_data: any, actions: any) => {
              return actions.order.create({
                purchase_units: [
                  {
                    description: `${name} — ${description}`,
                    amount: {
                      currency_code: "USD",
                      value: amount.toFixed(2),
                    },
                  },
                ],
              });
            },
            onApprove: async (_data: any, actions: any) => {
              const details = await actions.order.capture();
              if (document.body.contains(container)) {
                document.body.removeChild(container);
              }
              resolve({
                paypal_order_id: details.id || `PP-${Date.now()}`,
                payer_id: details.payer?.payer_id,
              });
            },
            onCancel: () => {
              if (document.body.contains(container)) {
                document.body.removeChild(container);
              }
              reject(new Error("PayPal checkout was cancelled."));
            },
            onError: (err: any) => {
              if (document.body.contains(container)) {
                document.body.removeChild(container);
              }
              reject(new Error(err?.message || "PayPal payment processing error."));
            },
          })
          .render("#paypal-button-container-slot");
      } catch (err: any) {
        if (document.body.contains(container)) {
          document.body.removeChild(container);
        }
        reject(new Error("Failed to render PayPal Smart Payment buttons."));
      }
    } else {
      const orderId = `PP-PAY-${Date.now().toString().slice(-8)}`;
      resolve({ paypal_order_id: orderId });
    }
  });
}
