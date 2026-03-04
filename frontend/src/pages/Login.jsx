import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Leaf, Eye, EyeOff, LogIn } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import { loginApi } from '../services/api'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ identifier, password }) => {
    setLoading(true)
    try {
      const data = await loginApi(identifier, password)
      login(data)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.detail || 'Falha ao fazer login. Verifique suas credenciais.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel – agricultural scene */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-verde-900">
        {/* SVG Agricultural landscape */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 800 600"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Sky gradient */}
          <defs>
            <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f4c2a" />
              <stop offset="60%" stopColor="#1a6b3a" />
              <stop offset="100%" stopColor="#2d9e5e" />
            </linearGradient>
            <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2d6a1f" />
              <stop offset="100%" stopColor="#1a4010" />
            </linearGradient>
            <linearGradient id="wheat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4a017" />
              <stop offset="100%" stopColor="#8b6914" />
            </linearGradient>
            <linearGradient id="sun" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffd700" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ff8c00" stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Background sky */}
          <rect width="800" height="600" fill="url(#sky)" />

          {/* Sun */}
          <circle cx="620" cy="130" r="60" fill="url(#sun)" opacity="0.3" />
          <circle cx="620" cy="130" r="40" fill="#ffd700" opacity="0.25" />

          {/* Distant hills */}
          <ellipse cx="200" cy="340" rx="300" ry="120" fill="#1e5c14" opacity="0.7" />
          <ellipse cx="600" cy="320" rx="280" ry="100" fill="#236b18" opacity="0.6" />

          {/* Ground */}
          <rect x="0" y="350" width="800" height="250" fill="url(#ground)" />

          {/* Field rows (furrows) */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <ellipse
              key={i}
              cx="400"
              cy={375 + i * 30}
              rx={380 - i * 20}
              ry="8"
              fill="#1a4010"
              opacity="0.4"
            />
          ))}

          {/* Wheat stalks – left cluster */}
          {[-60, -40, -20, 0, 20, 40, 60, 80, 100].map((x, i) => (
            <g key={`wl${i}`} transform={`translate(${180 + x}, 280)`}>
              <line x1="0" y1="70" x2="0" y2="0" stroke="#8b6914" strokeWidth="2" />
              <line x1="0" y1="0" x2="-8" y2="-15" stroke="#8b6914" strokeWidth="1.5" />
              <line x1="0" y1="0" x2="8" y2="-15" stroke="#8b6914" strokeWidth="1.5" />
              <ellipse cx="0" cy="-20" rx="5" ry="12" fill="#d4a017" opacity="0.85" />
              <ellipse cx="-10" cy="-10" rx="4" ry="9" fill="#c9961a" opacity="0.7" />
              <ellipse cx="10" cy="-10" rx="4" ry="9" fill="#c9961a" opacity="0.7" />
            </g>
          ))}

          {/* Wheat stalks – right cluster */}
          {[-80, -60, -40, -20, 0, 20, 40, 60].map((x, i) => (
            <g key={`wr${i}`} transform={`translate(${590 + x}, 295)`}>
              <line x1="0" y1="55" x2="0" y2="0" stroke="#8b6914" strokeWidth="2" />
              <line x1="0" y1="0" x2="-7" y2="-12" stroke="#8b6914" strokeWidth="1.5" />
              <line x1="0" y1="0" x2="7" y2="-12" stroke="#8b6914" strokeWidth="1.5" />
              <ellipse cx="0" cy="-16" rx="4" ry="10" fill="#d4a017" opacity="0.85" />
              <ellipse cx="-9" cy="-8" rx="3" ry="7" fill="#c9961a" opacity="0.7" />
              <ellipse cx="9" cy="-8" rx="3" ry="7" fill="#c9961a" opacity="0.7" />
            </g>
          ))}

          {/* Tree silhouettes */}
          <g transform="translate(80, 200)">
            <rect x="-5" y="80" width="10" height="70" fill="#1a3a0a" />
            <ellipse cx="0" cy="60" rx="35" ry="50" fill="#1e5010" />
            <ellipse cx="0" cy="40" rx="25" ry="40" fill="#236014" />
          </g>
          <g transform="translate(710, 220)">
            <rect x="-4" y="70" width="8" height="60" fill="#1a3a0a" />
            <ellipse cx="0" cy="50" rx="28" ry="42" fill="#1e5010" />
            <ellipse cx="0" cy="32" rx="20" ry="32" fill="#236014" />
          </g>

          {/* Clouds */}
          <g opacity="0.15">
            <ellipse cx="150" cy="80" rx="70" ry="30" fill="white" />
            <ellipse cx="200" cy="65" rx="55" ry="28" fill="white" />
            <ellipse cx="100" cy="90" rx="45" ry="22" fill="white" />
          </g>
          <g opacity="0.12">
            <ellipse cx="500" cy="100" rx="60" ry="25" fill="white" />
            <ellipse cx="550" cy="88" rx="48" ry="22" fill="white" />
          </g>

          {/* Dark overlay for text readability */}
          <rect width="800" height="600" fill="black" opacity="0.35" />
        </svg>

        {/* Overlay content */}
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-verde-500 rounded-xl flex items-center justify-center shadow-lg">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-white text-lg leading-tight">NFPR · RS</p>
              <p className="text-verde-300 text-xs">Nota Fiscal do Produtor Rural</p>
            </div>
          </div>

          <div>
            <h1 className="text-4xl font-display font-bold text-white leading-tight mb-4">
              Sistema de Emissão<br />de Notas Fiscais
            </h1>
            <p className="text-verde-200 text-lg leading-relaxed">
              Emita e gerencie Notas Fiscais do Produtor Rural com segurança,
              diretamente integrado à SEFAZ-RS.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="h-px bg-verde-600 flex-1" />
              <p className="text-verde-400 text-sm">Rio Grande do Sul</p>
              <div className="h-px bg-verde-600 flex-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Right panel – login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-verde-600 rounded-xl flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-gray-900">NFPR · RS</p>
              <p className="text-gray-500 text-xs">Nota Fiscal do Produtor Rural</p>
            </div>
          </div>

          <h2 className="text-2xl font-display font-bold text-gray-900 mb-1">Entrar no sistema</h2>
          <p className="text-gray-500 text-sm mb-8">Insira suas credenciais para continuar</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Usuário ou E-mail
              </label>
              <input
                type="text"
                autoComplete="username"
                className={`input-field ${errors.identifier ? 'border-red-400 focus:ring-red-300' : ''}`}
                placeholder="Usuário ou e-mail"
                {...register('identifier', { required: 'Informe o usuário ou e-mail' })}
              />
              {errors.identifier && (
                <p className="mt-1 text-xs text-red-500">{errors.identifier.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`input-field pr-10 ${errors.password ? 'border-red-400 focus:ring-red-300' : ''}`}
                  placeholder="Digite sua senha"
                  {...register('password', { required: 'Senha obrigatória' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            NFPR · RS — Sistema de Nota Fiscal do Produtor Rural
          </p>
        </div>
      </div>
    </div>
  )
}
