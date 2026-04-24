import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useSession } from './hooks/useSession'
import AdminLayout from './components/admin/AdminLayout'
import LandingPage from './pages/public/LandingPage'
import LoginPage from './pages/LoginPage'
import RegistroPage from './pages/public/RegistroPage'
import TiendaPage from './pages/public/TiendaPage'
import CuentaPage from './pages/cuenta/CuentaPage'
import DashboardPage from './pages/admin/DashboardPage'
import CatalogoPage from './pages/admin/CatalogoPage'
import ClientesPage from './pages/admin/ClientesPage'
import MapaPage from './pages/admin/MapaPage'
import PedidosPage from './pages/admin/PedidosPage'
import EntregasPage from './pages/admin/EntregasPage'
import CobrosPage from './pages/admin/CobrosPage'
import InventarioPage from './pages/admin/InventarioPage'
import PromocionesPage from './pages/admin/PromocionesPage'
import TicketPedidoPage from './pages/TicketPedidoPage'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-cream">
      <div className="text-brand-coffee font-semibold animate-pulse">Cargando...</div>
    </div>
  )
}

function ProtectedRoute({ children, requireAdmin = false }: {
  children: React.ReactNode
  requireAdmin?: boolean
}) {
  const { session, profile, loading } = useSession()
  if (loading) return <LoadingScreen />
  if (!session) return <Navigate to="/login" replace />
  if (requireAdmin && profile?.role !== 'admin' && profile?.role !== 'operador') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

export default function App() {
  const { session, profile, loading } = useSession()
  if (loading) return <LoadingScreen />

  const isInternal = ['admin', 'operador', 'caja'].includes(profile?.role ?? '')

  return (
    <BrowserRouter>
      <Routes>

        {/* ── Públicas ── */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={
          session ? <Navigate to={isInternal ? '/admin' : '/cuenta'} replace /> : <LoginPage />
        } />
        <Route path="/registro" element={
          session ? <Navigate to="/cuenta" replace /> : <RegistroPage />
        } />
        <Route path="/tienda" element={<TiendaPage />} />

        {/* ── Cliente registrado ── */}
        <Route path="/cuenta" element={
          <ProtectedRoute><CuentaPage /></ProtectedRoute>
        } />
        <Route path="/ticket/:id" element={
          <ProtectedRoute><TicketPedidoPage /></ProtectedRoute>
        } />

        {/* ── Admin / Operador ── */}
        <Route path="/admin" element={
          <ProtectedRoute requireAdmin>
            <AdminLayout breadcrumb={[]} />
          </ProtectedRoute>
        }>
          <Route index element={<DashboardPage />} />
          <Route path="catalogo"  element={<CatalogoPage />} />
          <Route path="clientes"  element={<ClientesPage />} />
          <Route path="pedidos"   element={<PedidosPage />} />
          <Route path="entregas"  element={<EntregasPage />} />
          <Route path="mapa"      element={<MapaPage />} />
          <Route path="cobros"     element={<CobrosPage />} />
          <Route path="inventario" element={<InventarioPage />} />
          <Route path="promociones" element={<PromocionesPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
