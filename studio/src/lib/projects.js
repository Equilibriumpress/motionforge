// Static registry built at GitHub Pages build time.
const BASE = import.meta.env.BASE_URL;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
async function getJson(url, message) {
  const response = await fetch(url,{cache:'no-store'});
  if (!response.ok) throw Error(message+' ('+response.status+').');
  return response.json();
}
export async function loadProjectIndex() {
  const data=await getJson(BASE+'projects/index.json','Projectindex niet bereikbaar');
  if (data.schemaVersion !== 1 || !Array.isArray(data.projects)) throw Error('Ongeldige projectindex');
  return data.projects;
}
export async function loadProject(id) {
  if (!SLUG.test(id)) throw Error('Ongeldige projectnaam');
  const project=await getJson(BASE+'projects/'+id+'/project.json','Projectbestand niet bereikbaar');
  if (project.id !== id || project.schemaVersion !== 1 || !Array.isArray(project.scenes)) throw Error('Ongeldig projectbestand');
  return project;
}
export function projectCoverUrl(project) {
  return project.coverUrl ? BASE+project.coverUrl : null;
}
