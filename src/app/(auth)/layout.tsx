export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-16">{children}</div>

      <div className="relative hidden overflow-hidden border-l border-line bg-surface lg:block">
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(79,140,255,0.18), transparent 45%), radial-gradient(circle at 80% 70%, rgba(52,211,153,0.12), transparent 45%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-center gap-8 px-14">
          <blockquote className="max-w-md text-xl font-medium leading-relaxed tracking-tight">
            &ldquo;The journal is where the edge is found. Not in the entry — in the review of a
            hundred entries.&rdquo;
          </blockquote>
          <dl className="grid grid-cols-3 gap-6 border-t border-line pt-8">
            {[
              { label: "Metrics tracked", value: "40+" },
              { label: "Analytics views", value: "20+" },
              { label: "Your data", value: "Private" },
            ].map((item) => (
              <div key={item.label}>
                <dt className="text-xs text-ink-faint">{item.label}</dt>
                <dd className="mt-1 text-lg font-semibold tracking-tight">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
