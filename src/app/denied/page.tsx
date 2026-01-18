import Link from "next/link";

export default function AccessDenied() {
  return (
    <div className="page-shell" style={{ display: "grid", placeItems: "center" }}>
      <div className="card" style={{ maxWidth: 540, textAlign: "center" }}>
        <div className="badge" style={{ marginBottom: 10 }}>
          Access
        </div>
        <h1 style={{ margin: "0 0 8px" }}>Access not granted</h1>
        <p className="muted" style={{ marginBottom: 16 }}>
          Your Google account is not on the approved list. Please reach out to the admin or try a
          different email. (החשבון אינו מורשה)
        </p>
        <Link href="/" className="btn primary">
          Back to landing
        </Link>
      </div>
    </div>
  );
}
