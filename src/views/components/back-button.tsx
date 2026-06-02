// Shared back button — replaces per-domain __back wrappers in detail views.

type BackButtonProps = {
  href: string;
  label: string;
};

export function BackButton({ href, label }: BackButtonProps) {
  return (
    <div class="detail-view__back">
      <a href={href} class="btn btn--secondary">{label}</a>
    </div>
  );
}
