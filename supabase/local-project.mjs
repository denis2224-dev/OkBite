// Explicit local Docker identities only; never accept an arbitrary project/container.
const localProjects = new Set([
  'okbite', 'okbite-c2', 'okbite-c3-cd37', 'okbite-c6', 'okbite-r2-review',
]);
export function localProject(config) {
  const project = config.match(/^project_id\s*=\s*"([a-z0-9-]+)"\s*$/m)?.[1];
  if (!localProjects.has(project)) throw new Error('Refusing unrecognized local project');
  return project;
}
