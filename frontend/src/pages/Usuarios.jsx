import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { UserPlus, Pencil, Trash2, Shield, User, X, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { listarUsuarios, criarUsuario, atualizarUsuario, removerUsuario, listarProdutores } from '../services/api'
import { mascararDocumento } from '../utils/documentos'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'

const ROLE_LABEL = { admin: 'Administrador', produtor: 'Produtor' }
const ROLE_COLOR = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  produtor: 'bg-verde-50 text-verde-700 border-verde-200',
}


function UsuarioForm({ defaultValues, onSave, onClose, isEdit, produtores }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm({ defaultValues })
  const [selectedProdutorIds, setSelectedProdutorIds] = useState(() => defaultValues?.produtor_ids ?? [])

  const role = watch('role')

  const onSubmit = async ({ password, email, ...rest }) => {
    const data = {
      ...rest,
      email: email?.trim() || null,
      produtor_ids: role === 'produtor' ? selectedProdutorIds : [],
    }
    await onSave(isEdit && !password ? data : { password, ...data })
  }

  const toggleProdutor = (id) => {
    setSelectedProdutorIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  // Wraps register's onChange to enforce lowercase on every keystroke
  const registerLower = (name, options = {}) => {
    const { onChange, ...rest } = register(name, options)
    return {
      ...rest,
      onChange: (e) => {
        e.target.value = e.target.value.toLowerCase()
        return onChange(e)
      },
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Usuário (login)</label>
        <input
          className={`input-field ${errors.username ? 'border-red-400' : ''}`}
          {...registerLower('username', { required: 'Obrigatório' })}
          disabled={isEdit}
          placeholder="ex: joao.silva"
        />
        {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
        <input
          className={`input-field ${errors.nome ? 'border-red-400' : ''}`}
          {...register('nome', { required: 'Obrigatório' })}
          placeholder="ex: João da Silva"
        />
        {errors.nome && <p className="mt-1 text-xs text-red-500">{errors.nome.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">E-mail <span className="text-gray-400 font-normal">(opcional)</span></label>
        <input
          type="email"
          className={`input-field ${errors.email ? 'border-red-400' : ''}`}
          {...registerLower('email', {
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'E-mail inválido' },
          })}
          placeholder="ex: joao@exemplo.com"
          autoComplete="email"
        />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {isEdit ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
        </label>
        <input
          type="password"
          className={`input-field ${errors.password ? 'border-red-400' : ''}`}
          {...register('password', { required: isEdit ? false : 'Obrigatório' })}
          placeholder={isEdit ? 'Nova senha...' : 'Senha de acesso'}
          autoComplete="new-password"
        />
        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Perfil de acesso</label>
        <select className="input-field" {...register('role')}>
          <option value="produtor">Produtor (acesso limitado)</option>
          <option value="admin">Administrador (acesso total)</option>
        </select>
      </div>

      {role === 'produtor' && produtores.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Produtores vinculados <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-gray-50">
            {produtores.map(p => (
              <label key={p.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedProdutorIds.includes(p.id)}
                  onChange={() => toggleProdutor(p.id)}
                  className="rounded border-gray-300 text-verde-600"
                />
                <span className="text-sm text-gray-700 flex-1">{p.nome}</span>
                <span className="text-xs text-gray-400 font-mono">{mascararDocumento(p.documento)}</span>
              </label>
            ))}
          </div>
          {selectedProdutorIds.length > 0 && (
            <p className="mt-1 text-xs text-verde-600">{selectedProdutorIds.length} produtor(es) selecionado(s)</p>
          )}
        </div>
      )}

      {isEdit && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="ativo"
            className="rounded border-gray-300 text-verde-600"
            {...register('ativo')}
          />
          <label htmlFor="ativo" className="text-sm text-gray-700">Usuário ativo</label>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 btn-secondary">Cancelar</button>
        <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary">
          {isSubmitting ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar usuário'}
        </button>
      </div>
    </form>
  )
}

export default function Usuarios() {
  const { auth } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [produtores, setProdutores] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalCriar, setModalCriar] = useState(false)
  const [editando, setEditando] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const carregar = async () => {
    setLoading(true)
    try {
      const [users, prods] = await Promise.all([listarUsuarios(), listarProdutores({ apenas_ativos: false })])
      setUsuarios(users)
      setProdutores(prods)
    } catch {
      toast.error('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { carregar() }, [])

  const handleCriar = async (data) => {
    try {
      await criarUsuario(data)
      toast.success('Usuário criado com sucesso')
      setModalCriar(false)
      carregar()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao criar usuário')
    }
  }

  const handleEditar = async (data) => {
    try {
      await atualizarUsuario(editando.id, data)
      toast.success('Usuário atualizado')
      setEditando(null)
      carregar()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao atualizar usuário')
    }
  }

  const handleRemover = async (id) => {
    try {
      await removerUsuario(id)
      toast.success('Usuário removido')
      setConfirmDelete(null)
      carregar()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erro ao remover usuário')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Usuários</h1>
          <p className="text-gray-500 text-sm mt-0.5">Gerencie os usuários do sistema</p>
        </div>
        <button onClick={() => setModalCriar(true)} className="btn-primary flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          Novo usuário
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-gray-400">Carregando...</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Nome</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Usuário</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium hidden md:table-cell">E-mail</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Perfil</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium hidden lg:table-cell">Último acesso</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${u.role === 'admin' ? 'bg-purple-100' : 'bg-verde-50'}`}>
                        {u.role === 'admin'
                          ? <Shield className="w-3.5 h-3.5 text-purple-600" />
                          : <User className="w-3.5 h-3.5 text-verde-600" />}
                      </div>
                      <span className="font-medium text-gray-900">{u.nome}</span>
                      {u.id === auth?.user_id && (
                        <span className="text-xs text-verde-600 bg-verde-50 px-1.5 py-0.5 rounded-full border border-verde-200">você</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{u.username}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">{u.email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_COLOR[u.role]}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${u.ativo ? 'text-verde-600' : 'text-gray-400'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${u.ativo ? 'bg-verde-500' : 'bg-gray-300'}`} />
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                    {u.ultimo_acesso
                      ? new Date(u.ultimo_acesso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setEditando(u)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {u.id !== auth?.user_id && (
                        confirmDelete === u.id ? (
                          <div className="flex items-center gap-1 ml-1">
                            <button
                              onClick={() => handleRemover(u.id)}
                              className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600"
                              title="Confirmar remoção"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                              title="Cancelar"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(u.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Nenhum usuário cadastrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalCriar && (
        <Modal title="Novo usuário" onClose={() => setModalCriar(false)}>
          <UsuarioForm
            defaultValues={{ role: 'produtor', ativo: true, produtor_ids: [] }}
            onSave={handleCriar}
            onClose={() => setModalCriar(false)}
            isEdit={false}
            produtores={produtores}
          />
        </Modal>
      )}

      {editando && (
        <Modal title="Editar usuário" onClose={() => setEditando(null)}>
          <UsuarioForm
            defaultValues={{ ...editando, password: '' }}
            onSave={handleEditar}
            onClose={() => setEditando(null)}
            isEdit={true}
            produtores={produtores}
          />
        </Modal>
      )}
    </div>
  )
}
