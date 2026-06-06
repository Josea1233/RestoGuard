const trialEnd = new Date();
trialEnd.setDate(trialEnd.getDate() + 30);

export const demoBusiness = {
  id: 1,
  nombre: "Demo Restaurante Bar",
  rubro: "Restaurante / Bar",
  ciudad: "Pucallpa",
  estado: "BETA",
  plan: "BETA",
  trial_ends_at: trialEnd.toISOString(),
};

export const demoTables = Array.from({ length: 28 }, (_, index) => {
  const id = index + 1;
  const zona = id <= 16 ? "Salon" : id <= 22 ? "Terraza" : id <= 25 ? "VIP" : "Barra";
  const estado =
    [1, 3, 5, 7, 10, 14, 18, 23, 26].includes(id)
      ? "OCUPADA"
      : [4, 20, 24].includes(id)
        ? "RESERVADA"
        : "LIBRE";
  const pax = estado === "LIBRE" ? 0 : id % 5 === 0 ? 2 : id % 4 === 0 ? 6 : 4;
  const total = estado === "OCUPADA" ? [146, 82, 64, 118, 96, 210, 74, 185, 58][[1, 3, 5, 7, 10, 14, 18, 23, 26].indexOf(id)] : 0;

  return {
    id,
    nombre: zona === "Barra" ? `Barra ${String(id - 25).padStart(2, "0")}` : `Mesa ${String(id).padStart(2, "0")}`,
    zona,
    estado,
    pax,
    capacidad: zona === "VIP" ? 8 : zona === "Barra" ? 2 : 4,
    total,
  };
});

export const demoOrders = [
  {
    id: "P-0132",
    mesa: "Mesa 01",
    canal: "Salon",
    responsable: "Carlos",
    estado: "EN_COCINA",
    tiempo: 18,
    total: 146,
    items: ["2 Lomo saltado", "1 Chilcano", "2 Chicha morada"],
  },
  {
    id: "P-0131",
    mesa: "Barra 01",
    canal: "Barra",
    responsable: "Rosa",
    estado: "LISTO",
    tiempo: 9,
    total: 64,
    items: ["2 Mojito", "1 Alitas BBQ"],
  },
  {
    id: "P-0130",
    mesa: "Mesa 07",
    canal: "Salon",
    responsable: "Juan",
    estado: "PENDIENTE",
    tiempo: 4,
    total: 118,
    items: ["1 Parrilla personal", "2 Cerveza", "1 Ensalada"],
  },
  {
    id: "P-0129",
    mesa: "Delivery",
    canal: "Delivery",
    responsable: "Maria",
    estado: "COBRADO",
    tiempo: 31,
    total: 72,
    items: ["2 Hamburguesa", "2 Gaseosa"],
  },
];

export const demoMenu = [
  { id: 1, nombre: "Lomo saltado", categoria: "Platos", area: "COCINA", precio: 36, costo: 14, margen: 61, popularidad: 92, modificadores: ["Sin cebolla", "Extra papas"] },
  { id: 2, nombre: "Chilcano", categoria: "Cocteles", area: "BARRA", precio: 18, costo: 5, margen: 72, popularidad: 78, modificadores: ["Pisco quebranta", "Sin jarabe"] },
  { id: 3, nombre: "Chicha morada", categoria: "Bebidas", area: "BARRA", precio: 8, costo: 2, margen: 75, popularidad: 65, modificadores: ["Sin hielo", "Jarra"] },
  { id: 4, nombre: "Mojito", categoria: "Cocteles", area: "BARRA", precio: 22, costo: 6, margen: 73, popularidad: 84, modificadores: ["Sin azucar", "Extra hierbabuena"] },
  { id: 5, nombre: "Alitas BBQ", categoria: "Piqueos", area: "COCINA", precio: 20, costo: 9, margen: 55, popularidad: 76, modificadores: ["Picante", "Salsa aparte"] },
  { id: 6, nombre: "Parrilla personal", categoria: "Platos", area: "COCINA", precio: 58, costo: 31, margen: 47, popularidad: 58, modificadores: ["Termino medio", "Extra ensalada"] },
  { id: 7, nombre: "Cerveza", categoria: "Bebidas", area: "BARRA", precio: 12, costo: 5, margen: 58, popularidad: 88, modificadores: ["Helada", "Vaso frio"] },
  { id: 8, nombre: "Hamburguesa", categoria: "Rapidos", area: "COCINA", precio: 24, costo: 10, margen: 58, popularidad: 70, modificadores: ["Sin queso", "Extra tocino"] },
];

export const demoInventory = [
  {
    id: 1,
    nombre: "Pollo fresco",
    categoria: "Carnes",
    stock: 8,
    minimo: 10,
    unidad: "kg",
    costo: 12,
    proveedor: "Mercado Mayorista",
    ubicacion: "Camara frio 1",
    usoDiario: 5,
    compraSugerida: 22,
    vencimiento: "2 dias",
    estado: "CRITICO",
  },
  {
    id: 2,
    nombre: "Cerveza lager",
    categoria: "Bebidas",
    stock: 7,
    minimo: 5,
    unidad: "cajas",
    costo: 92,
    proveedor: "Distribuidora Selva",
    ubicacion: "Almacen barra",
    usoDiario: 1.5,
    compraSugerida: 4,
    vencimiento: "OK",
    estado: "OK",
  },
  {
    id: 3,
    nombre: "Arroz",
    categoria: "Abarrotes",
    stock: 26,
    minimo: 8,
    unidad: "kg",
    costo: 4,
    proveedor: "Mercado Mayorista",
    ubicacion: "Almacen seco",
    usoDiario: 3,
    compraSugerida: 0,
    vencimiento: "OK",
    estado: "OK",
  },
  {
    id: 4,
    nombre: "Hierbabuena",
    categoria: "Barra",
    stock: 1.2,
    minimo: 1,
    unidad: "kg",
    costo: 8,
    proveedor: "Frutas Ucayali",
    ubicacion: "Barra frio",
    usoDiario: 0.6,
    compraSugerida: 1.4,
    vencimiento: "1 dia",
    estado: "RIESGO",
  },
  {
    id: 5,
    nombre: "Aceite",
    categoria: "Cocina",
    stock: 5,
    minimo: 4,
    unidad: "litros",
    costo: 9,
    proveedor: "Mercado Mayorista",
    ubicacion: "Cocina",
    usoDiario: 0.8,
    compraSugerida: 0,
    vencimiento: "OK",
    estado: "OK",
  },
  {
    id: 6,
    nombre: "Pisco quebranta",
    categoria: "Licores",
    stock: 3,
    minimo: 4,
    unidad: "botellas",
    costo: 38,
    proveedor: "Bebidas Oriente",
    ubicacion: "Barra premium",
    usoDiario: 0.7,
    compraSugerida: 3,
    vencimiento: "OK",
    estado: "RIESGO",
  },
];

export const demoPurchases = [
  { proveedor: "Mercado Mayorista", item: "Pollo, verduras", total: 286, tipo: "Boleta" },
  { proveedor: "Distribuidora Selva", item: "Cerveza lager", total: 552, tipo: "Factura" },
  { proveedor: "Frutas Ucayali", item: "Limon, maracuya", total: 94, tipo: "Boleta" },
];

export const demoWaste = [
  { item: "Pollo fresco", causa: "Vencimiento", cantidad: "1.8 kg", perdida: 22, area: "Cocina", responsable: "Chef Lina", recuperable: 0, estado: "Registrada" },
  { item: "Hierbabuena", causa: "Sobrestock", cantidad: "0.4 kg", perdida: 3, area: "Barra", responsable: "Rosa", recuperable: 2, estado: "En revision" },
  { item: "Arroz preparado", causa: "Exceso de produccion", cantidad: "2.2 kg", perdida: 9, area: "Cocina", responsable: "Carlos", recuperable: 4, estado: "Registrada" },
  { item: "Cerveza lager", causa: "Rotura", cantidad: "2 botellas", perdida: 10, area: "Barra", responsable: "Rosa", recuperable: 0, estado: "Pendiente" },
];

export const demoStaff = [
  { nombre: "Carlos", rol: "Mozo", ventas: 1240, asistencia: "22/22", sueldo: 1450, horas: 176, tardanzas: 1, propinas: 220, estado: "Activo" },
  { nombre: "Rosa", rol: "Barra", ventas: 980, asistencia: "21/22", sueldo: 1600, horas: 168, tardanzas: 0, propinas: 180, estado: "Activo" },
  { nombre: "Juan", rol: "Caja", ventas: 820, asistencia: "20/22", sueldo: 1550, horas: 160, tardanzas: 2, propinas: 90, estado: "Activo" },
  { nombre: "Lina", rol: "Chef", ventas: 0, asistencia: "22/22", sueldo: 2400, horas: 178, tardanzas: 0, propinas: 0, estado: "Activo" },
  { nombre: "Maria", rol: "Delivery", ventas: 520, asistencia: "19/22", sueldo: 1300, horas: 152, tardanzas: 3, propinas: 60, estado: "Observacion" },
];

export const demoMetrics = {
  ventasHoy: 3847,
  pedidosHoy: 74,
  ticketPromedio: 52,
  ocupacion: 63,
  caja: 12840,
  gastosMes: 52310,
  gananciaMes: 37110,
  mermaMes: 320,
};

export const demoSalesByHour = [
  { hora: "10", ventas: 180, pedidos: 4 },
  { hora: "11", ventas: 340, pedidos: 7 },
  { hora: "12", ventas: 620, pedidos: 12 },
  { hora: "13", ventas: 860, pedidos: 16 },
  { hora: "14", ventas: 710, pedidos: 14 },
  { hora: "15", ventas: 390, pedidos: 8 },
  { hora: "18", ventas: 540, pedidos: 10 },
  { hora: "19", ventas: 770, pedidos: 15 },
  { hora: "20", ventas: 920, pedidos: 18 },
  { hora: "21", ventas: 650, pedidos: 12 },
];

export const demoChannelMix = [
  { canal: "Salon", ventas: 2180, pedidos: 38, color: "teal" },
  { canal: "Barra", ventas: 910, pedidos: 22, color: "blue" },
  { canal: "Delivery", ventas: 520, pedidos: 9, color: "amber" },
  { canal: "Para llevar", ventas: 237, pedidos: 5, color: "green" },
];

export const demoKitchenStations = [
  { estacion: "Cocina caliente", area: "COCINA", pendientes: 6, promedio: 14, sla: 18, carga: 78 },
  { estacion: "Barra", area: "BARRA", pendientes: 4, promedio: 8, sla: 12, carga: 58 },
  { estacion: "Empaque", area: "EMPAQUE", pendientes: 2, promedio: 6, sla: 9, carga: 34 },
];

export const demoKitchenTickets = [
  {
    id: "K-204",
    mesa: "Mesa 01",
    canal: "Salon",
    estado: "EN_PREPARACION",
    estacion: "COCINA",
    prioridad: "ALTA",
    tiempo: 18,
    responsable: "Chef Lina",
    items: [
      { cantidad: 2, nombre: "Lomo saltado", nota: "1 sin cebolla" },
      { cantidad: 1, nombre: "Alitas BBQ", nota: "Salsa aparte" },
    ],
  },
  {
    id: "K-203",
    mesa: "Barra 01",
    canal: "Barra",
    estado: "LISTO",
    estacion: "BARRA",
    prioridad: "NORMAL",
    tiempo: 9,
    responsable: "Rosa",
    items: [
      { cantidad: 2, nombre: "Mojito", nota: "Extra hierbabuena" },
      { cantidad: 1, nombre: "Chilcano", nota: "Sin jarabe" },
    ],
  },
  {
    id: "K-202",
    mesa: "Mesa 07",
    canal: "Salon",
    estado: "NUEVA",
    estacion: "COCINA",
    prioridad: "NORMAL",
    tiempo: 4,
    responsable: "Chef Lina",
    items: [
      { cantidad: 1, nombre: "Parrilla personal", nota: "Termino medio" },
      { cantidad: 1, nombre: "Ensalada", nota: "Sin alino" },
    ],
  },
  {
    id: "K-201",
    mesa: "Delivery",
    canal: "Delivery",
    estado: "EN_PREPARACION",
    estacion: "EMPAQUE",
    prioridad: "ALTA",
    tiempo: 13,
    responsable: "Maria",
    items: [
      { cantidad: 2, nombre: "Hamburguesa", nota: "Bolsa sellada" },
      { cantidad: 2, nombre: "Gaseosa", nota: "Confirmar bebida" },
    ],
  },
];

export const demoSuppliers = [
  { nombre: "Mercado Mayorista", categoria: "Frescos", deuda: 286, ultimaCompra: "Hoy", puntualidad: 92 },
  { nombre: "Distribuidora Selva", categoria: "Bebidas", deuda: 552, ultimaCompra: "Ayer", puntualidad: 98 },
  { nombre: "Frutas Ucayali", categoria: "Frutas y hierbas", deuda: 94, ultimaCompra: "Hoy", puntualidad: 84 },
  { nombre: "Bebidas Oriente", categoria: "Licores", deuda: 0, ultimaCompra: "3 dias", puntualidad: 90 },
];

export const demoRecipeCosts = [
  { plato: "Lomo saltado", precio: 36, costo: 14, foodCost: 39, margen: 22, riesgo: "Sube costo de carne" },
  { plato: "Mojito", precio: 22, costo: 6, foodCost: 27, margen: 16, riesgo: "Hierbabuena vence pronto" },
  { plato: "Parrilla personal", precio: 58, costo: 31, foodCost: 53, margen: 27, riesgo: "Margen bajo" },
  { plato: "Hamburguesa", precio: 24, costo: 10, foodCost: 42, margen: 14, riesgo: "OK" },
];

export const demoPaymentMix = [
  { metodo: "Efectivo", monto: 1840, transacciones: 31 },
  { metodo: "Yape / Plin", monto: 1260, transacciones: 25 },
  { metodo: "POS", monto: 690, transacciones: 12 },
  { metodo: "Transferencia", monto: 57, transacciones: 1 },
];

export const demoCashMovements = [
  { concepto: "Saldo inicial", tipo: "base", monto: 9320 },
  { concepto: "Ventas efectivo", tipo: "income", monto: 1840 },
  { concepto: "Ventas digitales", tipo: "income", monto: 2007 },
  { concepto: "Compras del dia", tipo: "expense", monto: 327 },
  { concepto: "Propinas separadas", tipo: "expense", monto: 90 },
  { concepto: "Caja actual", tipo: "total", monto: 12840 },
];

export const demoCostCenters = [
  { centro: "Costo de comida", valor: 31, monto: 27720, meta: 32 },
  { centro: "Costo de bebidas", valor: 21, monto: 9380, meta: 24 },
  { centro: "Costo laboral", valor: 18, monto: 16100, meta: 20 },
  { centro: "Alquiler y servicios", valor: 13, monto: 11600, meta: 14 },
];

export const demoCashClosures = [
  { tarea: "Contar efectivo fisico", estado: "Pendiente", responsable: "Caja" },
  { tarea: "Conciliar Yape/Plin", estado: "Listo", responsable: "Supervisor" },
  { tarea: "Registrar compras del turno", estado: "Listo", responsable: "Caja" },
  { tarea: "Enviar reporte al dueno", estado: "Pendiente", responsable: "Admin" },
];

export const demoSmartActions = [
  { prioridad: "Alta", titulo: "Comprar pollo antes de cena", impacto: "Evita 6 ventas perdidas", modulo: "Inventario" },
  { prioridad: "Alta", titulo: "Abrir promo de mojito 19:00", impacto: "Usa hierbabuena y sube margen de barra", modulo: "Analisis" },
  { prioridad: "Media", titulo: "Mover un mozo a terraza", impacto: "Zona con ocupacion alta", modulo: "Operacion" },
  { prioridad: "Media", titulo: "Revisar Parrilla personal", impacto: "Food cost 53%, ajustar precio o porcion", modulo: "Carta" },
  { prioridad: "Alta", titulo: "Reducir merma de cocina caliente", impacto: "Pollo y arroz explican el 62% de la perdida", modulo: "Merma" },
  { prioridad: "Media", titulo: "Revisar tardanzas de delivery", impacto: "Afecta cobertura de horas pico", modulo: "RRHH" },
];

export const demoForecast = [
  { dia: "Lun", salon: 62, barra: 26, delivery: 9 },
  { dia: "Mar", salon: 58, barra: 31, delivery: 12 },
  { dia: "Mie", salon: 74, barra: 36, delivery: 10 },
  { dia: "Jue", salon: 81, barra: 45, delivery: 15 },
  { dia: "Vie", salon: 118, barra: 72, delivery: 22 },
  { dia: "Sab", salon: 132, barra: 88, delivery: 26 },
  { dia: "Dom", salon: 96, barra: 54, delivery: 18 },
];

export const demoMenuEngineering = [
  { plato: "Lomo saltado", cuadrante: "Estrella", margen: 61, popularidad: 92, accion: "Mantener visible" },
  { plato: "Mojito", cuadrante: "Estrella", margen: 73, popularidad: 84, accion: "Promocion nocturna" },
  { plato: "Parrilla personal", cuadrante: "Rompecabezas", margen: 47, popularidad: 58, accion: "Ajustar precio/porcion" },
  { plato: "Chicha morada", cuadrante: "Caballo", margen: 75, popularidad: 65, accion: "Vender en combo" },
];

export const demoPlans = [
  { nombre: "Beta", precio: 0, clientes: 8, foco: "Validacion y demos", incluye: "POS, cocina, inventario basico" },
  { nombre: "Restaurante", precio: 129, clientes: 14, foco: "Operaciones pequenas", incluye: "Mesas, caja, compras, reportes" },
  { nombre: "Multi local", precio: 299, clientes: 3, foco: "Cadenas y grupos", incluye: "Sucursales, roles, analisis avanzado" },
];

export const demoOnboarding = [
  { paso: "Crear negocio y beta", estado: "Listo", dueno: "Super Admin" },
  { paso: "Cargar carta y precios", estado: "En curso", dueno: "Cliente" },
  { paso: "Configurar mesas y zonas", estado: "Listo", dueno: "Operaciones" },
  { paso: "Entrenar caja/cocina", estado: "Pendiente", dueno: "Soporte" },
  { paso: "Activar plan pagado", estado: "Pendiente", dueno: "Ventas" },
];

export const demoRoleMatrix = [
  { rol: "ADMIN", permisos: "Todo el negocio, usuarios, finanzas" },
  { rol: "SUPERVISOR", permisos: "Operacion, cocina, inventario y cierres" },
  { rol: "CAJA", permisos: "Caja, cobros, anulaciones controladas" },
  { rol: "MOZO", permisos: "Mesas, pedidos y notas de servicio" },
  { rol: "COCINA", permisos: "Comandas, tiempos y estados de produccion" },
  { rol: "BARRA", permisos: "Bebidas, barra y despacho rapido" },
];

export const demoSchedule = [
  { turno: "Apertura", hora: "09:00 - 16:00", equipo: "Caja, cocina, 2 mozos", cobertura: 92 },
  { turno: "Cena", hora: "16:00 - 23:30", equipo: "Barra, chef, 3 mozos", cobertura: 86 },
  { turno: "Cierre", hora: "23:30 - 01:00", equipo: "Caja, supervisor", cobertura: 74 },
];

export const demoLaborSummary = {
  empleados: 12,
  costoMes: 16100,
  costoLaboral: 18,
  horasMes: 734,
  tardanzas: 6,
  propinas: 550,
};

export const demoWasteCauses = [
  { causa: "Vencimiento", valor: 38, monto: 122 },
  { causa: "Exceso de produccion", valor: 29, monto: 93 },
  { causa: "Rotura", valor: 18, monto: 58 },
  { causa: "Error de preparacion", valor: 15, monto: 47 },
];

export const demoWasteActions = [
  { accion: "Preparar pollo por tandas", impacto: "Reduce vencimiento en hora baja", responsable: "Cocina" },
  { accion: "Produccion minima de arroz 15:00", impacto: "Evita exceso antes de cena", responsable: "Chef" },
  { accion: "Conteo de barra al cambio de turno", impacto: "Detecta roturas y diferencias", responsable: "Barra" },
];

export const demoBenchmarkIdeas = [
  { sistema: "Toast", idea: "RRHH centralizado con horas, propinas, nomina y scheduling", aplicado: "Modulo RRHH separado" },
  { sistema: "Square", idea: "Pedidos omnicanal, KDS, inventario en tiempo real y equipo", aplicado: "Operacion + Cocina + RRHH por flujo" },
  { sistema: "Lightspeed", idea: "Recetas que descuentan stock y control dedicado de wastage", aplicado: "Inventario + Merma separados" },
  { sistema: "Oracle Simphony", idea: "Escala multi-local, APIs, reportes y labor management", aplicado: "Admin SaaS + Analisis + roles" },
];
