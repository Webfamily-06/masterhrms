"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchSlackNotification = dispatchSlackNotification;
exports.dispatchTelegramNotification = dispatchTelegramNotification;
exports.notifySaleCompleted = notifySaleCompleted;
exports.notifyLowStock = notifyLowStock;
exports.getAlertConfig = getAlertConfig;
exports.updateAlertConfig = updateAlertConfig;
exports.getAlertHistory = getAlertHistory;
let alertConfig = {
    slack: {
        enabled: false,
        webhookUrl: process.env.SLACK_WEBHOOK_URL || "",
        channelName: "#pos-sales-alerts",
        highValueThreshold: 20000,
        alertOnLowStock: true,
        alertOnRegisterClose: true,
    },
    telegram: {
        enabled: false,
        botToken: process.env.TELEGRAM_BOT_TOKEN || "",
        chatId: "",
        highValueThreshold: 20000,
        alertOnLowStock: true,
    },
};
const alertHistory = [
    {
        id: "alt-1",
        channel: "Slack",
        type: "high_value_sale",
        title: " High-Value Sale Recorded: ₹1,14,900",
        message: "Receipt POS-819201 for Apple MacBook Air M3. Cashier: Admin. Customer: Enterprise Client.",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        status: "dispatched",
    },
    {
        id: "alt-2",
        channel: "Telegram",
        type: "low_stock",
        title: " Low Stock Warning: Dell UltraSharp 27",
        message: "Warehouse stock dropped to 8 units (Threshold: 10). Reorder recommended.",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
        status: "dispatched",
    },
];
async function dispatchSlackNotification(text, blocks) {
    if (!alertConfig.slack.enabled)
        return;
    try {
        if (alertConfig.slack.webhookUrl && !alertConfig.slack.webhookUrl.includes("XXXXXX")) {
            await fetch(alertConfig.slack.webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, blocks }),
            });
        }
        alertHistory.unshift({
            id: "alt-" + Date.now() + "-" + Math.random().toString(36).substring(7),
            channel: "Slack",
            type: "high_value_sale",
            title: "Slack Notification",
            message: text,
            timestamp: new Date().toISOString(),
            status: alertConfig.slack.webhookUrl.includes("XXXXXX") ? "simulated" : "dispatched",
        });
        if (alertHistory.length > 50)
            alertHistory.pop();
    }
    catch (err) {
        console.error("Slack alert error:", err);
    }
}
async function dispatchTelegramNotification(text) {
    if (!alertConfig.telegram.enabled)
        return;
    try {
        if (alertConfig.telegram.botToken && !alertConfig.telegram.botToken.includes("...")) {
            const url = `https://api.telegram.org/bot${alertConfig.telegram.botToken}/sendMessage`;
            await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: alertConfig.telegram.chatId, text, parse_mode: "HTML" }),
            });
        }
        alertHistory.unshift({
            id: "alt-" + Date.now() + "-" + Math.random().toString(36).substring(7),
            channel: "Telegram",
            type: "high_value_sale",
            title: "Telegram Alert",
            message: text,
            timestamp: new Date().toISOString(),
            status: alertConfig.telegram.botToken.includes("...") ? "simulated" : "dispatched",
        });
        if (alertHistory.length > 50)
            alertHistory.pop();
    }
    catch (err) {
        console.error("Telegram alert error:", err);
    }
}
async function notifySaleCompleted(sale) {
    const isHighValue = sale.total >= alertConfig.slack.highValueThreshold;
    const msg = ` <b>POS SALE COMPLETED</b>: Receipt <code>#${sale.receiptNo}</code>
Total: <b>₹${sale.total.toLocaleString("en-IN")}</b> | Mode: ${sale.paymentMode || "Cash"}
Customer: ${sale.customer || "Walk-in"} | Cashier: ${sale.cashier || "Staff"}${isHighValue ? " <b>[HIGH VALUE TRANSACTION]</b>" : ""}`;
    if (isHighValue || alertConfig.slack.enabled) {
        await dispatchSlackNotification(msg);
    }
    if (isHighValue || alertConfig.telegram.enabled) {
        await dispatchTelegramNotification(msg);
    }
}
async function notifyLowStock(item) {
    const msg = ` <b>LOW STOCK ALERT</b>: Product <b>${item.name}</b> (SKU: <code>${item.sku}</code>)
Current Quantity: <b>${item.quantity}</b> (Threshold: ${item.threshold})
Please trigger an inventory replenishment purchase order.`;
    await dispatchSlackNotification(msg);
    await dispatchTelegramNotification(msg);
}
function getAlertConfig() {
    return alertConfig;
}
function updateAlertConfig(update) {
    alertConfig = {
        ...alertConfig,
        ...update,
        slack: { ...alertConfig.slack, ...(update.slack || {}) },
        telegram: { ...alertConfig.telegram, ...(update.telegram || {}) },
    };
    return alertConfig;
}
function getAlertHistory() {
    return alertHistory;
}
