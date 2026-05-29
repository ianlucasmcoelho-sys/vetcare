import express from "express";
import {
  createAnimal,
  getAnimais,
  getAnimalById,
  updateAnimal,
  deleteAnimal,
  getAnimalTimeline 
} from "../controllers/animalController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validate, animalSchema } from "../middlewares/validationMiddleware.js";

const router = express.Router();

// Todas as rotas de animais requerem autenticação
router.use(authMiddleware);

router.post("/", validate(animalSchema), createAnimal);
router.get("/", getAnimais);
router.get("/:id", getAnimalById);
router.put("/:id", updateAnimal);
router.delete("/:id", deleteAnimal);
router.get("/:id/prontuario", getAnimalTimeline); 

export default router;