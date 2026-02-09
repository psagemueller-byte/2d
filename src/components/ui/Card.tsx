interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({ children, className = '', hover = false }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-surface p-6 ${
        hover ? 'transition-all duration-200 hover:border-brand/30 hover:shadow-lg hover:shadow-brand/5' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
