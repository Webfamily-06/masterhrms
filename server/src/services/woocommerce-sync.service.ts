import { prisma } from "../prisma";
import http from "http";
import https from "https";
import { URL } from "url";

export interface WooCommerceSettingsData {
  store_url: string;
  consumer_key: string;
  consumer_secret: string;
  wp_username: string;
  wp_app_password: string;
  sync_options?: Record<string, any>;
  last_sync_at?: string | null;
  last_connection_status?: "connected" | "disconnected" | "unknown";
  last_connection_message?: string | null;
}

export interface SyncLogEntry {
  id: string;
  action: string;
  level: "info" | "warning" | "error" | "success";
  message: string;
  context?: any;
  created_at: string;
}

const syncLogs: SyncLogEntry[] = [];

export function addWooLog(action: string, level: "info" | "warning" | "error" | "success", message: string, context?: any) {
  syncLogs.unshift({
    id: "woo-" + Date.now() + "-" + Math.random().toString(36).substring(7),
    action,
    level,
    message,
    context,
    created_at: new Date().toISOString(),
  });
  if (syncLogs.length > 100) syncLogs.pop();
}

export function getWooLogs(): SyncLogEntry[] {
  return syncLogs;
}

export function clearWooLogs(): void {
  syncLogs.length = 0;
}

export const SYNC_OPTIONS_META = {
  groups: [
    { key: "batching", title: "Batching & Timeouts" },
    { key: "behavior", title: "Sync Behavior & Mappings" },
  ],
  fields: [
    {
      key: "products_per_job",
      type: "integer",
      default: 25,
      min: 1,
      max: 200,
      group: "batching",
      label: "Products per batch",
      hint: "How many products one sync batch handles. Higher finishes faster but takes more RAM.",
    },
    {
      key: "stock_products_per_job",
      type: "integer",
      default: 25,
      min: 1,
      max: 100,
      group: "batching",
      label: "Products per stock batch",
      hint: "Same, for stock level sync. Stocky pushes batch quantities to WooCommerce.",
    },
    {
      key: "poll_tick_budget_seconds",
      type: "integer",
      default: 45,
      min: 5,
      max: 300,
      group: "batching",
      label: "Manual sync timeout (seconds)",
      hint: "Time allowed per sync batch chunk. Default 45s.",
    },
    {
      key: "autolink_page_cap",
      type: "integer",
      default: 200,
      min: 1,
      max: 2000,
      group: "behavior",
      label: "Auto-link page search limit",
      hint: "Maximum number of product pages to inspect during SKU auto-linking.",
    },
    {
      key: "sync_images",
      type: "boolean",
      default: true,
      group: "behavior",
      label: "Sync Product Media Images",
      hint: "Uses WordPress Media API to search and link product image files.",
    },
  ],
};

function wooApiRequest(
  urlStr: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  consumerKey: string,
  consumerSecret: string,
  bodyData?: any,
  timeoutMs: number = 30000
): Promise<{ statusCode: number; data: any; headers: any }> {
  return new Promise((resolve, reject) => {
    try {
      const parsedUrl = new URL(urlStr);
      const isHttps = parsedUrl.protocol === "https:";
      const client = isHttps ? https : http;

      // Clean Basic Auth Header for HTTPS
      const authHeader = "Basic " + Buffer.from(consumerKey.trim() + ":" + consumerSecret.trim()).toString("base64");
      const postPayload = bodyData ? JSON.stringify(bodyData) : null;

      // Dedicated agent with keepAlive false and rejectUnauthorized false to avoid connection pooling resets
      const agent = isHttps
        ? new https.Agent({
            rejectUnauthorized: false,
            keepAlive: false,
          })
        : new http.Agent({ keepAlive: false });

      const options: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        agent,
        headers: {
          Host: parsedUrl.hostname,
          Authorization: authHeader,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/json",
          Connection: "close",
          ...(postPayload
            ? {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(postPayload),
              }
            : {}),
        },
        timeout: timeoutMs,
      };

      const req = client.request(options, (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = raw ? JSON.parse(raw) : null;
          } catch (e) {
            parsed = { rawText: raw };
          }
          resolve({
            statusCode: res.statusCode || 500,
            data: parsed,
            headers: res.headers,
          });
        });
      });

      req.on("error", (err: any) => {
        if (err.code === "ECONNRESET") {
          reject(
            new Error(
              `Connection reset (ECONNRESET) by ${parsedUrl.hostname}. The remote web server or hosting firewall (cPanel CSF, cPHulk, or Wordfence) actively rejected the TCP connection. If you have cPanel/Wordfence, please whitelist your IP (103.126.42.196) or verify WooCommerce REST API is enabled in WP Admin.`
            )
          );
        } else {
          reject(new Error(`Connection failed: ${err.message || "Network unreachable"}`));
        }
      });

      req.on("timeout", () => {
        req.destroy();
        reject(
          new Error(
            `WooCommerce server at ${parsedUrl.hostname} did not respond within ${timeoutMs / 1000}s. The server is not reachable from this network (host down or blocked by firewall).`
          )
        );
      });

      if (postPayload) {
        req.write(postPayload);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function getWooCommerceSettings(tenantId: string): Promise<WooCommerceSettingsData> {
  const pageSlug = "tenant-" + tenantId + "-woocommerce-settings";
  try {
    const page = await prisma.cmsPage.findUnique({ where: { slug: pageSlug } });
    if (page && page.content && typeof page.content === "object") {
      const saved = page.content as any;
      return {
        store_url: saved.store_url || "",
        consumer_key: saved.consumer_key || "",
        consumer_secret: saved.consumer_secret || "",
        wp_username: saved.wp_username || "",
        wp_app_password: saved.wp_app_password || "",
        sync_options: saved.sync_options || {
          products_per_job: 25,
          stock_products_per_job: 25,
          poll_tick_budget_seconds: 45,
          autolink_page_cap: 200,
          sync_images: true,
        },
        last_sync_at: saved.last_sync_at || null,
        last_connection_status: saved.last_connection_status || "unknown",
        last_connection_message: saved.last_connection_message || null,
      };
    }
  } catch (err) {
    console.warn("Could not load WooCommerce settings from CmsPage:", err);
  }

  // Pure empty defaults for any new user or unconfigured store
  return {
    store_url: "",
    consumer_key: "",
    consumer_secret: "",
    wp_username: "",
    wp_app_password: "",
    sync_options: {
      products_per_job: 25,
      stock_products_per_job: 25,
      poll_tick_budget_seconds: 45,
      autolink_page_cap: 200,
      sync_images: true,
    },
    last_sync_at: null,
    last_connection_status: "unknown",
    last_connection_message: null,
  };
}

// 2. Save WooCommerce Settings for Tenant - Validated against Prisma CmsPage schema
export async function saveWooCommerceSettings(
  tenantId: string,
  settings: Partial<WooCommerceSettingsData>
): Promise<WooCommerceSettingsData> {
  const current = await getWooCommerceSettings(tenantId);
  const updated: WooCommerceSettingsData = {
    ...current,
    ...settings,
    store_url: (settings.store_url !== undefined ? settings.store_url : current.store_url).trim().replace(/\/+$/, ""),
    consumer_key: (settings.consumer_key !== undefined ? settings.consumer_key : current.consumer_key).trim(),
    consumer_secret: settings.consumer_secret !== undefined ? settings.consumer_secret.trim() : current.consumer_secret,
    wp_username: (settings.wp_username !== undefined ? settings.wp_username : current.wp_username).trim(),
    wp_app_password: settings.wp_app_password !== undefined ? settings.wp_app_password.trim() : current.wp_app_password,
    sync_options: {
      ...(current.sync_options || {}),
      ...(settings.sync_options || {}),
    },
  };

  const pageSlug = "tenant-" + tenantId + "-woocommerce-settings";
  await prisma.cmsPage.upsert({
    where: { slug: pageSlug },
    create: {
      slug: pageSlug,
      title: "WooCommerce Store Integration Settings",
      content: updated as any,
      published: true,
    },
    update: {
      content: updated as any,
      published: true,
    },
  });

  addWooLog("settings.save", "info", "WooCommerce settings saved for store " + (updated.store_url || "unspecified"));
  return updated;
}

export async function testWooCommerceConnection(tenantId: string, customCreds?: Partial<WooCommerceSettingsData>) {
  const settings = customCreds?.store_url ? { ...(await getWooCommerceSettings(tenantId)), ...customCreds } : await getWooCommerceSettings(tenantId);

  const cleanUrl = (settings.store_url || "").trim().replace(/\/+$/, "");
  const ck = (settings.consumer_key || "").trim();
  const cs = (settings.consumer_secret || "").trim();

  if (!cleanUrl || !cleanUrl.startsWith("http")) {
    return { ok: false, error: "Store URL must begin with http:// or https://" };
  }
  if (!ck) {
    return { ok: false, error: "Consumer key is required" };
  }
  if (!cs) {
    return { ok: false, error: "Consumer secret is required" };
  }

  addWooLog("connect.test", "info", "Probing connection for " + cleanUrl + "...");

  try {
    let endpoint = cleanUrl + "/wp-json/wc/v3/system_status";
    let res = await wooApiRequest(endpoint, "GET", ck, cs);

    if (res.statusCode !== 200) {
      endpoint = cleanUrl + "/wp-json/wc/v3/products?per_page=1";
      res = await wooApiRequest(endpoint, "GET", ck, cs);
    }

    if (res.statusCode >= 200 && res.statusCode < 300) {
      const storeName = res.data?.environment?.site_title || cleanUrl.replace(/^https?:\/\//, "");
      addWooLog("connect.test", "success", "Connected successfully to WooCommerce (" + storeName + ")");
      
      await saveWooCommerceSettings(tenantId, {
        last_connection_status: "connected",
        last_connection_message: "Connected successfully to " + storeName,
      });

      return {
        ok: true,
        status: "connected",
        store_name: storeName,
        message: "Successfully connected to WooCommerce (" + storeName + ")",
      };
    } else {
      const errMsg = res.data?.message || ("WooCommerce API returned HTTP " + res.statusCode);
      addWooLog("connect.test", "error", "Connection failed: " + errMsg);
      
      await saveWooCommerceSettings(tenantId, {
        last_connection_status: "disconnected",
        last_connection_message: errMsg,
      });

      return {
        ok: false,
        status: "disconnected",
        error: errMsg,
      };
    }
  } catch (err: any) {
    const errMsg = err.message || "Network error connecting to WooCommerce store";
    addWooLog("connect.test", "error", "Connection test exception: " + errMsg);
    
    await saveWooCommerceSettings(tenantId, {
      last_connection_status: "disconnected",
      last_connection_message: errMsg,
    });

    return {
      ok: false,
      status: "disconnected",
      error: errMsg,
    };
  }
}

export async function syncWooCommerceProducts(tenantId: string, mode: "pull" | "push" = "pull") {
  const settings = await getWooCommerceSettings(tenantId);
  const cleanUrl = settings.store_url.trim().replace(/\/+$/, "");
  const ck = settings.consumer_key.trim();
  const cs = settings.consumer_secret.trim();

  if (!cleanUrl || !ck || !cs) {
    throw new Error("WooCommerce store credentials not fully configured. Please provide Store URL, Consumer Key, and Secret.");
  }

  let warehouse = await prisma.warehouse.findFirst({ where: { tenantId, isDefault: true } });
  if (!warehouse) {
    warehouse = await prisma.warehouse.findFirst({ where: { tenantId } });
  }
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: { tenantId, name: "Main Central Warehouse", location: "Hub Terminal A", isDefault: true },
    });
  }

  if (mode === "pull") {
    addWooLog("products.pull", "info", "Pulling products from " + cleanUrl + "...");
    const endpoint = cleanUrl + "/wp-json/wc/v3/products?per_page=100&status=any";
    const res = await wooApiRequest(endpoint, "GET", ck, cs);

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error("WooCommerce product fetch failed (HTTP " + res.statusCode + "): " + (res.data?.message || "Unknown error"));
    }

    const items = Array.isArray(res.data) ? res.data : [];
    let added = 0;
    let updated = 0;

    for (const p of items) {
      const sku = p.sku?.trim() || ("WC-" + p.id);
      const price = parseFloat(p.price || p.regular_price || "0") || 0;
      const stock = parseInt(p.stock_quantity ?? "10", 10) || 0;
      const name = p.name || ("Woo Product #" + p.id);
      const image = p.images?.[0]?.src || null;

      const existing = await prisma.product.findFirst({
        where: { tenantId, sku },
      });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            name,
            salePrice: price,
            image: image || existing.image,
            shortDescription: p.short_description ? p.short_description.replace(/<[^>]*>?/gm, "") : existing.shortDescription,
          },
        });
        updated++;
      } else {
        const newProd = await prisma.product.create({
          data: {
            tenantId,
            name,
            sku,
            type: "STANDARD",
            salePrice: price,
            purchasePrice: price * 0.7,
            image,
            isActive: true,
          },
        });

        await prisma.productWarehouse.create({
          data: {
            productId: newProd.id,
            warehouseId: warehouse.id,
            quantity: stock,
          },
        });
        added++;
      }
    }

    const now = new Date().toISOString();
    await saveWooCommerceSettings(tenantId, { last_sync_at: now });
    addWooLog("products.pull", "success", "Pulled " + items.length + " products from WooCommerce (" + added + " new created, " + updated + " updated)");

    return {
      ok: true,
      mode: "pull",
      total_woo: items.length,
      added,
      updated,
      last_sync: now,
    };
  } else {
    addWooLog("products.push", "info", "Pushing ERP catalog to " + cleanUrl + "...");
    const localProducts = await prisma.product.findMany({ where: { tenantId } });

    const batchCreatePayload = {
      create: localProducts.map((p) => ({
        name: p.name,
        sku: p.sku,
        regular_price: String(p.salePrice || "0"),
        manage_stock: true,
        description: p.shortDescription || p.name,
      })),
    };

    const endpoint = cleanUrl + "/wp-json/wc/v3/products/batch";
    const res = await wooApiRequest(endpoint, "POST", ck, cs, batchCreatePayload);

    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw new Error("WooCommerce product push batch failed (HTTP " + res.statusCode + "): " + (res.data?.message || "Unknown error"));
    }

    const now = new Date().toISOString();
    await saveWooCommerceSettings(tenantId, { last_sync_at: now });
    addWooLog("products.push", "success", "Pushed " + localProducts.length + " POS products to WooCommerce batch endpoint");

    return {
      ok: true,
      mode: "push",
      total_pushed: localProducts.length,
      last_sync: now,
    };
  }
}

export async function autoLinkProductsBySku(tenantId: string) {
  const settings = await getWooCommerceSettings(tenantId);
  const cleanUrl = settings.store_url.trim().replace(/\/+$/, "");
  const ck = settings.consumer_key.trim();
  const cs = settings.consumer_secret.trim();

  if (!cleanUrl || !ck || !cs) {
    throw new Error("WooCommerce credentials missing.");
  }

  addWooLog("products.autolink", "info", "Inspecting WooCommerce catalog for matching SKUs...");
  const endpoint = cleanUrl + "/wp-json/wc/v3/products?per_page=100";
  const res = await wooApiRequest(endpoint, "GET", ck, cs);

  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error("Failed to fetch WooCommerce products for auto-link: " + (res.data?.message || ("HTTP " + res.statusCode)));
  }

  const wooProducts = Array.isArray(res.data) ? res.data : [];
  let matched = 0;
  let unmatched = 0;

  const localProducts = await prisma.product.findMany({ where: { tenantId } });

  for (const lp of localProducts) {
    const match = wooProducts.find((wp: any) => wp.sku && wp.sku.trim().toLowerCase() === lp.sku.trim().toLowerCase());
    if (match) {
      matched++;
    } else {
      unmatched++;
    }
  }

  addWooLog("products.autolink", "success", "Auto-link evaluation completed: " + matched + " matched by SKU, " + unmatched + " unlinked.");
  return {
    ok: true,
    matched,
    unmatched,
    totalLocal: localProducts.length,
    totalWoo: wooProducts.length,
  };
}

export async function syncWooCommerceStock(tenantId: string) {
  const settings = await getWooCommerceSettings(tenantId);
  const cleanUrl = settings.store_url.trim().replace(/\/+$/, "");
  const ck = settings.consumer_key.trim();
  const cs = settings.consumer_secret.trim();

  if (!cleanUrl || !ck || !cs) {
    throw new Error("WooCommerce credentials missing.");
  }

  addWooLog("stock.sync", "info", "Synchronizing warehouse stock quantities to " + cleanUrl + "...");

  const stocks = await prisma.productWarehouse.findMany({
    where: { product: { tenantId } },
    include: { product: true },
  });

  const res = await wooApiRequest(cleanUrl + "/wp-json/wc/v3/products?per_page=100", "GET", ck, cs);
  if (res.statusCode >= 200 && res.statusCode < 300 && Array.isArray(res.data)) {
    const wooProducts = res.data;
    const batchUpdates = [];

    for (const s of stocks) {
      const match = wooProducts.find((wp: any) => wp.sku === s.product.sku);
      if (match) {
        batchUpdates.push({
          id: match.id,
          manage_stock: true,
          stock_quantity: s.quantity,
        });
      }
    }

    if (batchUpdates.length > 0) {
      await wooApiRequest(cleanUrl + "/wp-json/wc/v3/products/batch", "POST", ck, cs, {
        update: batchUpdates,
      });
    }

    const now = new Date().toISOString();
    await saveWooCommerceSettings(tenantId, { last_sync_at: now });
    addWooLog("stock.sync", "success", "Pushed stock levels for " + batchUpdates.length + " products to WooCommerce");

    return {
      ok: true,
      updated_count: batchUpdates.length,
      last_sync: now,
    };
  }

  throw new Error("Could not retrieve remote WooCommerce inventory items to update stock.");
}

export async function syncWooCommerceOrders(tenantId: string) {
  const settings = await getWooCommerceSettings(tenantId);
  const cleanUrl = settings.store_url.trim().replace(/\/+$/, "");
  const ck = settings.consumer_key.trim();
  const cs = settings.consumer_secret.trim();

  if (!cleanUrl || !ck || !cs) {
    throw new Error("WooCommerce credentials missing.");
  }

  addWooLog("orders.sync", "info", "Fetching processing & completed orders from " + cleanUrl + "...");
  const endpoint = cleanUrl + "/wp-json/wc/v3/orders?status=processing,completed&per_page=50";
  const res = await wooApiRequest(endpoint, "GET", ck, cs);

  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error("WooCommerce order sync failed (HTTP " + res.statusCode + "): " + (res.data?.message || "Unknown error"));
  }

  const orders = Array.isArray(res.data) ? res.data : [];
  let importedCount = 0;

  let defaultCustomer = await prisma.customer.findFirst({ where: { tenantId } });
  if (!defaultCustomer) {
    defaultCustomer = await prisma.customer.create({
      data: {
        tenantId,
        name: "WooCommerce Online Shopper",
        email: "store@jagantraders.com",
        phone: "9876543210",
      },
    });
  }

  let warehouse = await prisma.warehouse.findFirst({ where: { tenantId, isDefault: true } });
  if (!warehouse) {
    warehouse = await prisma.warehouse.findFirst({ where: { tenantId } });
  }

  for (const o of orders) {
    const saleRef = "SO_WOO_" + (o.id || o.number);

    const existingSale = await prisma.sale.findFirst({
      where: { tenantId, invoiceNo: saleRef },
    });

    if (!existingSale) {
      const totalAmount = parseFloat(o.total || "0") || 0;

      let customerId = defaultCustomer.id;
      let customerName = defaultCustomer.name;

      if (o.billing?.email) {
        let cust = await prisma.customer.findFirst({
          where: { tenantId, email: o.billing.email },
        });
        if (!cust) {
          cust = await prisma.customer.create({
            data: {
              tenantId,
              name: ((o.billing.first_name || "") + " " + (o.billing.last_name || "")).trim() || "WooCommerce Client",
              email: o.billing.email,
              phone: o.billing.phone || null,
              address: ((o.billing.address_1 || "") + ", " + (o.billing.city || "")).trim() || null,
            },
          });
        }
        customerId = cust.id;
        customerName = cust.name;
      }

      await prisma.sale.create({
        data: {
          tenantId,
          invoiceNo: saleRef,
          customerId,
          customerName,
          warehouseId: warehouse?.id || null,
          subtotal: totalAmount,
          total: totalAmount,
          paidAmount: totalAmount,
          paymentStatus: "PAID",
          paymentMethod: o.payment_method_title || "Online Payment",
          notes: "Imported from WooCommerce order #" + o.id + ". Payment method: " + (o.payment_method_title || o.payment_method || "Online"),
        },
      });

      importedCount++;
    }
  }

  const now = new Date().toISOString();
  await saveWooCommerceSettings(tenantId, { last_sync_at: now });
  addWooLog("orders.sync", "success", "Order ingestion completed: " + importedCount + " new orders converted to Stocky sales.");

  return {
    ok: true,
    total_woo_orders: orders.length,
    imported_count: importedCount,
    last_sync: now,
  };
}
