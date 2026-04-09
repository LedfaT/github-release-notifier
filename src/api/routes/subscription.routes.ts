import { Router } from "express";
import subscriptionController from "../controllers/subscription.controller";
import { apiKeyMiddleware } from "../middlewares/api-key.middleware";

const subscriptionRouter = Router();

subscriptionRouter.post(
  "/subscribe",
  apiKeyMiddleware,
  subscriptionController.createSubscription,
);
subscriptionRouter.get("/confirm/:token", subscriptionController.confirmSubscription);
subscriptionRouter.get("/unsubscribe/:token", subscriptionController.unsubscribe);
subscriptionRouter.get(
  "/subscriptions",
  apiKeyMiddleware,
  subscriptionController.getSubscriptions,
);
export default subscriptionRouter;
