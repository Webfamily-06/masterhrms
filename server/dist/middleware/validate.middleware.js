"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = validateBody;
const zod_1 = require("zod");
function validateBody(schema) {
    return async (req, res, next) => {
        try {
            req.body = await schema.parseAsync(req.body);
            next();
        }
        catch (err) {
            if (err instanceof zod_1.ZodError) {
                return res.status(400).json({
                    error: "VALIDATION_FAILED",
                    message: "Request payload failed schema validation",
                    details: err.errors.map((e) => ({
                        field: e.path.join("."),
                        message: e.message,
                        code: e.code,
                    })),
                });
            }
            return res.status(400).json({ error: err.message || "Invalid request payload" });
        }
    };
}
