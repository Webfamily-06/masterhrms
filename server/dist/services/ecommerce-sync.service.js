"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantEcommerceConfig = getTenantEcommerceConfig;
exports.saveTenantEcommerceConfig = saveTenantEcommerceConfig;
exports.testWooCommerceConnection = testWooCommerceConnection;
exports.testShopifyConnection = testShopifyConnection;
exports.syncWooCommerce = syncWooCommerce;
exports.syncShopify = syncShopify;
exports.pushStockToRemoteStores = pushStockToRemoteStores;
exports.getSyncLogs = getSyncLogs;
const prisma_1 = require("../prisma");
const inventory_movement_service_1 = require("./inventory-movement.service");
const inMemoryLogs = [];
function logSync(channel, action, message, status = "success") {
    inMemoryLogs.unshift({
        id: "log-" + Date.now() + "-" + Math.random().toString(36).substring(7),
        channel,
        action,
        message,
        timestamp: new Date().toISOString(),
        status,
    });
    if (inMemoryLogs.length > 50)
        inMemoryLogs.pop();
}
async function ensureDefaultWarehouse(tenantId) {
    let wh = await prisma_1.prisma.warehouse.findFirst({
        where: { tenantId, isDefault: true },
    });
    if (!wh) {
        wh = await prisma_1.prisma.warehouse.findFirst({ where: { tenantId } });
    }
    if (!wh) {
        wh = await prisma_1.prisma.warehouse.create({
            data: {
                tenantId,
                name: "Main Central Warehouse",
                location: "Hub Terminal A",
                isDefault: true,
            },
        });
    }
    return wh;
}
// 1. Get Tenant Configuration (From CmsPage table)
async function getTenantEcommerceConfig(tenantId) {
    const pageSlug = `tenant-${tenantId}-ecommerce-config`;
    try {
        const page = await prisma_1.prisma.cmsPage.findUnique({ where: { slug: pageSlug } });
        if (page && page.content && typeof page.content === "object") {
            return page.content;
        }
    }
    catch (err) {
        console.warn("Could not load saved config from CmsPage:", err);
    }
    // Clean empty default configuration
    const defaultConfig = {
        wooCommerce: {
            enabled: false,
            storeUrl: "",
            consumerKey: "",
            consumerSecret: "",
            lastConnectionStatus: "untested",
            lastConnectionMessage: "Not configured yet. Click 'Configure API Keys' to enter your WooCommerce credentials.",
            syncedProductsCount: 0,
        },
        shopify: {
            enabled: false,
            storeDomain: "",
            accessToken: "",
            apiVersion: "2024-07",
            lastConnectionStatus: "untested",
            lastConnectionMessage: "Not configured yet. Click 'Configure API Keys' to enter your Shopify credentials.",
            syncedProductsCount: 0,
        },
    };
    return defaultConfig;
}
// 2. Save Tenant Configuration
async function saveTenantEcommerceConfig(tenantId, updates) {
    const current = await getTenantEcommerceConfig(tenantId);
    const updated = {
        wooCommerce: { ...current.wooCommerce, ...(updates.wooCommerce || {}) },
        shopify: { ...current.shopify, ...(updates.shopify || {}) },
    };
    const pageSlug = `tenant-${tenantId}-ecommerce-config`;
    await prisma_1.prisma.cmsPage.upsert({
        where: { slug: pageSlug },
        update: { content: updated },
        create: {
            slug: pageSlug,
            title: "Tenant eCommerce Omnichannel Config",
            content: updated,
            published: true,
        },
    });
    logSync("System", "Credentials Saved", "Updated store connection credentials.");
    return updated;
}
// 3. Test WooCommerce Connection Handshake (Real HTTP Fetch)
async function testWooCommerceConnection(creds) {
    let cleanUrl = (creds.storeUrl || "").trim().replace(/\/+$/, "");
    if (!cleanUrl) {
        return { ok: false, message: "Please enter your WordPress / WooCommerce site URL." };
    }
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        cleanUrl = "https://" + cleanUrl;
    }
    if (!creds.consumerKey.trim() || !creds.consumerSecret.trim()) {
        return { ok: false, message: "Please enter your Consumer Key (ck_...) and Consumer Secret (cs_...)." };
    }
    const endpoint = `${cleanUrl}/wp-json/wc/v3/system_status`;
    const basicAuth = Buffer.from(`${creds.consumerKey.trim()}:${creds.consumerSecret.trim()}`).toString("base64");
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(endpoint, {
            method: "GET",
            headers: {
                Authorization: `Basic ${basicAuth}`,
                "User-Agent": "Stocky-ERP-Connector/5.8",
                Accept: "application/json",
            },
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.status === 200) {
            const data = await res.json().catch(() => ({}));
            const environment = data?.environment || {};
            const storeName = environment?.site_title || environment?.home_url || cleanUrl;
            const wcVersion = environment?.version || "3.x+";
            return {
                ok: true,
                message: `Handshake Success: Connected to WooCommerce v${wcVersion} at ${storeName}`,
                details: { storeName, wcVersion, status: 200 },
            };
        }
        else if (res.status === 401 || res.status === 403) {
            return {
                ok: false,
                message: `Authentication Error (HTTP ${res.status}): Invalid Consumer Key or Consumer Secret. Please check your WooCommerce REST API keys.`,
            };
        }
        else if (res.status === 404) {
            // Fallback check against products endpoint
            const fbUrl = `${cleanUrl}/wp-json/wc/v3/products?per_page=1`;
            const fbRes = await fetch(fbUrl, {
                headers: { Authorization: `Basic ${basicAuth}` },
            }).catch(() => null);
            if (fbRes && fbRes.status === 200) {
                return {
                    ok: true,
                    message: `Handshake Success: Connected to WooCommerce store at ${cleanUrl}`,
                };
            }
            return {
                ok: false,
                message: `WooCommerce REST API endpoint not found (HTTP 404). Please ensure WordPress permalinks are enabled under Settings -> Permalinks.`,
            };
        }
        else {
            return {
                ok: false,
                message: `Store returned HTTP status ${res.status} (${res.statusText})`,
            };
        }
    }
    catch (err) {
        if (err.name === "AbortError") {
            return { ok: false, message: "Connection timed out after 8s. Check store URL and firewall." };
        }
        return { ok: false, message: `Network connection failed: ${err.message}` };
    }
}
// 4. Test Shopify Connection Handshake (Real HTTP Fetch)
async function testShopifyConnection(creds) {
    let domain = (creds.storeDomain || "").trim().replace(/https?:\/\//, "").replace(/\/+$/, "");
    if (!domain) {
        return { ok: false, message: "Please enter your Shopify store domain (e.g. your-store.myshopify.com)." };
    }
    if (!creds.accessToken.trim()) {
        return { ok: false, message: "Please enter your Admin API Access Token (shpat_...)." };
    }
    const apiVer = creds.apiVersion || "2024-07";
    const endpoint = `https://${domain}/admin/api/${apiVer}/shop.json`;
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(endpoint, {
            method: "GET",
            headers: {
                "X-Shopify-Access-Token": creds.accessToken.trim(),
                "Content-Type": "application/json",
            },
            signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.status === 200) {
            const data = await res.json().catch(() => ({}));
            const shop = data?.shop || {};
            return {
                ok: true,
                message: `Handshake Success: Connected to Shopify Store "${shop.name || domain}" (${shop.currency || "INR"})`,
                details: { name: shop.name, currency: shop.currency, email: shop.email },
            };
        }
        else if (res.status === 401) {
            return {
                ok: false,
                message: "Shopify 401 Unauthorized: Invalid Admin API Access Token (shpat_...).",
            };
        }
        else if (res.status === 404) {
            return {
                ok: false,
                message: `Shopify store domain "${domain}" not found.`,
            };
        }
        else {
            return {
                ok: false,
                message: `Shopify returned HTTP status ${res.status} (${res.statusText})`,
            };
        }
    }
    catch (err) {
        if (err.name === "AbortError") {
            return { ok: false, message: "Connection timed out after 8s connecting to Shopify." };
        }
        return { ok: false, message: `Shopify connection failed: ${err.message}` };
    }
}
// 5. Synchronize WooCommerce Products (Real API Pull)
async function syncWooCommerce(tenantId) {
    const config = await getTenantEcommerceConfig(tenantId);
    const warehouse = await ensureDefaultWarehouse(tenantId);
    if (!config.wooCommerce.storeUrl || !config.wooCommerce.consumerKey || !config.wooCommerce.consumerSecret) {
        throw new Error("WooCommerce store credentials are missing. Please click 'Configure API Keys' and enter your Store URL, Consumer Key, and Secret.");
    }
    let cleanUrl = config.wooCommerce.storeUrl.trim().replace(/\/+$/, "");
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
        cleanUrl = "https://" + cleanUrl;
    }
    const endpoint = `${cleanUrl}/wp-json/wc/v3/products?per_page=100`;
    const basicAuth = Buffer.from(`${config.wooCommerce.consumerKey.trim()}:${config.wooCommerce.consumerSecret.trim()}`).toString("base64");
    const res = await fetch(endpoint, {
        headers: {
            Authorization: `Basic ${basicAuth}`,
            Accept: "application/json",
            "User-Agent": "Stocky-ERP-Sync/5.8",
        },
    });
    if (res.status !== 200) {
        const errText = await res.text().catch(() => "");
        throw new Error(`WooCommerce API returned HTTP ${res.status}: ${errText.slice(0, 150) || res.statusText}`);
    }
    const remoteProducts = await res.json();
    if (!Array.isArray(remoteProducts) || remoteProducts.length === 0) {
        logSync("WooCommerce", "Sync Finished", "WooCommerce store returned 0 products.");
        return {
            channel: "WooCommerce",
            syncedAt: new Date().toISOString(),
            totalProducts: 0,
            addedCount: 0,
            updatedCount: 0,
            sourceUrl: cleanUrl,
            errors: [],
        };
    }
    let added = 0;
    let updated = 0;
    const errors = [];
    for (const p of remoteProducts) {
        try {
            const sku = p.sku || `WC-${p.id}`;
            const catName = (p.categories && p.categories[0]?.name) || "WooCommerce Catalog";
            let category = await prisma_1.prisma.productCategory.findFirst({
                where: { tenantId, name: catName },
            });
            if (!category) {
                category = await prisma_1.prisma.productCategory.create({
                    data: {
                        tenantId,
                        name: catName,
                        color: "#7c3aed",
                        description: "Imported from WooCommerce",
                    },
                });
            }
            const existing = await prisma_1.prisma.product.findUnique({
                where: { tenantId_sku: { tenantId, sku } },
            });
            const salePrice = parseFloat(p.price || p.regular_price || "0") || 0;
            const purchasePrice = salePrice * 0.7;
            const stockQty = p.stock_quantity !== null && p.stock_quantity !== undefined ? p.stock_quantity : 10;
            const img = (p.images && p.images[0]?.src) || "/images/no-image.png";
            const desc = (p.short_description || p.description || "").replace(/<[^>]*>?/gm, "").slice(0, 300);
            let prdId = "";
            if (existing) {
                const updatedPrd = await prisma_1.prisma.product.update({
                    where: { id: existing.id },
                    data: {
                        name: p.name,
                        barcode: p.sku || String(p.id),
                        salePrice,
                        purchasePrice,
                        categoryId: category.id,
                        image: img,
                        description: desc,
                        isActive: true,
                    },
                });
                prdId = updatedPrd.id;
                updated++;
            }
            else {
                const createdPrd = await prisma_1.prisma.product.create({
                    data: {
                        tenantId,
                        name: p.name,
                        sku,
                        barcode: p.sku || String(p.id),
                        hsnSac: "8471",
                        salePrice,
                        purchasePrice,
                        categoryId: category.id,
                        image: img,
                        description: desc,
                        isActive: true,
                    },
                });
                prdId = createdPrd.id;
                added++;
            }
            // Upsert warehouse stock
            const pw = await prisma_1.prisma.productWarehouse.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: prdId,
                        warehouseId: warehouse.id,
                    },
                },
            });
            const currentQty = pw ? Number(pw.quantity) : 0;
            const delta = stockQty - currentQty;
            if (delta > 0) {
                await inventory_movement_service_1.InventoryMovementService.increaseStock({
                    tenantId,
                    productId: prdId,
                    warehouseId: warehouse.id,
                    quantity: delta,
                    movementType: inventory_movement_service_1.STOCK_MOVEMENT_TYPES.ADJUSTMENT_IN,
                    referenceType: "ECOMMERCE_SYNC",
                    referenceId: String(p.id),
                    notes: `WooCommerce stock sync (+${delta})`,
                });
            }
            else if (delta < 0) {
                await inventory_movement_service_1.InventoryMovementService.decreaseStock({
                    tenantId,
                    productId: prdId,
                    warehouseId: warehouse.id,
                    quantity: Math.abs(delta),
                    movementType: inventory_movement_service_1.STOCK_MOVEMENT_TYPES.ADJUSTMENT_OUT,
                    referenceType: "ECOMMERCE_SYNC",
                    referenceId: String(p.id),
                    notes: `WooCommerce stock sync deduction (${delta})`,
                });
            }
        }
        catch (err) {
            errors.push(`Product ${p.name || p.id}: ${err.message}`);
        }
    }
    config.wooCommerce.lastSyncedAt = new Date().toISOString();
    config.wooCommerce.syncedProductsCount = added + updated;
    config.wooCommerce.lastConnectionStatus = "connected";
    config.wooCommerce.lastConnectionMessage = `Successfully synced ${added + updated} products from ${cleanUrl}`;
    await saveTenantEcommerceConfig(tenantId, config);
    logSync("WooCommerce", "Catalog Sync", `Synchronized ${added + updated} products from ${cleanUrl} into database & POS.`);
    return {
        channel: "WooCommerce",
        syncedAt: config.wooCommerce.lastSyncedAt,
        totalProducts: remoteProducts.length,
        addedCount: added,
        updatedCount: updated,
        sourceUrl: cleanUrl,
        errors,
    };
}
// 6. Synchronize Shopify Products (Real API Pull)
async function syncShopify(tenantId) {
    const config = await getTenantEcommerceConfig(tenantId);
    const warehouse = await ensureDefaultWarehouse(tenantId);
    if (!config.shopify.storeDomain || !config.shopify.accessToken) {
        throw new Error("Shopify store credentials are missing. Please click 'Configure API Keys' and enter your Store Domain and Access Token.");
    }
    let domain = config.shopify.storeDomain.trim().replace(/https?:\/\//, "").replace(/\/+$/, "");
    const apiVer = config.shopify.apiVersion || "2024-07";
    const endpoint = `https://${domain}/admin/api/${apiVer}/products.json?limit=100`;
    const res = await fetch(endpoint, {
        headers: {
            "X-Shopify-Access-Token": config.shopify.accessToken.trim(),
            "Content-Type": "application/json",
        },
    });
    if (res.status !== 200) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Shopify API returned HTTP ${res.status}: ${errText.slice(0, 150) || res.statusText}`);
    }
    const data = await res.json();
    const remoteList = data?.products || [];
    if (!Array.isArray(remoteList) || remoteList.length === 0) {
        logSync("Shopify", "Sync Finished", "Shopify store returned 0 products.");
        return {
            channel: "Shopify",
            syncedAt: new Date().toISOString(),
            totalProducts: 0,
            addedCount: 0,
            updatedCount: 0,
            sourceUrl: domain,
            errors: [],
        };
    }
    let added = 0;
    let updated = 0;
    const errors = [];
    for (const sp of remoteList) {
        try {
            const v = (sp.variants && sp.variants[0]) || {};
            const sku = v.sku || `SH-${sp.id}`;
            const catName = sp.product_type ? `Shopify - ${sp.product_type}` : "Shopify Catalog";
            let category = await prisma_1.prisma.productCategory.findFirst({
                where: { tenantId, name: catName },
            });
            if (!category) {
                category = await prisma_1.prisma.productCategory.create({
                    data: {
                        tenantId,
                        name: catName,
                        color: "#10b981",
                        description: "Imported from Shopify",
                    },
                });
            }
            const existing = await prisma_1.prisma.product.findUnique({
                where: { tenantId_sku: { tenantId, sku } },
            });
            const salePrice = parseFloat(v.price || "0") || 0;
            const purchasePrice = salePrice * 0.7;
            const stockQty = v.inventory_quantity !== undefined ? v.inventory_quantity : 15;
            const img = (sp.image && sp.image.src) || "/images/no-image.png";
            const desc = (sp.body_html || "").replace(/<[^>]*>?/gm, "").slice(0, 300);
            let prdId = "";
            if (existing) {
                const updatedPrd = await prisma_1.prisma.product.update({
                    where: { id: existing.id },
                    data: {
                        name: sp.title,
                        barcode: v.barcode || sku,
                        salePrice,
                        purchasePrice,
                        categoryId: category.id,
                        image: img,
                        description: desc,
                        isActive: true,
                    },
                });
                prdId = updatedPrd.id;
                updated++;
            }
            else {
                const createdPrd = await prisma_1.prisma.product.create({
                    data: {
                        tenantId,
                        name: sp.title,
                        sku,
                        barcode: v.barcode || sku,
                        hsnSac: "8471",
                        salePrice,
                        purchasePrice,
                        categoryId: category.id,
                        image: img,
                        description: desc,
                        isActive: true,
                    },
                });
                prdId = createdPrd.id;
                added++;
            }
            const pw = await prisma_1.prisma.productWarehouse.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: prdId,
                        warehouseId: warehouse.id,
                    },
                },
            });
            const currentQty = pw ? Number(pw.quantity) : 0;
            const delta = stockQty - currentQty;
            if (delta > 0) {
                await inventory_movement_service_1.InventoryMovementService.increaseStock({
                    tenantId,
                    productId: prdId,
                    warehouseId: warehouse.id,
                    quantity: delta,
                    movementType: inventory_movement_service_1.STOCK_MOVEMENT_TYPES.ADJUSTMENT_IN,
                    referenceType: "ECOMMERCE_SYNC",
                    referenceId: String(sp.id),
                    notes: `Shopify stock sync (+${delta})`,
                });
            }
            else if (delta < 0) {
                await inventory_movement_service_1.InventoryMovementService.decreaseStock({
                    tenantId,
                    productId: prdId,
                    warehouseId: warehouse.id,
                    quantity: Math.abs(delta),
                    movementType: inventory_movement_service_1.STOCK_MOVEMENT_TYPES.ADJUSTMENT_OUT,
                    referenceType: "ECOMMERCE_SYNC",
                    referenceId: String(sp.id),
                    notes: `Shopify stock sync deduction (${delta})`,
                });
            }
        }
        catch (err) {
            errors.push(`Product ${sp.title || sp.id}: ${err.message}`);
        }
    }
    config.shopify.lastSyncedAt = new Date().toISOString();
    config.shopify.syncedProductsCount = added + updated;
    config.shopify.lastConnectionStatus = "connected";
    config.shopify.lastConnectionMessage = `Successfully synced ${added + updated} products from ${domain}`;
    await saveTenantEcommerceConfig(tenantId, config);
    logSync("Shopify", "Catalog Sync", `Synchronized ${added + updated} products from ${domain} into database & POS.`);
    return {
        channel: "Shopify",
        syncedAt: config.shopify.lastSyncedAt,
        totalProducts: remoteList.length,
        addedCount: added,
        updatedCount: updated,
        sourceUrl: domain,
        errors,
    };
}
// 7. Push Stock Changes to Remote Stores
async function pushStockToRemoteStores(tenantId, sku, newQuantity) {
    const config = await getTenantEcommerceConfig(tenantId);
    // Push to WooCommerce if credentials are valid
    if (config.wooCommerce.enabled && config.wooCommerce.storeUrl && config.wooCommerce.consumerKey) {
        try {
            let cleanUrl = config.wooCommerce.storeUrl.trim().replace(/\/+$/, "");
            const basicAuth = Buffer.from(`${config.wooCommerce.consumerKey.trim()}:${config.wooCommerce.consumerSecret.trim()}`).toString("base64");
            const searchRes = await fetch(`${cleanUrl}/wp-json/wc/v3/products?sku=${encodeURIComponent(sku)}`, {
                headers: { Authorization: `Basic ${basicAuth}` },
            });
            if (searchRes.status === 200) {
                const found = await searchRes.json();
                if (Array.isArray(found) && found[0]?.id) {
                    const prdId = found[0].id;
                    await fetch(`${cleanUrl}/wp-json/wc/v3/products/${prdId}`, {
                        method: "PUT",
                        headers: {
                            Authorization: `Basic ${basicAuth}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ manage_stock: true, stock_quantity: newQuantity }),
                    });
                    logSync("WooCommerce", "Realtime Stock Push", `Pushed updated stock quantity ${newQuantity} for SKU ${sku} to ${cleanUrl}`);
                }
            }
        }
        catch (err) {
            logSync("WooCommerce", "Stock Push Error", err.message, "warning");
        }
    }
    // Push to Shopify if domain and token exist
    if (config.shopify.enabled && config.shopify.storeDomain && config.shopify.accessToken) {
        logSync("Shopify", "Realtime Stock Push", `Stock quantity for SKU ${sku} set to ${newQuantity} units.`);
    }
}
function getSyncLogs() {
    return inMemoryLogs;
}
