import { Router } from "express";
import { AdminPricingController } from "../controller/pricing.controller";

export const adminHallPricingRouter = Router({ mergeParams: true });

// Base path (mounted later):
// /api/admin/halls/:hallId/pricing

// Hall products
adminHallPricingRouter.post(
  "/products",
  AdminPricingController.createHallProduct
);

adminHallPricingRouter.get(
  "/products",
  AdminPricingController.listHallProducts
);

adminHallPricingRouter.get(
  "/products/:productId",
  AdminPricingController.getHallProduct
);

adminHallPricingRouter.patch(
  "/products/:productId",
  AdminPricingController.updateHallProduct
);

// Hall product rates
adminHallPricingRouter.post(
  "/products/:productId/rates",
  AdminPricingController.createHallProductRate
);

adminHallPricingRouter.get(
  "/products/:productId/rates",
  AdminPricingController.listHallProductRates
);

// Hall addons
adminHallPricingRouter.post("/addons", AdminPricingController.createHallAddon);

adminHallPricingRouter.get("/addons", AdminPricingController.listHallAddons);

adminHallPricingRouter.get(
  "/addons/:addonId",
  AdminPricingController.getHallAddon
);

adminHallPricingRouter.patch(
  "/addons/:addonId",
  AdminPricingController.updateHallAddon
);

// Hall blocked dates
adminHallPricingRouter.post(
  "/blocked-dates",
  AdminPricingController.createHallBlockedDate
);

adminHallPricingRouter.get(
  "/blocked-dates",
  AdminPricingController.listHallBlockedDates
);
