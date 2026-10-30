import mark from '../assets/brand-mark.svg';

/** Original monogram; currentColor follows the existing theme and accent. */
export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <span
      className="brand-monogram"
      aria-hidden="true"
      style={{ width: size, height: size, maskImage: 'url("' + mark + '")' }}
    />
  );
}
