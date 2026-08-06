export default function ProjectCard({ project }) {
  return (
    <article className="border border-gray-200 rounded-lg p-5 hover:shadow-sm transition-shadow">
      <h3 className="font-semibold text-lg mb-1">{project.name}</h3>
      <p className="text-gray-600 text-sm mb-3">{project.description}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {project.tags.map((tag) => (
          <span key={tag} className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
            {tag}
          </span>
        ))}
      </div>
      <div className="flex gap-4 text-sm">
        {project.links?.source && (
          <a href={project.links.source} className="text-brand-600 hover:underline">
            Source
          </a>
        )}
        {project.links?.demo && (
          <a href={project.links.demo} className="text-brand-600 hover:underline">
            Live demo
          </a>
        )}
      </div>
    </article>
  );
}
