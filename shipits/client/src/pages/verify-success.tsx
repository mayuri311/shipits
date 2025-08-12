import { Link } from 'wouter';

export default function VerifySuccess() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center bg-white dark:bg-neutral-900 rounded-2xl shadow-xl p-8">
        <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-maroon/10 flex items-center justify-center">
          <span className="text-maroon font-extrabold text-xl">S</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Email verified</h1>
        <p className="text-muted-foreground mt-2">
          Your email has been verified successfully. You can now log in and start using ShipIts.
        </p>
        <div className="mt-6">
          <Link href="/">
            <a className="inline-flex items-center justify-center rounded-xl bg-maroon text-white px-4 py-2 font-medium shadow hover:bg-maroon/90">Go to Home</a>
          </Link>
        </div>
      </div>
    </div>
  );
}


