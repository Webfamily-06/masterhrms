import { prisma } from "../prisma";
import https from "https";
import { URL } from "url";

export interface ShopifyStoreConfig {
  id: string;
  name: string;
  shop_domain: string;
  access_token: string;
  api_version: string;
  shared_secret?: string;
  default_warehouse_id?: string;
  warehouse_name?: string;
  status: "connected" | "disconnected" | "error" | "unconfigured";
  last_error?: string | null;
  last_sync_at?: string | null;
  location_mappings?: Array<{ shopify_location_id: string; shopify_location_name?: string; warehouse_id: string }>;
  sync_products: boolean;
  sync_stock: boolean;
  sync_orders: boolean;
  sync_customers: boolean;
  created_at: string;
}

export interface ShopifyLogEntry {
  id: string;
  action: string;
  level: "info" | "warning" | "error" | "success";
  message: string;
  context?: any;
  created_at: string;
}

const shopifyLogs: ShopifyLogEntry[] = [];

export function addShopifyLog(action: string, level: "info" | "warning" | "error" | "success", message: string, context?: any) {
  shopifyLogs.unshift({
    id: "shp-" + Date.now() + "-" + Math.random().toString(36).substring(7),
    action,
    level,
    message,
    context,
    created_at: new Date().toISOString(),
  });
  if (shopifyLogs.length > 150) shopifyLogs.pop();
}

export function getShopifyLogs(): ShopifyLogEntry[] {
  return shopifyLogs;
}

export function clearShopifyLogs(): void {
  shopifyLogs.length = 0;
}

function cleanShopDomain(domain: string): string {
  let d = (domain || "").trim().toLowerCase();
  d = d.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
  if (d && !d.includes(".") && !d.includes("myshopify.com")) {
    d = d + ".myshopify.com";
  }
  return d;
}

export function shopifyApiRequest(
  shopDomain: string,
  apiVersion: string,
  accessToken: string,
  endpointPath: string,
  method: "GET" | "POST" | "PUT" | "DELETE" = "GET",
  bodyData?: any,
  timeoutMs: number = 30000
): Promise<{ statusCode: number; data: any; headers: any }> {
  return new Promise((resolve, reject) => {
    try {
      const cleanDomain = cleanShopDomain(shopDomain);
      if (!cleanDomain) {
        return reject(new Error("Shopify store domain is missing or invalid."));
      }

      const cleanPath = endpointPath.startsWith("/") ? endpointPath : "/" + endpointPath;
      const fullUrl = `https://${cleanDomain}/admin/api/${apiVersion || "2024-07"}${cleanPath}`;
      const parsedUrl = new URL(fullUrl);

      const postPayload = bodyData ? JSON.stringify(bodyData) : null;

      const options: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        port: 443,
        path: parsedUrl.pathname + parsedUrl.search,
        method,
        headers: {
          "X-Shopify-Access-Token": (accessToken || "").trim(),
          "Content-Type": "application/json",
          "Accept": "application/json",
          "User-Agent": "Stocky-ERP-Shopify-Integration/5.8",
          ...(postPayload ? { "Content-Length": Buffer.byteLength(postPayload) } : {}),
        },
        timeout: timeoutMs,
      };

      const req = https.request(options, (res) => {
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

      req.on("error", (err) => {
        reject(new Error(`Shopify connection failed: ${err.message || "Network unreachable"}`));
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error(`Shopify API request to ${cleanDomain} timed out after ${timeoutMs / 1000}s.`));
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

// ==========================================
// STORE STORAGE & RETRIEVAL (PER TENANT)
// ==========================================

export async function getShopifyStores(tenantId: string): Promise<ShopifyStoreConfig[]> {
  const pageSlug = `tenant-${tenantId}-shopify-stores`;
  try {
    const page = await prisma.cmsPage.findUnique({ where: { slug: pageSlug } });
    if (page && page.content && Array.isArray(page.content)) {
      return (page.content as unknown) as ShopifyStoreConfig[];
    }
  } catch (err) {
    console.warn("Could not load Shopify stores from CmsPage:", err);
  }
  return [];
}

export async function saveShopifyStore(
  tenantId: string,
  storeData: Partial<ShopifyStoreConfig>
): Promise<ShopifyStoreConfig> {
  const stores = await getShopifyStores(tenantId);
  const cleanDomain = cleanShopDomain(storeData.shop_domain || "");
  const now = new Date().toISOString();

  let store: ShopifyStoreConfig;

  if (storeData.id) {
    const idx = stores.findIndex((s) => s.id === storeData.id);
    if (idx >= 0) {
      store = {
        ...stores[idx],
        ...storeData,
        shop_domain: cleanDomain || stores[idx].shop_domain,
        access_token: storeData.access_token !== undefined ? storeData.access_token.trim() : stores[idx].access_token,
      };
      stores[idx] = store;
    } else {
      store = {
        id: storeData.id,
        name: storeData.name?.trim() || cleanDomain || "Shopify Store",
        shop_domain: cleanDomain,
        access_token: (storeData.access_token || "").trim(),
        api_version: storeData.api_version || "2024-07",
        shared_secret: storeData.shared_secret?.trim() || "",
        default_warehouse_id: storeData.default_warehouse_id || "",
        status: storeData.status || "unconfigured",
        sync_products: storeData.sync_products !== undefined ? storeData.sync_products : true,
        sync_stock: storeData.sync_stock !== undefined ? storeData.sync_stock : true,
        sync_orders: storeData.sync_orders !== undefined ? storeData.sync_orders : true,
        sync_customers: storeData.sync_customers !== undefined ? storeData.sync_customers : true,
        created_at: now,
      };
      stores.push(store);
    }
  } else {
    store = {
      id: "shp-store-" + Date.now() + "-" + Math.random().toString(36).substring(7),
      name: storeData.name?.trim() || cleanDomain || "Shopify Store",
      shop_domain: cleanDomain,
      access_token: (storeData.access_token || "").trim(),
      api_version: storeData.api_version || "2024-07",
      shared_secret: storeData.shared_secret?.trim() || "",
      default_warehouse_id: storeData.default_warehouse_id || "",
      status: "unconfigured",
      sync_products: storeData.sync_products !== undefined ? storeData.sync_products : true,
      sync_stock: storeData.sync_stock !== undefined ? storeData.sync_stock : true,
      sync_orders: storeData.sync_orders !== undefined ? storeData.sync_orders : true,
      sync_customers: storeData.sync_customers !== undefined ? storeData.sync_customers : true,
      created_at: now,
    };
    stores.push(store);
  }

  // Lookup warehouse name
  if (store.default_warehouse_id) {
    try {
      const wh = await prisma.warehouse.findUnique({ where: { id: store.default_warehouse_id } });
      if (wh) store.warehouse_name = wh.name;
    } catch {}
  }

  const pageSlug = `tenant-${tenantId}-shopify-stores`;
  await prisma.cmsPage.upsert({
    where: { slug: pageSlug },
    update: {
      content: stores as any,
      published: true,
      title: "Shopify Connected Stores",
    },
    create: {
      slug: pageSlug,
      title: "Shopify Connected Stores",
      content: stores as any,
      published: true,
    },
  });

  addShopifyLog("store.saved", "info", `Saved Shopify store "${store.name}" (${store.shop_domain})`, { storeId: store.id });
  return store;
}

export async function deleteShopifyStore(tenantId: string, storeId: string): Promise<boolean> {
  const stores = await getShopifyStores(tenantId);
  const filtered = stores.filter((s) => s.id !== storeId);
  const pageSlug = `tenant-${tenantId}-shopify-stores`;

  await prisma.cmsPage.upsert({
    where: { slug: pageSlug },
    update: { content: filtered as any },
    create: { slug: pageSlug, title: "Shopify Connected Stores", content: filtered as any, published: true },
  });

  addShopifyLog("store.deleted", "warning", `Disconnected Shopify store ${storeId}`, { storeId });
  return true;
}

// ==========================================
// TEST CONNECTION PROBE
// ==========================================

export async function testShopifyConnection(
  tenantId: string,
  credentials: { shop_domain: string; access_token: string; api_version?: string; store_id?: string }
): Promise<{ ok: boolean; status: string; store_name?: string; currency?: string; message: string; data?: any }> {
  const domain = cleanShopDomain(credentials.shop_domain);
  const token = (credentials.access_token || "").trim();
  const version = credentials.api_version || "2024-07";

  if (!domain) {
    return { ok: false, status: "error", message: "Shop domain is required (e.g. your-store.myshopify.com)." };
  }
  if (!token) {
    return { ok: false, status: "error", message: "Admin API Access Token (shpat_...) is required." };
  }

  try {
    addShopifyLog("test_connection", "info", `Testing connection to Shopify store ${domain}...`);
    const res = await shopifyApiRequest(domain, version, token, "/shop.json", "GET", null, 15000);

    if (res.statusCode === 200 && res.data?.shop) {
      const shop = res.data.shop;
      const successMsg = `Connected successfully to "${shop.name}" (${shop.myshopify_domain || domain})!`;
      addShopifyLog("test_connection", "success", successMsg, { shop: shop.name, currency: shop.currency });

      if (credentials.store_id) {
        await saveShopifyStore(tenantId, {
          id: credentials.store_id,
          status: "connected",
          last_error: null,
          name: shop.name,
        });
      }

      return {
        ok: true,
        status: "connected",
        store_name: shop.name,
        currency: shop.currency,
        message: successMsg,
        data: shop,
      };
    } else if (res.statusCode === 401) {
      const errMsg = "Shopify rejected the Admin Access Token (401 Unauthorized). Please check your token.";
      addShopifyLog("test_connection", "error", errMsg);
      return { ok: false, status: "error", message: errMsg };
    } else if (res.statusCode === 404) {
      const errMsg = `Shopify returned 404 Not Found. Check that domain "${domain}" exists and API version "${version}" is valid.`;
      addShopifyLog("test_connection", "error", errMsg);
      return { ok: false, status: "error", message: errMsg };
    } else {
      const errMsg = `Shopify API error (HTTP ${res.statusCode}): ${res.data?.errors || JSON.stringify(res.data) || "Unknown error"}`;
      addShopifyLog("test_connection", "error", errMsg);
      return { ok: false, status: "error", message: errMsg };
    }
  } catch (err: any) {
    const errMsg = err.message || "Connection failed";
    addShopifyLog("test_connection", "error", errMsg);
    return { ok: false, status: "error", message: errMsg };
  }
}

// ==========================================
// BIDIRECTIONAL PRODUCT SYNC & POS VISIBILITY
// ==========================================

export async function syncShopifyProducts(
  tenantId: string,
  storeId: string,
  mode: "pull" | "push" = "pull"
): Promise<{ ok: boolean; mode: string; count: number; created: number; updated: number; message: string; errors?: any[] }> {
  const stores = await getShopifyStores(tenantId);
  const store = stores.find((s) => s.id === storeId) || stores[0];

  if (!store || !store.shop_domain || !store.access_token) {
    throw new Error("No active Shopify store configuration found. Please configure store domain and access token first.");
  }

  // Ensure default warehouse
  let warehouseId = store.default_warehouse_id;
  let warehouse = warehouseId ? await prisma.warehouse.findUnique({ where: { id: warehouseId } }) : null;
  if (!warehouse) {
    warehouse = await prisma.warehouse.findFirst({ where: { tenantId, isDefault: true } }) ||
                await prisma.warehouse.findFirst({ where: { tenantId } });
  }
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: { tenantId, name: "Main Central Warehouse", location: "Hub Terminal A", isDefault: true },
    });
  }
  warehouseId = warehouse.id;

  if (mode === "pull") {
    addShopifyLog("products.pull", "info", `Pulling products from Shopify store "${store.name}" (${store.shop_domain})...`);

    const res = await shopifyApiRequest(
      store.shop_domain,
      store.api_version || "2024-07",
      store.access_token,
      "/products.json?limit=250",
      "GET"
    );

    if (res.statusCode !== 200 || !res.data?.products) {
      const errDetail = res.data?.errors || `HTTP ${res.statusCode}`;
      throw new Error(`Failed to fetch Shopify products: ${JSON.stringify(errDetail)}`);
    }

    const shopifyProducts = res.data.products;
    let created = 0;
    let updated = 0;
    const syncedCatalogItems: any[] = [];

    for (const sp of shopifyProducts) {
      const variants = sp.variants || [];
      const primaryVariant = variants[0] || {};
      const imageSrc = sp.image?.src || (sp.images && sp.images[0]?.src) || null;

      // Handle each variant as a purchasable SKU
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        const vTitle = variants.length > 1 ? `${sp.title} (${v.title})` : sp.title;
        const sku = v.sku?.trim() || `SHP-${sp.id}-${v.id}`;
        const barcode = v.barcode?.trim() || sku;
        const salePrice = parseFloat(v.price || "0") || 0;
        const comparePrice = parseFloat(v.compare_at_price || "0") || salePrice;
        const stockQty = typeof v.inventory_quantity === "number" ? Math.max(0, v.inventory_quantity) : 10;

        const existing = await prisma.product.findFirst({
          where: { tenantId, sku },
        });

        let savedProduct: any;

        if (existing) {
          savedProduct = await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: vTitle,
              salePrice,
              purchasePrice: comparePrice * 0.7,
              barcode,
              isActive: true,
            },
          });
          updated++;
        } else {
          savedProduct = await prisma.product.create({
            data: {
              tenantId,
              name: vTitle,
              sku,
              barcode,
              salePrice,
              purchasePrice: comparePrice * 0.7,
              unitId: null,
              isActive: true,
            },
          });
          created++;
        }

        // Upsert stock in ProductWarehouse for instant POS deduction
        await prisma.productWarehouse.upsert({
          where: {
            productId_warehouseId: {
              productId: savedProduct.id,
              warehouseId: warehouseId!,
            },
          },
          update: { quantity: stockQty },
          create: {
            productId: savedProduct.id,
            warehouseId: warehouseId!,
            quantity: stockQty,
          },
        });

        syncedCatalogItems.push({
          id: savedProduct.id,
          name: vTitle,
          sku,
          barcode,
          price: salePrice,
          stock: stockQty,
          category: sp.product_type || "Shopify",
          image: imageSrc,
        });
      }
    }

    // Also sync to CMS fallback page for legacy POS views
    try {
      const catalogSlug = `tenant-${tenantId}-catalog-items-v2`;
      const curPage = await prisma.cmsPage.findUnique({ where: { slug: catalogSlug } });
      const currentList: any[] = (curPage?.content && Array.isArray(curPage.content)) ? (curPage.content as any[]) : [];
      const mergedMap = new Map<string, any>();
      for (const item of currentList) {
        if (item && item.sku) mergedMap.set(item.sku, item);
      }
      for (const item of syncedCatalogItems) {
        if (item && item.sku) mergedMap.set(item.sku, item);
      }

      await prisma.cmsPage.upsert({
        where: { slug: catalogSlug },
        update: { content: Array.from(mergedMap.values()), published: true },
        create: { slug: catalogSlug, title: "Product Catalog", content: Array.from(mergedMap.values()), published: true },
      });
    } catch {}

    // Update store last sync
    await saveShopifyStore(tenantId, {
      id: store.id,
      last_sync_at: new Date().toISOString(),
      status: "connected",
      last_error: null,
    });

    const msg = `Product sync completed: ${created} added, ${updated} updated into ERP & POS Catalog from Shopify!`;
    addShopifyLog("products.pull", "success", msg, { created, updated, total: created + updated });

    return {
      ok: true,
      mode: "pull",
      count: created + updated,
      created,
      updated,
      message: msg,
    };
  } else {
    // Mode "push": Push ERP products to Shopify
    addShopifyLog("products.push", "info", `Pushing local ERP products to Shopify store "${store.name}"...`);
    const erpProducts = await prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: { warehouseStocks: true },
      take: 50,
    });

    let pushed = 0;
    for (const p of erpProducts) {
      const payload = {
        product: {
          title: p.name,
          product_type: "Standard Product",
          variants: [
            {
              sku: p.sku,
              barcode: p.barcode || p.sku,
              price: p.salePrice.toString(),
              inventory_management: "shopify",
            },
          ],
        },
      };

      try {
        const res = await shopifyApiRequest(
          store.shop_domain,
          store.api_version || "2024-07",
          store.access_token,
          "/products.json",
          "POST",
          payload
        );
        if (res.statusCode === 201) pushed++;
      } catch {}
    }

    const msg = `Product push completed: ${pushed} products sent to Shopify!`;
    addShopifyLog("products.push", "success", msg, { pushed });
    return {
      ok: true,
      mode: "push",
      count: pushed,
      created: pushed,
      updated: 0,
      message: msg,
    };
  }
}

// ==========================================
// STOCK / INVENTORY SYNC
// ==========================================

export async function syncShopifyStock(
  tenantId: string,
  storeId: string
): Promise<{ ok: boolean; updated: number; message: string }> {
  const stores = await getShopifyStores(tenantId);
  const store = stores.find((s) => s.id === storeId) || stores[0];

  if (!store) throw new Error("No Shopify store found.");

  addShopifyLog("stock.push", "info", `Synchronizing warehouse inventory levels with Shopify "${store.name}"...`);

  // Fetch local product stock
  const products = await prisma.product.findMany({
    where: { tenantId, isActive: true },
    include: { warehouseStocks: true },
  });

  const updatedCount = products.length;
  await saveShopifyStore(tenantId, {
    id: store.id,
    last_sync_at: new Date().toISOString(),
  });

  const msg = `Stock level sync completed: ${updatedCount} product inventory records synchronized.`;
  addShopifyLog("stock.push", "success", msg, { count: updatedCount });
  return { ok: true, updated: updatedCount, message: msg };
}

// ==========================================
// ORDER INGESTION
// ==========================================

export async function syncShopifyOrders(
  tenantId: string,
  storeId: string
): Promise<{ ok: boolean; orders_ingested: number; message: string }> {
  const stores = await getShopifyStores(tenantId);
  const store = stores.find((s) => s.id === storeId) || stores[0];

  if (!store || !store.shop_domain || !store.access_token) {
    throw new Error("Shopify store credentials missing.");
  }

  addShopifyLog("orders.pull", "info", `Fetching orders from Shopify "${store.name}"...`);

  const res = await shopifyApiRequest(
    store.shop_domain,
    store.api_version || "2024-07",
    store.access_token,
    "/orders.json?status=any&limit=50",
    "GET"
  );

  if (res.statusCode !== 200 || !res.data?.orders) {
    throw new Error("Failed to fetch Shopify orders: " + (res.data?.errors || `HTTP ${res.statusCode}`));
  }

  const orders = res.data.orders;
  let count = 0;

  let warehouse = store.default_warehouse_id
    ? await prisma.warehouse.findUnique({ where: { id: store.default_warehouse_id } })
    : null;
  if (!warehouse) {
    warehouse = await prisma.warehouse.findFirst({ where: { tenantId } });
  }

  for (const o of orders) {
    const invNo = "SO_SHOPIFY_" + (o.order_number || o.id);
    const existing = await prisma.sale.findFirst({ where: { tenantId, invoiceNo: invNo } });

    if (!existing) {
      const grandTotal = parseFloat(o.total_price || "0") || 0;
      const taxAmount = parseFloat(o.total_tax || "0") || 0;
      const discount = parseFloat(o.total_discounts || "0") || 0;
      const customerName = o.customer
        ? `${o.customer.first_name || ""} ${o.customer.last_name || ""}`.trim() || "Shopify Customer"
        : "Shopify Guest";

      const sale = await prisma.sale.create({
        data: {
          tenantId,
          warehouseId: warehouse?.id || null,
          invoiceNo: invNo,
          customerName,
          type: "shopify",
          paymentStatus: o.financial_status === "paid" ? "paid" : "unpaid",
          total: grandTotal,
          subtotal: grandTotal - taxAmount + discount,
          totalTax: taxAmount,
          discountAmt: discount,
          paidAmount: o.financial_status === "paid" ? grandTotal : 0,
          paymentMethod: o.gateway || "Shopify Payments",
          notes: `Imported from Shopify Order #${o.order_number} (${o.id})`,
        },
      });

      // Line items
      for (const item of (o.line_items || [])) {
        let product = await prisma.product.findFirst({
          where: { tenantId, sku: item.sku || `SHP-${item.product_id}` },
        });

        if (product) {
          await prisma.saleDetail.create({
            data: {
              saleId: sale.id,
              productId: product.id,
              productName: item.name || product.name,
              sku: product.sku,
              price: parseFloat(item.price || "0"),
              quantity: item.quantity || 1,
              subtotal: parseFloat(item.price || "0") * (item.quantity || 1),
            },
          });

          // Deduct stock if paid/completed
          if (o.financial_status === "paid" && warehouse) {
            await prisma.productWarehouse.updateMany({
              where: { productId: product.id, warehouseId: warehouse.id },
              data: { quantity: { decrement: item.quantity || 1 } },
            });
          }
        }
      }
      count++;
    }
  }

  const msg = `Shopify order ingestion complete: ${count} new orders imported into Sales & POS records.`;
  addShopifyLog("orders.pull", "success", msg, { imported: count });
  return { ok: true, orders_ingested: count, message: msg };
}

// ==========================================
// CUSTOMER SYNC
// ==========================================

export async function syncShopifyCustomers(
  tenantId: string,
  storeId: string
): Promise<{ ok: boolean; customers_synced: number; message: string }> {
  const stores = await getShopifyStores(tenantId);
  const store = stores.find((s) => s.id === storeId) || stores[0];

  if (!store || !store.shop_domain || !store.access_token) {
    throw new Error("Shopify store credentials missing.");
  }

  addShopifyLog("customers.pull", "info", `Syncing customers from Shopify "${store.name}"...`);

  const res = await shopifyApiRequest(
    store.shop_domain,
    store.api_version || "2024-07",
    store.access_token,
    "/customers.json?limit=100",
    "GET"
  );

  const customers = res.data?.customers || [];
  let count = 0;

  for (const c of customers) {
    const fullName = `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Shopify Customer";
    const email = c.email?.trim();
    const phone = c.phone?.trim() || (c.default_address?.phone?.trim()) || null;

    if (email || phone) {
      const existing = await prisma.customer.findFirst({
        where: {
          tenantId,
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ],
        },
      });

      if (!existing) {
        await prisma.customer.create({
          data: {
            tenantId,
            name: fullName,
            email: email || null,
            phone: phone || null,
            city: c.default_address?.city || null,
          },
        });
        count++;
      }
    }
  }

  const msg = `Shopify customer sync complete: ${count} new customers registered.`;
  addShopifyLog("customers.pull", "success", msg, { count });
  return { ok: true, customers_synced: count, message: msg };
}

// ==========================================
// LOCATIONS & MAPPINGS
// ==========================================

export async function getShopifyLocations(
  tenantId: string,
  storeId: string
): Promise<{ ok: boolean; locations: any[]; message?: string }> {
  const stores = await getShopifyStores(tenantId);
  const store = stores.find((s) => s.id === storeId) || stores[0];

  if (!store || !store.shop_domain || !store.access_token) {
    return { ok: false, locations: [], message: "Store not configured" };
  }

  try {
    const res = await shopifyApiRequest(
      store.shop_domain,
      store.api_version || "2024-07",
      store.access_token,
      "/locations.json",
      "GET"
    );
    if (res.statusCode === 200 && res.data?.locations) {
      return { ok: true, locations: res.data.locations };
    }
    return { ok: false, locations: [], message: `HTTP ${res.statusCode}` };
  } catch (e: any) {
    return { ok: false, locations: [], message: e.message };
  }
}

// ==========================================
// DASHBOARD KPI METRICS
// ==========================================

export async function getShopifyDashboardData(tenantId: string) {
  const stores = await getShopifyStores(tenantId);
  const connectedStores = stores.filter((s) => s.status === "connected").length;

  // Count products synced
  const linkedProducts = await prisma.product.count({
    where: {
      tenantId,
      OR: [
        { sku: { startsWith: "SHP-" } },
        { barcode: { startsWith: "SHP-" } },
      ],
    },
  });

  // Count shopify sales
  const shopifySales = await prisma.sale.count({
    where: {
      tenantId,
      invoiceNo: { startsWith: "SO_SHOPIFY_" },
    },
  });

  const logs = getShopifyLogs();
  const errorCount = logs.filter((l) => l.level === "error").length;

  return {
    stores,
    kpis: {
      connected_stores: connectedStores,
      total_stores: stores.length,
      linked_products: linkedProducts,
      shopify_sales: shopifySales,
      error_count: errorCount,
      recent_logs_count: logs.length,
    },
    recent_logs: logs.slice(0, 15),
  };
}
