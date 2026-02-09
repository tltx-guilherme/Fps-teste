export const demoUser = {
  email: 'admin@fps.local',
  // use a clear property name 'password' (was 'pass')
  password: 'password',
};

export function isAuthed() {
  return !!localStorage.getItem('fps_token');
}

export function logout() {
  localStorage.removeItem('fps_token');
  localStorage.removeItem('fps_user');
  window.location.href = '/login';
}

export function getUser() {
  const userJson = localStorage.getItem('fps_user');
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch {
    return null;
  }
}

export function isAdmin() {
  const user = getUser();
  return user?.role === 'admin';
}
