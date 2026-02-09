import express from "express";
import { searchByRA, getGeneralStats, getSearchLogs, exportSearchLogsCSV } from "../controllers/analyticsController.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/search/:ra", searchByRA);
router.get("/stats", getGeneralStats);
// Logs de pesquisa (exige auth; se ADMIN_USER_IDS definido, exige admin)
router.get("/search-logs", requireAuth, requireAdmin, getSearchLogs);
router.get("/search-logs.csv", requireAuth, requireAdmin, exportSearchLogsCSV);

export default router;
