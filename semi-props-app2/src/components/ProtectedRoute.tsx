// src/routes/ProtectedRoute.tsx
import React, { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ensureAuth, clearAuth } from "@/lib/adminAuth";

type Props = {
  /** Si lo usás como wrapper: <ProtectedRoute><App/></ProtectedRoute> */
  children?: React.ReactNode;
  /** Ruta de login */
  loginPath?: string;
  /** Si querés limpiar tokens al fallar */
  clearOnFail?: boolean;
};

export default function ProtectedRoute({
  children,
  loginPath = "/login",
  clearOnFail = true,
}: Props) {
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "ok" | "fail">("checking");

  // ✅ evita re-ejecutar en loops (StrictMode monta 2 veces en dev)
  const ranRef = useRef(false);

  useEffect(() => {
    let alive = true;

    async function run() {
      if (ranRef.current) return;
      ranRef.current = true;

      try {
        await ensureAuth();
        if (!alive) return;
        setStatus("ok");
      } catch (e) {
        console.error("ProtectedRoute: auth failed", e);
        if (clearOnFail) {
          try {
            clearAuth();
          } catch {}
        }
        if (!alive) return;
        setStatus("fail");
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [clearOnFail]);

  if (status === "checking") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Validando sesión...</div>
      </div>
    );
  }

  if (status === "fail") {
    return (
      <Navigate
        to={loginPath}
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  // ✅ ok
  return children ? <>{children}</> : <Outlet />;
}
