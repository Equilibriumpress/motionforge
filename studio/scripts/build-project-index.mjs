#!/usr/bin/env node
// Builds the static GitHub Pages project registry from videos/<slug>/project.json.
// Generated files live only in studio/public/projects/ and are never committed.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';

const studioRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(studioRoot, '..');
const videosRoot = path.join(repoRoot, 'videos');
const publicRoot = path.join(studioRoot, 'public', 'projects');
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FORMATS = ['9:16', '16:9', '1:1', '4:5'];
const STATUSES = ['concept', 'draft', 'review', 'ready'];
const ENGINES = ['hyperframes', 'remotion', 'canvas'];
const IMAGE_EXTS = new Set(['.svg', '.jpg', '.jpeg', '.png', '.webp', '.avif']);

function requireCondition(condition, context, message) {
  if (!condition) throw new Error(context + ': ' + message);
}

function textValue(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function safeLocalPath(value, prefix) {
  return typeof value === 'string'
    && value.startsWith(prefix)
    && !value.startsWith('/')
    && !value.includes('\\')
    && !value.split('/').includes('..')
    && /^[a-zA-Z0-9_./-]+$/.test(value);
}

function validateProject(project, slug, context, directory) {
  requireCondition(project && typeof project === 'object' && !Array.isArray(project), context, 'project must be an object');
  requireCondition(project.schemaVersion === 1, context, 'schemaVersion must be 1');
  requireCondition(project.id === slug && SLUG.test(slug), context, 'id must match its folder slug');
  requireCondition(textValue(project.title), context, 'title is required');
  requireCondition(typeof project.description === 'string', context, 'description must be a string');
  requireCondition(STATUSES.includes(project.status), context, 'invalid status');
  requireCondition(FORMATS.includes(project.format), context, 'invalid format');
  requireCondition(ENGINES.includes(project.engine), context, 'invalid engine');
  requireCondition(textValue(project.language), context, 'language is required');
  requireCondition(Number.isFinite(project.durationSeconds) && project.durationSeconds > 0, context, 'durationSeconds must be positive');
  requireCondition(Number.isInteger(project.fps) && project.fps >= 12 && project.fps <= 120, context, 'fps must be 12–120');
  requireCondition(Array.isArray(project.scenes), context, 'scenes must be an array');
  requireCondition(Array.isArray(project.tags) && project.tags.every(textValue), context, 'tags must be a string array');
  if (project.cover !== undefined) {
    requireCondition(safeLocalPath(project.cover, 'assets/'), context, 'cover must be a local assets/ path');
    requireCondition(IMAGE_EXTS.has(path.extname(project.cover).toLowerCase()), context, 'unsupported cover extension');
    requireCondition(existsSync(path.join(directory, project.cover)), context, 'cover image does not exist');
  }
  const sceneIds = new Set();
  for (const scene of project.scenes) {
    requireCondition(scene && textValue(scene.id) && SLUG.test(scene.id), context, 'every scene needs a slug id');
    requireCondition(!sceneIds.has(scene.id), context, 'duplicate scene id: ' + scene.id);
    sceneIds.add(scene.id);
    requireCondition(textValue(scene.title), context, 'every scene needs a title');
    requireCondition(ENGINES.includes(scene.engine), context, 'invalid scene engine');
    requireCondition(Number.isFinite(scene.startSeconds) && scene.startSeconds >= 0, context, 'invalid scene startSeconds');
    requireCondition(Number.isFinite(scene.durationSeconds) && scene.durationSeconds > 0, context, 'invalid scene durationSeconds');
    requireCondition(scene.startSeconds + scene.durationSeconds <= project.durationSeconds + 0.001, context, 'scene ends outside project duration');
    requireCondition(safeLocalPath(scene.source, 'scenes/') && scene.source.endsWith('.html'), context, 'scene source must be a local scenes/*.html path');
    requireCondition(existsSync(path.join(directory, scene.source)), context, 'missing scene source: ' + scene.source);
  }
}

async function build() {
  const index = [];
  // Clean only generated data. Do not touch the source videos/ folders.
  await rm(publicRoot, { recursive: true, force: true });
  await mkdir(publicRoot, { recursive: true });
  const entries = existsSync(videosRoot) ? await readdir(videosRoot, { withFileTypes: true }) : [];

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const projectDir = path.join(videosRoot, slug);
    const manifestFile = path.join(projectDir, 'project.json');
    if (!existsSync(manifestFile)) continue;
    const project = JSON.parse(await readFile(manifestFile, 'utf8'));
    validateProject(project, slug, manifestFile, projectDir);

    const targetDir = path.join(publicRoot, slug);
    await mkdir(targetDir, { recursive: true });
    let coverUrl = null;
    if (project.cover) {
      const source = path.join(projectDir, project.cover);
      const details = await stat(source);
      requireCondition(details.isFile() && details.size <= 5 * 1024 * 1024, manifestFile, 'cover must be a file up to 5 MB');
      const target = path.join(targetDir, project.cover);
      await mkdir(path.dirname(target), { recursive: true });
      await copyFile(source, target);
      coverUrl = 'projects/' + slug + '/' + project.cover;
    }
    await writeFile(path.join(targetDir, 'project.json'), JSON.stringify(project, null, 2) + '\n');
    index.push({
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      language: project.language,
      format: project.format,
      engine: project.engine,
      durationSeconds: project.durationSeconds,
      fps: project.fps,
      sceneCount: project.scenes.length,
      tags: project.tags,
      coverUrl,
    });
  }
  index.sort((a, b) => a.title.localeCompare(b.title, 'nl'));
  await writeFile(path.join(publicRoot, 'index.json'), JSON.stringify({ schemaVersion: 1, projects: index }, null, 2) + '\n');
  process.stdout.write('MotionForge Studio: indexed ' + index.length + ' project(s).\n');
}

build().catch((error) => {
  console.error('Project index failed:', error.message);
  process.exitCode = 1;
});
