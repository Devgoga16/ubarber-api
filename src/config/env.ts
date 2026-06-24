import "dotenv/config";

// Toda la app asume horarios de turno y horas de citas en hora de Perú (los números de
// WhatsApp también se asumen +51). Si el host/contenedor corre en otra zona (p.ej. UTC en
// Docker), Date.getHours()/getDay() devolverían una hora y hasta un día distinto al que
// el cliente envió, rompiendo la validación de turno del barbero. Fijamos la TZ del proceso
// para que sea consistente sin importar dónde se despliegue.
process.env.TZ = process.env.TZ ?? "America/Lima";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno requerida: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required("MONGO_URI"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  // Base de la web pública para armar links (p.ej. confirmación de citas por WhatsApp).
  publicWebUrl: process.env.PUBLIC_WEB_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:5173",
};
