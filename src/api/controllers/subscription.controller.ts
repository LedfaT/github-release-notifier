import { NextFunction, Response, Request } from "express";
import ApiError from "../exceptions/api-error";
import {
  createSubscriptionSchema,
  emailQuerySchema,
  tokenParamsSchema,
} from "../validators/subscription.validator";
import subscriptionService from "../modules/subscriptions/subscription.service";
import { createLogger } from "../../config/logger";

const logger = createLogger("subscription-controller");

class SubscribeController {
  createSubscription = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const parsed = createSubscriptionSchema.safeParse(req.body);

      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        logger.warn(
          { path: req.path, issues: parsed.error.issues },
          "Subscription request validation failed",
        );

        return next(
          ApiError.BadRequest(firstIssue?.message || "Validation error"),
        );
      }

      logger.info(
        { email: parsed.data.email, repository: parsed.data.repository },
        "Creating subscription",
      );

      const subscription = await subscriptionService.createSubscription(
        parsed.data,
      );

      logger.info(
        {
          subscriptionId: subscription.id,
          email: subscription.email,
          repository: subscription.repository,
          status: subscription.status,
        },
        "Subscription created",
      );

      return res.status(201).json({
        message: "Subscription created successfully",
        subscription,
      });
    } catch (error) {
      next(error);
    }
  };

  confirmSubscription = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const parsed = tokenParamsSchema.safeParse(req.params);

      if (!parsed.success) {
        logger.warn({ path: req.path }, "Confirm token validation failed");
        return next(ApiError.BadRequest("Invalid confirmation token"));
      }

      logger.info({ path: req.path }, "Confirming subscription");

      await subscriptionService.confirmSubscription(parsed.data.token);

      logger.info({ path: req.path }, "Subscription confirmed");

      return res.status(200).json({
        message: "Subscription confirmed successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  unsubscribe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = tokenParamsSchema.safeParse(req.params);

      if (!parsed.success) {
        logger.warn({ path: req.path }, "Unsubscribe token validation failed");
        return next(ApiError.BadRequest("Invalid unsubscribe token"));
      }

      logger.info({ path: req.path }, "Unsubscribing");

      await subscriptionService.unsubscribe(parsed.data.token);

      logger.info({ path: req.path }, "Unsubscribed");

      return res.status(200).json({
        message: "Unsubscribed successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  getSubscriptions = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const parsed = emailQuerySchema.safeParse(req.query);

      if (!parsed.success) {
        logger.warn({ path: req.path }, "Email query validation failed");
        return next(ApiError.BadRequest("Invalid email query parameter"));
      }

      logger.info({ email: parsed.data.email }, "Fetching active subscriptions");

      const subscriptions = await subscriptionService.getActiveSubscriptions(
        parsed.data.email,
      );

      logger.info(
        { email: parsed.data.email, count: subscriptions.length },
        "Fetched active subscriptions",
      );

      return res.status(200).json({
        email: parsed.data.email,
        subscriptions,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new SubscribeController();
