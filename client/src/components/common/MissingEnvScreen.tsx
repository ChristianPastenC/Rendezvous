interface MissingEnvScreenProps {
  missingVars: string[];
}

export function MissingEnvScreen({ missingVars }: MissingEnvScreenProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-white">Rendezvous Configuration Required</h1>
          <p className="text-sm text-slate-400">
            Firebase client environment variables are missing. Copy{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
              client/.env.example
            </code>{' '}
            to{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200">
              client/.env
            </code>{' '}
            and set the following keys:
          </p>
        </div>

        <ul className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-1 text-xs font-mono text-amber-300">
          {missingVars.map((envKey) => (
            <li key={envKey}>{envKey}</li>
          ))}
        </ul>

        <p className="text-xs text-slate-500">
          Restart the Vite dev server after updating your environment file.
        </p>
      </div>
    </div>
  );
}
