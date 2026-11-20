// The registry is generated from repo videos/ projects at build time.
// URL is scoped to the Vite base path, including the GitHub Pages /motionforge/ prefix.
export async function loadProjectIndex() {
  const response = await fetch(import.meta.env.BASE_URL + 'projects/index.json', { cache: 'no-store' });
  if (!response.ok) throw new Error('Projectindex niet bereikbaar (' + response.status + ').');
  const data = await response.json();
  if (data.schemaVersion !== 1 || !Array.isArray(data.projects)) {
    throw new Error('Ongeldig projectindex-formaat.');
  }
  return data.projects;
}

export function projectCoverUrl(project) {
  return project.coverUrl ? import.meta.env.BASE_URL + project.coverUrl : null;
}
