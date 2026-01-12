"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  FilePlus, 
  LogOut, 
  UserCircle,
  Users,         
  Tags,          
  BarChart3,     
  Settings,      
  HelpCircle,
  Menu, // Icono de Hamburguesa
  X,     // Icono de Cerrar
  Wrench // Nuevo icono para servicio técnico
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Estado para controlar si el menú móvil está abierto
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const [usuario, setUsuario] = useState({
    nombre: "Usuario",
    email: "Cargando...",
    rol: "",
    departamento: "" // Agregamos departamento para la lógica
  });

  useEffect(() => {
    const datosGuardados = localStorage.getItem("user_data");
    if (datosGuardados) {
      try {
        setUsuario(JSON.parse(datosGuardados));
      } catch (e) { console.error(e); }
    }
  }, []);

  // Cerrar el menú móvil automáticamente cuando cambiamos de página
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_data");
    router.push("/login");
  };

  // Helper para clases de link activo
  const linkClass = (path: string) => 
    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${
      pathname === path || pathname.startsWith(path + "/")
        ? "bg-blue-50 text-blue-600" 
        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
    }`;

  // --- LÓGICA DE ROLES ---
  // Determinamos si es ingeniero basándonos en su rol o departamento
  const esIngeniero = usuario.rol === 'ingeniero' || 
                      (usuario.departamento && (
                        usuario.departamento.toLowerCase().includes('técnico') || 
                        usuario.departamento.toLowerCase().includes('servicio')
                      ));

  return (
    <>
      {/* 1. BOTÓN DE MENÚ MÓVIL (Solo visible en pantallas pequeñas) */}
      <button 
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-600 hover:bg-gray-50"
      >
        <Menu size={24} />
      </button>

      {/* 2. OVERLAY OSCURO (Fondo negro semitransparente en móvil) */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* 3. EL SIDEBAR */}
      <aside 
        className={`
          fixed top-0 left-0 h-screen w-64 bg-white border-r border-gray-200 flex flex-col shadow-xl z-50 transition-transform duration-300 ease-in-out
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} 
          lg:translate-x-0 lg:shadow-none
        `}
      >
        
        {/* HEADER */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Color distintivo según rol: Azul (Ventas) / Naranja (Técnico) */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-md ${esIngeniero ? 'bg-orange-500 shadow-orange-200' : 'bg-blue-600 shadow-blue-200'}`}>
              S
            </div>
            <span className="font-bold text-lg text-gray-800 tracking-tight">SIG System</span>
          </div>
          {/* Botón X para cerrar en móvil */}
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        {/* NAV SCROLLABLE */}
        <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
          
          {/* --- MENÚ EXCLUSIVO PARA VENTAS / ADMIN --- */}
          {!esIngeniero && (
            <>
              <div>
                <p className="px-3 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Comercial</p>
                <div className="space-y-1">
                  <Link href="/cotizaciones" className={linkClass("/cotizaciones")}>
                    <LayoutDashboard size={18} />
                    Tablero Principal
                  </Link>
                  <Link href="/cotizaciones/nueva" className={linkClass("/cotizaciones/nueva")}>
                    <FilePlus size={18} />
                    Nueva Cotización
                  </Link>
                </div>
              </div>

              <div>
                <p className="px-3 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Gestión</p>
                <div className="space-y-1">
                  <Link href="/clientes" className={linkClass("/clientes")}>
                    <Users size={18} />
                    Clientes
                  </Link>
                  <Link href="/servicios" className={linkClass("/servicios")}>
                    <Tags size={18} />
                    Tarifas y Servicios
                  </Link>
                </div>
              </div>
            </>
          )}

          {/* --- SECCIÓN DE REPORTES TÉCNICOS (Visible para todos, pero prioritaria para Ingenieros) --- */}
          <div>
            <p className="px-3 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Servicio Técnico</p>
            <div className="space-y-1">
              <Link href="/reportestec" className={linkClass("/reportestec")}>
                <Wrench size={18} />
                {esIngeniero ? "Mis Reportes" : "Reportes Técnicos"}
              </Link>
              
              {/* Acceso directo a crear reporte (Esencial para ingenieros) */}
              {esIngeniero && (
                <Link href="/reportestec/nuevo" className={linkClass("/reportestec/nuevo")}>
                  <FilePlus size={18} />
                  Nuevo Reporte
                </Link>
              )}

              {/* Si es ventas, también ve métricas aquí, el inge no */}
              {!esIngeniero && (
                <Link href="/reportes" className={linkClass("/reportes")}>
                  <BarChart3 size={18} />
                  Métricas de Ventas
                </Link>
              )}
            </div>
          </div>

          {/* --- SECCIÓN SISTEMA (Común) --- */}
          <div>
            <p className="px-3 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider mb-2">Sistema</p>
            <div className="space-y-1">
              {/* Configuración solo para Admins/Ventas */}
              {!esIngeniero && (
                <Link href="/configuracion" className={linkClass("/configuracion")}>
                  <Settings size={18} />
                  Configuración
                </Link>
              )}
              <Link href="/ayuda" className={linkClass("/ayuda")}>
                <HelpCircle size={18} />
                Ayuda y Soporte
              </Link>
            </div>
          </div>

        </nav>

        {/* FOOTER */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="bg-white p-1.5 rounded-full border border-gray-200">
               <UserCircle className="text-gray-400" size={28} />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-gray-700 truncate capitalize">
                {usuario.nombre}
              </p>
              <p className="text-[10px] text-gray-500 truncate font-mono">
                {/* Mostramos el rol de forma amigable */}
                {esIngeniero ? "Ingeniero de Campo" : (usuario.rol || "Usuario")}
              </p>
            </div>
          </div>
          
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-red-600 hover:bg-red-50 py-2 rounded-lg transition-all text-xs font-bold uppercase border border-gray-200 hover:border-red-100 bg-white">
            <LogOut size={14} />
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}