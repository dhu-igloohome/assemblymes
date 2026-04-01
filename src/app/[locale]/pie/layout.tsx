import PieSidebar from '@/components/PieSidebar';

export default function PieLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <PieSidebar />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
