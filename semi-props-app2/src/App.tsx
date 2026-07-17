import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { BottomNav } from "@/components/BottomNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { initializeVehiculos } from "@/lib/dataStore";
import { useEffect } from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Inventario from "./pages/Inventario";
import Ingreso from "./pages/Ingreso";
import Inspeccion from "./pages/Inspeccion";
import Retoques from "./pages/Retoques";
import Publicacion from "./pages/Publicacion";
import Venta from "./pages/Venta";
import Proveedores from "./pages/Proveedores";
import BusquedaExterna from "./pages/BusquedaExterna";
import Reportes from "./pages/Reportes";
import Clientes from "./pages/Clientes";
import Ofertas from "./pages/Ofertas";
import ReportesCRM from "./pages/ReportesCRM";
import Vendedores from "./pages/Vendedores";
import ReportesVendedores from "./pages/ReportesVendedores";
import Administracion from "./pages/Administracion";
import ShareVehicle from "./pages/ShareVehicle";
import NotFound from "./pages/NotFound";
import Cuenta from "./pages/Cuenta";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initializeVehiculos();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Ruta pública de login */}
            <Route path="/login" element={<Login />} />

            {/* Ruta pública para compartir vehículos */}
            <Route path="/share/:vehiculoId" element={<ShareVehicle />} />

            {/* Todas las demás rutas están protegidas */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <SidebarProvider>
                    <div className="flex min-h-screen w-full">
                      <AppSidebar />
                      <div className="flex-1 flex flex-col">
                        <header className="sticky top-0 z-40 bg-background border-b border-border md:hidden">
                          <div className="flex items-center h-14 px-4">
                            <SidebarTrigger />
                            <h1 className="ml-4 font-semibold">Dealer</h1>
                          </div>
                        </header>

                        <main className="flex-1 p-6 pb-20 md:pb-6">
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/inventario" element={<Inventario />} />
                            <Route path="/ingreso" element={<Ingreso />} />
                            <Route path="/inspeccion" element={<Inspeccion />} />
                            <Route path="/retoques" element={<Retoques />} />
                            <Route path="/publicacion" element={<Publicacion />} />
                            <Route path="/venta" element={<Venta />} />
                            <Route path="/proveedores" element={<Proveedores />} />
                            <Route path="/busqueda-externa" element={<BusquedaExterna />} />
                            <Route path="/reportes" element={<Reportes />} />
                            <Route path="/crm/clientes" element={<Clientes />} />
                            <Route path="/crm/ofertas" element={<Ofertas />} />
                            <Route path="/crm/reportes" element={<ReportesCRM />} />
                            <Route path="/crm/vendedores" element={<Vendedores />} />
                            <Route path="/crm/reportes-vendedores" element={<ReportesVendedores />} />
                            <Route path="/administracion" element={<Administracion />} />
                            <Route path="/cuenta" element={<Cuenta />} />
                            <Route path="*" element={<NotFound />} />
                          </Routes>
                        </main>
                      </div>
                    </div>
                    <BottomNav />
                  </SidebarProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
