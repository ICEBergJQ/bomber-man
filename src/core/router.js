export function createRouter(routes) {
  const resolveRoute = () => {
    const path = window.location.hash.slice(1) || "/";
    const routeAction = routes[path];

    if (typeof routeAction === "function") {
      routeAction();
    } else {
      console.warn(`No route found for "${path}", loading default "/"`);
      routes["/"]?.();
    }
  };

  window.addEventListener("hashchange", resolveRoute);
  window.addEventListener("load", resolveRoute);
  
  // Initial route resolution
  resolveRoute();
}