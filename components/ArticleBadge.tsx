
import React from 'react';

interface Props {
  article: string | null;
}

export const ArticleBadge: React.FC<Props> = ({ article }) => {
  if (!article) return null;

  const styles = {
    der: 'text-blue-600 border-blue-200 bg-blue-50',
    die: 'text-red-600 border-red-200 bg-red-50',
    das: 'text-emerald-600 border-emerald-200 bg-emerald-50'
  };

  const currentStyle = styles[article.toLowerCase() as keyof typeof styles] || 'text-slate-500 bg-slate-50';

  return (
    <span className={`font-serif-italic text-2xl px-2 rounded-lg border mr-1 ${currentStyle}`}>
      {article}
    </span>
  );
};
