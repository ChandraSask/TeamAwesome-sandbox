export default function PageHeading({ eyebrow, title, description, action, icon }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>
          {icon && <span className="heading-icon" aria-hidden="true">{icon}</span>}
          {title}
          <span className="accent">.</span>
        </h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
