import "./AppHeader.scss";

export default function AppHeader() {
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      <header className="app-header">
        <a
          className="app-header__brand"
          href="/"
          aria-label="PersonCount, início"
        >
          <span className="app-header__mark" aria-hidden="true">
            PC
          </span>
          PersonCount
        </a>
        <span className="app-header__caption">
          Detecção de pessoas em vídeos
        </span>
      </header>
    </>
  );
}
