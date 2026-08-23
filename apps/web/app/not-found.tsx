export default function NotFound() {
  return (
    <main className="shell">
      <header className="topbar">
        <a href="/" className="wordmark">
          <span className="dot" />
          <span>
            Observatory
            <small>maintenance health</small>
          </span>
        </a>
      </header>
      <section className="home-hero">
        <h1>Not in the Observatory yet</h1>
        <p>
          We have not scored this package. The working universe is the
          most-depended-on packages, and it is growing. Try another, or head
          back to the front page.
        </p>
        <div className="links" style={{ justifyContent: "center" }}>
          <a href="/">← Back to the Observatory</a>
        </div>
      </section>
    </main>
  );
}
