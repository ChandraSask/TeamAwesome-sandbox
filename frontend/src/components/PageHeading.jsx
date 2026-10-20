export default function PageHeading({ eyebrow, title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>
          {title}
          <span className="accent">.</span>
        </h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
