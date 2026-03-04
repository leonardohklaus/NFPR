import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect, useMemo } from 'react'
import {
  LayoutDashboard, FileText, ShieldCheck, Search,
  Settings, ChevronRight, Leaf, Wifi, WifiOff, AlertCircle,
  Menu, X, BookOpen, Tag, Users, MapPin, LogOut, UserCog, ClipboardList,
} from 'lucide-react'
import { statusSefaz, infoCertificadoProdutor } from '../services/api'
import { useProdutorAtivo } from '../context/ProdutorContext'
import { useAuth } from '../context/AuthContext'

const navItemsBase = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Painel' },
  { to: '/emitir',        icon: FileText,        label: 'Emitir Nota Fiscal' },
  { to: '/notas',         icon: ClipboardList,   label: 'Notas Emitidas' },
  { to: '/consultar',     icon: Search,          label: 'Consultar NF-e' },
  { to: '/produtores',    icon: Users,           label: 'Produtores' },
  { to: '/configuracoes', icon: Settings,        label: 'Configurações' },
]

const tabelasItems = [
  { to: '/cfop', icon: BookOpen, label: 'CFOP' },
  { to: '/ncm', icon: Tag, label: 'NCM' },
  { to: '/municipios', icon: MapPin, label: 'Municípios' },
]

const adminNavItem = { to: '/usuarios', icon: UserCog, label: 'Usuários' }

const navLinkClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
  ${isActive
    ? 'bg-verde-700 text-white shadow-sm'
    : 'text-verde-200 hover:bg-verde-800 hover:text-white'
  }`

export default function Layout() {
  const [sefazStatus, setSefazStatus] = useState(null)
  const [certInfo, setCertInfo] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const { produtorAtivo, carregando: carregandoProdutor } = useProdutorAtivo()
  const { auth, isAdmin, logout } = useAuth()

  const navItems = useMemo(
    () => isAdmin ? [...navItemsBase, adminNavItem] : navItemsBase,
    [isAdmin]
  )

  useEffect(() => {
    setSidebarOpen(false)
  }, [location])

  useEffect(() => {
    if (carregandoProdutor) return
    const fetchStatus = async () => {
      try {
        const produtorId = produtorAtivo?.id
        const [s, c] = await Promise.all([
          statusSefaz(2, produtorId || null),
          produtorId ? infoCertificadoProdutor(produtorId) : Promise.resolve({ carregado: false }),
        ])
        setSefazStatus(s)
        setCertInfo(c)
      } catch {}
    }
    fetchStatus()
    const interval = setInterval(fetchStatus, 60000)
    return () => clearInterval(interval)
  }, [produtorAtivo?.id, carregandoProdutor])

  const StatusDot = ({ ok }) => (
    <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-verde-500' : 'bg-red-400'}`} />
  )

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-verde-900 flex flex-col
          transform transition-transform duration-200 lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="px-5 py-6 border-b border-verde-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-verde-500 rounded-lg flex items-center justify-center shadow">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-white text-sm leading-tight">NFPR · RS</p>
              <p className="text-verde-300 text-xs">Produtor Rural</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={navLinkClass}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="pt-3 pb-1">
                <p className="px-3 text-verde-500 text-xs font-semibold uppercase tracking-widest">Tabelas</p>
              </div>
              {tabelasItems.map(({ to, icon: Icon, label }) => (
                <NavLink key={to} to={to} className={navLinkClass}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Produtor ativo */}
        {produtorAtivo && (
          <div className="px-4 py-3 border-t border-verde-800">
            <p className="text-verde-500 text-xs font-semibold uppercase tracking-widest mb-1.5">Produtor ativo</p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-verde-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-3 h-3 text-white" />
              </div>
              <p className="text-verde-100 text-xs font-medium truncate">{produtorAtivo.nome}</p>
            </div>
            <p className="text-verde-400 text-xs mt-0.5 pl-8">Série {produtorAtivo.serie || '001'}</p>
          </div>
        )}

        {/* Status bar */}
        <div className="px-4 py-4 border-t border-verde-800 space-y-2.5">
          {/* SEFAZ status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-verde-300 text-xs">
              {sefazStatus ? (
                sefazStatus.status === 'operacional' || sefazStatus.status === 'simulado'
                  ? <Wifi className="w-3.5 h-3.5" />
                  : <WifiOff className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <AlertCircle className="w-3.5 h-3.5 text-gray-400" />
              )}
              <span>SEFAZ-RS</span>
            </div>
            <StatusDot
              ok={sefazStatus?.status === 'operacional' || sefazStatus?.status === 'simulado'}
            />
          </div>

          {/* Certificado status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-verde-300 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Certificado</span>
            </div>
            <StatusDot ok={certInfo?.carregado} />
          </div>

          {certInfo?.carregado && (
            <p className="text-verde-400 text-xs truncate" title={certInfo.titular}>
              {certInfo.titular?.split(':')[0]}
            </p>
          )}
        </div>

        {/* Logged user + logout */}
        {auth && (
          <div className="px-4 py-3 border-t border-verde-800 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-verde-100 text-xs font-medium truncate">{auth.nome}</p>
              <p className="text-verde-500 text-xs truncate">
                {auth.role === 'admin' ? 'Administrador' : 'Produtor'}
              </p>
            </div>
            <button
              onClick={logout}
              title="Sair"
              className="p-1.5 rounded-lg text-verde-400 hover:text-white hover:bg-verde-700 transition-colors flex-shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-verde-600" />
            <span className="font-display font-bold text-gray-800">NFPR · RS</span>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
