import Cookies from "js-cookie";

/** Borra la sesión local (la cookie es la fuente de verdad del middleware). */
export function limpiarSesion() {
  Cookies.remove("auth_token");
  localStorage.removeItem("auth_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user_data");
  localStorage.removeItem("user");
  localStorage.removeItem("onboarding_completed");
}
