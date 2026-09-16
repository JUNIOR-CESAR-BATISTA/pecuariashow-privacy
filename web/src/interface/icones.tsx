/**
 * Ícones desenhados em SVG, no lugar dos símbolos do sistema que o aplicativo
 * de iPhone usa. São poucos e simples, então não vale trazer uma biblioteca:
 * cada um é um caminho só, e o traço acompanha a cor do texto ao redor.
 */
type Props = { className?: string };

function Base({ children, className }: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-5 w-5"}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function IconeCasa(p: Props) {
  return (
    <Base {...p}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M10 20v-5.5h4V20" />
    </Base>
  );
}

export function IconeLista(p: Props) {
  return (
    <Base {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <path d="M7.5 9h9M7.5 12.5h9M7.5 16h5" />
    </Base>
  );
}

export function IconePizza(p: Props) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v9h9" />
    </Base>
  );
}

export function IconeDocumento(p: Props) {
  return (
    <Base {...p}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 13h7M8.5 16.5h5" />
    </Base>
  );
}

export function IconeCaixa(p: Props) {
  return (
    <Base {...p}>
      <path d="M21 8.5 12 13 3 8.5 12 4l9 4.5z" />
      <path d="M3 8.5v7L12 20l9-4.5v-7" />
      <path d="M12 13v7" />
    </Base>
  );
}

export function IconeBarras(p: Props) {
  return (
    <Base {...p}>
      <path d="M5 20v-6M12 20V6M19 20v-9" />
    </Base>
  );
}

export function IconeFolha(p: Props) {
  return (
    <Base {...p}>
      <path d="M20 4c0 8-5 13-13 13H4c0-8 5-13 13-13h3z" />
      <path d="M4 20c2.5-5 6-8 10-9.5" />
    </Base>
  );
}

export function IconeTendencia(p: Props) {
  return (
    <Base {...p}>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </Base>
  );
}

export function IconeEscudo(p: Props) {
  return (
    <Base {...p}>
      <path d="M12 3l8 3v6c0 5-3.5 8.2-8 9.5C7.5 20.2 4 17 4 12V6l8-3z" />
      <path d="M12 11.5v3" />
      <circle cx="12" cy="9.8" r="0.6" fill="currentColor" />
    </Base>
  );
}

export function IconeMais(p: Props) {
  return (
    <Base {...p}>
      <path d="M12 5v14M5 12h14" />
    </Base>
  );
}

export function IconeTroca(p: Props) {
  return (
    <Base {...p}>
      <path d="M4 8h13l-3.5-3.5" />
      <path d="M20 16H7l3.5 3.5" />
    </Base>
  );
}

export function IconeSeta(p: Props) {
  return (
    <Base {...p}>
      <path d="M5 12h13M13 6l6 6-6 6" />
    </Base>
  );
}

export function IconeSubida(p: Props) {
  return (
    <Base {...p}>
      <path d="M6 18L18 6" />
      <path d="M10 6h8v8" />
    </Base>
  );
}

/** f(x): o "function" do iPhone, para a tela de metodologia. */
export function IconeFuncao(p: Props) {
  return (
    <Base {...p}>
      <path d="M4 20V4" />
      <path d="M4 20h16" />
      <path d="M7 17c3.5 0 4-10 7.5-10 2 0 3 2 3.5 4" />
    </Base>
  );
}
