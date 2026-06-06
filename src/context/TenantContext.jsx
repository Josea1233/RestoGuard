/* eslint-disable react-refresh/only-export-components */
import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { demoBusiness } from "../data/demo";
import { authEnabled, supabase } from "../services/supabase";
import { supabaseMessage } from "../utils/format";

const TenantContext = createContext(null);

export function TenantProvider({ children }) {
  const [user, setUser] = useState(null);
  const [negocio, setNegocio] = useState(authEnabled ? null : demoBusiness);
  const [membership, setMembership] = useState(
    authEnabled ? null : { rol: "ADMIN", email: "demo@restoguard.local" }
  );
  const [isSuperAdmin, setIsSuperAdmin] = useState(!authEnabled);
  const [loading, setLoading] = useState(authEnabled);
  const [error, setError] = useState("");
  const [accessBlocked, setAccessBlocked] = useState(false);

  const loadTenant = useCallback(async () => {
    if (!authEnabled || !supabase) {
      setUser({ email: "demo@restoguard.local" });
      setNegocio(demoBusiness);
      setMembership({ rol: "ADMIN", email: "demo@restoguard.local" });
      setIsSuperAdmin(true);
      setLoading(false);
      setAccessBlocked(false);
      return;
    }

    setLoading(true);
    setError("");
    setAccessBlocked(false);

    const { data: userResult, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userResult.user) {
      setUser(null);
      setNegocio(null);
      setMembership(null);
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    const currentUser = userResult.user;
    setUser(currentUser);

    const { data: superAdminResult, error: superAdminError } =
      await supabase.rpc("es_super_admin");

    if (superAdminError) {
      setError(supabaseMessage(superAdminError));
      setLoading(false);
      return;
    }

    const nextIsSuperAdmin = Boolean(superAdminResult);
    setIsSuperAdmin(nextIsSuperAdmin);

    const { data: membershipRows, error: membershipError } = await supabase
      .from("negocio_usuarios")
      .select(
        "id, rol, email, negocio:negocios(id,nombre,rubro,ciudad,estado,plan,beta_started_at,trial_ends_at,created_at)"
      )
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (membershipError) {
      setError(supabaseMessage(membershipError));
      setLoading(false);
      return;
    }

    const membershipRow = membershipRows?.[0];

    if (membershipRow?.negocio) {
      setNegocio(membershipRow.negocio);
      setMembership({
        id: membershipRow.id,
        rol: membershipRow.rol,
        email: membershipRow.email,
      });
      setLoading(false);
      return;
    }

    setNegocio(null);
    setMembership(null);

    if (!nextIsSuperAdmin) {
      setAccessBlocked(true);
      setError("Tu cuenta aun no fue asignada a un negocio.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadTenant();
    }, 0);

    if (!authEnabled || !supabase) {
      return () => window.clearTimeout(timer);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadTenant();
    });

    return () => {
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [loadTenant]);

  const value = useMemo(
    () => ({
      user,
      negocio,
      negocioId: negocio?.id,
      membership,
      isSuperAdmin,
      loading,
      error,
      accessBlocked,
      reloadTenant: loadTenant,
    }),
    [
      user,
      negocio,
      membership,
      isSuperAdmin,
      loading,
      error,
      accessBlocked,
      loadTenant,
    ]
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);

  if (!context) {
    throw new Error("useTenant debe usarse dentro de TenantProvider");
  }

  return context;
}
