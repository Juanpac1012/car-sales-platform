import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { loginUser, registerUser, LoginResponse } from "@/lib/ProveedoresApi";

interface AuthContextType {
  user: LoginResponse["user"] | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LoginResponse["user"] | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Cargar datos del localStorage al iniciar
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await loginUser({ p_email: email, p_password: password });
    setToken(response.access_token);
    setUser(response.user);
    
    // Guardar en localStorage
    localStorage.setItem("auth_token", response.access_token);
    localStorage.setItem("auth_user", JSON.stringify(response.user));
  };

  const register = async (email: string, password: string) => {
    await registerUser({ p_email: email, p_password: password });
    // Después del registro, hacer login automáticamente
    await login(email, password);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // En lugar de lanzar error, retornar valores por defecto
    return {
      user: null,
      token: null,
      login: async () => {},
      register: async () => {},
      logout: () => {},
      isAuthenticated: false,
    };
  }
  return context;
}
