import axios from 'axios'
import { STORAGE_KEY } from '../constants/auth'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const { access_token } = JSON.parse(raw)
      if (access_token) config.headers.Authorization = `Bearer ${access_token}`
    }
  } catch {}
  return config
})

// On 401, clear session and redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(STORAGE_KEY)
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ========== AUTH ==========
export const loginApi = async (identifier, password) => {
  const { data } = await api.post('/auth/login', { identifier, password })
  return data
}

// ========== USUARIOS ==========
export const listarUsuarios = async () => {
  const { data } = await api.get('/usuarios/')
  return data
}

export const criarUsuario = async (usuario) => {
  const { data } = await api.post('/usuarios/', usuario)
  return data
}

export const atualizarUsuario = async (id, usuario) => {
  const { data } = await api.put(`/usuarios/${id}`, usuario)
  return data
}

export const removerUsuario = async (id) => {
  await api.delete(`/usuarios/${id}`)
}

// ========== CERTIFICADO ==========
export const uploadCertificado = async (arquivo, senha) => {
  const form = new FormData()
  form.append('arquivo', arquivo)
  form.append('senha', senha)
  const { data } = await api.post('/certificado/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const infoCertificado = async () => {
  const { data } = await api.get('/certificado/info')
  return data
}

export const removerCertificado = async () => {
  const { data } = await api.delete('/certificado/remover')
  return data
}

export const listarACs = async () => {
  const { data } = await api.get('/certificado/autoridades-certificadoras')
  return data
}

// ========== NOTAS FISCAIS ==========
export const gerarXML = async (nota) => {
  const response = await api.post('/notas/gerar-xml', nota, {
    responseType: 'blob',
  })
  return {
    blob: response.data,
    chave: response.headers['x-chave-acesso'],
  }
}

export const assinarXML = async (nota) => {
  const response = await api.post('/notas/assinar-xml', nota, {
    responseType: 'blob',
  })
  return {
    blob: response.data,
    chave: response.headers['x-chave-acesso'],
  }
}

export const emitirNota = async (nota) => {
  const { data } = await api.post('/notas/emitir', nota)
  return data
}

export const proximaNumeracao = async (produtorId = null) => {
  const params = produtorId ? { produtor_id: produtorId } : {}
  const { data } = await api.get('/notas/proxima-numeracao', { params })
  return data
}

export const listarNotas = async (produtorId = null) => {
  const params = produtorId ? { produtor_id: produtorId } : {}
  const { data } = await api.get('/notas/listar', { params })
  return data
}

export const detalheNota = async (id) => {
  const { data } = await api.get(`/notas/${id}`)
  return data
}

export const respostasNota = async (id) => {
  const { data } = await api.get(`/notas/${id}/respostas`)
  return data
}

export const baixarXmlNota = async (id) => {
  const response = await api.get(`/notas/${id}/xml`, { responseType: 'blob' })
  const cd = response.headers['content-disposition'] || ''
  const filename = cd.match(/filename="(.+)"/)?.[1] || `nfe_${id}.xml`
  return { blob: response.data, filename }
}

export const cancelarNota = async (id, justificativa) => {
  const { data } = await api.post(`/notas/${id}/cancelar`, { justificativa })
  return data
}

// ========== SEFAZ ==========
export const statusSefaz = async (ambiente = 2, produtorId = null) => {
  const query = produtorId
    ? `/sefaz/status?ambiente=${ambiente}&produtor_id=${produtorId}`
    : `/sefaz/status?ambiente=${ambiente}`
  const { data } = await api.get(query)
  return data
}

export const consultarNFe = async (chave, ambiente = 2) => {
  const { data } = await api.get(`/sefaz/consultar/${chave}?ambiente=${ambiente}`)
  return data
}

export const listarCFOPs = async () => {
  const { data } = await api.get('/sefaz/cfop-produtor-rural')
  return data
}

// ========== PRODUTOR ==========
export const listarMunicipios = async (uf = 'RS', busca = '') => {
  const params = { uf }
  if (busca) params.busca = busca
  const { data } = await api.get('/produtor/municipios-rs', { params })
  return data
}

export const listarNCMs = async () => {
  const { data } = await api.get('/produtor/ncm-produtos-rurais')
  return data
}

// ========== PRODUTORES ==========
export const listarProdutores = async (params = {}) => {
  const { data } = await api.get('/produtores/', { params })
  return data
}

export const buscarProdutor = async (id) => {
  const { data } = await api.get(`/produtores/${id}`)
  return data
}

export const criarProdutor = async (produtor) => {
  const { data } = await api.post('/produtores/', produtor)
  return data
}

export const atualizarProdutor = async (id, produtor) => {
  const { data } = await api.put(`/produtores/${id}`, produtor)
  return data
}

export const removerProdutor = async (id) => {
  await api.delete(`/produtores/${id}`)
}

export const uploadCertificadoProdutor = async (id, arquivo, senha) => {
  const form = new FormData()
  form.append('arquivo', arquivo)
  form.append('senha', senha)
  const { data } = await api.post(`/produtores/${id}/certificado`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const infoCertificadoProdutor = async (id) => {
  const { data } = await api.get(`/produtores/${id}/certificado`)
  return data
}

export const removerCertificadoProdutor = async (id) => {
  await api.delete(`/produtores/${id}/certificado`)
}

export const ativarCertificadoProdutor = async (id) => {
  const { data } = await api.post(`/produtores/${id}/certificado/ativar`)
  return data
}

export const listarNotasProdutor = async (id) => {
  const { data } = await api.get(`/produtores/${id}/notas`)
  return data
}

export const listarUsuariosProdutor = async (id) => {
  const { data } = await api.get(`/produtores/${id}/usuarios`)
  return data
}

export const vincularUsuarioProdutor = async (id, userId) => {
  await api.post(`/produtores/${id}/usuarios/${userId}`)
}

export const desvincularUsuarioProdutor = async (id, userId) => {
  await api.delete(`/produtores/${id}/usuarios/${userId}`)
}

export const criarUsuarioParaProdutor = async (id, dados) => {
  const { data } = await api.post(`/produtores/${id}/usuarios`, dados)
  return data
}

// ========== CFOP CRUD ==========
export const listarCFOPsDB = async (params = {}) => {
  const { data } = await api.get('/cfop/', { params })
  return data
}

export const criarCFOP = async (cfop) => {
  const { data } = await api.post('/cfop/', cfop)
  return data
}

export const atualizarCFOP = async (id, cfop) => {
  const { data } = await api.put(`/cfop/${id}`, cfop)
  return data
}

export const removerCFOP = async (id) => {
  await api.delete(`/cfop/${id}`)
}

// ========== MUNICÍPIOS CRUD ==========
export const listarMunicipiosDB = async (params = {}) => {
  const { data } = await api.get('/municipios/', { params })
  return data
}

export const criarMunicipio = async (municipio) => {
  const { data } = await api.post('/municipios/', municipio)
  return data
}

export const atualizarMunicipio = async (id, municipio) => {
  const { data } = await api.put(`/municipios/${id}`, municipio)
  return data
}

export const removerMunicipio = async (id) => {
  await api.delete(`/municipios/${id}`)
}

// ========== NCM CRUD ==========
export const listarNCMsDB = async (params = {}) => {
  const { data } = await api.get('/ncm/', { params })
  return data
}

export const criarNCM = async (ncm) => {
  const { data } = await api.post('/ncm/', ncm)
  return data
}

export const atualizarNCM = async (id, ncm) => {
  const { data } = await api.put(`/ncm/${id}`, ncm)
  return data
}

export const removerNCM = async (id) => {
  await api.delete(`/ncm/${id}`)
}
