export function money(value) {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export function number(value) {
  return new Intl.NumberFormat("es-PE").format(value || 0);
}

export function date(value) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function time(value) {
  return new Intl.DateTimeFormat("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(value ? new Date(value) : new Date());
}

export function supabaseMessage(error) {
  if (!error) return "";
  if (error.message?.includes("Invalid login credentials")) {
    return "Correo o password incorrectos.";
  }
  if (error.message?.includes("Email not confirmed")) {
    return "El correo todavia no esta confirmado.";
  }
  return error.message || "Ocurrio un error.";
}

export function daysLeft(value) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
}
