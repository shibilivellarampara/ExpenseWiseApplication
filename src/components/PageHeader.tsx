interface PageHeaderProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  if (!title && !description && !children) return null;

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      {(title || description) && (
        <div className="space-y-1">
          {title && <h1 className="text-2xl md:text-3xl font-bold font-headline">{title}</h1>}
          {description && <p className="text-muted-foreground">{description}</p>}
        </div>
      )}
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
