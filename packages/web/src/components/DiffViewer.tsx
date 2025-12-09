interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber?: number;
  oldLineNumber?: number;
  newLineNumber?: number;
}

interface DiffResult {
  lines: DiffLine[];
  stats: {
    added: number;
    removed: number;
    unchanged: number;
  };
}

interface DiffViewerProps {
  diff: DiffResult;
}

export function DiffViewer({ diff }: DiffViewerProps) {
  return (
    <div className="font-mono text-sm">
      <div className="border rounded overflow-hidden">
        {diff.lines.map((line, index) => {
          let bgColor = '';
          let textColor = '';
          let prefix = ' ';

          if (line.type === 'added') {
            bgColor = 'bg-green-50';
            textColor = 'text-green-800';
            prefix = '+';
          } else if (line.type === 'removed') {
            bgColor = 'bg-red-50';
            textColor = 'text-red-800';
            prefix = '-';
          } else {
            bgColor = 'bg-white';
            textColor = 'text-gray-700';
          }

          return (
            <div
              key={index}
              className={`flex ${bgColor} ${textColor} border-b last:border-b-0`}
            >
              <div className="w-12 text-right px-2 py-1 bg-gray-50 text-gray-500 border-r select-none flex-shrink-0">
                {line.type === 'removed' && line.oldLineNumber}
                {line.type === 'added' && line.newLineNumber}
                {line.type === 'unchanged' && line.oldLineNumber}
              </div>
              <div className="w-12 text-right px-2 py-1 bg-gray-50 text-gray-500 border-r select-none flex-shrink-0">
                {line.type === 'removed' && ''}
                {line.type === 'added' && line.newLineNumber}
                {line.type === 'unchanged' && line.newLineNumber}
              </div>
              <div className="flex-1 px-3 py-1 overflow-x-auto">
                <span className="mr-2 font-bold">{prefix}</span>
                {line.content || ' '}
              </div>
            </div>
          );
        })}
      </div>

      {diff.lines.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No differences found
        </div>
      )}
    </div>
  );
}
