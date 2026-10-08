import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { documentService } from "../services/document.service.js";

export const hrDocumentsRouter = Router();

// Categories
hrDocumentsRouter.get("/categories", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const categories = await documentService.listCategories(tenantId, {
      search: req.query.search as string,
    });
    return res.json(categories);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/categories", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const cat = await documentService.createCategory(tenantId, req.body);
    return res.status(201).json(cat);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.put("/categories/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const cat = await documentService.updateCategory(tenantId, req.params.id, req.body);
    return res.json(cat);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.delete("/categories/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const result = await documentService.deleteCategory(tenantId, req.params.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Templates
hrDocumentsRouter.get("/templates", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const templates = await documentService.listTemplates(tenantId, {
      type: req.query.type as string,
      category: req.query.category as string,
      search: req.query.search as string,
    });
    return res.json(templates);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.get("/templates/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const template = await documentService.getTemplate(tenantId, req.params.id);
    return res.json(template);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/templates", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const template = await documentService.createTemplate(tenantId, req.body);
    return res.status(201).json(template);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.put("/templates/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const template = await documentService.updateTemplate(tenantId, req.params.id, req.body);
    return res.json(template);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.delete("/templates/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const result = await documentService.deleteTemplate(tenantId, req.params.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Documents Vault (Company Documents)
hrDocumentsRouter.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const docs = await documentService.listDocuments(tenantId, {
      category: req.query.category as string,
      status: req.query.status as string,
      employeeId: req.query.employeeId as string,
      search: req.query.search as string,
    });
    return res.json(docs);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const doc = await documentService.createDocument(tenantId, req.body);
    return res.status(201).json(doc);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const doc = await documentService.getDocument(tenantId, req.params.id);
    return res.json(doc);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

hrDocumentsRouter.put("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const updated = await documentService.updateDocument(tenantId, req.params.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const result = await documentService.deleteDocument(tenantId, req.params.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Contract Types
hrDocumentsRouter.get("/contract-types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const types = await documentService.listContractTypes(tenantId);
    return res.json(types);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/contract-types", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const type = await documentService.createContractType(tenantId, req.body);
    return res.status(201).json(type);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.put("/contract-types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const type = await documentService.updateContractType(tenantId, req.params.id, req.body);
    return res.json(type);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.delete("/contract-types/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const result = await documentService.deleteContractType(tenantId, req.params.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Employee Contracts
hrDocumentsRouter.get("/contracts", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const contracts = await documentService.listContracts(tenantId, {
      employeeId: req.query.employeeId as string,
      status: req.query.status as string,
      contractTypeId: req.query.contractTypeId as string,
    });
    return res.json(contracts);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/contracts", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const contract = await documentService.createContract(tenantId, req.body);
    return res.status(201).json(contract);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.get("/contracts/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const contract = await documentService.getContract(tenantId, req.params.id);
    return res.json(contract);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});

hrDocumentsRouter.put("/contracts/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const updated = await documentService.updateContract(tenantId, req.params.id, req.body);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.delete("/contracts/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const result = await documentService.deleteContract(tenantId, req.params.id);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Acknowledgements (Sign-off Campaigns)
hrDocumentsRouter.get("/acknowledgements", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const acks = await documentService.listAcknowledgements(tenantId, {
      documentId: req.query.documentId as string,
      status: req.query.status as string,
    });
    return res.json(acks);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/acknowledgements/campaign", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const campaign = await documentService.createCampaign(tenantId, req.body);
    return res.status(201).json(campaign);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// Letters Center
hrDocumentsRouter.get("/letters", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const letters = await documentService.listGeneratedLetters(tenantId, {
      employeeId: req.query.employeeId as string,
      letterType: req.query.letterType as string,
      search: req.query.search as string,
    });
    return res.json(letters);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

hrDocumentsRouter.post("/letters/generate", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const issuedById = req.user?.userId;
    const letter = await documentService.generateLetter(tenantId, {
      ...req.body,
      issuedById,
    });
    return res.status(201).json(letter);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

hrDocumentsRouter.get("/letters/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = req.user?.tenantId!;
    const letter = await documentService.getGeneratedLetter(tenantId, req.params.id);
    return res.json(letter);
  } catch (err: any) {
    return res.status(404).json({ error: err.message });
  }
});
