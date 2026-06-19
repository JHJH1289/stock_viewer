const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

function authHeaders() {
  const token = window.localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function parseJsonResponse(response) {
  try {
    return await response.json()
  } catch {
    return {}
  }
}

export async function fetchGeneralPosts(page = 0, size = 10) {
  const params = new URLSearchParams({ page, size })
  const response = await fetch(`${apiBaseUrl}/posts?${params}`)
  if (!response.ok) throw new Error('게시글을 불러오지 못했습니다.')
  return response.json()
}

export async function fetchStockPosts(symbol) {
  const response = await fetch(`${apiBaseUrl}/posts/stock/${encodeURIComponent(symbol)}`)
  if (!response.ok) throw new Error('게시글을 불러오지 못했습니다.')
  return response.json()
}

export async function fetchPost(id) {
  const response = await fetch(`${apiBaseUrl}/posts/${id}`)
  if (!response.ok) throw new Error('게시글을 불러오지 못했습니다.')
  return response.json()
}

export async function createPost({ title, content }) {
  const response = await fetch(`${apiBaseUrl}/posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ title, content }),
  })
  const data = await parseJsonResponse(response)
  if (!response.ok) throw new Error(data.message ?? '글 작성에 실패했습니다.')
  return data
}

export async function createStockPost({ symbol, title, content }) {
  const response = await fetch(`${apiBaseUrl}/posts/stock/${encodeURIComponent(symbol)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ title, content }),
  })
  const data = await parseJsonResponse(response)
  if (!response.ok) throw new Error(data.message ?? '글 작성에 실패했습니다.')
  return data
}

export async function updatePost({ id, title, content }) {
  const response = await fetch(`${apiBaseUrl}/posts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ title, content }),
  })
  const data = await parseJsonResponse(response)
  if (!response.ok) throw new Error(data.message ?? '글 수정에 실패했습니다.')
  return data
}

export async function deletePost(id) {
  const response = await fetch(`${apiBaseUrl}/posts/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('글 삭제에 실패했습니다.')
}
