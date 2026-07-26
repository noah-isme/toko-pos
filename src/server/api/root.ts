import { router } from "@/server/api/trpc";
import { outletsRouter } from "@/server/api/routers/outlets";
import { productsRouter } from "@/server/api/routers/products";
import { salesRouter } from "@/server/api/routers/sales";
import { settingsRouter } from "@/server/api/routers/settings";
import { cashSessionsRouter } from "@/server/api/routers/cash-sessions";
import { inventoryRouter } from "@/server/api/routers/inventory";
import { analyticsRouter } from "@/server/api/routers/analytics";
import { promotionsRouter } from "@/server/api/routers/promotions";
import { tasksRouter } from "@/server/api/routers/tasks";
import { usersRouter } from "@/server/api/routers/users";
import { paymentsRouter } from "@/server/api/routers/payments";
import { customersRouter } from "@/server/api/routers/customers";
import { approvalsRouter } from "@/server/api/routers/customers";

export const appRouter = router({
  sales: salesRouter,
  products: productsRouter,
  outlets: outletsRouter,
  settings: settingsRouter,
  cashSessions: cashSessionsRouter,
  inventory: inventoryRouter,
  analytics: analyticsRouter,
  promotions: promotionsRouter,
  tasks: tasksRouter,
  users: usersRouter,
  payments: paymentsRouter,
  customers: customersRouter,
  approvals: approvalsRouter,
});

export type AppRouter = typeof appRouter;
