import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import EmitirNota from './pages/EmitirNota'
import CertificadoDigital from './pages/CertificadoDigital'
import ConsultarNota from './pages/ConsultarNota'
import Configuracoes from './pages/Configuracoes'
import Cfop from './pages/Cfop'
import Ncm from './pages/Ncm'
import Municipios from './pages/Municipios'
import Produtores from './pages/Produtores'
import ProdutorDetalhe from './pages/ProdutorDetalhe'
import NotasEmitidas from './pages/NotasEmitidas'
import NotaDetalhe from './pages/NotaDetalhe'
import Usuarios from './pages/Usuarios'
import { useAuth } from './context/AuthContext'

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'Source Sans 3, sans-serif',
            fontSize: '14px',
            borderRadius: '10px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          },
          success: { iconTheme: { primary: '#16a34a', secondary: '#fff' } },
          error: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="emitir" element={<EmitirNota />} />
          <Route path="certificado" element={<CertificadoDigital />} />
          <Route path="consultar" element={<ConsultarNota />} />
          <Route path="configuracoes" element={<Configuracoes />} />
          <Route path="cfop" element={
            <ProtectedRoute adminOnly>
              <Cfop />
            </ProtectedRoute>
          } />
          <Route path="ncm" element={
            <ProtectedRoute adminOnly>
              <Ncm />
            </ProtectedRoute>
          } />
          <Route path="municipios" element={
            <ProtectedRoute adminOnly>
              <Municipios />
            </ProtectedRoute>
          } />
          <Route path="notas" element={<NotasEmitidas />} />
          <Route path="notas/:id" element={<NotaDetalhe />} />
          <Route path="produtores" element={<Produtores />} />
          <Route path="produtores/:id" element={<ProdutorDetalhe />} />
          <Route path="usuarios" element={
            <ProtectedRoute adminOnly>
              <Usuarios />
            </ProtectedRoute>
          } />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
