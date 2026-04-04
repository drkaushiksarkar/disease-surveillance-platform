type Handler = (...args: unknown[]) => unknown;

export class Router {
  private routes = new Map<string, { handler: Handler; path: string; method: string }>();

  route(path: string, method = "GET") {
    return (handler: Handler) => { this.routes.set(`${method} ${path}`, { handler, path, method }); return handler; };
  }

  dispatch(method: string, path: string, ...args: unknown[]): unknown {
    const route = this.routes.get(`${method} ${path}`);
    if (!route) return { error: "Not found", status: 404 };
    return route.handler(...args);
  }

  listRoutes(): { method: string; path: string }[] {
    return [...this.routes.values()].map(({ method, path }) => ({ method, path }));
  }
}

export const router = new Router();
router.route("/api/v1/health")(() => ({ status: "ok" }));
router.route("/api/v1/indicators")(() => ({ indicators: [], count: 0 }));
router.route("/api/v1/forecast", "POST")(() => ({ forecastId: "", status: "queued" }));
