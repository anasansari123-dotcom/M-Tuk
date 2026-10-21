import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-[70vh] place-items-center bg-[#F4F8FC] p-6 text-center">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[#00A84F]">Not found</p>
        <h1 className="text-3xl font-extrabold text-[#042D58]">That page is not here</h1>
        <p className="text-sm text-[#71869A]">The link may be old, or the record was removed.</p>
        <div className="flex justify-center gap-4 pt-2 text-sm font-semibold">
          <Link href="/" className="text-[#00A84F] hover:underline">
            Home
          </Link>
          <Link href="/login" className="text-[#063F78] hover:underline">
            Admin sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
