import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

export async function getIncidents(role = 'citizen', type = null, start_timestamp = null, end_timestamp = null) {
  const params = { role }
  if (type) params.type = type
  if (start_timestamp) params.start_timestamp = start_timestamp
  if (end_timestamp) params.end_timestamp = end_timestamp
  const res = await api.get('/incidents', { params })
  return res.data
}

export async function getIncident(id, role = 'citizen') {
  const res = await api.get(`/incidents/${id}`, { params: { role } })
  return res.data
}

export async function getBuses() {
  const res = await api.get('/buses')
  return res.data
}

export async function getTrafficZones() {
  const res = await api.get('/traffic/zones')
  return res.data
}

export async function seedData() {
  const res = await api.post('/seed')
  return res.data
}

export async function login(username, role) {
  const res = await api.post('/auth/login', { username, role })
  return res.data
}

