/** Decorative brand wallpaper stays out of the accessibility tree. */
export function BrandDoodle() {
  return <span className="brand-doodle" aria-hidden="true" />;
}
