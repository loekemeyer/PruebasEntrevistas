import Link from "next/link";

export default function YaEnviada({
  token,
  titulo,
  invalido = false,
}: {
  token: string;
  titulo: string;
  invalido?: boolean;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <p className="text-white/60">
        {invalido
          ? "Este enlace no es válido. Contactá a RRHH."
          : "Esta prueba ya fue enviada y no se puede rehacer."}
      </p>
      {!invalido && (
        <Link href={`/prueba/${token}`} className="btn-primary">
          Volver a mis pruebas
        </Link>
      )}
    </main>
  );
}
