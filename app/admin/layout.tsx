export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <nav className="border-b border-zinc-800 px-6 py-4">
        <h2 className="text-lg font-semibold">ReviewPilot AI — Admin</h2>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
