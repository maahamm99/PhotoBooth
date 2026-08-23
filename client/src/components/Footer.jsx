export default function Footer({ note }) {
  return (
    <footer className="site-footer">
      <span>{note}</span>
      <span>
        created with love by Maham <span className="site-footer__heart">♥</span>
      </span>
    </footer>
  );
}
